import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { rpc } from "./v4-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { whileAdvisoryWaits } from "./lock-barrier.mjs";
import {
  declarationDraftFixture,
  declarationPeer,
  declarationPacket,
  declarationCommit,
  declarationRead,
  declarationBody,
  declarationFacts,
  declarationPurposes,
} from "./transfer-declaration-draft-fixtures.mjs";
for (const source of ["FAMILY", "CARE_TEAM"]) {
  test(
    "private transfer declaration " +
      source +
      " has no fake target/version,saves partial values across Auth sessions with CAS and no official effect",
    async () => {
      const f = await declarationDraftFixture(source),
        peer = await declarationPeer(f),
        packet = declarationPacket(f),
        before = declarationFacts(f);
      packet.p_body.content.fields[f.products[0] + ":transferQuantity"] = "0,";
      const saved = await rpc(f.client, "supply_draft_command", packet);
      const read = await declarationRead(peer, f);
      assert.equal(read.targetDocumentId, null);
      assert.equal(read.content.documentVersion, null);
      assert.equal(
        read.content.fields[f.products[0] + ":transferQuantity"],
        "0,",
      );
      assert.equal(await declarationRead(f.initiator.client, f), null);
      const race = await Promise.all(
        [f.client, peer].map((client, i) =>
          client.rpc("supply_draft_command", {
            ...packet,
            p_id: saved.id,
            p_expected: saved.revision,
            p_key: randomUUID(),
            p_body: {
              ...packet.p_body,
              content: {
                ...packet.p_body.content,
                fields: {
                  ...packet.p_body.content.fields,
                  reason: "Texto próprio " + i,
                },
              },
            },
          }),
        ),
      );
      assert.equal(race.filter((r) => !r.error).length, 1);
      assert.equal(race.find((r) => r.error).error.code, "PT409");
      assert.equal(declarationFacts(f), before);
      for (const content of [
        { ...packet.p_body.content, documentVersion: 1 },
        {
          ...packet.p_body.content,
          fields: {
            ...packet.p_body.content.fields,
            source: source === "FAMILY" ? "CARE_TEAM" : "FAMILY",
          },
        },
        {
          ...packet.p_body.content,
          materials: [
            ...packet.p_body.content.materials,
            ...packet.p_body.content.materials,
          ],
        },
      ]) {
        assert.ok(
          (
            await f.client.rpc("supply_draft_command", {
              ...packet,
              p_key: randomUUID(),
              p_body: { action: "save", content },
            })
          ).error,
        );
        assert.equal(declarationFacts(f), before);
      }
    },
  );
  test(
    "private transfer declaration " +
      source +
      " seals every submitted fact and consumes once into a new ENT without dispatch or receipt",
    async () => {
      const f = await declarationDraftFixture(source),
        saved = await rpc(
          f.client,
          "supply_draft_command",
          declarationPacket(f),
        ),
        before = declarationFacts(f),
        body = declarationBody(f);
      for (const change of [
        { source: source === "FAMILY" ? "CARE_TEAM" : "FAMILY" },
        { counterpartyId: randomUUID() },
        { recipientId: randomUUID() },
        { originDocumentId: randomUUID() },
        { referenceHash: "00".repeat(32) },
        { reason: body.reason + " alterada" },
        { lines: [{ productId: f.products[0], quantity: "3" }] },
        { lines: [{ productId: f.products[1], quantity: "2" }] },
      ]) {
        assert.equal(
          (
            await f.client.rpc(
              "commit_supply_draft",
              declarationCommit(f, saved, { ...body, ...change }),
            )
          ).error?.code,
          "22023",
        );
        assert.equal(declarationFacts(f), before);
      }
      assert.ok(
        (
          await f.client.rpc("commit_supply_draft", {
            ...declarationCommit(f, saved),
            p_target: randomUUID(),
          })
        ).error,
      );
      const command = declarationCommit(f, saved),
        race = await Promise.all(
          [f.client, await declarationPeer(f)].map((client) =>
            client.rpc("commit_supply_draft", command),
          ),
        );
      assert.ok(race.every((r) => !r.error));
      assert.equal(race.filter((r) => r.data.replayed).length, 1);
      const result = race[0].data;
      assert.equal(result.state, "consumed");
      assert.notEqual(result.consumedDocumentId, f.origin.id);
      assert.equal(result.consumedDocumentId, result.result.id);
      assert.equal(result.result.transfer.state, "pending");
      assert.equal(result.result.transfer.agreement, null);
      assert.equal(result.result.transfer.dispatchedAt, null);
      assert.equal(result.result.receipts.length, 0);
      assert.deepEqual(
        JSON.parse(declarationFacts(f)).ledger,
        JSON.parse(before).ledger,
      );
      const row = await declarationRead(f.client, f);
      assert.equal(row.content, null);
      assert.equal(row.targetDocumentId, null);
      assert.equal(row.consumedDocumentId, result.result.id);
      const after = declarationFacts(f);
      sql(
        "insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(" +
          q(f.patient) +
          "," +
          q(f.writerId) +
          ",'ent.create',false);",
      );
      assert.equal(
        (await rpc(f.client, "commit_supply_draft", command)).replayed,
        true,
      );
      await rpc(f.client, "supply_draft_command", {
        ...declarationPacket(f),
        p_id: row.id,
        p_expected: row.revision,
        p_key: randomUUID(),
        p_body: { action: "acknowledge" },
      });
      assert.equal(await declarationRead(f.client, f), null);
      assert.equal(declarationFacts(f), after);
    },
  );
  test(
    "private transfer declaration " +
      source +
      " rechecks authority after the private journal and rolls back creation,result and journal",
    async () => {
      const f = await declarationDraftFixture(source),
        saved = await rpc(
          f.client,
          "supply_draft_command",
          declarationPacket(f),
        ),
        before = declarationFacts(f),
        command = declarationCommit(f, saved);
      const name = "probe_transfer_declare_" + randomUUID().replaceAll("-", "");
      sql(
        "create function private." +
          name +
          "() returns trigger language plpgsql security definer set search_path='' as $$begin if new.draft_id=" +
          q(saved.id) +
          "::uuid then insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(" +
          q(f.patient) +
          "," +
          q(f.writerId) +
          ",'ent.create',false);end if;return new;end;$$;create trigger " +
          name +
          " after insert on private.creation_draft_commands for each row execute function private." +
          name +
          "();",
      );
      try {
        assert.equal(
          (await f.client.rpc("commit_supply_draft", command)).error?.code,
          "42501",
        );
        assert.equal(declarationFacts(f), before);
        assert.equal(
          (await declarationRead(f.client, f)).revision,
          saved.revision,
        );
        assert.equal(
          sql(
            "select count(*) from private.creation_draft_commands where idempotency_key=" +
              q(command.p_key) +
              ";",
          ),
          "0",
        );
      } finally {
        sql(
          "drop trigger " +
            name +
            " on private.creation_draft_commands;drop function private." +
            name +
            "();",
        );
      }
    },
  );
}
test("direction-specific declaration slots cannot overwrite the other custody and keep own discard after source read loss", async () => {
  const f = await declarationDraftFixture("CARE_TEAM"),
    packet = declarationPacket(f),
    first = await rpc(f.client, "supply_draft_command", packet);
  const other = {
    ...f,
    source: "FAMILY",
    purpose: declarationPurposes.FAMILY,
    reference: await rpc(f.client, "transfer_preparation", {
      p_patient: f.patient,
      p_source: "FAMILY",
    }),
  };
  const second = await rpc(
    f.client,
    "supply_draft_command",
    declarationPacket(other),
  );
  assert.notEqual(first.id, second.id);
  assert.equal((await declarationRead(f.client, f)).id, first.id);
  assert.equal((await declarationRead(f.client, other)).id, second.id);
  assert.ok(
    (
      await f.client.rpc("supply_draft_command", {
        ...declarationPacket(other),
        p_id: first.id,
        p_expected: first.revision,
        p_key: randomUUID(),
      })
    ).error,
  );
  const before = declarationFacts(f);
  sql(
    "insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(" +
      q(f.patient) +
      "," +
      q(f.writerId) +
      ",'stock.team.read',false);",
  );
  assert.equal((await declarationRead(f.client, f)).id, first.id);
  assert.equal(
    (
      await f.client.rpc("supply_draft_command", {
        ...packet,
        p_id: first.id,
        p_expected: first.revision,
        p_key: randomUUID(),
      })
    ).error?.code,
    "42501",
  );
  await rpc(f.client, "supply_draft_command", {
    ...packet,
    p_id: first.id,
    p_expected: first.revision,
    p_key: randomUUID(),
    p_body: { action: "discard" },
  });
  assert.equal(declarationFacts(f), before);
});
test("private transfer declaration rechecks source authority after an observed private slot wait", async () => {
  const f = await declarationDraftFixture(),
    saved = await rpc(f.client, "supply_draft_command", declarationPacket(f)),
    before = declarationFacts(f);
  const result = await whileAdvisoryWaits(
    "supply-draft-slot:" +
      f.writerId +
      ":" +
      f.patient +
      ":ENT:" +
      f.purpose +
      ":new",
    () => f.client.rpc("commit_supply_draft", declarationCommit(f, saved)),
    () =>
      sql(
        "insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(" +
          q(f.patient) +
          "," +
          q(f.writerId) +
          ",'stock.team.read',false);",
      ),
  );
  assert.equal(result.error?.code, "42501");
  assert.equal(declarationFacts(f), before);
});
