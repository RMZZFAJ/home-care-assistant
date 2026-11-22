import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { rpc, actor, fixtures } from "./v4-fixtures.mjs";
import {
  flowPreparationFixture as fixture,
  saveFlowPreparation as save,
  flowPreparationPacket as packet,
} from "./flow-preparation-fixtures.mjs";
const facts = (f) =>
  JSON.parse(
    sql(
      `select jsonb_build_object('source',(select to_jsonb(s) from public.flow_submissions s where s.id=${q(f.scope.p_target)}),'reports',(select coalesce(jsonb_agg(to_jsonb(r) order by r.id),'[]'::jsonb) from public.consumption_reports r where r.care_recipient_id=${q(f.patient)}),'ledger',(select coalesce(jsonb_agg(to_jsonb(m) order by m.id),'[]'::jsonb) from public.stock_movements m where m.care_recipient_id=${q(f.patient)}))::text;`,
    ),
  );
for (const accept of [true, false])
  test(`private Flow ${accept ? "accept" : "reject"}:partial private state has no native effects;atomic act and exact replay`, async () => {
    const f = await fixture(accept),
      before = facts(f),
      saved = await save(f),
      original = packet(f, saved);
    assert.deepEqual(facts(f), before);
    assert.deepEqual(
      (await rpc(f.admin, "flow_preparation_context", f.scope)).content,
      f.content,
    );
    const result = await rpc(f.admin, "commit_flow_preparation", original),
      after = facts(f);
    assert.equal(result.consumedResult.idempotencyKey, original.p_key);
    assert.equal(result.state, "consumed");
    assert.equal(result.consumedResourceId, f.scope.p_target);
    assert.equal(result.consumedResult.actorId, fixtures.adminA.id);
    assert.deepEqual(result.consumedResult.command, original.p_body.command);
    assert.equal(after.source.status, accept ? "confirmed" : "rejected");
    assert.equal(after.reports.length - before.reports.length, accept ? 1 : 0);
    assert.deepEqual(after.ledger, before.ledger);
    if (accept) {
      assert.equal(after.reports[0].body, f.content.review.text.trim());
      assert.equal(after.reports[0].lines[0].quantity, "1");
    }
    assert.equal(
      (await rpc(f.admin, "commit_flow_preparation", original)).replayed,
      true,
    );
    assert.deepEqual(facts(f), after);
    assert.equal(
      (await rpc(f.admin, "flow_preparation_list", { p_patient: f.patient }))
        .data[0].state,
      "consumed",
    );
  });
test("private Flow own scope,read isolation,CAS,partial fields,discard and cursor", async () => {
  const f = await fixture(),
    before = facts(f),
    partial = {
      ...f.content,
      review: {
        ...f.content.review,
        kind: "",
        text: "",
        lines: [{ ...f.content.review.lines[0], quantity: "" }],
      },
      reference: null,
      referenceHash: null,
    },
    saved = await save(f, partial),
    other = await actor("global", f.patient);
  assert.deepEqual(facts(f), before);
  assert.equal(
    (await other.rpc("flow_preparation_context", f.scope)).error?.code,
    "42501",
  );
  assert.deepEqual(
    (await rpc(other, "flow_preparation_list", { p_patient: f.patient })).data,
    [],
  );
  const attempts = await Promise.all(
    ["primeiro", "segundo"].map((text) =>
      f.admin.rpc("flow_preparation_command", {
        ...f.scope,
        p_id: saved.id,
        p_expected: 1,
        p_key: randomUUID(),
        p_body: {
          action: "save",
          content: { ...partial, review: { ...partial.review, text } },
          navigation: { version: 1, stage: "flow_review" },
        },
      }),
    ),
  );
  assert.equal(attempts.filter((x) => !x.error).length, 1);
  assert.equal(attempts.find((x) => x.error)?.error.code, "PT409");
  assert.equal(
    (
      await f.admin.rpc("flow_preparation_list", {
        p_patient: f.patient,
        p_before: new Date().toISOString(),
        p_before_id: null,
      })
    ).error?.code,
    "22023",
  );
  const current = await rpc(f.admin, "flow_preparation_context", f.scope);
  await rpc(f.admin, "flow_preparation_command", {
    ...f.scope,
    p_id: current.id,
    p_expected: current.revision,
    p_key: randomUUID(),
    p_body: { action: "discard" },
  });
  assert.equal(await rpc(f.admin, "flow_preparation_context", f.scope), null);
  assert.deepEqual(facts(f), before);
});
test("private Flow source change,native terminal replay and old report key never consume a new preparation", async () => {
  for (const change of ["body", "terminal", "key"]) {
    const f = await fixture(),
      saved = await save(f),
      original = packet(f, saved);
    if (change === "body")
      sql(
        `update public.flow_submissions set body=body||'{"text":"Sugestão alterada depois da revisão"}'::jsonb where id=${q(f.scope.p_target)};`,
      );
    if (change === "terminal")
      await rpc(f.admin, "review_flow_submission", {
        p_id: f.scope.p_target,
        p_accept: false,
        p_kind: "shortage",
        p_text: "Descarte original",
        p_lines: [],
      });
    if (change === "key")
      await rpc(f.admin, "report_extraordinary_consumption", {
        p_patient: f.patient,
        p_kind: "consumption",
        p_location: "CARE_TEAM",
        p_text: "Outra intenção nativa anterior",
        p_lines: [],
        p_key: f.scope.p_target,
      });
    const before = facts(f);
    assert.equal(
      (await f.admin.rpc("commit_flow_preparation", original)).error?.code,
      change === "key" ? "23505" : "PT409",
    );
    assert.deepEqual(facts(f), before);
    assert.equal(
      (await rpc(f.admin, "flow_preparation_context", f.scope)).state,
      "active",
    );
  }
});
test("private Flow consumed recovery and cleanup survive write loss and inactive patient;current reference and new write stay denied", async () => {
  const f = await fixture(),
    saved = await save(f),
    original = packet(f, saved),
    result = await rpc(f.admin, "commit_flow_preparation", original);
  sql(
    `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${q(f.patient)},${q(fixtures.adminA.id)},'consumption.report',false);update public.care_recipients set is_active=false where id=${q(f.patient)};`,
  );
  assert.equal(
    (await rpc(f.admin, "commit_flow_preparation", original)).replayed,
    true,
  );
  assert.deepEqual(
    (await rpc(f.admin, "flow_preparation_context", f.scope)).consumedResult,
    result.consumedResult,
  );
  assert.equal(
    (await rpc(f.admin, "flow_preparation_list", { p_patient: f.patient }))
      .data[0].state,
    "consumed",
  );
  assert.equal(
    (
      await f.admin.rpc("flow_preparation_reference", {
        ...f.scope,
        p_fields: f.content.review,
      })
    ).error?.code,
    "42501",
  );
  assert.equal(
    (
      await f.admin.rpc("flow_preparation_command", {
        ...f.scope,
        p_id: null,
        p_expected: null,
        p_key: randomUUID(),
        p_body: {
          action: "save",
          content: f.content,
          navigation: { version: 1, stage: "flow_review" },
        },
      })
    ).error?.code,
    "42501",
  );
  await rpc(f.admin, "flow_preparation_command", {
    ...f.scope,
    p_id: saved.id,
    p_expected: 2,
    p_key: randomUUID(),
    p_body: { action: "acknowledge" },
  });
  assert.deepEqual(
    (await rpc(f.admin, "flow_preparation_list", { p_patient: f.patient }))
      .data,
    [],
  );
  sql(
    `update public.care_recipient_memberships set status='revoked' where care_recipient_id=${q(f.patient)} and user_id=${q(fixtures.adminA.id)};`,
  );
  assert.equal(
    (await f.admin.rpc("flow_preparation_context", f.scope)).error?.code,
    "42501",
  );
  assert.equal(
    (await f.admin.rpc("flow_preparation_list", { p_patient: f.patient })).error
      ?.code,
    "42501",
  );
});
test("private Flow rejection does not require stock read or reuse an unrelated old report", async () => {
  const f = await fixture(false);
  await rpc(f.admin, "report_extraordinary_consumption", {
    p_patient: f.patient,
    p_kind: "consumption",
    p_location: "CARE_TEAM",
    p_text: "Relato anterior com chave reservada",
    p_lines: [],
    p_key: f.scope.p_target,
  });
  sql(
    `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${q(f.patient)},${q(fixtures.adminA.id)},'stock.team.read',false);`,
  );
  assert.equal(
    (
      await f.admin.rpc("flow_preparation_reference", {
        ...f.scope,
        p_fields: { ...f.content.review, accept: true },
      })
    ).error?.code,
    "42501",
  );
  const ref = await rpc(f.admin, "flow_preparation_reference", {
    ...f.scope,
    p_fields: f.content.review,
  });
  assert.deepEqual(ref.reference.catalog, []);
  f.content = { review: f.content.review, ...ref };
  const saved = await save(f),
    before = facts(f);
  await rpc(f.admin, "commit_flow_preparation", packet(f, saved));
  const after = facts(f);
  assert.equal(after.source.status, "rejected");
  assert.deepEqual(after.reports, before.reports);
  assert.deepEqual(after.ledger, before.ledger);
});
test("private Flow own list cursor reaches every preparation once and rejects another patient scope", async () => {
  const f = await fixture();
  await save(f);
  const targets = [f.scope.p_target];
  for (let i = 0; i < 2; i++) {
    const target = randomUUID(),
      session = randomUUID();
    sql(
      `insert into public.flow_sessions(id,care_recipient_id,user_id,token_hash,expires_at) values(${q(session)},${q(f.patient)},${q(fixtures.adminA.id)},encode(extensions.digest(${q(session)},'sha256'),'hex'),now()+interval '10 minutes');insert into public.flow_submissions(id,session_id,care_recipient_id,user_id,body) select ${q(target)},${q(session)},care_recipient_id,user_id,body from public.flow_submissions where id=${q(f.scope.p_target)};`,
    );
    const scope = { ...f.scope, p_target: target },
      ref = await rpc(f.admin, "flow_preparation_reference", {
        ...scope,
        p_fields: f.content.review,
      });
    await save({ ...f, scope, content: { review: f.content.review, ...ref } });
    targets.push(target);
  }
  let cursor = {},
    found = [];
  do {
    const page = await rpc(f.admin, "flow_preparation_list", {
      p_patient: f.patient,
      p_limit: 1,
      ...cursor,
    });
    assert.equal(page.data.length, 1);
    found.push(page.data[0].targetResourceId);
    cursor = page.next
      ? { p_before: page.next.at, p_before_id: page.next.id }
      : null;
  } while (cursor);
  assert.equal(found.length, 3);
  assert.deepEqual(found.toSorted(), targets.toSorted());
  assert.equal(new Set(found).size, 3);
  assert.equal(
    (
      await f.admin.rpc("flow_preparation_context", {
        ...f.scope,
        p_patient: randomUUID(),
      })
    ).error?.code,
    "42501",
  );
});
test("private Flow authority revoked after private journal rolls back source,report,audit and private result", async () => {
  const f = await fixture(),
    saved = await save(f),
    before = facts(f),
    probe = "flow_preparation_probe_" + randomUUID().replaceAll("-", ""),
    audit = sql(`select count(*) from public.audit_events;`);
  sql(
    `create function private.${probe}() returns trigger language plpgsql set search_path='' as $$begin if new.preparation_id=${q(saved.id)} and new.result->>'state'='consumed' then insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${q(f.patient)},${q(fixtures.adminA.id)},'consumption.report',false);end if;return new;end;$$;create trigger ${probe} after insert on private.flow_preparation_commands for each row execute function private.${probe}();`,
  );
  try {
    assert.equal(
      (await f.admin.rpc("commit_flow_preparation", packet(f, saved))).error
        ?.code,
      "42501",
    );
    assert.deepEqual(facts(f), before);
    assert.equal(
      (await rpc(f.admin, "flow_preparation_context", f.scope)).state,
      "active",
    );
    assert.equal(
      sql(
        `select count(*) from private.flow_preparation_commands where preparation_id=${q(saved.id)};`,
      ),
      "1",
    );
    assert.equal(sql(`select count(*) from public.audit_events;`), audit);
  } finally {
    sql(
      `drop trigger if exists ${probe} on private.flow_preparation_commands;drop function if exists private.${probe}();`,
    );
  }
});
