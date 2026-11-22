import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { setup, actor, rpc, fixtures, env } from "./v4-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
import { whileAdvisoryWaits } from "./lock-barrier.mjs";
const service = createClient(env.url, env.serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
async function fixture() {
  const f = await setup(),
    owner = await actor("family", f.patient),
    doc = await rpc(owner, "create_supply_document", {
      p_patient: f.patient,
      p_type: "COM",
      p_payload: {
        origin: "purchase",
        lines: [{ productId: f.products[0], quantity: "1" }],
      },
      p_key: randomUUID(),
      p_draft: false,
    });
  return { ...f, owner, doc };
}
const reserve = (f, key = randomUUID(), version = null) =>
  rpc(f.owner, "reserve_pdf_issuance", {
    p_document: f.doc.id,
    p_key: key,
    p_version: version,
  });
const business = (f) =>
  sql(
    `select jsonb_build_object('doc',(select to_jsonb(d) from public.operational_documents d where id=${sqlLiteral(f.doc.id)}),'events',(select jsonb_agg(to_jsonb(e) order by version) from public.document_events e where document_id=${sqlLiteral(f.doc.id)}),'stock',(select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${sqlLiteral(f.patient)}));`,
  );
// Deliberately a controlled metadata receipt for negative DB tests. No fake
// signed artifact is uploaded or accepted as product/crypto evidence here.
const metadata = () => ({
  profile: "PAdES-B-T",
  accepted: true,
  cryptographicIntegrity: true,
  wholeFile: true,
  signerTrust: "internal",
  timestampTrust: "internal",
  certificateFingerprint: "a".repeat(64),
  timestampCertificateFingerprint: "b".repeat(64),
  timestampAt: new Date().toISOString(),
  timestampPolicy: "2.25.1",
  externalTimeIndependence: false,
  revocationEvidence: "configured_internal_denylist_only",
});
const completion = (id, token) => ({
  p_id: id,
  p_token: token,
  p_hash: "c".repeat(64),
  p_size: 100,
  p_validation: metadata(),
  p_key_version: "test-v1",
  p_trust_revision: "test-v1",
});

test("PDF reservation freezes a personal intention and canonical snapshot without business or stock effects", async () => {
  const f = await fixture(),
    before = business(f),
    key = randomUUID(),
    a = await reserve(f, key),
    replay = await reserve(f, key),
    b = await reserve(f);
  assert.equal(a.id, replay.id);
  assert.equal(replay.replayed, true);
  assert.notEqual(a.id, b.id);
  assert.notEqual(a.verificationCode, b.verificationCode);
  assert.equal(a.version, f.doc.version);
  assert.equal(a.requestedBy, fixtures.family.id);
  assert.equal(a.state, "reserved");
  assert.equal(a.snapshot.id, f.doc.id);
  assert.equal(a.snapshot.protocol, f.doc.protocol);
  assert.match(a.sourceHash, /^[a-f0-9]{64}$/);
  assert.equal(business(f), before);
  const conflict = await f.owner.rpc("reserve_pdf_issuance", {
    p_document: f.doc.id,
    p_key: key,
    p_version: a.version,
  });
  assert.equal(conflict.error?.code, "23505");
  const bad = await f.owner.rpc("reserve_pdf_issuance", {
    p_document: f.doc.id,
    p_key: null,
    p_version: null,
  });
  assert.equal(bad.error?.code, "22023");
});
test("PDF worker claim is service-only and its expiring proof is never returned by the Auth read model", async () => {
  const f = await fixture(),
    r = await reserve(f);
  assert.equal(
    (await f.owner.rpc("claim_pdf_issuance", { p_id: r.id })).error?.code,
    "42501",
  );
  const claimed = await rpc(service, "claim_pdf_issuance", { p_id: r.id });
  assert.equal(claimed.ready, false);
  assert.match(claimed.workerToken, /^[a-f0-9]{64}$/);
  const read = await rpc(f.owner, "pdf_issuance", { p_id: r.id });
  assert.equal(read.state, "processing");
  assert.equal(JSON.stringify(read).includes(claimed.workerToken), false);
  assert.equal(Object.hasOwn(read, "lease_hash"), false);
  assert.equal(
    (await service.rpc("claim_pdf_issuance", { p_id: r.id })).error?.code,
    "55P03",
  );
  assert.equal(
    (
      await f.owner.rpc("pdf_issuance_stage", {
        p_id: r.id,
        p_token: "wrong",
        p_step: "signing",
        p_error: null,
      })
    ).error?.code,
    "42501",
  );
  assert.equal(
    (
      await f.admin.rpc("pdf_issuance_stage", {
        p_id: r.id,
        p_token: claimed.workerToken,
        p_step: "signing",
        p_error: null,
      })
    ).error?.code,
    "42501",
  );
  await rpc(f.owner, "pdf_issuance_stage", {
    p_id: r.id,
    p_token: claimed.workerToken,
    p_step: "uncertain",
    p_error: "SIGNING_UNAVAILABLE",
  });
  const reclaimed = await rpc(service, "claim_pdf_issuance", { p_id: r.id });
  assert.equal(reclaimed.workerToken === claimed.workerToken, false);
  assert.equal(
    (
      await f.owner.rpc("pdf_issuance_stage", {
        p_id: r.id,
        p_token: claimed.workerToken,
        p_step: "signing",
        p_error: null,
      })
    ).error?.code,
    "42501",
  );
});
test("an observed reservation wait rechecks selected patient and rolls back the entire intention", async () => {
  const f = await fixture(),
    other = await setup(),
    key = randomUUID();
  await rpc(f.owner, "select_active_context", { p_patient: f.patient });
  const result = await whileAdvisoryWaits(
    `pdf-issuance:${fixtures.family.id}:${key}`,
    () =>
      f.owner.rpc("reserve_pdf_issuance", {
        p_document: f.doc.id,
        p_key: key,
        p_version: null,
      }),
    async () => {
      await rpc(f.owner, "select_active_context", { p_patient: other.patient });
    },
  );
  assert.equal(result.error?.code, "42501");
  assert.equal(
    sql(
      `select count(*) from private.pdf_issuances where requested_by=${sqlLiteral(fixtures.family.id)} and idempotency_key=${sqlLiteral(key)};`,
    ),
    "0",
  );
  await rpc(f.owner, "select_active_context", { p_patient: f.patient });
  const saved = await reserve(f, key);
  assert.equal(saved.state, "reserved");
});
test("current document authority is rechecked for worker stages and finalization after a real read revocation", async () => {
  const f = await fixture(),
    r = await reserve(f),
    c = await rpc(service, "claim_pdf_issuance", { p_id: r.id }),
    before = business(f);
  sql(
    `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${sqlLiteral(f.patient)},${sqlLiteral(fixtures.family.id)},'com.read',false);`,
  );
  try {
    assert.equal(
      (await f.owner.rpc("pdf_issuance", { p_id: r.id })).error?.code,
      "42501",
    );
    assert.equal(
      (
        await f.owner.rpc("pdf_issuance_stage", {
          p_id: r.id,
          p_token: c.workerToken,
          p_step: "signing",
          p_error: null,
        })
      ).error?.code,
      "42501",
    );
    assert.equal(
      (
        await f.owner.rpc(
          "complete_pdf_issuance",
          completion(r.id, c.workerToken),
        )
      ).error?.code,
      "42501",
    );
  } finally {
    sql(
      `delete from public.capability_overrides where care_recipient_id=${sqlLiteral(f.patient)} and subject_user=${sqlLiteral(fixtures.family.id)} and capability='com.read';`,
    );
  }
  assert.equal(
    (await rpc(f.owner, "pdf_issuance", { p_id: r.id })).state,
    "processing",
  );
  assert.equal(business(f), before);
});
test("NULL or incomplete verification and missing Storage evidence cannot produce ready", async () => {
  const f = await fixture(),
    r = await reserve(f),
    c = await rpc(service, "claim_pdf_issuance", { p_id: r.id }),
    valid = completion(r.id, c.workerToken);
  for (const patch of [
    { p_size: null },
    { p_hash: null },
    { p_validation: null },
    { p_validation: {} },
    { p_validation: { ...metadata(), accepted: null } },
    { p_validation: { ...metadata(), wholeFile: false } },
    { p_validation: { ...metadata(), requestedName: "forged" } },
  ])
    assert.equal(
      (await f.owner.rpc("complete_pdf_issuance", { ...valid, ...patch })).error
        ?.code,
      "22023",
    );
  assert.equal(
    (await f.owner.rpc("complete_pdf_issuance", valid)).error?.code,
    "P0001",
  );
  assert.equal(
    (await rpc(f.owner, "pdf_issuance", { p_id: r.id })).state,
    "processing",
  );
  const anonymous = createClient(env.url, env.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  assert.equal(
    (
      await anonymous.rpc("pdf_issuance_public", {
        p_code: r.verificationCode,
        p_hash: null,
      })
    ).error?.code,
    "42501",
  );
  assert.deepEqual(
    await rpc(service, "pdf_issuance_public", {
      p_code: r.verificationCode,
      p_hash: null,
    }),
    { found: false },
  );
});
test("101 issuance intentions paginate stably across a new request and keep helpers and direct writes closed", async () => {
  const f = await fixture(),
    ids = [];
  for (let i = 0; i < 101; i++) ids.push((await reserve(f)).id);
  let page = await rpc(f.owner, "pdf_issuances", {
      p_document: f.doc.id,
      p_before: null,
      p_before_id: null,
      p_limit: 20,
    }),
    seen = page.data.map((r) => r.id);
  assert.equal(page.data.length, 20);
  const newer = await reserve(f);
  for (let round = 0; page.next && round < 6; round++) {
    page = await rpc(f.owner, "pdf_issuances", {
      p_document: f.doc.id,
      p_before: page.next.at,
      p_before_id: page.next.id,
      p_limit: 20,
    });
    seen.push(...page.data.map((r) => r.id));
  }
  assert.equal(page.next, null);
  assert.equal(seen.length, 101);
  assert.equal(new Set(seen).size, 101);
  assert.equal(seen.includes(newer.id), false);
  assert.equal(
    ids.every((id) => seen.includes(id)),
    true,
  );
  assert.equal(
    (
      await f.owner.rpc("pdf_issuances", {
        p_document: f.doc.id,
        p_before: null,
        p_before_id: randomUUID(),
        p_limit: 20,
      })
    ).error?.code,
    "22023",
  );
  assert.equal(
    sql(
      "select not has_table_privilege('authenticated','private.pdf_issuances','SELECT,INSERT,UPDATE,DELETE') and not has_table_privilege('service_role','private.pdf_issuances','SELECT,INSERT,UPDATE,DELETE') and not has_function_privilege('authenticated','private.require_pdf_lease(uuid,text)','EXECUTE') and not has_function_privilege('service_role','public.complete_pdf_issuance(uuid,text,text,integer,jsonb,text,text)','EXECUTE');",
    ),
    "t",
  );
});


test("an abandoned expired worker lease is reclaimed once and refuses the old proof without a second intention", async () => {
  const f = await fixture(), key = randomUUID(), before = business(f), reserved = await reserve(f, key);
  const first = await rpc(service, "claim_pdf_issuance", { p_id: reserved.id });
  // Controlled deadline on this synthetic issuance; no five-minute wall-clock sleep.
  sql("update private.pdf_issuances set lease_until=clock_timestamp()-interval '1 second' where id=" + sqlLiteral(reserved.id) + ";");
  const outcomes = await Promise.all([1, 2].map(() => service.rpc("claim_pdf_issuance", { p_id: reserved.id })));
  const successful = outcomes.filter(result => !result.error), refused = outcomes.filter(result => result.error);
  assert.equal(successful.length, 1); assert.equal(refused.length, 1); assert.equal(refused[0].error.code, "55P03");
  const recovered = successful[0].data;
  assert.notEqual(recovered.workerToken, first.workerToken);
  assert.equal((await f.owner.rpc("pdf_issuance_stage", { p_id: reserved.id, p_token: first.workerToken, p_step: "signing", p_error: null })).error?.code, "42501");
  await rpc(f.owner, "pdf_issuance_stage", { p_id: reserved.id, p_token: recovered.workerToken, p_step: "composing", p_error: null });
  const repeated = await reserve(f, key);
  assert.equal(repeated.id, reserved.id); assert.deepEqual(repeated.snapshot, reserved.snapshot);
  assert.equal(sql("select attempts from private.pdf_issuances where id=" + sqlLiteral(reserved.id) + ";"), "2");
  assert.equal(sql("select count(*) from private.pdf_issuances where document_id=" + sqlLiteral(f.doc.id) + ";"), "1");
  assert.equal(business(f), before);
});
