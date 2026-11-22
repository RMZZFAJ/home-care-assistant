import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { api, ApiError, authenticate, patientContext, readJson, rpc, uuid, validateMutationRequest } from "@/lib/server/api";
import { boundedUpload, sanitizeFile } from "@/lib/server/files";
import { createWorkerClient } from "@/lib/server/service-client";
import { attachmentMaxBytes, attachmentMaxLabel } from "@/lib/documents/attachment-attempt";

type Auth = Awaited<ReturnType<typeof authenticate>>;
type Reservation = { id: string; filename: string; object_path: string; state: string; sha256: string | null; mime_type: string; bytes: number; legacy?: boolean };
type Attempt = Reservation & { sourceSha256: string | null; expectedSha256: string | null; tracked: boolean; pending: boolean; canAbandon: boolean };
const parent = z.object({ careRecipientId: z.uuid(), documentId: z.uuid().optional(), movementId: z.uuid().optional(), contingencyId: z.uuid().optional() }).refine(value => [value.documentId,value.movementId,value.contingencyId].filter(Boolean).length===1, { message: "Informe uma ficha, movimentação ou dossiê de contingência." });
const command = z.object({ careRecipientId: z.uuid(), documentId: z.uuid().optional(), movementId: z.uuid().optional(), contingencyId: z.uuid().optional(), id: z.uuid(), key: z.uuid(), action: z.enum(["recover", "abandon"]) }).strict().refine(value => [value.documentId,value.movementId,value.contingencyId].filter(Boolean).length===1);
function lookup(input: z.infer<typeof parent>, key: string | null = null) { return input.contingencyId?{p_patient:input.careRecipientId,p_contingency:input.contingencyId,p_key:key}:{ p_patient: input.careRecipientId, p_document: input.documentId ?? null, p_movement: input.movementId ?? null, p_key: key }; }
const digest = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");
async function confirm(auth: Auth, file: Reservation, sha256: string, sourceSha256: string) {
  await rpc(createWorkerClient(), "finalize_attachment", { p_id: file.id, p_actor: auth.userId, p_hash: sha256, p_mime: file.mime_type, p_bytes: file.bytes, p_valid: true });
  await rpc(auth.client, "bind_validated_attachment", { p_id: file.id });
  return { id: file.id, sha256, sourceSha256, persistence: "confirmed" as const };
}
async function storedBytes(auth: Auth, file: Reservation) {
  const result = await auth.client.storage.from("patient-evidence").download(file.object_path);
  return result.error || !result.data ? null : Buffer.from(await result.data.arrayBuffer());
}
function reply(body: unknown, status = 200) { return NextResponse.json(body, { status, headers: { "cache-control": "private, no-store" } }); }

export async function GET(request: Request) {
  return api("attachments.read", async () => {
    const auth = await authenticate(), params = new URL(request.url).searchParams;
    const parsed = parent.safeParse(Object.fromEntries(params));
    if (!parsed.success) throw new ApiError("VALIDATION_ERROR", "Documento ou movimentação inválido.");
    await patientContext(auth, parsed.data.careRecipientId);
    const key = params.get("attemptKey");
    if (key && !uuid.safeParse(key).success) throw new ApiError("VALIDATION_ERROR", "Tentativa inválida.");
    const data = await rpc(auth.client, parsed.data.contingencyId?"contingency_attachment_attempts":"attachment_attempts", lookup(parsed.data, key)) as Attempt[];
    const files = await Promise.all(data.map(async file => {
      const signed = file.state === "ready" ? await auth.client.storage.from("patient-evidence").createSignedUrl(file.object_path, 120) : null;
      return { ...file, object_path: undefined, url: signed?.data?.signedUrl ?? null };
    }));
    return reply({ data: files });
  });
}

export async function POST(request: Request) {
  return api("attachments.upload", async () => {
    validateMutationRequest(request, false);
    const auth = await authenticate(), { form, file, bytes } = await boundedUpload(request);
    const parsed = parent.safeParse(Object.fromEntries(form));
    if (!parsed.success) throw new ApiError("VALIDATION_ERROR", "Vínculo do anexo inválido.");
    await patientContext(auth, parsed.data.careRecipientId, "read", true);
    const uploadKey = String(form.get("idempotencyKey") ?? "");
    if (!uuid.safeParse(uploadKey).success) throw new ApiError("VALIDATION_ERROR", "Chave do envio inválida.");
    const sanitized = await sanitizeFile(bytes, file.type);
    if (sanitized.bytes.length > attachmentMaxBytes) throw new ApiError("PAYLOAD_TOO_LARGE", `O arquivo convertido excede ${attachmentMaxLabel}. Envie uma cópia menor.`, 413);
    const filename = Array.from(file.name).map(character => character.charCodeAt(0) < 32 || "/\\".includes(character) ? "_" : character).join("").slice(0, 170) || "anexo";
    const sha256 = digest(sanitized.bytes), sourceSha256 = digest(bytes);
    const reservation = await rpc(auth.client, parsed.data.contingencyId?"prepare_contingency_attachment_attempt":"prepare_attachment_attempt", {
      ...lookup(parsed.data, uploadKey), p_filename: filename, p_mime: sanitized.mime, p_bytes: sanitized.bytes.length,
      p_source_hash: sourceSha256, p_source_bytes: bytes.length, p_source_mime: file.type, p_hash: sha256,
      p_transformation: sanitized.mime === "application/pdf" ? "pdf-passive-pages-v1" : "image-normalized-v1",
    }) as Reservation;
    if (!reservation.legacy) await rpc(createWorkerClient(), "attest_attachment_source", { p_id: reservation.id, p_actor: auth.userId, p_source_hash: sourceSha256, p_source_bytes: bytes.length, p_source_mime: file.type, p_hash: sha256, p_transformation: sanitized.mime === "application/pdf" ? "pdf-passive-pages-v1" : "image-normalized-v1" });
    if (reservation.state === "ready") {
      if (reservation.sha256 !== sha256) throw new ApiError("IDEMPOTENCY_CONFLICT", "A tentativa já contém outro arquivo.");
      const stored = await storedBytes(auth, reservation);
      if (!stored || digest(stored) !== sha256) throw new ApiError("PERSISTENCE_UNCONFIRMED", "Não foi possível conferir o arquivo registrado. Recupere a mesma tentativa.");
      return reply(await confirm(auth, reservation, sha256, sourceSha256), 201);
    }
    if (reservation.state !== "quarantine") throw new ApiError("ATTACHMENT_PENDING", "Esta tentativa já foi encerrada. Consulte o resultado.");
    if (new URL(request.url).searchParams.get("prepare") === "1") return reply({ id: reservation.id, sha256, sourceSha256, persistence: "prepared" });

    const token = randomUUID();
    if (!reservation.legacy) {
      const current = await rpc(auth.client, "begin_attachment_upload", { p_id: reservation.id, p_source_hash: sourceSha256, p_hash: sha256, p_token: token }) as Reservation;
      if (current.state === "ready") return reply(await confirm(auth, current, sha256, sourceSha256), 201);
    }
    let settled = false;
    async function settle(outcome: "stored" | "uncertain") {
      if (!reservation.legacy) await rpc(createWorkerClient(), "settle_attachment_upload", { p_id: reservation.id, p_actor: auth.userId, p_token: token, p_outcome: outcome });
      settled = true;
    }
    try {
      const result = await auth.client.storage.from("patient-evidence").upload(reservation.object_path, sanitized.bytes, { contentType: sanitized.mime, upsert: false });
      if (result.error) {
        const existing = await storedBytes(auth, reservation);
        if (!existing) throw new ApiError("PERSISTENCE_UNCONFIRMED", "Não foi possível confirmar o envio do anexo. Recupere a mesma tentativa.", 503, true);
        if (digest(existing) !== sha256) throw new ApiError("IDEMPOTENCY_CONFLICT", "O arquivo registrado não corresponde a esta tentativa.");
      }
      await settle("stored");
      return reply(await confirm(auth, reservation, sha256, sourceSha256), 201);
    } catch (error) {
      if (!settled) await settle("uncertain").catch(() => { /* Missing receipt stays active; never infer an absent upload. */ });
      throw error;
    }
  });
}

export async function PATCH(request: Request) {
  return api("attachments.recover", async () => {
    const input = await readJson(request, command, 8192), auth = await authenticate();
    await patientContext(auth, input.careRecipientId, "read", true);
    const attempts = await rpc(auth.client, input.contingencyId?"contingency_attachment_attempts":"attachment_attempts", lookup(input, input.key)) as Attempt[];
    const file = attempts.find(entry => entry.id === input.id);
    if (!file) throw new ApiError("NOT_FOUND", "Tentativa não encontrada neste registro.");
    if (input.action === "abandon") return reply(await rpc(auth.client, "abandon_attachment_attempt", { p_id: file.id, p_key: input.key }));
    if (!file.tracked || !file.sourceSha256) throw new ApiError("ATTACHMENT_PENDING", "O envio histórico não possui uma impressão de origem verificável. Preserve o registro e retome com o arquivo original.");
    if (!["quarantine", "ready"].includes(file.state)) return reply({ id: file.id, persistence: file.state });
    const stored = await storedBytes(auth, file);
    if (!stored) return reply({ id: file.id, persistence: "unconfirmed", pending: file.pending, canAbandon: file.canAbandon }, 202);
    const sha256 = digest(stored);
    if (sha256 !== (file.state === "ready" ? file.sha256 : file.expectedSha256)) throw new ApiError("IDEMPOTENCY_CONFLICT", "O arquivo encontrado diverge desta tentativa. Preserve o registro e solicite suporte.");
    return reply(await confirm(auth, file, sha256, file.sourceSha256), 201);
  });
}
