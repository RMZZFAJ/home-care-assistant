import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import {
  remainingNeedFixture,
  remainingPacket,
  physicalState,
  requestState,
  rpc,
  fixtures,
} from "./remaining-need-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
import { whileAdvisoryWaits, whileRowWaits } from "./lock-barrier.mjs";
import { actor, delivery, setup, issue } from "./v4-fixtures.mjs";

test("a completed source stays completed when a separately justified remaining need is issued", async () => {
  const base = await setup(),
    pro = await actor("professional", base.patient);
  const source = await issue(base.patient, base.products);
  const ent = await delivery(base.patient, source, base.products);
  await rpc(pro, "supply_document_command", {
    p_id: ent.id,
    p_action: "receive",
    p_body: { divergences: [] },
    p_key: randomUUID(),
    p_version: ent.version,
  });
  const f = { ...base, pro, source, ent, sourceVersion: 0 };
  // Terminal control uses fully accepted deliveries, without an open physical
  // discrepancy. The partial fixture correctly remained operationally open.
  sql(
    `select private.refresh_requisition_lifecycle(${sqlLiteral(f.source.id)});`,
  );
  const progress = await rpc(f.pro, "requisition_progress", {
    p_id: f.source.id,
  });
  f.sourceVersion = progress.version;
  assert.ok(progress.completedAt);
  const fulfilled = await rpc(f.pro, "requisition_fulfillment", {
    p_requisition: f.source.id,
  });
  assert.equal(fulfilled.fulfilled, fulfilled.total);
  const terminal = sql(
      `select status::text||':'||material_identity from public.requisitions where id=${sqlLiteral(f.source.id)};`,
    ),
    before = physicalState(f);
  const result = (
    await rpc(f.pro, "submit_remaining_requisition", {
      ...remainingPacket(f),
      p_source_version: progress.version,
    })
  )[0];
  assert.notEqual(result.requisition_id, f.source.id);
  const after = await rpc(f.pro, "requisition_progress", { p_id: f.source.id });
  assert.equal(after.completedAt, progress.completedAt);
  assert.equal(after.archivedAt, progress.archivedAt);
  assert.equal(
    sql(
      `select status::text||':'||material_identity from public.requisitions where id=${sqlLiteral(f.source.id)};`,
    ),
    terminal,
  );
  assert.equal(physicalState(f), before);
});

test("a real foreign source and an imported readonly source cannot authorize a remaining-need issuance", async () => {
  const f = await remainingNeedFixture(),
    foreign = await setup(),
    other = await issue(foreign.patient, foreign.products),
    packet = remainingPacket(f);
  // actor() intentionally reuses one Auth client per fixture identity. Restore
  // its selected patient after building the other real patient.
  await actor("adminA", f.patient);
  await actor("professional", f.patient);
  const physicalProtocol = Number(
    sql(
      "select coalesce(max(physical_protocol),0)+1 from public.historical_requisition_imports;",
    ),
  );
  await rpc(f.admin, "import_historical_requisitions", {
    p_source_hash:
      randomUUID().replaceAll("-", "") + randomUUID().replaceAll("-", ""),
    p_rows: [
      {
        physicalProtocol,
        careRecipientId: f.patient,
        status: "submitted",
        lines: [
          { productId: f.products[0], currentStock: null, urgent: false },
        ],
        extraItems: [],
        observations: ["Original físico fictício somente para leitura"],
      },
    ],
  });
  const historical = sql(
      `select id from public.requisitions where care_recipient_id=${sqlLiteral(f.patient)} and is_historical;`,
    ),
    before = requestState(f),
    physical = physicalState(f);
  const denied = await f.pro.rpc("submit_remaining_requisition", {
    ...packet,
    p_source: other.id,
    p_source_version: 1,
  });
  assert.equal(denied.error?.code, "42501");
  const readonly = await f.pro.rpc("submit_remaining_requisition", {
    ...packet,
    p_source: historical,
    p_source_version: 1,
  });
  assert.equal(readonly.error?.code, "23514");
  assert.equal(requestState(f), before);
  assert.equal(physicalState(f), physical);
});

test("a remaining need emits a new linked REQ, preserving partial acceptance, science, material identity and all physical effects", async () => {
  const f = await remainingNeedFixture(),
    packet = remainingPacket(f),
    before = physicalState(f);
  const oldEvents = sql(
    `select jsonb_agg(to_jsonb(e) order by id) from public.document_events e where document_id=${sqlLiteral(f.source.id)};`,
  );
  const created = (await rpc(f.pro, "submit_remaining_requisition", packet))[0];
  assert.notEqual(created.requisition_id, f.source.id);
  const row = (
    await f.pro
      .from("requisitions")
      .select(
        "source_requisition_id,source_requisition_version,remaining_need_reason,material_identity,request_intent",
      )
      .eq("id", created.requisition_id)
      .single()
  ).data;
  assert.equal(row.source_requisition_id, f.source.id);
  assert.equal(row.source_requisition_version, f.sourceVersion);
  assert.equal(row.remaining_need_reason, packet.p_reason);
  assert.equal(row.request_intent.remainingNeed.reason, packet.p_reason);
  assert.match(row.material_identity, /^[a-f0-9]{64}$/);
  assert.notEqual(row.material_identity, f.sourceDoc.materialIdentity);
  const document = await rpc(f.pro, "operational_document", {
    p_id: created.requisition_id,
  });
  assert.equal(
    document.payload.sourceRequisition.protocol,
    f.sourceDoc.protocol,
  );
  assert.equal(document.payload.sourceRequisition.version, f.sourceVersion);
  assert.equal(physicalState(f), before);
  const source = await rpc(f.pro, "requisition_progress", {
    p_id: f.source.id,
  });
  assert.equal(source.version, f.sourceVersion + 1);
  const child = await rpc(f.pro, "requisition_fulfillment", {
    p_requisition: created.requisition_id,
  });
  assert.equal(child.fulfilled, 0);
  const prior = JSON.parse(oldEvents);
  const after = JSON.parse(
    sql(
      `select jsonb_agg(to_jsonb(e) order by id) from public.document_events e where document_id=${sqlLiteral(f.source.id)};`,
    ),
  );
  assert.deepEqual(
    after.filter((e) => prior.some((x) => x.id === e.id)),
    prior,
  );
  const added = after.filter((e) => !prior.some((x) => x.id === e.id));
  assert.equal(added.length, 1);
  assert.equal(added[0].action, "req.remaining_need_declared");
  assert.equal(added[0].actor_id, fixtures.professional.id);
  assert.equal(added[0].body.event.newRequisitionId, created.requisition_id);
  const first = await f.pro
    .from("requisition_items")
    .select("current_stock,stock_observation,stock_observation_at")
    .eq("requisition_id", created.requisition_id)
    .single();
  assert.ifError(first.error);
  assert.equal(Number(first.data.current_stock), 0);
  assert.equal(first.data.stock_observation, "observed");
  assert.equal(
    Date.parse(first.data.stock_observation_at),
    Date.parse(packet.p_lines[0].stockObservationAt),
  );
  const stable = requestState(f);
  assert.equal(
    (await rpc(f.pro, "submit_remaining_requisition", packet))[0]
      .requisition_id,
    created.requisition_id,
  );
  assert.equal(requestState(f), stable);
});

test("same own key converges while two new remaining needs from one reviewed source version yield one issuance and one conflict", async () => {
  const f = await remainingNeedFixture(),
    packet = remainingPacket(f),
    before = physicalState(f);
  const same = await Promise.all([
    f.pro.rpc("submit_remaining_requisition", packet),
    f.pro.rpc("submit_remaining_requisition", packet),
  ]);
  for (const response of same) assert.ifError(response.error);
  assert.equal(same[0].data[0].requisition_id, same[1].data[0].requisition_id);
  const next = {
    ...packet,
    p_idempotency_key: randomUUID(),
    p_source_version: f.sourceVersion + 1,
  };
  const competing = await Promise.all([
    f.pro.rpc("submit_remaining_requisition", next),
    f.pro.rpc("submit_remaining_requisition", {
      ...next,
      p_idempotency_key: randomUUID(),
    }),
  ]);
  assert.equal(competing.filter((x) => !x.error).length, 1);
  assert.equal(competing.find((x) => x.error).error.code, "PT409");
  assert.equal(physicalState(f), before);
});

test("own committed remaining need recovers with live read after write loss, but changed intent, foreign source and read loss fail atomically", async () => {
  const f = await remainingNeedFixture(),
    packet = remainingPacket(f),
    created = (await rpc(f.pro, "submit_remaining_requisition", packet))[0],
    before = requestState(f),
    physical = physicalState(f);
  sql(
    `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${sqlLiteral(f.patient)},${sqlLiteral(fixtures.professional.id)},'req.create',false);`,
  );
  assert.equal(
    (await rpc(f.pro, "submit_remaining_requisition", packet))[0]
      .requisition_id,
    created.requisition_id,
  );
  assert.equal(
    (
      await f.pro.rpc("submit_remaining_requisition", {
        ...packet,
        p_idempotency_key: randomUUID(),
      })
    ).error?.code,
    "42501",
  );
  assert.equal(
    (
      await f.pro.rpc("submit_remaining_requisition", {
        ...packet,
        p_reason: "Outro motivo com a mesma chave",
      })
    ).error?.code,
    "23505",
  );
  assert.equal(
    (
      await f.pro.rpc("submit_remaining_requisition", {
        ...packet,
        p_care_recipient_id: "20000000-0000-4000-8000-000000000002",
      })
    ).error?.code,
    "42501",
  );
  sql(
    `update public.care_recipient_memberships set status='revoked' where care_recipient_id=${sqlLiteral(f.patient)} and user_id=${sqlLiteral(fixtures.professional.id)};`,
  );
  assert.equal(
    (await f.pro.rpc("submit_remaining_requisition", packet)).error?.code,
    "42501",
  );
  assert.equal(requestState(f), before);
  assert.equal(physicalState(f), physical);
});

test("remaining need rejects absent or obsolete reference, bad reason, unknown material and requested quantity without a partial issuance", async () => {
  const f = await remainingNeedFixture(),
    packet = remainingPacket(f),
    before = requestState(f);
  for (const patch of [
    { p_source: null },
    { p_source_version: null },
    { p_source_version: 0 },
    { p_reason: "x" },
    { p_reason: "😀".repeat(501) },
    { p_lines: [{ ...packet.p_lines[0], requestedQuantity: "4" }] },
    {
      p_lines: [
        { ...packet.p_lines[0], productId: "not-an-original-material" },
      ],
    },
  ]) {
    const result = await f.pro.rpc("submit_remaining_requisition", {
      ...packet,
      ...patch,
      p_idempotency_key: randomUUID(),
    });
    assert.equal(result.error?.code, "22023", JSON.stringify(patch));
    assert.equal(requestState(f), before);
  }
  const stale = await f.pro.rpc("submit_remaining_requisition", {
    ...packet,
    p_source_version: f.sourceVersion + 1,
  });
  assert.equal(stale.error?.code, "PT409");
  assert.equal(requestState(f), before);
  const forged = await f.pro.rpc("submit_remaining_requisition", {
    ...packet,
    p_source: randomUUID(),
  });
  assert.equal(forged.error?.code, "42501");
  assert.equal(requestState(f), before);
  const grants = JSON.parse(
    sql(
      `select jsonb_build_object('anon',has_function_privilege('anon','public.submit_remaining_requisition(uuid,uuid,jsonb,jsonb,jsonb,uuid,integer,text)','execute'),'service',has_function_privilege('service_role','public.submit_remaining_requisition(uuid,uuid,jsonb,jsonb,jsonb,uuid,integer,text)','execute'),'core',has_function_privilege('authenticated','private.submit_requisition_core(uuid,uuid,text,jsonb,jsonb,jsonb,uuid,integer,text)','execute'));`,
    ),
  );
  assert.deepEqual(grants, { anon: false, service: false, core: false });
});

test("a remaining need rechecks real authority after the shared requisition lock", async () => {
  const f = await remainingNeedFixture(),
    packet = remainingPacket(f),
    before = requestState(f);
  const result = await whileAdvisoryWaits(
    "requisition-patient:" + f.patient,
    () => f.pro.rpc("submit_remaining_requisition", packet),
    async () => {
      sql(
        `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${sqlLiteral(f.patient)},${sqlLiteral(fixtures.professional.id)},'req.create',false);`,
      );
    },
  );
  assert.equal(result.error?.code, "42501");
  assert.equal(requestState(f), before);
});

test("late profile FK wait rolls back child issuance and source event when its real Auth session is revoked", async () => {
  const f = await remainingNeedFixture(),
    packet = remainingPacket(f),
    before = requestState(f),
    physical = physicalState(f);
  const result = await whileRowWaits(
    "profiles",
    fixtures.professional.id,
    "submit_remaining_requisition",
    () => f.pro.rpc("submit_remaining_requisition", packet),
    async () => {
      const signed = await f.pro.auth.signOut();
      assert.ifError(signed.error);
    },
  );
  assert.equal(result.error?.code, "42501", result.error?.message);
  assert.equal(requestState(f), before);
  assert.equal(physicalState(f), physical);
});
