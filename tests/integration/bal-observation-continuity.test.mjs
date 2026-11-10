import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import {
  privateDraftFixture,
  balContent,
  savePacket,
  draftContext,
  draftDevice,
  officialState,
  rpc,
  actor,
} from "./private-draft-fixtures.mjs";

test("BAL reference history remains private across Auth sessions and never becomes a physical observation", async () => {
  const f = await privateDraftFixture(),
    before = officialState(f),
    old = balContent(f);
  old.counts[f.products[0]] = "1,";
  old.observationTimes[f.products[0]] = "2026-11-05T09:00:00-03:00";
  const content = {
    ...balContent(f),
    counts: {},
    observationTimes: {},
    previousObservations: [old],
  };
  const saved = await rpc(
    f.pro,
    "creation_draft_command",
    savePacket(f, "BAL", content),
  );
  const second = await draftDevice(f.patient),
    read = await draftContext(f, "BAL", second);
  assert.equal(read.id, saved.id);
  assert.deepEqual(read.content, content);
  assert.equal(officialState(f), before);
  const peer = await actor("adminA", f.patient);
  assert.equal(await draftContext(f, "BAL", peer), null);
  const denied = await peer.rpc(
    "creation_draft_command",
    savePacket(f, "BAL", content, saved.id, saved.revision),
  );
  assert.equal(denied.error?.code, "42501");
  assert.deepEqual((await draftContext(f, "BAL")).content, content);
  assert.equal(officialState(f), before);
});

test("native BAL history rejects nested, oversized, foreign-target and malformed snapshots atomically", async () => {
  const f = await privateDraftFixture(),
    old = balContent(f),
    before = officialState(f);
  const bad = [
    { ...old, previousObservations: {} },
    { ...old, previousObservations: Array(11).fill(old) },
    { ...old, previousObservations: [{ ...old, previousObservations: [] }] },
    {
      ...old,
      previousObservations: [
        { ...old, context: { ...old.context, documentId: randomUUID() } },
      ],
    },
    {
      ...old,
      previousObservations: [{ ...old, counts: { [f.products[0]]: 1 } }],
    },
    { ...old, previousObservations: [{ ...old, notes: "x".repeat(3001) }] },
    {
      ...old,
      previousObservations: Array(10).fill({
        ...old,
        materials: Array(1000).fill({
          id: f.products[0],
          name: "x".repeat(200),
          unit: "unidade",
          quantityDecimals: 0,
        }),
      }),
    },
  ];
  for (const content of bad) {
    const result = await f.pro.rpc(
      "creation_draft_command",
      savePacket(f, "BAL", content),
    );
    assert.equal(result.error?.code, "22023");
    assert.equal(await draftContext(f, "BAL"), null);
    assert.equal(officialState(f), before);
  }
});

test("BAL commit uses the explicit native payload and does not publish previous private observations", async () => {
  const f = await privateDraftFixture(),
    old = balContent(f);
  old.counts[f.products[0]] = "999";
  old.notes = "Private earlier note";
  const reference = await rpc(f.pro, "balance_count_reference", {
    p_patient: f.patient,
  });
  const content = {
    ...balContent(f),
    counts: Object.fromEntries(f.products.map((id) => [id, "0"])),
    observationTimes: {},
    notes: "New physical count",
    context: { ...old.context, referenceRevision: reference.revision },
    previousObservations: [old],
  };
  const saved = await rpc(
    f.pro,
    "creation_draft_command",
    savePacket(f, "BAL", content),
  );
  const before = officialState(f),
    key = randomUUID(),
    packet = {
      p_id: saved.id,
      p_expected: saved.revision,
      p_target: null,
      p_key: key,
      p_body: {
        action: "create_bal",
        payload: {
          lines: f.products.map((productId) => ({ productId, quantity: "0" })),
          notes: content.notes,
          balanceReferenceRevision: reference.revision,
        },
      },
    };
  assert.equal(
    (await draftContext(f, "BAL")).content.previousObservations[0].counts[
      f.products[0]
    ],
    "999",
  );
  assert.equal(officialState(f), before);
  const result = await rpc(f.pro, "commit_creation_draft", packet);
  assert.equal(result.result.payload.notes, content.notes);
  assert.equal(result.result.payload.previousObservations, undefined);
  assert.ok(result.result.lines.every((l) => Number(l.quantity) === 0));
  const replay = await rpc(f.pro, "commit_creation_draft", packet);
  assert.equal(replay.replayed, true);
  assert.deepEqual(replay.result, result.result);
  assert.equal(replay.id, result.id);
  assert.equal(replay.revision, result.revision);
});
