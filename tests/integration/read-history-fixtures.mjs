import { randomUUID } from "node:crypto";
import { setup, rpc, fixtures } from "./v4-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";

export async function historyFixture() {
  const f = await setup(), oldest = randomUUID(), resource = randomUUID();
  // Synthetic historical rows in a newly created fictitious patient, never a
  // claim that these test records represent invitations actually sent/accepted.
  sql(`insert into public.audit_events(id,actor_id,action,entity_type,entity_id,metadata,created_at)
    select case when n=0 then ${sqlLiteral(oldest)}::uuid else gen_random_uuid() end,${sqlLiteral(fixtures.adminA.id)},'invitation.created','invitation',
      case when n=0 then ${sqlLiteral(resource)}::uuid else gen_random_uuid() end,
      jsonb_build_object('care_recipient_id',${sqlLiteral(f.patient)},'syntheticAuditFixture',true,'sequence',n),
      case when n=0 then '2026-01-01T11:00:00Z'::timestamptz else '2026-01-01T12:00:00Z'::timestamptz end from generate_series(0,200)n;`);
  return { ...f, oldest, resource };
}
export async function documentPageFixture() {
  const f = await setup(), ids = [];
  for (let index = 0; index < 16; index++) ids.push((await rpc(f.admin, "create_supply_document", {
    p_patient: f.patient, p_type: "COM", p_payload: { origin: "purchase", lines: [{ productId: f.products[0], quantity: "1" }] }, p_key: randomUUID(), p_draft: true,
  })).id);
  return { ...f, ids };
}
