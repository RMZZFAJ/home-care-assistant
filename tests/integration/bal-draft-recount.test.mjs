import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { setup, fixtures, rpc } from "./v4-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";

test("refreshing a stale optional BAL draft keeps it unsubmitted until explicit confirmation", async () => {
  const f = await setup();
  const payload = {
    lines: f.products.map((productId) => ({ productId, quantity: "1" })),
  };
  let draft = await rpc(f.admin, "create_supply_document", {
    p_patient: f.patient,
    p_type: "BAL",
    p_payload: payload,
    p_key: randomUUID(),
    p_draft: true,
  });
  await rpc(f.admin, "create_supply_document", {
    p_patient: f.patient,
    p_type: "ENT",
    p_key: randomUUID(),
    p_draft: false,
    p_payload: {
      source: "FAMILY",
      destination: "CARE_TEAM",
      recipientId: fixtures.professional.id,
      recipientReason: "Expedição fictícia posterior à referência do rascunho",
      lines: [{ productId: f.products[0], quantity: "2" }],
    },
  });
  const obsolete = await f.admin.rpc("supply_document_command", {
    p_id: draft.id,
    p_action: "submit",
    p_body: {},
    p_key: randomUUID(),
    p_version: draft.version,
  });
  assert.equal(obsolete.error?.code, "P0001");
  assert.match(obsolete.error.message, /recount|reference/i);
  draft = await rpc(f.admin, "revise_supply_document", {
    p_id: draft.id,
    p_payload: payload,
    p_key: randomUUID(),
    p_version: draft.version,
    p_recount: true,
  });
  assert.equal(
    draft.status,
    "draft",
    "Refreshing a draft must not submit or apply its count",
  );
  assert.equal(
    sql(
      `select count(*) from public.stock_movements where reference_type='bal' and reference_id=${sqlLiteral(draft.id)};`,
    ),
    "0",
  );
  const key = randomUUID(),
    args = {
      p_id: draft.id,
      p_action: "submit",
      p_body: {},
      p_key: key,
      p_version: draft.version,
    };
  const submitted = await rpc(f.admin, "supply_document_command", args);
  assert.equal(submitted.status, "approved");
  assert.deepEqual(
    await rpc(f.admin, "supply_document_command", args),
    submitted,
  );
  assert.equal(
    sql(
      `select count(*) from public.stock_movements where reference_type='bal' and reference_id=${sqlLiteral(draft.id)};`,
    ),
    "2",
  );
});
