import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  schedulePreparationFixture as fixture,
  saveSchedulePreparation as save,
  schedulePreparationCommit as packet,
  scheduleNativeFacts as facts,
  scheduleDocumentFacts as documents,
  rpc,
  fixtures,
  actor,
  sql,
  q,
  shiftCommand,
} from "./schedule-preparation-fixtures.mjs";
const read = (f, client = f.admin) =>
  rpc(client, "schedule_preparation_context", f.scope);

test("private own-only proposal preserves the native approval boundary and rejects another professional", async () => {
  const f = await fixture("schedule_series_create"),
    pro = f.pro.client;
  sql(
    `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${q(f.patient)},${q(f.pro.id)},'schedule.manage.team',false),(${q(f.patient)},${q(f.pro.id)},'schedule.manage.own',false),(${q(f.patient)},${q(f.pro.id)},'schedule.propose',true)`,
  );
  assert.equal(await read(f, pro), null);
  const wrong = await pro.rpc("schedule_preparation_command", {
    ...f.scope,
    p_id: null,
    p_expected: null,
    p_key: randomUUID(),
    p_body: {
      action: "save",
      content: {
        schedule: { ...f.fields, professionalId: fixtures.professional.id },
      },
      navigation: { version: 1, stage: "schedule_creation" },
    },
  });
  assert.equal(wrong.error?.code, "42501");
  const saved = await save(f, null, f.content, pro),
    result = await rpc(pro, "commit_schedule_preparation", packet(f, saved));
  assert.equal(result.receipt.actorId, f.pro.id);
  assert.equal(result.receipt.nativeResult.status, "proposed");
  const actual = JSON.parse(facts(f));
  assert.equal(actual.series.length, 1);
  assert.equal(actual.series[0].status, "proposed");
  assert.equal(actual.shifts.length, 1);
  assert.equal(actual.shifts[0].status, "proposed");
  assert.equal(await read(f), null);
});

test("private new type preserves incomplete and inactive fields then creates exactly one native type with frozen result", async () => {
  const f = await fixture(),
    before = facts(f),
    docs = documents(f),
    key = randomUUID(),
    empty = { schedule: { ...f.fields, name: "", start: "", duration: "" } };
  const first = await save(f, null, empty, f.admin, key),
    again = await save(f, null, empty, f.admin, key);
  assert.equal(first.id, again.id);
  assert.equal(again.replayed, true);
  assert.equal((await read(f)).content.schedule.name, "");
  assert.equal(facts(f), before);
  const ready = await save(f, first),
    intent = packet(f, ready),
    [a, b] = await Promise.all([
      rpc(f.admin, "commit_schedule_preparation", intent),
      rpc(f.admin, "commit_schedule_preparation", intent),
    ]);
  assert.equal(a.receipt.resourceId, b.receipt.resourceId);
  assert.equal([a.replayed, b.replayed].filter(Boolean).length, 1);
  assert.equal(a.receipt.nativeResult.active, false);
  assert.equal(a.receipt.actorId, fixtures.adminA.id);
  assert.equal(
    sql(
      `select is_active from public.shift_types where id=${q(a.receipt.resourceId)}`,
    ),
    "f",
  );
  assert.equal(
    sql(
      `select count(*) from public.shift_types where care_recipient_id=${q(f.patient)}`,
    ),
    "1",
  );
  assert.equal(
    sql(
      `select after_state->>'is_active' from public.shift_events where care_recipient_id=${q(f.patient)} and action='schedule.type'`,
    ),
    "false",
  );
  assert.equal(documents(f), docs);
  assert.equal((await read(f)).consumedResourceId, a.receipt.resourceId);
  sql(
    `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${q(f.patient)},${q(fixtures.adminA.id)},'schedule.types.manage',false);update public.care_recipients set is_active=false where id=${q(f.patient)};`,
  );
  assert.equal(
    (await rpc(f.admin, "commit_schedule_preparation", intent)).receipt
      .resourceId,
    a.receipt.resourceId,
  );
  const consumed = await read(f),
    done = await save(
      f,
      consumed,
      undefined,
      f.admin,
      randomUUID(),
      "acknowledge",
    );
  assert.equal(done.state, "completed");
  assert.equal(await read(f), null);
  assert.equal(documents(f), docs);
});
for (const recurrence of ["once", "weekly", "cycle", "dates"])
  test(`private ${recurrence} schedule is separate from native facts until atomic confirmation`, async () => {
    const f = await fixture("schedule_series_create", recurrence),
      before = facts(f),
      docs = documents(f),
      saved = await save(f);
    assert.equal(facts(f), before);
    const intent = packet(f, saved),
      r = await rpc(f.admin, "commit_schedule_preparation", intent);
    assert.equal(r.receipt.nativeResult.status, "published");
    assert.equal(r.receipt.nativeResult.version, 1);
    const row = JSON.parse(
      sql(
        `select to_jsonb(s) from public.shift_series s where id=${q(r.receipt.resourceId)}`,
      ),
    );
    assert.equal(row.professional_id, f.pro.id);
    assert.equal(row.recurrence, recurrence);
    assert.equal(row.notes, f.fields.notes);
    const shifts = JSON.parse(
      sql(
        `select jsonb_agg(to_jsonb(s) order by starts_at) from public.scheduled_shifts s where series_id=${q(row.id)}`,
      ),
    );
    assert.ok(shifts.length > 0);
    if (recurrence === "dates")
      assert.deepEqual(
        shifts.map((s) => s.starts_at.slice(0, 10)),
        f.fields.dates,
      );
    assert.equal(
      (await rpc(f.admin, "commit_schedule_preparation", intent)).receipt
        .resourceId,
      row.id,
    );
    assert.equal(documents(f), docs);
  });
test("real concurrent private CAS has one winner and isolates owner,patient,purpose and mutation authority", async () => {
  const f = await fixture(),
    saved = await save(f),
    other = await actor("family", f.patient),
    before = facts(f);
  assert.equal(await read(f, other), null);
  const foreign = await fixture();
  assert.equal(
    await read(
      { ...f, scope: { ...f.scope, p_patient: foreign.patient } },
      foreign.admin,
    ),
    null,
  );
  await rpc(f.admin, "select_active_context", { p_patient: f.patient });
  const opts = {
    ...f.scope,
    p_id: saved.id,
    p_expected: 1,
    p_body: { action: "discard" },
    p_key: randomUUID(),
  };
  assert.equal(
    (await other.rpc("schedule_preparation_command", opts)).error?.code,
    "42501",
  );
  const changes = ["Primeira edição", "Outra edição"].map((name) =>
    f.admin.rpc("schedule_preparation_command", {
      ...opts,
      p_key: randomUUID(),
      p_body: {
        action: "save",
        content: { schedule: { ...f.fields, name } },
        navigation: { version: 1, stage: "schedule_creation" },
      },
    }),
  );
  const result = await Promise.all(changes);
  assert.equal(result.filter((r) => !r.error).length, 1);
  assert.equal(result.filter((r) => r.error?.code === "PT409").length, 1);
  assert.equal((await read(f)).revision, 2);
  assert.equal(facts(f), before);
});
test("changed type version blocks every recurrence until explicit reference adoption without changing the private edit", async () => {
  const f = await fixture("schedule_series_create", "weekly"),
    saved = await save(f);
  const changed = await shiftCommand(
      f.admin,
      f.patient,
      "type",
      {
        id: f.typ.id,
        name: "Tipo alterado legitimamente",
        startsLocal: "09:00",
        durationMinutes: 720,
        active: true,
      },
      f.typ.version,
    ),
    before = facts(f),
    intent = packet(f, saved);
  assert.equal(
    (await f.admin.rpc("commit_schedule_preparation", intent)).error?.code,
    "PT409",
  );
  assert.equal(facts(f), before);
  assert.equal((await read(f)).state, "active");
  const retained = await save(f, saved, {
    schedule: { ...f.fields, notes: "Edição própria preservada" },
  });
  assert.equal(
    (await read(f)).content.schedule.shiftTypeVersion,
    f.typ.version,
  );
  const adopted = await save(f, retained, {
    schedule: {
      ...f.fields,
      shiftTypeVersion: changed.version,
      notes: "Edição própria preservada",
    },
  });
  const next = {
      ...f.command,
      body: { ...f.command.body, notes: "Edição própria preservada" },
    },
    r = await rpc(
      f.admin,
      "commit_schedule_preparation",
      packet(f, adopted, randomUUID(), next),
    );
  assert.equal(r.receipt.nativeResult.status, "published");
});
test("foreign reference,invalid partial shape,wrong native body and reused native key never consume or create", async () => {
  const f = await fixture("schedule_series_create"),
    foreign = await fixture("schedule_series_create"),
    before = facts(f);
  await rpc(f.admin, "select_active_context", { p_patient: f.patient });
  assert.equal(await read(f), null);
  const bad = await f.admin.rpc("schedule_preparation_command", {
    ...f.scope,
    p_id: null,
    p_expected: null,
    p_key: randomUUID(),
    p_body: {
      action: "save",
      content: { schedule: { ...f.fields, shiftTypeId: foreign.typ.id } },
      navigation: { version: 1, stage: "schedule_creation" },
    },
  });
  assert.equal(bad.error?.code, "42501");
  const saved = await save(f),
    wrong = packet(f, saved, randomUUID(), {
      ...f.command,
      body: { ...f.command.body, notes: "Outro conteúdo" },
    });
  assert.equal(
    (await f.admin.rpc("commit_schedule_preparation", wrong)).error?.code,
    "22023",
  );
  assert.equal(facts(f), before);
  const g = await fixture(),
    s = await save(g),
    nativeKey = randomUUID();
  await rpc(g.admin, "schedule_command", {
    p_patient: g.patient,
    p_action: "type",
    p_body: {
      name: "Tipo já existente",
      startsLocal: "07:00",
      durationMinutes: 720,
    },
    p_key: nativeKey,
    p_version: null,
  });
  const state = facts(g);
  assert.equal(
    (await g.admin.rpc("commit_schedule_preparation", packet(g, s, nativeKey)))
      .error?.code,
    "PT409",
  );
  assert.equal(facts(g), state);
  assert.equal((await read(g)).state, "active");
  const missing = await g.admin.rpc("schedule_preparation_command", {
    ...g.scope,
    p_id: s.id,
    p_expected: 1,
    p_key: randomUUID(),
    p_body: {
      action: "save",
      content: { schedule: { ...g.fields, start: "25:00" } },
      navigation: { version: 1, stage: "schedule_creation" },
    },
  });
  assert.equal(missing.error?.code, "22023");
});
test("late capability revocation rolls native creation,private consumption,journal and audit back together", async () => {
  const f = await fixture(),
    saved = await save(f),
    intent = packet(f, saved),
    before = facts(f);
  sql(
    `create function private.phase_d3_schedule_preparation_probe() returns trigger language plpgsql security definer set search_path='' as $$begin if new.idempotency_key=${q(intent.p_key)}::uuid then insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${q(f.patient)},${q(fixtures.adminA.id)},'schedule.types.manage',false);end if;return new;end;$$;create trigger phase_d3_schedule_preparation_probe after insert on private.schedule_preparation_commands for each row execute function private.phase_d3_schedule_preparation_probe();`,
  );
  try {
    assert.equal(
      (await f.admin.rpc("commit_schedule_preparation", intent)).error?.code,
      "42501",
    );
    assert.equal(facts(f), before);
    assert.equal((await read(f)).state, "active");
    assert.equal(
      sql(
        `select count(*) from private.schedule_preparation_commands where owner_id=${q(fixtures.adminA.id)} and idempotency_key=${q(intent.p_key)}`,
      ),
      "0",
    );
  } finally {
    sql(
      "drop trigger phase_d3_schedule_preparation_probe on private.schedule_preparation_commands;drop function private.phase_d3_schedule_preparation_probe();",
    );
  }
  const acl = JSON.parse(
    sql(
      `select jsonb_agg(jsonb_build_object('rls',c.relrowsecurity,'read',has_table_privilege('authenticated',c.oid,'select'),'write',has_table_privilege('authenticated',c.oid,'insert'))) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='private' and c.relname in ('schedule_preparations','schedule_preparation_commands')`,
    ),
  );
  assert.equal(acl.length, 2);
  assert.ok(acl.every((r) => r.rls && !r.read && !r.write));
});
