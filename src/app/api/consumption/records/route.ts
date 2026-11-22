import { NextResponse } from "next/server";
import { z } from "zod";
import { api, ApiError, authenticate, parseQuery, patientContext, readJson, rpc } from "@/lib/server/api";
import { teamConsumptionAttempt, teamConsumptionCommand, teamConsumptionProducts, teamConsumptionReceipt, teamConsumptionReference } from "@/lib/validation/consumption";

const headers = { "cache-control": "private, no-store" };

export async function GET(request: Request) {
  return api("consumption.team.result", async () => {
    const params = new URL(request.url).searchParams;
    const materialIds = params.getAll("productId");
    const auth = await authenticate();
    if (materialIds.length && !params.has("idempotencyKey") &&
      [...params.keys()].every(key => key === "careRecipientId" || key === "productId") &&
      params.getAll("careRecipientId").length === 1) {
      const patientId = parseQuery(z.uuid().transform(value => value.toLowerCase()), params.get("careRecipientId"));
      const selected = parseQuery(teamConsumptionProducts, materialIds);
      const patient = await patientContext(auth, patientId, "consumption.team.write", true);
      const data = teamConsumptionReference.parse(await rpc(auth.client, "team_consumption_reference", {
        p_patient: patient.id, p_products: selected,
      }));
      if (data.careRecipientId !== patient.id || data.materials.length !== selected.length ||
        new Set(data.materials.map(item => item.productId)).size !== selected.length ||
        data.materials.some(item => !selected.includes(item.productId)))
        throw new ApiError("INTERNAL_ERROR", "A consulta de estoque não corresponde aos materiais selecionados.", 500);
      return NextResponse.json({ data }, { headers });
    }
    const scope = parseQuery(teamConsumptionAttempt, Object.fromEntries(params));
    const patient = await patientContext(auth, scope.careRecipientId, "consumption.team.write", true);
    const raw = await rpc(auth.client, "team_consumption_result", { p_patient: patient.id, p_key: scope.idempotencyKey });
    const data = teamConsumptionReceipt.nullable().parse(raw);
    if (data && (data.careRecipientId !== patient.id || data.idempotencyKey !== scope.idempotencyKey))
      throw new ApiError("PERSISTENCE_UNCONFIRMED", "A confirmação não corresponde a esta tentativa.", 503, true);
    return NextResponse.json({ data }, { headers });
  });
}

export async function POST(request: Request) {
  return api("consumption.team.commit", async () => {
    const input = await readJson(request, teamConsumptionCommand);
    const { careRecipientId, idempotencyKey, ...intent } = input;
    const { referenceHash, draft, ...body } = intent.action === "issue"
      ? intent
      : { ...intent, referenceHash: null, draft: undefined };
    const auth = await authenticate();
    const patient = await patientContext(auth, careRecipientId, "consumption.team.write", true);
    const data = teamConsumptionReceipt.parse(await rpc(auth.client, "submit_team_consumption", {
      p_patient: patient.id, p_key: idempotencyKey, p_body: body, p_reference: referenceHash,
      p_draft_id: draft?.id ?? null, p_draft_revision: draft?.revision ?? null,
    }));
    if (data.careRecipientId !== patient.id || data.idempotencyKey !== idempotencyKey || data.action !== body.action
      || ("reportId" in body && (data.id !== body.reportId || data.version !== body.expectedVersion + 1)))
      throw new ApiError("PERSISTENCE_UNCONFIRMED", "A confirmação não corresponde a esta tentativa.", 503, true);
    return NextResponse.json({ data }, { headers, status: "reportId" in body ? 200 : 201 });
  });
}
