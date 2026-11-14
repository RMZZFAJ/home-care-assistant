import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { actor, rpc, fixtures } from "./v4-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { historicalSourceFixture } from "./pdf-source-facts-fixtures.mjs";
import {
  reqDecisionPurposes,
  reqDecisionReason,
  reqDecisionFixture,
  reqDecisionPeer,
  reqDecisionRead,
  reqDecisionSave,
  reqDecisionCommit,
  reqDecisionFacts,
} from "./requisition-decision-draft-fixtures.mjs";

for (const purpose of reqDecisionPurposes) {
  test(
    "REQ " +
      purpose +
      " preserves own raw fields across Auth sessions,CAS and privacy without official effects",
    async () => {
      const f = await reqDecisionFixture(purpose),
        peer = await reqDecisionPeer(f),
        other = await actor("global", f.patient),
        packet = reqDecisionSave(f),
        before = reqDecisionFacts(f);
      const saved = await rpc(f.client, "supply_draft_command", packet);
      assert.equal(
        (await reqDecisionRead(peer, f)).content.fields.reason,
        reqDecisionReason,
      );
      assert.equal(await reqDecisionRead(other, f), null);
      assert.equal(
        (
          await other.rpc("supply_draft_command", {
            ...packet,
            p_id: saved.id,
            p_expected: saved.revision,
            p_key: randomUUID(),
            p_body: { action: "discard" },
          })
        ).error?.code,
        "42501",
      );
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
                ...f.content,
                fields: {
                  ...f.content.fields,
                  reason: "Outra edição própria " + i,
                },
              },
            },
          }),
        ),
      );
      assert.equal(race.filter((r) => !r.error).length, 1);
      assert.equal(race.find((r) => r.error)?.error.code, "PT409");
      assert.equal(reqDecisionFacts(f), before);
      assert.equal(
        await rpc(f.client, "creation_draft_context", {
          p_patient: f.patient,
          p_kind: "REQ",
          p_target: f.req.id,
        }),
        null,
      );
    },
  );
  test(
    "REQ " +
      purpose +
      " seals action,version and fields;concurrent confirmation replays one result after write loss",
    async () => {
      const f = await reqDecisionFixture(purpose),
        packet = reqDecisionSave(f),
        saved = await rpc(f.client, "supply_draft_command", packet),
        commit = reqDecisionCommit(f, saved),
        before = reqDecisionFacts(f);
      for (const body of [
        { ...commit.p_body, action: "approve" },
        {
          ...commit.p_body,
          expectedVersion: commit.p_body.expectedVersion + 1,
        },
        {
          ...commit.p_body,
          body: { ...commit.p_body.body, reason: "Outro motivo adulterado" },
        },
        { ...commit.p_body, body: { ...commit.p_body.body, unexpected: true } },
        ...(purpose === "resolve_extra"
          ? [
              {
                ...commit.p_body,
                body: { ...commit.p_body.body, itemId: randomUUID() },
              },
              {
                ...commit.p_body,
                body: { ...commit.p_body.body, productId: f.products[0] },
              },
            ]
          : []),
      ]) {
        assert.equal(
          (
            await f.client.rpc("commit_supply_draft", {
              ...commit,
              p_key: randomUUID(),
              p_body: body,
            })
          ).error?.code,
          "22023",
        );
        assert.equal(reqDecisionFacts(f), before);
      }
      const peer = await reqDecisionPeer(f),
        results = await Promise.all([
          rpc(f.client, "commit_supply_draft", commit),
          rpc(peer, "commit_supply_draft", commit),
        ]);
      assert.equal(results.filter((r) => r.replayed).length, 1);
      assert.equal(results[0].consumedDocumentId, f.req.id);
      assert.deepEqual(results[0].result, results[1].result);
      assert.equal((await reqDecisionRead(peer, f)).state, "consumed");
      assert.equal(
        (
          await f.client.rpc("commit_supply_draft", {
            ...commit,
            p_key: randomUUID(),
          })
        ).error?.code,
        "PT409",
      );
      const after = reqDecisionFacts(f),
        cap =
          purpose === "archive"
            ? "req.archive"
            : purpose === "resolve_extra"
              ? "catalog.manage"
              : "req.review";
      sql(
        `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${q(f.patient)},${q(fixtures.adminA.id)},${q(cap)},false);`,
      );
      assert.equal(
        (await rpc(peer, "commit_supply_draft", commit)).replayed,
        true,
      );
      await rpc(peer, "supply_draft_command", {
        ...packet,
        p_id: saved.id,
        p_expected: saved.revision + 1,
        p_key: randomUUID(),
        p_body: { action: "acknowledge" },
      });
      assert.equal(reqDecisionFacts(f), after);
    },
  );
}

test("REQ historical consultation preserves unknown operational completion and requires live Auth read", async () => {
  let row = JSON.parse(
    sql(
      `select coalesce((select jsonb_build_object('patient',r.care_recipient_id,'req',jsonb_build_object('id',r.id)) from public.requisitions r join public.care_recipients c on c.id=r.care_recipient_id where r.is_historical and c.is_development and exists(select 1 from public.care_recipient_memberships m where m.care_recipient_id=r.care_recipient_id and m.user_id=${q(fixtures.adminA.id)} and m.status='active') order by r.id limit 1),'null'::jsonb);`,
    ),
  );
  if (!row) {
    const historical = await historicalSourceFixture();
    row = { patient: historical.patient, req: { id: historical.doc.id } };
  }
  const client = await actor("adminA", row.patient),
    before = reqDecisionFacts(row),
    reference = await rpc(client, "requisition_decision_context", {
      p_id: row.req.id,
    });
  assert.equal(reference.historical, true);
  assert.equal(reference.completedAt, null);
  assert.equal(
    await rpc(client, "supply_draft_context", {
      p_patient: row.patient,
      p_kind: "REQ",
      p_purpose: "archive",
      p_target: row.req.id,
    }),
    null,
  );
  assert.equal(reqDecisionFacts(row), before);
});

for (const purpose of reqDecisionPurposes) {
  test(
    "REQ " +
      purpose +
      " rechecks authority after private journal and rolls back official effects,draft and journal",
    async () => {
      const f = await reqDecisionFixture(purpose),
        saved = await rpc(f.client, "supply_draft_command", reqDecisionSave(f)),
        before = reqDecisionFacts(f),
        commit = reqDecisionCommit(f, saved);
      const name = "probe_req_private_" + randomUUID().replaceAll("-", ""),
        cap =
          purpose === "archive"
            ? "req.archive"
            : purpose === "resolve_extra"
              ? "catalog.manage"
              : "req.review";
      sql(
        `create function private.${name}() returns trigger language plpgsql security definer set search_path='' as $$begin if new.draft_id=${q(saved.id)}::uuid then insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${q(f.patient)},${q(fixtures.adminA.id)},${q(cap)},false) on conflict(care_recipient_id,subject_user,capability) where subject_user is not null do update set enabled=false;end if;return new;end;$$;create trigger ${name} after insert on private.creation_draft_commands for each row execute function private.${name}();`,
      );
      try {
        assert.equal(
          (await f.client.rpc("commit_supply_draft", commit)).error?.code,
          "42501",
        );
        assert.equal(reqDecisionFacts(f), before);
        assert.equal(
          (await reqDecisionRead(f.client, f)).revision,
          saved.revision,
        );
        assert.equal(
          sql(
            `select count(*) from private.creation_draft_commands where idempotency_key=${q(commit.p_key)};`,
          ),
          "0",
        );
      } finally {
        sql(
          `drop trigger ${name} on private.creation_draft_commands;drop function private.${name}();`,
        );
      }
    },
  );
}

test("REQ changed reference refuses confirmation;own discard survives write loss but read loss denies private content", async () => {
  const f = await reqDecisionFixture("cancel"),
    saved = await rpc(f.client, "supply_draft_command", reqDecisionSave(f)),
    commit = reqDecisionCommit(f, saved);
  await rpc(f.client, "admin_upsert_recipient_product", {
    p_care_recipient_id: f.patient,
    p_product_id: f.products[0],
    p_name: "Nome atual alterado explicitamente",
    p_category: "higiene",
    p_unit: "unidade",
    p_aliases: [],
    p_is_active: true,
  });
  const before = reqDecisionFacts(f);
  assert.equal(
    (await f.client.rpc("commit_supply_draft", commit)).error?.code,
    "PT409",
  );
  assert.equal(reqDecisionFacts(f), before);
  sql(
    `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${q(f.patient)},${q(fixtures.adminA.id)},'req.review',false);`,
  );
  assert.equal(
    (await reqDecisionRead(f.client, f)).content.fields.reason,
    reqDecisionReason,
  );
  await rpc(f.client, "supply_draft_command", {
    ...reqDecisionSave(f),
    p_id: saved.id,
    p_expected: saved.revision,
    p_key: randomUUID(),
    p_body: { action: "discard" },
  });
  assert.equal(reqDecisionFacts(f), before);
  sql(
    `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${q(f.patient)},${q(fixtures.adminA.id)},'req.read',false);`,
  );
  assert.equal(
    (
      await f.client.rpc("supply_draft_context", {
        p_patient: f.patient,
        p_kind: "REQ",
        p_purpose: f.purpose,
        p_target: f.req.id,
      })
    ).error?.code,
    "42501",
  );
  assert.equal(
    (await f.client.rpc("requisition_decision_context", { p_id: f.req.id }))
      .error?.code,
    "42501",
  );
});

test("REQ cancellation preserves the legacy request capability conjunction for new writes and late revocation", async () => {
  const f = await reqDecisionFixture("cancel"),
    packet = reqDecisionSave(f),
    saved = await rpc(f.client, "supply_draft_command", packet),
    commit = reqDecisionCommit(f, saved),
    before = reqDecisionFacts(f);
  sql(
    `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${q(f.patient)},${q(fixtures.adminA.id)},'req.create',false);`,
  );
  assert.equal(
    (await f.client.rpc("commit_supply_draft", commit)).error?.code,
    "42501",
  );
  assert.equal(
    (
      await f.client.rpc("supply_draft_command", {
        ...packet,
        p_key: randomUUID(),
        p_id: saved.id,
        p_expected: saved.revision,
      })
    ).error?.code,
    "42501",
  );
  assert.equal(
    (await reqDecisionRead(f.client, f)).content.fields.reason,
    reqDecisionReason,
  );
  await rpc(f.client, "supply_draft_command", {
    ...packet,
    p_id: saved.id,
    p_expected: saved.revision,
    p_key: randomUUID(),
    p_body: { action: "discard" },
  });
  assert.equal(reqDecisionFacts(f), before);
});

test("REQ reference changed after private journal rolls back catalogue,decision and private consumption", async () => {
  const f = await reqDecisionFixture("cancel"),
    saved = await rpc(f.client, "supply_draft_command", reqDecisionSave(f)),
    before = reqDecisionFacts(f),
    commit = reqDecisionCommit(f, saved),
    name = "probe_req_ref_" + randomUUID().replaceAll("-", "");
  const catalogue = sql(
    `select name from public.care_recipient_products where care_recipient_id=${q(f.patient)} and product_id=${q(f.products[0])};`,
  );
  sql(
    `create function private.${name}() returns trigger language plpgsql security definer set search_path='' as $$begin if new.draft_id=${q(saved.id)}::uuid then update public.care_recipient_products set name=name||' altered inside journal' where care_recipient_id=${q(f.patient)} and product_id=${q(f.products[0])};end if;return new;end;$$;create trigger ${name} after insert on private.creation_draft_commands for each row execute function private.${name}();`,
  );
  try {
    assert.equal(
      (await f.client.rpc("commit_supply_draft", commit)).error?.code,
      "PT409",
    );
    assert.equal(reqDecisionFacts(f), before);
    assert.equal(
      sql(
        `select name from public.care_recipient_products where care_recipient_id=${q(f.patient)} and product_id=${q(f.products[0])};`,
      ),
      catalogue,
    );
    assert.equal((await reqDecisionRead(f.client, f)).revision, saved.revision);
    assert.equal(
      sql(
        `select count(*) from private.creation_draft_commands where idempotency_key=${q(commit.p_key)};`,
      ),
      "0",
    );
  } finally {
    sql(
      `drop trigger ${name} on private.creation_draft_commands;drop function private.${name}();`,
    );
  }
});

for (const purpose of reqDecisionPurposes) {
  test(
    "REQ " +
      purpose +
      " refuses relabeling issued material as historical and preserves the normal native decision",
    async () => {
      const f = await reqDecisionFixture(purpose),
        before = reqDecisionFacts(f);
      assert.throws(
        () =>
          sql(
            `update public.requisitions set is_historical=true where id=${q(f.req.id)};`,
          ),
        /issued requisition material is immutable/,
      );
      assert.equal(reqDecisionFacts(f), before);
      const items = sql(
        `select jsonb_agg(to_jsonb(i) order by id) from public.requisition_items i where requisition_id=${q(f.req.id)};`,
      );
      const saved = await rpc(
          f.client,
          "supply_draft_command",
          reqDecisionSave(f),
        ),
        confirmed = await rpc(
          f.client,
          "commit_supply_draft",
          reqDecisionCommit(f, saved),
        );
      assert.equal(confirmed.consumedDocumentId, f.req.id);
      assert.equal((await reqDecisionRead(f.client, f)).state, "consumed");
      assert.equal(
        sql(
          `select jsonb_agg(to_jsonb(i) order by id) from public.requisition_items i where requisition_id=${q(f.req.id)};`,
        ),
        items,
      );
    },
  );
}
