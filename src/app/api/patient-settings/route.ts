import { NextResponse } from "next/server";
import { z } from "zod";
import {
  api,
  authenticate,
  databaseError,
  patientContext,
  readJson,
  rpc,
  uuid,
} from "@/lib/server/api";

const schema = z
  .object({
    careRecipientId: uuid,
    kind: z.enum(["capability", "settings", "membership"]),
    change: z.record(z.string(), z.unknown()),
    idempotencyKey: uuid,
    expectedVersion: z.number().int().positive(),
    requestId: uuid.optional(),
    decision: z.enum(["approve", "reject"]).optional(),
  })
  .strict();
export async function GET(request: Request) {
  return api("settings.read", async () => {
    const auth = await authenticate();
    const patient = await patientContext(
      auth,
      new URL(request.url).searchParams.get("careRecipientId"),
    );
    const settings = await auth.client
      .from("patient_settings")
      .select("*")
      .eq("care_recipient_id", patient.id)
      .maybeSingle();
    if (settings.error) databaseError(settings.error);
    const directory = await rpc(auth.client, "patient_directory", {
      p_patient: patient.id,
    });
    const [definitions, overrides, changes] = patient.permissions.canManage
      ? await Promise.all([
          auth.client.from("capability_definitions").select("*"),
          auth.client
            .from("capability_overrides")
            .select("*")
            .eq("care_recipient_id", patient.id),
          auth.client
            .from("access_change_requests")
            .select("*")
            .eq("care_recipient_id", patient.id)
            .order("created_at", { ascending: false })
            .limit(50),
        ])
      : [];
    for (const result of [definitions, overrides, changes])
      if (result?.error) databaseError(result.error);
    return NextResponse.json({
      data: settings.data ?? {
        version: 1,
        settings: {
          balDay: null,
          balReview: "optional",
          balApprovers: ["family", "supervisor"],
          balRequirement: "any",
          whatsappSimpleAcceptance: false,
        },
      },
      directory,
      definitions: definitions?.data ?? [],
      overrides: overrides?.data ?? [],
      changes: changes?.data ?? [],
    });
  });
}
export async function POST(request: Request) {
  return api("settings.configure", async () => {
    const input = await readJson(request, schema);
    const auth = await authenticate();
    await patientContext(auth, input.careRecipientId, "manage", true);
    return NextResponse.json({
      data: await rpc(auth.client, "configure_patient_access", {
        p_patient: input.careRecipientId,
        p_kind: input.kind,
        p_change: input.change,
        p_key: input.idempotencyKey,
        p_version: input.expectedVersion,
        p_request_id: input.requestId ?? null,
        p_decision: input.decision ?? null,
      }),
    });
  });
}
