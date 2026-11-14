import { randomUUID } from "node:crypto";
import { setup, actor, rpc, fixtures } from "./v4-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";

export async function legacyBalance({
  policy = "required",
  requirement = "any",
  quantity = "0",
  draft = false,
} = {}) {
  const f = await setup();
  sql(`insert into public.patient_settings(care_recipient_id) values(${sqlLiteral(f.patient)}) on conflict do nothing;
    update public.patient_settings set settings=settings||jsonb_build_object('balReview',${sqlLiteral(policy)},'balRequirement',${sqlLiteral(requirement)}) where care_recipient_id=${sqlLiteral(f.patient)};`);
  const payload = {
    lines: f.products.map((productId) => ({ productId, quantity })),
    notes:
      "Observação original da pessoa que contou; parecer do revisor tem autoria separada.",
  };
  const document = await rpc(f.admin, "create_supply_document", {
    p_patient: f.patient,
    p_type: "BAL",
    p_payload: payload,
    p_key: randomUUID(),
    p_draft: draft,
  });
  return { ...f, payload, document };
}
export const balCommand = (client, document, body, key = randomUUID()) =>
  client.rpc("supply_document_command", {
    p_id: document.id,
    p_action: "approve",
    p_body: body,
    p_key: key,
    p_version: document.version,
  });
export const balApply = (client, document, group = "family", key = randomUUID()) =>
  client.rpc("supply_document_command", {
    p_id: document.id,
    p_action: "apply_balance",
    p_body: { group, reviewReference: document.balanceReview.referenceHash },
    p_key: key,
    p_version: document.version,
  });
export const balState = (id) =>
  sql(
    `select jsonb_build_object('document',(select to_jsonb(d) from public.operational_documents d where id=${sqlLiteral(id)}),'events',(select jsonb_agg(to_jsonb(e) order by version) from public.document_events e where document_id=${sqlLiteral(id)}),'approvals',(select jsonb_agg(to_jsonb(a)) from public.bal_approvals a where document_id=${sqlLiteral(id)}),'reviews',(select jsonb_agg(to_jsonb(r) order by recorded_at,id) from public.balance_reviews r where document_id=${sqlLiteral(id)}),'ledger',(select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where reference_type='bal' and reference_id=${sqlLiteral(id)}));`,
  );
export { actor, rpc };
export async function receiveBalanceMaterials(f, quantity = "1") {
  const document = await rpc(f.admin, "create_supply_document", {
    p_patient: f.patient,
    p_type: "ENT",
    p_key: randomUUID(),
    p_payload: {
      source: "FAMILY",
      destination: "CARE_TEAM",
      recipientId: fixtures.professional.id,
      recipientReason:
        "Recebimento pessoal fictício para verificar referência do balanço",
      lines: [{ productId: f.products[0], quantity }],
    },
  });
  return rpc(
    await actor("professional", f.patient),
    "supply_document_command",
    {
      p_id: document.id,
      p_action: "receive",
      p_body: { divergences: [] },
      p_key: randomUUID(),
      p_version: document.version,
    },
  );
}
