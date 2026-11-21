import assert from "node:assert/strict";
import { test } from "node:test";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { setup, rpc, actor, env, fixtures } from "./v4-fixtures.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";

const options = { auth: { persistSession: false, autoRefreshToken: false } };
async function signIn(name) {
  const client = createClient(env.url, env.anonKey, options);
  assert.ifError((await client.auth.signInWithPassword({ email: fixtures[name].email, password: fixturePassword })).error);
  return client;
}
async function unrelatedIdentity() {
  const service = createClient(env.url, env.serviceKey, options), email = `unrelated-${randomUUID()}@example.invalid`;
  const created = await service.auth.admin.createUser({ email, password: fixturePassword, email_confirm: true });
  assert.ifError(created.error);
  const id = created.data.user.id;
  sql(`insert into public.profiles(id,full_name,role,status) values(${sqlLiteral(id)},'Pessoa fictícia sem relação','reader','active') on conflict(id) do nothing;`);
  const client = createClient(env.url, env.anonKey, options);
  assert.ifError((await client.auth.signInWithPassword({ email, password: fixturePassword })).error);
  return { id, client };
}
async function invite(f, status = "pending") {
  const hash = createHash("sha256").update(randomBytes(32)).digest("hex");
  const value = await rpc(f.admin, "admin_create_invitation", { p_care_recipient_id: f.patient, p_email: fixtures.adminB.email, p_role: "professional", p_can_manage_stock: false, p_can_count_stock: true, p_token_hash: hash, p_expires_at: new Date(Date.now() + 3600_000).toISOString() });
  if (status === "expired") sql(`update public.care_recipient_invitations set expires_at=now()-interval '1 second' where id=${sqlLiteral(value.id)};`);
  if (status === "revoked") await rpc(f.admin, "revoke_invitation", { p_invitation_id: value.id });
  return { hash, value };
}

test("invitation preview separates anonymous/wrong account/eligible/terminal states without granting authority", async () => {
  const f = await setup(), intended = await signIn("adminB"), wrong = await signIn("reader"), anonymous = createClient(env.url, env.anonKey, options);
  const preview = (client, hash) => rpc(client, "invitation_preview", { p_token_hash: hash });
  const pending = await invite(f);
  assert.deepEqual(await preview(anonymous, pending.hash), { state: "login_required" });
  assert.deepEqual(await preview(wrong, pending.hash), { state: "wrong_account" });
  assert.deepEqual(await preview(anonymous, "0".repeat(64)), { state: "invalid" });
  const before = Number(sql(`select count(*) from public.care_recipient_memberships where care_recipient_id=${sqlLiteral(f.patient)} and user_id=${sqlLiteral(fixtures.adminB.id)};`));
  const ready = await preview(intended, pending.hash);
  assert.equal(ready.state, "ready");
  assert.equal(ready.role, "professional");
  assert.equal(ready.patientName, sql(`select display_name from public.care_recipients where id=${sqlLiteral(f.patient)};`));
  assert.equal(ready.recipientEmail, fixtures.adminB.email);
  assert.equal(ready.inviterName, "Teste adminA");
  assert.ok(ready.expiresAt);
  assert.equal(before, 0);
  assert.equal(Number(sql(`select count(*) from public.care_recipient_memberships where care_recipient_id=${sqlLiteral(f.patient)} and user_id=${sqlLiteral(fixtures.adminB.id)};`)), before);
  await rpc(intended, "accept_invitation", { p_token_hash: pending.hash });
  assert.equal((await preview(intended, pending.hash)).state, "accepted");
  const membership = JSON.parse(sql(`select jsonb_build_object('role',role,'patient',care_recipient_id) from public.care_recipient_memberships where care_recipient_id=${sqlLiteral(f.patient)} and user_id=${sqlLiteral(fixtures.adminB.id)};`));
  assert.deepEqual(membership, { role: "professional", patient: f.patient });
  for (const state of ["expired", "revoked"]) {
    const candidate = await invite(f, state);
    assert.deepEqual(await preview(anonymous, candidate.hash), { state });
  }
  const decline = await invite(f);
  await rpc(intended, "decline_invitation", { p_token_hash: decline.hash });
  assert.deepEqual(await preview(intended, decline.hash), { state: "declined" });
});

function revision(id) { return BigInt(sql(`select coalesce((select revision from private.workspace_revisions where user_id=${sqlLiteral(id)}),0);`)); }
test("profile updates notify their real private Realtime consumers with revision-only messages", { timeout: 35_000 }, async () => {
  const f = await setup(), own = await actor("family", f.patient), peer = await actor("professional", f.patient), outsider = await unrelatedIdentity();
  const channels = [];
  const messages = [[], [], []];
  async function subscribe(client, id, index) {
    const session = (await client.auth.getSession()).data.session;
    assert.equal(session?.user.id, id, "Private channel must use the intended real identity");
    // Supabase's Auth listener calls setAuth asynchronously. Await the token
    // handoff before joining, including for the newly created unrelated user.
    await client.realtime.setAuth(session.access_token);
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Identity broadcast subscription timed out")), 15_000);
      const channel = client.channel(`hca:user:${id}`, { config: { private: true } }).on("broadcast", { event: "invalidate" }, event => messages[index].push(event.payload)).subscribe(status => {
        if (status === "SUBSCRIBED") { clearTimeout(timer); resolve(); }
        if (status === "CHANNEL_ERROR") { clearTimeout(timer); reject(new Error("Identity broadcast subscription denied")); }
      });
      channels.push([client, channel]);
    });
  }
  const ids = [fixtures.family.id, fixtures.professional.id, outsider.id];
  const original = JSON.parse(sql(`select to_jsonb(p) from public.profiles p where id=${sqlLiteral(ids[0])};`));
  try {
    await Promise.all([subscribe(own, ids[0], 0), subscribe(peer, ids[1], 1), subscribe(outsider.client, ids[2], 2)]);
    // Observe the DB-to-Realtime path before evaluating the producer.
    const start = Date.now();
    while (messages.some(list => !list.length)) {
      for (const id of ids) sql(`select realtime.send('{"revision":0}'::jsonb,'invalidate',${sqlLiteral('hca:user:' + id)},true);`);
      await new Promise(resolve => setTimeout(resolve, 100));
      assert.ok(Date.now() - start < 10_000, `Database broadcast must reach all subscribed private topics: own=${messages[0].length}, related=${messages[1].length}, unrelated=${messages[2].length}`);
    }
    messages.forEach(list => { list.length = 0; });
    const before = ids.map(revision);
    await rpc(own, "update_my_profile", { p_name: "Nome fictício alterado " + randomUUID().slice(0, 8), p_registration: "", p_state: null, p_category: "", p_preferences: original.notification_preferences });
    assert.ok(revision(ids[0]) > before[0], "Own profile revision did not advance");
    assert.ok(revision(ids[1]) > before[1], "Related reader revision did not advance");
    assert.equal(revision(ids[2]), before[2], "Unrelated account received an invalidation");
    const deadline = Date.now() + 10_000;
    while (!messages[0].some(p => BigInt(p.revision) > before[0]) || !messages[1].some(p => BigInt(p.revision) > before[1])) {
      assert.ok(Date.now() < deadline, "Profile producer broadcast did not reach its consumers");
      await new Promise(resolve => setTimeout(resolve, 30));
    }
    // Realtime adds its own message id to the revision-only SQL payload.
    for (const payload of messages.flat()) {
      assert.ok(Object.keys(payload).every(key => ["revision", "id"].includes(key)));
      assert.ok(Number.isSafeInteger(Number(payload.revision)));
    }
  } finally {
    await rpc(own, "update_my_profile", { p_name: original.full_name, p_registration: original.professional_registration ?? "", p_state: original.professional_state, p_category: original.professional_category ?? "", p_preferences: original.notification_preferences });
    await Promise.all(channels.map(([client, channel]) => client.removeChannel(channel)));
    channels.forEach(([client]) => client.realtime.disconnect());
    await outsider.client.auth.signOut({ scope: "local" });
  }
});

test("one transaction emits one final workspace revision per user and rollback emits nothing", async () => {
  await setup();
  const id = fixtures.family.id, related = fixtures.professional.id;
  const original = sql(`select full_name from public.profiles where id=${sqlLiteral(id)};`);
  const messageCount = uid => Number(sql(`select count(*) from realtime.messages where topic=${sqlLiteral('hca:user:' + uid)} and event='invalidate';`));
  const before = [revision(id), revision(related)], messages = [messageCount(id), messageCount(related)];
  sql(`begin; update public.profiles set full_name='Primeira alteração fictícia' where id=${sqlLiteral(id)};
    update public.profiles set full_name='Segunda alteração fictícia' where id=${sqlLiteral(id)};
    update public.profiles set full_name=${sqlLiteral(original)} where id=${sqlLiteral(id)}; commit;`);
  assert.equal(messageCount(id), messages[0] + 1, "Repeated row triggers flooded the own user's channel");
  assert.equal(messageCount(related), messages[1] + 1, "Repeated row triggers flooded the related user's channel");
  assert.equal(revision(id), before[0] + 1n);
  assert.equal(revision(related), before[1] + 1n);
  assert.equal(BigInt(sql(`select (payload->>'revision')::bigint from realtime.messages where topic=${sqlLiteral('hca:user:' + id)} and event='invalidate' order by inserted_at desc,id desc limit 1;`)), revision(id));
  const committed = revision(id), committedMessages = messageCount(id);
  sql(`begin; update public.profiles set full_name='Alteração fictícia revertida' where id=${sqlLiteral(id)}; rollback;`);
  assert.equal(revision(id), committed); assert.equal(messageCount(id), committedMessages);
  assert.equal(Number(sql("select count(*) from private.workspace_invalidation_queue;")), 0);
  assert.equal(sql("select has_table_privilege('authenticated','private.workspace_invalidation_queue','SELECT');"), "f");
});

test("a global proponent without patient membership receives its own proposal invalidation", async () => {
  const f = await setup(), global = await actor("global");
  sql(`delete from public.care_recipient_memberships where care_recipient_id=${sqlLiteral(f.patient)} and user_id=${sqlLiteral(fixtures.global.id)};`);
  const before = revision(fixtures.global.id);
  const policy = await rpc(f.admin, "patient_governance", { p_patient: f.patient });
  const proposal = await rpc(global, "configure_patient_access", { p_patient: f.patient, p_kind: "membership", p_change: { userId: fixtures.adminB.id, role: "professional" }, p_key: randomUUID(), p_version: policy.data.version });
  assert.equal(proposal.status, "pending");
  assert.ok(revision(fixtures.global.id) > before);
});
