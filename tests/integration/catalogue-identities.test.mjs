import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  catalogueIdentityFixture,
  identityContext,
  identityPacket,
  identityPhysicalState,
  identityState,
  rpc,
} from "./catalogue-identity-fixtures.mjs";
import { actor, fixtures } from "./v4-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
import { whileAdvisoryWaits, whileRowWaits } from "./lock-barrier.mjs";

test("four units in each custody remain inactive and reactivate under the same identity without any stock effect", async () => {
  const f = await catalogueIdentityFixture(),
    before = identityPhysicalState(f),
    context = await identityContext(f);
  assert.deepEqual(context.source.stock, {
    FAMILY: "4.000000",
    CARE_TEAM: "4.000000",
    TRANSIT: "0.000000",
  });
  const retired = await rpc(
    f.admin,
    "catalogue_identity_command",
    await identityPacket(f),
  );
  assert.equal(retired.result.source.is_active, false);
  assert.equal(identityPhysicalState(f), before);
  const hidden = await f.admin
    .from("care_recipient_products")
    .select("product_id")
    .eq("care_recipient_id", f.patient)
    .eq("product_id", f.products[0])
    .eq("is_active", true);
  assert.ifError(hidden.error);
  assert.deepEqual(hidden.data, []);
  await rpc(
    f.admin,
    "catalogue_identity_command",
    await identityPacket(f, { action: "reactivate" }),
  );
  const active = await identityContext(f);
  assert.equal(active.source.product_id, f.products[0]);
  assert.equal(active.source.is_active, true);
  assert.deepEqual(active.source.stock, context.source.stock);
  assert.equal(active.eventTotal, 2);
  assert.equal(identityPhysicalState(f), before);
});

test("a different-unit successor never merges identities, physical balances, document lines or canonical history", async () => {
  const f = await catalogueIdentityFixture(),
    before = identityPhysicalState(f);
  const result = await rpc(
    f.admin,
    "catalogue_identity_command",
    await identityPacket(f, { successor: f.successorId }),
  );
  assert.equal(result.result.source.unit, "unidade");
  assert.equal(result.result.successor.unit, "mL");
  assert.notEqual(
    result.result.source.product_id,
    result.result.successor.product_id,
  );
  const after = await identityContext(f, f.successorId);
  assert.equal(after.guidance.successor_product_id, f.successorId);
  assert.equal(after.source.stock.FAMILY, "4.000000");
  assert.equal(after.source.stock.CARE_TEAM, "4.000000");
  assert.equal(Number(after.successor.stock.FAMILY), 9.5);
  assert.equal(identityPhysicalState(f), before);
  const event = after.events[0];
  assert.equal(event.actor_id, fixtures.adminA.id);
  assert.ok(event.reason.length >= 3);
  assert.equal(
    JSON.stringify(event).includes('"stock"'),
    false,
    "Shared identity history cannot disclose an earlier actor's balances",
  );
  const delegated = await actor("professional", f.patient);
  sql(
    `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${sqlLiteral(f.patient)},${sqlLiteral(fixtures.professional.id)},'catalog.manage',true);`,
  );
  const limited = await identityContext(f, f.successorId, delegated);
  assert.equal(limited.source.stock.FAMILY, null);
  assert.equal(limited.source.stock.CARE_TEAM, "4.000000");
  assert.equal(JSON.stringify(limited.events).includes('"stock"'), false);
  assert.equal(
    (await rpc(delegated, "patient_capabilities", { p_patient: f.patient }))[
      "access.manage"
    ],
    false,
  );
  await rpc(
    delegated,
    "catalogue_identity_command",
    await identityPacket(f, { action: "reactivate", client: delegated }),
  );
  assert.equal(identityPhysicalState(f), before);
});

test("own exact retirement key recovers after write loss, while a new intent, another patient and read loss remain denied", async () => {
  const f = await catalogueIdentityFixture(),
    packet = await identityPacket(f, { successor: f.successorId });
  const first = await rpc(f.admin, "catalogue_identity_command", packet),
    before = identityState(f);
  sql(
    `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${sqlLiteral(f.patient)},${sqlLiteral(fixtures.adminA.id)},'catalog.manage',false);`,
  );
  const replay = await rpc(f.admin, "catalogue_identity_command", packet);
  assert.equal(replay.replayed, true);
  assert.deepEqual(replay.result, first.result);
  assert.equal(identityState(f), before);
  assert.equal(
    (
      await f.admin.rpc("catalogue_identity_command", {
        ...packet,
        p_key: randomUUID(),
      })
    ).error?.code,
    "42501",
  );
  assert.equal(
    (
      await f.admin.rpc("catalogue_identity_command", {
        ...packet,
        p_body: {
          ...packet.p_body,
          reason: "Outro motivo com a chave anterior",
        },
      })
    ).error?.code,
    "23505",
  );
  assert.equal(
    (
      await f.admin.rpc("catalogue_identity_command", {
        ...packet,
        p_patient: "20000000-0000-4000-8000-000000000002",
      })
    ).error?.code,
    "42501",
  );
  sql(
    `update public.care_recipient_memberships set status='revoked' where care_recipient_id=${sqlLiteral(f.patient)} and user_id=${sqlLiteral(fixtures.adminA.id)};`,
  );
  assert.equal(
    (await f.admin.rpc("catalogue_identity_command", packet)).error?.code,
    "42501",
  );
  assert.equal(identityState(f), before);
});

test("competing catalogue decisions use their reviewed reference and leave exactly one immutable own act", async () => {
  const f = await catalogueIdentityFixture(),
    packet = await identityPacket(f),
    physical = identityPhysicalState(f);
  const results = await Promise.all([
    f.admin.rpc("catalogue_identity_command", packet),
    f.admin.rpc("catalogue_identity_command", {
      ...packet,
      p_key: randomUUID(),
    }),
  ]);
  assert.equal(results.filter((r) => !r.error).length, 1);
  assert.equal(results.find((r) => r.error)?.error.code, "PT409");
  const context = await identityContext(f);
  assert.equal(context.eventTotal, 1);
  assert.equal(identityPhysicalState(f), physical);
  assert.equal(
    (
      await f.admin
        .from("catalogue_identity_events")
        .update({ reason: "Sobrescrever história" })
        .eq("id", context.events[0].id)
    ).error?.code,
    "42501",
  );
  assert.equal(
    (
      await f.admin.from("catalogue_successors").insert({
        care_recipient_id: f.patient,
        product_id: f.products[0],
        successor_product_id: f.successorId,
      })
    ).error?.code,
    "42501",
  );
});

for (const wait of ["stock", "catalogue", "profile"]) {
  test(`catalogue identity mutation rolls back when authority is revoked during an observed ${wait} wait`, async () => {
    const f = await catalogueIdentityFixture();
    sql(
      `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${sqlLiteral(f.patient)},${sqlLiteral(fixtures.adminA.id)},'catalog.manage',true);`,
    );
    const packet = await identityPacket(f, { successor: f.successorId }),
      before = identityState(f),
      physical = identityPhysicalState(f);
    const send = () => f.admin.rpc("catalogue_identity_command", packet),
      revoke = async () => {
        if (wait === "profile") {
          // Catalogue writes already hold workspace revision rows. A capability
          // update invalidates those same rows and would create a test-only
          // lock cycle. Revoke the real pending request's Auth session instead.
          assert.ifError(
            (await f.admin.auth.signOut({ scope: "local" })).error,
          );
        } else
          sql(
            `update public.capability_overrides set enabled=false where care_recipient_id=${sqlLiteral(f.patient)} and subject_user=${sqlLiteral(fixtures.adminA.id)} and capability='catalog.manage';`,
          );
      };
    const response =
      wait === "stock"
        ? await whileAdvisoryWaits("stock:" + f.patient, send, revoke)
        : await whileRowWaits(
            wait === "profile" ? "profiles" : "catalogue",
            wait === "profile"
              ? fixtures.adminA.id
              : { patient: f.patient, product: f.products[0] },
            "catalogue_identity_command",
            send,
            revoke,
          );
    assert.equal(response.error?.code, "42501", response.error?.message);
    assert.equal(identityState(f), before);
    assert.equal(identityPhysicalState(f), physical);
  });
}

test("invalid identity metadata, missing reference and foreign material cannot create partial retirement or bypass narrow grants", async () => {
  const f = await catalogueIdentityFixture(),
    packet = await identityPacket(f),
    before = identityState(f);
  for (const changed of [
    { p_reference: null },
    { p_successor: f.products[0] },
    { p_successor: "material-estrangeiro" },
    { p_body: { action: "retire", reason: "x" } },
    { p_body: { action: "retire", reason: "😀".repeat(501) } },
    { p_body: { ...packet.p_body, actorId: fixtures.family.id } },
  ]) {
    const result = await f.admin.rpc("catalogue_identity_command", {
      ...packet,
      ...changed,
      p_key: randomUUID(),
    });
    assert.equal(result.error?.code, "22023", JSON.stringify(changed));
    assert.equal(identityState(f), before);
  }
  const grants = JSON.parse(
    sql(
      `select jsonb_build_object('anonymous',has_function_privilege('anon','public.catalogue_identity_command(uuid,text,text,text,jsonb,uuid)','execute'),'service',has_function_privilege('service_role','public.catalogue_identity_command(uuid,text,text,text,jsonb,uuid)','execute'),'authenticated',has_function_privilege('authenticated','public.catalogue_identity_command(uuid,text,text,text,jsonb,uuid)','execute'),'helper',has_function_privilege('authenticated','private.catalogue_identity_snapshot(uuid,text,text)','execute'));`,
    ),
  );
  assert.deepEqual(grants, {
    anonymous: false,
    service: false,
    authenticated: true,
    helper: false,
  });
});

test("clearing successor guidance invalidates new selections without touching physical history", async () => {
  const f = await catalogueIdentityFixture();
  await rpc(
    f.admin,
    "catalogue_identity_command",
    await identityPacket(f, { successor: f.successorId }),
  );
  const physical = identityPhysicalState(f),
    revision = () =>
      BigInt(
        sql(
          `select revision from private.workspace_revisions where user_id=${sqlLiteral(fixtures.professional.id)};`,
        ),
      );
  const before = revision();
  await rpc(
    f.admin,
    "catalogue_identity_command",
    await identityPacket(f, { action: "clear_successor" }),
  );
  assert.ok(
    revision() > before,
    "A guidance-only change must invalidate other authorized consumers' catalogue views",
  );
  const context = await identityContext(f);
  assert.equal(context.guidance, null);
  assert.equal(context.source.is_active, false);
  assert.equal(identityPhysicalState(f), physical);
  assert.equal(context.eventTotal, 2);
  await rpc(
    f.admin,
    "catalogue_identity_command",
    await identityPacket(f, { successor: f.successorId }),
  );
  // A legacy reactivation preserves the recorded edge; a later new declaration
  // must still refuse a cycle instead of relying only on active/inactive flags.
  await rpc(f.admin, "admin_upsert_recipient_product", {
    p_care_recipient_id: f.patient,
    p_product_id: f.products[0],
    p_name: context.source.name,
    p_category: context.source.category,
    p_unit: context.source.unit,
    p_aliases: context.source.aliases,
    p_is_active: true,
  });
  const cycle = await rpc(f.admin, "catalogue_identity_context", {
      p_patient: f.patient,
      p_product: f.successorId,
      p_successor: f.products[0],
    }),
    beforeCycle = identityState(f);
  const rejected = await f.admin.rpc("catalogue_identity_command", {
    p_patient: f.patient,
    p_product: f.successorId,
    p_successor: f.products[0],
    p_reference: cycle.referenceHash,
    p_body: {
      action: "retire",
      reason:
        "A indicação inversa não pode transformar o histórico em um ciclo",
    },
    p_key: randomUUID(),
  });
  assert.equal(rejected.error?.code, "22023");
  assert.equal(identityState(f), beforeCycle);
  assert.equal(identityPhysicalState(f), physical);
});
