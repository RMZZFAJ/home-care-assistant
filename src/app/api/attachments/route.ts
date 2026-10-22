import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { api, ApiError, authenticate, databaseError, patientContext, rpc, uuid, validateMutationRequest } from "@/lib/server/api";
import { boundedUpload, sanitizeFile } from "@/lib/server/files";
import { createWorkerClient } from "@/lib/server/service-client";

export async function GET(request: Request) {
  return api("attachments.read", async () => {
    const auth = await authenticate(); const params = new URL(request.url).searchParams;
    const patient = await patientContext(auth, params.get("careRecipientId"));
    const parent = params.get("documentId") ?? params.get("movementId"); if (!uuid.safeParse(parent).success) throw new ApiError("VALIDATION_ERROR", "Documento ou movimentação inválido.");
    const {data, error} = await auth.client.from("attachments").select("id,filename,mime_type,bytes,object_path,sha256,state,created_at,uploaded_by").eq("care_recipient_id", patient.id).eq(params.has("documentId") ? "document_id" : "movement_id", parent).order("created_at");
    if (error) databaseError(error);
    const files = await Promise.all((data ?? []).map(async (file) => { const {data: signed} = file.state === "ready" ? await auth.client.storage.from("patient-evidence").createSignedUrl(file.object_path, 120) : {data: null}; return {...file, object_path: undefined, url: signed?.signedUrl ?? null}; }));
    return NextResponse.json({data: files}, {headers: {"cache-control": "private, no-store"}});
  });
}
export async function POST(request: Request) {
  return api("attachments.upload", async () => {
    validateMutationRequest(request, false); const auth = await authenticate();
    const {form, file, bytes} = await boundedUpload(request);
    const patient = await patientContext(auth, String(form.get("careRecipientId")), "read", true);
    const documentId = form.get("documentId") ? String(form.get("documentId")) : null; const movementId = form.get("movementId") ? String(form.get("movementId")) : null;
    if (Boolean(documentId) === Boolean(movementId) || documentId && !uuid.safeParse(documentId).success || movementId && !uuid.safeParse(movementId).success) throw new ApiError("VALIDATION_ERROR", "Vínculo do anexo inválido.");
    const sanitized = await sanitizeFile(bytes, file.type);
    const filename = Array.from(file.name).map((character) => character.charCodeAt(0) < 32 || "/\\".includes(character) ? "_" : character).join("").slice(0,170) || "anexo";
    const reservation = await rpc(auth.client, "reserve_attachment", {p_patient: patient.id, p_document: documentId, p_movement: movementId, p_filename: filename, p_mime: sanitized.mime, p_bytes: sanitized.bytes.length}) as {id: string; object_path: string};
    const {error} = await auth.client.storage.from("patient-evidence").upload(reservation.object_path, sanitized.bytes, {contentType: sanitized.mime, upsert: false}); if (error) throw new ApiError("PERSISTENCE_UNCONFIRMED", "Não foi possível confirmar o envio do anexo. Consulte a lista antes de tentar novamente.", 503, true);
    const sha256 = createHash("sha256").update(sanitized.bytes).digest("hex");
    await rpc(createWorkerClient(), "finalize_attachment", {p_id: reservation.id, p_actor: auth.userId, p_hash: sha256, p_mime: sanitized.mime, p_bytes: sanitized.bytes.length, p_valid: true});
    await rpc(auth.client, "bind_validated_attachment", {p_id: reservation.id});
    return NextResponse.json({id: reservation.id, sha256, persistence: "confirmed"}, {status: 201});
  });
}
