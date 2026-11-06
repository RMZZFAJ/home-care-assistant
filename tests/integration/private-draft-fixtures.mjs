import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { setup, actor, rpc, fixtures, env, issue } from "./v4-fixtures.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";

export async function draftDevice(patient, name = "professional") {
  const client = createClient(env.url, env.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  assert.ifError(
    (
      await client.auth.signInWithPassword({
        email: fixtures[name].email,
        password: fixturePassword,
      })
    ).error,
  );
  await rpc(client, "select_active_context", { p_patient: patient });
  return client;
}
export async function privateDraftFixture() {
  const f = await setup();
  return { ...f, pro: await draftDevice(f.patient) };
}
/** @returns {import("../../src/lib/validation/creation-drafts").RequisitionDraftContent} */
export const reqContent = (f) => ({
  lines: [
    {
      productId: f.products[0],
      productName: "Material fictício V4 0",
      category: "higiene",
      unit: "unidade",
      currentStock: "0",
      stockObservation: "observed",
      stockObservationAt: "2026-11-05T10:30:00-03:00",
      urgent: false,
    },
  ],
  extraItems: [],
  observations: ["Preenchimento privado de ontem"],
});
/** @returns {import("../../src/lib/validation/creation-drafts").BalanceDraftContent} */
export const balContent = (f) => ({
  counts: { [f.products[0]]: "" },
  observationTimes: { [f.products[0]]: null },
  notes: "Contagem privada ainda incompleta",
  materials: f.products.map((id, i) => ({
    id,
    name: `Material fictício V4 ${i}`,
    unit: "unidade",
    quantityDecimals: 0,
  })),
  context: {
    mode: "legacy",
    documentId: null,
    documentVersion: null,
    assignmentId: null,
    assignmentVersion: null,
    referenceRevision: null,
  },
});
/**
 * @param {any} f
 * @param {string} [kind]
 * @param {import("../../src/types/creation-drafts").CreationDraftContent} [content]
 * @param {string|null} [id]
 * @param {number|null} [revision]
 * @param {string|null} [target]
 */
export const savePacket = (
  f,
  kind = "REQ",
  content = reqContent(f),
  id = null,
  revision = null,
  target = null,
) => ({
  p_patient: f.patient,
  p_kind: kind,
  p_target: target,
  p_id: id,
  p_expected: revision,
  p_body: { action: "save", content },
  p_key: randomUUID(),
});
export const draftContext = (f, kind = "REQ", client = f.pro, target = null) =>
  rpc(client, "creation_draft_context", {
    p_patient: f.patient,
    p_kind: kind,
    p_target: target,
  });
export const confirmPacket = (f, saved) => ({
  p_id: saved.id,
  p_expected: saved.revision,
  p_target: null,
  p_key: randomUUID(),
  p_body: {
    action: "issue_req",
    lines: reqContent(f).lines.map(
      ({
        productId,
        currentStock,
        stockObservation,
        stockObservationAt,
        urgent,
      }) => ({
        productId,
        currentStock,
        stockObservation,
        stockObservationAt,
        urgent,
      }),
    ),
    extraItems: [],
    observations: reqContent(f).observations,
  },
});
export const officialState = (f) =>
  sql(`select jsonb_build_object(
 'documents',(select jsonb_agg(to_jsonb(d) order by id) from public.operational_documents d where care_recipient_id=${sqlLiteral(f.patient)}),
 'requests',(select jsonb_agg(to_jsonb(r) order by id) from public.requisitions r where care_recipient_id=${sqlLiteral(f.patient)}),
 'series',(select jsonb_agg(to_jsonb(s) order by type) from public.document_series s where care_recipient_id=${sqlLiteral(f.patient)}),
 'events',(select jsonb_agg(to_jsonb(e) order by id) from public.document_events e where care_recipient_id=${sqlLiteral(f.patient)}),
 'stock',(select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${sqlLiteral(f.patient)}),
 'attachments',(select jsonb_agg(to_jsonb(a) order by id) from public.attachments a where care_recipient_id=${sqlLiteral(f.patient)}),
 'renders',(select jsonb_agg(to_jsonb(p) order by p.document_id,p.version,p.renderer) from public.document_pdf_renders p join public.operational_documents d on d.id=p.document_id where d.care_recipient_id=${sqlLiteral(f.patient)}));`);

export async function officialWithReadyFile(f) {
  const document = await issue(f.patient, [f.products[1]]);
  const bytes = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a1WQAAAAASUVORK5CYII=",
    "base64",
  );
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const reservation = await rpc(f.pro, "reserve_attachment", {
    p_patient: f.patient,
    p_document: document.id,
    p_movement: null,
    p_filename: "evidencia-ficticia.png",
    p_mime: "image/png",
    p_bytes: bytes.length,
    p_key: randomUUID(),
  });
  assert.ifError(
    (
      await f.pro.storage
        .from("patient-evidence")
        .upload(reservation.object_path, bytes, {
          contentType: "image/png",
          upsert: false,
        })
    ).error,
  );
  const worker = createClient(env.url, env.serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  await rpc(worker, "finalize_attachment", {
    p_id: reservation.id,
    p_actor: fixtures.professional.id,
    p_hash: sha256,
    p_mime: "image/png",
    p_bytes: bytes.length,
    p_valid: true,
  });
  await rpc(f.pro, "bind_validated_attachment", { p_id: reservation.id });
  return {
    documentId: document.id,
    path: reservation.object_path,
    attachmentId: reservation.id,
    sha256,
    bytes,
  };
}
export { actor, rpc, fixtures };
