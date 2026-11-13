import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { legacyBalance, actor, rpc, balCommand, balApply, balState, receiveBalanceMaterials } from "./bal-review-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { fixtures } from "./v4-fixtures.mjs";
const reserve = (client, id, version = null, key = randomUUID(), name = "reserve_pdf_issuance") => client.rpc(name, { p_document: id, p_version: version, p_key: key });
async function appliedFixture() {
 const f = await legacyBalance({ quantity: "2" }), family = await actor("family", f.patient);
 const d = await rpc(family, "operational_document", { p_id: f.document.id });
 const review = await balCommand(family, d, { group: "family", comment: "Parecer sem efeito físico." });assert.ifError(review.error);
 const applied = await balApply(family, review.data);assert.ifError(applied.error);
 return { ...f, family, beforeApply: review.data, applied: applied.data };
}
function canonical(row) {
 const { sourceFacts, documentFacts, balanceApplication, ...body } = row.snapshot;
 assert.equal(sourceFacts.schemaVersion, 1);assert.equal(documentFacts.schemaVersion, 1);assert.ok(balanceApplication);
 const stored = JSON.parse(sql("select jsonb_build_object('body',body,'hash',content_hash) from public.document_events where document_id="+q(row.documentId)+" and version="+row.version));
 assert.deepEqual(body, stored.body);assert.equal(row.sourceHash, stored.hash);
}
test("BAL V11 freezes only the selected application's moment and historical stock, without changing canonical business facts or older intentions", async () => {
 const f = await appliedFixture(), before = balState(f.document.id), key = randomUUID();
 const older = await reserve(f.family, f.document.id, f.beforeApply.version);assert.ifError(older.error);
 assert.deepEqual(older.data.snapshot.balanceApplication, { state: "not_applied", lines: [] });
 const current = await reserve(f.family, f.document.id, null, key);assert.ifError(current.error);canonical(current.data);canonical(older.data);
 const effect = current.data.snapshot.balanceApplication;
 assert.equal(current.data.rendererRevision, 16);assert.equal(effect.state, "applied");assert.equal(effect.documentVersion, f.applied.version);
 assert.ok(effect.lines.every(l => l.state === "known" && Number(l.quantity) === 2));
 assert.equal(balState(f.document.id), before);
 await receiveBalanceMaterials(f);
 const refreshed = await reserve(f.family, f.document.id);assert.ifError(refreshed.error);
 assert.deepEqual(refreshed.data.snapshot.balanceApplication, effect);
 assert.deepEqual((await rpc(f.family, "pdf_issuance", { p_id: current.data.id })).snapshot, current.data.snapshot);
 const replay = await reserve(f.family, f.document.id, null, key, "reserve_pdf_issuance");assert.ifError(replay.error);
 assert.equal(replay.data.id, current.data.id);assert.deepEqual(replay.data.snapshot, current.data.snapshot);
 const legacy = await reserve(f.family, f.document.id, null, randomUUID(), "reserve_pdf_issuance");assert.ifError(legacy.error);
 const oldReplay = await reserve(f.family, f.document.id, null, sql("select idempotency_key from private.pdf_issuances where id="+q(legacy.data.id)));
 assert.ifError(oldReplay.error);assert.equal(oldReplay.data.rendererRevision, 16);assert.deepEqual(oldReplay.data.snapshot, legacy.data.snapshot);
});
test("masked BAL emissions contain no private balance; losing stock authority blocks all replay paths to an earlier unmasked source", async () => {
 const f = await appliedFixture(), key = randomUUID(), known = await reserve(f.family, f.document.id, null, key);assert.ifError(known.error);
 sql("insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values("+q(f.patient)+","+q(fixtures.family.id)+",'stock.team.read',false)");
 assert.equal((await f.family.rpc("pdf_issuance", { p_id: known.data.id })).error?.code, "42501");
 const entryPoints = JSON.parse(sql("select jsonb_agg(proname order by proname) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and proname ~ '^reserve_pdf_issuance(_v[0-9]+)?$'"));
 for (const name of entryPoints) assert.equal((await reserve(f.family, f.document.id, null, key, name)).error?.code, "42501", name);
 const masked = await reserve(f.family, f.document.id);assert.ifError(masked.error);
 assert.ok(masked.data.snapshot.balanceApplication.lines.every(l => l.state === "restricted" && l.quantity === null));
 assert.equal(JSON.stringify(masked.data.snapshot.balanceApplication).includes('"quantity":"'), false);
 sql("update public.capability_overrides set enabled=true where care_recipient_id="+q(f.patient)+" and subject_user="+q(fixtures.family.id)+" and capability='stock.team.read'");
 assert.deepEqual((await rpc(f.family, "pdf_issuance", { p_id: masked.data.id })).snapshot, masked.data.snapshot);
 assert.deepEqual((await rpc(f.family, "pdf_issuance", { p_id: known.data.id })).snapshot, known.data.snapshot);
 assert.equal(sql("select has_function_privilege('anon','public.reserve_pdf_issuance(uuid,uuid,integer)','EXECUTE') or has_function_privilege('service_role','public.reserve_pdf_issuance(uuid,uuid,integer)','EXECUTE') or has_function_privilege('authenticated','private.require_pdf_issuance_access(private.pdf_issuances)','EXECUTE')"), "f");
});
