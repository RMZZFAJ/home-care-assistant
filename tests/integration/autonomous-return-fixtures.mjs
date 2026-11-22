import { randomUUID } from "node:crypto";
import { setup, rpc } from "./v4-fixtures.mjs";
import { shiftWorker } from "./shift-fixtures.mjs";
import { declareTransfer, transferCommand, transferState } from "./transfer-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";

export async function autonomousReturnFixture() {
  const f = await setup(), initiator = await shiftWorker(f.patient),
    counterparty = await shiftWorker(f.patient, "family"), recipient = await shiftWorker(f.patient, "family");
  sql("update public.profiles set full_name='Juliana, responsável pela devolução' where id=" + q(initiator.id) +
    ";update public.profiles set full_name='Ana, concordância familiar' where id=" + q(counterparty.id) +
    ";update public.profiles set full_name='Bruno, recebimento familiar' where id=" + q(recipient.id) +
    ";insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(" + q(f.patient) + "," + q(initiator.id) + ",'ent.create',true)");
  // Native optional initial BAL establishes team stock. No ENT exists to be
  // reversed or selected as origin for this independent return process.
  await rpc(f.admin, "create_supply_document", { p_patient: f.patient, p_type: "BAL", p_key: randomUUID(), p_draft: false,
    p_payload: { lines: f.products.map((productId, index) => ({ productId, quantity: index === 0 ? "10" : "0" })), notes: "Contagem inicial fictícia sem entrega anterior." } });
  return { ...f, initiator, counterparty, recipient };
}
export async function declaredAutonomousReturn(f, quantity = "5") {
  const result = await declareTransfer(f, { originDocumentId: null, quantity });
  if (result.response.error) throw result.response.error;
  return { document: result.response.data, args: result.args };
}
export const returnBalances = f => JSON.parse(sql("select jsonb_build_object('family',private.stock_quantity(" + q(f.patient) + "," + q(f.products[0]) + ",'FAMILY'),'team',private.stock_quantity(" + q(f.patient) + "," + q(f.products[0]) + ",'CARE_TEAM'),'transit',private.stock_quantity(" + q(f.patient) + "," + q(f.products[0]) + ",'TRANSIT'))"));
export { declareTransfer, transferCommand, transferState, rpc };
