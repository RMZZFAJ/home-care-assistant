import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { cancellationFixture, awarenessFacts, rpc, fixtures } from "./cancellation-awareness-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { actor, setup } from "./v4-fixtures.mjs";
import { fidelityRequisitionFixture } from "./pdf-fidelity-fixtures.mjs";
import { createComplementCandidate } from "./document-complements-fixtures.mjs";

test("V16 preserves old intentions and one immutable frozen source under concurrent reservation and cross-version recovery", async () => {
  const f = await cancellationFixture(), id = f.document.id, before = awarenessFacts(id), oldKey = randomUUID();
  const old = await rpc(f.admin, "reserve_pdf_issuance_v15", { p_document: id, p_key: oldKey });
  const recovered = await rpc(f.admin, "reserve_pdf_issuance_v16", { p_document: id, p_key: oldKey });
  assert.equal(recovered.id, old.id); assert.equal(recovered.rendererRevision, 15); assert.deepEqual(recovered.snapshot, old.snapshot);
  const key = randomUUID(), pair = await Promise.all([1, 2].map(() => rpc(f.admin, "reserve_pdf_issuance_v16", { p_document: id, p_key: key })));
  assert.equal(pair[0].id, pair[1].id); assert.equal(pair[0].rendererRevision, 16);
  assert.deepEqual(pair[0].snapshot.lifecycleFacts, old.snapshot.lifecycleFacts);
  const throughOld = await rpc(f.admin, "reserve_pdf_issuance_v15", { p_document: id, p_key: key });
  assert.equal(throughOld.id, pair[0].id); assert.equal(throughOld.rendererRevision, 16);
  assert.equal(awarenessFacts(id), before);
});

test("V16 rechecks real Auth access on new reservation, old-key recovery and source reading without widening grants", async () => {
  const f = await cancellationFixture(), id = f.document.id, key = randomUUID();
  const row = await rpc(f.admin, "reserve_pdf_issuance_v16", { p_document: id, p_key: key });
  sql(`insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${q(f.patient)},${q(fixtures.adminA.id)},'req.read',false)`);
  for (const name of ["reserve_pdf_issuance_v15", "reserve_pdf_issuance_v16"]) assert.equal((await f.admin.rpc(name, { p_document: id, p_key: key })).error?.code, "42501");
  assert.equal((await f.admin.rpc("reserve_pdf_issuance_v16", { p_document: id, p_key: randomUUID() })).error?.code, "42501");
  assert.equal((await f.admin.rpc("pdf_issuance", { p_id: row.id })).error?.code, "42501");
  assert.equal(sql("select has_function_privilege('anon','public.reserve_pdf_issuance_v16(uuid,uuid,integer)','EXECUTE') or has_function_privilege('service_role','public.reserve_pdf_issuance_v16(uuid,uuid,integer)','EXECUTE') or has_function_privilege('authenticated','private.freeze_pdf_lifecycle_facts()','EXECUTE')"), "f");
});

test("V16 freezes the first issued patient role and exact cut without rewriting it after a profile rename", async () => {
  const f = await setup(), family = await actor("family", f.patient);
  let document = await rpc(family, "create_supply_document", { p_patient: f.patient, p_type: "COM", p_key: randomUUID(), p_draft: false, p_payload: { origin: "purchase", lines: f.products.map(productId => ({ productId, quantity: "2" })) } });
  const oldName = sql(`select full_name from public.profiles where id=${q(fixtures.family.id)}`);
  const first = await rpc(family, "reserve_pdf_issuance_v16", { p_document: document.id, p_key: randomUUID() });
  assert.equal(first.snapshot.presentationFacts.author.state, "known"); assert.equal(first.snapshot.presentationFacts.author.careRole, "family");
  assert.equal(first.snapshot.presentationFacts.author.name, oldName);
  assert.equal(new Date(first.snapshot.presentationFacts.asOf).getTime(), new Date(sql(`select created_at from public.document_events where document_id=${q(document.id)} and version=${document.version}`)).getTime());
  const original = sql(`select body from public.document_events where document_id=${q(document.id)} and version=${document.version}`);
  try {
    sql(`update public.profiles set full_name='Nome posterior sem substituir a autoria emitida' where id=${q(fixtures.family.id)}`);
    document = await rpc(f.admin, "supply_document_command", { p_id: document.id, p_action: "cancel", p_version: document.version, p_key: randomUUID(), p_body: { reason: "Cancelamento próprio preservando o papel e a autoria originais." } });
    const later = await rpc(family, "reserve_pdf_issuance_v16", { p_document: document.id, p_key: randomUUID() });
    assert.deepEqual(later.snapshot.presentationFacts.author, first.snapshot.presentationFacts.author);
    assert.equal(sql(`select body from public.document_events where document_id=${q(document.id)} and version=${first.version}`), original);
  } finally { sql(`update public.profiles set full_name=${q(oldName)} where id=${q(fixtures.family.id)}`); }
});

test("V16 resolves only explicit authorized requisition links and revocation blocks an earlier known reference while a fresh copy redacts it", async () => {
  const f = await cancellationFixture(), reqId = await createComplementCandidate(f, "REQ");
  const req = await rpc(f.admin, "operational_document", { p_id: reqId });
  const item = JSON.parse(sql(`select to_jsonb(i) from public.requisition_items i where i.requisition_id=${q(reqId)} order by i.id limit 1`));
  const document = await rpc(f.admin, "create_supply_document", { p_patient: f.patient, p_type: "COM", p_key: randomUUID(), p_draft: false,
    p_payload: { origin: "purchase", lines: [{ productId: item.product_id, quantity: "2", requisitionItemIds: [item.id] }] } });
  const key = randomUUID(), known = await rpc(f.admin, "reserve_pdf_issuance_v16", { p_document: document.id, p_key: key });
  assert.deepEqual(known.snapshot.presentationFacts.references, [{ kind: "requisition", accessible: true, id: req.id, type: "REQ", code: req.code }]);
  sql(`insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${q(f.patient)},${q(fixtures.adminA.id)},'req.read',false)`);
  assert.equal((await f.admin.rpc("pdf_issuance", { p_id: known.id })).error?.code, "42501");
  assert.equal((await f.admin.rpc("reserve_pdf_issuance_v16", { p_document: document.id, p_key: key })).error?.code, "42501");
  const redacted = await rpc(f.admin, "reserve_pdf_issuance_v16", { p_document: document.id, p_key: randomUUID() });
  assert.deepEqual(redacted.snapshot.presentationFacts.references, [{ kind: "requisition", accessible: false }]);
  assert.equal(sql("select has_function_privilege('authenticated','private.document_pdf_presentation(uuid,integer,jsonb)','EXECUTE') or has_function_privilege('anon','private.freeze_pdf_presentation_facts()','EXECUTE') or has_function_privilege('service_role','private.document_pdf_presentation(uuid,integer,jsonb)','EXECUTE')"), "f");
});


test("V16 resolves explicitly linked ENT from REQ canonical history within its cut and preserves access on replay", async () => {
  const f = await fidelityRequisitionFixture();
  const before = await rpc(f.admin, "reserve_pdf_issuance_v16", { p_document: f.doc.id, p_key: randomUUID(), p_version: f.initial.version });
  assert.deepEqual(before.snapshot.presentationFacts.references, []);
  const key = randomUUID();
  const current = await rpc(f.admin, "reserve_pdf_issuance_v16", { p_document: f.doc.id, p_key: key });
  const linked = current.snapshot.presentationFacts.references.filter(ref => ref.kind === "related_document");
  assert.deepEqual(linked, [{ kind: "related_document", accessible: true, id: f.delivery.id, type: "ENT", code: f.delivery.code }]);
  sql(`insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${q(f.patient)},${q(fixtures.adminA.id)},'ent.read',false)`);
  assert.equal((await f.admin.rpc("pdf_issuance", { p_id: current.id })).error?.code, "42501");
  assert.equal((await f.admin.rpc("reserve_pdf_issuance_v16", { p_document: f.doc.id, p_key: key })).error?.code, "42501");
  const redacted = await rpc(f.admin, "reserve_pdf_issuance_v16", { p_document: f.doc.id, p_key: randomUUID() });
  assert.deepEqual(redacted.snapshot.presentationFacts.references, [{ kind: "related_document", accessible: false }]);
  assert.equal(JSON.stringify(redacted.snapshot.presentationFacts.references).includes(f.delivery.code), false);
  assert.deepEqual((await rpc(f.admin, "pdf_issuance", { p_id: before.id })).snapshot.presentationFacts.references, []);
});
