import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, databaseError, rpc, validateMutationRequest } from "./api";
import { boundedUpload, sanitizeFile } from "./files";
import { createWorkerClient } from "./service-client";
import { avatarAttemptSchema, avatarStoredAttemptSchema } from "../validation/avatar";

type Auth = { client: SupabaseClient; userId: string };
const view = z.object({ referenceRevision: z.number().int().positive(), attempt: avatarStoredAttemptSchema.nullable() });
const hash = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const uncertain = () => new ApiError("PERSISTENCE_UNCONFIRMED", "O resultado da foto ainda precisa ser consultado. Preserve esta troca e recupere-a antes de escolher outra.", 503, true);
async function read(auth: Auth, key: string | null = null) {
  return view.parse(await rpc(auth.client, "my_avatar_change", { p_key: key }));
}
export async function readMyAvatar(auth: Auth, key: string | null = null) {
  const state = await read(auth, key);
  const { data, error } = await auth.client.from("profiles").select("avatar_path").eq("id", auth.userId).single();
  if (error) databaseError(error);
  let avatar: string | null = null, avatarUnavailable = false;
  if (data.avatar_path) {
    const signed = await auth.client.storage.from("profile-avatars").createSignedUrl(data.avatar_path, 120);
    avatar = signed.data?.signedUrl ?? null; avatarUnavailable = Boolean(signed.error || !avatar);
  }
  return { ...state, attempt: state.attempt ? avatarAttemptSchema.parse(state.attempt) : null, avatar, avatarUnavailable };
}
async function cleanup(service: SupabaseClient, owner: string) {
  try {
    const candidates = z.array(z.object({ id: z.string().uuid(), objectPath: z.string() })).parse(await rpc(service, "avatar_cleanup_candidates", { p_owner: owner, p_limit: 20 }));
    let pending = false;
    for (const candidate of candidates) {
      const removed = await service.storage.from("profile-avatars").remove([candidate.objectPath]);
      if (removed.error) { pending = true; continue; }
      await rpc(service, "ack_avatar_cleanup", { p_id: candidate.id });
    }
    return pending;
  } catch { return true; }
}
async function result(auth: Auth, service: SupabaseClient, receipt: unknown) {
  const attempt = avatarAttemptSchema.parse(receipt);
  const cleanupPending = await cleanup(service, auth.userId);
  return NextResponse.json({ attempt, cleanupPending });
}
async function verifyAndFinish(auth: Auth, service: SupabaseClient, key: string) {
  const state = await read(auth, key), attempt = state.attempt;
  if (!attempt) throw uncertain();
  if (attempt.state === "applied") return result(auth, service, attempt);
  if (attempt.state !== "pending") throw new ApiError("VERSION_CONFLICT", "Esta troca foi abandonada. Escolha uma nova foto em uma nova intenção.", 409);
  if (!attempt.expectedHash || !attempt.expectedSize) throw new ApiError("PERSISTENCE_UNCONFIRMED", "Selecione novamente o mesmo arquivo original para continuar esta troca.", 503, true);
  const downloaded = await service.storage.from("profile-avatars").download(attempt.objectPath);
  if (downloaded.error || !downloaded.data) throw uncertain();
  const bytes = Buffer.from(await downloaded.data.arrayBuffer());
  if (bytes.length !== attempt.expectedSize || hash(bytes) !== attempt.expectedHash)
    throw new ApiError("CONTENT_INVALID", "A foto armazenada não corresponde a esta troca. A foto válida anterior foi preservada; abandone esta troca antes de escolher outra.", 503);
  const info = await service.storage.from("profile-avatars").info(attempt.objectPath);
  if (info.error || !info.data?.id) throw uncertain();
  await rpc(service, "verify_avatar_change", { p_id: attempt.id, p_hash: hash(bytes), p_size: bytes.length, p_object: info.data.id });
  return result(auth, service, await rpc(auth.client, "finish_my_avatar_change", { p_key: key }));
}
export async function uploadMyAvatar(request: Request, auth: Auth) {
  validateMutationRequest(request, false);
  const key = z.string().uuid().safeParse(request.headers.get("idempotency-key"));
  const reference = z.coerce.number().int().positive().safeParse(request.headers.get("x-avatar-reference"));
  if (!key.success || !reference.success) throw new ApiError("VALIDATION_ERROR", "Atualize a página para iniciar uma troca de foto recuperável.");
  const { file, bytes } = await boundedUpload(request, 5_242_880);
  const safe = await sanitizeFile(bytes, file.type, true), service = createWorkerClient();
  const attempt = avatarStoredAttemptSchema.parse(await rpc(auth.client, "begin_my_avatar_change", {
    p_key: key.data, p_hash: hash(bytes), p_size: bytes.length,
    p_name: file.name.replace(/\p{Cc}/gu, "").slice(0, 160) || "Foto", p_reference: reference.data,
  }));
  if (attempt.state === "applied") return result(auth, service, attempt);
  if (attempt.state !== "pending") throw new ApiError("VERSION_CONFLICT", "Esta troca foi abandonada. Inicie outra com revisão da foto atual.", 409);
  try {
    await rpc(service, "prepare_avatar_change", { p_id: attempt.id, p_hash: hash(safe.bytes), p_size: safe.bytes.length });
    // Never overwrite: a duplicate or uncertain upload is reconciled by exact read-back.
    await service.storage.from("profile-avatars").upload(attempt.objectPath, safe.bytes, { contentType: safe.mime, upsert: false });
    return await verifyAndFinish(auth, service, key.data);
  } catch (reason) {
    const current = await read(auth, key.data);
    if (current.attempt?.state === "applied") return result(auth, service, current.attempt);
    if (current.attempt?.state === "abandoned") await cleanup(service, auth.userId);
    throw reason;
  }
}
export async function commandMyAvatar(auth: Auth, action: "recover" | "abandon", key: string) {
  const service = createWorkerClient();
  if (action === "abandon") return result(auth, service, await rpc(auth.client, "abandon_my_avatar_change", { p_key: key }));
  try { return await verifyAndFinish(auth, service, key); }
  catch (reason) {
    const current = await read(auth, key);
    if (current.attempt?.state === "applied") return result(auth, service, current.attempt);
    throw reason;
  }
}
