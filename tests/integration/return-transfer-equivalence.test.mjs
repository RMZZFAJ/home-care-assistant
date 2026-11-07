import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import {
  transferFixture,
  declareTransfer,
  transferCommand,
  transferState,
  rpc,
} from "./transfer-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";

for (const scenario of ["integral", "partial", "prior-consumption-inactive"]) {
  test(`legacy return and bilateral transfer conserve the same physical facts: ${scenario}`, async () => {
    const outcomes = [];
    for (const mode of ["legacy", "bilateral"]) {
      const f = await transferFixture();
      let consumption = null;
      if (scenario === "prior-consumption-inactive") {
        consumption = await rpc(
          f.initiator.client,
          "report_extraordinary_consumption",
          {
            p_patient: f.patient,
            p_kind: "consumption",
            p_location: "CARE_TEAM",
            p_text:
              "Consumo anterior à devolução física, sem repetição na transferência",
            p_lines: [{ productId: f.products[0], quantity: "2" }],
            p_key: randomUUID(),
          },
        );
        await rpc(f.admin, "decide_consumption_report", {
          p_id: consumption,
          p_accept: true,
          p_reason: null,
          p_key: randomUUID(),
          p_version: 1,
        });
      }
      const previous = JSON.parse(transferState(f));
      let sent;
      if (mode === "legacy") {
        sent = await rpc(f.initiator.client, "create_supply_document", {
          p_patient: f.patient,
          p_type: "ENT",
          p_key: randomUUID(),
          p_draft: false,
          p_payload: {
            source: "CARE_TEAM",
            destination: "FAMILY",
            recipientId: f.recipient.id,
            recipientReason:
              "Devolução física de cinco unidades à pessoa designada",
            lines: [{ productId: f.products[0], quantity: "5" }],
          },
        });
      } else {
        const declaration = await declareTransfer(f);
        assert.ifError(declaration.response.error);
        assert.deepEqual(JSON.parse(transferState(f)).ledger, previous.ledger);
        const agreement = await transferCommand(
          f.counterparty.client,
          declaration.response.data.id,
          "agree",
          declaration.response.data.version,
          { reason: "Concordo pessoalmente com a devolução declarada" },
        );
        assert.ifError(agreement.error);
        assert.deepEqual(JSON.parse(transferState(f)).ledger, previous.ledger);
        const dispatch = await transferCommand(
          f.initiator.client,
          agreement.data.id,
          "dispatch",
          agreement.data.version,
        );
        assert.ifError(dispatch.error);
        sent = dispatch.data;
      }
      assert.equal(sent.created_by, f.initiator.id);
      assert.equal(sent.recipient_id, f.recipient.id);
      assert.equal(sent.code, "ENT-0002");
      assert.ok(sent.protocol);
      assert.equal(sent.status, "pending_receipt");
      if (scenario === "prior-consumption-inactive") {
        // Both historical carriers preserve an issued dispatch when the catalogue
        // becomes inactive before physical receipt. New declarations also have
        // their separate inactive-positive-custody regression in D2.21.
        sql(
          `update public.care_recipient_products set is_active=false where care_recipient_id=${sqlLiteral(f.patient)} and product_id=${sqlLiteral(f.products[0])};`,
        );
      }
      const accepted = scenario === "partial" ? "3" : "5";
      const command = {
        p_id: sent.id,
        p_action: "receive",
        p_key: randomUUID(),
        p_version: sent.version,
        p_body: {
          divergences:
            scenario === "partial"
              ? [
                  {
                    lineId: sent.lines[0].id,
                    acceptedQuantity: accepted,
                    problem: "shortage",
                    notes: "Recebi pessoalmente três das cinco unidades",
                  },
                ]
              : [],
        },
      };
      const beforeReceipt = transferState(f);
      assert.equal(
        (await f.admin.rpc("supply_document_command", command)).error?.code,
        "42501",
      );
      assert.equal(transferState(f), beforeReceipt);
      const received = await rpc(
        f.recipient.client,
        "supply_document_command",
        command,
      );
      assert.equal(received.workflow_data.acceptedBy, f.recipient.id);
      assert.equal(
        Number(received.lines[0].accepted_quantity),
        Number(accepted),
      );
      assert.equal(Number(received.lines[0].quantity), 5);
      const sealed = transferState(f);
      await rpc(f.recipient.client, "supply_document_command", command);
      assert.equal(transferState(f), sealed);
      const projection = JSON.parse(
        sql(`select jsonb_build_object(
        'family',private.stock_quantity(${sqlLiteral(f.patient)},${sqlLiteral(f.products[0])},'FAMILY'),
        'team',private.stock_quantity(${sqlLiteral(f.patient)},${sqlLiteral(f.products[0])},'CARE_TEAM'),
        'transit',private.stock_quantity(${sqlLiteral(f.patient)},${sqlLiteral(f.products[0])},'TRANSIT'),
        'movements',(select jsonb_agg(jsonb_build_object('source',source_location,'destination',destination_location,'quantity',quantity) order by movement_revision) from public.stock_movements where reference_type='document' and reference_id=${sqlLiteral(sent.id)}),
        'active',(select is_active from public.care_recipient_products where care_recipient_id=${sqlLiteral(f.patient)} and product_id=${sqlLiteral(f.products[0])}));`),
      );
      assert.equal(projection.family, 20 + Number(accepted));
      assert.equal(
        projection.team,
        scenario === "prior-consumption-inactive" ? 3 : 5,
      );
      assert.equal(projection.transit, 5 - Number(accepted));
      assert.deepEqual(projection.movements, [
        { source: "CARE_TEAM", destination: "TRANSIT", quantity: 5 },
        {
          source: "TRANSIT",
          destination: "FAMILY",
          quantity: Number(accepted),
        },
      ]);
      if (consumption)
        assert.equal(
          sql(
            `select count(*) from public.stock_movements where reference_type='consumption' and reference_id=${sqlLiteral(consumption)};`,
          ),
          "1",
        );
      outcomes.push(projection);
    }
    assert.deepEqual(outcomes[1], outcomes[0]);
  });
}
