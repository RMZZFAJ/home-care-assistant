import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { setup, actor, rpc, fixtures, env } from "./v4-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
import { whileAdvisoryWaits, whileRowWaits } from "./lock-barrier.mjs";

const ledger = (f) =>
  sql(
    `select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${sqlLiteral(f.patient)};`,
  );
const balance = (f, location) =>
  Number(
    sql(
      `select coalesce(sum(case when destination_location=${sqlLiteral(location)} then quantity else 0 end)-sum(case when source_location=${sqlLiteral(location)} then quantity else 0 end),0)::text from public.stock_movements where care_recipient_id=${sqlLiteral(f.patient)} and product_id=${sqlLiteral(f.products[0])};`,
    ),
  );
const command = (client, document, action, body, key = randomUUID()) =>
  client.rpc("supply_document_command", {
    p_id: document.id,
    p_action: action,
    p_body: body,
    p_key: key,
    p_version: document.version,
  });
async function accepted(
  f,
  {
    quantity = "2",
    acceptedQuantity = "2",
    consume = true,
    request = true,
  } = {},
) {
  const professional = await actor("professional", f.patient),
    family = await actor("family", f.patient);
  let document = await rpc(family, "create_supply_document", {
    p_patient: f.patient,
    p_type: "ENT",
    p_payload: {
      source: "FAMILY",
      destination: "CARE_TEAM",
      recipientId: fixtures.professional.id,
      lines: [{ productId: f.products[0], quantity }],
    },
    p_key: randomUUID(),
    p_draft: false,
  });
  document = await rpc(professional, "supply_document_command", {
    p_id: document.id,
    p_action: "receive",
    p_body: {
      divergences:
        quantity === acceptedQuantity
          ? []
          : [{ lineId: document.lines[0].id, acceptedQuantity }],
    },
    p_key: randomUUID(),
    p_version: document.version,
  });
  assert.equal(
    Number(document.lines[0].accepted_quantity),
    Number(acceptedQuantity),
  );
  const consumption = consume
    ? await confirmedConsumption({ ...f, professional })
    : null;
  const cancelKey = randomUUID(),
    cancelBody = {
      reason: "Solicitação fictícia de cancelamento após consumo",
    },
    requestVersion = document.version;
  if (request)
    document = await rpc(f.admin, "supply_document_command", {
      p_id: document.id,
      p_action: "cancel",
      p_body: cancelBody,
      p_key: cancelKey,
      p_version: requestVersion,
    });
  return {
    ...f,
    professional,
    family,
    document,
    consumption,
    cancelKey,
    cancelBody,
    requestVersion,
  };
}
async function confirmedConsumption(f) {
  const id = await rpc(f.professional, "report_extraordinary_consumption", {
    p_patient: f.patient,
    p_kind: "consumption",
    p_location: "CARE_TEAM",
    p_text: "Consumo fictício confirmado antes do cancelamento",
    p_lines: [{ productId: f.products[0], quantity: "1" }],
    p_key: randomUUID(),
  });
  await rpc(f.admin, "decide_consumption_report", {
    p_id: id,
    p_accept: true,
    p_reason: null,
    p_key: randomUUID(),
    p_version: 1,
  });
  return id;
}
const decisionBody = (f, reason = "Decisão fictícia própria") => ({
  requestId: f.document.deliveryCancellation.request.id,
  reason,
});
const consentBody = (f, returned = "1") => ({
  ...decisionBody(f, "Conciliação fictícia baseada na devolução real"),
  referenceHash: f.document.deliveryCancellation.referenceHash,
  lines: f.document.lines.map((line) => ({
    lineId: line.id,
    returnQuantity: returned,
  })),
});
const evidence = (f) =>
  sql(
    `select jsonb_build_object('document',(select to_jsonb(d) from public.operational_documents d where id=${sqlLiteral(f.document.id)}),'lines',(select jsonb_agg(to_jsonb(l) order by id) from public.document_lines l where document_id=${sqlLiteral(f.document.id)}),'events',(select jsonb_agg(to_jsonb(e) order by version) from public.document_events e where document_id=${sqlLiteral(f.document.id)}),'allocations',(select jsonb_agg(to_jsonb(a) order by id) from public.delivery_consumption_allocations a where document_id=${sqlLiteral(f.document.id)}));`,
  );
async function sendAs(client, document, action, body, key = randomUUID()) {
  const session = (await client.auth.getSession()).data.session;
  assert.ok(session);
  const response = await fetch(
    env.url + "/rest/v1/rpc/supply_document_command",
    {
      method: "POST",
      headers: {
        apikey: env.anonKey,
        authorization: "Bearer " + session.access_token,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        p_id: document.id,
        p_action: action,
        p_body: body,
        p_key: key,
        p_version: document.version,
      }),
      signal: AbortSignal.timeout(20_000),
    },
  );
  return { ok: response.ok, body: await response.json() };
}
async function legacyFixtureCommand(client, document, action, body) {
  // Controlled compatibility setup only: execute the retained, non-public legacy
  // engine with a real fixture session. New permission/decision assertions use Auth RPC.
  assert.ok(["cancel", "consent_cancel"].includes(action));
  const session = (await client.auth.getSession()).data.session;
  assert.ok(session);
  const payload = JSON.parse(
    Buffer.from(session.access_token.split(".")[1], "base64url").toString(
      "utf8",
    ),
  );
  const claims = Object.fromEntries(
    ["sub", "session_id", "role", "iat", "exp", "aal"].map((key) => [
      key,
      payload[key],
    ]),
  );
  sql(
    `begin;select set_config('request.jwt.claims',${sqlLiteral(JSON.stringify(claims))},true);do $fixture$begin perform public.audited_legacy_supply_command(${sqlLiteral(document.id)},${sqlLiteral(action)},${sqlLiteral(JSON.stringify(body))}::jsonb,${sqlLiteral(randomUUID())},${document.version});end;$fixture$;commit;`,
  );
  return rpc(client, "operational_document", { p_id: document.id });
}
async function consent(f) {
  const current = await rpc(f.professional, "operational_document", {
      p_id: f.document.id,
    }),
    context = current.deliveryCancellation;
  assert.equal(context.sourceReady, true);
  assert.equal(Number(context.lines[0].availableConsumedQuantity), 1);
  const key = randomUUID(),
    body = {
      reason: "Conciliação fictícia: uma consumida e uma devolvida",
      requestId: context.request.id,
      referenceHash: context.referenceHash,
      lines: [{ lineId: f.document.lines[0].id, returnQuantity: "1" }],
    };
  const before = ledger(f),
    result = await command(
      f.professional,
      f.document,
      "consent_cancel",
      body,
      key,
    );
  if (result.error)
    assert.equal(
      ledger(f),
      before,
      "A refused consent must roll back all side effects",
    );
  assert.ifError(result.error);
  return { key, body, result: result.data };
}
test("ENT accepted 2 with confirmed consumption 1 can return 1 once without debiting that consumption again", async () => {
  const f = await accepted(await setup()),
    beforeConsumption = sql(
      `select count(*) from public.stock_movements where reference_type='consumption' and reference_id=${sqlLiteral(f.consumption)};`,
    );
  const { key, body, result } = await consent(f);
  assert.equal(result.status, "cancelled");
  assert.equal(balance(f, "FAMILY"), 29);
  assert.equal(balance(f, "CARE_TEAM"), 0);
  assert.equal(balance(f, "TRANSIT"), 0);
  const after = ledger(f);
  assert.ifError(
    (await command(f.professional, f.document, "consent_cancel", body, key))
      .error,
  );
  assert.equal(ledger(f), after);
  assert.equal(
    sql(
      `select count(*) from public.stock_movements where reference_type='consumption' and reference_id=${sqlLiteral(f.consumption)};`,
    ),
    beforeConsumption,
  );
});

test("ENT accepted 3 cannot erase an unaccounted unit when consumption 1 and return 1 are proven", async () => {
  const f = await accepted(await setup(), {
      quantity: "3",
      acceptedQuantity: "3",
    }),
    before = ledger(f),
    facts = evidence(f);
  const incomplete = await command(
    f.professional,
    f.document,
    "consent_cancel",
    consentBody(f, "1"),
  );
  assert.equal(incomplete.error?.code, "22023");
  assert.match(
    incomplete.error.message,
    /confirmed delivery consumption insufficient/,
  );
  assert.equal(ledger(f), before);
  assert.equal(evidence(f), facts);
  const result = await command(
    f.professional,
    f.document,
    "consent_cancel",
    consentBody(f, "2"),
  );
  assert.ifError(result.error);
  assert.equal(result.data.status, "cancelled");
  assert.equal(
    Number(result.data.deliveryCancellation.lines[0].consumedQuantity),
    1,
  );
  assert.equal(
    Number(result.data.deliveryCancellation.lines[0].returnQuantity),
    2,
  );
  assert.equal(balance(f, "CARE_TEAM"), 0);
  assert.equal(balance(f, "FAMILY"), 29);
  assert.equal(
    sql(
      `select count(*) from public.stock_movements where reference_type='consumption' and reference_id=${sqlLiteral(f.consumption)};`,
    ),
    "1",
  );
});

test("ENT refusal and withdrawal preserve request identity, original actors and all stock facts", async () => {
  const f = await accepted(await setup()),
    before = ledger(f),
    body = decisionBody(f, "Recebedor mantém os materiais recebidos"),
    key = randomUUID();
  const refusal = await command(
    f.professional,
    f.document,
    "refuse_cancellation",
    body,
    key,
  );
  assert.ifError(refusal.error);
  assert.equal(refusal.data.status, "confirmed");
  assert.equal(refusal.data.deliveryCancellation.request.status, "refused");
  assert.equal(
    refusal.data.deliveryCancellation.request.outcome.actorId,
    fixtures.professional.id,
  );
  assert.equal(ledger(f), before);
  assert.equal(
    (
      await command(
        f.professional,
        f.document,
        "refuse_cancellation",
        body,
        key,
      )
    ).data.commandOutcome.state,
    "recovered",
  );
  assert.equal(
    (await command(f.professional, f.document, "refuse_cancellation", body))
      .data.commandOutcome.state,
    "recovered",
  );
  const opposite = await command(
    f.admin,
    refusal.data,
    "withdraw_cancellation",
    body,
  );
  assert.match(opposite.error?.message ?? "", /decision conflict/);
  assert.equal(ledger(f), before);
  const next = await command(f.admin, refusal.data, "cancel", {
    reason: "Nova solicitação fictícia independente",
  });
  assert.ifError(next.error);
  assert.notEqual(next.data.deliveryCancellation.request.id, body.requestId);
  assert.equal(next.data.deliveryCancellation.history.length, 1);
  const old = await command(f.admin, next.data, "withdraw_cancellation", body);
  assert.match(old.error?.message ?? "", /decision conflict/);
  const withdrawn = await command(f.admin, next.data, "withdraw_cancellation", {
    requestId: next.data.deliveryCancellation.request.id,
    reason: "Solicitante retirou o pedido atual",
  });
  assert.ifError(withdrawn.error);
  assert.equal(withdrawn.data.status, "confirmed");
  assert.equal(withdrawn.data.deliveryCancellation.request.status, "withdrawn");
  assert.equal(
    withdrawn.data.deliveryCancellation.request.outcome.actorId,
    fixtures.adminA.id,
  );
  assert.equal(ledger(f), before);
});

test("ENT cancellation is personal for the recipient and withdrawal is personal for the requester", async () => {
  const f = await accepted(await setup()),
    other = await actor("global", f.patient),
    before = evidence(f),
    stock = ledger(f);
  for (const client of [f.admin, other])
    for (const action of ["consent_cancel", "refuse_cancellation"]) {
      const result = await command(
        client,
        f.document,
        action,
        action === "consent_cancel" ? consentBody(f) : decisionBody(f),
      );
      assert.equal(result.error?.code, "42501");
    }
  assert.equal(
    (await command(other, f.document, "withdraw_cancellation", decisionBody(f)))
      .error?.code,
    "42501",
  );
  assert.equal(evidence(f), before);
  assert.equal(ledger(f), stock);
});

test("ENT requests race with one pending request and cannot overwrite each other's reason", async () => {
  const f = await accepted(await setup(), { request: false }),
    other = await actor("global", f.patient),
    stock = ledger(f);
  const results = await Promise.all([
    sendAs(f.admin, f.document, "cancel", { reason: "Pedido A fictício" }),
    sendAs(other, f.document, "cancel", { reason: "Pedido B fictício" }),
  ]);
  assert.equal(results.filter((result) => result.ok).length, 1);
  assert.match(
    results.find((result) => !result.ok).body.message,
    /decision conflict|stale document/,
  );
  const current = await rpc(f.admin, "operational_document", {
    p_id: f.document.id,
  });
  assert.ok(
    ["Pedido A fictício", "Pedido B fictício"].includes(
      current.deliveryCancellation.request.reason,
    ),
  );
  assert.equal(
    current.events.filter((event) => event.action === "ent.cancel").length,
    1,
  );
  assert.equal(ledger(f), stock);
});

test("ENT request recovery only needs live read access after its write capability is removed", async () => {
  const f = await accepted(await setup()),
    before = evidence(f),
    stock = ledger(f);
  sql(
    `insert into public.capability_overrides(care_recipient_id,capability,subject_user,enabled) values(${sqlLiteral(f.patient)},'ent.cancel',${sqlLiteral(fixtures.adminA.id)},false);`,
  );
  const recovered = await command(
    f.admin,
    { ...f.document, version: f.requestVersion },
    "cancel",
    f.cancelBody,
    f.cancelKey,
  );
  assert.ifError(recovered.error);
  assert.equal(recovered.data.commandOutcome.state, "recovered");
  assert.equal(
    (
      await command(f.admin, f.document, "cancel", {
        reason: "Outro pedido não autorizado",
      })
    ).error?.code,
    "42501",
  );
  assert.equal(evidence(f), before);
  assert.equal(ledger(f), stock);
});

test("ENT changed consumption reference conflicts at the same document version, then reconciles current sources without a new debit", async () => {
  const f = await accepted(await setup()),
    body = consentBody(f),
    version = f.document.version;
  await confirmedConsumption(f);
  const before = evidence(f),
    stock = ledger(f),
    stale = await command(f.professional, f.document, "consent_cancel", body);
  assert.match(
    stale.error?.message ?? "",
    /stale delivery consumption reference/,
  );
  assert.equal(evidence(f), before);
  assert.equal(ledger(f), stock);
  f.document = await rpc(f.professional, "operational_document", {
    p_id: f.document.id,
  });
  assert.equal(f.document.version, version);
  assert.equal(
    Number(f.document.deliveryCancellation.lines[0].availableConsumedQuantity),
    2,
  );
  const current = await command(
    f.professional,
    f.document,
    "consent_cancel",
    consentBody(f, "0"),
  );
  assert.ifError(current.error);
  assert.equal(current.data.status, "cancelled");
  assert.equal(
    current.data.deliveryCancellation.request.outcome.lines[0]
      .consumptionReferences.length,
    2,
  );
  assert.equal(ledger(f), stock);
});

test("ENT consumption source already reconciled by one delivery cannot be reused by a second delivery", async () => {
  const base = await setup(),
    first = await accepted(base, { consume: false, request: false }),
    second = await accepted(base, { consume: false, request: false });
  await confirmedConsumption(first);
  for (const f of [first, second]) {
    const result = await command(f.admin, f.document, "cancel", {
      reason: "Pedido fictício com consumo compartilhado",
    });
    assert.ifError(result.error);
    f.document = result.data;
  }
  await consent(first);
  second.document = await rpc(second.professional, "operational_document", {
    p_id: second.document.id,
  });
  assert.equal(
    Number(
      second.document.deliveryCancellation.lines[0].availableConsumedQuantity,
    ),
    0,
  );
  const before = evidence(second),
    stock = ledger(base),
    reuse = await command(
      second.professional,
      second.document,
      "consent_cancel",
      consentBody(second, "1"),
    );
  assert.match(
    reuse.error?.message ?? "",
    /confirmed delivery consumption insufficient/,
  );
  assert.equal(evidence(second), before);
  assert.equal(ledger(base), stock);
  assert.ifError(
    (
      await command(
        second.professional,
        second.document,
        "consent_cancel",
        consentBody(second, "2"),
      )
    ).error,
  );
  assert.equal(balance(base, "FAMILY"), 29);
  assert.equal(balance(base, "CARE_TEAM"), 0);
});

test("ENT partial cancellation preserves unresolved transit until an explicit real reconciliation", async () => {
  const f = await accepted(await setup(), { quantity: "3" }),
    before = evidence(f),
    stock = ledger(f);
  assert.equal(Number(f.document.deliveryCancellation.unresolvedTransit), 1);
  const premature = await command(
    f.professional,
    f.document,
    "consent_cancel",
    consentBody(f),
  );
  assert.match(
    premature.error?.message ?? "",
    /transit requires reconciliation/,
  );
  assert.equal(evidence(f), before);
  assert.equal(ledger(f), stock);
  const resolved = await command(f.admin, f.document, "resolve", {
    lineId: f.document.lines[0].id,
    quantity: "1",
    resolution: "returned",
    reason: "Material em trânsito retornou fisicamente à origem",
  });
  assert.ifError(resolved.error);
  assert.equal(resolved.data.status, "cancellation_pending");
  assert.equal(resolved.data.deliveryCancellation.request.status, "pending");
  assert.equal(Number(resolved.data.deliveryCancellation.unresolvedTransit), 0);
  f.document = resolved.data;
  await consent(f);
  assert.equal(balance(f, "FAMILY"), 29);
  assert.equal(balance(f, "CARE_TEAM"), 0);
  assert.equal(balance(f, "TRANSIT"), 0);
});

test("ENT raw cancellation refuses edited consumption, absent return and forged actor without partial effects", async () => {
  const f = await accepted(await setup()),
    body = consentBody(f),
    before = evidence(f),
    stock = ledger(f);
  for (const invalid of [
    { ...body, actorId: fixtures.professional.id },
    { ...body, lines: [{ ...body.lines[0], consumedQuantity: "1" }] },
    {
      ...body,
      lines: [{ lineId: body.lines[0].lineId, returnQuantity: null }],
    },
    {
      ...body,
      lines: [{ lineId: body.lines[0].lineId, returnQuantity: "1.0000001" }],
    },
  ])
    assert.equal(
      (await command(f.professional, f.document, "consent_cancel", invalid))
        .error?.code,
      "22023",
    );
  assert.equal(evidence(f), before);
  assert.equal(ledger(f), stock);
});

test("ENT consent revalidates personal authority after an observed stock lock wait", async () => {
  const f = await accepted(await setup()),
    before = evidence(f),
    stock = ledger(f),
    body = consentBody(f);
  const result = await whileAdvisoryWaits(
    "stock:" + f.patient,
    () => sendAs(f.professional, f.document, "consent_cancel", body),
    async () =>
      sql(
        `insert into public.capability_overrides(care_recipient_id,capability,subject_user,enabled) values(${sqlLiteral(f.patient)},'ent.receive',${sqlLiteral(fixtures.professional.id)},false);`,
      ),
  );
  assert.equal(result.body.code, "42501");
  assert.equal(evidence(f), before);
  assert.equal(ledger(f), stock);
});

test("ENT consent rolls back allocation and physical return after a later movement FK wait loses authority", async () => {
  const f = await accepted(await setup()),
    before = evidence(f),
    stock = ledger(f),
    body = consentBody(f),
    movement =
      f.document.deliveryCancellation.lines[0].consumptionReferences[0]
        .movementId;
  const result = await whileRowWaits(
    "stock_movements",
    movement,
    "supply_document_command",
    () => sendAs(f.professional, f.document, "consent_cancel", body),
    async () =>
      sql(
        `insert into public.capability_overrides(care_recipient_id,capability,subject_user,enabled) values(${sqlLiteral(f.patient)},'ent.receive',${sqlLiteral(fixtures.professional.id)},false);`,
      ),
  );
  assert.equal(result.body.code, "42501");
  assert.equal(evidence(f), before);
  assert.equal(ledger(f), stock);
});

test("ENT current consumption references respect their custody read capability and allocation grants", async () => {
  const f = await accepted(await setup()),
    body = consentBody(f),
    before = evidence(f),
    stock = ledger(f);
  sql(
    `insert into public.capability_overrides(care_recipient_id,capability,subject_user,enabled) values(${sqlLiteral(f.patient)},'stock.team.read',${sqlLiteral(fixtures.professional.id)},false);`,
  );
  const current = await rpc(f.professional, "operational_document", {
    p_id: f.document.id,
  });
  assert.equal(current.deliveryCancellation.sourceAccess, false);
  assert.equal(current.deliveryCancellation.sourceReady, false);
  assert.deepEqual(current.deliveryCancellation.lines, []);
  assert.equal(
    (await command(f.professional, f.document, "consent_cancel", body)).error
      ?.code,
    "42501",
  );
  assert.equal(evidence(f), before);
  assert.equal(ledger(f), stock);
  assert.equal(
    sql(
      "select has_table_privilege('authenticated','public.delivery_consumption_allocations','INSERT') or has_table_privilege('authenticated','public.delivery_consumption_allocations','UPDATE') or has_table_privilege('authenticated','public.delivery_consumption_allocations','DELETE') or has_function_privilege('authenticated','private.command_delivery_cancellation(uuid,text,jsonb,uuid,integer)','EXECUTE');",
    ),
    "f",
  );
});

test("ENT unknown requester or recipient cannot become the authenticated decision maker through SQL NULL", async () => {
  for (const field of ["requester", "recipient"]) {
    const f = await accepted(await setup());
    // Controlled malformed legacy identity, without changing any real user's history.
    if (field === "requester")
      sql(
        `update public.operational_documents set workflow_data=jsonb_set(workflow_data,'{deliveryCancellation,requestedBy}','null'::jsonb) where id=${sqlLiteral(f.document.id)};`,
      );
    else
      sql(
        `update public.operational_documents set recipient_id=null where id=${sqlLiteral(f.document.id)};`,
      );
    const before = evidence(f),
      stock = ledger(f),
      result = await command(
        field === "requester" ? f.admin : f.professional,
        f.document,
        field === "requester" ? "withdraw_cancellation" : "refuse_cancellation",
        decisionBody(f),
      );
    assert.equal(result.error?.code, "42501");
    assert.equal(evidence(f), before);
    assert.equal(ledger(f), stock);
  }
});

test("ENT later cancellation uses its later confirmed consumption without subtracting an earlier cancelled delivery twice", async () => {
  const base = await setup(),
    first = await accepted(base);
  await consent(first);
  const second = await accepted(base);
  assert.equal(
    sql(
      `select (select min(created_at) from public.stock_movements where reference_type='consumption' and reference_id=${sqlLiteral(first.consumption)}) < (select created_at from public.operational_documents where id=${sqlLiteral(second.document.id)});`,
    ),
    "t",
    "The second ENT must actually start after the first consumption",
  );
  assert.equal(
    sql(
      `select count(*) from public.stock_movements where care_recipient_id=${sqlLiteral(base.patient)} and product_id=${sqlLiteral(base.products[0])} and reference_type='consumption' and created_at >= (select created_at from public.operational_documents where id=${sqlLiteral(second.document.id)});`,
    ),
    "1",
  );
  await consent(second);
  assert.equal(balance(base, "FAMILY"), 28);
  assert.equal(balance(base, "CARE_TEAM"), 0);
  assert.equal(balance(base, "TRANSIT"), 0);
  assert.equal(
    sql(
      `select count(*) from public.stock_movements where care_recipient_id=${sqlLiteral(base.patient)} and reference_type='consumption';`,
    ),
    "2",
  );
});

test("ENT new reconciliation preserves legacy cancellations without inventing past source allocations", async () => {
  const base = await setup(),
    legacy = await accepted(base, { request: false });
  legacy.document = await legacyFixtureCommand(
    legacy.admin,
    legacy.document,
    "cancel",
    { reason: "Pedido fictício no formato histórico" },
  );
  assert.equal(
    legacy.document.deliveryCancellation.request.source,
    "legacy_event",
  );
  const originalBody = {
    reason: "Consentimento fictício no formato histórico",
    lines: [
      {
        lineId: legacy.document.lines[0].id,
        returnQuantity: "1",
        consumedQuantity: "1",
      },
    ],
  };
  legacy.document = await legacyFixtureCommand(
    legacy.professional,
    legacy.document,
    "consent_cancel",
    originalBody,
  );
  assert.equal(legacy.document.status, "cancelled");
  assert.equal(
    sql(
      `select count(*) from public.delivery_consumption_allocations where document_id=${sqlLiteral(legacy.document.id)};`,
    ),
    "0",
  );
  const next = await accepted(base);
  assert.equal(
    next.document.deliveryCancellation.lines[0].consumptionReferences[0]
      .reportId,
    next.consumption,
  );
  await consent(next);
  assert.equal(
    sql(
      `select count(*) from public.delivery_consumption_allocations where document_id=${sqlLiteral(next.document.id)};`,
    ),
    "1",
  );
  assert.equal(balance(base, "FAMILY"), 28);
  assert.equal(balance(base, "CARE_TEAM"), 0);
  const preserved = JSON.parse(
    sql(
      `select body->'event' from public.document_events where document_id=${sqlLiteral(legacy.document.id)} and action='ent.consent_cancel';`,
    ),
  );
  assert.deepEqual(preserved, originalBody);
});
