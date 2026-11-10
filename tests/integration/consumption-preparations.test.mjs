import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { rpc, actor, fixtures } from "./v4-fixtures.mjs";
import {
  personalReminderFixture,
  reminderState,
} from "./notice-reference-fixtures.mjs";
import { whileAdvisoryWaits, whileRowWaits } from "./lock-barrier.mjs";
import {
  consumptionPreparationFixture as fixture,
  saveConsumptionPreparation as save,
  consumptionPreparationPacket as packet,
} from "./consumption-preparation-fixtures.mjs";
const facts = (f) =>
  JSON.parse(
    sql(
      `select jsonb_build_object('reports',(select coalesce(jsonb_agg(to_jsonb(r) order by r.id),'[]'::jsonb) from public.consumption_reports r where r.care_recipient_id=${q(f.patient)}),'revisions',(select coalesce(jsonb_agg(to_jsonb(v) order by v.id),'[]'::jsonb) from public.consumption_report_revisions v join public.consumption_reports r on r.id=v.report_id where r.care_recipient_id=${q(f.patient)}),'decisions',(select coalesce(jsonb_agg(to_jsonb(v) order by v.id),'[]'::jsonb) from public.consumption_report_decisions v join public.consumption_reports r on r.id=v.report_id where r.care_recipient_id=${q(f.patient)}),'ledger',(select coalesce(jsonb_agg(to_jsonb(m) order by m.id),'[]'::jsonb) from public.stock_movements m where m.care_recipient_id=${q(f.patient)}))::text;`,
    ),
  );
for (const purpose of [
  "consumption_report_family",
  "consumption_report_team",
  "consumption_supplement",
  "consumption_accept",
  "consumption_reject",
]) {
  test(`private consumption ${purpose}:save changes no fact;atomic native act and exact own replay`, async () => {
    const f = await fixture(purpose),
      before = facts(f),
      saved = await save(f);
    assert.equal(saved.state, "active");
    assert.deepEqual(facts(f), before);
    const read = await rpc(f.admin, "consumption_preparation_context", f.scope);
    assert.equal(read.kind, "CONSUMPTION");
    assert.equal(read.targetDocumentId, null);
    assert.deepEqual(read.content, f.content);
    const original = packet(f, saved),
      result = await rpc(f.admin, "commit_consumption_preparation", original);
    assert.equal(result.state, "consumed");
    assert.equal(result.revision, 2);
    assert.equal(result.consumedResult.actorId, fixtures.adminA.id);
    assert.deepEqual(result.consumedResult.command, original.p_body.command);
    const after = facts(f),
      replay = await rpc(f.admin, "commit_consumption_preparation", original);
    assert.equal(replay.replayed, true);
    assert.deepEqual(replay.consumedResult, result.consumedResult);
    assert.deepEqual(facts(f), after);
    assert.equal(
      after.ledger.length - before.ledger.length,
      purpose === "consumption_accept" ? 1 : 0,
    );
    if (purpose === "consumption_accept")
      assert.equal(after.decisions[0].accepted, true);
    if (purpose === "consumption_reject")
      assert.equal(after.decisions[0].accepted, false);
    if (purpose.startsWith("consumption_report_"))
      assert.equal(after.reports.length - before.reports.length, 1);
    if (purpose === "consumption_supplement")
      assert.equal(after.revisions.length - before.revisions.length, 1);
    const own = await rpc(f.admin, "consumption_preparation_context", f.scope);
    assert.deepEqual(own.consumedResult, result.consumedResult);
  });
}
test("private consumption custody read,owner and patient isolation;CAS and partial save remain independent", async () => {
  const f = await fixture(),
    before = facts(f),
    partial = {
      ...f.content,
      consumption: {
        ...f.content.consumption,
        kind: "",
        text: "",
        lines: [{ ...f.content.consumption.lines[0], quantity: "" }],
      },
      reference: null,
      referenceHash: null,
    },
    saved = await save(f, partial);
  const other = await actor("global", f.patient);
  assert.equal(
    await rpc(other, "consumption_preparation_context", f.scope),
    null,
  );
  const bad = await other.rpc("consumption_preparation_command", {
    ...f.scope,
    p_id: saved.id,
    p_expected: 1,
    p_body: { action: "discard" },
    p_key: randomUUID(),
  });
  assert.equal(bad.error?.code, "42501");
  const commands = await Promise.all(
    ["Primeiro preenchimento", "Segundo preenchimento"].map((text) =>
      f.admin.rpc("consumption_preparation_command", {
        ...f.scope,
        p_id: saved.id,
        p_expected: 1,
        p_body: {
          action: "save",
          content: {
            ...partial,
            consumption: { ...partial.consumption, text },
          },
          navigation: { version: 1, stage: "consumption_preparation" },
        },
        p_key: randomUUID(),
      }),
    ),
  );
  assert.equal(commands.filter((c) => !c.error).length, 1);
  assert.equal(commands.filter((c) => c.error?.code === "PT409").length, 1);
  assert.deepEqual(facts(f), before);
  sql(
    `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${q(f.patient)},${q(fixtures.adminA.id)},'stock.family.read',false);`,
  );
  assert.equal(
    (await f.admin.rpc("consumption_preparation_context", f.scope)).error?.code,
    "42501",
  );
});
test("private consumption a native key or already-decided native replay cannot consume a new preparation", async () => {
  const f = await fixture(),
    saved = await save(f),
    original = packet(f, saved),
    c = original.p_body.command;
  await rpc(f.admin, "report_extraordinary_consumption", {
    p_patient: f.patient,
    p_kind: c.kind,
    p_location: c.location,
    p_text: c.text,
    p_lines: c.lines,
    p_key: original.p_key,
  });
  const before = facts(f);
  assert.equal(
    (await f.admin.rpc("commit_consumption_preparation", original)).error?.code,
    "23505",
  );
  assert.deepEqual(facts(f), before);
  assert.equal(
    (await rpc(f.admin, "consumption_preparation_context", f.scope)).state,
    "active",
  );
  const decision = await fixture("consumption_accept");
  await rpc(decision.admin, "decide_consumption_report", {
    p_id: decision.scope.p_target,
    p_accept: true,
    p_reason: null,
    p_key: randomUUID(),
    p_version: 1,
  });
  const ref = await rpc(decision.admin, "consumption_preparation_reference", {
    ...decision.scope,
    p_fields: decision.content.consumption,
  });
  decision.content.reference = ref.reference;
  decision.content.referenceHash = ref.referenceHash;
  const d = await save(decision),
    beforeDecision = facts(decision);
  assert.equal(
    (
      await decision.admin.rpc(
        "commit_consumption_preparation",
        packet(decision, d),
      )
    ).error?.code,
    "PT409",
  );
  assert.deepEqual(facts(decision), beforeDecision);
});
test("private consumption stale reference,misleading names,precision and mismatched command roll back", async () => {
  const f = await fixture("consumption_supplement"),
    saved = await save(f),
    original = packet(f, saved),
    before = facts(f);
  const altered = JSON.parse(JSON.stringify(original));
  altered.p_body.command.text = "Outro texto";
  assert.equal(
    (await f.admin.rpc("commit_consumption_preparation", altered)).error?.code,
    "PT409",
  );
  assert.deepEqual(facts(f), before);
  await rpc(f.admin, "supplement_consumption_report", {
    p_id: f.scope.p_target,
    p_text: "Complemento concorrente independente",
    p_lines: [{ productId: f.products[0], quantity: "2" }],
    p_key: randomUUID(),
    p_version: 1,
  });
  const changed = facts(f);
  assert.equal(
    (await f.admin.rpc("commit_consumption_preparation", original)).error?.code,
    "PT409",
  );
  assert.deepEqual(facts(f), changed);
  const next = await rpc(f.admin, "consumption_preparation_reference", {
    ...f.scope,
    p_fields: f.content.consumption,
  });
  f.content.reference = next.reference;
  f.content.referenceHash = next.referenceHash;
  const adopted = await save(f, f.content, saved);
  assert.equal(
    (await rpc(f.admin, "commit_consumption_preparation", packet(f, adopted)))
      .state,
    "consumed",
  );
  const bad = await fixture();
  bad.content.consumption.lines[0].name = "Nome adulterado";
  const b = await save(bad),
    badBefore = facts(bad);
  assert.equal(
    (await bad.admin.rpc("commit_consumption_preparation", packet(bad, b)))
      .error?.code,
    "22023",
  );
  assert.deepEqual(facts(bad), badBefore);
  bad.content.consumption.lines[0].name = bad.content.reference.catalog[0].name;
  bad.content.consumption.lines[0].quantity = "0,5";
  const precise = await save(bad, bad.content, b);
  assert.equal(
    (
      await bad.admin.rpc(
        "commit_consumption_preparation",
        packet(bad, precise),
      )
    ).error?.code,
    "22023",
  );
  assert.deepEqual(facts(bad), badBefore);
});
test("private consumption own replay/ack survive write loss and inactive patient;new save remains denied", async () => {
  const f = await fixture("consumption_accept"),
    saved = await save(f),
    original = packet(f, saved),
    result = await rpc(f.admin, "commit_consumption_preparation", original);
  const family = await actor("family", f.patient);
  sql(
    `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${q(f.patient)},${q(fixtures.adminA.id)},'stock.family.manage',false);update public.care_recipients set is_active=false where id=${q(f.patient)};`,
  );
  assert.equal(
    (await rpc(f.admin, "commit_consumption_preparation", original)).replayed,
    true,
  );
  assert.deepEqual(
    (await rpc(f.admin, "consumption_preparation_context", f.scope))
      .consumedResult,
    result.consumedResult,
  );
  assert.equal(
    (await family.rpc("consumption_report", { p_id: f.scope.p_target })).error
      ?.code,
    "42501",
  );
  for (const reader of [f.admin, family])
    assert.equal(
      (
        await reader.rpc("consumption_preparation_reference", {
          ...f.scope,
          p_fields: f.content.consumption,
        })
      ).error?.code,
      "42501",
    );
  assert.equal(
    await rpc(family, "consumption_preparation_context", f.scope),
    null,
  );
  const ack = await rpc(f.admin, "consumption_preparation_command", {
    ...f.scope,
    p_id: saved.id,
    p_expected: 2,
    p_body: { action: "acknowledge" },
    p_key: randomUUID(),
  });
  assert.equal(ack.state, "completed");
  const fresh = await f.admin.rpc("consumption_preparation_command", {
    ...f.scope,
    p_id: null,
    p_expected: null,
    p_body: {
      action: "save",
      content: f.content,
      navigation: { version: 1, stage: "consumption_preparation" },
    },
    p_key: randomUUID(),
  });
  assert.equal(fresh.error?.code, "42501");
});
test("private consumption authority revoked after private journal rolls back native fact,private result and audit", async () => {
  const f = await fixture("consumption_accept"),
    saved = await save(f),
    before = facts(f),
    probe = "consumption_preparation_probe_" + randomUUID().replaceAll("-", "");
  const original = packet(f, saved),
    auditBefore = sql(
      `select count(*) from public.audit_events where entity_id in (${q(saved.id)},${q(f.scope.p_target)});`,
    ),
    journalBefore = sql(
      `select count(*) from private.consumption_preparation_commands where preparation_id=${q(saved.id)};`,
    );
  sql(
    `create function private.${probe}() returns trigger language plpgsql set search_path='' as $$begin if new.preparation_id=${q(saved.id)} and new.result->>'state'='consumed' then insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${q(f.patient)},${q(fixtures.adminA.id)},'stock.family.manage',false);end if;return new;end;$$;create trigger ${probe} after insert on private.consumption_preparation_commands for each row execute function private.${probe}();`,
  );
  try {
    assert.equal(
      (await f.admin.rpc("commit_consumption_preparation", original)).error
        ?.code,
      "42501",
    );
    assert.deepEqual(facts(f), before);
    assert.equal(
      sql(
        `select count(*) from public.audit_events where entity_id in (${q(saved.id)},${q(f.scope.p_target)});`,
      ),
      auditBefore,
    );
    assert.equal(
      sql(
        `select count(*) from private.consumption_preparation_commands where preparation_id=${q(saved.id)};`,
      ),
      journalBefore,
    );
    assert.equal(
      (await rpc(f.admin, "consumption_preparation_context", f.scope)).state,
      "active",
    );
  } finally {
    sql(
      `drop trigger if exists ${probe} on private.consumption_preparation_commands;drop function if exists private.${probe}();`,
    );
  }
});
test("private consumption waiting slot revalidates authority without altering another preparation", async () => {
  const f = await fixture(),
    before = facts(f);
  const waiting = await whileAdvisoryWaits(
    "consumption-preparation-slot:" +
      fixtures.adminA.id +
      ":" +
      f.patient +
      ":" +
      f.scope.p_purpose +
      ":" +
      f.patient,
    async () => {
      const promise = f.admin.rpc("consumption_preparation_command", {
        ...f.scope,
        p_id: null,
        p_expected: null,
        p_key: randomUUID(),
        p_body: {
          action: "save",
          content: f.content,
          navigation: { version: 1, stage: "consumption_preparation" },
        },
      });
      return promise;
    },
    () =>
      sql(
        `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${q(f.patient)},${q(fixtures.adminA.id)},'consumption.report',false);`,
      ),
  );
  assert.equal(waiting.error?.code, "42501");
  assert.deepEqual(facts(f), before);
});

test("private consumption personal reminder keeps origin,ack and report atomic with exact recovery", async () => {
  const original = await personalReminderFixture(),
    f = {
      ...original,
      admin: original.pro.client,
      scope: {
        p_patient: original.patient,
        p_purpose: "consumption_report_team",
        p_target: original.patient,
      },
    };
  const fields = {
    kind: "shortage",
    location: "CARE_TEAM",
    text: "Falta fictícia vinculada ao lembrete pessoal",
    reason: "",
    reminderId: f.reminder,
    lines: [],
  };
  const ref = await rpc(f.admin, "consumption_preparation_reference", {
    ...f.scope,
    p_fields: fields,
  });
  f.content = {
    consumption: fields,
    reference: ref.reference,
    referenceHash: ref.referenceHash,
  };
  const before = reminderState(f),
    saved = await save(f);
  assert.equal(reminderState(f), before);
  const originalPacket = packet(f, saved),
    result = await rpc(
      f.admin,
      "commit_consumption_preparation",
      originalPacket,
    );
  assert.equal(result.consumedResult.report.source_reminder_id, f.reminder);
  assert.equal(result.consumedResult.command.reminderId, f.reminder);
  const after = JSON.parse(reminderState(f));
  assert.ok(after.reminder.acknowledged_at);
  assert.equal(after.reports.length, 1);
  assert.deepEqual(after.stock, JSON.parse(before).stock);
  assert.equal(
    (await rpc(f.admin, "commit_consumption_preparation", originalPacket))
      .replayed,
    true,
  );
  assert.deepEqual(JSON.parse(reminderState(f)), after);
});

test("private consumption same-balance ledger change requires explicit adoption before one debit", async () => {
  const f = await fixture("consumption_accept"),
    saved = await save(f),
    original = packet(f, saved);
  for (const action of ["inbound", "outbound"])
    await rpc(f.admin, "family_stock_movement", {
      p_patient: f.patient,
      p_product: f.products[0],
      p_action: action,
      p_quantity: "1",
      p_reason: "Movimento fictício concorrente com mesmo saldo final",
      p_key: randomUUID(),
    });
  const before = facts(f),
    ref = await rpc(f.admin, "consumption_preparation_reference", {
      ...f.scope,
      p_fields: f.content.consumption,
    });
  assert.notEqual(ref.referenceHash, f.content.referenceHash);
  assert.equal(
    ref.reference.report.version,
    f.content.reference.report.version,
  );
  assert.equal(
    (await f.admin.rpc("commit_consumption_preparation", original)).error?.code,
    "PT409",
  );
  assert.deepEqual(facts(f), before);
  f.content.reference = ref.reference;
  f.content.referenceHash = ref.referenceHash;
  const adopted = await save(f, f.content, saved),
    result = await rpc(
      f.admin,
      "commit_consumption_preparation",
      packet(f, adopted),
    );
  assert.equal(result.state, "consumed");
  assert.equal(facts(f).ledger.length - before.ledger.length, 1);
});
test("private consumption catalogue wait rechecks write authority before any debit", async () => {
  const f = await fixture("consumption_accept"),
    saved = await save(f),
    before = facts(f),
    original = packet(f, saved);
  const result = await whileRowWaits(
    "catalogue",
    { patient: f.patient, product: f.products[0] },
    "commit_consumption_preparation",
    () => f.admin.rpc("commit_consumption_preparation", original),
    () =>
      sql(
        `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${q(f.patient)},${q(fixtures.adminA.id)},'stock.family.manage',false);`,
      ),
  );
  assert.equal(result.error?.code, "42501");
  assert.deepEqual(facts(f), before);
  assert.equal(
    (await rpc(f.admin, "consumption_preparation_context", f.scope)).state,
    "active",
  );
});

test("private consumption Unicode whitespace binds the same report,supplement and rejection intent", async () => {
  for (const purpose of [
    "consumption_report_family",
    "consumption_supplement",
    "consumption_reject",
  ]) {
    const f = await fixture(purpose);
    f.content.consumption.text =
      "\t\n\u00a0Declaração fictícia normalizada pela API\u00a0\r\n";
    f.content.consumption.reason =
      purpose === "consumption_reject"
        ? "\u3000Rejeição fictícia com motivo preservado\ufeff"
        : "";
    const saved = await save(f),
      original = packet(f, saved),
      result = await rpc(f.admin, "commit_consumption_preparation", original);
    assert.deepEqual(result.consumedResult.command, original.p_body.command);
    assert.equal(
      result.consumedResult.preparedConsumption.text,
      f.content.consumption.text,
    );
    if (purpose === "consumption_report_family")
      assert.equal(
        result.consumedResult.report.body,
        f.content.consumption.text.trim(),
      );
    if (purpose === "consumption_reject")
      assert.equal(
        result.consumedResult.report.decision.reason,
        f.content.consumption.reason.trim(),
      );
  }
});
