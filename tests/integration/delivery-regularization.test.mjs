import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { unavailableDelivery } from "./delivery-regularization-fixtures.mjs";
import { actor, fixtures } from "./v4-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
const ledger = (f) =>
  sql(
    `select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${sqlLiteral(f.patient)};`,
  );
const proposalBody = (f, overrides = {}) => ({
  reason: "Impossível obter nova declaração da pessoa desligada",
  basis:
    "Conferência administrativa fictícia documenta a situação física atual",
  reviewerId: fixtures.family.id,
  lines: f.document.lines.map((l) => ({
    lineId: l.id,
    receivedQuantity: "0",
    returnedQuantity: "1",
    missingQuantity: "0",
  })),
  ...overrides,
});
const command = (client, document, action, body, key = randomUUID()) =>
  client.rpc("supply_document_command", {
    p_id: document.id,
    p_action: action,
    p_body: body,
    p_key: key,
    p_version: document.version,
  });

test("P05 unavailable recipient requires a typed administrative procedure before critical stock resolution", async () => {
  const f = await unavailableDelivery(),
    before = ledger(f);
  const result = await f.admin.rpc("supply_document_command", {
    p_id: f.document.id,
    p_action: "resolve",
    p_body: {
      lineId: f.document.lines[0].id,
      resolution: "returned",
      quantity: "1",
      reason: "Apuração administrativa fictícia após desligamento",
    },
    p_key: randomUUID(),
    p_version: f.document.version,
  });
  assert.equal(result.error?.code, "22023");
  assert.match(result.error.message, /administrative regularization required/);
  assert.equal(ledger(f), before);
});

test("P05 proposal is nonphysical and independent approval returns only proven transit without changing original receipt authorship", async () => {
  const f = await unavailableDelivery(),
    before = ledger(f),
    body = proposalBody(f),
    key = randomUUID(),
    proposed = await command(
      f.admin,
      f.document,
      "propose_regularization",
      body,
      key,
    );
  assert.ifError(proposed.error);
  assert.equal(ledger(f), before);
  const current = proposed.data.deliveryRegularization,
    c = current.cases.find((c) => c.id === current.currentId);
  assert.equal(c.proposed_by, fixtures.adminA.id);
  assert.equal(c.reviewer_id, fixtures.family.id);
  assert.equal(c.before_snapshot.acceptedBy, fixtures.professional.id);
  assert.equal(c.proposal.personalReceipt, false);
  const family = await actor("family", f.patient),
    decision = {
      caseId: c.id,
      accept: true,
      reason:
        "Conferência independente confirma a devolução física de uma unidade",
    },
    decisionKey = randomUUID();
  assert.equal(
    (await command(f.admin, proposed.data, "review_regularization", decision))
      .error?.code,
    "42501",
  );
  const result = await command(
    family,
    proposed.data,
    "review_regularization",
    decision,
    decisionKey,
  );
  assert.ifError(result.error);
  assert.equal(result.data.status, "administratively_closed");
  assert.equal(result.data.workflow_data.acceptedBy, fixtures.professional.id);
  assert.equal(Number(result.data.lines[0].accepted_quantity), 2);
  assert.equal(Number(result.data.lines[0].reconciled_quantity), 1);
  assert.equal(result.data.lines[0].fully_checked, false);
  const moves = JSON.parse(
    sql(
      `select jsonb_agg(to_jsonb(m)) from public.stock_movements m where reference_type='delivery_regularization' and reference_id=${sqlLiteral(c.id)};`,
    ),
  );
  assert.equal(moves.length, 1);
  assert.equal(moves[0].performed_by, fixtures.family.id);
  assert.equal(moves[0].source_location, "TRANSIT");
  assert.equal(moves[0].destination_location, "FAMILY");
  assert.equal(moves[0].quantity, 1);
  const after = ledger(f),
    recovered = await command(
      family,
      proposed.data,
      "review_regularization",
      decision,
      decisionKey,
    );
  assert.ifError(recovered.error);
  assert.equal(recovered.data.commandOutcome.state, "recovered");
  assert.equal(ledger(f), after);
  assert.equal(
    (
      await command(family, result.data, "review_regularization", {
        ...decision,
        accept: false,
      })
    ).error?.code,
    "P0001",
  );
  assert.equal(ledger(f), after);
  assert.equal(
    sql(
      `select body->'deliveryRegularization'->'cases'->0->'decision'->>'actorId' from public.document_events where document_id=${sqlLiteral(f.document.id)} order by version desc limit 1;`,
    ),
    fixtures.family.id,
  );
});

test("P05 unknown physical state keeps transit and requires an active future owner without attributing acceptance to a substitute", async () => {
  const f = await unavailableDelivery(),
    before = ledger(f),
    unknown = {
      ...proposalBody(f),
      lines: f.document.lines.map((l) => ({
        lineId: l.id,
        receivedQuantity: "0",
        returnedQuantity: "0",
        missingQuantity: "0",
      })),
    };
  const denied = await command(
    f.admin,
    f.document,
    "propose_regularization",
    unknown,
  );
  assert.equal(denied.error?.code, "22023");
  assert.equal(ledger(f), before);
  const proposed = await command(
    f.admin,
    f.document,
    "propose_regularization",
    { ...unknown, followUpOwnerId: fixtures.adminA.id },
  );
  assert.ifError(proposed.error);
  const caseId = proposed.data.deliveryRegularization.currentId,
    family = await actor("family", f.patient);
  const result = await command(family, proposed.data, "review_regularization", {
    caseId,
    accept: true,
    reason:
      "Encerramento administrativo mantém desconhecido e responsável por apuração futura",
  });
  assert.ifError(result.error);
  assert.equal(result.data.status, "administratively_closed");
  assert.equal(ledger(f), before);
  assert.equal(Number(result.data.lines[0].accepted_quantity), 2);
  assert.equal(Number(result.data.lines[0].reconciled_quantity), 0);
  assert.equal(Number(result.data.deliveryRegularization.pendingTransit), 1);
  const finding = await command(
    f.admin,
    result.data,
    "record_regularization_finding",
    {
      caseId,
      text: "Apuração futura própria: material ainda não localizado, sem declaração em nome da pessoa desligada",
    },
  );
  assert.ifError(finding.error);
  assert.equal(ledger(f), before);
  assert.equal(
    finding.data.deliveryRegularization.cases[0].findings[0].actor_id,
    fixtures.adminA.id,
  );
  assert.equal(Number(finding.data.lines[0].accepted_quantity), 2);
});
