import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { setup, actor, rpc, fixtures } from "./v4-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
import { whileAdvisoryWaits, whileRowWaits } from "./lock-barrier.mjs";
import { currentDeliveryShift as currentShift } from "./delivery-preparation-fixtures.mjs";

const payload = (f, overrides = {}) => ({
  source: "FAMILY",
  destination: "CARE_TEAM",
  recipientId: fixtures.professional.id,
  lines: [{ productId: f.products[0], quantity: "2" }],
  ...overrides,
});
const create = (f, body, draft = false, key = randomUUID()) =>
  f.admin.rpc("create_supply_document", {
    p_patient: f.patient,
    p_type: "ENT",
    p_payload: body,
    p_draft: draft,
    p_key: key,
  });
const stock = (f) =>
  sql(
    `select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${sqlLiteral(f.patient)};`,
  );

test("P06 manual recipient without a schedule requires an explicit reason before dispatch", async () => {
  const f = await setup(),
    before = stock(f);
  const result = await create(f, payload(f));
  assert.equal(result.error?.code, "22023");
  assert.match(result.error.message, /recipient selection reason required/);
  assert.equal(stock(f), before);
  for (const recipientReason of [null, "x", "x".repeat(1001)]) {
    const invalid = await create(f, payload(f, { recipientReason }));
    assert.equal(invalid.error?.code, "22023");
    assert.match(invalid.error.message, /invalid recipient selection reason/);
    assert.equal(stock(f), before);
  }
});

test("P06 reassignment preserves the issued choice and requires current dispatch authority", async () => {
  const f = await setup(),
    issued = await create(
      f,
      payload(f, { recipientReason: "Recebedor manual antes da expedição" }),
    );
  assert.ifError(issued.error);
  const body = {
      recipientId: fixtures.global.id,
      reason: "Pessoa vinculada receberá em lugar da indicação inicial",
    },
    command = {
      p_id: issued.data.id,
      p_action: "reassign",
      p_body: body,
      p_key: randomUUID(),
      p_version: issued.data.version,
    },
    before = stock(f);
  const changed = await rpc(f.admin, "supply_document_command", command);
  assert.equal(changed.recipient_id, fixtures.global.id);
  assert.equal(changed.payload.recipientId, fixtures.professional.id);
  assert.equal(
    changed.workflow_data.recipientSelection.previousRecipientId,
    fixtures.professional.id,
  );
  assert.equal(
    changed.workflow_data.recipientSelectionHistory[0].recipientId,
    fixtures.professional.id,
  );
  assert.equal(changed.workflow_data.acceptedBy, undefined);
  assert.equal(stock(f), before);
  sql(
    `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${sqlLiteral(f.patient)},${sqlLiteral(fixtures.adminA.id)},'ent.create',false);`,
  );
  const refused = await f.admin.rpc("supply_document_command", {
    ...command,
    p_key: randomUUID(),
    p_version: changed.version,
    p_body: { ...body, recipientId: fixtures.professional.id },
  });
  assert.equal(refused.error?.code, "42501");
  assert.equal(stock(f), before);
  const result = await rpc(f.admin, "operational_document", {
    p_id: changed.id,
  });
  assert.equal(result.recipient_id, fixtures.global.id);
  assert.equal(result.version, changed.version);
});

const prepare = (f) =>
  rpc(f.admin, "delivery_preparation", {
    p_patient: f.patient,
    p_source: "FAMILY",
  });
test("P06 suggests the single current eligible worker and captures the actual chooser without fabricating a receipt", async () => {
  const f = await setup(),
    shift = currentShift(f);
  try {
    const context = await prepare(f);
    assert.equal(context.suggestedId, fixtures.professional.id);
    assert.equal(context.state, "suggested");
    const body = payload(f, { recipientReference: context.referenceHash }),
      key = randomUUID(),
      result = await create(f, body, false, key);
    assert.ifError(result.error);
    const selection = result.data.workflow_data.recipientSelection;
    assert.equal(selection.recipientId, fixtures.professional.id);
    assert.equal(selection.selectedBy, fixtures.adminA.id);
    assert.equal(selection.manual, false);
    assert.equal(selection.official, true);
    assert.equal(selection.shifts[0].id, shift.id);
    assert.equal(result.data.workflow_data.acceptedBy, undefined);
    const before = stock(f);
    const recovered = await create(f, body, false, key);
    assert.ifError(recovered.error);
    assert.equal(recovered.data.id, result.data.id);
    assert.equal(stock(f), before);
    assert.equal(
      sql(
        `select body->'workflow'->'recipientSelection'->>'selectedBy' from public.document_events where document_id=${sqlLiteral(result.data.id)} order by version desc limit 1;`,
      ),
      fixtures.adminA.id,
    );
  } finally {
    shift.close();
  }
});
test("P06 manual exception preserves reason, chosen identity and the schedule suggestion as separate facts", async () => {
  const f = await setup(),
    shift = currentShift(f);
  try {
    const body = payload(f, { recipientId: fixtures.global.id });
    assert.equal((await create(f, body)).error?.code, "22023");
    body.recipientReason =
      "Responsável vinculado receberá o material neste horário";
    const result = await create(f, body);
    assert.ifError(result.error);
    assert.equal(
      result.data.workflow_data.recipientSelection.suggestedId,
      fixtures.professional.id,
    );
    assert.equal(
      result.data.workflow_data.recipientSelection.recipientId,
      fixtures.global.id,
    );
    assert.equal(
      result.data.workflow_data.recipientSelection.reason,
      body.recipientReason,
    );
    assert.equal(result.data.workflow_data.recipientSelection.manual, true);
  } finally {
    shift.close();
  }
});
test("P06 ambiguous schedules have no invented suggestion and wrong custody role cannot be made eligible by a receive flag", async () => {
  const f = await setup(),
    first = currentShift(f),
    second = currentShift(f, fixtures.global.id);
  try {
    const context = await prepare(f);
    assert.equal(context.suggestedId, null);
    assert.equal(context.state, "ambiguous");
    assert.equal((await create(f, payload(f))).error?.code, "22023");
    sql(
      `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${sqlLiteral(f.patient)},${sqlLiteral(fixtures.reader.id)},'ent.receive',true);`,
    );
    const other = await create(
      f,
      payload(f, {
        recipientId: fixtures.reader.id,
        recipientReason: "Tentativa fictícia de papel incorreto",
      }),
    );
    assert.equal(other.error?.code, "42501");
    assert.ok(
      !(await prepare(f)).people.some(
        (person) => person.id === fixtures.reader.id,
      ),
    );
  } finally {
    first.close();
    second.close();
  }
});
test("P06 changed schedule conflicts with the reviewed hash without changing stock or document history", async () => {
  const f = await setup(),
    shift = currentShift(f);
  try {
    const context = await prepare(f);
    shift.close();
    const before = stock(f),
      result = await create(
        f,
        payload(f, { recipientReference: context.referenceHash }),
      );
    assert.equal(result.error?.code, "P0001");
    assert.match(result.error.message, /stale delivery recipient reference/);
    assert.equal(stock(f), before);
    const latest = await prepare(f);
    assert.equal(latest.suggestedId, null);
    assert.ifError(
      (
        await create(
          f,
          payload(f, {
            recipientReason: "Escolha manual após consultar a escala atual",
            recipientReference: latest.referenceHash,
          }),
        )
      ).error,
    );
  } finally {
    shift.close();
  }
});
test("P06 draft recipient changes require their own reason and dispatch revalidates preparation", async () => {
  const f = await setup(),
    draft = await create(f, payload(f), true);
  assert.ifError(draft.error);
  const before = stock(f);
  assert.equal(draft.data.status, "draft");
  assert.equal(
    (
      await f.admin.rpc("supply_document_command", {
        p_id: draft.data.id,
        p_action: "submit",
        p_body: {},
        p_key: randomUUID(),
        p_version: draft.data.version,
      })
    ).error?.code,
    "22023",
  );
  assert.equal(stock(f), before);
  const body = payload(f, { recipientId: fixtures.global.id }),
    change = {
      p_id: draft.data.id,
      p_payload: body,
      p_key: randomUUID(),
      p_version: draft.data.version,
      p_recount: false,
    };
  assert.equal(
    (await f.admin.rpc("revise_supply_document", change)).error?.code,
    "22023",
  );
  change.p_payload = {
    ...body,
    recipientReason: "Responsável substitui destinatário durante a preparação",
  };
  const revised = await rpc(f.admin, "revise_supply_document", change);
  assert.equal(
    revised.workflow_data.recipientSelection.previousRecipientId,
    fixtures.professional.id,
  );
  assert.equal(
    revised.workflow_data.recipientSelectionHistory[0].recipientId,
    fixtures.professional.id,
  );
  const issued = await rpc(f.admin, "supply_document_command", {
    p_id: revised.id,
    p_action: "submit",
    p_body: {},
    p_key: randomUUID(),
    p_version: revised.version,
  });
  assert.equal(issued.status, "pending_receipt");
  assert.equal(issued.workflow_data.recipientSelection.official, true);
  assert.equal(issued.workflow_data.acceptedBy, undefined);
});
test("P06 source access and no-eligible contingency reveal no foreign patient or substitute personal signature", async () => {
  const f = await setup(),
    reader = await actor("reader", f.patient);
  assert.equal(
    (
      await reader.rpc("delivery_preparation", {
        p_patient: f.patient,
        p_source: "FAMILY",
      })
    ).error?.code,
    "42501",
  );
  for (const name of ["professional", "global"])
    sql(
      `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${sqlLiteral(f.patient)},${sqlLiteral(fixtures[name].id)},'ent.receive',false);`,
    );
  const context = await prepare(f);
  assert.equal(context.state, "no_eligible_recipient");
  assert.deepEqual(context.people, []);
  assert.equal(context.suggestedId, null);
  const before = stock(f),
    result = await create(
      f,
      payload(f, {
        recipientReason: "Não pode fabricar recebedor indisponível",
      }),
    );
  assert.equal(result.error?.code, "42501");
  assert.equal(stock(f), before);
});
test("P06 issuance rejects receiver revocation after an observed patient lock wait", async () => {
  const f = await setup(),
    before = stock(f);
  const result = await whileAdvisoryWaits(
    "stock:" + f.patient,
    () =>
      create(
        f,
        payload(f, {
          recipientReason: "Recebedor manual para ensaio de revogação",
        }),
      ),
    async () => {
      sql(
        `update public.care_recipient_memberships set status='revoked' where care_recipient_id=${sqlLiteral(f.patient)} and user_id=${sqlLiteral(fixtures.professional.id)};`,
      );
    },
  );
  assert.equal(result.error?.code, "42501");
  assert.equal(stock(f), before);
});
test("P06 late product FK wait rejects receiver revocation after selection was captured", async () => {
  const f = await setup(),
    before = stock(f);
  const result = await whileRowWaits(
    "products",
    f.products[0],
    "create_supply_document",
    () =>
      create(
        f,
        payload(f, {
          recipientReason: "Recebedor manual para ensaio de espera tardia",
        }),
      ),
    async () => {
      sql(
        `update public.care_recipient_memberships set status='revoked' where care_recipient_id=${sqlLiteral(f.patient)} and user_id=${sqlLiteral(fixtures.professional.id)};`,
      );
    },
  );
  assert.ok(
    ["42501", "P0001"].includes(result.error?.code),
    JSON.stringify(result.error),
  );
  assert.match(
    result.error.message,
    /stale delivery recipient reference|invalid designated recipient/,
  );
  assert.equal(stock(f), before);
  assert.equal(
    sql(
      `select count(*) from public.operational_documents where care_recipient_id=${sqlLiteral(f.patient)};`,
    ),
    "0",
  );
});
