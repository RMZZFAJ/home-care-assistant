import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { actor, rpc, setup, issue, request, fixtures, env } from "./v4-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { whileAdvisoryWaits } from "./lock-barrier.mjs";

const current = client => rpc(client, "my_requisition_science_preference");
async function prefer(client, mode) { return rpc(client, "set_requisition_science_preference", { p_mode: mode, p_consent: mode !== "manual", p_version: (await current(client)).version, p_key: randomUUID() }); }
async function policy(f, change) { return rpc(f.admin, "configure_patient_access", { p_patient: f.patient, p_kind: "settings", p_change: change, p_version: Number(sql(`select version from public.patient_settings where care_recipient_id=${sqlLiteral(f.patient)};`)), p_key: randomUUID() }); }
const progress = (client, id) => rpc(client, "requisition_progress", { p_id: id });

test("P02 administrative modality policy rechecks its real session after waiting for the patient lock", async () => {
  const f = await setup(), token = (await f.admin.auth.getSession()).data.session.access_token;
  const stale = createClient(env.url, env.anonKey, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: "Bearer " + token } } });
  const before = sql(`select to_jsonb(s) from public.patient_settings s where care_recipient_id=${sqlLiteral(f.patient)};`), key = randomUUID();
  const response = await whileAdvisoryWaits("stock:" + f.patient,
    () => stale.rpc("configure_patient_access", { p_patient: f.patient, p_kind: "settings", p_change: { scienceDialog: true }, p_version: 1, p_key: key }),
    async () => { assert.ifError((await f.admin.auth.signOut({ scope: "local" })).error); });
  const after = sql(`select to_jsonb(s) from public.patient_settings s where care_recipient_id=${sqlLiteral(f.patient)};`);
  const changes = Number(sql(`select count(*) from public.access_change_requests where care_recipient_id=${sqlLiteral(f.patient)} and idempotency_key=${sqlLiteral(key)};`));
  assert.deepEqual({ code: response.error?.code ?? null, settingsUnchanged: after === before, changes }, { code: "42501", settingsUnchanged: true, changes: 0 });
});

test("P02 a creator revoked while the tacit trigger waits cannot commit either the REQ or a SCI", async () => {
  const f = await setup(), family = await actor("family", f.patient), pro = await actor("professional", f.patient);
  await policy(f, { scienceTacit: true }); await prefer(family, "tacit");
  try {
    const token = (await pro.auth.getSession()).data.session.access_token;
    const stale = createClient(env.url, env.anonKey, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: "Bearer " + token } } });
    const args = request(f.patient, [f.products[0]]);
    const response = await whileAdvisoryWaits("stock:" + f.patient, () => stale.rpc("submit_requisition", args), async () => { assert.ifError((await pro.auth.signOut({ scope: "local" })).error); });
    const documents = Number(sql(`select count(*) from public.operational_documents where care_recipient_id=${sqlLiteral(f.patient)} and idempotency_key=${sqlLiteral(args.p_idempotency_key)};`));
    const science = Number(sql(`select count(*) from public.requisition_science_events where care_recipient_id=${sqlLiteral(f.patient)};`));
    assert.deepEqual({ code: response.error?.code ?? null, documents, science }, { code: "42501", documents: 0, science: 0 });
  } finally { await prefer(family, "manual"); }
});

test("P02 personal preferences require explicit consent, preserve versions under retry/conflict, and expose only their owner", async () => {
  const identityOnly = async role => { const client = createClient(env.url, env.anonKey, { auth: { persistSession: false, autoRefreshToken: false } }); assert.ifError((await client.auth.signInWithPassword({ email: fixtures[role].email, password: fixturePassword })).error); return client; };
  const family = await identityOnly("family"), other = await identityOnly("reader");
  await prefer(family, "manual");
  try {
    const before = await current(family);
    for (const p_mode of ["dialog", "tacit", null]) assert.equal((await family.rpc("set_requisition_science_preference", { p_mode, p_consent: false, p_version: before.version, p_key: randomUUID() })).error?.code, "22023");
    assert.deepEqual(await current(family), before);
    const args = { p_mode: "tacit", p_consent: true, p_version: before.version, p_key: randomUUID() };
    const saved = await rpc(family, "set_requisition_science_preference", args);
    assert.equal(saved.version, before.version + 1); assert.equal(saved.mode, "tacit");
    assert.equal((await rpc(family, "set_requisition_science_preference", args)).recovered, true);
    assert.equal((await family.rpc("set_requisition_science_preference", { ...args, p_mode: "manual" })).error?.code, "23505");
    assert.equal((await family.rpc("set_requisition_science_preference", { ...args, p_key: randomUUID() })).error?.code, "PT409");
    const manual = await prefer(family, "manual");
    const recovered = await rpc(family, "set_requisition_science_preference", args);
    assert.equal(recovered.mode, "manual"); assert.equal(recovered.version, manual.version); assert.equal(recovered.savedVersion, saved.version);
    const visible = await other.from("requisition_science_preferences").select("user_id");
    assert.ifError(visible.error); assert.ok(visible.data.every(row => row.user_id === fixtures.reader.id));
    assert.ok((await family.from("requisition_science_preferences").update({ mode: "manual" }).eq("user_id", fixtures.family.id)).error);
  } finally { await prefer(family, "manual"); }
});

test("P02 tacit SCI uses the prior opt-in at official emission, system authorship and policy/preference versions without retroactivity", async () => {
  const f = await setup(), family = await actor("family", f.patient);
  await policy(f, { scienceTacit: true }); await prefer(family, "manual");
  try {
    // The old automatic bit is not a new opt-in.
    const first = await issue(f.patient, [f.products[0]]);
    assert.equal((await progress(family, first.id)).science.length, 0);
    const elected = await prefer(family, "tacit");
    assert.equal((await progress(family, first.id)).science.length, 0, "Later opt-in does not act on an earlier emission");
    const second = await issue(f.patient, [f.products[1]]), view = await progress(family, second.id);
    assert.equal(view.science.length, 1); assert.equal(view.science[0].mode, "tacit");
    assert.equal(view.familyAware, true); assert.equal(view.personalScience, true);
    const event = view.science[0];
    assert.equal(event.evidence.preferenceId, elected.id); assert.equal(event.evidence.preferenceVersion, elected.version);
    assert.equal(event.evidence.policyVersion, 2); assert.equal(event.material_identity, view.materialIdentity);
    assert.equal(event.authority_context.context, null); assert.equal(event.authority_context.origin, "prior_personal_preference");
    assert.equal(sql(`select actor_id is null from public.document_events where document_id=${sqlLiteral(second.id)} and action='req.science_satisfied';`), "t");
    const versions = JSON.parse(sql(`select jsonb_agg(action order by version) from public.document_events where document_id=${sqlLiteral(second.id)};`));
    assert.deepEqual(versions, ["req.issued", "req.science_satisfied"]);
    assert.equal(sql(`select count(*) from public.requisition_openings where requisition_id=${sqlLiteral(second.id)};`), "0", "Tacit SCI is not an observable opening");
    assert.equal(sql(`select canonical_snapshot->>'action' from public.operational_documents where id=${sqlLiteral(second.id)};`), "req.science_satisfied", "The outer issuance must not overwrite the newer technical snapshot");
    const before = JSON.stringify(view.science);
    await prefer(family, "manual");
    assert.equal(JSON.stringify((await progress(family, second.id)).science), before);
    assert.equal((await progress(family, first.id)).science.length, 0);
  } finally { await prefer(family, "manual"); }
});

test("P02 newly granted authority does not tacitly acknowledge an older REQ; explicit manual confirmation remains possible", async () => {
  const f = await setup(), family = await actor("family", f.patient);
  await policy(f, { scienceTacit: true }); await prefer(family, "tacit");
  try {
    sql(`insert into public.capability_overrides(care_recipient_id,capability,subject_user,enabled) values(${sqlLiteral(f.patient)},'req.science',${sqlLiteral(fixtures.family.id)},false);`);
    const req = await issue(f.patient, [f.products[0]]);
    assert.equal((await progress(family, req.id)).science.length, 0);
    sql(`delete from public.capability_overrides where care_recipient_id=${sqlLiteral(f.patient)} and capability='req.science' and subject_user=${sqlLiteral(fixtures.family.id)};`);
    const opening = await rpc(family, "requisition_opening_context", { p_id: req.id });
    assert.equal(opening.requiresDialog, false); assert.equal((await progress(family, req.id)).science.length, 0);
    const confirmed = await rpc(family, "acknowledge_requisition", { p_id: req.id, p_mode: "express", p_version: opening.version, p_material_identity: opening.materialIdentity });
    assert.equal(confirmed.science[0].mode, "express"); assert.equal(confirmed.familyAware, true);
  } finally { await prefer(family, "manual"); }
});

test("P02 dialogue preflight is minimal and inert; confirmation is material-bound, deduplicated and independent of technical versions", async () => {
  const f = await setup(), family = await actor("family", f.patient);
  await policy(f, { scienceDialog: true }); await prefer(family, "dialog");
  try {
    const req = await issue(f.patient, [f.products[0]]), opening = await rpc(family, "requisition_opening_context", { p_id: req.id });
    assert.equal(opening.requiresDialog, true); assert.equal(opening.type, "REQ");
    assert.equal(Object.hasOwn(opening, "lines"), false); assert.equal(Object.hasOwn(opening, "requesterName"), false);
    assert.equal((await progress(family, req.id)).science.length, 0);
    const args = { p_id: req.id, p_mode: "dialog", p_version: opening.version, p_material_identity: opening.materialIdentity };
    const confirmed = await rpc(family, "acknowledge_requisition", args);
    assert.equal(confirmed.science[0].mode, "dialog"); assert.equal(confirmed.science[0].evidence.source, "dialog_confirmation_before_open");
    assert.equal((await rpc(family, "acknowledge_requisition", args)).science.length, 1);
    assert.equal((await rpc(family, "requisition_opening_context", { p_id: req.id })).requiresDialog, false);
    assert.ok((await family.rpc("acknowledge_requisition", { ...args, p_material_identity: "0".repeat(64) })).error);
  } finally { await prefer(family, "manual"); }
});

test("P02 no administrative permission or a changed personal mode refuses dialogue without inventing a SCI", async () => {
  const f = await setup(), family = await actor("family", f.patient);
  await prefer(family, "dialog");
  try {
    const old = await issue(f.patient, [f.products[0]]), opening = await rpc(family, "requisition_opening_context", { p_id: old.id });
    assert.equal(opening.requiresDialog, false);
    assert.equal((await family.rpc("acknowledge_requisition", { p_id: old.id, p_mode: "dialog", p_version: opening.version, p_material_identity: opening.materialIdentity })).error?.code, "PT409");
    await policy(f, { scienceDialog: true });
    const req = await issue(f.patient, [f.products[1]]), ready = await rpc(family, "requisition_opening_context", { p_id: req.id });
    assert.equal(ready.requiresDialog, true);
    await prefer(family, "manual");
    assert.equal((await family.rpc("acknowledge_requisition", { p_id: req.id, p_mode: "dialog", p_version: ready.version, p_material_identity: ready.materialIdentity })).error?.code, "PT409");
    assert.equal((await progress(family, req.id)).science.length, 0);
  } finally { await prefer(family, "manual"); }
});
