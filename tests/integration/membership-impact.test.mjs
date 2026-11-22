import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { actor, rpc, fixtures, setup } from "./v4-fixtures.mjs";
import { unavailableDelivery } from "./delivery-regularization-fixtures.mjs";
import { balanceSetup, balanceCommand } from "./shift-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
const preview = (f, user = fixtures.professional.id) =>
  rpc(f.admin, "membership_impact", { p_patient: f.patient, p_user: user });
const facts = (f) =>
  sql(
    `select jsonb_build_object('memberships',(select jsonb_agg(to_jsonb(m) order by id) from public.care_recipient_memberships m where care_recipient_id=${sqlLiteral(f.patient)}),'documents',(select jsonb_agg(to_jsonb(d) order by id) from public.operational_documents d where care_recipient_id=${sqlLiteral(f.patient)}),'movements',(select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${sqlLiteral(f.patient)}),'audit',(select count(*) from public.audit_events where metadata->>'care_recipient_id'=${sqlLiteral(f.patient)}))`,
  );

test("membership preview exposes exact remaining ENT facts without changing membership, documents, movements or audit", async () => {
  const f = await unavailableDelivery({ revoke: false }),
    before = facts(f),
    result = await preview(f);
  assert.equal(result.userId, fixtures.professional.id);
  assert.equal(result.deliveries.available, true);
  assert.equal(result.deliveries.total, 1);
  assert.equal(result.deliveries.items[0].id, f.document.id);
  assert.equal(result.deliveries.items[0].lineCount, 1);
  assert.equal(Number(result.deliveries.items[0].lines[0].acceptedQuantity), 2);
  assert.equal(Number(result.deliveries.items[0].lines[0].pendingQuantity), 1);
  assert.equal(facts(f), before);
});

test("membership preview respects real local authority, target membership, context and domain read capabilities", async () => {
  const f = await unavailableDelivery({ revoke: false });
  for (const name of ["professional", "reader", "family"]) {
    const client = await actor(name, f.patient);
    assert.equal(
      (
        await client.rpc("membership_impact", {
          p_patient: f.patient,
          p_user: fixtures.professional.id,
        })
      ).error?.code,
      "42501",
    );
  }
  assert.equal(
    (
      await f.admin.rpc("membership_impact", {
        p_patient: f.patient,
        p_user: fixtures.supervisor.id,
      })
    ).error?.code,
    "42501",
  );
  const other = await setup();
  await actor("adminA", f.patient);
  assert.equal(
    (
      await f.admin.rpc("membership_impact", {
        p_patient: other.patient,
        p_user: fixtures.professional.id,
      })
    ).error?.code,
    "42501",
  );
  for (const capability of ["ent.read", "bal.read", "schedule.read.team"])
    sql(
      `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${sqlLiteral(f.patient)},${sqlLiteral(fixtures.adminA.id)},${sqlLiteral(capability)},false);`,
    );
  const result = await preview(f);
  for (const key of [
    "deliveries",
    "regularizations",
    "balances",
    "deferrals",
    "shifts",
    "shiftChanges",
  ]) {
    assert.equal(result[key].available, false);
    assert.equal(result[key].total, null);
    assert.deepEqual(result[key].items, []);
  }
  const global = await actor("global", f.patient);
  sql(
    `update public.care_recipient_memberships set status='revoked' where care_recipient_id=${sqlLiteral(f.patient)} and user_id=${sqlLiteral(fixtures.global.id)};`,
  );
  assert.equal(
    (
      await global.rpc("membership_impact", {
        p_patient: f.patient,
        p_user: fixtures.professional.id,
      })
    ).error?.code,
    "42501",
  );
});

test("membership preview preserves live BAL assignment and pending deferral; revocation remains immediate with historical receipt intact", async () => {
  const f = await balanceSetup();
  let document = await rpc(f.admin, "create_supply_document", {
    p_patient: f.patient,
    p_type: "ENT",
    p_payload: {
      source: "FAMILY",
      destination: "CARE_TEAM",
      recipientId: f.pro.id,
      recipientReason: "Profissional do plantão recebe material fictício",
      lines: [{ productId: f.products[0], quantity: "3" }],
    },
    p_key: randomUUID(),
    p_draft: false,
  });
  document = await rpc(f.pro.client, "supply_document_command", {
    p_id: document.id,
    p_action: "receive",
    p_body: {
      divergences: [
        {
          lineId: document.lines[0].id,
          acceptedQuantity: "2",
          notes: "Uma unidade permanece sem aceite",
        },
      ],
    },
    p_key: randomUUID(),
    p_version: document.version,
  });
  const workspace = await rpc(f.pro.client, "balance_workspace", {
      p_patient: f.patient,
    }),
    a = workspace.eligibility.assignment,
    target = workspace.targets.find((s) => s.starts_at >= a.ends_at);
  assert.ok(target);
  await balanceCommand(
    f.pro.client,
    f.patient,
    "request_deferral",
    {
      assignmentId: a.id,
      targetShiftId: target.id,
      reason: "Proposta futura fictícia ainda não aprovada",
    },
    a.version,
  );
  const before = facts(f),
    result = await preview(f, f.pro.id);
  assert.equal(result.balances.total, 1);
  assert.equal(result.balances.items[0].id, a.id);
  assert.equal(result.deferrals.total, 1);
  assert.ok(result.shifts.total >= 4);
  assert.equal(result.deliveries.total, 1);
  assert.equal(facts(f), before);
  await rpc(f.admin, "admin_set_membership_status", {
    p_care_recipient_id: f.patient,
    p_user_id: f.pro.id,
    p_status: "revoked",
  });
  const old = await rpc(f.admin, "operational_document", { p_id: document.id });
  assert.equal(old.workflow_data.acceptedBy, f.pro.id);
  assert.equal(Number(old.lines[0].accepted_quantity), 2);
  assert.equal(old.deliveryRegularization.canPropose, true);
  assert.equal(
    (await f.pro.client.rpc("balance_workspace", { p_patient: f.patient }))
      .error?.code,
    "42501",
  );
  assert.equal(
    sql(
      `select professional_id from public.bal_assignments where id=${sqlLiteral(a.id)};`,
    ),
    f.pro.id,
  );
});

test("membership preview counts the full scope before limiting display and never presents a bounded list as complete", async () => {
  const f = await unavailableDelivery({ revoke: false });
  for (let i = 0; i < 22; i++)
    await rpc(f.admin, "create_supply_document", {
      p_patient: f.patient,
      p_type: "ENT",
      p_payload: {
        source: "FAMILY",
        destination: "CARE_TEAM",
        recipientId: fixtures.professional.id,
        recipientReason: "Expedição fictícia para testar limite da prévia",
        lines: [{ productId: f.products[0], quantity: "1" }],
      },
      p_key: randomUUID(),
      p_draft: false,
    });
  const before = facts(f),
    result = await preview(f);
  assert.equal(result.deliveries.total, 23);
  assert.equal(result.deliveries.items.length, 20);
  assert.equal(facts(f), before);
});

test("membership preview has narrow execute grants and no mutable side effect", async () => {
  assert.equal(
    sql(
      "select has_function_privilege('anon','public.membership_impact(uuid,uuid)','execute') or has_function_privilege('service_role','public.membership_impact(uuid,uuid)','execute');",
    ),
    "f",
  );
  assert.equal(
    sql(
      "select has_function_privilege('authenticated','public.membership_impact(uuid,uuid)','execute');",
    ),
    "t",
  );
  const f = await setup(),
    before = facts(f);
  assert.equal((await preview(f)).deliveries.total, 0);
  assert.equal(facts(f), before);
  assert.equal(
    sql(
      "select provolatile from pg_proc where oid='public.membership_impact(uuid,uuid)'::regprocedure;",
    ),
    "s",
  );
});
