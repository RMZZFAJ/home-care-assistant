import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { createClient } from "@supabase/supabase-js";
import { actor, env, fixtures, issue, rpc, setup } from "./v4-fixtures.mjs";
import { autonomousReturnFixture } from "./autonomous-return-fixtures.mjs";
import { entTerminalFixture } from "./ent-terminal-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";

const service = createClient(env.url, env.serviceKey, { auth: { persistSession: false } });
const status = (client, id) => rpc(client, "initial_document_pdf_status", { p_document: id });
const system = (request, action, args = {}) => service.rpc("initial_document_pdf", {
  p_request: request, p_action: action, p_args: args,
});

test("automatic REQ reserves one system issuance after prior tacit science and excludes later manual acts", async () => {
  const fixture = await setup();
  const { admin, patient } = fixture;
  const family = await actor("family", patient);
  const previous = await rpc(family, "my_requisition_science_preference");
  const setPreference = async (mode, consent) => rpc(family, "set_requisition_science_preference", {
    p_mode: mode, p_consent: consent, p_version: (await rpc(family, "my_requisition_science_preference")).version, p_key: randomUUID(),
  });
  await rpc(admin, "configure_patient_access", {
    p_patient: patient, p_kind: "settings", p_change: { scienceTacit: true }, p_key: randomUUID(),
    p_version: Number(sql(`select version from public.patient_settings where care_recipient_id=${q(patient)}`)),
  });
  await setPreference("tacit", true);
  try {
    const req = await issue(patient, [fixture.products[0]]);
    const queued = await status(admin, req.id);
    assert.equal(queued.state, "reserved");
    assert.equal(queued.issuanceId, null);
    const cutoff = JSON.parse(sql(`select jsonb_build_object('hash',content_hash,'action',action,'actor',actor_id)
      from public.document_events where document_id=${q(req.id)} and version=${queued.version}`));
    assert.equal(cutoff.action, "req.science_satisfied");
    assert.equal(cutoff.actor, null);
    const progress = await rpc(family, "requisition_progress", { p_id: req.id });
    await setPreference("manual", false);
    await rpc(family, "acknowledge_requisition", {
      p_id: req.id, p_mode: "express", p_version: progress.version, p_material_identity: progress.materialIdentity,
    });

    const [first, second] = await Promise.all([system(queued.id, "reserve"), system(queued.id, "reserve")]);
    assert.ifError(first.error);
    assert.ifError(second.error);
    assert.equal(first.data.id, second.data.id);
    assert.equal(first.data.requestedBy, null);
    assert.equal(first.data.requestedName, "Sistema · emissão inicial");
    assert.equal(first.data.version, queued.version);
    assert.equal(first.data.sourceHash, cutoff.hash);
    assert.ok(first.data.snapshot.sourceFacts.issuerId);
    assert.equal(first.data.snapshot.event.mode, "tacit");
    assert.equal((await status(admin, req.id)).issuanceId, first.data.id);
    assert.equal((await system(queued.id, "read", { p_id: randomUUID() })).error?.code, "42501");
    assert.equal((await admin.rpc("initial_document_pdf", { p_request: queued.id, p_action: "reserve" })).error?.code, "42501");
    const reader = await actor("reader", patient);
    await status(reader, req.id);
    sql(`update public.care_recipient_memberships set status='revoked' where care_recipient_id=${q(patient)} and user_id=${q(fixtures.reader.id)}`);
    assert.equal((await reader.rpc("initial_document_pdf_status", { p_document: req.id })).error?.code, "42501");
  } finally {
    await setPreference(previous.mode, previous.consent ?? previous.mode !== "manual");
  }
});

test("COM draft queues no initial exemplar until official issuance and retries claim the same intention", async () => {
  const { admin, patient, products } = await setup();
  const draft = await rpc(admin, "create_supply_document", {
    p_patient: patient, p_type: "COM", p_key: randomUUID(), p_draft: true,
    p_payload: { origin: "purchase", lines: [{ productId: products[0], quantity: "1" }] },
  });
  assert.equal(await status(admin, draft.id), null);
  const submit = { p_id: draft.id, p_action: "submit", p_body: {}, p_key: randomUUID(), p_version: draft.version };
  await rpc(admin, "supply_document_command", submit);
  await rpc(admin, "supply_document_command", submit);
  const queued = await status(admin, draft.id);
  const issued = await system(queued.id, "reserve");
  assert.ifError(issued.error);
  assert.equal(issued.data.version, queued.version);
  const lease = await rpc(service, "claim_pdf_issuance", { p_id: issued.data.id });
  const uncertain = await system(queued.id, "stage", { p_id: issued.data.id, p_token: lease.workerToken,
    p_step: "uncertain", p_error: "SIGNING_UNAVAILABLE" });
  assert.ifError(uncertain.error);
  assert.equal((await status(admin, draft.id)).state, "uncertain");
  const retry = await system(queued.id, "reserve");
  assert.ifError(retry.error);
  assert.equal(retry.data.id, issued.data.id);
  assert.equal(retry.data.sourceHash, issued.data.sourceHash);
  assert.equal(sql(`select count(*) from private.pdf_issuances where initial_request_id=${q(queued.id)}`), "1");
});

test("the initial notice cut uses only its own issuance jobs and preserves known outcomes on recovery", async () => {
  const { admin, patient, products } = await setup();
  const first = await issue(patient, [products[0]]);
  const unrelated = await issue(patient, [products[1]]);
  const request = await status(admin, first.id);
  const workerId = randomUUID();
  const claim = { p_request: request.id, p_limit: 10, p_worker_id: workerId, p_external_enabled: false };
  assert.equal((await admin.rpc("claim_initial_pdf_notices", claim)).error?.code, "42501");
  assert.equal((await admin.rpc("capture_initial_pdf_notices", { p_request: request.id, p_unconfirmed: false })).error?.code, "42501");
  assert.equal(request.noticesPrepared, false);
  const jobs = await rpc(service, "claim_initial_pdf_notices", claim);
  assert.ok(jobs.length >= 2);
  assert.ok(jobs.every(job => job.document_id === first.id && job.channel === "internal"));
  assert.equal(sql(`select count(*) from public.requisition_notifications
    where document_id=${q(unrelated.id)} and attempts>0`), "0");
  const complete = (job, state, error = null) => rpc(service, "complete_notification_job", {
    p_id: job.id, p_worker_id: workerId, p_state: state, p_error: error,
  });
  await complete(jobs[0], "failed", "synthetic controlled result");
  await complete(jobs[1], "delivered");
  await rpc(service, "capture_initial_pdf_notices", { p_request: request.id, p_unconfirmed: false });
  const prepared = await status(admin, first.id);
  assert.equal(prepared.noticesPrepared, true);
  assert.equal(prepared.noticesNeedAttention, true);
  assert.equal(prepared.issuanceId, null);
  const reserved = await system(request.id, "reserve");
  assert.ifError(reserved.error);
  assert.equal(sql(`select (select jsonb_object_agg(field.key,r.snapshot->field.key) from jsonb_each(e.body) field)=e.body
      and r.source_hash=e.content_hash and not(r.snapshot?'issuanceNoticeCut')
    from private.pdf_issuances r join public.document_events e on e.document_id=r.document_id and e.version=r.version
    where r.id=${q(reserved.data.id)}`), "t");
  const cut = reserved.data.snapshot.issuanceNoticeCut;
  assert.ok(cut.counts.some(row => row.channel === "internal" && row.state === "failed" && row.total === 1));
  assert.ok(cut.counts.some(row => row.channel === "internal" && row.state === "delivered" && row.total === 1));
  assert.doesNotMatch(JSON.stringify(cut), /synthetic controlled result|recipient|destination/);
  for (const job of jobs.slice(2)) await complete(job, "delivered");
  assert.deepEqual(await rpc(service, "claim_initial_pdf_notices", claim), []);
  await rpc(service, "capture_initial_pdf_notices", { p_request: request.id, p_unconfirmed: true });
  const repeated = await system(request.id, "reserve");
  assert.ifError(repeated.error);
  assert.equal(repeated.data.id, reserved.data.id);
  assert.deepEqual(repeated.data.snapshot.issuanceNoticeCut, cut);
});

test("ENT, autonomous DEV and BAL reserve system exemplars without changing physical facts", async () => {
  const ent = await entTerminalFixture({ kind: "cancelled" });
  const f = await autonomousReturnFixture();
  const preview = await rpc(f.initiator.client, "transfer_preparation", { p_patient: f.patient, p_source: "CARE_TEAM" });
  const dev = await rpc(f.initiator.client, "create_transfer_declaration", {
    p_patient: f.patient, p_key: randomUUID(), p_body: {
      mode: "direct", source: "CARE_TEAM", recipientId: f.recipient.id,
      referenceHash: preview.referenceHash, reason: "Devolução fictícia independente para o PDF inicial.",
      lines: [{ productId: f.products[0], quantity: "2" }],
    },
  });
  const bal = sql(`select id from public.operational_documents where care_recipient_id=${q(f.patient)} and kind='BAL'`);
  const facts = () => sql(`select coalesce(jsonb_agg(to_jsonb(m) order by m.id),'[]') from public.stock_movements m
    where care_recipient_id in (${q(ent.patient)},${q(f.patient)})`);
  const before = facts();
  for (const [patient, id, kind] of [[ent.patient, ent.doc.id, "ENT"], [f.patient, dev.id, "DEV"], [f.patient, bal, "BAL"]]) {
    const queued = await status(await actor("adminA", patient), id);
    const result = await system(queued.id, "reserve");
    assert.ifError(result.error);
    assert.equal(result.data.snapshot.kind, kind);
    assert.equal(result.data.requestedBy, null);
    assert.equal(result.data.version, queued.version);
    if (kind === "ENT") assert.equal(result.data.snapshot.status, "pending_receipt");
  }
  assert.equal(facts(), before);
});
