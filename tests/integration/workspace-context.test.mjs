import test from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { setup, actor, rpc, fixtures, env } from "./v4-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";

const workspace = (client) => rpc(client, "my_workspace", {});
const selected = (view, patient) => view.patients.find((p) => p.id === patient);
const capable = (view) =>
  view.patients.filter((p) => Object.keys(p.capabilities).length);
async function exactSelected(client, patient) {
  const view = await workspace(client);
  assert.deepEqual(
    view.activeContext,
    await rpc(client, "my_active_context", {}),
  );
  assert.deepEqual(
    selected(view, patient).capabilities,
    await rpc(client, "patient_capabilities", { p_patient: patient }),
  );
  assert.deepEqual(
    capable(view).map((p) => p.id),
    [patient],
  );
  return view;
}
function metadata(view) {
  return view.patients.map((row) => {
    const value = { ...row };
    delete value.capabilities;
    return value;
  });
}
function expectedMetadata(user, global = false) {
  return JSON.parse(
    sql(
      `select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'display_name',c.display_name,'is_active',c.is_active,'is_development',c.is_development,'role',m.role,'hasMembership',m.user_id is not null) order by c.display_name,c.id),'[]')::text from public.care_recipients c left join public.care_recipient_memberships m on m.care_recipient_id=c.id and m.user_id=${q(user)} and m.status='active' where ${global ? "true" : "m.user_id is not null"}`,
    ),
  );
}
async function claimsFor(client) {
  const session = (await client.auth.getSession()).data.session;
  assert.ok(session);
  const issued = JSON.parse(
    Buffer.from(session.access_token.split(".")[1], "base64url").toString(),
  );
  // No bearer token or email enters the SQL bridge, output or evidence.
  return {
    sub: issued.sub,
    session_id: issued.session_id,
    role: "authenticated",
    aal: issued.aal,
  };
}

test("workspace keeps the complete ordered directory and changes only native capability scope on explicit selection", async () => {
  const f = await setup(),
    other = await setup();
  await rpc(f.admin, "select_active_context", { p_patient: f.patient });
  const view = await exactSelected(f.admin, f.patient);
  assert.equal(view.isGlobalAdmin, false);
  assert.deepEqual(metadata(view), expectedMetadata(fixtures.adminA.id));
  assert.equal(selected(view, other.patient).role, "admin");
  assert.deepEqual(selected(view, other.patient).capabilities, {});
  const before = sql(
    `select revision from private.authority_sessions where session_id=(select id from auth.sessions where user_id=${q(fixtures.adminA.id)} order by created_at desc limit 1)`,
  );
  await workspace(f.admin);
  assert.equal(
    sql(
      `select revision from private.authority_sessions where session_id=(select id from auth.sessions where user_id=${q(fixtures.adminA.id)} order by created_at desc limit 1)`,
    ),
    before,
  );
  await rpc(f.admin, "select_active_context", { p_patient: other.patient });
  const changed = await exactSelected(f.admin, other.patient);
  assert.deepEqual(metadata(changed), metadata(view));
  assert.deepEqual(selected(changed, f.patient).capabilities, {});
});

test("workspace preserves live overrides and inactive metadata then removes revoked membership and its capability map", async () => {
  const f = await setup(),
    pro = await actor("professional", f.patient);
  sql(
    `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${q(f.patient)},${q(fixtures.professional.id)},'catalog.manage',true),(${q(f.patient)},${q(fixtures.professional.id)},'req.read',false)`,
  );
  let view = await exactSelected(pro, f.patient);
  assert.equal(selected(view, f.patient).capabilities["catalog.manage"], true);
  assert.equal(selected(view, f.patient).capabilities["req.read"], false);
  assert.equal(selected(view, f.patient).capabilities["access.manage"], false);
  sql(
    `update public.care_recipients set is_active=false where id=${q(f.patient)}`,
  );
  view = await exactSelected(pro, f.patient);
  assert.equal(selected(view, f.patient).is_active, false);
  sql(
    `update public.care_recipient_memberships set status='revoked' where care_recipient_id=${q(f.patient)} and user_id=${q(fixtures.professional.id)}`,
  );
  view = await workspace(pro);
  assert.equal(selected(view, f.patient), undefined);
  assert.equal(view.activeContext, null);
  assert.deepEqual(capable(view), []);
});

test("global directory identity never creates local membership or operational authority", async () => {
  const f = await setup(),
    other = await setup();
  await rpc(other.admin, "admin_set_membership_status", {
    p_care_recipient_id: other.patient,
    p_user_id: fixtures.global.id,
    p_status: "revoked",
  });
  const global = await actor("global", null);
  let view = await workspace(global);
  assert.equal(view.isGlobalAdmin, true);
  assert.equal(
    view.globalAdministrationAllowed,
    await rpc(global, "is_global_administrator", {}),
  );
  assert.deepEqual(metadata(view), expectedMetadata(fixtures.global.id, true));
  assert.deepEqual(capable(view), []);
  assert.equal(selected(view, other.patient).hasMembership, false);
  assert.equal(selected(view, other.patient).role, null);
  await rpc(global, "select_active_context", { p_patient: f.patient });
  view = await exactSelected(global, f.patient);
  assert.equal(view.isGlobalAdmin, true);
  assert.equal(view.globalAdministrationAllowed, false);
  assert.deepEqual(selected(view, other.patient).capabilities, {});
  assert.equal(
    (await global.rpc("select_active_context", { p_patient: other.patient }))
      .error?.code,
    "42501",
  );
  assert.equal(
    (await workspace(global)).activeContext.care_recipient_id,
    f.patient,
  );
});

test("workspace refuses anonymous,service and expired real Auth sessions without changing grants", async () => {
  const f = await setup(),
    reader = await actor("reader", f.patient);
  await exactSelected(reader, f.patient);
  for (const key of [env.anonKey, env.serviceKey]) {
    const client = createClient(env.url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    assert.equal((await client.rpc("my_workspace")).error?.code, "42501");
  }
  const claims = await claimsFor(reader);
  sql(
    `update auth.sessions set not_after=clock_timestamp()-interval '1 second' where id=${q(claims.session_id)}`,
  );
  assert.equal((await reader.rpc("my_workspace")).error?.code, "42501");
  assert.equal(
    sql(
      "select has_function_privilege('anon','public.my_workspace()','execute'),has_function_privilege('authenticated','public.my_workspace()','execute'),has_function_privilege('service_role','public.my_workspace()','execute')",
    ),
    "f|t|f",
  );
});

test("workspace preserves transaction-scoped internal authority with and without UI selection and rejects wrong scope", async () => {
  const f = await setup(),
    other = await setup();
  await rpc(f.admin, "select_active_context", { p_patient: f.patient });
  const claims = await claimsFor(f.admin);
  for (const scenario of [
    "valid",
    "no_ui",
    "wrong_backend",
    "wrong_transaction",
    "wrong_user",
  ]) {
    const pid =
        scenario === "wrong_backend"
          ? "pg_backend_pid()+100000"
          : "pg_backend_pid()",
      tx =
        scenario === "wrong_transaction"
          ? "txid_current()+1"
          : "txid_current()",
      user =
        scenario === "wrong_user"
          ? fixtures.professional.id
          : fixtures.adminA.id;
    const value = JSON.parse(
      sql(
        `begin;do $claims$begin perform set_config('request.jwt.claims',${q(JSON.stringify(claims))},true);end;$claims$;${scenario === "no_ui" ? `delete from private.authority_sessions where session_id=${q(claims.session_id)};` : ""}insert into private.worker_authority(backend_pid,transaction_id,user_id,care_recipient_id,purpose) values(${pid},${tx},${q(user)},${q(other.patient)},'test.workspace-context');set local role authenticated;select jsonb_build_object('workspace',public.my_workspace(),'nativeSelected',public.patient_capabilities(${q(f.patient)}),'nativeWorker',public.patient_capabilities(${q(other.patient)}))::text;rollback;`,
      ),
    );
    assert.deepEqual(
      selected(value.workspace, f.patient).capabilities,
      value.nativeSelected,
      scenario,
    );
    assert.deepEqual(
      selected(value.workspace, other.patient).capabilities,
      value.nativeWorker,
      scenario,
    );
    if (scenario === "valid") assert.equal(capable(value.workspace).length, 2);
    else if (scenario === "no_ui") {
      assert.equal(value.workspace.activeContext, null);
      assert.deepEqual(
        capable(value.workspace).map((p) => p.id),
        [other.patient],
      );
    } else
      assert.deepEqual(
        selected(value.workspace, other.patient).capabilities,
        {},
        scenario,
      );
  }
  assert.equal(
    sql(
      "select count(*) from private.worker_authority where purpose='test.workspace-context'",
    ),
    "0",
  );
  assert.equal(
    sql(
      "select has_table_privilege('authenticated','private.worker_authority','select'),has_table_privilege('authenticated','private.worker_authority','insert')",
    ),
    "f|f",
  );
});
