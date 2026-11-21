import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { actor, rpc, fixtures } from "./v4-fixtures.mjs";
import { draftDevice } from "./private-draft-fixtures.mjs";
import { whileAdvisoryWaits } from "./lock-barrier.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
import {
  entOperationFixture,
  entPacket,
  entCommit,
  entFacts,
  entSend,
  entStages,
} from "./ent-operation-fixtures.mjs";
const read = (client, f, purpose) =>
  rpc(client, "supply_draft_context", {
    p_patient: f.patient,
    p_kind: "ENT",
    p_purpose: purpose,
    p_target: f.document.id,
  });
const mode = (purpose) =>
  purpose === "resolve"
    ? "disputed"
    : ["refuse_cancellation", "withdraw_cancellation"].includes(purpose)
      ? "request"
      : "pending";

for (const purpose of Object.keys(entStages))
  test(`ENT ${purpose} preserves two Auth devices, CAS and private ownership then consumes one bound result`, async () => {
    const f = await entOperationFixture(mode(purpose)),
      name = purpose === "refuse_cancellation" ? "professional" : "adminA",
      owner = name === "professional" ? f.pro : f.admin,
      peer = await draftDevice(f.patient, name),
      other = await actor("global", f.patient),
      packet = entPacket(f, purpose),
      before = entFacts(f);
    const saved = await rpc(owner, "supply_draft_command", packet);
    assert.equal((await read(peer, f, purpose)).id, saved.id);
    assert.equal(await read(other, f, purpose), null);
    assert.equal(entFacts(f), before);
    assert.equal(
      (
        await other.rpc("supply_draft_command", {
          ...packet,
          p_id: saved.id,
          p_expected: 1,
          p_key: randomUUID(),
        })
      ).error?.code,
      "42501",
    );
    const races = await Promise.all(
      [owner, peer].map((client, i) =>
        client.rpc("supply_draft_command", {
          ...packet,
          p_id: saved.id,
          p_expected: 1,
          p_key: randomUUID(),
          p_body: {
            ...packet.p_body,
            content: {
              ...packet.p_body.content,
              fields: {
                ...packet.p_body.content.fields,
                reason: "Edição concorrente fictícia " + i,
              },
            },
          },
        }),
      ),
    );
    assert.equal(races.filter((r) => !r.error).length, 1);
    assert.equal(races.find((r) => r.error).error.code, "PT409");
    assert.equal(entFacts(f), before);
    const current = await read(owner, f, purpose),
      command = entCommit(f, purpose, current);
    if (purpose === "reassign")
      assert.equal(
        (
          await owner.rpc("commit_supply_draft", {
            ...command,
            p_body: {
              ...command.p_body,
              body: {
                ...command.p_body.body,
                recipientId: f.document.recipient_id,
              },
            },
          })
        ).error?.code,
        "22023",
      );
    if (purpose === "resolve")
      for (const change of [
        { lineId: f.document.lines[0].id },
        { resolution: "missing" },
      ])
        assert.equal(
          (
            await owner.rpc("commit_supply_draft", {
              ...command,
              p_body: {
                ...command.p_body,
                body: { ...command.p_body.body, ...change },
              },
            })
          ).error?.code,
          "22023",
        );
    if (["refuse_cancellation", "withdraw_cancellation"].includes(purpose))
      assert.equal(
        (
          await owner.rpc("commit_supply_draft", {
            ...command,
            p_body: {
              ...command.p_body,
              body: { ...command.p_body.body, requestId: randomUUID() },
            },
          })
        ).error?.code,
        "22023",
      );
    assert.equal(
      (
        await owner.rpc("commit_supply_draft", {
          ...command,
          p_body: {
            ...command.p_body,
            expectedVersion: f.document.version + 1,
          },
        })
      ).error?.code,
      "PT409",
    );
    assert.equal(entFacts(f), before);
    const result = await rpc(owner, "commit_supply_draft", command),
      after = entFacts(f);
    assert.equal(result.state, "consumed");
    assert.equal((await read(owner, f, purpose)).content, null);
    assert.deepEqual(
      (await rpc(owner, "commit_supply_draft", command)).result,
      result.result,
    );
    assert.equal(entFacts(f), after);
    assert.equal(
      (
        await owner.rpc("commit_supply_draft", {
          ...command,
          p_key: randomUUID(),
        })
      ).error?.code,
      "PT409",
    );
    if (purpose === "reassign")
      assert.equal(result.result.recipient_id, fixtures.global.id);
    if (purpose === "resolve")
      assert.equal(
        sql(
          `select reconciled_quantity=1 from public.document_lines where id=${sqlLiteral(f.document.lines[1].id)};`,
        ),
        "t",
      );
    if (purpose === "cancel") assert.equal(result.result.status, "cancelled");
    if (["refuse_cancellation", "withdraw_cancellation"].includes(purpose))
      assert.equal(
        result.result.deliveryCancellation.request.status,
        purpose === "refuse_cancellation" ? "refused" : "withdrawn",
      );
    await rpc(owner, "supply_draft_command", {
      ...packet,
      p_id: saved.id,
      p_expected: result.revision,
      p_body: { action: "acknowledge" },
      p_key: randomUUID(),
    });
    assert.equal(await read(owner, f, purpose), null);
    assert.equal(entFacts(f), after);
  });

test("ENT private cancellation after acceptance only opens the bilateral request and never returns stock", async () => {
  const f = await entOperationFixture("accepted"),
    packet = entPacket(f, "cancel"),
    saved = await rpc(f.admin, "supply_draft_command", packet),
    stock = sql(
      `select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${sqlLiteral(f.patient)};`,
    );
  const result = await rpc(
    f.admin,
    "commit_supply_draft",
    entCommit(f, "cancel", saved),
  );
  assert.equal(result.result.status, "cancellation_pending");
  assert.equal(
    result.result.deliveryCancellation.request.requestedBy,
    fixtures.adminA.id,
  );
  assert.equal(
    sql(
      `select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${sqlLiteral(f.patient)};`,
    ),
    stock,
  );
});

test("ENT clinical and personal authority cannot be supplied by draft fields or another manager", async () => {
  const f = await entOperationFixture("request"),
    global = await actor("global", f.patient),
    before = entFacts(f);
  assert.equal(
    (await f.pro.rpc("supply_draft_command", entPacket(f, "reassign"))).error
      ?.code,
    "42501",
  );
  assert.equal(
    (
      await f.admin.rpc(
        "supply_draft_command",
        entPacket(f, "refuse_cancellation"),
      )
    ).error?.code,
    "42501",
  );
  assert.equal(
    (
      await global.rpc(
        "supply_draft_command",
        entPacket(f, "withdraw_cancellation"),
      )
    ).error?.code,
    "42501",
  );
  sql(
    `update public.care_recipient_memberships set role='reader' where care_recipient_id=${sqlLiteral(f.patient)} and user_id=${sqlLiteral(fixtures.adminA.id)};`,
  );
  assert.equal(
    sql(
      `select private.member_can(${sqlLiteral(f.patient)},${sqlLiteral(fixtures.adminA.id)},'ent.read');`,
    ),
    "t",
  );
  assert.equal(
    (await f.admin.rpc("supply_draft_command", entPacket(f, "resolve"))).error
      ?.code,
    "42501",
  );
  assert.equal(entFacts(f), before);
});

test("ENT old personal receipt can be discarded by its owner after reassignment but another admin cannot discard it", async () => {
  const f = await entOperationFixture(),
    packet = {
      ...entPacket(f, "reassign"),
      p_purpose: "receive",
      p_body: {
        action: "save",
        content: {
          documentVersion: f.document.version,
          fields: {},
          divergentIds: [],
          materials: [],
        },
        navigation: { version: 1, stage: "receipt" },
      },
    },
    saved = await rpc(f.pro, "supply_draft_command", packet);
  await entSend(f.admin, f.document, "reassign", {
    recipientId: fixtures.global.id,
    reason: "Troca autorizada antes do aceite",
  });
  const after = entFacts(f);
  assert.equal(
    (
      await f.pro.rpc("supply_draft_command", {
        ...packet,
        p_id: saved.id,
        p_expected: 1,
        p_key: randomUUID(),
      })
    ).error?.code,
    "42501",
  );
  assert.equal(
    (
      await f.admin.rpc("supply_draft_command", {
        ...packet,
        p_id: saved.id,
        p_expected: 1,
        p_body: { action: "discard" },
        p_key: randomUUID(),
      })
    ).error?.code,
    "42501",
  );
  await rpc(f.pro, "supply_draft_command", {
    ...packet,
    p_id: saved.id,
    p_expected: 1,
    p_body: { action: "discard" },
    p_key: randomUUID(),
  });
  assert.equal(await read(f.pro, f, "receive"), null);
  assert.equal(entFacts(f), after);
});

test("ENT private discard still requires live patient read and owner identity", async () => {
  const f = await entOperationFixture(),
    packet = entPacket(f, "reassign"),
    saved = await rpc(f.admin, "supply_draft_command", packet),
    before = entFacts(f);
  sql(
    `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${sqlLiteral(f.patient)},${sqlLiteral(fixtures.adminA.id)},'ent.read',false);`,
  );
  assert.equal(
    (
      await f.admin.rpc("supply_draft_command", {
        ...packet,
        p_id: saved.id,
        p_expected: 1,
        p_body: { action: "discard" },
        p_key: randomUUID(),
      })
    ).error?.code,
    "42501",
  );
  assert.equal(entFacts(f), before);
});

test("ENT cancellation confirmation rechecks revoked authority after its observed private slot lock", async () => {
  const f = await entOperationFixture("accepted"),
    packet = entPacket(f, "cancel"),
    saved = await rpc(f.admin, "supply_draft_command", packet),
    command = entCommit(f, "cancel", saved),
    before = entFacts(f);
  const result = await whileAdvisoryWaits(
    `supply-draft-slot:${fixtures.adminA.id}:${f.patient}:ENT:cancel:${f.document.id}`,
    () => f.admin.rpc("commit_supply_draft", command),
    () =>
      sql(
        `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${sqlLiteral(f.patient)},${sqlLiteral(fixtures.adminA.id)},'ent.cancel',false);`,
      ),
  );
  assert.equal(result.error?.code, "42501");
  assert.equal(entFacts(f), before);
  assert.equal((await read(f.admin, f, "cancel")).revision, 1);
});
