import { randomUUID } from "node:crypto";
import { actor, rpc, setup, issue, delivery, request } from "./v4-fixtures.mjs";
import { draftDevice } from "./private-draft-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";

export const reqDecisionPurposes = ["archive", "cancel", "resolve_extra"];
export const reqDecisionReason =
  "\uFEFF\n Motivo próprio preservado,sem decisão automática\u00A0\t";
export async function reqDecisionFixture(purpose) {
  const f = await setup();
  let req;
  if (purpose === "resolve_extra") {
    const pro = await actor("professional", f.patient);
    const args = request(f.patient, [f.products[0]]);
    args.p_extra_items = [
      {
        customName: "Extra fictício para identificar",
        currentStock: null,
        stockObservation: "unknown",
        urgent: false,
      },
    ];
    const [created] = await rpc(pro, "submit_requisition", args);
    req = { id: created.requisition_id };
  } else req = await issue(f.patient, f.products);
  if (purpose === "archive") {
    const ent = await delivery(f.patient, req, f.products);
    await rpc(
      await actor("professional", f.patient),
      "supply_document_command",
      {
        p_id: ent.id,
        p_action: "receive",
        p_body: { divergences: [] },
        p_key: randomUUID(),
        p_version: ent.version,
      },
    );
  }
  const reference = await rpc(f.admin, "requisition_decision_context", {
    p_id: req.id,
  });
  const item = reference.items.find((item) => item.extra && !item.resolved);
  const content = {
    documentVersion: reference.documentVersion,
    fields: {
      reason: reqDecisionReason,
      referenceHash: reference.referenceHash,
      itemId: item?.id ?? "",
      itemLabel: item?.name ?? "",
      productId: item ? f.products[1] : "",
      productLabel: item ? "Material fictício V4 1" : "",
      productUnit: item ? "unidade" : "",
    },
    materials: [],
    divergentIds: [],
  };
  return { ...f, req, purpose, reference, content, client: f.admin };
}
export const reqDecisionPeer = (f) => draftDevice(f.patient, "adminA");
export const reqDecisionRead = (client, f) =>
  rpc(client, "supply_draft_context", {
    p_patient: f.patient,
    p_kind: "REQ",
    p_purpose: f.purpose,
    p_target: f.req.id,
  });
export const reqDecisionSave = (f) => ({
  p_patient: f.patient,
  p_kind: "REQ",
  p_purpose: f.purpose,
  p_target: f.req.id,
  p_id: null,
  p_expected: null,
  p_key: randomUUID(),
  p_body: {
    action: "save",
    content: f.content,
    navigation: { version: 1, stage: "req_" + f.purpose },
  },
});
export const reqDecisionCommit = (f, saved) => ({
  p_id: saved.id,
  p_expected: saved.revision,
  p_target: f.req.id,
  p_key: randomUUID(),
  p_body: {
    action: f.purpose,
    expectedVersion: f.reference.documentVersion,
    body: {
      reason: reqDecisionReason.trim(),
      ...(f.purpose === "resolve_extra"
        ? {
            itemId: f.content.fields.itemId,
            productId: f.content.fields.productId,
          }
        : {}),
    },
  },
});
export const reqDecisionFacts = (f) =>
  sql(
    `select jsonb_build_object('req',(select to_jsonb(r) from public.requisitions r where id=${q(f.req.id)}),'doc',(select to_jsonb(d) from public.operational_documents d where id=${q(f.req.id)}),'lifecycle',(select to_jsonb(l) from public.requisition_lifecycle l where requisition_id=${q(f.req.id)}),'resolution',(select coalesce(jsonb_agg(to_jsonb(r) order by id),'[]') from public.requisition_item_resolutions r where care_recipient_id=${q(f.patient)}),'events',(select coalesce(jsonb_agg(to_jsonb(e) order by id),'[]') from public.document_events e where document_id=${q(f.req.id)}),'stock',(select coalesce(jsonb_agg(to_jsonb(s) order by id),'[]') from public.stock_movements s where care_recipient_id=${q(f.patient)}))::text;`,
  );
