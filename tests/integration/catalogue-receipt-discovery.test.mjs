import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { actor, fixtures, rpc, setup } from "./v4-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";

const scope = (patient, mode = "patient") => ({ p_patient: patient, p_mode: mode });
const history = (client, area, before = null) => rpc(client, "catalogue_preparation_receipts", { ...area, p_before: before });
const read = (client, area, purpose = "create") => rpc(client, "catalogue_preparation_read", { ...area, p_purpose: purpose, p_target: null });
const write = (client, area, action, { purpose = "create", fields = null, hash = null, draft = null } = {}) =>
  rpc(client, "catalogue_preparation_command", {
    ...area, p_purpose: purpose, p_target: null, p_action: action, p_key: randomUUID(), p_fields: fields, p_reference_hash: hash,
    p_id: draft?.id ?? null, p_revision: draft?.revision ?? 0,
  });
const fields = name => ({ name, category: "higiene", unit: "unidade", aliases: "", description: "", sortOrder: "0", isActive: true });

test("catalogue receipts remain discoverable across sessions with ordered pages and no private draft or key disclosure", async () => {
  const f = await setup(), area = scope(f.patient);
  const { reference } = await read(f.admin, area);
  const receipts = [];
  async function createItem(name) {
    const confirmed = await write(f.admin, area, "commit", { fields: fields(name), hash: reference.hash });
    await write(f.admin, area, "acknowledge", { draft: confirmed });
    receipts.push(confirmed);
    return confirmed;
  }
  for (let i = 1; i <= 106; i++) await createItem("Material recibo fictício " + i);
  // Simulate a pre-migration acknowledged result, whose true timestamp was
  // already lost to acknowledgement. It stays readable with an unknown date.
  sql(`update private.catalogue_preparations set confirmed_at=null where id=${q(receipts[0].id)};`);
  const page = await history(f.admin, area);
  assert.equal(page.ownerId, fixtures.adminA.id);
  assert.equal(page.entries.length, 15);
  assert.deepEqual(page.entries.map(entry => entry.id), receipts.slice(-15).reverse().map(row => row.id));
  assert.equal(page.entries[0].currentName, "Material recibo fictício 106");
  assert.equal(page.next, page.entries.at(-1).id);
  assert.ok(page.entries.every(entry => entry.confirmedAt && Object.keys(entry).length === 5));
  const firstDate = page.entries[0].confirmedAt;

  await createItem("Material após a primeira página");
  await write(f.admin, area, "save", { fields: fields("Rascunho privado"), hash: reference.hash });
  sql(`insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${q(f.patient)},${q(fixtures.adminA.id)},'catalog.manage',false);`);
  assert.ifError((await f.admin.auth.signOut()).error);
  const reopened = await actor("adminA", f.patient);
  const older = [];
  let cursor = page.next;
  for (let i = 0; cursor && i < 8; i++) {
    const result = await history(reopened, area, cursor);
    older.push(...result.entries);
    cursor = result.next;
  }
  assert.equal(cursor, null);
  assert.deepEqual(older.map(entry => entry.id), receipts.slice(0, 91).reverse().map(row => row.id));
  assert.equal(older.at(-1).confirmedAt, null);
  const refreshed = await history(reopened, area);
  assert.equal(refreshed.entries.find(entry => entry.id === receipts[105].id).confirmedAt, firstDate);
  assert.equal(refreshed.entries.some(entry => entry.currentName === "Rascunho privado"), false);

  const other = await actor("global", f.patient);
  assert.deepEqual((await history(other, area)).entries, []);
  const foreignCursor = await other.rpc("catalogue_preparation_receipts", { ...area, p_before: page.next });
  assert.equal(foreignCursor.error?.code, "22023");
  sql(`update public.care_recipient_memberships set status='revoked' where care_recipient_id=${q(f.patient)} and user_id=${q(fixtures.adminA.id)};`);
  assert.equal((await reopened.rpc("catalogue_preparation_receipts", area)).error?.code, "42501");
});

test("global proposal and global unit histories use distinct scopes and remain separate from local catalogue access", async () => {
  const f = await setup(), global = await actor("global"), globalPatient = scope(f.patient, "global");
  const { reference } = await read(global, globalPatient);
  const proposal = await write(global, globalPatient, "commit", { fields: fields("Proposta de recibo fictícia"), hash: reference.hash });
  const page = await history(global, globalPatient);
  assert.deepEqual(page.entries[0].outcome, { proposalId: proposal.outcome.proposalId });
  assert.equal(page.entries[0].currentName, null);
  assert.ok(page.entries[0].confirmedAt);
  assert.equal((await history(global, scope(null,"global"))).entries.some(entry => entry.id === proposal.id), false);
  assert.equal((await global.rpc("catalogue_preparation_receipts", scope(null))).error?.code, "22023");
  assert.equal((await f.admin.rpc("catalogue_preparation_receipts", globalPatient)).error?.code, "42501");
  assert.deepEqual((await history(f.admin, scope(f.patient))).entries, []);
  assert.equal(sql(`select count(*) from (values
    (has_function_privilege('anon','public.catalogue_preparation_receipts(uuid,text,uuid)','execute')),
    (has_function_privilege('service_role','public.catalogue_preparation_receipts(uuid,text,uuid)','execute')),
    (has_function_privilege('authenticated','private.require_catalogue_receipt_scope(uuid,text)','execute')),
    (has_table_privilege('authenticated','private.catalogue_preparations','select'))
  ) x(allowed) where allowed;`), "0");
});
