import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import {
  progressPreparationFixture as fixture,
  privateProgressCommand as command,
  privateProgressCommit as commit,
  progressFacts,
  rpc,
  fixtures,
  sql,
  q,
} from "./progress-preparation-fixtures.mjs";
import { whileAdvisoryWaits } from "./lock-barrier.mjs";
test("uncertain private progress recovery distinguishes unknown,superseded,native-applied and exact private-applied without a new publication", async () => {
  const f = await fixture(),
    saved = await command(f, f.family),
    packet = commit(f, saved),
    before = progressFacts(f);
  assert.equal(
    (await rpc(f.family, "progress_preparation_recovery", packet)).status,
    "unknown",
  );
  assert.equal(progressFacts(f), before);
  assert.equal(
    sql(
      `select count(*) from private.document_progress_notes where document_id=${q(f.id)}`,
    ),
    "0",
  );
  const next = await command(f, f.family, "save", saved, {
    ...f.content,
    note: { ...f.content.note, text: "Edição posterior de outra sessão" },
  });
  const stale = await rpc(f.family, "progress_preparation_recovery", packet);
  assert.equal(stale.status, "not_applied");
  assert.equal(stale.reason, "advanced_revision");
  assert.equal(stale.current.revision, next.revision);
  assert.equal(
    (await f.family.rpc("commit_progress_preparation", packet)).error?.code,
    "PT409",
  );
  const fresh = commit(f, next, randomUUID(), {
      ...f.content.note,
      text: "Edição posterior de outra sessão",
    }),
    published = await rpc(f.family, "commit_progress_preparation", fresh);
  assert.equal(
    (await rpc(f.family, "progress_preparation_recovery", packet)).status,
    "not_applied",
  );
  assert.equal(
    (await rpc(f.family, "progress_preparation_recovery", fresh)).confirmation
      .receipt.resourceId,
    published.receipt.resourceId,
  );
  const legacyKey = randomUUID();
  await rpc(f.family, "document_progress_publish", {
    p_document: f.id,
    p_key: legacyKey,
    p_body: f.content.note,
  });
  const legacy = await rpc(f.family, "progress_preparation_recovery", {
    ...packet,
    p_key: legacyKey,
  });
  assert.equal(legacy.status, "applied_native");
  assert.equal(legacy.nativeResult.note.text, f.content.note.text);
  assert.equal(
    sql(
      `select count(*) from private.document_progress_notes where document_id=${q(f.id)}`,
    ),
    "2",
  );
  assert.equal(progressFacts(f), before);
  const denied = await f.family.rpc("progress_preparation_recovery", {
    ...packet,
    p_patient: randomUUID(),
  });
  assert.equal(denied.error?.code, "42501");
});
test("private recovery waits for the real in-flight publication and rechecks authority after the key wait", async () => {
  const f = await fixture(),
    saved = await command(f, f.family),
    packet = commit(f, saved),
    keyName = `progress-preparation-key:${fixtures.family.id}:${packet.p_key}`;
  let recovery;
  const first = await whileAdvisoryWaits(
    `document-progress:${fixtures.family.id}:${packet.p_key}`,
    () => rpc(f.family, "commit_progress_preparation", packet),
    async () => {
      recovery = f.family
        .rpc("progress_preparation_recovery", packet)
        .then((value) => value);
      const start = Date.now();
      while (
        Number(
          sql(
            `select count(*) from pg_locks where locktype='advisory' and not granted and objsubid=1 and classid=((hashtextextended(${q(keyName)},0)>>32)&4294967295)::oid and objid=(hashtextextended(${q(keyName)},0)&4294967295)::oid`,
          ),
        ) === 0
      ) {
        assert.ok(
          Date.now() - start < 15000,
          "Recovery must actually wait for the original key",
        );
        await delay(25);
      }
    },
  );
  const second = await recovery;
  assert.ifError(second.error);
  assert.equal(second.data.status, "applied");
  assert.equal(
    second.data.confirmation.receipt.resourceId,
    first.receipt.resourceId,
  );
  assert.equal(
    sql(
      `select count(*) from private.document_progress_notes where document_id=${q(f.id)}`,
    ),
    "1",
  );
  const other = commit(f, saved, randomUUID());
  const denied = await whileAdvisoryWaits(
    `progress-preparation-key:${fixtures.family.id}:${other.p_key}`,
    () => f.family.rpc("progress_preparation_recovery", other),
    async () => {
      sql(
        `insert into public.capability_overrides(care_recipient_id,capability,subject_user,enabled) values(${q(f.patient)},'req.read',${q(fixtures.family.id)},false)`,
      );
    },
  );
  assert.equal(denied.error?.code, "42501");
  const grants = sql(
    "select has_function_privilege('anon','public.progress_preparation_recovery(uuid,text,uuid,uuid,integer,jsonb,uuid)','execute'),has_function_privilege('authenticated','public.progress_preparation_recovery(uuid,text,uuid,uuid,integer,jsonb,uuid)','execute'),has_function_privilege('service_role','public.progress_preparation_recovery(uuid,text,uuid,uuid,integer,jsonb,uuid)','execute')",
  );
  assert.equal(grants, "f|t|f");
});
