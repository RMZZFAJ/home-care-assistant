import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  catalogueIdentityFixture,
  identityPacket,
  identityContext,
  identityPhysicalState,
  rpc,
} from "./catalogue-identity-fixtures.mjs";
import { declareTransfer, transferCommand } from "./transfer-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
import { fixtures } from "./v4-fixtures.mjs";
import { whileRowWaits } from "./lock-barrier.mjs";

test("inactive material refuses new ordinary family movements but retains referenced historical compensation", async () => {
  const f = await catalogueIdentityFixture();
  await rpc(f.admin, "catalogue_identity_command", await identityPacket(f));
  const before = identityPhysicalState(f);
  for (const action of ["inbound", "outbound"]) {
    const denied = await f.admin.rpc("family_stock_movement", {
      p_patient: f.patient,
      p_product: f.products[0],
      p_quantity: "1",
      p_action: action,
      p_reason:
        "Nova operação comum não pode contornar a inativação do material",
      p_key: randomUUID(),
    });
    assert.equal(denied.error?.code, "22023");
    assert.equal(identityPhysicalState(f), before);
  }
  const original = JSON.parse(
    sql(
      `select to_jsonb(m) from public.stock_movements m where care_recipient_id=${sqlLiteral(f.patient)} and product_id=${sqlLiteral(f.products[0])} and reference_type='family_manual' and destination_location='FAMILY';`,
    ),
  );
  assert.equal(
    await rpc(f.admin, "family_stock_movement", {
      p_patient: f.patient,
      p_product: f.products[0],
      p_quantity: "30",
      p_action: "inbound",
      p_reason: original.justification,
      p_key: original.idempotency_key,
    }),
    original.id,
  );
  assert.equal(identityPhysicalState(f), before);
  const packet = {
    p_patient: f.patient,
    p_product: f.products[0],
    p_quantity: "1",
    p_action: "correction_out",
    p_reason:
      "Correção explícita de um fato histórico, sem transferência nem consumo inferido",
    p_key: randomUUID(),
    p_reference: original.id,
  };
  const id = await rpc(f.admin, "family_stock_movement", packet);
  assert.equal(await rpc(f.admin, "family_stock_movement", packet), id);
  const state = await identityContext(f);
  assert.equal(state.source.is_active, false);
  assert.equal(state.source.stock.FAMILY, "3.000000");
  assert.equal(state.source.stock.CARE_TEAM, "4.000000");
  const movement = JSON.parse(
    sql(
      `select to_jsonb(m) from public.stock_movements m where id=${sqlLiteral(id)};`,
    ),
  );
  assert.equal(movement.reference_id, original.id);
  assert.equal(movement.reference_type, "family_manual");
});

test("family movement final boundary rejects a session revoked during its observed profile wait", async () => {
  const f = await catalogueIdentityFixture(),
    before = identityPhysicalState(f);
  const result = await whileRowWaits(
    "profiles",
    fixtures.adminA.id,
    "family_stock_movement",
    () =>
      f.admin.rpc("family_stock_movement", {
        p_patient: f.patient,
        p_product: f.products[0],
        p_quantity: "1",
        p_action: "inbound",
        p_reason:
          "Entrada fictícia aguardando a autoria real antes de confirmar",
        p_key: randomUUID(),
      }),
    async () => {
      assert.ifError((await f.admin.auth.signOut({ scope: "local" })).error);
    },
  );
  assert.equal(result.error?.code, "42501", result.error?.message);
  assert.equal(identityPhysicalState(f), before);
});

test("inactive four-unit team custody may stay in place or follow an independent bilateral physical return without reactivation", async () => {
  const f = await catalogueIdentityFixture();
  await rpc(f.admin, "catalogue_identity_command", await identityPacket(f));
  const before = JSON.parse(identityPhysicalState(f));
  const declaration = await declareTransfer(f, { quantity: "2" });
  assert.ifError(declaration.response.error);
  const declared = declaration.response.data;
  assert.equal(
    JSON.parse(identityPhysicalState(f)).ledger.length,
    before.ledger.length,
  );
  const agreed = await transferCommand(
    f.counterparty.client,
    declared.id,
    "agree",
    declared.version,
    {
      reason:
        "Concordância própria para devolver fisicamente duas unidades inativas",
    },
  );
  assert.ifError(agreed.error);
  assert.equal(
    JSON.parse(identityPhysicalState(f)).ledger.length,
    before.ledger.length,
  );
  const sent = await transferCommand(
    f.initiator.client,
    declared.id,
    "dispatch",
    agreed.data.version,
  );
  assert.ifError(sent.error);
  await rpc(f.recipient.client, "supply_document_command", {
    p_id: declared.id,
    p_action: "receive",
    p_version: sent.data.version,
    p_body: { divergences: [] },
    p_key: randomUUID(),
  });
  const context = await identityContext(f);
  assert.equal(context.source.is_active, false);
  assert.deepEqual(context.source.stock, {
    FAMILY: "6.000000",
    CARE_TEAM: "2.000000",
    TRANSIT: "0.000000",
  });
  const after = JSON.parse(identityPhysicalState(f));
  assert.equal(after.ledger.length, before.ledger.length + 2);
  assert.deepEqual(
    after.ledger.filter((row) =>
      before.ledger.some((old) => old.id === row.id),
    ),
    before.ledger,
  );
  assert.equal(
    after.ledger
      .filter((row) => !before.ledger.some((old) => old.id === row.id))
      .every(
        (row) =>
          row.reference_type === "document" && row.reference_id === declared.id,
      ),
    true,
  );
});
