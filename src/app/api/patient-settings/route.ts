import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { appOrigin } from "@/lib/server/app-origin";
import { z } from "zod";
import { governanceKinds, governanceQuerySchema } from "@/lib/validation/governance";
import {
  api,
  authenticate,
  databaseError,
  patientContext,
  parseQuery,
  readJson,
  rpc,
  uuid,
} from "@/lib/server/api";

const schema = z
  .object({
    careRecipientId: uuid,
    kind: z.enum(governanceKinds),
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
    const params = new URL(request.url).searchParams;
    const requested = params.get("careRecipientId");
    const query = parseQuery(governanceQuerySchema, Object.fromEntries(["status", "kind", "query", "page", "pageSize"].filter(key => params.has(key)).map(key => [key, params.get(key)])));
    const readChanges = async (patientId: string) => rpc(auth.client, "patient_governance_changes", { p_patient: patientId, p_status: query.status, p_kind: query.kind ?? null, p_query: query.query, p_page: query.page, p_size: query.pageSize }) as Promise<{ changes: unknown[]; total: number; page: number; pageSize: number }>;
    if (auth.isGlobalAdmin && uuid.safeParse(requested).success) {
      const page = await readChanges(requested!);
      if (params.get("changesOnly") === "true") return NextResponse.json(page);
      return NextResponse.json({ ...await rpc(auth.client, "patient_governance", { p_patient: requested }) as object, changes: page.changes, changePage: { ...page, changes: undefined } });
    }
    const patient = await patientContext(
      auth,
      new URL(request.url).searchParams.get("careRecipientId"),
    );
    if (params.get("changesOnly") === "true") {
      await patientContext(auth, patient.id, "manage");
      return NextResponse.json(await readChanges(patient.id));
    }
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
          rpc(auth.client,"patient_capability_definitions",{p_patient:patient.id}).then(data=>({data,error:null})),
          auth.client
            .from("capability_overrides")
            .select("*")
            .eq("care_recipient_id", patient.id),
          readChanges(patient.id).then(data => ({ data, error: null })),
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
      changes: changes?.data.changes ?? [],
      changePage: changes?.data ? { ...changes.data, changes: undefined } : undefined,
    });
  });
}
export async function POST(request: Request) {
  return api("settings.configure", async () => {
    const input = await readJson(request, schema);
    const auth = await authenticate();
    if (!auth.isGlobalAdmin)
      await patientContext(auth, input.careRecipientId, "manage", true);
    const invitationToken =
      input.requestId && input.decision === "approve"
        ? randomBytes(32).toString("base64url")
        : null;
    const invitationHash = invitationToken
      ? createHash("sha256").update(invitationToken).digest("hex")
      : null;
    const data = (await rpc(auth.client, "configure_patient_access", {
      p_patient: input.careRecipientId,
      p_kind: input.kind,
      p_change: invitationHash
        ? { ...input.change, invitationTokenHash: invitationHash }
        : input.change,
      p_key: input.idempotencyKey,
      p_version: input.expectedVersion,
      p_request_id: input.requestId ?? null,
      p_decision: input.decision ?? null,
    })) as { status: string; resolution?: { invitationHash?: string; invitationId?: string } };
    const invitationUrl =
      data.status === "awaiting_acceptance" &&
      data.resolution?.invitationHash === invitationHash &&
      invitationToken
        ? new URL("/convites/aceitar", appOrigin(request))
        : null;
    if (invitationUrl) invitationUrl.hash = "token=" + invitationToken;
    return NextResponse.json({
      data: { ...data, ...(data.resolution ? { resolution: { ...data.resolution, invitationHash: undefined } } : {}) },
      ...(invitationUrl ? { invitationUrl: invitationUrl.toString() } : {}),
      ...(!invitationUrl && data.status === "awaiting_acceptance" && data.resolution?.invitationId ? { invitationRecovery: { invitationId: data.resolution.invitationId, action: "reissue", notice: "A aprovação já foi registrada. Para recuperar o acesso ao link, reemita o convite; o link anterior deixará de funcionar." } } : {}),
    });
  });
}
