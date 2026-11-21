import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { createECDH, randomBytes, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { setup, issue, rpc, env, fixtures } from "./v4-fixtures.mjs";
import {
  getTestEnvironment,
  sql,
  sqlLiteral,
} from "../../scripts/test-environment.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
getTestEnvironment();
const service = createClient(env.url, env.serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const owned = new Set();
async function login(name = "family") {
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
  return client;
}
function subscription() {
  const key = createECDH("prime256v1");
  key.generateKeys();
  return {
    endpoint: "https://fcm.googleapis.com/wp/synthetic-" + randomUUID(),
    expirationTime: null,
    keys: {
      p256dh: key.getPublicKey().toString("base64url"),
      auth: randomBytes(16).toString("base64url"),
    },
  };
}
async function enroll(client, sub = subscription()) {
  const receipt = await rpc(client, "subscribe_web_push", {
    p_subscription: sub,
    p_label: "Aparelho fictício",
    p_key_version: "test-v1",
  });
  owned.add(receipt.id);
  return { ...receipt, sub };
}
afterEach(async () => {
  for (const id of owned) {
    const owner = sql(
      `select user_id from private.web_push_devices where id=${sqlLiteral(id)};`,
    );
    const name = Object.keys(fixtures).find(
      (key) => fixtures[key]?.id === owner,
    );
    assert.ok(
      name,
      "Cleanup only touches a test-created device belonging to a known synthetic actor",
    );
    await rpc(await login(name), "web_push_device_command", {
      p_id: id,
      p_action: "revoke",
    });
  }
  owned.clear();
});
const rows = (query) =>
  JSON.parse(
    sql(
      `select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from (${query}) t;`,
    ),
  );
async function notice(f) {
  const req = await issue(f.patient, [f.products[0]]);
  const notices = rows(
    `select id,state from public.requisition_notifications where (document_id=${sqlLiteral(req.id)} or requisition_id=${sqlLiteral(req.id)}) and recipient_user_id=${sqlLiteral(fixtures.family.id)} and channel='internal'`,
  );
  assert.equal(
    notices.length,
    1,
    "Native REQ producer must create exactly one family notice",
  );
  const n = notices[0],
    worker = randomUUID();
  if (n.state !== "delivered") {
    assert.equal(n.state, "pending");
    // Select only this fixture's lease, avoiding unrelated retained queue rows.
    sql(
      `update public.requisition_notifications set state='processing',leased_by=${sqlLiteral(worker)},lease_expires_at=clock_timestamp()+interval '2 minutes' where id=${sqlLiteral(n.id)} and state='pending';`,
    );
    assert.equal(
      await rpc(service, "validate_notification_job", {
        p_id: n.id,
        p_worker_id: worker,
      }),
      true,
    );
    assert.equal(
      (
        await rpc(service, "complete_notification_job", {
          p_id: n.id,
          p_worker_id: worker,
          p_state: "delivered",
        })
      ).state,
      "delivered",
    );
  }
  const deliveries = rows(
    `select id,device_id,state,attempts from private.web_push_deliveries where notice_id=${sqlLiteral(n.id)} order by id`,
  );
  return { ...n, req, deliveries };
}
async function claim(worker = randomUUID(), limit = 25) {
  return {
    worker,
    leases: await rpc(service, "claim_web_push_deliveries", {
      p_limit: limit,
      p_worker: worker,
      p_key_version: "test-v1",
    }),
  };
}
const prepare = (batch, lease) =>
  rpc(service, "prepare_web_push_delivery", {
    p_id: lease.id,
    p_worker: batch.worker,
    p_token: lease.leaseToken,
    p_key_version: "test-v1",
  });
const complete = (batch, lease, state) =>
  rpc(service, "complete_web_push_delivery", {
    p_id: lease.id,
    p_worker: batch.worker,
    p_token: lease.leaseToken,
    p_result: state,
    p_error: state === "accepted" ? null : "CONTROLLED_RESULT",
  });

test("real Auth device consent is isolated, retry is idempotent, and endpoints/keys stay private", async () => {
  const owner = await login(),
    other = await login("professional"),
    device = await enroll(owner);
  assert.deepEqual(
    await rpc(owner, "subscribe_web_push", {
      p_subscription: device.sub,
      p_label: "Aparelho fictício",
      p_key_version: "test-v1",
    }),
    { id: device.id, fingerprint: device.fingerprint },
  );
  const devices = await rpc(owner, "my_web_push_devices"),
    current = devices.find((row) => row.id === device.id);
  assert.ok(current?.currentSession);
  assert.equal(current.state, "active");
  assert.equal(JSON.stringify(devices).includes(device.sub.endpoint), false);
  assert.equal(JSON.stringify(devices).includes(device.sub.keys.auth), false);
  assert.equal(
    (await rpc(other, "my_web_push_devices")).some(
      (row) => row.id === device.id,
    ),
    false,
  );
  assert.equal(
    (
      await other.rpc("web_push_device_command", {
        p_id: device.id,
        p_action: "revoke",
      })
    ).error?.code,
    "42501",
  );
  assert.equal(
    sql(
      `select count(*) from private.web_push_device_events where device_id=${sqlLiteral(device.id)};`,
    ),
    "1",
  );
  const anonymous = createClient(env.url, env.anonKey, {
    auth: { persistSession: false },
  });
  assert.ok((await anonymous.rpc("my_web_push_devices")).error);
  assert.ok((await service.rpc("my_web_push_devices")).error);
  assert.ok(
    (
      await owner.rpc("claim_web_push_deliveries", {
        p_limit: 1,
        p_worker: randomUUID(),
        p_key_version: "test-v1",
      })
    ).error,
  );
  for (const endpoint of [
    "https://127.0.0.1/private",
    "http://fcm.googleapis.com/wp/test",
    "https://fcm.googleapis.com.evil.test/x",
    "https://fcm.googleapis.com:8443/x",
    "https://fcm.googleapis.com@127.0.0.1/x",
  ]) {
    assert.ok(
      (
        await owner.rpc("subscribe_web_push", {
          p_subscription: { ...device.sub, endpoint },
          p_label: "Invalid",
          p_key_version: "test-v1",
        })
      ).error,
    );
  }
});

test("native internal event fans out once per consenting device, with one dispatch per lease and no business acknowledgment", async () => {
  const f = await setup(),
    owner = await login(),
    first = await enroll(owner),
    second = await enroll(owner);
  const n = await notice(f);
  assert.equal(n.deliveries.length, 2);
  const before = sql(
    `select count(*) from public.document_events where document_id=${sqlLiteral(n.req.id)};`,
  );
  await rpc(owner, "subscribe_web_push", {
    p_subscription: first.sub,
    p_label: "Aparelho fictício",
    p_key_version: "test-v1",
  });
  assert.equal(
    sql(
      `select count(*) from private.web_push_deliveries where notice_id=${sqlLiteral(n.id)} and state='pending';`,
    ),
    "2",
  );
  const batch = await claim();
  const leases = batch.leases.filter((lease) =>
    n.deliveries.some((d) => d.id === lease.id),
  );
  assert.equal(leases.length, 2);
  for (const lease of leases) {
    assert.equal(
      await rpc(service, "prepare_web_push_delivery", {
        p_id: lease.id,
        p_worker: randomUUID(),
        p_token: lease.leaseToken,
        p_key_version: "test-v1",
      }),
      null,
    );
    const prepared = await prepare(batch, lease);
    assert.equal(prepared.id, lease.id);
    assert.ok(
      [first.sub.endpoint, second.sub.endpoint].includes(
        prepared.subscription.endpoint,
      ),
    );
    assert.equal(
      await prepare(batch, lease),
      null,
      "Repeated preparation cannot dispatch the same lease again",
    );
    assert.equal(await complete(batch, lease, "accepted"), "accepted");
    assert.equal(await complete(batch, lease, "accepted"), "accepted");
    const target = await rpc(owner, "resolve_web_push", { p_id: lease.id });
    assert.equal(target.state, "available");
    assert.equal(target.careRecipientId, f.patient);
  }
  assert.equal(
    sql(
      `select count(*) from public.document_events where document_id=${sqlLiteral(n.req.id)};`,
    ),
    before,
  );
  assert.equal(
    sql(
      `select count(*) from private.web_push_attempts where delivery_id in (select id from private.web_push_deliveries where notice_id=${sqlLiteral(n.id)});`,
    ),
    "2",
  );
});

test("membership revocation after claim rejects the actual dispatch and hides deep links from both revoked and other accounts", async () => {
  const f = await setup(),
    owner = await login();
  await enroll(owner);
  const n = await notice(f),
    batch = await claim();
  const lease = batch.leases.find((row) => row.id === n.deliveries[0].id);
  assert.ok(lease);
  sql(
    `update public.care_recipient_memberships set status='revoked' where care_recipient_id=${sqlLiteral(f.patient)} and user_id=${sqlLiteral(fixtures.family.id)};`,
  );
  assert.equal(await prepare(batch, lease), null);
  assert.deepEqual(await rpc(owner, "resolve_web_push", { p_id: lease.id }), {
    state: "unavailable",
  });
  assert.deepEqual(
    await rpc(await login("professional"), "resolve_web_push", {
      p_id: lease.id,
    }),
    { state: "unavailable" },
  );
  assert.equal(
    sql(
      `select state from private.web_push_deliveries where id=${sqlLiteral(lease.id)};`,
    ),
    "cancelled",
  );
});

test("explicit account reassignment preserves ownership history, cancels old delivery, and does not transfer an old notification", async () => {
  const f = await setup(),
    owner = await login(),
    device = await enroll(owner),
    n = await notice(f),
    other = await login("professional");
  const changed = await enroll(other, device.sub);
  assert.equal(changed.id, device.id);
  assert.equal(
    (await rpc(owner, "my_web_push_devices")).some(
      (row) => row.id === device.id,
    ),
    false,
  );
  assert.ok(
    (await rpc(other, "my_web_push_devices")).some(
      (row) => row.id === device.id,
    ),
  );
  assert.equal(
    (
      await owner.rpc("web_push_device_command", {
        p_id: device.id,
        p_action: "revoke",
      })
    ).error?.code,
    "42501",
  );
  assert.deepEqual(
    await rpc(other, "resolve_web_push", { p_id: n.deliveries[0].id }),
    { state: "unavailable" },
  );
  assert.equal(
    sql(
      `select state from private.web_push_deliveries where id=${sqlLiteral(n.deliveries[0].id)};`,
    ),
    "cancelled",
  );
  assert.equal(
    sql(
      `select count(*) from private.web_push_device_events where device_id=${sqlLiteral(device.id)} and event='reassigned' and user_id=${sqlLiteral(fixtures.family.id)};`,
    ),
    "1",
  );
});

test("lease lost before preparation is safe to retry; lost after preparation remains uncertain without resend", async () => {
  const f = await setup(),
    owner = await login();
  await enroll(owner);
  const n = await notice(f);
  let batch = await claim();
  let lease = batch.leases.find((row) => row.id === n.deliveries[0].id);
  assert.ok(lease);
  sql(
    `update private.web_push_deliveries set lease_expires_at=clock_timestamp()-interval '1 second' where id=${sqlLiteral(lease.id)};`,
  );
  batch = await claim();
  lease = batch.leases.find((row) => row.id === lease.id);
  assert.ok(lease);
  await prepare(batch, lease);
  sql(
    `update private.web_push_deliveries set lease_expires_at=clock_timestamp()-interval '1 second' where id=${sqlLiteral(lease.id)};`,
  );
  assert.equal(
    (await claim()).leases.some((row) => row.id === lease.id),
    false,
  );
  assert.equal(
    sql(
      `select state||':'||attempts from private.web_push_deliveries where id=${sqlLiteral(lease.id)};`,
    ),
    "uncertain:1",
  );
  assert.equal(
    sql(
      `select outcome from private.web_push_attempts where delivery_id=${sqlLiteral(lease.id)};`,
    ),
    "uncertain",
  );
});

test("provider expiration retires the device and transient rejections use bounded attempts/backoff", async () => {
  const f = await setup(),
    owner = await login(),
    device = await enroll(owner),
    n = await notice(f);
  let batch = await claim();
  let lease = batch.leases.find((row) => row.id === n.deliveries[0].id);
  assert.ok(lease);
  await prepare(batch, lease);
  assert.equal(await complete(batch, lease, "expired"), "expired");
  await claim();
  assert.equal(
    (await rpc(owner, "my_web_push_devices")).find(
      (row) => row.id === device.id,
    ).state,
    "expired",
  );
  const replacement = await enroll(owner);
  const next = await notice(await setup());
  const job = next.deliveries.find((row) => row.device_id === replacement.id);
  assert.ok(job);
  for (let attempt = 1; attempt <= 5; attempt++) {
    batch = await claim();
    lease = batch.leases.find((row) => row.id === job.id);
    assert.ok(lease);
    await prepare(batch, lease);
    assert.equal(
      await complete(batch, lease, "pending"),
      attempt === 5 ? "failed" : "pending",
    );
    if (attempt < 5) {
      assert.equal(
        sql(
          `select next_attempt_at>clock_timestamp() from private.web_push_deliveries where id=${sqlLiteral(job.id)};`,
        ),
        "t",
      );
      // Advance only this controlled fixture's due time, without sleeping/reset.
      sql(
        `update private.web_push_deliveries set next_attempt_at=clock_timestamp() where id=${sqlLiteral(job.id)};`,
      );
    }
  }
  assert.equal(
    sql(
      `select count(*) from private.web_push_attempts where delivery_id=${sqlLiteral(job.id)};`,
    ),
    "5",
  );
});

test("concurrent workers claim disjoint deliveries, pause keeps the internal notice, and expired Auth cannot change a device", async () => {
  const f = await setup(),
    owner = await login(),
    first = await enroll(owner);
  await enroll(owner);
  const n = await notice(f);
  const [a, b] = await Promise.all([
    claim(randomUUID(), 1),
    claim(randomUUID(), 1),
  ]);
  assert.equal(a.leases.length, 1);
  assert.equal(b.leases.length, 1);
  assert.notEqual(a.leases[0].id, b.leases[0].id);
  await rpc(owner, "web_push_device_command", {
    p_id: first.id,
    p_action: "pause",
  });
  assert.equal(
    sql(
      `select state from public.requisition_notifications where id=${sqlLiteral(n.id)};`,
    ),
    "delivered",
  );
  const token = (await owner.auth.getSession()).data.session.access_token;
  const claims = JSON.parse(
    Buffer.from(token.split(".")[1], "base64url").toString(),
  );
  sql(
    `update auth.sessions set not_after=clock_timestamp()-interval '1 second' where id=${sqlLiteral(claims.session_id)};`,
  );
  assert.equal(
    (
      await owner.rpc("web_push_device_command", {
        p_id: first.id,
        p_action: "resume",
      })
    ).error?.code,
    "42501",
  );
});

test("personal Push test binds Auth and session, reserves once, rate limits and fences concurrent dispatch", async () => {
  const owner = await login(), otherSession = await login(), stranger = await login("professional");
  const device = await enroll(owner), key = randomUUID();
  const args = { p_device: device.id, p_key: key, p_key_version: "test-v1" };
  const anonymous = createClient(env.url, env.anonKey, { auth: { persistSession: false } });
  for (const denied of [anonymous, service, stranger, otherSession])
    assert.equal((await denied.rpc("request_my_web_push_test", args)).error?.code, "42501");
  const before = sql("select count(*) from public.requisition_notifications;");
  const [a, b] = await Promise.all([rpc(owner, "request_my_web_push_test", args), rpc(owner, "request_my_web_push_test", args)]);
  assert.equal(a.id, b.id); assert.equal(a.state, "pending");
  assert.deepEqual(Object.keys(a).sort(), ["code", "id", "requestedAt", "state"]);
  assert.equal((await owner.rpc("request_my_web_push_test", { ...args, p_key: randomUUID() })).error?.code, "PT429");
  const token = randomUUID(), prepare = { p_id: a.id, p_user: fixtures.family.id, p_token: token, p_key_version: "test-v1" };
  for (const version of [null, "", "bad version"])
    assert.equal((await service.rpc("prepare_web_push_test", { ...prepare, p_key_version: version })).error?.code, "P0001");
  assert.equal((await owner.rpc("prepare_web_push_test", prepare)).error?.code, "42501");
  assert.equal(await rpc(service, "prepare_web_push_test", { ...prepare, p_user: fixtures.professional.id }), null);
  const prepared = await Promise.all([rpc(service, "prepare_web_push_test", prepare), rpc(service, "prepare_web_push_test", { ...prepare, p_token: randomUUID() })]);
  assert.equal(prepared.filter(Boolean).length, 1);
  assert.equal(prepared[0]?.subscription.endpoint ?? prepared[1]?.subscription.endpoint, device.sub.endpoint);
  const actualToken = sql(`select lease_token from private.web_push_tests where id=${sqlLiteral(a.id)};`);
  assert.equal(await rpc(service, "complete_web_push_test", { p_id: a.id, p_token: randomUUID(), p_result: "accepted" }), "processing");
  assert.equal(await rpc(service, "complete_web_push_test", { p_id: a.id, p_token: actualToken, p_result: "accepted" }), "accepted");
  assert.equal((await rpc(owner, "request_my_web_push_test", args)).state, "accepted");
  assert.equal(await rpc(service, "prepare_web_push_test", prepare), null);
  assert.equal(sql("select count(*) from public.requisition_notifications;"), before);
  assert.equal(sql(`select count(*) from private.web_push_tests where user_id=${sqlLiteral(fixtures.family.id)} and request_key=${sqlLiteral(key)};`), "1");
});

test("personal Push test rechecks pause, revocation, key and actual Auth session before transport", async () => {
  const owner = await login();
  for (const condition of ["pause", "revoke", "key", "session"]) {
    const device = await enroll(owner), key = randomUUID();
    const result = await rpc(owner, "request_my_web_push_test", { p_device: device.id, p_key: key, p_key_version: "test-v1" });
    if (condition === "pause" || condition === "revoke") await rpc(owner, "web_push_device_command", { p_id: device.id, p_action: condition });
    if (condition === "session") {
      const session = (await owner.auth.getClaims()).data.claims.session_id;
      sql(`update auth.sessions set not_after=clock_timestamp()-interval '1 second' where id=${sqlLiteral(session)};`);
    }
    const payload = await rpc(service, "prepare_web_push_test", { p_id: result.id, p_user: fixtures.family.id, p_token: randomUUID(), p_key_version: condition === "key" ? "other-version" : "test-v1" });
    assert.equal(payload, null);
    assert.equal(sql(`select state from private.web_push_tests where id=${sqlLiteral(result.id)};`), "expired");
  }
});

test("personal Push test preserves an uncertain transport result and never replays it", async () => {
  const owner = await login(), device = await enroll(owner), key = randomUUID();
  const args = { p_device: device.id, p_key: key, p_key_version: "test-v1" };
  const result = await rpc(owner, "request_my_web_push_test", args), token = randomUUID();
  const prepare = { p_id: result.id, p_user: fixtures.family.id, p_token: token, p_key_version: "test-v1" };
  assert.ok(await rpc(service, "prepare_web_push_test", prepare));
  sql(`update private.web_push_tests set dispatch_started_at=clock_timestamp()-interval '31 seconds' where id=${sqlLiteral(result.id)};`);
  assert.equal((await rpc(owner, "request_my_web_push_test", args)).state, "uncertain");
  assert.equal(await rpc(service, "prepare_web_push_test", prepare), null);
  assert.equal(await rpc(service, "complete_web_push_test", { p_id: result.id, p_token: token, p_result: "accepted" }), "uncertain");
  const another = await enroll(owner);
  assert.equal((await owner.rpc("request_my_web_push_test", { ...args, p_device: another.id })).error?.code, "PT409");
});
