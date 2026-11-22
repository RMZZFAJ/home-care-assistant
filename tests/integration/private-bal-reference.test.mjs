import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import Decimal from "decimal.js";
import {
  privateDraftFixture,
  officialState,
  rpc,
  fixtures,
} from "./private-draft-fixtures.mjs";
import { whileAdvisoryWaits } from "./lock-barrier.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";

const reference = (f) =>
  rpc(f.pro, "balance_count_reference", { p_patient: f.patient });
async function deliver(f, amount) {
  const d = await rpc(f.admin, "create_supply_document", {
    p_patient: f.patient,
    p_type: "ENT",
    p_payload: {
      source: "FAMILY",
      destination: "CARE_TEAM",
      recipientId: fixtures.professional.id,
      recipientReason:
        "Entrega física fictícia para testar a referência privada",
      lines: [{ productId: f.products[0], quantity: amount }],
    },
    p_key: randomUUID(),
    p_draft: false,
  });
  await rpc(f.pro, "supply_document_command", {
    p_id: d.id,
    p_action: "receive",
    p_body: { divergences: [] },
    p_key: randomUUID(),
    p_version: d.version,
  });
}
const packet = (f, revision, count = "0") => ({
  p_patient: f.patient,
  p_type: "BAL",
  p_payload: {
    lines: f.products.map((productId, i) => ({
      productId,
      quantity: i ? "0" : count,
    })),
    notes: "Contagem física confirmada com referência privada",
    balanceReferenceRevision: revision,
  },
  p_key: randomUUID(),
  p_draft: false,
});

test("private BAL reference reads one ledger snapshot without creating any official object and requires live BAL read", async () => {
  const f = await privateDraftFixture();
  await deliver(f, "3");
  const before = officialState(f),
    r = await reference(f);
  assert.equal(new Decimal(r.quantities[f.products[0]]).toFixed(), "3");
  assert.equal(new Decimal(r.quantities[f.products[1]]).toFixed(), "0");
  assert.match(r.revision, /^\d+$/);
  assert.equal(officialState(f), before);
  sql(
    `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${sqlLiteral(f.patient)},${sqlLiteral(fixtures.professional.id)},'bal.read',false);`,
  );
  assert.equal(
    (await f.pro.rpc("balance_count_reference", { p_patient: f.patient })).error
      ?.code,
    "42501",
  );
  assert.equal(officialState(f), before);
  assert.equal(
    sql(
      "select has_function_privilege('anon','public.balance_count_reference(uuid)','execute')::text;",
    ),
    "false",
  );
});

test("private BAL legacy confirmation checks stale stock only after the observed lock and recovers the same issued key later", async () => {
  const f = await privateDraftFixture(),
    old = await reference(f);
  await deliver(f, "3");
  const before = officialState(f),
    stale = packet(f, old.revision, "3");
  const rejected = await whileAdvisoryWaits(
    "stock:" + f.patient,
    () => f.pro.rpc("create_supply_document", stale),
    async () => {},
  );
  assert.equal(rejected.error?.code, "PT409", rejected.error?.message);
  assert.equal(officialState(f), before);
  const current = await reference(f),
    intent = packet(f, current.revision, "3"),
    issued = await rpc(f.pro, "create_supply_document", intent);
  assert.equal(issued.type, "BAL");
  assert.notEqual(issued.status, "draft");
  await deliver(f, "1");
  const later = officialState(f);
  assert.equal(
    (await rpc(f.pro, "create_supply_document", intent)).id,
    issued.id,
  );
  assert.equal(officialState(f), later);
});

test("private BAL legacy reference rejects a real session loss after its stock wait without partial effects", async () => {
  const f = await privateDraftFixture(),
    r = await reference(f),
    before = officialState(f);
  const result = await whileAdvisoryWaits(
    "stock:" + f.patient,
    () => f.pro.rpc("create_supply_document", packet(f, r.revision)),
    async () => {
      assert.ifError((await f.pro.auth.signOut({ scope: "local" })).error);
    },
  );
  assert.equal(result.error?.code, "42501", result.error?.message);
  assert.equal(officialState(f), before);
});
