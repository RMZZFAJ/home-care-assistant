import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { actor, fixtures, rpc } from "./v4-fixtures.mjs";
import { draftDevice } from "./private-draft-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { whileAdvisoryWaits } from "./lock-barrier.mjs";
import {
  regularizationStages,
  regularizationFixture,
  regularizationPacket,
  regularizationBody,
  regularizationCommit,
  regularizationRead,
  regularizationFacts,
} from "./regularization-draft-fixtures.mjs";

for (const purpose of Object.keys(regularizationStages)) {
  test(`ENT ${purpose} saves raw private preparation across Auth sessions with CAS,privacy and no official effect`, async () => {
    const f = await regularizationFixture(purpose),
      peer = await draftDevice(f.patient, f.role),
      other = await actor("global", f.patient),
      before = regularizationFacts(f),
      packet = regularizationPacket(f);
    packet.p_body.content.fields[f.document.lines[0].id + ":receivedQuantity"] =
      "0,";
    const saved = await rpc(f.client, "supply_draft_command", packet);
    assert.equal(
      (await regularizationRead(peer, f)).content.fields[
        f.document.lines[0].id + ":receivedQuantity"
      ],
      "0,",
    );
    assert.equal(await regularizationRead(other, f), null);
    assert.equal(
      (
        await other.rpc("supply_draft_command", {
          ...packet,
          p_id: saved.id,
          p_expected: 1,
          p_key: randomUUID(),
          p_body: { action: "discard" },
        })
      ).error?.code,
      "42501",
    );
    const races = await Promise.all(
      [f.client, peer].map((client, i) =>
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
                reason: "Edição concorrente " + i,
              },
            },
          },
        }),
      ),
    );
    assert.equal(races.filter((result) => !result.error).length, 1);
    assert.equal(races.find((result) => result.error).error.code, "PT409");
    assert.equal(regularizationFacts(f), before);
    const reader = await actor("reader", f.patient);
    sql(
      `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${q(f.patient)},${q(fixtures.reader.id)},${q(purpose === "record_regularization_finding" ? "ent.follow_up" : "ent.regularize")},true);`,
    );
    assert.equal(
      (
        await reader.rpc("supply_draft_command", {
          ...packet,
          p_key: randomUUID(),
        })
      ).error?.code,
      "42501",
    );
  });
  test(`ENT ${purpose} binds case,decision,physical declarations and own reason before one official commit and replay`, async () => {
    const f = await regularizationFixture(purpose),
      packet = regularizationPacket(f),
      saved = await rpc(f.client, "supply_draft_command", packet),
      before = regularizationFacts(f);
    const wrong = regularizationBody(f);
    if (purpose === "propose_regularization")
      wrong.reviewerId = fixtures.adminA.id;
    else if (
      ["approve_regularization", "reject_regularization"].includes(purpose)
    )
      wrong.accept = !wrong.accept;
    else wrong.caseId = randomUUID();
    assert.equal(
      (
        await f.client.rpc(
          "commit_supply_draft",
          regularizationCommit(f, saved, wrong),
        )
      ).error?.code,
      "22023",
    );
    assert.equal(regularizationFacts(f), before);
    if (purpose === "propose_regularization") {
      for (const change of [
        (body) => (body.lines[0].receivedQuantity = "1"),
        (body) => body.lines.push(body.lines[0]),
        (body) => (body.lines = []),
      ]) {
        const body = regularizationBody(f);
        change(body);
        assert.equal(
          (
            await f.client.rpc(
              "commit_supply_draft",
              regularizationCommit(f, saved, body),
            )
          ).error?.code,
          "22023",
        );
      }
    }
    const command = regularizationCommit(f, saved),
      applied = await rpc(f.client, "commit_supply_draft", command);
    assert.equal(applied.state, "consumed");
    assert.equal(applied.result.version, f.document.version + 1);
    assert.equal(
      applied.result.workflow_data.acceptedBy,
      f.document.workflow_data.acceptedBy,
    );
    const after = regularizationFacts(f);
    sql(
      `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${q(f.patient)},${q(fixtures[f.role].id)},${q(purpose === "record_regularization_finding" ? "ent.follow_up" : "ent.regularize")},false);`,
    );
    assert.equal(
      (await rpc(f.client, "commit_supply_draft", command)).replayed,
      true,
    );
    assert.equal((await regularizationRead(f.client, f)).state, "consumed");
    await rpc(f.client, "supply_draft_command", {
      ...packet,
      p_id: saved.id,
      p_expected: applied.revision,
      p_key: randomUUID(),
      p_body: { action: "acknowledge" },
    });
    assert.equal(await regularizationRead(f.client, f), null);
    assert.equal(regularizationFacts(f), after);
  });
}
test("ENT regularization private commit rechecks real authority after the observed private slot wait", async () => {
  const f = await regularizationFixture(),
    packet = regularizationPacket(f),
    saved = await rpc(f.client, "supply_draft_command", packet),
    before = regularizationFacts(f);
  const lock = `supply-draft-slot:${fixtures.adminA.id}:${f.patient}:ENT:${f.purpose}:${f.document.id}`;
  const result = await whileAdvisoryWaits(
    lock,
    () => f.client.rpc("commit_supply_draft", regularizationCommit(f, saved)),
    () =>
      sql(
        `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${q(f.patient)},${q(fixtures.adminA.id)},'ent.regularize',false);`,
      ),
  );
  assert.equal(result.error?.code, "42501");
  assert.equal(regularizationFacts(f), before);
  await rpc(f.client, "supply_draft_command", {
    ...packet,
    p_id: saved.id,
    p_expected: saved.revision,
    p_key: randomUUID(),
    p_body: { action: "discard" },
  });
});
test("ENT regularization post-event role revocation rolls back official facts,private result,journal and role", async () => {
  const f = await regularizationFixture(),
    saved = await rpc(
      f.client,
      "supply_draft_command",
      regularizationPacket(f),
    ),
    before = regularizationFacts(f),
    suffix = randomUUID().replaceAll("-", ""),
    name = "probe_regularization_" + suffix;
  sql(
    `create function private.${name}() returns trigger language plpgsql security definer set search_path='' as $$begin if new.document_id=${q(f.document.id)}::uuid and new.action='ent.propose_regularization' then update public.care_recipient_memberships set role='reader' where care_recipient_id=${q(f.patient)}::uuid and user_id=${q(fixtures.adminA.id)}::uuid;end if;return new;end;$$;create trigger ${name} after insert on public.document_events for each row execute function private.${name}();`,
  );
  const command = regularizationCommit(f, saved);
  try {
    assert.equal(
      (await f.client.rpc("commit_supply_draft", command)).error?.code,
      "42501",
    );
    assert.equal(regularizationFacts(f), before);
    assert.equal(
      (await regularizationRead(f.client, f)).revision,
      saved.revision,
    );
    assert.equal(
      sql(
        `select role from public.care_recipient_memberships where care_recipient_id=${q(f.patient)} and user_id=${q(fixtures.adminA.id)};`,
      ),
      "admin",
    );
    assert.equal(
      sql(
        `select count(*) from private.creation_draft_commands where idempotency_key=${q(command.p_key)};`,
      ),
      "0",
    );
  } finally {
    sql(
      `drop trigger if exists ${name} on public.document_events;drop function if exists private.${name}();`,
    );
  }
});

test("ENT private regularization final guard rejects role loss after the private journal,retains own discard and denies revoked reads", async () => {
  const f = await regularizationFixture(),
    packet = regularizationPacket(f),
    saved = await rpc(f.client, "supply_draft_command", packet),
    before = regularizationFacts(f);
  const name =
    "probe_regularization_journal_" + randomUUID().replaceAll("-", "");
  sql(
    `create function private.${name}() returns trigger language plpgsql security definer set search_path='' as $$begin if new.draft_id=${q(saved.id)}::uuid then update public.care_recipient_memberships set role='reader' where care_recipient_id=${q(f.patient)}::uuid and user_id=${q(fixtures.adminA.id)}::uuid;end if;return new;end;$$;create trigger ${name} after insert on private.creation_draft_commands for each row execute function private.${name}();`,
  );
  const command = regularizationCommit(f, saved);
  try {
    assert.equal(
      (await f.client.rpc("commit_supply_draft", command)).error?.code,
      "42501",
    );
    assert.equal(regularizationFacts(f), before);
    assert.equal(
      (await regularizationRead(f.client, f)).revision,
      saved.revision,
    );
    assert.equal(
      sql(
        `select role from public.care_recipient_memberships where care_recipient_id=${q(f.patient)} and user_id=${q(fixtures.adminA.id)};`,
      ),
      "admin",
    );
    assert.equal(
      sql(
        `select count(*) from private.creation_draft_commands where idempotency_key=${q(command.p_key)};`,
      ),
      "0",
    );
  } finally {
    sql(
      `drop trigger if exists ${name} on private.creation_draft_commands;drop function if exists private.${name}();`,
    );
  }
  sql(
    `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${q(f.patient)},${q(fixtures.adminA.id)},'ent.regularize',false);`,
  );
  await rpc(f.client, "supply_draft_command", {
    ...packet,
    p_id: saved.id,
    p_expected: saved.revision,
    p_key: randomUUID(),
    p_body: { action: "discard" },
  });
  assert.equal(regularizationFacts(f), before);
  sql(
    `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${q(f.patient)},${q(fixtures.adminA.id)},'ent.read',false);`,
  );
  assert.equal(
    (
      await f.client.rpc("supply_draft_context", {
        p_patient: f.patient,
        p_kind: "ENT",
        p_purpose: f.purpose,
        p_target: f.document.id,
      })
    ).error?.code,
    "42501",
  );
});

for (const purpose of Object.keys(regularizationStages))
  test(`ENT ${purpose} preserves raw Unicode and line-break edges while binding the exact canonical text`, async () => {
    const f = await regularizationFixture(purpose),
      packet = regularizationPacket(f);
    const rawReason =
      "\uFEFF\n  Justificativa própria com espaços preservados\u00A0\t";
    const rawBasis = "\u2000\nBase própria Unicode e limites de apuração\u3000";
    packet.p_body.content.fields.reason = rawReason;
    packet.p_body.content.fields.basis = rawBasis;
    const saved = await rpc(f.client, "supply_draft_command", packet),
      read = await regularizationRead(f.client, f);
    assert.equal(read.content.fields.reason, rawReason);
    assert.equal(read.content.fields.basis, rawBasis);
    const body = regularizationBody(f);
    if (purpose === "record_regularization_finding")
      body.text = rawReason.trim();
    else body.reason = rawReason.trim();
    if (purpose === "propose_regularization") body.basis = rawBasis.trim();
    const wrong = globalThis.structuredClone(body);
    if (purpose === "record_regularization_finding") wrong.text += " alterada";
    else wrong.reason += " alterada";
    const before = regularizationFacts(f);
    assert.equal(
      (
        await f.client.rpc(
          "commit_supply_draft",
          regularizationCommit(f, saved, wrong),
        )
      ).error?.code,
      "22023",
    );
    assert.equal(regularizationFacts(f), before);
    assert.equal(
      (
        await rpc(
          f.client,
          "commit_supply_draft",
          regularizationCommit(f, saved, body),
        )
      ).state,
      "consumed",
    );
  });
