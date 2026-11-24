import { NextResponse } from "next/server";
import { api, authenticate, parseQuery, readJson, rpc } from "@/lib/server/api";
import {
  residenceAdministrationQuery, residenceAdministrationSnapshot,
  residenceIdentificationCommand, residenceIdentificationResult,
} from "@/lib/validation/residence-administration";

const headers = { "cache-control": "private, no-store" };

export async function GET(request: Request) {
  return api("residence.administration.read", async () => {
    const params = new URL(request.url).searchParams;
    const query = parseQuery(residenceAdministrationQuery, {
      patientId: params.getAll("patientId").length === 1 ? params.get("patientId") : null,
    });
    const { client } = await authenticate();
    const result = await rpc(client, "residence_administration_snapshot", { p_patient: query.patientId });
    return NextResponse.json(residenceAdministrationSnapshot.parse(result), { headers });
  });
}

export async function POST(request: Request) {
  return api("residence.administration.identify", async () => {
    const input = await readJson(request, residenceIdentificationCommand);
    const { client } = await authenticate();
    const result = await rpc(client, "residence_identification_command", {
      p_patient: input.patientId,
      p_key: input.key,
      p_action: input.action,
      ...(input.action === "save" ? { p_version: input.version, p_before: input.before, p_identity: input.identity } : {}),
    });
    return NextResponse.json(residenceIdentificationResult.parse(result), { headers });
  });
}
