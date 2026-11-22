import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { legacyBalance, balCommand, balState, rpc, actor, receiveBalanceMaterials } from "./bal-review-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { fixtures } from "./v4-fixtures.mjs";
import { whileAdvisoryWaits } from "./lock-barrier.mjs";
import { balDocumentFixture, saveBalDocument, balDocumentPacket, balDocumentFacts } from "./bal-document-draft-fixtures.mjs";

const applicationRows = id => JSON.parse(sql(`select coalesce(jsonb_agg(to_jsonb(a) order by document_version),'[]') from private.balance_applications a where document_id=${q(id)}`));
const get = (client, id) => rpc(client, "operational_document", { p_id: id });
const packet = d => ({ p_id: d.id, p_action: "apply_balance", p_body: { group: "family", reviewReference: d.balanceReview.referenceHash }, p_key: randomUUID(), p_version: d.version });
const lookup = (client, p) => client.rpc("balance_application_result", { p_id: p.p_id, p_key: p.p_key, p_body: p.p_body, p_version: p.p_version });
async function ready() {
  const f = await legacyBalance({ quantity: "1" }), family = await actor("family", f.patient);
  const before = JSON.parse(balState(f.document.id)), d = await get(family, f.document.id);
  const review = await balCommand(family, d, { group: "family", comment: "Parecer independente sem ajuste de estoque.", reviewReference: d.balanceReview.referenceHash });
  assert.ifError(review.error);
  assert.equal(review.data.status, "submitted");
  assert.deepEqual(JSON.parse(balState(d.id)).ledger, before.ledger);
  return { ...f, family, reviewed: review.data };
}

test("required BAL opinion never moves stock; a separate authorized application captures its exact historical effect", async () => {
  const f = await ready(), d = f.reviewed;
  assert.equal(d.balanceReview.reviewSatisfied, true);
  assert.deepEqual(d.balanceReview.applicationGroups, ["family"]);
  assert.equal(applicationRows(d.id).length, 0);
  const p = packet(d), result = await f.family.rpc("supply_document_command", p);
  assert.ifError(result.error);
  assert.equal(result.data.status, "approved");
  const [effect] = applicationRows(d.id);
  assert.equal(effect.actor_id, fixtures.family.id);
  assert.equal(effect.document_version, d.version + 1);
  assert.equal(effect.count_version, d.balanceReview.countVersion);
  assert.equal(effect.lines.length, d.lines.length);
  assert.ok(effect.lines.every(row => row.quantityAfter === "1.000" || Number(row.quantityAfter) === 1));
  assert.equal(result.data.payload.notes, f.payload.notes);
  assert.equal(result.data.events.at(-1).action, "bal.apply");
  assert.equal(JSON.stringify(result.data.canonical_snapshot).includes("quantityAfter"), false, "Private after-values cannot enter the generic public snapshot");
  await receiveBalanceMaterials(f);
  const current = await get(f.family, d.id);
  assert.equal(current.balanceReview.referenceState, "historical");
  assert.equal(current.balanceReview.application.id, effect.id);
  assert.ok(current.balanceReview.application.lines.every(row => row.state === "known" && Number(row.quantity) === 1));
  const beforeRead = balState(d.id), found = await lookup(f.family, p);
  assert.ifError(found.error);
  assert.equal(found.data.state, "found");
  assert.equal(found.data.application.id, effect.id);
  assert.ok(found.data.application.lines.every(row => Number(row.quantity) === 1));
  assert.equal(balState(d.id), beforeRead);
  assert.ifError((await f.family.rpc("supply_document_command", p)).error);
  assert.equal(balState(d.id), beforeRead);
  assert.equal(applicationRows(d.id).length, 1);
});

test("required review, count author separation and current version remain real application gates", async () => {
  const f = await legacyBalance({ quantity: "1" }), family = await actor("family", f.patient);
  const d = await get(family, f.document.id), before = balState(d.id);
  assert.equal((await family.rpc("supply_document_command", packet(d))).error?.code, "PT409");
  assert.equal(balState(d.id), before);
  const reviewed = await balCommand(family, d, { group: "family" });assert.ifError(reviewed.error);
  const p = packet(reviewed.data), beforeApply = balState(d.id);
  assert.equal((await f.admin.rpc("supply_document_command", p)).error?.code, "PT409", "The counter cannot borrow the independent reviewer's application authority");
  assert.equal((await family.rpc("supply_document_command", { ...p, p_version: p.p_version - 1 })).error?.code, "PT409");
  assert.equal(balState(d.id), beforeApply);
  assert.equal(applicationRows(d.id).length, 0);
});

test("item opinions are explicit, frozen and scoped; an indicated difference never silently applies a count", async () => {
  const f = await legacyBalance({ quantity: "1" }), family = await actor("family", f.patient), d = await get(family, f.document.id);
  const item = { lineId: d.lines[0].id, result: "difference", forwarding: "recount", comment: "Conferir novamente apenas este material." };
  const before = balState(d.id);
  for (const items of [[{ ...item, lineId: randomUUID() }], [item, item], [{ ...item, forwarding: "none" }], [{ ...item, quantity: "999" }]]) {
    assert.equal((await balCommand(family, d, { group: "family", items })).error?.code, "22023");
    assert.equal(balState(d.id), before);
  }
  const review = await balCommand(family, d, { group: "family", items: [item] });assert.ifError(review.error);
  const row = review.data.balanceReview.reviews[0];
  assert.deepEqual(row.item_results, [item]);
  assert.equal(row.reviewed_snapshot.lines.length, d.lines.length, "The underlying examined count remains frozen without claiming every item was reviewed");
  assert.equal(review.data.balanceReview.hasItemDifferences, true);
  assert.deepEqual(review.data.balanceReview.applicationGroups, []);
  assert.deepEqual(JSON.parse(balState(d.id)).ledger, JSON.parse(before).ledger);
  const afterOpinion = balState(d.id);
  assert.equal((await family.rpc("supply_document_command", packet(review.data))).error?.code, "PT409");
  assert.equal(balState(d.id), afterOpinion);
  assert.equal(applicationRows(d.id).length, 0);
});

test("a historical required opinion is permitted without validating later stock or allowing its application", async () => {
  const f = await legacyBalance({ quantity: "1" }), family = await actor("family", f.patient);
  await receiveBalanceMaterials(f);
  const d = await get(family, f.document.id), before = JSON.parse(balState(d.id));
  assert.equal(d.balanceReview.referenceState, "historical");
  const r = await balCommand(family, d, { group: "family", reviewReference: d.balanceReview.referenceHash });assert.ifError(r.error);
  assert.equal(r.data.status, "submitted");
  assert.equal(r.data.balanceReview.reviews[0].reference_state, "historical");
  assert.deepEqual(r.data.balanceReview.applicationGroups, []);
  assert.equal((await family.rpc("supply_document_command", packet(r.data))).error?.code, "PT409");
  assert.deepEqual(JSON.parse(balState(d.id)).ledger, before.ledger);
});

test("application receipt binds actor, document, body and version, and respects current read authority and stock masking", async () => {
  const f = await ready(), p = packet(f.reviewed), applied = await f.family.rpc("supply_document_command", p);assert.ifError(applied.error);
  const before = balState(f.document.id);
  assert.equal((await lookup(f.family, { ...p, p_version: p.p_version + 1 })).error?.code, "23505");
  assert.equal((await f.family.rpc("supply_document_command", { ...p, p_body: { ...p.p_body, reviewReference: "0".repeat(64) } })).error?.code, "23505");
  assert.equal((await lookup(f.admin, p)).data.state, "not_found");
  sql(`insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${q(f.patient)},${q(fixtures.family.id)},'stock.team.read',false),(${q(f.patient)},${q(fixtures.family.id)},'bal.approve.family',false)`);
  const receipt = await lookup(f.family, p);assert.ifError(receipt.error);
  assert.ok(receipt.data.application.lines.every(row => row.state === "restricted" && row.quantity === null));
  const view = await get(f.family, f.document.id);
  assert.ok(view.balanceReview.application.lines.every(row => row.state === "restricted" && row.quantity === null));
  assert.equal(sql("select has_table_privilege('authenticated','private.balance_applications','SELECT,INSERT,UPDATE,DELETE,TRUNCATE') or has_table_privilege('service_role','private.balance_applications','SELECT,INSERT,UPDATE,DELETE,TRUNCATE') or has_function_privilege('anon','public.balance_application_result(uuid,uuid,jsonb,integer)','EXECUTE')"), "f");
  sql(`insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${q(f.patient)},${q(fixtures.family.id)},'bal.read',false)`);
  assert.equal((await lookup(f.family, p)).error?.code, "42501");
  assert.equal(balState(f.document.id), before);
});

test("application rechecks authority after an observed stock-lock wait and leaves no partial effect", async () => {
  const f = await ready(), p = packet(f.reviewed), before = balState(f.document.id);
  const denied = await whileAdvisoryWaits("stock:" + f.patient, () => f.family.rpc("supply_document_command", p), () => {
    sql(`insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${q(f.patient)},${q(fixtures.family.id)},'bal.approve.family',false)`);
  });
  assert.equal(denied.error?.code, "42501");
  assert.equal(balState(f.document.id), before);
  assert.equal(applicationRows(f.document.id).length, 0);
});

test("optional count captures its own application; a later general opinion has no fabricated item results or repeated effect", async () => {
  const f = await legacyBalance({ policy: "optional", quantity: "1" }), family = await actor("family", f.patient);
  const [original] = applicationRows(f.document.id), before = JSON.parse(balState(f.document.id)), d = await get(family, f.document.id);
  assert.ok(original.id);assert.equal(d.status, "approved");
  const result = await balCommand(family, d, { group: "family", comment: "Parecer geral sem revisão individual declarada." });assert.ifError(result.error);
  assert.deepEqual(result.data.balanceReview.reviews[0].item_results, []);
  assert.deepEqual(applicationRows(d.id), [original]);
  assert.deepEqual(JSON.parse(balState(d.id)).ledger, before.ledger);
});

test("private per-item opinion binds the saved outcome and forwarding without a physical count or stock effect", async () => {
  const f = await balDocumentFixture("review_family"), lineId = f.document.lines[0].id;
  const opinion = { result: "difference", forwarding: "adjustment", comment: "Apuração deste material em ato próprio." };
  f.content.fields["item:" + lineId] = JSON.stringify({ ...opinion, materialName: f.document.lines[0].name_snapshot, unit: f.document.lines[0].unit_snapshot });
  f.body.items = [{ lineId, ...opinion }];
  const saved = await saveBalDocument(f), p = balDocumentPacket(f, saved), before = balDocumentFacts(f);
  const changed = await f.client.rpc("commit_supply_draft", { ...p, p_body: { ...p.p_body, body: { ...f.body, items: [{ lineId, ...opinion, forwarding: "recount" }] } } });
  assert.equal(changed.error?.code, "22023");
  assert.equal(balDocumentFacts(f), before);
  const result = await f.client.rpc("commit_supply_draft", p);assert.ifError(result.error);
  const row = result.data.result.balanceReview.reviews[0];
  assert.deepEqual(row.item_results, f.body.items);
  assert.equal(row.reviewed_snapshot.opinionOnly, true);
  assert.equal(result.data.result.status, "submitted");
  assert.deepEqual(JSON.parse(balDocumentFacts(f)).ledger, JSON.parse(before).ledger);
  assert.ifError((await f.client.rpc("commit_supply_draft", p)).error);
  assert.equal(applicationRows(f.document.id).length, 0);
});

test("a late injected authority loss rolls back the application, private receipt and document event together", async () => {
  const f = await ready(), p = packet(f.reviewed), before = balState(f.document.id);
  // Stock changes already hold workspace invalidation rows here. A second
  // connection's override would wait for those rows, creating a test-only cycle.
  // Inject at the exact late boundary in this transaction; the earlier stock
  // lock test independently proves an actually concurrent authority change.
  sql(`create function private.test_bal_application_event_barrier() returns trigger language plpgsql security definer set search_path='' as $$begin
    if new.document_id=${q(f.document.id)}::uuid and new.action='bal.apply' then
      insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${q(f.patient)},${q(fixtures.family.id)},'bal.approve.family',false);
    end if;return new;end;$$;
    create trigger test_bal_application_event_barrier before insert on public.document_events for each row execute function private.test_bal_application_event_barrier();`);
  try {
    const denied = await f.family.rpc("supply_document_command", p);
    assert.equal(denied.error?.code, "42501");
    assert.equal(balState(f.document.id), before);
    assert.equal(applicationRows(f.document.id).length, 0);
    assert.equal((await lookup(f.family, p)).data.state, "not_found");
  } finally {
    sql("drop trigger test_bal_application_event_barrier on public.document_events;drop function private.test_bal_application_event_barrier();");
  }
});

test("private item labels preserve readability but cannot replace the frozen material identity", async () => {
  const f = await balDocumentFixture("review_family"), line = f.document.lines[0];
  const opinion = { result: "confirmed", forwarding: "none", comment: "Identidade conferida." };
  f.body.items = [{ lineId: line.id, ...opinion }];
  const valid = { ...opinion, materialName: line.name_snapshot, unit: line.unit_snapshot }, before = balDocumentFacts(f);
  let saved = null;
  for (const altered of [{ ...valid, materialName: "Nome trocado" }, { ...valid, unit: "outra unidade" }, { ...valid, lineId: randomUUID() }]) {
    f.content.fields["item:" + line.id] = JSON.stringify(altered);
    saved = await saveBalDocument(f, f.content, saved);
    const result = await f.client.rpc("commit_supply_draft", balDocumentPacket(f, saved));
    assert.equal(result.error?.code, "22023");
    assert.equal(balDocumentFacts(f), before);
  }
  f.content.fields["item:" + line.id] = JSON.stringify(valid);
  saved = await saveBalDocument(f, f.content, saved);
  const result = await f.client.rpc("commit_supply_draft", balDocumentPacket(f, saved));
  assert.ifError(result.error);
  assert.deepEqual(result.data.result.balanceReview.reviews[0].item_results, f.body.items);
  assert.deepEqual(JSON.parse(balDocumentFacts(f)).ledger, JSON.parse(before).ledger);
});
