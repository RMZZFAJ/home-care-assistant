import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  sourceFactsFixture,
  historicalSourceFixture,
} from "./pdf-source-facts-fixtures.mjs";
import { rpc, fixtures } from "./v4-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
const reserve = (f) =>
  rpc(f.owner, "reserve_pdf_issuance", {
    p_document: f.doc.id,
    p_key: randomUUID(),
    p_version: 1,
  });
const state = (f) =>
  sql(
    `select jsonb_build_object('doc',(select to_jsonb(d) from public.operational_documents d where id=${sqlLiteral(f.doc.id)}),'events',(select jsonb_agg(to_jsonb(e) order by version) from public.document_events e where document_id=${sqlLiteral(f.doc.id)}),'ledger',(select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${sqlLiteral(f.patient)}));`,
  );
test("V6 freezes private draft creation and actual emission without rewriting the canonical event or effects", async () => {
  const f = await sourceFactsFixture(),
    before = state(f),
    row = await reserve(f),
    source = row.snapshot.sourceFacts;
  assert.equal(row.rendererRevision, 16);
  assert.equal(source.draftCreatedAt, "2026-11-01T12:00:00+00:00");
  assert.ok(
    Date.parse(source.documentCreatedAt) > Date.parse(source.draftCreatedAt),
  );
  assert.ok(
    Date.parse(source.issuedAt) >= Date.parse(source.documentCreatedAt),
  );
  assert.equal(source.issuerId, fixtures.family.id);
  assert.equal(source.issuerSource, "event_snapshot");
  const canonical = JSON.parse(
    sql(
      `select jsonb_build_object('body',body,'hash',content_hash) from public.document_events where document_id=${sqlLiteral(f.doc.id)} and version=1;`,
    ),
  );
  const { sourceFacts, ...body } = row.snapshot;
  assert.equal(sourceFacts.schemaVersion, 1);
  for (const key of ["documentFacts", "balanceApplication", "balanceReviewCorrections", "purchaseEntryBalances", "lifecycleFacts", "presentationFacts"])
    if (!Object.hasOwn(canonical.body, key)) delete body[key];
  assert.deepEqual(body, canonical.body);
  assert.equal(row.sourceHash, canonical.hash);
  assert.equal(state(f), before);
  assert.throws(
    () =>
      sql(
        `update private.pdf_issuances set snapshot=jsonb_set(snapshot,'{sourceFacts,issuedAt}','null'::jsonb) where id=${sqlLiteral(row.id)};`,
      ),
    /immutable issuance intention/,
  );
  assert.equal(
    sql(
      "select not has_function_privilege('authenticated','private.freeze_pdf_source_facts()','EXECUTE') and not has_function_privilege('service_role','private.freeze_pdf_source_facts()','EXECUTE');",
    ),
    "t",
  );
});
test("known and NULL historical origins use source names and independent import instants", async () => {
  for (const knownDate of [false, true]) {
    const f = await historicalSourceFixture({ knownDate }),
      before = state(f),
      row = await reserve(f),
      facts = row.snapshot.sourceFacts;
    assert.equal(facts.historical, true);
    assert.equal(
      facts.sourceCreatedAt,
      knownDate ? "2020-03-01T12:00:00+00:00" : null,
    );
    assert.equal(facts.issuedAt, null);
    assert.equal(facts.issuerName, "Autora literal da ficha física");
    assert.equal(facts.issuerSource, "origin_record");
    assert.equal(facts.issuerId, null);
    assert.ok(Date.parse(facts.importedAt) > Date.parse("2026-11-01"));
    assert.equal(facts.documentCreatedAt, null);
    assert.equal(row.representation, "derived");
    assert.equal(state(f), before);
  }
  const unknown = await historicalSourceFixture({ knownName: false }),
    facts = (await reserve(unknown)).snapshot.sourceFacts;
  assert.equal(facts.issuerName, null);
  assert.equal(facts.issuerSource, "unknown");
});
test("renaming or revoking an actor does not replace frozen names or IDs in a new representation", async () => {
  const f = await sourceFactsFixture(),
    a = await reserve(f),
    name = sql(
      `select full_name from public.profiles where id=${sqlLiteral(fixtures.family.id)};`,
    );
  try {
    sql(
      `update public.profiles set full_name='Nome atual fictício após o ato' where id=${sqlLiteral(fixtures.family.id)};`,
    );
    const b = await reserve(f);
    assert.equal(b.requestedName, "Nome atual fictício após o ato");
    assert.deepEqual(b.snapshot.sourceFacts, a.snapshot.sourceFacts);
    assert.equal(
      b.snapshot.sourceFacts.historyActors[0].id,
      fixtures.family.id,
    );
    assert.equal(b.snapshot.sourceFacts.historyActors[0].name, name);
    sql(
      `update public.care_recipient_memberships set status='revoked' where care_recipient_id=${sqlLiteral(f.patient)} and user_id=${sqlLiteral(fixtures.family.id)};`,
    );
    await assert.rejects(() => reserve(f), /42501|CONTEXT_REQUIRED|forbidden|permission/i);
    const afterRevocation = await rpc(f.admin, "reserve_pdf_issuance", {
      p_document: f.doc.id,
      p_key: randomUUID(),
      p_version: 1,
    });
    assert.deepEqual(afterRevocation.snapshot.sourceFacts, a.snapshot.sourceFacts);
  } finally {
    sql(
      `update public.profiles set full_name=${sqlLiteral(name)} where id=${sqlLiteral(fixtures.family.id)};`,
    );
    sql(
      `update public.care_recipient_memberships set status='active' where care_recipient_id=${sqlLiteral(f.patient)} and user_id=${sqlLiteral(fixtures.family.id)};`,
    );
  }
});
