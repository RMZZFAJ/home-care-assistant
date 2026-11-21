import test from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import {
  resourceFixture as fixture,
  resourcePurposes,
  saveResource as save,
  readResource as read,
  resourcePacket as packet,
  nativeFacts as facts,
  documentFacts as documents,
  rpc,
  fixtures,
  actor,
  env,
  sql,
  q,
  shiftCommand,
  randomUUID,
} from "./schedule-resource-fixtures.mjs";
import { whileAdvisoryWaits, whileRowWaits } from "./lock-barrier.mjs";
import { build } from "esbuild";
import { setTimeout as delay } from "node:timers/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { testDataRoot } from "../../scripts/test-environment.mjs";

// Check the actual RPC output with the same pure codecs used by the API/UI.
// This generated module contains source only, never environment values or data.
const codecFile = join(testDataRoot, "schedule-resource-contract-codec.mjs");
await build({
  stdin: {
    contents:
      'export {scheduleResourceReferenceSchema,checkScheduleResourceReference} from "@/lib/schedules/resource-preparations";export {scheduleResourceCommitSchema,parseScheduleResourceConfirmation,parseScheduleResourceRecovery} from "@/lib/validation/schedule-resource-preparations";export {parsePrivateDraft} from "@/lib/validation/private-draft-results";',
    resolveDir: process.cwd(),
    loader: "ts",
  },
  bundle: true,
  packages: "external",
  platform: "node",
  format: "esm",
  outfile: codecFile,
  logLevel: "silent",
});
const codec = await import(pathToFileURL(codecFile).href);

for (const purpose of resourcePurposes)
  test(
    "private schedule resource " +
      purpose +
      " keeps partial fields across real sessions and commits exactly one native result",
    async () => {
      const f = await fixture(purpose),
        before = facts(f),
        docs = documents(f),
        fields = { ...f.fields };
      codec.checkScheduleResourceReference(
        codec.scheduleResourceReferenceSchema.parse(f.reference),
        { patientId: f.patient, purpose, targetResourceId: f.target },
      );
      if (fields.form === "type")
        Object.assign(fields, { name: "", start: "", duration: "" });
      else if (fields.form === "shift")
        Object.assign(fields, {
          professionalId: "",
          start: "",
          end: "",
          notes: "",
          reason: "",
        });
      else
        Object.assign(fields, {
          reason: "",
          ...(fields.form === "series" ? { from: "" } : {}),
        });
      const content = { ...f.content, scheduleAction: fields },
        key = randomUUID(),
        first = await save(f, null, content, f.admin, key);
      assert.equal((await save(f, null, content, f.admin, key)).replayed, true);
      assert.equal(facts(f), before);
      assert.equal(documents(f), docs);
      const second = createClient(env.url, env.anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      assert.ifError(
        (
          await second.auth.signInWithPassword({
            email: fixtures.adminA.email,
            password: fixturePassword,
          })
        ).error,
      );
      await rpc(second, "select_active_context", { p_patient: f.patient });
      const offered = await read(f, second);
      assert.equal(offered.id, first.id);
      codec.parsePrivateDraft(offered, {
        userId: fixtures.adminA.id,
        patientId: f.patient,
        kind: "SCHEDULE",
        purpose,
        targetDocumentId: null,
        targetResourceId: f.target,
      });
      assert.deepEqual(offered.content.scheduleAction, fields);
      assert.equal(offered.content.reference.hash, f.reference.hash);
      const ready = await save(f, offered),
        intent = packet(f, ready);
      const [a, b] = await Promise.all([
        rpc(f.admin, "commit_schedule_resource_preparation", intent),
        rpc(second, "commit_schedule_resource_preparation", intent),
      ]);
      const browserPacket = codec.scheduleResourceCommitSchema.parse({
        careRecipientId: f.patient,
        purpose,
        targetResourceId: f.target,
        draftCommit: { id: ready.id, revision: ready.revision },
        ...intent.p_body,
        idempotencyKey: intent.p_key,
      });
      codec.parseScheduleResourceConfirmation(
        a,
        browserPacket,
        fixtures.adminA.id,
      );
      assert.equal(a.receipt.resourceId, b.receipt.resourceId);
      assert.equal([a.replayed, b.replayed].filter(Boolean).length, 1);
      assert.equal(a.receipt.actorId, fixtures.adminA.id);
      assert.equal(a.receipt.targetResourceId, f.target);
      assert.deepEqual(a.receipt.fields, f.fields);
      assert.deepEqual(a.receipt.command, f.command);
      assert.equal(a.receipt.expectedVersion, f.reference.version);
      assert.equal(a.receipt.sourceVersion, f.reference.sourceVersion);
      assert.equal(a.receipt.nativeResult.version, f.reference.version + 1);
      if (purpose === "shift_type_edit")
        assert.equal(
          sql(
            `select count(*) from public.shift_types where id=${q(f.target)} and name=${q(f.fields.name)} and starts_local='19:00:37'::time and duration_minutes=720 and not is_active and version=${f.reference.version + 1}`,
          ),
          "1",
        );
      else if (purpose.startsWith("schedule_series_")) {
        const expected =
          purpose === "schedule_series_reject" ? "rejected" : "published";
        assert.equal(
          sql(`select status from public.shift_series where id=${q(f.target)}`),
          expected,
        );
        assert.equal(
          sql(
            `select count(*) from public.scheduled_shifts where series_id=${q(f.target)} and status=${q(purpose === "schedule_series_end" ? "cancelled" : expected)}`,
          ),
          "1",
        );
        if (purpose === "schedule_series_end")
          assert.equal(
            sql(
              `select ended_on::text from public.shift_series where id=${q(f.target)}`,
            ),
            f.day,
          );
      } else if (purpose === "schedule_shift_edit")
        assert.equal(
          sql(
            `select count(*) from public.scheduled_shifts where id=${q(f.target)} and notes=${q(f.fields.notes)} and starts_at=${q(f.command.body.startsAt)}::timestamptz and ends_at=${q(f.command.body.endsAt)}::timestamptz and professional_id=${q(f.worker.id)}`,
          ),
          "1",
        );
      else {
        assert.equal(
          sql(
            `select status from public.shift_change_requests where id=${q(f.target)}`,
          ),
          purpose === "schedule_change_approve"
            ? "approved"
            : purpose === "schedule_change_reject"
              ? "rejected"
              : "obsolete",
        );
        assert.equal(
          sql(
            `select decision_reason from public.shift_change_requests where id=${q(f.target)}`,
          ),
          f.fields.reason,
        );
        assert.equal(
          sql(
            `select created_by::text from public.shift_change_requests where id=${q(f.target)}`,
          ),
          f.worker.id,
        );
        assert.equal(
          sql(
            `select professional_id::text from public.scheduled_shifts where id=${q(f.shift.id)}`,
          ),
          purpose === "schedule_change_approve" ? f.second.id : f.worker.id,
        );
        if (purpose !== "schedule_change_approve")
          assert.equal(
            sql(
              `select version from public.scheduled_shifts where id=${q(f.shift.id)}`,
            ),
            String(f.reference.sourceVersion),
          );
      }
      const confirmed = facts(f);
      assert.notEqual(confirmed, before);
      assert.equal(documents(f), docs);
      const proof = await rpc(
        f.admin,
        "recover_schedule_resource_preparation",
        intent,
      );
      codec.parseScheduleResourceRecovery(
        proof,
        browserPacket,
        fixtures.adminA.id,
      );
      assert.equal(proof.status, "applied");
      assert.deepEqual(proof.confirmation.receipt, a.receipt);
      sql(
        `update public.care_recipients set is_active=false where id=${q(f.patient)}`,
      );
      assert.equal(
        (await rpc(f.admin, "commit_schedule_resource_preparation", intent))
          .replayed,
        true,
      );
      const consumed = await read(f);
      assert.equal(consumed.state, "consumed");
      assert.equal(consumed.content, null);
      const done = await save(
        f,
        consumed,
        undefined,
        f.admin,
        randomUUID(),
        "acknowledge",
      );
      assert.equal(done.state, "completed");
      assert.equal(
        (await rpc(f.admin, "recover_schedule_resource_preparation", intent))
          .confirmation.draft.state,
        "completed",
      );
      assert.equal(facts(f), confirmed);
      assert.equal(documents(f), docs);
      await second.auth.signOut({ scope: "local" });
    },
  );

test("schedule resource changes use the native actor rather than the original creator and keep real anchors", async () => {
  const f = await fixture(),
    other = await actor("family", f.patient);
  sql(
    `update public.shift_types set created_by=${q(fixtures.family.id)} where id=${q(f.target)}`,
  );
  const source = await rpc(
    f.admin,
    "schedule_resource_preparation_reference",
    f.scope,
  );
  f.reference = source.reference;
  f.content = {
    ...f.content,
    referenceHash: f.reference.hash,
    referenceVersion: f.reference.version,
  };
  const saved = await save(f),
    intent = packet(f, saved),
    before = facts(f);
  assert.equal(await read(f, other), null);
  const denied = await other.rpc("schedule_resource_preparation_command", {
    ...f.scope,
    p_id: saved.id,
    p_expected: saved.revision,
    p_body: { action: "discard" },
    p_key: randomUUID(),
  });
  assert.equal(denied.error?.code, "42501");
  assert.equal(facts(f), before);
  const result = await rpc(
    f.admin,
    "commit_schedule_resource_preparation",
    intent,
  );
  assert.equal(result.receipt.actorId, fixtures.adminA.id);
  assert.equal(
    sql(
      `select created_by::text from public.shift_types where id=${q(f.target)}`,
    ),
    fixtures.family.id,
  );
  assert.equal(
    sql(
      `select count(*) from private.schedule_resource_preparations where id=${q(saved.id)} and target_type_id=${q(f.target)} and target_series_id is null and target_shift_id is null and target_change_id is null`,
    ),
    "1",
  );
});

test("schedule resource native proposal and cancellation remain distinct intents with correct result identities", async () => {
  for (const operation of ["propose_change", "cancel"]) {
    const f = await fixture("schedule_shift_edit", operation);
    if (operation === "propose_change") {
      const source = await rpc(
        f.worker.client,
        "schedule_resource_preparation_reference",
        f.scope,
      );
      f.admin = f.worker.client;
      f.reference = source.reference;
      f.content = {
        ...f.content,
        referenceHash: f.reference.hash,
        referenceVersion: f.reference.version,
      };
    }
    const saved = await save(f),
      result = await rpc(
        f.admin,
        "commit_schedule_resource_preparation",
        packet(f, saved),
      );
    if (operation === "propose_change") {
      assert.notEqual(result.receipt.resourceId, f.target);
      assert.equal(result.receipt.nativeResult.version, 1);
      assert.equal(result.receipt.nativeResult.status, "pending");
      assert.equal(result.receipt.actorId, f.worker.id);
      assert.equal(
        sql(
          `select consumed_change_id::text from private.schedule_resource_preparations where id=${q(saved.id)}`,
        ),
        result.receipt.resourceId,
      );
      assert.equal(
        sql(
          `select version from public.scheduled_shifts where id=${q(f.target)}`,
        ),
        String(f.shift.version),
      );
    } else {
      assert.equal(result.receipt.resourceId, f.target);
      assert.equal(result.receipt.nativeResult.status, "cancelled");
    }
  }
});

test("schedule resource CAS and reference adoption retain human fields while fencing stale or divergent confirmations", async () => {
  const f = await fixture(),
    saved = await save(f),
    original = packet(f, saved),
    before = facts(f);
  const attempts = await Promise.all([
    save(f, saved, {
      ...f.content,
      scheduleAction: { ...f.fields, name: "Minha edição A" },
    })
      .then((v) => ({ ok: v }))
      .catch((e) => ({ error: e })),
    save(f, saved, {
      ...f.content,
      scheduleAction: { ...f.fields, name: "Minha edição B" },
    })
      .then((v) => ({ ok: v }))
      .catch((e) => ({ error: e })),
  ]);
  assert.equal(attempts.filter((v) => v.ok).length, 1);
  assert.equal(facts(f), before);
  assert.equal(
    (await rpc(f.admin, "recover_schedule_resource_preparation", original))
      .reason,
    "advanced_revision",
  );
  assert.equal(
    (await f.admin.rpc("commit_schedule_resource_preparation", original)).error
      ?.code,
    "PT409",
  );
  const current = await read(f);
  f.command.body.name = current.content.scheduleAction.name;
  const own = packet(f, current),
    changed = await shiftCommand(
      f.admin,
      f.patient,
      "type",
      {
        id: f.target,
        name: "Nome concorrente nativo",
        startsLocal: "07:00",
        durationMinutes: 720,
        active: true,
      },
      f.reference.version,
    );
  const state = facts(f);
  assert.equal(
    (await f.admin.rpc("commit_schedule_resource_preparation", own)).error
      ?.code,
    "PT409",
  );
  assert.equal(facts(f), state);
  const proof = await rpc(
    f.admin,
    "recover_schedule_resource_preparation",
    own,
  );
  assert.equal(proof.reason, "source_advanced");
  assert.equal(proof.source.currentTargetVersion, changed.version);
  assert.equal(
    (await read(f)).content.scheduleAction.name,
    current.content.scheduleAction.name,
  );
  const source = await rpc(
    f.admin,
    "schedule_resource_preparation_reference",
    f.scope,
  );
  f.reference = source.reference;
  f.content = {
    ...current.content,
    referenceHash: f.reference.hash,
    referenceVersion: f.reference.version,
  };
  delete f.content.reference;
  const adopted = await save(f, current),
    next = packet(f, adopted),
    unchanged = facts(f);
  const mismatched = {
    ...next,
    p_key: randomUUID(),
    p_body: { ...next.p_body, referenceHash: "f".repeat(64) },
  };
  assert.equal(
    (await f.admin.rpc("commit_schedule_resource_preparation", mismatched))
      .error?.code,
    "22023",
  );
  assert.equal(facts(f), unchanged);
  const result = await rpc(
    f.admin,
    "commit_schedule_resource_preparation",
    next,
  );
  assert.equal(result.receipt.fields.name, current.content.scheduleAction.name);
  assert.equal(result.receipt.expectedVersion, changed.version);
});

test("unseen schedule resource attempts stay unknown until an explicit idempotent resolution retires the old private revision", async () => {
  const f = await fixture(),
    saved = await save(f),
    intent = packet(f, saved),
    before = facts(f);
  assert.equal(
    (await rpc(f.admin, "recover_schedule_resource_preparation", intent))
      .status,
    "unknown",
  );
  const resolve = {
    ...intent,
    p_original_key: intent.p_key,
    p_key: randomUUID(),
  };
  const wrong = {
    ...resolve,
    p_key: randomUUID(),
    p_body: {
      ...resolve.p_body,
      command: {
        ...f.command,
        body: { ...f.command.body, name: "Outra intenção não salva" },
      },
    },
  };
  assert.equal(
    (await f.admin.rpc("resolve_schedule_resource_preparation", wrong)).error
      ?.code,
    "22023",
  );
  assert.equal((await read(f)).revision, saved.revision);
  const proof = await rpc(
    f.admin,
    "resolve_schedule_resource_preparation",
    resolve,
  );
  assert.equal(proof.reason, "advanced_revision");
  assert.equal(proof.current.revision, saved.revision + 1);
  assert.deepEqual(
    await rpc(f.admin, "resolve_schedule_resource_preparation", resolve),
    proof,
  );
  assert.equal((await read(f)).content.scheduleAction.name, f.fields.name);
  assert.equal(
    (await f.admin.rpc("commit_schedule_resource_preparation", intent)).error
      ?.code,
    "PT409",
  );
  assert.equal(facts(f), before);
  const row = await read(f),
    next = packet(f, row);
  await rpc(f.admin, "commit_schedule_resource_preparation", next);
  assert.equal(
    (await rpc(f.admin, "recover_schedule_resource_preparation", intent))
      .status,
    "not_applied",
  );
  assert.equal(
    (await rpc(f.admin, "recover_schedule_resource_preparation", next)).status,
    "applied",
  );
});

test("native key collisions cannot consume another preparation or fabricate a confirmed result", async () => {
  const f = await fixture(),
    saved = await save(f),
    key = randomUUID();
  await rpc(f.admin, "schedule_command", {
    p_patient: f.patient,
    p_action: "type",
    p_body: {
      name: "Outro tipo com chave nativa",
      startsLocal: "07:00",
      durationMinutes: 720,
    },
    p_version: null,
    p_key: key,
  });
  const intent = packet(f, saved, key),
    before = facts(f);
  assert.equal(
    (await f.admin.rpc("commit_schedule_resource_preparation", intent)).error
      ?.code,
    "PT409",
  );
  assert.equal(facts(f), before);
  const proof = await rpc(
    f.admin,
    "recover_schedule_resource_preparation",
    intent,
  );
  assert.equal(proof.reason, "key_conflict");
  assert.equal(proof.receipt, null);
});

test("native read loss redacts saved operational snapshots but keeps one's fields, lookup and discard; revoked membership denies both", async () => {
  const f = await fixture(),
    saved = await save(f),
    intent = packet(f, saved);
  sql(
    `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${q(f.patient)},${q(fixtures.adminA.id)},'schedule.read.team',false),(${q(f.patient)},${q(fixtures.adminA.id)},'schedule.read.own',false),(${q(f.patient)},${q(fixtures.adminA.id)},'schedule.types.manage',false)`,
  );
  const row = await read(f);
  assert.equal(row.content.reference, null);
  assert.deepEqual(row.content.scheduleAction, f.fields);
  assert.equal(
    (await f.admin.rpc("schedule_resource_preparation_reference", f.scope))
      .error?.code,
    "42501",
  );
  assert.equal(
    (await rpc(f.admin, "recover_schedule_resource_preparation", intent))
      .status,
    "unknown",
  );
  assert.equal(
    (await save(f, row, undefined, f.admin, randomUUID(), "discard")).state,
    "discarded",
  );
  sql(
    `update public.care_recipient_memberships set status='revoked' where care_recipient_id=${q(f.patient)} and user_id=${q(fixtures.adminA.id)}`,
  );
  assert.equal(
    (await f.admin.rpc("schedule_resource_preparation_context", f.scope)).error
      ?.code,
    "42501",
  );
  assert.equal(
    (await f.admin.rpc("recover_schedule_resource_preparation", intent)).error
      ?.code,
    "42501",
  );
});

test("schedule resource commit revalidates authorization after the native-patient lock without leaving a private or native partial effect", async () => {
  const f = await fixture(),
    saved = await save(f),
    intent = packet(f, saved),
    before = facts(f);
  const result = await whileAdvisoryWaits(
    `schedule:${f.patient}`,
    () => f.admin.rpc("commit_schedule_resource_preparation", intent),
    () =>
      sql(
        `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${q(f.patient)},${q(fixtures.adminA.id)},'schedule.types.manage',false)`,
      ),
  );
  assert.equal(result.error?.code, "42501");
  assert.equal(facts(f), before);
  assert.equal((await read(f)).state, "active");
});

test("schedule resource RPCs keep explicit grants and refuse anonymous,service and a real expired session", async () => {
  const f = await fixture(),
    saved = await save(f),
    before = facts(f);
  for (const key of [env.anonKey, env.serviceKey]) {
    const client = createClient(env.url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    assert.equal(
      (await client.rpc("schedule_resource_preparation_context", f.scope)).error
        ?.code,
      "42501",
    );
  }
  const metadata = JSON.parse(
    sql(
      `select jsonb_agg(jsonb_build_object('name',p.proname,'definer',p.prosecdef,'config',p.proconfig,'anon',has_function_privilege('anon',p.oid,'EXECUTE'),'service',has_function_privilege('service_role',p.oid,'EXECUTE'),'authenticated',has_function_privilege('authenticated',p.oid,'EXECUTE'))) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('schedule_resource_preparation_reference','schedule_resource_preparation_context','schedule_resource_preparation_command','commit_schedule_resource_preparation','recover_schedule_resource_preparation','resolve_schedule_resource_preparation','schedule_resource_preparation_list')`,
    ),
  );
  assert.equal(metadata.length, 7);
  for (const row of metadata) {
    assert.equal(row.definer, true);
    assert.deepEqual(row.config, ['search_path=""']);
    assert.equal(row.anon, false);
    assert.equal(row.service, false);
    assert.equal(row.authenticated, true);
  }
  assert.equal(
    sql(
      `select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='private' and c.relname in ('schedule_resource_preparations','schedule_resource_preparation_commands') and c.relrowsecurity and not has_table_privilege('authenticated',c.oid,'SELECT') and not has_table_privilege('service_role',c.oid,'SELECT')`,
    ),
    "2",
  );
  const client = createClient(env.url, env.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  assert.ifError(
    (
      await client.auth.signInWithPassword({
        email: fixtures.adminA.email,
        password: fixturePassword,
      })
    ).error,
  );
  await rpc(client, "select_active_context", { p_patient: f.patient });
  const session = (await client.auth.getSession()).data.session;
  const sid = JSON.parse(
    Buffer.from(session.access_token.split(".")[1], "base64url").toString(),
  ).session_id;
  const previous = sql(
    `select coalesce(not_after::text,'') from auth.sessions where id=${q(sid)} and user_id=${q(fixtures.adminA.id)}`,
  );
  sql(
    `update auth.sessions set not_after=clock_timestamp()-interval '1 second' where id=${q(sid)} and user_id=${q(fixtures.adminA.id)}`,
  );
  try {
    assert.equal(
      (await client.rpc("schedule_resource_preparation_context", f.scope)).error
        ?.code,
      "42501",
    );
  } finally {
    sql(
      `update auth.sessions set not_after=${previous ? q(previous) + "::timestamptz" : "null"} where id=${q(sid)} and user_id=${q(fixtures.adminA.id)}`,
    );
    await client.auth.signOut({ scope: "local" });
  }
  assert.equal((await read(f)).id, saved.id);
  assert.equal(facts(f), before);
});

test("schedule resource references and anchors cannot cross patients even for an administrator with both memberships", async () => {
  const f = await fixture(),
    saved = await save(f),
    before = facts(f),
    foreign = await fixture();
  const wrong = { ...f.scope, p_patient: foreign.patient };
  assert.equal(
    await rpc(foreign.admin, "schedule_resource_preparation_context", wrong),
    null,
  );
  assert.equal(
    (await foreign.admin.rpc("schedule_resource_preparation_reference", wrong))
      .error?.code,
    "42501",
  );
  assert.equal(
    (
      await foreign.admin.rpc("schedule_resource_preparation_command", {
        ...wrong,
        p_id: null,
        p_expected: null,
        p_key: randomUUID(),
        p_body: {
          action: "save",
          content: f.content,
          navigation: { version: 1, stage: "schedule_resource" },
        },
      })
    ).error?.code,
    "42501",
  );
  await rpc(f.admin, "select_active_context", { p_patient: f.patient });
  assert.equal((await read(f)).id, saved.id);
  assert.equal(facts(f), before);
});

test("reversible professional eligibility is never proof of nonapplication and a resolved attempt cannot revive after restoration", async () => {
  const f = await fixture("schedule_shift_edit"),
    saved = await save(f),
    intent = packet(f, saved),
    before = facts(f);
  sql(
    `update public.care_recipient_memberships set status='revoked' where care_recipient_id=${q(f.patient)} and user_id=${q(f.worker.id)}`,
  );
  assert.ok(
    (await f.admin.rpc("commit_schedule_resource_preparation", intent)).error,
  );
  const unknown = await rpc(
    f.admin,
    "recover_schedule_resource_preparation",
    intent,
  );
  assert.equal(unknown.status, "unknown");
  assert.equal(unknown.reason, null);
  assert.equal(unknown.source, null);
  await rpc(f.admin, "resolve_schedule_resource_preparation", {
    ...intent,
    p_original_key: intent.p_key,
    p_key: randomUUID(),
  });
  sql(
    `update public.care_recipient_memberships set status='active' where care_recipient_id=${q(f.patient)} and user_id=${q(f.worker.id)}`,
  );
  assert.equal(
    (await f.admin.rpc("commit_schedule_resource_preparation", intent)).error
      ?.code,
    "PT409",
  );
  assert.equal(facts(f), before);
  const retained = await read(f);
  assert.deepEqual(retained.content.scheduleAction, f.fields);
  assert.equal(
    (
      await rpc(
        f.admin,
        "commit_schedule_resource_preparation",
        packet(f, retained),
      )
    ).receipt.nativeResult.status,
    "published",
  );
});

test("private schedule resource pagination enumerates every own active preparation without exposing another owner", async () => {
  const f = await fixture(),
    ids = [(await save(f)).id];
  for (let i = 0; i < 20; i++) {
    const type = await shiftCommand(f.admin, f.patient, "type", {
        name: "Tipo para página privada " + i,
        startsLocal: "07:00",
        durationMinutes: 720,
      }),
      scope = { ...f.scope, p_target: type.id };
    const reference = (
      await rpc(f.admin, "schedule_resource_preparation_reference", scope)
    ).reference;
    const row = await save({
      ...f,
      target: type.id,
      scope,
      reference,
      content: {
        ...f.content,
        referenceHash: reference.hash,
        referenceVersion: reference.version,
      },
    });
    ids.push(row.id);
  }
  const before = facts(f),
    found = [];
  let cursor = { p_before: null, p_before_id: null },
    page;
  do {
    page = await rpc(f.admin, "schedule_resource_preparation_list", {
      p_patient: f.patient,
      ...cursor,
      p_limit: 7,
    });
    found.push(...page.map((r) => r.id));
    const last = page.at(-1);
    if (last) cursor = { p_before: last.savedAt, p_before_id: last.id };
  } while (page.length === 7);
  assert.equal(found.length, 21);
  assert.equal(new Set(found).size, 21);
  assert.deepEqual([...found].sort(), [...ids].sort());
  const other = await actor("family", f.patient);
  assert.deepEqual(
    await rpc(other, "schedule_resource_preparation_list", {
      p_patient: f.patient,
      p_limit: 100,
    }),
    [],
  );
  assert.equal(facts(f), before);
});

test("concurrent source changes preserve the native obsolete outcome without approving or claiming a permanent source-only negative", async () => {
  const f = await fixture("schedule_change_approve"),
    saved = await save(f),
    intent = packet(f, saved);
  await shiftCommand(
    f.admin,
    f.patient,
    "change",
    {
      id: f.shift.id,
      notes: "Atualização nativa concorrente",
      reason: "Origem alterada depois da revisão",
    },
    f.shift.version,
  );
  const before = sql(
    `select to_jsonb(s)::text from public.scheduled_shifts s where id=${q(f.shift.id)}`,
  );
  const unknown = await rpc(
    f.admin,
    "recover_schedule_resource_preparation",
    intent,
  );
  assert.equal(unknown.status, "unknown");
  assert.equal(unknown.reason, null);
  const result = await rpc(
    f.admin,
    "commit_schedule_resource_preparation",
    intent,
  );
  assert.equal(result.receipt.nativeResult.status, "obsolete");
  assert.equal(result.receipt.referenceHash, f.reference.hash);
  assert.equal(result.receipt.sourceVersion, f.reference.sourceVersion);
  assert.equal(
    sql(
      `select to_jsonb(s)::text from public.scheduled_shifts s where id=${q(f.shift.id)}`,
    ),
    before,
  );
  assert.equal(
    sql(
      `select status from public.shift_change_requests where id=${q(f.target)}`,
    ),
    "obsolete",
  );
  const source = await rpc(
    f.admin,
    "schedule_resource_preparation_reference",
    f.scope,
  );
  assert.equal(source.reference.workspace.changes[0].status, "obsolete");
  codec.checkScheduleResourceReference(
    codec.scheduleResourceReferenceSchema.parse(source.reference),
    { patientId: f.patient, purpose: f.purpose, targetResourceId: f.target },
  );
  const browserPacket = codec.scheduleResourceCommitSchema.parse({
    careRecipientId: f.patient,
    purpose: f.purpose,
    targetResourceId: f.target,
    draftCommit: { id: saved.id, revision: saved.revision },
    ...intent.p_body,
    idempotencyKey: intent.p_key,
  });
  codec.parseScheduleResourceConfirmation(
    result,
    browserPacket,
    fixtures.adminA.id,
  );
  assert.equal(
    (await rpc(f.admin, "recover_schedule_resource_preparation", intent))
      .status,
    "applied",
  );
});

test("obsolete-only fallback rolls back every native effect if eligibility is restored while the native proposal row is locked", async () => {
  const f = await fixture("schedule_change_approve"),
    saved = await save(f),
    intent = packet(f, saved),
    before = facts(f);
  sql(
    `update public.care_recipient_memberships set status='revoked' where care_recipient_id=${q(f.patient)} and user_id=${q(f.second.id)}`,
  );
  const result = await whileRowWaits(
    "schedule_changes",
    f.target,
    "commit_schedule_resource_preparation",
    () => f.admin.rpc("commit_schedule_resource_preparation", intent),
    () =>
      sql(
        `update public.care_recipient_memberships set status='active' where care_recipient_id=${q(f.patient)} and user_id=${q(f.second.id)}`,
      ),
  );
  assert.equal(result.error?.code, "PT409");
  assert.equal(facts(f), before);
  assert.equal((await read(f)).revision, saved.revision);
  assert.equal(
    (await rpc(f.admin, "recover_schedule_resource_preparation", intent))
      .status,
    "unknown",
  );
  assert.equal(
    (await rpc(f.admin, "commit_schedule_resource_preparation", intent)).receipt
      .nativeResult.status,
    "approved",
  );
});

test("schedule recovery waits on the original key and observes the committed receipt instead of returning an early unknown", async () => {
  const f = await fixture(),
    saved = await save(f),
    intent = packet(f, saved),
    lock = `schedule-resource-key:${fixtures.adminA.id}:${intent.p_key}`;
  let lookup;
  const committed = await whileAdvisoryWaits(
    `schedule:${f.patient}`,
    () => f.admin.rpc("commit_schedule_resource_preparation", intent),
    async () => {
      lookup = Promise.resolve(
        f.admin.rpc("recover_schedule_resource_preparation", intent),
      );
      const started = Date.now();
      while (
        Number(
          sql(
            `select count(*) from pg_locks where locktype='advisory' and not granted and objsubid=1 and classid=((hashtextextended(${q(lock)},0)>>32)&4294967295)::oid and objid=(hashtextextended(${q(lock)},0)&4294967295)::oid`,
          ),
        ) === 0
      ) {
        assert.ok(
          Date.now() - started < 15000,
          "Lookup must actually wait on the original key",
        );
        await delay(25);
      }
    },
  );
  assert.ifError(committed.error);
  const found = await lookup;
  assert.ifError(found.error);
  assert.equal(found.data.status, "applied");
  assert.deepEqual(found.data.confirmation.receipt, committed.data.receipt);
});

test("an unseen private save after native closure retains own fields without sealing stale authority, and closed history stays reachable", async () => {
  const f = await fixture("schedule_change_reject");
  await shiftCommand(
    f.admin,
    f.patient,
    "decide_change",
    { id: f.target, approve: false, reason: "Concurrent native rejection" },
    f.reference.version,
  );
  const before = facts(f),
    docs = documents(f),
    saved = await save(f),
    row = await read(f);
  assert.equal(row.id, saved.id);
  assert.deepEqual(row.content.scheduleAction, f.fields);
  assert.equal(row.content.reference, null);
  const attempt = await f.admin.rpc(
    "commit_schedule_resource_preparation",
    packet(f, saved),
  );
  assert.ok(attempt.error);
  assert.equal(facts(f), before);
  assert.equal(documents(f), docs);
  const discarded = await save(
    f,
    saved,
    null,
    f.admin,
    randomUUID(),
    "discard",
  );
  assert.equal(discarded.state, "discarded");
  const own = await rpc(f.admin, "schedule_resource_preparation_list", {
    p_patient: f.patient,
  });
  assert.equal(own.find((r) => r.id === saved.id).state, "discarded");
  const next = await fixture("shift_type_edit"),
    draft = await save(next),
    applied = await rpc(
      next.admin,
      "commit_schedule_resource_preparation",
      packet(next, draft),
    );
  const current = await read(next);
  await save(next, current, null, next.admin, randomUUID(), "acknowledge");
  const history = await rpc(next.admin, "schedule_resource_preparation_list", {
    p_patient: next.patient,
  });
  const completed = history.find((r) => r.id === draft.id);
  assert.equal(completed.state, "completed");
  assert.deepEqual(completed.consumedResult, applied.receipt);
  assert.equal(completed.content, null);
});
