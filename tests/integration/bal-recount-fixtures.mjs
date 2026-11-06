import { randomUUID } from "node:crypto";
import {
  balanceSetup,
  shiftWorker,
  shiftCommand,
  balanceCommand,
} from "./shift-fixtures.mjs";
import { actor, rpc } from "./v4-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
export const workspace = (client, patient) =>
  rpc(client, "balance_workspace", { p_patient: patient });
export async function pendingRecount({
  reviewPolicy = "required",
  firstReview = true,
  referenceQuantity = "5",
  countQuantity = "2",
} = {}) {
  const f = await balanceSetup();
  sql(`update public.profiles set full_name='Juliana fictícia, contadora original' where id=${sqlLiteral(f.pro.id)};
    insert into public.patient_settings(care_recipient_id) values(${sqlLiteral(f.patient)}) on conflict do nothing;
    update public.patient_settings set settings=settings||jsonb_build_object('balReview',${sqlLiteral(reviewPolicy)},'balRequirement','all','balApprovers',jsonb_build_array('family','supervisor')) where care_recipient_id=${sqlLiteral(f.patient)};`);
  const delivery = await rpc(f.admin, "create_supply_document", {
    p_patient: f.patient,
    p_type: "ENT",
    p_key: randomUUID(),
    p_payload: {
      source: "FAMILY",
      destination: "CARE_TEAM",
      recipientId: f.pro.id,
      recipientReason:
        "Entrega pessoal fictícia para comprovar a conciliação após reconto",
      lines: [{ productId: f.products[0], quantity: referenceQuantity }],
    },
  });
  await rpc(f.pro.client, "supply_document_command", {
    p_id: delivery.id,
    p_action: "receive",
    p_body: { divergences: [] },
    p_key: randomUUID(),
    p_version: delivery.version,
  });
  const initial = await workspace(f.pro.client, f.patient),
    assignment = initial.eligibility.assignment;
  const payload = {
    lines: f.products.map((productId, i) => ({
      productId,
      quantity: i ? "0" : countQuantity,
    })),
    notes: "Observações originais da contagem um, por Juliana fictícia.",
    balanceAssignment: {
      id: assignment.id,
      version: assignment.version,
      referenceRevision: initial.referenceRevision,
    },
  };
  const issued = await rpc(f.pro.client, "create_supply_document", {
    p_patient: f.patient,
    p_type: "BAL",
    p_payload: payload,
    p_key: randomUUID(),
    p_draft: false,
  });
  const family = await actor("family", f.patient);
  const document = firstReview
    ? await rpc(family, "supply_document_command", {
        p_id: issued.id,
        p_action: "approve",
        p_body: {
          group: "family",
          comment: "Parecer da primeira contagem, anterior ao reconto.",
        },
        p_key: randomUUID(),
        p_version: issued.version,
      })
    : issued;
  return { ...f, initial, assignment, payload, document, family, delivery };
}
export const recountPacket = async (client, f, target, key = randomUUID()) => {
  const source = await rpc(client, "balance_recount_context", {
    p_id: f.document.id,
  });
  return {
    p_patient: f.patient,
    p_action: "assign_recount",
    p_body: {
      documentId: f.document.id,
      targetShiftId: target.id,
      targetShiftVersion: target.version,
      referenceHash: source.referenceHash,
      reason: "Reconto formal solicitado sem apagar a primeira contagem.",
    },
    p_key: key,
    p_version: source.documentVersion,
  };
};
export const assignRecount = async (client, f, target, key = randomUUID()) =>
  client.rpc("balance_command", await recountPacket(client, f, target, key));
export async function substitute(f) {
  const second = await shiftWorker(f.patient);
  sql(
    `update public.profiles set full_name='Sheila fictícia, substituta do reconto' where id=${sqlLiteral(second.id)};`,
  );
  const target = f.initial.targets.find((s) => s.id === f.assignment.shift_id);
  await shiftCommand(
    f.admin,
    f.patient,
    "change",
    {
      id: target.id,
      professionalId: second.id,
      reason: "Substituição formal da profissional no mesmo período do reconto",
    },
    target.version,
  );
  await balanceCommand(f.admin, f.patient, "refresh", {});
  return second;
}
export { actor, rpc, balanceCommand };
export const recountState = (f) =>
  sql(`select jsonb_build_object(
  'document',(select to_jsonb(d) from public.operational_documents d where id=${sqlLiteral(f.document.id)}),
  'events',(select jsonb_agg(to_jsonb(e) order by version) from public.document_events e where document_id=${sqlLiteral(f.document.id)}),
  'reviews',(select jsonb_agg(to_jsonb(r) order by recorded_at,id) from public.balance_reviews r where document_id=${sqlLiteral(f.document.id)}),
  'assignments',(select jsonb_agg(to_jsonb(a) order by created_at,id) from public.bal_assignments a where care_recipient_id=${sqlLiteral(f.patient)}),
  'obligations',(select jsonb_agg(to_jsonb(o) order by week_start) from public.bal_obligations o where care_recipient_id=${sqlLiteral(f.patient)}),
  'ledger',(select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${sqlLiteral(f.patient)}),
  'cycleEvents',(select jsonb_agg(to_jsonb(e) order by created_at,id) from public.bal_cycle_events e where care_recipient_id=${sqlLiteral(f.patient)}));`);
