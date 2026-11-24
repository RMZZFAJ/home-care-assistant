import { NextResponse } from "next/server";
import { api, ApiError, authenticate, databaseError, parseQuery, readJson, rpc } from "@/lib/server/api";
import { residenceRecipients, residenceRuleCommand, residenceRuleQuery, residenceRuleReference, residenceThresholds, verifyResidenceRule } from "@/lib/validation/reviewed-residence-rule";

const headers = { "cache-control": "private, no-store" };

export async function GET(request: Request) {
  return api("residence.rules.read", async () => {
    const params = new URL(request.url).searchParams;
    const read = (key: string) => {
      const matches = params.getAll(key);
      if (matches.length > 1) throw new ApiError("VALIDATION_ERROR", "Confira a consulta da configuração.", 400);
      return matches[0] ?? null;
    };
    const query = parseQuery(residenceRuleQuery, {
      patientId: read("patientId"), mode: read("mode"), purpose: read("purpose"), selection: read("selection"), option: read("option"),
    });
    const { client } = await authenticate();
    const data = await rpc(client, "reviewed_residence_rule_read", {
      p_patient: query.patientId, p_mode: query.mode, p_purpose: query.purpose, p_selection: query.selection, p_option: query.option,
    });
    const schema = query.selection ? residenceRuleReference : query.purpose === "alertRule" ? residenceThresholds : residenceRecipients;
    return NextResponse.json(schema.parse(data), { headers });
  });
}

export async function POST(request: Request) {
  return api("residence.rules.configure", async () => {
    const command = await readJson(request, residenceRuleCommand);
    const { client } = await authenticate();
    const { data, error } = await client.rpc("reviewed_residence_rule_command", {
      p_patient: command.patientId, p_mode: command.mode, p_purpose: command.purpose, p_key: command.key,
      p_fields: command.intent?.fields ?? null, p_reference_hash: command.intent?.referenceHash ?? null,
    });
    if (error?.code === "PT409" && error.message === "stale administrative preparation reference") {
      throw new ApiError("VERSION_CONFLICT", "A configuração mudou durante a edição. Confira a versão atual antes de confirmar.", 409);
    }
    if (error?.code === "22023" && error.message === "invalid product threshold precision") {
      throw new ApiError("VALIDATION_ERROR", "Confira o limite, a unidade e as casas decimais do material.", 400);
    }
    if (error) databaseError(error);
    return NextResponse.json(verifyResidenceRule(command, data), { headers });
  });
}
