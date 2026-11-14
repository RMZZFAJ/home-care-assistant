import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { setup, issue, actor, rpc, fixtures } from "./v4-fixtures.mjs";
import { getTestEnvironment, sql, sqlLiteral } from "../../scripts/test-environment.mjs";

const content = (text = "Providência fictícia registrada") => ({ category: "action", stage: "issuance", text, references: [] });
const state = id => sql(`select to_jsonb(d)::text from public.operational_documents d where id=${sqlLiteral(id)};`);
const packet = (id, body = content(), key = randomUUID()) => ({ p_document: id, p_key: key, p_body: body });
async function fixture() {
  const f = await setup();
  const req = await issue(f.patient, f.products);
  return { ...f, id: req.id, professional: await actor("professional", f.patient) };
}

test("Andamentos append-only preserve documentary bytes, Auth authorship, concurrent intent and historical names", async () => {
  const f = await fixture(), before = state(f.id), p = packet(f.id);
  const [a, b] = await Promise.all([rpc(f.professional, "document_progress_publish", p), rpc(f.professional, "document_progress_publish", p)]);
  assert.equal(a.note.id, b.note.id);
  assert.equal(a.note.authorId, fixtures.professional.id);
  assert.equal(a.note.text, p.p_body.text);
  assert.equal([a.recovered, b.recovered].filter(Boolean).length, 1);
  assert.equal(state(f.id), before);
  assert.equal(sql(`select count(*) from private.document_progress_notes where document_id=${sqlLiteral(f.id)};`), "1");
  assert.equal(sql(`select count(*) from public.audit_events where action='document.progress.created' and entity_id=${sqlLiteral(a.note.id)};`), "1");
  assert.equal((await f.professional.rpc("document_progress_publish", { ...p, p_body: content("Outro conteúdo") })).error?.code, "22023");
  const originalName = sql(`select full_name from public.profiles where id=${sqlLiteral(fixtures.professional.id)};`);
  try {
    sql(`update public.profiles set full_name='Nome atual fictício distinto' where id=${sqlLiteral(fixtures.professional.id)};`);
    const read = await rpc(f.professional, "document_progress", { p_document: f.id, p_filter: "manual" });
    assert.equal(read.data[0].authorName, a.note.authorName);
    assert.notEqual(read.data[0].authorName, "Nome atual fictício distinto");
  } finally { sql(`update public.profiles set full_name=${sqlLiteral(originalName)} where id=${sqlLiteral(fixtures.professional.id)};`); }
  assert.throws(() => sql(`update private.document_progress_notes set body='Reescrita proibida' where id=${sqlLiteral(a.note.id)};`), /append only/);
  assert.throws(() => sql(`delete from private.document_progress_notes where id=${sqlLiteral(a.note.id)};`), /append only/);
});

test("Andamentos reject forged payload and other-patient references; current permissions gate creation, recovery and links", async () => {
  const f = await fixture(), other = await fixture();
  await actor("adminA", f.patient);
  const com = await rpc(f.admin, "create_supply_document", { p_patient: f.patient, p_type: "COM", p_key: randomUUID(), p_draft: false,
    p_payload: { origin: "purchase", lines: [{ productId: f.products[0], quantity: "1" }] } });
  const p = packet(f.id, { ...content(), references: [com.id] });
  const family = await actor("family", f.patient);
  const saved = await rpc(family, "document_progress_publish", p);
  assert.equal(saved.note.references[0].id, com.id);
  for (const body of [
    { ...content(), authorId: fixtures.adminA.id }, { ...content(), stage: "acquisition" },
    { ...content(), text: " " }, { ...content(), text: "💚".repeat(1001) }, { ...content(), references: [com.id, com.id] },
  ]) assert.equal((await family.rpc("document_progress_publish", packet(f.id, body))).error?.code, "22023");
  assert.equal((await family.rpc("document_progress_publish", packet(f.id, { ...content(), references: [other.id] }))).error?.code, "42501");
  const reader = await actor("reader", f.patient);
  assert.equal((await reader.rpc("document_progress_publish", packet(f.id))).error?.code, "42501");
  assert.equal((await reader.rpc("document_progress", { p_document: f.id, p_filter: "manual" })).data.data[0].references.length, 0);
  sql(`insert into public.capability_overrides(care_recipient_id,capability,subject_user,enabled)
   values(${sqlLiteral(f.patient)},'document.progress.create',${sqlLiteral(fixtures.family.id)},false);`);
  assert.equal((await family.rpc("document_progress_publish", packet(f.id))).error?.code, "42501");
  assert.equal((await rpc(family, "document_progress_publish", p)).note.id, saved.note.id);
  sql(`insert into public.capability_overrides(care_recipient_id,capability,subject_user,enabled)
   values(${sqlLiteral(f.patient)},'req.read',${sqlLiteral(fixtures.family.id)},false);`);
  assert.equal((await family.rpc("document_progress_publish", p)).error?.code, "42501");
  assert.equal((await family.rpc("document_progress", { p_document: f.id })).error?.code, "42501");
  // setup deliberately seeds global local memberships; remove that fixture
  // grant before asserting the identity has only global administration.
  sql(`delete from public.care_recipient_memberships where user_id=${sqlLiteral(fixtures.global.id)} and care_recipient_id=${sqlLiteral(f.patient)};`);
  const global = await actor("global");
  assert.equal((await global.rpc("document_progress", { p_document: f.id })).error?.code, "42501");
  const env = getTestEnvironment(), anon = createClient(env.url, env.anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  assert.equal((await anon.rpc("document_progress", { p_document: f.id })).error?.code, "42501");
  assert.equal((await family.from("document_progress_notes").insert({ body: "Acesso direto proibido" })).error !== null, true);
});

test("Andamentos paginate all manual and factual automatic records chronologically without reminder or audit replay", async () => {
  const f = await fixture(), before = state(f.id), ids = [];
  for (let index = 0; index < 43; index++) ids.push((await rpc(f.professional, "document_progress_publish", packet(f.id, content("Sequência fictícia " + index)))).note.id);
  const seen = [];
  for (let page = 1; page <= 3; page++) {
    const result = await rpc(f.professional, "document_progress", { p_document: f.id, p_filter: "manual", p_page: page });
    assert.equal(result.total, 43);
    seen.push(...result.data.map(row => row.id));
  }
  assert.deepEqual(seen, ids);
  const auto = await rpc(f.professional, "document_progress", { p_document: f.id, p_filter: "automatic" });
  assert.ok(auto.data.some(row => row.action === "req.issued"));
  assert.ok(auto.data.every(row => row.source === "automatic" && !row.action.includes("reminder") && row.action !== "document.progress.created"));
  const all = await rpc(f.professional, "document_progress", { p_document: f.id });
  assert.equal(all.total, 43 + auto.total);
  assert.equal(state(f.id), before);
  for (const args of [{ p_page: 0 }, { p_size: 51 }, { p_filter: "audit" }])
    assert.equal((await f.professional.rpc("document_progress", { p_document: f.id, ...args })).error?.code, "22023");
});

test("Andamentos retain inactive-patient write barriers and explicit RPC/private-table privileges", async () => {
  const f = await fixture(), p = packet(f.id);
  await rpc(f.professional, "document_progress_publish", p);
  sql(`update public.care_recipients set is_active=false where id=${sqlLiteral(f.patient)};`);
  assert.equal((await f.professional.rpc("document_progress_publish", packet(f.id))).error?.code, "42501");
  const existingRead = await f.professional.rpc("operational_document", { p_id: f.id });
  const notesRead = await f.professional.rpc("document_progress", { p_document: f.id });
  if (existingRead.error) assert.equal(notesRead.error?.code, existingRead.error.code);
  else { assert.ifError(notesRead.error); assert.equal(notesRead.data.canPublish, false); }
  const privileges = JSON.parse(sql(`select jsonb_build_object(
    'readAnon',has_function_privilege('anon','public.document_progress(uuid,text,integer,integer)','execute'),
    'publishAnon',has_function_privilege('anon','public.document_progress_publish(uuid,uuid,jsonb)','execute'),
    'publishService',has_function_privilege('service_role','public.document_progress_publish(uuid,uuid,jsonb)','execute'),
    'directAuthenticated',has_table_privilege('authenticated','private.document_progress_notes','select,insert,update,delete'),
    'rls',(select relrowsecurity from pg_class where oid='private.document_progress_notes'::regclass));`));
  assert.deepEqual(privileges, { readAnon: false, publishAnon: false, publishService: false, directAuthenticated: false, rls: true });
});
