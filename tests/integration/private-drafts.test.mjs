import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID, createHash } from "node:crypto";
import {
  privateDraftFixture,
  reqContent,
  balContent,
  savePacket,
  draftContext,
  confirmPacket,
  officialState,
  officialWithReadyFile,
  draftDevice,
  rpc,
  fixtures,
  actor,
} from "./private-draft-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
import { whileAdvisoryWaits, whileRowWaits } from "./lock-barrier.mjs";

test("ten typed partial saves preserve private observations across real Auth devices without any protocol or official effect", async () => {
  const f = await privateDraftFixture(),
    before = officialState(f);
  let current = null;
  for (let i = 0; i < 10; i++) {
    const data = reqContent(f);
    data.lines[0].currentStock = i === 9 ? "1," : "0";
    data.observations = ["Edição privada " + i];
    current = await rpc(
      f.pro,
      "creation_draft_command",
      savePacket(
        f,
        "REQ",
        data,
        current?.id ?? null,
        current?.revision ?? null,
      ),
    );
    assert.equal(current.revision, i + 1);
    assert.equal(officialState(f), before);
  }
  const other = await draftDevice(f.patient),
    restored = await draftContext(f, "REQ", other);
  assert.equal(restored.id, current.id);
  assert.equal(restored.revision, 10);
  assert.equal(restored.content.lines[0].currentStock, "1,");
  assert.equal(
    restored.content.lines[0].stockObservationAt,
    reqContent(f).lines[0].stockObservationAt,
  );
  assert.equal(await draftContext(f, "BAL", other), null);
  const peer = await actor("adminA", f.patient);
  assert.equal(await draftContext(f, "REQ", peer), null);
  const denied = await peer.rpc("creation_draft_command", {
    ...savePacket(f),
    p_id: current.id,
    p_expected: 10,
  });
  assert.equal(denied.error?.code, "42501");
  assert.equal(officialState(f), before);
});

test("two editors at revision five preserve local values on conflict and only an explicit adoption can save seven", async () => {
  const f = await privateDraftFixture(),
    before = officialState(f),
    second = await draftDevice(f.patient);
  let row = null;
  for (let i = 0; i < 5; i++)
    row = await rpc(
      f.pro,
      "creation_draft_command",
      savePacket(
        f,
        "REQ",
        reqContent(f),
        row?.id ?? null,
        row?.revision ?? null,
      ),
    );
  const mine = {
    ...reqContent(f),
    observations: ["Texto do editor B preservado"],
  };
  const six = await rpc(
    f.pro,
    "creation_draft_command",
    savePacket(
      f,
      "REQ",
      { ...reqContent(f), observations: ["Texto novo do editor A"] },
      row.id,
      5,
    ),
  );
  assert.equal(six.revision, 6);
  const failed = await second.rpc(
    "creation_draft_command",
    savePacket(f, "REQ", mine, row.id, 5),
  );
  assert.equal(failed.error?.code, "PT409");
  assert.equal(mine.observations[0], "Texto do editor B preservado");
  const comparison = await draftContext(f, "REQ", second);
  assert.equal(comparison.content.observations[0], "Texto novo do editor A");
  const seven = await rpc(
    second,
    "creation_draft_command",
    savePacket(f, "REQ", mine, row.id, comparison.revision),
  );
  assert.equal(seven.revision, 7);
  assert.equal(
    (await draftContext(f)).content.observations[0],
    mine.observations[0],
  );
  assert.equal(officialState(f), before);
});

test("a private draft commits one official REQ and recovers its result after write loss without allowing later discard", async () => {
  const f = await privateDraftFixture(),
    saved = await rpc(f.pro, "creation_draft_command", savePacket(f)),
    packet = confirmPacket(f, saved);
  const first = await rpc(f.pro, "commit_creation_draft", packet);
  assert.ok(first.consumedDocumentId);
  assert.equal(first.state, "consumed");
  const before = officialState(f),
    context = await draftContext(f);
  assert.equal(context.content, null);
  assert.equal(context.consumedDocumentId, first.consumedDocumentId);
  const discard = {
    ...savePacket(f),
    p_id: saved.id,
    p_expected: first.revision,
    p_body: { action: "discard" },
  };
  assert.equal(
    (await f.pro.rpc("creation_draft_command", discard)).error?.code,
    "PT409",
  );
  assert.equal(officialState(f), before);
  sql(
    `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${sqlLiteral(f.patient)},${sqlLiteral(fixtures.professional.id)},'req.create',false);`,
  );
  const replay = await rpc(f.pro, "commit_creation_draft", packet);
  assert.equal(replay.replayed, true);
  assert.equal(replay.consumedDocumentId, first.consumedDocumentId);
  assert.equal(officialState(f), before);
  assert.equal(
    (
      await f.pro.rpc("commit_creation_draft", {
        ...packet,
        p_key: randomUUID(),
      })
    ).error?.code,
    "42501",
  );
  await rpc(f.pro, "creation_draft_command", {
    ...discard,
    p_key: randomUUID(),
    p_body: { action: "acknowledge" },
  });
  assert.equal(await draftContext(f), null);
  assert.equal(officialState(f), before);
  assert.equal(
    (await rpc(f.pro, "commit_creation_draft", packet)).consumedDocumentId,
    first.consumedDocumentId,
  );
});

test("a private BAL editing draft allocates its first protocol only on confirmation of the existing target", async () => {
  const f = await privateDraftFixture();
  const original = await rpc(f.pro, "create_supply_document", {
    p_patient: f.patient,
    p_type: "BAL",
    p_payload: {
      lines: f.products.map((productId) => ({ productId, quantity: "0" })),
      notes: "Rascunho documental legado fictício preservado",
    },
    p_key: randomUUID(),
    p_draft: true,
  });
  const content = balContent(f);
  content.context.documentId = original.id;
  content.context.documentVersion = original.version;
  const before = officialState(f),
    saved = await rpc(
      f.pro,
      "creation_draft_command",
      savePacket(f, "BAL", content, null, null, original.id),
    );
  assert.equal(officialState(f), before);
  const series = sql(
    `select last_number from public.document_series where care_recipient_id=${sqlLiteral(f.patient)} and type='BAL';`,
  );
  const previous = JSON.parse(
    sql(
      `select jsonb_agg(to_jsonb(e) order by id) from public.document_events e where document_id=${sqlLiteral(original.id)};`,
    ),
  );
  assert.equal(original.protocol, null);
  assert.equal(series, "");
  const result = await rpc(f.pro, "commit_creation_draft", {
    p_id: saved.id,
    p_expected: saved.revision,
    p_target: original.id,
    p_key: randomUUID(),
    p_body: {
      action: "revise_bal",
      payload: {
        lines: f.products.map((productId, i) => ({
          productId,
          quantity: i ? "0" : "2",
        })),
        notes: "Nova contagem pessoal confirmada no alvo existente",
      },
      expectedVersion: original.version,
      recount: false,
      submissionKey: randomUUID(),
    },
  });
  assert.equal(result.consumedDocumentId, original.id);
  assert.notEqual(result.result.status, "draft");
  assert.ok(result.result.version > original.version);
  assert.equal(
    sql(
      `select last_number from public.document_series where care_recipient_id=${sqlLiteral(f.patient)} and type='BAL';`,
    ),
    "1",
  );
  const after = JSON.parse(
    sql(
      `select jsonb_agg(to_jsonb(e) order by id) from public.document_events e where document_id=${sqlLiteral(original.id)};`,
    ),
  );
  assert.deepEqual(
    after.filter((e) => previous.some((x) => x.id === e.id)),
    previous,
  );
});

test("discard clears only the private draft and preserves an existing official REQ and a real ready Storage object", async () => {
  const f = await privateDraftFixture(),
    ready = await officialWithReadyFile(f),
    before = officialState(f),
    saved = await rpc(f.pro, "creation_draft_command", savePacket(f));
  const packet = {
    ...savePacket(f),
    p_id: saved.id,
    p_expected: saved.revision,
    p_body: { action: "discard" },
  };
  const discarded = await rpc(f.pro, "creation_draft_command", packet);
  assert.equal(discarded.state, "discarded");
  assert.equal(await draftContext(f), null);
  assert.equal(officialState(f), before);
  const download = await f.pro.storage
    .from("patient-evidence")
    .download(ready.path);
  assert.ifError(download.error);
  assert.equal(
    createHash("sha256")
      .update(Buffer.from(await download.data.arrayBuffer()))
      .digest("hex"),
    ready.sha256,
  );
  assert.equal(
    sql(
      `select state from public.attachments where id=${sqlLiteral(ready.attachmentId)};`,
    ),
    "ready",
  );
  const next = await rpc(f.pro, "creation_draft_command", savePacket(f));
  assert.notEqual(next.id, saved.id);
  assert.equal(
    (await rpc(f.pro, "creation_draft_command", packet)).id,
    saved.id,
  );
  assert.equal((await draftContext(f)).id, next.id);
  assert.equal(officialState(f), before);
});

test("a physical BAL draft accepts incomplete counts privately and only confirmation creates its real BAL", async () => {
  const f = await privateDraftFixture(),
    before = officialState(f),
    saved = await rpc(
      f.pro,
      "creation_draft_command",
      savePacket(f, "BAL", balContent(f)),
    );
  const other = await draftDevice(f.patient),
    restored = await draftContext(f, "BAL", other);
  assert.equal(restored.id, saved.id);
  assert.equal(restored.content.counts[f.products[0]], "");
  assert.equal(officialState(f), before);
  assert.equal(await draftContext(f, "REQ", other), null);
  const result = await rpc(other, "commit_creation_draft", {
    p_id: saved.id,
    p_expected: saved.revision,
    p_target: null,
    p_key: randomUUID(),
    p_body: {
      action: "create_bal",
      payload: {
        lines: f.products.map((productId, i) => ({
          productId,
          quantity: i ? "0" : "4",
        })),
        notes: "Contagem confirmada em ato próprio",
      },
    },
  });
  assert.ok(result.consumedDocumentId);
  assert.equal(result.result.type, "BAL");
  assert.equal(
    Number(
      result.result.lines.find((x) => x.product_id === f.products[0]).quantity,
    ),
    4,
  );
  assert.equal((await draftContext(f, "BAL", other)).state, "consumed");
});

test("discard and official confirmation share the same reviewed revision and cannot both settle", async () => {
  const f = await privateDraftFixture(),
    saved = await rpc(f.pro, "creation_draft_command", savePacket(f)),
    other = await draftDevice(f.patient),
    packet = confirmPacket(f, saved);
  const discard = {
    ...savePacket(f),
    p_id: saved.id,
    p_expected: saved.revision,
    p_body: { action: "discard" },
  };
  const results = await Promise.all([
    f.pro.rpc("commit_creation_draft", packet),
    other.rpc("creation_draft_command", discard),
  ]);
  assert.equal(results.filter((x) => !x.error).length, 1);
  assert.equal(results.find((x) => x.error).error.code, "PT409");
  const winner = results.find((x) => !x.error).data;
  assert.equal(
    sql(
      `select count(*) from public.operational_documents where care_recipient_id=${sqlLiteral(f.patient)};`,
    ),
    winner.state === "consumed" ? "1" : "0",
  );
  if (winner.state === "consumed") {
    const again = await rpc(f.pro, "commit_creation_draft", packet);
    assert.equal(again.consumedDocumentId, winner.consumedDocumentId);
    await rpc(f.pro, "creation_draft_command", {
      ...discard,
      p_expected: winner.revision,
      p_body: { action: "acknowledge" },
      p_key: randomUUID(),
    });
    assert.equal(await draftContext(f), null);
  }
});

test("save recovery keeps its original revision after a newer save and never bypasses live read or new-write authority", async () => {
  const f = await privateDraftFixture(),
    packet = savePacket(f),
    first = await rpc(f.pro, "creation_draft_command", packet);
  await rpc(
    f.pro,
    "creation_draft_command",
    savePacket(
      f,
      "REQ",
      { ...reqContent(f), observations: ["Outro preenchimento salvo depois"] },
      first.id,
      first.revision,
    ),
  );
  sql(
    `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${sqlLiteral(f.patient)},${sqlLiteral(fixtures.professional.id)},'req.create',false);`,
  );
  const replay = await rpc(f.pro, "creation_draft_command", packet);
  assert.equal(replay.replayed, true);
  assert.equal(replay.revision, 1);
  assert.equal((await draftContext(f)).revision, 2);
  assert.equal(
    (
      await f.pro.rpc("creation_draft_command", {
        ...packet,
        p_key: randomUUID(),
      })
    ).error?.code,
    "42501",
  );
  assert.equal(
    (
      await f.pro.rpc("creation_draft_command", {
        ...packet,
        p_body: {
          action: "save",
          content: { ...reqContent(f), observations: ["Outra intenção"] },
        },
      })
    ).error?.code,
    "23505",
  );
  sql(
    `update public.care_recipient_memberships set status='revoked' where care_recipient_id=${sqlLiteral(f.patient)} and user_id=${sqlLiteral(fixtures.professional.id)};`,
  );
  assert.equal(
    (await f.pro.rpc("creation_draft_command", packet)).error?.code,
    "42501",
  );
  assert.equal(
    (
      await f.pro.rpc("creation_draft_context", {
        p_patient: f.patient,
        p_kind: "REQ",
        p_target: null,
      })
    ).error?.code,
    "42501",
  );
});

test("private draft authority is rechecked after an observed slot wait and a later profile FK wait", async () => {
  for (const late of [false, true]) {
    const f = await privateDraftFixture(),
      packet = savePacket(f),
      before = officialState(f);
    const send = () => f.pro.rpc("creation_draft_command", packet);
    const result = late
      ? await whileRowWaits(
          "profiles",
          fixtures.professional.id,
          "creation_draft_command",
          send,
          async () => assert.ifError((await f.pro.auth.signOut()).error),
        )
      : await whileAdvisoryWaits(
          `creation-draft-slot:${fixtures.professional.id}:${f.patient}:REQ:new`,
          send,
          async () => {
            sql(
              `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${sqlLiteral(f.patient)},${sqlLiteral(fixtures.professional.id)},'req.create',false);`,
            );
          },
        );
    assert.equal(result.error?.code, "42501", result.error?.message);
    assert.equal(officialState(f), before);
    assert.equal(
      sql(
        `select count(*) from private.creation_drafts where care_recipient_id=${sqlLiteral(f.patient)};`,
      ),
      "0",
    );
  }
});

test("private partial content rejects forged authority, untyped observation times and unsupported fields without a saved row", async () => {
  const f = await privateDraftFixture(),
    before = officialState(f);
  const changes = [
    { ...reqContent(f), ownerId: fixtures.adminA.id },
    {
      ...reqContent(f),
      remainingNeed: { requisitionId: "not-an-id", version: 1, reason: "" },
    },
    {
      ...reqContent(f),
      lines: [{ ...reqContent(f).lines[0], requestedQuantity: 4 }],
    },
    {
      ...reqContent(f),
      lines: [{ ...reqContent(f).lines[0], stockObservationAt: "tomorrow" }],
    },
  ];
  for (const content of changes) {
    const result = await f.pro.rpc(
      "creation_draft_command",
      savePacket(f, "REQ", content),
    );
    assert.equal(result.error?.code, "22023", JSON.stringify(content));
    assert.equal(await draftContext(f), null);
    assert.equal(officialState(f), before);
  }
  const grants = JSON.parse(
    sql(
      `select jsonb_build_object('tableRead',has_table_privilege('authenticated','private.creation_drafts','SELECT'),'commandRead',has_table_privilege('authenticated','private.creation_draft_commands','SELECT'),'anon',has_function_privilege('anon','public.creation_draft_context(uuid,text,uuid)','execute'),'service',has_function_privilege('service_role','public.commit_creation_draft(uuid,integer,uuid,jsonb,uuid)','execute'),'helper',has_function_privilege('authenticated','private.validate_creation_draft(text,jsonb,uuid)','execute'));`,
    ),
  );
  assert.deepEqual(grants, {
    tableRead: false,
    commandRead: false,
    anon: false,
    service: false,
    helper: false,
  });
});
