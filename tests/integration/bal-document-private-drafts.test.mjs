import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import {
  balDocumentPurposes,
  balDocumentFixture,
  saveBalDocument,
  balDocumentPacket,
  balDocumentFacts,
} from "./bal-document-draft-fixtures.mjs";
import { rpc, env } from "./v4-fixtures.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";

for (const purpose of balDocumentPurposes) {
  test(`BAL ${purpose} stores raw private fields without official effect;seals native confirmation and replays one result`, async () => {
    const f = await balDocumentFixture(purpose),
      before = balDocumentFacts(f),
      saved = await saveBalDocument(f);
    assert.equal(balDocumentFacts(f), before);
    const scope = {
      p_patient: f.patient,
      p_kind: "BAL",
      p_purpose: purpose,
      p_target: f.document.id,
    };
    const read = await rpc(f.client, "supply_draft_context", scope);
    assert.deepEqual(read.content, f.content);
    assert.equal(await rpc(f.admin, "supply_draft_context", scope), null);
    const packet = balDocumentPacket(f, saved);
    const wrong = {
      ...packet,
      p_key: randomUUID(),
      p_body: {
        ...packet.p_body,
        body: {
          ...f.body,
          [purpose === "assign_recount" ? "reason" : "comment"]:
            "Outro texto depois da revisão",
        },
      },
    };
    assert.ok((await f.client.rpc("commit_supply_draft", wrong)).error);
    assert.equal(balDocumentFacts(f), before);
    const [a, b] = await Promise.all([
      f.client.rpc("commit_supply_draft", packet),
      f.client.rpc("commit_supply_draft", packet),
    ]);
    assert.ifError(a.error);
    assert.ifError(b.error);
    assert.deepEqual(a.data.result, b.data.result);
    assert.equal([a, b].filter((x) => x.data.replayed).length, 1);
    assert.equal(a.data.consumedDocumentId, f.document.id);
    assert.equal(a.data.revision, saved.revision + 1);
    const after = balDocumentFacts(f);
    assert.notEqual(after, before);
    const state = await rpc(f.client, "supply_draft_context", scope);
    assert.equal(state.state, "consumed");
    assert.equal(state.content, null);
    assert.equal(
      (await rpc(f.client, "commit_supply_draft", packet)).replayed,
      true,
    );
    assert.equal(balDocumentFacts(f), after);
    assert.ok(
      (
        await f.client.rpc("commit_supply_draft", {
          ...packet,
          p_key: randomUUID(),
        })
      ).error,
    );
    const latest = await rpc(f.client, "operational_document", {
      p_id: f.document.id,
    });
    assert.equal(latest.payload.notes, f.document.payload.notes);
    assert.deepEqual(latest.lines, f.document.lines, "A private opinion or recount assignment never applies the count");
    assert.deepEqual(JSON.parse(after).ledger, JSON.parse(before).ledger);
    if (purpose !== "assign_recount") {
      const review = latest.balanceReview.reviews.find(
        (r) => r.review_group === f.body.group,
      );
      assert.equal(review.comment, f.content.fields.comment);
      assert.equal(review.reviewed_document_version, f.document.version);
    } else assert.equal(a.data.result.reason, f.content.fields.reason.trim());
    const cap =
      purpose === "review_supervisor"
        ? "bal.approve.supervisor"
        : "bal.approve.family";
    sql(
      `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${q(f.patient)},${q(f.identity.id)},${q(cap)},false);`,
    );
    assert.equal(
      (await rpc(f.client, "commit_supply_draft", packet)).replayed,
      true,
    );
    const consumed = await rpc(f.client, "supply_draft_context", scope);
    await rpc(f.client, "supply_draft_command", {
      ...scope,
      p_id: consumed.id,
      p_expected: consumed.revision,
      p_key: randomUUID(),
      p_body: { action: "acknowledge" },
    });
    assert.equal(balDocumentFacts(f), after);
    sql(
      `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${q(f.patient)},${q(f.identity.id)},'bal.read',false);`,
    );
    assert.equal(
      (await f.client.rpc("supply_draft_context", scope)).error?.code,
      "42501",
    );
    assert.equal(
      (await f.client.rpc("commit_supply_draft", packet)).error?.code,
      "42501",
    );
    assert.equal(balDocumentFacts(f), after);
  });
}

for (const purpose of balDocumentPurposes) {
  test(`BAL ${purpose} enforces CAS between two Auth sessions and denies foreign owner,material copy and incompatible confirmation`, async () => {
    const f = await balDocumentFixture(purpose),
      before = balDocumentFacts(f),
      saved = await saveBalDocument(f);
    const peer = createClient(env.url, env.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    assert.ifError(
      (
        await peer.auth.signInWithPassword({
          email: f.identity.email,
          password: fixturePassword,
        })
      ).error,
    );
    await rpc(peer, "select_active_context", { p_patient: f.patient });
    const key = purpose === "assign_recount" ? "reason" : "comment";
    const one = {
        ...f.content,
        fields: {
          ...f.content.fields,
          [key]: "Primeira edição própria ainda incompleta 🧭",
        },
      },
      two = {
        ...f.content,
        fields: { ...f.content.fields, [key]: "Outra edição própria 1," },
      };
    const race = await Promise.allSettled([
      saveBalDocument(f, one, saved, randomUUID()),
      saveBalDocument(f, two, saved, randomUUID(), peer),
    ]);
    assert.equal(race.filter((r) => r.status === "fulfilled").length, 1);
    const scope = {
      p_patient: f.patient,
      p_kind: "BAL",
      p_purpose: purpose,
      p_target: f.document.id,
    };
    const current = await rpc(f.client, "supply_draft_context", scope);
    assert.equal(current.revision, 2);
    assert.ok(
      [one.fields[key], two.fields[key]].includes(current.content.fields[key]),
    );
    await assert.rejects(() =>
      saveBalDocument(f, f.content, current, randomUUID(), f.admin),
    );
    await assert.rejects(() =>
      saveBalDocument(
        f,
        {
          ...f.content,
          materials: [
            {
              id: f.products[0],
              name: "Cópia indevida de estoque",
              unit: "unidade",
              quantityDecimals: 0,
            },
          ],
        },
        current,
      ),
    );
    assert.equal(
      (await rpc(f.client, "supply_draft_context", scope)).revision,
      2,
    );
    assert.equal(
      await rpc(f.client, "creation_draft_context", {
        p_patient: f.patient,
        p_kind: "BAL",
        p_target: f.document.id,
      }),
      null,
    );
    const commit = balDocumentPacket(f, current);
    assert.ok(
      (
        await f.client.rpc("commit_supply_draft", {
          ...commit,
          p_body: { ...commit.p_body, expectedVersion: f.document.version + 1 },
        })
      ).error,
    );
    assert.equal(balDocumentFacts(f), before);
    await rpc(f.client, "supply_draft_command", {
      ...scope,
      p_id: current.id,
      p_expected: current.revision,
      p_key: randomUUID(),
      p_body: { action: "discard" },
    });
    assert.equal(balDocumentFacts(f), before);
  });
  test(`BAL ${purpose} rechecks authority after private journal and rolls back native effects,private consumption and journal`, async () => {
    const f = await balDocumentFixture(purpose),
      saved = await saveBalDocument(f),
      before = balDocumentFacts(f),
      packet = balDocumentPacket(f, saved);
    const name = "probe_bal_private_" + randomUUID().replaceAll("-", ""),
      cap =
        purpose === "review_supervisor"
          ? "bal.approve.supervisor"
          : "bal.approve.family";
    sql(
      `create function private.${name}() returns trigger language plpgsql security definer set search_path='' as $$begin if new.draft_id=${q(saved.id)}::uuid then insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${q(f.patient)},${q(f.identity.id)},${q(cap)},false);end if;return new;end;$$;create trigger ${name} after insert on private.creation_draft_commands for each row execute function private.${name}();`,
    );
    try {
      assert.equal(
        (await f.client.rpc("commit_supply_draft", packet)).error?.code,
        "42501",
      );
      assert.equal(balDocumentFacts(f), before);
      assert.equal(
        (
          await rpc(f.client, "supply_draft_context", {
            p_patient: f.patient,
            p_kind: "BAL",
            p_purpose: purpose,
            p_target: f.document.id,
          })
        ).revision,
        saved.revision,
      );
      assert.equal(
        sql(
          `select count(*) from private.creation_draft_commands where idempotency_key=${q(packet.p_key)};`,
        ),
        "0",
      );
    } finally {
      sql(
        `drop trigger ${name} on private.creation_draft_commands;drop function private.${name}();`,
      );
    }
  });
}

test("BAL private journal cannot change the official count reference after native review", async () => {
  const f = await balDocumentFixture("review_family"),
    saved = await saveBalDocument(f),
    before = balDocumentFacts(f),
    packet = balDocumentPacket(f, saved),
    name = "probe_bal_reference_" + randomUUID().replaceAll("-", "");
  sql(
    `create function private.${name}() returns trigger language plpgsql security definer set search_path='' as $$begin if new.draft_id=${q(saved.id)}::uuid then update public.operational_documents set version=version+1 where id=${q(f.document.id)}::uuid;end if;return new;end;$$;create trigger ${name} after insert on private.creation_draft_commands for each row execute function private.${name}();`,
  );
  try {
    assert.equal(
      (await f.client.rpc("commit_supply_draft", packet)).error?.code,
      "PT409",
    );
    assert.equal(balDocumentFacts(f), before);
  } finally {
    sql(
      `drop trigger ${name} on private.creation_draft_commands;drop function private.${name}();`,
    );
  }
});
