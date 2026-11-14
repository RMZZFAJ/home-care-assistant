import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  transferFixture,
  declareTransfer,
  transferCommand,
  transferState,
  rpc,
} from "./transfer-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
import { whileAdvisoryWaits, whileRowWaits } from "./lock-barrier.mjs";

test("a bilateral transfer separates Juliana's declaration, Ana's agreement and Bruno's personal partial receipt", async () => {
  const f = await transferFixture(),
    before = JSON.parse(transferState(f));
  const { response } = await declareTransfer(f);
  assert.ifError(response.error);
  const declared = response.data;
  assert.equal(declared.status, "transfer_pending");
  assert.equal(declared.created_by, f.initiator.id);
  assert.deepEqual(
    JSON.parse(transferState(f)).ledger,
    before.ledger,
    "Declaration must not move the material",
  );
  const premature = await transferCommand(
    f.initiator.client,
    declared.id,
    "dispatch",
    declared.version,
  );
  assert.equal(premature.error?.code, "PT409");
  assert.equal(
    (
      await transferCommand(
        f.recipient.client,
        declared.id,
        "agree",
        declared.version,
        { reason: "Não sou a contraparte designada" },
      )
    ).error?.code,
    "42501",
  );
  const agreement = await transferCommand(
    f.counterparty.client,
    declared.id,
    "agree",
    declared.version,
    { reason: "Concordância própria de Ana sobre a transferência declarada" },
  );
  assert.ifError(agreement.error);
  assert.equal(agreement.data.status, "transfer_ready");
  assert.equal(agreement.data.transfer.agreement.actor.id, f.counterparty.id);
  assert.deepEqual(
    JSON.parse(transferState(f)).ledger,
    before.ledger,
    "Agreement is not dispatch or physical receipt",
  );
  const dispatched = await transferCommand(
    f.initiator.client,
    declared.id,
    "dispatch",
    agreement.data.version,
  );
  assert.ifError(dispatched.error);
  assert.equal(dispatched.data.status, "pending_receipt");
  assert.equal(dispatched.data.recipient_id, f.recipient.id);
  assert.match(dispatched.data.code, /^DEV-/);
  assert.equal(dispatched.data.kind, "DEV");
  const afterDispatch = JSON.parse(transferState(f));
  assert.equal(afterDispatch.ledger.length, before.ledger.length + 1);
  const accept = {
    p_id: declared.id,
    p_action: "receive",
    p_body: {
      divergences: [
        {
          lineId: dispatched.data.lines[0].id,
          acceptedQuantity: "3",
          note: "Bruno recebeu pessoalmente três das cinco unidades",
        },
      ],
    },
    p_key: randomUUID(),
    p_version: dispatched.data.version,
  };
  assert.equal(
    (await f.counterparty.client.rpc("supply_document_command", accept)).error
      ?.code,
    "42501",
  );
  assert.equal(
    (await f.admin.rpc("supply_document_command", accept)).error?.code,
    "42501",
  );
  const received = await rpc(
    f.recipient.client,
    "supply_document_command",
    accept,
  );
  assert.equal(Number(received.lines[0].accepted_quantity), 3);
  assert.notEqual(received.workflow_data.acceptedBy, f.counterparty.id);
  assert.equal(received.workflow_data.acceptedBy, f.recipient.id);
  const balances = JSON.parse(
    sql(
      `select jsonb_build_object('team',private.stock_quantity(${sqlLiteral(f.patient)},${sqlLiteral(f.products[0])},'CARE_TEAM'),'family',private.stock_quantity(${sqlLiteral(f.patient)},${sqlLiteral(f.products[0])},'FAMILY'),'transit',private.stock_quantity(${sqlLiteral(f.patient)},${sqlLiteral(f.products[0])},'TRANSIT'));`,
    ),
  );
  assert.deepEqual(balances, { team: 5, family: 23, transit: 2 });
});

test("one counterparty may also receive, but her agreement still cannot confirm physical receipt", async () => {
  const f = await transferFixture(),
    before = JSON.parse(transferState(f)).ledger;
  const { response } = await declareTransfer(f, {
    client: f.admin,
    source: "FAMILY",
    counterpartyId: f.initiator.id,
    recipientId: f.initiator.id,
    originDocumentId: null,
    quantity: "2",
  });
  assert.ifError(response.error);
  const agreed = await transferCommand(
    f.initiator.client,
    response.data.id,
    "agree",
    response.data.version,
    { reason: "Concordo pessoalmente, sem declarar recebimento" },
  );
  assert.ifError(agreed.error);
  assert.deepEqual(JSON.parse(transferState(f)).ledger, before);
  assert.equal(agreed.data.workflow_data.acceptedBy, undefined);
  const dispatched = await transferCommand(
    f.admin,
    response.data.id,
    "dispatch",
    agreed.data.version,
  );
  assert.ifError(dispatched.error);
  const received = await rpc(f.initiator.client, "supply_document_command", {
    p_id: response.data.id,
    p_action: "receive",
    p_body: { divergences: [] },
    p_key: randomUUID(),
    p_version: dispatched.data.version,
  });
  assert.equal(received.workflow_data.acceptedBy, f.initiator.id);
  assert.equal(received.status, "confirmed");
  assert.equal(JSON.parse(transferState(f)).ledger.length, before.length + 2);
});

test("agreement and withdrawal serialize on the original version and neither invents a physical movement", async () => {
  const f = await transferFixture(),
    { response } = await declareTransfer(f);
  assert.ifError(response.error);
  const d = response.data,
    before = JSON.parse(transferState(f)).ledger;
  const results = await Promise.all([
    transferCommand(f.counterparty.client, d.id, "agree", d.version, {
      reason: "Concordância concorrente da contraparte",
    }),
    transferCommand(f.initiator.client, d.id, "withdraw", d.version, {
      reason: "Retirada concorrente da declaração original",
    }),
  ]);
  assert.equal(results.filter((r) => !r.error).length, 1);
  assert.equal(results.find((r) => r.error).error.code, "PT409");
  assert.deepEqual(JSON.parse(transferState(f)).ledger, before);
  assert.equal(
    (
      await f.admin
        .from("ent_transfers")
        .update({ state: "dispatched" })
        .eq("document_id", d.id)
    ).error?.code,
    "42501",
  );
  const tasks = await rpc(f.recipient.client, "delivery_task_list", {
    p_patient: f.patient,
    p_status: "tasks",
  });
  assert.equal(
    tasks.data.some((row) => row.id === d.id),
    false,
    "The physical recipient must not get a receipt task before dispatch",
  );
});

test("own confirmed transfer intents recover after write loss while new intents and read loss remain denied", async () => {
  const f = await transferFixture(),
    { response, args } = await declareTransfer(f);
  assert.ifError(response.error);
  sql(
    `update public.capability_overrides set enabled=false where care_recipient_id=${sqlLiteral(f.patient)} and subject_user=${sqlLiteral(f.initiator.id)} and capability='ent.create';`,
  );
  assert.deepEqual(
    await rpc(f.initiator.client, "create_transfer_declaration", args),
    response.data,
  );
  assert.equal(
    (
      await f.initiator.client.rpc("create_transfer_declaration", {
        ...args,
        p_key: randomUUID(),
      })
    ).error?.code,
    "42501",
  );
  sql(
    `update public.capability_overrides set enabled=true where care_recipient_id=${sqlLiteral(f.patient)} and subject_user=${sqlLiteral(f.initiator.id)} and capability='ent.create';`,
  );
  const d = response.data,
    agreementKey = randomUUID(),
    body = {
      reason: "Decisão própria que poderá ser recuperada sem duplicação",
    };
  const agreed = await transferCommand(
    f.counterparty.client,
    d.id,
    "agree",
    d.version,
    body,
    agreementKey,
  );
  assert.ifError(agreed.error);
  sql(
    `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${sqlLiteral(f.patient)},${sqlLiteral(f.counterparty.id)},'ent.receive',false);`,
  );
  assert.deepEqual(
    (
      await transferCommand(
        f.counterparty.client,
        d.id,
        "agree",
        d.version,
        body,
        agreementKey,
      )
    ).data,
    agreed.data,
  );
  sql(
    `update public.capability_overrides set enabled=true where care_recipient_id=${sqlLiteral(f.patient)} and subject_user=${sqlLiteral(f.counterparty.id)} and capability='ent.receive';`,
  );
  const dispatchKey = randomUUID(),
    dispatched = await transferCommand(
      f.initiator.client,
      d.id,
      "dispatch",
      agreed.data.version,
      {},
      dispatchKey,
    );
  assert.ifError(dispatched.error);
  const before = transferState(f);
  sql(
    `update public.capability_overrides set enabled=false where care_recipient_id=${sqlLiteral(f.patient)} and subject_user=${sqlLiteral(f.initiator.id)} and capability='ent.create';`,
  );
  assert.deepEqual(
    (
      await transferCommand(
        f.initiator.client,
        d.id,
        "dispatch",
        agreed.data.version,
        {},
        dispatchKey,
      )
    ).data,
    dispatched.data,
  );
  assert.equal(transferState(f), before);
  sql(
    `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${sqlLiteral(f.patient)},${sqlLiteral(f.initiator.id)},'ent.read',false);`,
  );
  assert.equal(
    (
      await transferCommand(
        f.initiator.client,
        d.id,
        "dispatch",
        agreed.data.version,
        {},
        dispatchKey,
      )
    ).error?.code,
    "42501",
  );
});

test("inactive material with positive custody can be physically transferred without reactivation or artificial zeroing", async () => {
  const f = await transferFixture();
  sql(
    `update public.care_recipient_products set is_active=false where care_recipient_id=${sqlLiteral(f.patient)} and product_id=${sqlLiteral(f.products[0])};`,
  );
  const prep = await rpc(f.initiator.client, "transfer_preparation", {
    p_patient: f.patient,
    p_source: "CARE_TEAM",
  });
  assert.equal(prep.products.find((p) => p.id === f.products[0]).active, false);
  const { response } = await declareTransfer(f);
  assert.ifError(response.error);
  const agreed = await transferCommand(
    f.counterparty.client,
    response.data.id,
    "agree",
    response.data.version,
    { reason: "Concordo com a destinação física do saldo inativo" },
  );
  assert.ifError(agreed.error);
  const dispatched = await transferCommand(
    f.initiator.client,
    response.data.id,
    "dispatch",
    agreed.data.version,
  );
  assert.ifError(dispatched.error);
  const received = await rpc(f.recipient.client, "supply_document_command", {
    p_id: response.data.id,
    p_action: "receive",
    p_body: { divergences: [] },
    p_key: randomUUID(),
    p_version: dispatched.data.version,
  });
  assert.equal(received.status, "confirmed");
  assert.equal(
    sql(
      `select is_active from public.care_recipient_products where care_recipient_id=${sqlLiteral(f.patient)} and product_id=${sqlLiteral(f.products[0])};`,
    ),
    "f",
  );
  assert.equal(
    Number(
      sql(
        `select private.stock_quantity(${sqlLiteral(f.patient)},${sqlLiteral(f.products[0])},'CARE_TEAM');`,
      ),
    ),
    5,
  );
  assert.equal(
    Number(
      sql(
        `select private.stock_quantity(${sqlLiteral(f.patient)},${sqlLiteral(f.products[0])},'FAMILY');`,
      ),
    ),
    25,
  );
});

test("a declaration waiting for the patient stock lock cannot commit after issuer authority is revoked", async () => {
  const f = await transferFixture(),
    prep = await rpc(f.initiator.client, "transfer_preparation", {
      p_patient: f.patient,
      p_source: "CARE_TEAM",
    });
  const args = {
    p_patient: f.patient,
    p_key: randomUUID(),
    p_body: {
      source: "CARE_TEAM",
      counterpartyId: f.counterparty.id,
      recipientId: f.recipient.id,
      originDocumentId: f.origin.id,
      referenceHash: prep.referenceHash,
      reason: "Declaração fictícia sujeita à revogação durante espera",
      lines: [{ productId: f.products[0], quantity: "5" }],
    },
  };
  const before = transferState(f);
  const result = await whileAdvisoryWaits(
    "stock:" + f.patient,
    () => f.initiator.client.rpc("create_transfer_declaration", args),
    async () => {
      sql(
        `update public.capability_overrides set enabled=false where care_recipient_id=${sqlLiteral(f.patient)} and subject_user=${sqlLiteral(f.initiator.id)} and capability='ent.create';`,
      );
    },
  );
  assert.equal(result.error?.code, "42501");
  assert.equal(transferState(f), before);
});

test("reverse transfer cancellation references confirmed family consumption and returns only the real remainder once", async () => {
  const f = await transferFixture(),
    { response } = await declareTransfer(f);
  assert.ifError(response.error);
  const agreed = await transferCommand(
    f.counterparty.client,
    response.data.id,
    "agree",
    response.data.version,
    { reason: "Concordância própria antes da devolução física" },
  );
  assert.ifError(agreed.error);
  const sent = await transferCommand(
    f.initiator.client,
    response.data.id,
    "dispatch",
    agreed.data.version,
  );
  assert.ifError(sent.error);
  let d = await rpc(f.recipient.client, "supply_document_command", {
    p_id: sent.data.id,
    p_action: "receive",
    p_body: { divergences: [] },
    p_key: randomUUID(),
    p_version: sent.data.version,
  });
  const report = await rpc(
    f.recipient.client,
    "report_extraordinary_consumption",
    {
      p_patient: f.patient,
      p_kind: "consumption",
      p_location: "FAMILY",
      p_text: "Consumo familiar real confirmado após receber a transferência",
      p_lines: [{ productId: f.products[0], quantity: "2" }],
      p_key: randomUUID(),
    },
  );
  await rpc(f.admin, "decide_consumption_report", {
    p_id: report,
    p_accept: true,
    p_reason: null,
    p_key: randomUUID(),
    p_version: 1,
  });
  d = await rpc(f.admin, "supply_document_command", {
    p_id: d.id,
    p_action: "cancel",
    p_body: {
      reason: "Pedido de cancelamento após consumo familiar confirmado",
    },
    p_key: randomUUID(),
    p_version: d.version,
  });
  const args = {
    p_id: d.id,
    p_action: "consent_cancel",
    p_body: {
      requestId: d.deliveryCancellation.request.id,
      reason:
        "Concordo com o retorno físico de três, preservando o consumo de dois",
      referenceHash: d.deliveryCancellation.referenceHash,
      lines: [{ lineId: d.lines[0].id, returnQuantity: "3" }],
    },
    p_key: randomUUID(),
    p_version: d.version,
  };
  assert.equal(
    (await f.counterparty.client.rpc("supply_document_command", args)).error
      ?.code,
    "42501",
  );
  const cancelled = await rpc(
    f.recipient.client,
    "supply_document_command",
    args,
  );
  assert.equal(cancelled.status, "cancelled");
  const before = transferState(f);
  await rpc(f.recipient.client, "supply_document_command", args);
  assert.equal(transferState(f), before);
  assert.equal(
    sql(
      `select count(*) from public.stock_movements where reference_type='consumption' and reference_id=${sqlLiteral(report)};`,
    ),
    "1",
  );
  assert.equal(
    Number(
      sql(
        `select private.stock_quantity(${sqlLiteral(f.patient)},${sqlLiteral(f.products[0])},'CARE_TEAM');`,
      ),
    ),
    8,
  );
  assert.equal(
    Number(
      sql(
        `select private.stock_quantity(${sqlLiteral(f.patient)},${sqlLiteral(f.products[0])},'FAMILY');`,
      ),
    ),
    20,
  );
});

test("declining a proposal leaves no protocol or stock effect and another patient's identity cannot read or decide it", async () => {
  const f = await transferFixture(),
    { response } = await declareTransfer(f);
  assert.ifError(response.error);
  const d = response.data,
    before = JSON.parse(transferState(f)).ledger;
  const declined = await transferCommand(
    f.counterparty.client,
    d.id,
    "decline",
    d.version,
    { reason: "Não concordo com o deslocamento físico proposto" },
  );
  assert.ifError(declined.error);
  assert.equal(declined.data.transfer.state, "declined");
  assert.equal(declined.data.code, null);
  assert.equal(declined.data.protocol, null);
  assert.deepEqual(JSON.parse(transferState(f)).ledger, before);
  assert.equal(
    (
      await transferCommand(
        f.initiator.client,
        d.id,
        "dispatch",
        declined.data.version,
      )
    ).error?.code,
    "PT409",
  );
  assert.equal(
    (
      await f.initiator.client.rpc("transfer_preparation", {
        p_patient: f.patient,
        p_source: "FAMILY",
      })
    ).error?.code,
    "42501",
  );
  assert.equal(
    (
      await f.initiator.client.rpc("transfer_preparation", {
        p_patient: "20000000-0000-4000-8000-000000000002",
        p_source: "CARE_TEAM",
      })
    ).error?.code,
    "42501",
  );
});

test("an unavailable counterparty cannot agree and an administrator may close only the unperformed declaration with her own authorship", async () => {
  const f = await transferFixture(),
    { response } = await declareTransfer(f);
  assert.ifError(response.error);
  const d = response.data,
    before = JSON.parse(transferState(f)).ledger;
  sql(
    `update public.care_recipient_memberships set status='revoked' where care_recipient_id=${sqlLiteral(f.patient)} and user_id=${sqlLiteral(f.counterparty.id)};`,
  );
  assert.equal(
    (
      await transferCommand(f.counterparty.client, d.id, "agree", d.version, {
        reason: "Tentativa após perder vínculo",
      })
    ).error?.code,
    "42501",
  );
  const current = await rpc(f.admin, "operational_document", { p_id: d.id });
  assert.equal(current.transfer.canWithdraw, true);
  const key = randomUUID(),
    body = {
      reason:
        "Encerramento administrativo sem executar o ato da contraparte desligada",
    };
  const closed = await transferCommand(
    f.admin,
    d.id,
    "withdraw",
    d.version,
    body,
    key,
  );
  assert.ifError(closed.error);
  assert.equal(closed.data.created_by, f.initiator.id);
  assert.equal(closed.data.transfer.withdrawal.kind, "administrative_close");
  assert.notEqual(closed.data.transfer.withdrawal.actor.id, f.initiator.id);
  assert.equal(closed.data.transfer.agreement, null);
  assert.equal(closed.data.workflow_data.acceptedBy, undefined);
  assert.deepEqual(
    (await transferCommand(f.admin, d.id, "withdraw", d.version, body, key))
      .data,
    closed.data,
  );
  assert.equal(
    (
      await transferCommand(
        f.admin,
        d.id,
        "withdraw",
        d.version,
        { reason: "Outra intenção com a mesma chave" },
        key,
      )
    ).error?.code,
    "23505",
  );
  assert.deepEqual(JSON.parse(transferState(f)).ledger, before);
  const hidden = await f.counterparty.client
    .from("ent_transfers")
    .select("document_id")
    .eq("document_id", d.id);
  assert.ifError(hidden.error);
  assert.deepEqual(hidden.data, []);
  assert.equal(
    sql(
      "select has_function_privilege('authenticated','public.fluent_pre_transfer_command(uuid,text,jsonb,uuid,integer)','EXECUTE');",
    ),
    "f",
  );
  assert.equal(
    sql(
      "select has_table_privilege('authenticated','private.transfer_commands','SELECT');",
    ),
    "f",
  );
});

test("dispatch rolls back its native movement when the agreed counterparty loses authority during the later actor FK wait", async () => {
  const f = await transferFixture(),
    { response } = await declareTransfer(f);
  assert.ifError(response.error);
  const agreed = await transferCommand(
    f.counterparty.client,
    response.data.id,
    "agree",
    response.data.version,
    { reason: "Concordância válida anterior à espera da expedição" },
  );
  assert.ifError(agreed.error);
  sql(
    `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${sqlLiteral(f.patient)},${sqlLiteral(f.counterparty.id)},'ent.receive',true);`,
  );
  const before = transferState(f);
  const rejected = await whileRowWaits(
    "profiles",
    f.initiator.id,
    "transfer_command",
    () =>
      transferCommand(
        f.initiator.client,
        response.data.id,
        "dispatch",
        agreed.data.version,
      ),
    async () => {
      sql(
        `update public.capability_overrides set enabled=false where care_recipient_id=${sqlLiteral(f.patient)} and subject_user=${sqlLiteral(f.counterparty.id)} and capability='ent.receive';`,
      );
    },
  );
  assert.equal(rejected.error?.code, "42501");
  assert.equal(transferState(f), before);
  assert.equal(
    sql(
      `select state from public.ent_transfers where document_id=${sqlLiteral(response.data.id)};`,
    ),
    "agreed",
  );
});

for (const stage of ["declaration", "agreement", "dispatch"])
  test(`a late profile FK wait rolls back ${stage} when the relevant authority is lost`, async () => {
    const f = await transferFixture();
    const subject = stage === "agreement" ? f.counterparty : f.initiator,
      capability = stage === "agreement" ? "ent.receive" : "ent.create";
    if (stage === "agreement")
      sql(
        `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${sqlLiteral(f.patient)},${sqlLiteral(subject.id)},'ent.receive',true);`,
      );
    let d;
    if (stage !== "declaration") {
      const created = await declareTransfer(f);
      assert.ifError(created.response.error);
      d = created.response.data;
    }
    if (stage === "dispatch") {
      const agreed = await transferCommand(
        f.counterparty.client,
        d.id,
        "agree",
        d.version,
        { reason: "Concordância antes da expedição que aguardará FK" },
      );
      assert.ifError(agreed.error);
      d = agreed.data;
    }
    let args;
    if (stage === "declaration") {
      const prep = await rpc(f.initiator.client, "transfer_preparation", {
        p_patient: f.patient,
        p_source: "CARE_TEAM",
      });
      args = {
        p_patient: f.patient,
        p_key: randomUUID(),
        p_body: {
          source: "CARE_TEAM",
          counterpartyId: f.counterparty.id,
          recipientId: f.recipient.id,
          referenceHash: prep.referenceHash,
          reason: "Declaração aguardando FK real de autoria",
          lines: [{ productId: f.products[0], quantity: "5" }],
        },
      };
    }
    const before = transferState(f),
      requestName =
        stage === "declaration"
          ? "create_transfer_declaration"
          : "transfer_command";
    const result = await whileRowWaits(
      "profiles",
      subject.id,
      requestName,
      () =>
        stage === "declaration"
          ? f.initiator.client.rpc(requestName, args)
          : transferCommand(
              subject.client,
              d.id,
              stage === "agreement" ? "agree" : "dispatch",
              d.version,
              stage === "agreement"
                ? { reason: "Decisão com autoria própria durante espera real" }
                : {},
            ),
      async () => {
        sql(
          `update public.capability_overrides set enabled=false where care_recipient_id=${sqlLiteral(f.patient)} and subject_user=${sqlLiteral(subject.id)} and capability=${sqlLiteral(capability)};`,
        );
      },
    );
    assert.equal(result.error?.code, "42501");
    assert.equal(transferState(f), before);
    if (d)
      assert.equal(
        sql(
          `select state from public.ent_transfers where document_id=${sqlLiteral(d.id)};`,
        ),
        stage === "dispatch" ? "agreed" : "pending",
      );
  });
