import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
import {
  balContent, confirmPacket, draftContext, fixtures, officialState, reqContent, rpc, savePacket,
} from "./private-draft-fixtures.mjs";
import { setup } from "./v4-fixtures.mjs";

const options = (f, target, product, filter = "") => ({
  p_patient: f.patient, p_target: target, p_product: product,
  p_filter: filter, p_search: "", p_page: 1,
});
const issuePurchase = (f, product) => rpc(f.admin, "create_supply_document", {
  p_patient: f.patient, p_type: "COM", p_draft: false, p_key: randomUUID(),
  p_payload: { lines: [{ productId: product, quantity: "1" }], acquisitionMode: "planned" },
});
const references = async (client, documentId) => (await rpc(client, "document_material_context", {
  p_document: documentId,
})).references;

test("material references follow draft revision, authorization and material identity through REQ and BAL issuance", async () => {
  const f = await setup();
  const product = f.products[0];
  const relatedPurchase = await issuePurchase(f, product);
  const otherMaterialPurchase = await issuePurchase(f, f.products[1]);
  const candidates = await rpc(f.admin, "material_reference_options", options(f, "REQ", product, "COM"));
  assert.deepEqual(candidates.data.map(row => row.id), [relatedPurchase.id]);

  const req = reqContent(f);
  const wrongLink = { productId: product, documentId: otherMaterialPurchase.id };
  const invalid = await rpc(f.admin, "creation_draft_command",
    savePacket(f, "REQ", { ...req, materialReferences: [wrongLink] }));
  const before = officialState(f);
  const rejected = await f.admin.rpc("commit_creation_draft", confirmPacket(f, invalid));
  assert.equal(rejected.error?.code, "PT409");
  assert.equal(officialState(f), before);

  const link = { productId: product, documentId: relatedPurchase.id };
  const saved = await rpc(f.admin, "creation_draft_command",
    savePacket(f, "REQ", { ...req, materialReferences: [link] }, invalid.id, invalid.revision));
  assert.deepEqual((await draftContext(f, "REQ", f.admin)).content.materialReferences, [link]);
  const packet = confirmPacket(f, saved);
  const result = await rpc(f.admin, "commit_creation_draft", packet);
  const requisitionId = result.result.requisition_id;
  const replay = await rpc(f.admin, "commit_creation_draft", packet);
  assert.equal(replay.result.requisition_id, requisitionId);
  assert.equal(replay.replayed, true);
  const projected = await references(f.admin, requisitionId);
  assert.equal(projected.length, 1);
  assert.equal(projected[0].document.id, relatedPurchase.id);
  assert.equal(projected[0].document.kind, "COM");

  const balanceLines = f.products.map(productId => ({ productId, quantity: "0" }));
  const balanceDraft = await rpc(f.admin, "creation_draft_command", savePacket(f, "BAL", {
    ...balContent(f), counts: Object.fromEntries(balanceLines.map(line => [line.productId, line.quantity])), notes: "",
    materialReferences: [{ productId: product, documentId: requisitionId }],
  }));
  const balance = await rpc(f.admin, "commit_creation_draft", {
    p_id: balanceDraft.id, p_expected: balanceDraft.revision, p_target: null, p_key: randomUUID(),
    p_body: { action: "create_bal", payload: { lines: balanceLines, notes: "" } },
  });
  assert.equal((await references(f.admin, balance.result.id))[0].document.id, requisitionId);

  sql(`insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled)
    values(${sqlLiteral(f.patient)},${sqlLiteral(fixtures.adminA.id)},'com.read',false)`);
  assert.deepEqual(await references(f.admin, requisitionId), []);
  const denied = await rpc(f.admin, "material_reference_options", options(f, "REQ", product, "COM"));
  assert.equal(denied.total, 0);
});
