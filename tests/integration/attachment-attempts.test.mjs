import assert from "node:assert/strict";
import test, { after, afterEach, before } from "node:test";
import { createHash, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { setup, actor, env, fixtures, rpc } from "./v4-fixtures.mjs";
import { pauseLocalAutomationForTests, sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";

const owned = new Set(), worker = createClient(env.url, env.serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const digest = bytes => createHash("sha256").update(bytes).digest("hex");
let automation = [];
before(() => { automation = JSON.parse(sql("select coalesce(jsonb_agg(jsonb_build_object('id',jobid,'name',jobname,'active',active)),'[]') from cron.job where jobname in ('hca-operational-lifecycle','hca-notification-worker')")); pauseLocalAutomationForTests(); });
after(() => { for (const job of automation) sql(`select cron.alter_job(jobid,active=>${job.active}) from cron.job where jobid=${job.id} and jobname=${q(job.name)}`); });
afterEach(() => { if (owned.size) sql(`update public.care_recipients set is_active=false where id=any(array[${[...owned].map(q).join(",")}]::uuid[])`); owned.clear(); });
async function fixture() {
  const f = await setup(); owned.add(f.patient);
  const owner = await actor("family", f.patient);
  const doc = await rpc(owner, "create_supply_document", { p_patient: f.patient, p_type: "COM", p_payload: { origin: "purchase", lines: [{ productId: f.products[0], quantity: "1" }] }, p_key: randomUUID(), p_draft: false });
  const source = await sharp({ create: { width: 8, height: 4, channels: 3, background: "#123456" } }).png().toBuffer();
  const bytes = await sharp(source).rotate().resize(4096, 4096, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 88 }).toBuffer();
  return { ...f, owner, doc, source, bytes, hash: digest(bytes), sourceHash: digest(source) };
}
function args(f, key = randomUUID()) { return { p_patient: f.patient, p_document: f.doc.id, p_movement: null, p_filename: "ficha-ficticia.png", p_mime: "image/jpeg", p_bytes: f.bytes.length, p_key: key, p_source_hash: f.sourceHash, p_source_bytes: f.source.length, p_source_mime: "image/png", p_hash: f.hash, p_transformation: "image-normalized-v1" }; }
async function prepare(f, input = args(f)) {
  const a = await rpc(f.owner, "prepare_attachment_attempt", input);
  if (!a.legacy) await rpc(worker, "attest_attachment_source", { p_id: a.id, p_actor: fixtures.family.id, p_source_hash: f.sourceHash, p_source_bytes: f.source.length, p_source_mime: "image/png", p_hash: f.hash, p_transformation: "image-normalized-v1" });
  return a;
}
const get = (f, key = null, client = f.owner) => rpc(client, "attachment_attempts", { p_patient: f.patient, p_document: f.doc.id, p_movement: null, p_key: key });
const begin = (f, a, token = randomUUID()) => rpc(f.owner, "begin_attachment_upload", { p_id: a.id, p_source_hash: f.sourceHash, p_hash: f.hash, p_token: token });
const abandon = (f, a, key) => rpc(f.owner, "abandon_attachment_attempt", { p_id: a.id, p_key: key });
const settle = (f, a, token, outcome) => rpc(worker, "settle_attachment_upload", { p_id: a.id, p_actor: fixtures.family.id, p_token: token, p_outcome: outcome });
const finalize = (f, a) => rpc(worker, "finalize_attachment", { p_id: a.id, p_actor: fixtures.family.id, p_hash: f.hash, p_mime: "image/jpeg", p_bytes: f.bytes.length, p_valid: true });
const upload = (f, a) => f.owner.storage.from("patient-evidence").upload(a.object_path, f.bytes, { contentType: "image/jpeg", upsert: false });
function count(f) { return Number(sql(`select count(*) from public.attachments where document_id=${q(f.doc.id)}`)); }

test("frozen original and derivative fingerprints reject byte substitution; private attempts retain current Auth authority", async () => {
  const f = await fixture(), input = args(f), a = await prepare(f, input);
  assert.equal((await prepare(f, input)).id, a.id); assert.notEqual(f.sourceHash, f.hash); assert.equal(count(f), 1);
  for (const change of [{ p_source_hash: "a".repeat(64) }, { p_hash: "b".repeat(64) }, { p_source_bytes: f.source.length + 1 }]) assert.equal((await f.owner.rpc("prepare_attachment_attempt", { ...input, ...change })).error?.code, "23505");
  const [record] = await get(f, input.p_key); assert.equal(record.sourceSha256, f.sourceHash); assert.equal(record.expectedSha256, f.hash); assert.equal(record.canAbandon, true); assert.equal(record.pending, false);
  const other = await actor("adminA", f.patient); assert.deepEqual(await get(f, input.p_key, other), []);
  assert.equal((await other.rpc("begin_attachment_upload", { p_id: a.id, p_source_hash: f.sourceHash, p_hash: f.hash, p_token: randomUUID() })).error?.code, "42501");
  for (const key of [env.anonKey, env.serviceKey]) assert.ok((await createClient(env.url, key, { auth: { persistSession: false } }).rpc("attachment_attempts", { p_patient: f.patient, p_document: f.doc.id, p_movement: null, p_key: input.p_key })).error);
  assert.equal(sql("select not has_table_privilege('authenticated','private.attachment_attempts','select,insert,update,delete') and not has_table_privilege('service_role','private.attachment_uploads','select,insert,update,delete')"), "t");
});

test("ten formal abandonments free capacity and preserve all rows, fingerprints, audit history and official document facts", async () => {
  const f = await fixture(), reservations = [];
  const before = sql(`select jsonb_build_object('version',version,'snapshot',canonical_snapshot,'hash',content_hash) from public.operational_documents where id=${q(f.doc.id)}`);
  for (let index = 0; index < 10; index++) { const input = args(f); reservations.push({ input, a: await prepare(f, input) }); }
  assert.ok((await f.owner.rpc("prepare_attachment_attempt", args(f))).error?.message.includes("attachment limit reached"));
  for (const { input, a } of reservations) { const receipt = { id: a.id, persistence: "abandoned" }; assert.deepEqual(await abandon(f, a, input.p_key), receipt); assert.deepEqual(await abandon(f, a, input.p_key), receipt); }
  assert.equal(count(f), 10); assert.equal(sql(`select count(*) from public.audit_events where action='attachment.abandoned' and entity_id=any(array[${reservations.map(({ a }) => q(a.id)).join(",")}]::uuid[])`), "10");
  assert.equal(sql(`select count(*) from private.attachment_attempts t join public.attachments a on a.id=t.attachment_id where a.document_id=${q(f.doc.id)} and t.source_hash=${q(f.sourceHash)} and a.state='abandoned' and t.abandoned_at is not null`), "10");
  assert.equal(sql(`select jsonb_build_object('version',version,'snapshot',canonical_snapshot,'hash',content_hash) from public.operational_documents where id=${q(f.doc.id)}`), before);
  const fresh = await prepare(f); assert.equal(count(f), 11); assert.deepEqual((await get(f)).map(a => a.id), [fresh.id]);
  assert.equal((await get(f, reservations[0].input.p_key))[0].state, "abandoned");
});

test("actual Storage upload requires an active send, never abandons a pending or stored result, and binds ready exactly once", async () => {
  const f = await fixture(), input = args(f), a = await prepare(f, input), token = randomUUID();
  assert.ok((await upload(f, a)).error); await begin(f, a, token);
  assert.equal((await f.owner.rpc("abandon_attachment_attempt", { p_id: a.id, p_key: input.p_key })).error?.code, "PT409");
  const writes = await Promise.all([upload(f, a), upload(f, a)]); assert.equal(writes.filter(result => !result.error).length, 1);
  await settle(f, a, token, "stored");
  assert.equal((await f.owner.rpc("abandon_attachment_attempt", { p_id: a.id, p_key: input.p_key })).error?.code, "PT409");
  await finalize(f, a); await rpc(f.owner, "bind_validated_attachment", { p_id: a.id }); await rpc(f.owner, "bind_validated_attachment", { p_id: a.id });
  const stored = await f.owner.storage.from("patient-evidence").download(a.object_path); assert.ifError(stored.error); assert.equal(digest(Buffer.from(await stored.data.arrayBuffer())), f.hash);
  assert.equal((await get(f, input.p_key))[0].state, "ready");
  assert.equal(sql(`select count(*) from public.document_events where document_id=${q(f.doc.id)} and action='attachment.bound' and body->'event'->>'attachmentId'=${q(a.id)}`), "1");
  assert.equal((await f.owner.rpc("abandon_attachment_attempt", { p_id: a.id, p_key: input.p_key })).error?.code, "PT409"); assert.equal(count(f), 1);
});

test("an absent object or an old clock never proves an uncertain upload absent; same-file recovery can conclude it", async () => {
  const f = await fixture(), input = args(f), a = await prepare(f, input), token = randomUUID();
  await begin(f, a, token); await settle(f, a, token, "uncertain");
  sql(`update private.attachment_uploads set started_at='2000-01-01' where attachment_id=${q(a.id)}`);
  const [record] = await get(f, input.p_key); assert.equal(record.pending, true); assert.equal(record.canAbandon, false);
  assert.equal((await f.owner.rpc("abandon_attachment_attempt", { p_id: a.id, p_key: input.p_key })).error?.code, "PT409");
  const retry = randomUUID(); await begin(f, a, retry); assert.ifError((await upload(f, a)).error); await settle(f, a, retry, "stored"); await finalize(f, a); await rpc(f.owner, "bind_validated_attachment", { p_id: a.id });
  assert.equal((await get(f, input.p_key))[0].state, "ready"); assert.equal(count(f), 1);
  assert.equal(sql(`select count(*) from private.attachment_uploads where attachment_id=${q(a.id)}`), "2");
});

test("racing begin and abandon serialize: an abandoned reservation cannot upload or finalize afterwards", async () => {
  const f = await fixture();
  for (let index = 0; index < 6; index++) {
    const input = args(f), a = await prepare(f, input), token = randomUUID();
    const [start, stop] = await Promise.all([f.owner.rpc("begin_attachment_upload", { p_id: a.id, p_source_hash: f.sourceHash, p_hash: f.hash, p_token: token }), f.owner.rpc("abandon_attachment_attempt", { p_id: a.id, p_key: input.p_key })]);
    assert.equal(Number(Boolean(start.error)) + Number(Boolean(stop.error)), 1);
    assert.equal((start.error ?? stop.error).code, "PT409");
    if (!start.error) { await settle(f, a, token, "refused"); await abandon(f, a, input.p_key); }
    assert.equal((await get(f, input.p_key))[0].state, "abandoned"); assert.ok((await upload(f, a)).error);
    assert.equal((await worker.rpc("finalize_attachment", { p_id: a.id, p_actor: fixtures.family.id, p_hash: f.hash, p_mime: "image/jpeg", p_bytes: f.bytes.length, p_valid: true })).error?.code, "PT409");
    assert.equal(sql(`select count(*) from storage.objects where bucket_id='patient-evidence' and name=${q(a.object_path)}`), "0");
  }
});

test("legacy reservations retain their upload/finalize contract and never acquire invented provenance or abandonment permission", async () => {
  const f = await fixture(), input = args(f), a = await rpc(f.owner, "reserve_attachment", Object.fromEntries(Object.entries(input).filter(([key]) => !["p_source_hash", "p_source_bytes", "p_source_mime", "p_hash", "p_transformation"].includes(key))));
  const legacy = await prepare(f, input); assert.equal(legacy.legacy, true);
  const [record] = await get(f, input.p_key); assert.equal(record.sourceSha256, null); assert.equal(record.tracked, false); assert.equal(record.canAbandon, false);
  assert.equal((await f.owner.rpc("abandon_attachment_attempt", { p_id: a.id, p_key: input.p_key })).error?.code, "PT409");
  assert.ifError((await upload(f, a)).error); await finalize(f, a); await rpc(f.owner, "bind_validated_attachment", { p_id: a.id }); assert.equal((await get(f))[0].state, "ready");
});

test("cross-context and revoked membership cannot consult, start, abandon, upload or finalize a pending attempt", async () => {
  const f = await fixture(), input = args(f), a = await prepare(f, input), token = randomUUID(); await begin(f, a, token);
  const otherPatient = await setup(); owned.add(otherPatient.patient);
  await rpc(f.owner, "select_active_context", { p_patient: otherPatient.patient });
  assert.equal((await f.owner.rpc("attachment_attempts", { p_patient: f.patient, p_document: f.doc.id, p_movement: null, p_key: input.p_key })).error?.code, "42501");
  await rpc(f.owner, "select_active_context", { p_patient: f.patient });
  sql(`update public.care_recipient_memberships set status='revoked' where care_recipient_id=${q(f.patient)} and user_id=${q(fixtures.family.id)}`);
  for (const [name, payload] of [["attachment_attempts", { p_patient: f.patient, p_document: f.doc.id, p_movement: null, p_key: input.p_key }], ["begin_attachment_upload", { p_id: a.id, p_source_hash: f.sourceHash, p_hash: f.hash, p_token: randomUUID() }], ["abandon_attachment_attempt", { p_id: a.id, p_key: input.p_key }]]) assert.equal((await f.owner.rpc(name, payload)).error?.code, "42501");
  assert.ok((await upload(f, a)).error);
  assert.equal((await worker.rpc("finalize_attachment", { p_id: a.id, p_actor: fixtures.family.id, p_hash: f.hash, p_mime: "image/jpeg", p_bytes: f.bytes.length, p_valid: true })).error?.code, "42501");
  assert.equal(sql(`select state from public.attachments where id=${q(a.id)}`), "quarantine");
});

test("manual family movement uses the same authorized attempt lifecycle and preserves its ledger fact", async () => {
  const f = await fixture();
  const packet = { p_patient: f.patient, p_product: f.products[0], p_quantity: "1", p_action: "inbound", p_reason: "Movimento fictício para conferir vínculo de anexo", p_key: randomUUID() };
  assert.equal((await f.owner.rpc("family_stock_movement", packet)).error?.code, "42501");
  f.owner = await actor("adminA", f.patient);
  const movement = await rpc(f.owner, "family_stock_movement", packet);
  const before = sql(`select to_jsonb(m) from public.stock_movements m where id=${q(movement)}`), input = { ...args(f), p_document: null, p_movement: movement }, a = await rpc(f.owner, "prepare_attachment_attempt", input);
  await rpc(worker, "attest_attachment_source", { p_id: a.id, p_actor: fixtures.adminA.id, p_source_hash: f.sourceHash, p_source_bytes: f.source.length, p_source_mime: "image/png", p_hash: f.hash, p_transformation: "image-normalized-v1" });
  const records = await rpc(f.owner, "attachment_attempts", { p_patient: f.patient, p_document: null, p_movement: movement, p_key: input.p_key });
  assert.equal(records[0].id, a.id); await abandon(f, a, input.p_key);
  assert.equal(sql(`select to_jsonb(m) from public.stock_movements m where id=${q(movement)}`), before);
});

test("a browser fingerprint is never represented as verified original provenance or admitted for upload without server attestation", async () => {
  const f = await fixture(), input = args(f), a = await rpc(f.owner, "prepare_attachment_attempt", input);
  const [unverified] = await get(f, input.p_key); assert.equal(unverified.sourceSha256, null); assert.equal(unverified.expectedSha256, null);
  assert.equal((await f.owner.rpc("begin_attachment_upload", { p_id: a.id, p_source_hash: f.sourceHash, p_hash: f.hash, p_token: randomUUID() })).error?.code, "42501");
  assert.ok((await upload(f, a)).error);
  const attestation = { p_id: a.id, p_actor: fixtures.family.id, p_source_hash: f.sourceHash, p_source_bytes: f.source.length, p_source_mime: "image/png", p_hash: f.hash, p_transformation: "image-normalized-v1" };
  assert.ok((await f.owner.rpc("attest_attachment_source", attestation)).error);
  assert.equal((await worker.rpc("attest_attachment_source", { ...attestation, p_source_hash: "f".repeat(64) })).error?.code, "23505");
  await rpc(worker, "attest_attachment_source", attestation); await rpc(worker, "attest_attachment_source", attestation);
  assert.equal((await get(f, input.p_key))[0].sourceSha256, f.sourceHash);
  assert.equal(sql(`select count(*) from public.audit_events where action='attachment.source_attested' and entity_id=${q(a.id)}`), "1");
});

test("two concurrent contenders never obtain the same last vacancy and formal abandonment preserves the existing ready object", async () => {
  const f = await fixture(), first = args(f), ready = await prepare(f, first), token = randomUUID();
  await begin(f, ready, token); assert.ifError((await upload(f, ready)).error); await settle(f, ready, token, "stored"); await finalize(f, ready); await rpc(f.owner, "bind_validated_attachment", { p_id: ready.id });
  const official = sql(`select to_jsonb(d) from public.operational_documents d where id=${q(f.doc.id)}`), reservations = [];
  for (let index = 0; index < 8; index++) { const input = args(f); reservations.push({ input, a: await prepare(f, input) }); }
  async function compete() {
    const results = await Promise.all([f.owner.rpc("prepare_attachment_attempt", args(f)), f.owner.rpc("prepare_attachment_attempt", args(f))]);
    assert.equal(results.filter(result => !result.error).length, 1); assert.ok(results.find(result => result.error).error.message.includes("attachment limit reached"));
    assert.equal(sql(`select count(*) from public.attachments where document_id=${q(f.doc.id)} and state not in ('rejected','abandoned')`), "10");
  }
  await compete(); await abandon(f, reservations[0].a, reservations[0].input.p_key); await compete();
  assert.equal(count(f), 11); assert.equal(sql(`select state from public.attachments where id=${q(ready.id)}`), "ready");
  const object = await f.owner.storage.from("patient-evidence").download(ready.object_path); assert.ifError(object.error); assert.equal(digest(Buffer.from(await object.data.arrayBuffer())), f.hash);
  assert.equal(sql(`select count(*) from storage.objects where bucket_id='patient-evidence' and name like ${q(f.patient + '/%')}`), "1");
  assert.equal(sql(`select to_jsonb(d) from public.operational_documents d where id=${q(f.doc.id)}`), official);
});
