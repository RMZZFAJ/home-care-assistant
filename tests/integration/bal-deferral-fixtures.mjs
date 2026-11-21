import { randomUUID } from "node:crypto";
import {
  balanceSetup,
  balanceCommand,
  shiftCommand,
} from "./shift-fixtures.mjs";
import { rpc, actor } from "./v4-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
export const workspace = (client, patient) =>
  rpc(client, "balance_workspace", { p_patient: patient });
export async function deferralFixture(changeTarget = true) {
  const f = await balanceSetup(),
    original = await workspace(f.pro.client, f.patient),
    assignment = original.eligibility.assignment;
  const target = original.targets.find(
    (s) => Date.parse(s.starts_at) >= Date.parse(assignment.ends_at),
  );
  if (!target)
    throw new Error("Fixture must have a future eligible deferral target");
  const proposal = await balanceCommand(
    f.pro.client,
    f.patient,
    "request_deferral",
    {
      assignmentId: assignment.id,
      targetShiftId: target.id,
      reason: "Solicitação fictícia com destino e prazo preservados.",
    },
    assignment.version,
  );
  if (changeTarget)
    await shiftCommand(
      f.admin,
      f.patient,
      "cancel",
      {
        id: target.id,
        reason:
          "Cancelamento legítimo do plantão futuro após a proposta de adiamento",
      },
      target.version,
    );
  return { ...f, original, assignment, target, proposal };
}
export const decideDeferral = (
  client,
  f,
  approve,
  reason = "Decisão própria sobre a proposta congelada.",
  key = randomUUID(),
) =>
  client.rpc("balance_command", {
    p_patient: f.patient,
    p_action: "decide_deferral",
    p_body: { id: f.proposal.id, approve, reason },
    p_key: key,
    p_version: null,
  });
export const deferralState = (patient) =>
  JSON.parse(
    sql(
      `select jsonb_build_object('requests',(select jsonb_agg(to_jsonb(d) order by id) from public.bal_deferrals d where care_recipient_id=${sqlLiteral(patient)}),'assignments',(select jsonb_agg(to_jsonb(a) order by id) from public.bal_assignments a where care_recipient_id=${sqlLiteral(patient)}),'obligations',(select jsonb_agg(to_jsonb(o) order by id) from public.bal_obligations o where care_recipient_id=${sqlLiteral(patient)}),'events',(select jsonb_agg(to_jsonb(e) order by id) from public.bal_cycle_events e where care_recipient_id=${sqlLiteral(patient)}),'ledger',(select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${sqlLiteral(patient)}));`,
    ),
  );
export { actor, rpc };
