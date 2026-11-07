import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { unavailableDelivery } from "./delivery-regularization-fixtures.mjs";
import { actor, rpc, fixtures, setup } from "./v4-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
import { whileAdvisoryWaits, whileRowWaits } from "./lock-barrier.mjs";
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
const currentCase = (document) =>
  document.deliveryRegularization.cases.find(
    (c) => c.id === document.deliveryRegularization.currentId,
  );
const facts = (f) =>
  sql(
    `select jsonb_build_object('version',d.version,'status',d.status,'workflow',d.workflow_data,'lines',(select jsonb_agg(to_jsonb(l) order by id) from public.document_lines l where document_id=d.id),'events',(select count(*) from public.document_events where document_id=d.id),'cases',(select jsonb_agg(to_jsonb(r) order by id) from public.delivery_regularizations r where document_id=d.id)) from public.operational_documents d where id=${sqlLiteral(f.document.id)};`,
  );
const override = (f, name, capability) =>
  sql(
    `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${sqlLiteral(f.patient)},${sqlLiteral(fixtures[name].id)},${sqlLiteral(capability)},false);`,
  );
const propose = async (f, body = proposalBody(f)) =>
  rpc(f.admin, "supply_document_command", {
    p_id: f.document.id,
    p_action: "propose_regularization",
    p_body: body,
    p_key: randomUUID(),
    p_version: f.document.version,
  });

test("P05 malformed and impersonated proposals preserve all facts, including NULL, extra fields and incomplete partitions", async () => {
  const f = await unavailableDelivery(),
    before = ledger(f),
    beforeFacts = facts(f),
    valid = proposalBody(f),
    line = valid.lines[0];
  for (const body of [
    null,
    [],
    { ...valid, reason: null },
    { ...valid, basis: "  " },
    { ...valid, reviewerId: null },
    { ...valid, actorId: fixtures.professional.id },
    { ...valid, lines: null },
    { ...valid, lines: [] },
    { ...valid, lines: [{ ...line, receivedQuantity: null }] },
    { ...valid, lines: [{ ...line, returnedQuantity: "NaN" }] },
    { ...valid, lines: [{ ...line, returnedQuantity: "0.000001" }] },
    { ...valid, lines: [{ ...line, returnedQuantity: "2" }] },
    { ...valid, lines: [{ ...line, unknownQuantity: "0" }] },
    { ...valid, followUpOwnerId: null },
  ]) {
    const result = await command(
      f.admin,
      f.document,
      "propose_regularization",
      body,
    );
    assert.equal(result.error?.code, "22023", JSON.stringify(result));
    assert.equal(ledger(f), before);
    assert.equal(facts(f), beforeFacts);
  }
  for (const body of [
    { ...valid, reviewerId: fixtures.adminA.id },
    { ...valid, reviewerId: fixtures.reader.id },
    { ...valid, followUpOwnerId: fixtures.reader.id },
  ])
    assert.equal(
      (await command(f.admin, f.document, "propose_regularization", body)).error
        ?.code,
      "42501",
    );
  assert.equal(ledger(f), before);
  assert.equal(facts(f), beforeFacts);
});

test("P05 physical administrative receipt and proven loss have separate movements and never increase the personal acceptance", async () => {
  const f = await unavailableDelivery({ quantity: "5" });
  sql(
    `update public.care_recipient_products set is_active=false where care_recipient_id=${sqlLiteral(f.patient)} and product_id=${sqlLiteral(f.products[0])};`,
  );
  const p = await propose(
      f,
      proposalBody(f, {
        lines: [
          {
            lineId: f.document.lines[0].id,
            receivedQuantity: "1",
            returnedQuantity: "1",
            missingQuantity: "1",
          },
        ],
      }),
    ),
    family = await actor("family", f.patient);
  const result = await command(family, p, "review_regularization", {
    caseId: currentCase(p).id,
    accept: true,
    reason:
      "Conferência distingue material encontrado no destino de falta apurada",
  });
  assert.ifError(result.error);
  assert.equal(Number(result.data.lines[0].accepted_quantity), 2);
  assert.equal(Number(result.data.lines[0].reconciled_quantity), 3);
  assert.equal(result.data.workflow_data.acceptedBy, fixtures.professional.id);
  assert.equal(result.data.lines[0].fully_checked, false);
  const movements = JSON.parse(
    sql(
      `select jsonb_agg(to_jsonb(m) order by destination_location nulls last) from public.stock_movements m where reference_type='delivery_regularization' and reference_id=${sqlLiteral(currentCase(p).id)};`,
    ),
  );
  assert.equal(movements.length, 3);
  assert.ok(
    movements.every(
      (m) =>
        m.source_location === "TRANSIT" &&
        m.quantity === 1 &&
        m.performed_by === fixtures.family.id,
    ),
  );
  assert.deepEqual(
    movements.map((m) => m.destination_location),
    ["CARE_TEAM", "FAMILY", null],
  );
  const history = await rpc(family, "stock_history", { p_patient: f.patient });
  const linked = history.data.filter(
    (m) => m.reference_type === "delivery_regularization",
  );
  assert.equal(linked.length, 3);
  assert.ok(linked.every((m) => m.reference_document_id === f.document.id));
});

test("P05 future professional has only their assigned task and own finding, with read-only recovery after write authority loss", async () => {
  const f = await unavailableDelivery();
  sql(
    `insert into public.care_recipient_memberships(care_recipient_id,user_id,role) values(${sqlLiteral(f.patient)},${sqlLiteral(fixtures.supervisor.id)},'professional');`,
  );
  const p = await propose(
      f,
      proposalBody(f, {
        followUpOwnerId: fixtures.supervisor.id,
        lines: [
          {
            lineId: f.document.lines[0].id,
            receivedQuantity: "0",
            returnedQuantity: "0",
            missingQuantity: "0",
          },
        ],
      }),
    ),
    family = await actor("family", f.patient),
    caseId = currentCase(p).id;
  assert.equal(
    (await rpc(family, "delivery_task_list", { p_patient: f.patient })).data[0]
      .task.code,
    "review_regularization",
  );
  const closed = await rpc(family, "supply_document_command", {
    p_id: p.id,
    p_action: "review_regularization",
    p_body: {
      caseId,
      accept: true,
      reason:
        "Encerramento preserva a pendência e designa apuração futura própria",
    },
    p_key: randomUUID(),
    p_version: p.version,
  });
  const next = await actor("supervisor", f.patient),
    reader = await actor("reader", f.patient),
    before = ledger(f),
    body = {
      caseId,
      text: "Apuração própria: ainda não localizado; nenhuma declaração substitutiva",
    },
    key = randomUUID();
  const tasks = await rpc(next, "delivery_task_list", { p_patient: f.patient });
  assert.equal(tasks.data.length, 1);
  assert.equal(tasks.data[0].task.code, "record_regularization_finding");
  assert.equal(tasks.data[0].recipient_id, fixtures.professional.id);
  assert.equal(
    (await rpc(reader, "delivery_task_list", { p_patient: f.patient })).data
      .length,
    0,
  );
  assert.equal(
    (await command(reader, closed, "record_regularization_finding", body)).error
      ?.code,
    "42501",
  );
  assert.equal(
    (await command(family, closed, "record_regularization_finding", body)).error
      ?.code,
    "42501",
  );
  const finding = await command(
    next,
    closed,
    "record_regularization_finding",
    body,
    key,
  );
  assert.ifError(finding.error);
  assert.equal(
    currentCase(finding.data).findings[0].actor_id,
    fixtures.supervisor.id,
  );
  assert.equal(
    (await rpc(next, "delivery_task_list", { p_patient: f.patient })).total,
    0,
  );
  override(f, "supervisor", "ent.follow_up");
  const recovery = await command(
    next,
    closed,
    "record_regularization_finding",
    body,
    key,
  );
  assert.ifError(recovery.error);
  assert.equal(recovery.data.commandOutcome.state, "recovered");
  assert.equal(ledger(f), before);
  assert.equal(
    (
      await command(next, finding.data, "record_regularization_finding", {
        caseId,
        text: "Outro relato após perda da autoridade",
      })
    ).error?.code,
    "42501",
  );
  assert.equal(
    (
      await f.professional
        .from("delivery_regularizations")
        .select("id")
        .eq("document_id", p.id)
    ).data.length,
    0,
  );
});

test("P05 rejection, withdrawal and obsolete closure preserve separate authors and all proposals without ledger effects", async () => {
  const f = await unavailableDelivery(),
    before = ledger(f),
    family = await actor("family", f.patient);
  let p = await propose(f),
    caseId = currentCase(p).id;
  assert.equal(
    (
      await command(family, p, "withdraw_regularization", {
        caseId,
        reason: "Terceiro não retira proposta atual em nome do autor",
      })
    ).error?.code,
    "42501",
  );
  let result = await command(f.admin, p, "withdraw_regularization", {
    caseId,
    reason: "Retiro minha proposta para nova apuração",
  });
  assert.ifError(result.error);
  assert.equal(currentCase(result.data).state, "withdrawn");
  f.document = result.data;
  p = await propose(f);
  caseId = currentCase(p).id;
  result = await command(family, p, "review_regularization", {
    caseId,
    accept: false,
    reason: "Minha conferência não sustenta a devolução proposta",
  });
  assert.ifError(result.error);
  assert.equal(currentCase(result.data).state, "rejected");
  f.document = result.data;
  p = await propose(f);
  caseId = currentCase(p).id;
  override(f, "adminA", "ent.regularize");
  assert.equal(
    (
      await command(family, p, "review_regularization", {
        caseId,
        accept: true,
        reason: "Não pode aprovar uma proposta cujo autor perdeu autoridade",
      })
    ).error?.code,
    "42501",
  );
  result = await command(family, p, "withdraw_regularization", {
    caseId,
    reason: "Encerro como obsoleta após perda da autoridade do proponente",
  });
  assert.ifError(result.error);
  assert.equal(currentCase(result.data).state, "obsolete");
  assert.equal(currentCase(result.data).decision.actorId, fixtures.family.id);
  assert.deepEqual(
    result.data.deliveryRegularization.cases.map((c) => c.state),
    ["withdrawn", "rejected", "obsolete"],
  );
  assert.equal(ledger(f), before);
  assert.equal(Number(result.data.lines[0].accepted_quantity), 2);
});

test("P05 pending cancellation is preserved as history without fake personal consent after administrative closure", async () => {
  const f = await unavailableDelivery({ cancellation: true }),
    p = await propose(f),
    family = await actor("family", f.patient),
    before = ledger(f);
  const result = await command(family, p, "review_regularization", {
    caseId: currentCase(p).id,
    accept: true,
    reason:
      "Apuração administrativa preserva o pedido anterior sem consentimento atribuído",
  });
  assert.ifError(result.error);
  assert.equal(result.data.status, "administratively_closed");
  assert.equal(result.data.deliveryCancellation.historical, true);
  assert.equal(result.data.deliveryCancellation.request.status, "pending");
  assert.equal(
    result.data.deliveryCancellation.request.requestedBy,
    fixtures.adminA.id,
  );
  assert.equal(result.data.deliveryCancellation.referenceHash, null);
  assert.equal(
    sql(
      `select count(*) from public.document_events where document_id=${sqlLiteral(p.id)} and action='ent.consent_cancel';`,
    ),
    "0",
  );
  assert.notEqual(ledger(f), before);
  assert.equal(
    (await rpc(family, "delivery_task_list", { p_patient: f.patient })).total,
    0,
  );
});

test("P05 patient lock wait rechecks the proposer authority without partial facts", async () => {
  const f = await unavailableDelivery(),
    before = ledger(f),
    beforeFacts = facts(f);
  const result = await whileAdvisoryWaits(
    "stock:" + f.patient,
    () =>
      command(f.admin, f.document, "propose_regularization", proposalBody(f)),
    async () => override(f, "adminA", "ent.regularize"),
  );
  assert.equal(result.error?.code, "42501");
  assert.equal(ledger(f), before);
  assert.equal(facts(f), beforeFacts);
});

test("P05 late product FK wait rejects recipient reactivation after a physical decision was prepared", async () => {
  const f = await unavailableDelivery(),
    p = await propose(f),
    family = await actor("family", f.patient),
    before = ledger(f),
    beforeFacts = facts(f);
  const result = await whileRowWaits(
    "products",
    f.products[0],
    "supply_document_command",
    () =>
      command(family, p, "review_regularization", {
        caseId: currentCase(p).id,
        accept: true,
        reason: "Conferência fictícia chega à barreira física tardia",
      }),
    async () =>
      sql(
        `update public.care_recipient_memberships set status='active' where care_recipient_id=${sqlLiteral(f.patient)} and user_id=${sqlLiteral(fixtures.professional.id)};`,
      ),
  );
  assert.equal(result.error?.code, "P0001");
  assert.match(result.error.message, /stale regularization facts/);
  assert.equal(ledger(f), before);
  assert.equal(facts(f), beforeFacts);
});

test("P05 late product FK wait rechecks the actual reviewer authority and rolls back all movements", async () => {
  const f = await unavailableDelivery(),
    p = await propose(f),
    family = await actor("family", f.patient),
    before = ledger(f),
    beforeFacts = facts(f);
  const result = await whileRowWaits(
    "products",
    f.products[0],
    "supply_document_command",
    () =>
      command(family, p, "review_regularization", {
        caseId: currentCase(p).id,
        accept: true,
        reason: "Conferência independente aguardando a FK real do produto",
      }),
    async () => override(f, "family", "ent.regularize"),
  );
  assert.equal(result.error?.code, "42501");
  assert.equal(ledger(f), before);
  assert.equal(facts(f), beforeFacts);
});

test("P05 concurrent opposite decisions yield one final intent and recover through read permission alone", async () => {
  const f = await unavailableDelivery(),
    p = await propose(f),
    family = await actor("family", f.patient),
    caseId = currentCase(p).id;
  const choices = [
      {
        caseId,
        accept: true,
        reason: "Conferência aprova os fatos físicos apresentados",
      },
      {
        caseId,
        accept: false,
        reason: "Conferência rejeita a proposta apresentada",
      },
    ],
    keys = choices.map(() => randomUUID());
  const results = await Promise.all(
      choices.map((body, i) =>
        command(family, p, "review_regularization", body, keys[i]),
      ),
    ),
    winner = results.findIndex((r) => !r.error);
  assert.equal(results.filter((r) => !r.error).length, 1);
  assert.equal(results[1 - winner].error.code, "P0001");
  const after = ledger(f);
  override(f, "family", "ent.regularize");
  const recovery = await command(
    family,
    p,
    "review_regularization",
    choices[winner],
    keys[winner],
  );
  assert.ifError(recovery.error);
  assert.equal(recovery.data.commandOutcome.state, "recovered");
  assert.equal(ledger(f), after);
  assert.equal(
    sql(
      `select count(*) from public.document_events where document_id=${sqlLiteral(p.id)} and action='ent.review_regularization';`,
    ),
    "1",
  );
  assert.equal(
    Number(
      sql(
        `select count(*) from public.stock_movements where reference_type='delivery_regularization' and reference_id=${sqlLiteral(caseId)};`,
      ),
    ),
    choices[winner].accept ? 1 : 0,
  );
});

test("P05 grants and RLS expose only legitimate patient history and no client writes or private execution", async () => {
  const f = await unavailableDelivery(),
    p = await propose(f),
    family = await actor("family", f.patient),
    reader = await actor("reader", f.patient);
  assert.equal(
    (
      await family
        .from("delivery_regularizations")
        .select("id")
        .eq("document_id", p.id)
    ).data.length,
    1,
  );
  for (const table of [
    "delivery_regularizations",
    "delivery_regularization_findings",
  ])
    assert.equal(
      (await reader.from(table).insert({ id: randomUUID() })).error.code,
      "42501",
    );
  assert.equal(
    sql(
      "select has_function_privilege('authenticated','private.command_delivery_regularization(uuid,text,jsonb,uuid,integer)','execute') or has_function_privilege('anon','private.delivery_regularization_context(uuid)','execute');",
    ),
    "f",
  );
  assert.equal(
    sql(
      "select has_table_privilege('authenticated','public.delivery_regularizations','UPDATE') or has_table_privilege('service_role','public.delivery_regularization_findings','INSERT');",
    ),
    "f",
  );
  assert.equal(
    (
      await f.professional
        .from("delivery_regularizations")
        .select("id")
        .eq("document_id", p.id)
    ).data.length,
    0,
  );
  const other = await setup();
  assert.equal(
    (
      await other.admin
        .from("delivery_regularizations")
        .select("id")
        .eq("document_id", p.id)
    ).data.length,
    0,
  );
  const support = await actor("global", f.patient);
  sql(
    `update public.care_recipient_memberships set status='revoked' where care_recipient_id=${sqlLiteral(f.patient)} and user_id=${sqlLiteral(fixtures.global.id)};`,
  );
  assert.equal(
    (
      await command(support, p, "withdraw_regularization", {
        caseId: currentCase(p).id,
        reason: "Suporte não substitui autoridade familiar local",
      })
    ).error?.code,
    "42501",
  );
});

test("P05 task filtering precedes pagination and includes the personal cancellation decision with strict patient filters", async () => {
  const f = await unavailableDelivery({ revoke: false, cancellation: true });
  for (let i = 0; i < 22; i++)
    await rpc(f.admin, "create_supply_document", {
      p_patient: f.patient,
      p_type: "ENT",
      p_payload: {
        source: "FAMILY",
        destination: "CARE_TEAM",
        recipientId: fixtures.professional.id,
        lines: [{ productId: f.products[0], quantity: "1" }],
      },
      p_key: randomUUID(),
      p_draft: true,
    });
  const tasks = await rpc(f.professional, "delivery_task_list", {
    p_patient: f.patient,
    p_page: 1,
    p_size: 1,
  });
  assert.equal(tasks.total, 1);
  assert.equal(tasks.data.length, 1);
  assert.equal(tasks.data[0].task.code, "cancellation");
  assert.equal(tasks.data[0].id, f.document.id);
  assert.equal(
    (
      await rpc(f.professional, "delivery_task_list", {
        p_patient: f.patient,
        p_page: 2,
        p_size: 1,
      })
    ).data.length,
    0,
  );
  for (const args of [
    { p_scope: null },
    { p_status: null },
    { p_page: null },
    { p_size: 0 },
    { p_scope: "team", p_status: "tasks" },
  ])
    assert.equal(
      (
        await f.professional.rpc("delivery_task_list", {
          p_patient: f.patient,
          ...args,
        })
      ).error?.code,
      "22023",
    );
  const other = await setup();
  assert.equal(
    (
      await f.professional.rpc("delivery_task_list", {
        p_patient: other.patient,
      })
    ).error?.code,
    "42501",
  );
});
