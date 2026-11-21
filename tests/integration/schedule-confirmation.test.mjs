import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { actor, rpc, setup } from "./v4-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
const lookup = (client, patient, key) =>
  rpc(client, "schedule_confirmation", { p_patient: patient, p_key: key });
test("own schedule confirmation is read only,account scoped and requires live membership", async () => {
  const { patient, admin } = await setup(),
    other = await actor("reader", patient),
    key = randomUUID();
  const uid = (await admin.auth.getUser()).data.user.id;
  assert.equal((await lookup(admin, patient, key)).found, false);
  const body = {
    name: "Recuperação privada",
    startsLocal: "19:00",
    durationMinutes: 720,
    active: true,
  };
  const type = await rpc(admin, "schedule_command", {
    p_patient: patient,
    p_action: "type",
    p_body: body,
    p_key: key,
    p_version: null,
  });
  const count = () =>
    sql(
      `select count(*) from private.schedule_commands where care_recipient_id=${sqlLiteral(patient)};select count(*) from public.shift_events where care_recipient_id=${sqlLiteral(patient)}`,
    );
  const before = count(),
    result = await lookup(admin, patient, key);
  assert.equal(result.found, true);
  assert.equal(result.userId, uid);
  assert.equal(result.result.id, type.id);
  assert.equal(result.result.status, null);
  assert.deepEqual(result.command, { action: "type", body });
  assert.equal(count(), before);
  assert.equal((await lookup(other, patient, key)).found, false);
  assert.ok(
    (
      await other.rpc("schedule_confirmation", {
        p_patient: randomUUID(),
        p_key: key,
      })
    ).error,
  );
  sql(
    `update public.care_recipient_memberships set status='revoked' where care_recipient_id=${sqlLiteral(patient)} and user_id=${sqlLiteral(uid)}`,
  );
  assert.ok(
    (
      await admin.rpc("schedule_confirmation", {
        p_patient: patient,
        p_key: key,
      })
    ).error,
  );
});
test("own existing outcome survives inactive patient while a new native schedule remains denied", async () => {
  const { patient, admin } = await setup(),
    key = randomUUID();
  const body = {
    name: "Resultado histórico",
    startsLocal: "07:00",
    durationMinutes: 720,
  };
  const first = await rpc(admin, "schedule_command", {
    p_patient: patient,
    p_action: "type",
    p_body: body,
    p_key: key,
  });
  const uid=(await admin.auth.getUser()).data.user.id;
  sql(`update public.care_recipient_memberships set role='reader' where care_recipient_id=${sqlLiteral(patient)} and user_id=${sqlLiteral(uid)}`);
  assert.equal((await lookup(admin,patient,key)).result.id,first.id);
  assert.ok((await admin.rpc("schedule_command",{p_patient:patient,p_action:"type",p_body:body,p_key:randomUUID()})).error);
  sql(
    `update public.care_recipients set is_active=false where id=${sqlLiteral(patient)}`,
  );
  const result = await lookup(admin, patient, key);
  assert.equal(result.found, true);
  assert.equal(result.result.id, first.id);
  assert.ok(
    (
      await admin.rpc("schedule_command", {
        p_patient: patient,
        p_action: "type",
        p_body: body,
        p_key: randomUUID(),
      })
    ).error,
  );
  assert.equal((await lookup(admin, patient, randomUUID())).found, false);
  const acl = sql(
    "select has_function_privilege('anon','public.schedule_confirmation(uuid,uuid)','execute'),has_function_privilege('authenticated','public.schedule_confirmation(uuid,uuid)','execute'),has_function_privilege('service_role','public.schedule_confirmation(uuid,uuid)','execute')",
  );
  assert.match(acl, /f\|t\|f/);
});
