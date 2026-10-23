import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import {
  env,
  fixtures,
  actor,
  rpc,
  setup,
  issue,
  delivery,
} from "./v4-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
const settingsVersion = async (c, p) =>
  (await rpc(c, "patient_governance", { p_patient: p })).data.version;
const policy = async (c, p, change) =>
  rpc(c, "configure_patient_access", {
    p_patient: p,
    p_kind: "settings",
    p_change: change,
    p_key: randomUUID(),
    p_version: await settingsVersion(c, p),
  });
async function acknowledge(c, id) {
  return rpc(c, "acknowledge_requisition", {
    p_id: id,
    p_mode: "express",
    p_version: (await rpc(c, "requisition_progress", { p_id: id })).version,
  });
}

test("V4 review: collective science and dashboard archive filters match authoritative duties", async () => {
  for (const mode of ["any", "all", "disabled", "unassigned"]) {
    const { patient, admin, products } = await setup(),
      family = await actor("family", patient);
    await policy(admin, patient, {
      scienceByDispatch: false,
      scienceRequired: mode !== "disabled",
      scienceRequirement: mode === "all" ? "all" : "any",
      scienceRoles: [],
      scienceUsers:
        mode === "unassigned" ? [] : [fixtures.adminA.id, fixtures.family.id],
    });
    const req = await issue(patient, [products[0]]);
    assert.equal(
      (await rpc(family, "operational_tasks", { p_patient: patient }))
        .sciencePending,
      ["any", "all"].includes(mode) ? 1 : 0,
    );
    if (mode !== "unassigned") {
      await acknowledge(family, req.id);
      assert.equal(
        (await rpc(admin, "operational_tasks", { p_patient: patient }))
          .sciencePending,
        mode === "all" ? 1 : 0,
      );
      assert.equal(
        (
          await rpc(admin, "operational_document_list", {
            p_patient: patient,
            p_type: "REQ",
            p_status: "science_required",
          })
        ).total,
        mode === "all" ? 1 : 0,
      );
      if (mode === "all") {
        assert.equal(
          sql(
            "select count(*) from public.requisition_notifications where document_id=" +
              sqlLiteral(req.id) +
              " and recipient_user_id=" +
              sqlLiteral(fixtures.family.id) +
              " and event_key='req.science_recorded' and channel='internal'",
          ),
          "1",
        );
        assert.equal(
          sql(
            "select count(*) from public.requisition_notifications where document_id=" +
              sqlLiteral(req.id) +
              " and event_key='req.science_recorded' and channel='whatsapp'",
          ),
          "0",
        );
        await acknowledge(admin, req.id);
      }
      assert.equal(
        (await rpc(admin, "operational_tasks", { p_patient: patient }))
          .sciencePending,
        0,
      );
    } else
      assert.ok(
        (
          await family.rpc("acknowledge_requisition", {
            p_id: req.id,
            p_mode: "express",
            p_version: 1,
          })
        ).error,
      );
  }
  const { patient, admin, products } = await setup(),
    family = await actor("family", patient),
    pro = await actor("professional", patient);
  await policy(admin, patient, {
    scienceByDispatch: false,
    scienceRoles: ["family"],
    scienceUsers: [],
    archiveDays: 7,
  });
  const ids = [];
  for (const [index, product] of products.entries()) {
    const req = await issue(patient, [product]);
    ids.push(req.id);
    if (index === 0) await acknowledge(family, req.id);
    const ent = await delivery(patient, req, [product]);
    await rpc(pro, "supply_document_command", {
      p_id: ent.id,
      p_action: "receive",
      p_body: { divergences: [] },
      p_key: randomUUID(),
      p_version: ent.version,
    });
  }
  let tasks = await rpc(admin, "operational_tasks", { p_patient: patient }),
    list = await rpc(admin, "operational_document_list", {
      p_patient: patient,
      p_type: "REQ",
      p_status: "archive_pending",
    });
  assert.equal(tasks.archivePending, 2);
  assert.equal(list.total, tasks.archivePending);
  assert.deepEqual(new Set(list.data.map((d) => d.id)), new Set(ids));
  assert.deepEqual(
    new Set(list.data.map((d) => d.status)),
    new Set(["completed", "completed_science_pending"]),
  );
  async function archiveCapability(enabled) {
    await rpc(admin, "configure_patient_access", {
      p_patient: patient,
      p_kind: "capability",
      p_change: {
        capability: "req.archive",
        subjectUser: fixtures.adminA.id,
        enabled,
      },
      p_key: randomUUID(),
      p_version: await settingsVersion(admin, patient),
    });
  }
  await archiveCapability(false);
  assert.equal(
    (await rpc(admin, "operational_tasks", { p_patient: patient }))
      .archivePending,
    0,
  );
  assert.equal(
    (
      await rpc(admin, "operational_document_list", {
        p_patient: patient,
        p_status: "archive_pending",
      })
    ).total,
    0,
  );
  assert.equal(
    (
      await admin.rpc("archive_requisition", {
        p_id: ids[0],
        p_reason: "Operação negada mesmo ao administrador",
      })
    ).error?.code,
    "42501",
  );
  assert.equal(
    (await rpc(admin, "requisition_progress", { p_id: ids[0] })).archivedAt,
    null,
  );
  await archiveCapability(null);
  await rpc(admin, "archive_requisition", {
    p_id: ids[0],
    p_reason: "Arquivamento manual de cenário fictício revisado",
  });
  await issue(patient, [products[0]]);
  tasks = await rpc(admin, "operational_tasks", { p_patient: patient });
  list = await rpc(admin, "operational_document_list", {
    p_patient: patient,
    p_type: "REQ",
    p_status: "archive_pending",
  });
  assert.equal(tasks.archivePending, 1);
  assert.equal(list.total, 1);
  assert.equal(list.data[0].id, ids[1]);
  assert.equal(
    (
      await rpc(pro, "operational_document_list", {
        p_patient: patient,
        p_status: "archive_pending",
      })
    ).total,
    0,
  );
});

test("V4 review: global membership approval requires intended recipient acceptance and supports refusal", async () => {
  const { patient, admin } = await setup(),
    global = await actor("global");
  const oldVersion = await settingsVersion(admin, patient);
  await policy(admin, patient, { archiveDays: 8 });
  const conflict = await admin
    .rpc("configure_patient_access", {
      p_patient: patient,
      p_kind: "settings",
      p_change: { archiveDays: 9 },
      p_key: randomUUID(),
      p_version: oldVersion,
    })
    .abortSignal(AbortSignal.timeout(5000));
  assert.equal(conflict.error?.code, "PT409");
  assert.equal(await settingsVersion(admin, patient), oldVersion + 1);
  assert.equal(
    (await rpc(admin, "patient_governance", { p_patient: patient })).data
      .settings.archiveDays,
    8,
  );
  const target = createClient(env.url, env.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  assert.ifError(
    (
      await target.auth.signInWithPassword({
        email: fixtures.adminB.email,
        password: fixturePassword,
      })
    ).error,
  );
  async function proposal(userId = fixtures.adminB.id, role = "professional") {
    await rpc(global, "select_active_context", { p_patient: null });
    return rpc(global, "configure_patient_access", {
      p_patient: patient,
      p_kind: "membership",
      p_change: { userId, role },
      p_key: randomUUID(),
      p_version: await settingsVersion(admin, patient),
    });
  }
  const decide = (p, decision, hash) => ({
    p_patient: patient,
    p_kind: "membership",
    p_change: hash ? { invitationTokenHash: hash } : {},
    p_key: randomUUID(),
    p_version: p.base_version,
    p_request_id: p.id,
    p_decision: decision,
  });
  const rejected = await proposal();
  assert.equal(
    (await rpc(admin, "configure_patient_access", decide(rejected, "reject")))
      .status,
    "rejected",
  );
  const declined = await proposal(),
    hash = randomBytes(32).toString("hex");
  assert.ok(
    (await admin.rpc("configure_patient_access", decide(declined, "approve")))
      .error,
  );
  await rpc(global, "select_active_context", { p_patient: patient });
  assert.ok(
    (
      await global.rpc(
        "configure_patient_access",
        decide(declined, "approve", hash),
      )
    ).error,
  );
  const reader = await actor("reader", patient);
  assert.ok(
    (
      await reader.rpc(
        "configure_patient_access",
        decide(declined, "approve", hash),
      )
    ).error,
  );
  let approved = await rpc(
    admin,
    "configure_patient_access",
    decide(declined, "approve", hash),
  );
  assert.equal(approved.status, "awaiting_acceptance");
  assert.equal(
    sql(
      "select count(*) from public.care_recipient_memberships where care_recipient_id=" +
        sqlLiteral(patient) +
        " and user_id=" +
        sqlLiteral(fixtures.adminB.id),
    ),
    "0",
  );
  const family = await actor("family", patient);
  assert.ok(
    (await family.rpc("accept_invitation", { p_token_hash: hash })).error,
  );
  assert.equal(
    await rpc(target, "decline_invitation", { p_token_hash: hash }),
    true,
  );
  assert.ok(
    (await target.rpc("accept_invitation", { p_token_hash: hash })).error,
  );
  const accepted = await proposal(),
    next = randomBytes(32).toString("hex");
  approved = await rpc(
    admin,
    "configure_patient_access",
    decide(accepted, "approve", next),
  );
  assert.equal(approved.status, "awaiting_acceptance");
  assert.equal(
    (await rpc(target, "accept_invitation", { p_token_hash: next })).role,
    "professional",
  );
  assert.equal(
    (
      await rpc(admin, "patient_governance", { p_patient: patient })
    ).changes.find((c) => c.id === accepted.id).status,
    "applied",
  );
  assert.equal(
    sql(
      "select count(*) from public.care_recipient_memberships where care_recipient_id=" +
        sqlLiteral(patient) +
        " and role='admin' and status='active'",
    ),
    "2",
  );
  const existing = await proposal(fixtures.reader.id, "family");
  assert.equal(
    (await rpc(admin, "configure_patient_access", decide(existing, "approve")))
      .status,
    "applied",
  );
  await target.auth.signOut({ scope: "local" });
});

test("V4 review: external queue rejects app-only events and holds unapproved templates without retries", async () => {
  const { patient, admin, products } = await setup(),
    service = createClient(env.url, env.serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  assert.ifError(
    (
      await service.auth.admin.updateUserById(fixtures.family.id, {
        phone: "+15555550102",
        phone_confirm: true,
      })
    ).error,
  );
  const family = await actor("family", patient);
  await rpc(family, "register_verified_phone");
  await rpc(family, "update_my_profile", {
    p_name: "Teste family",
    p_registration: "",
    p_state: null,
    p_category: "",
    p_preferences: {
      internal: true,
      whatsapp: true,
      email: false,
      scienceExpress: true,
      scienceAutomatic: false,
      scienceWhatsApp: false,
    },
  });
  await rpc(admin, "configure_recipient_notification", {
    p_care_recipient_id: patient,
    p_recipient_user_id: fixtures.family.id,
    p_recipient_group: "family",
    p_channel: "whatsapp",
    p_destination: "+15555550102",
    p_enabled: true,
  });
  // Newer configuration always uses the authoritative policy version.
  async function rule(event, channels, includePdf = true) {
    return rpc(admin, "configure_patient_access", {
      p_patient: patient,
      p_kind: "notification_rule",
      p_change: { event, role: "family", channels, includePdf },
      p_key: randomUUID(),
      p_version: await settingsVersion(admin, patient),
    });
  }
  assert.ok(
    (
      await admin.rpc("configure_patient_access", {
        p_patient: patient,
        p_kind: "notification_rule",
        p_change: {
          event: "req.reopened",
          role: "family",
          channels: ["whatsapp"],
        },
        p_key: randomUUID(),
        p_version: await settingsVersion(admin, patient),
      })
    ).error,
  );
  await rule("req.issued", ["internal", "whatsapp"]);
  const req = await issue(patient, [products[0]]);
  const event = sql(
    "select id from public.document_events where document_id=" +
      sqlLiteral(req.id) +
      " and action='req.issued'",
  );
  sql(
    "select private.enqueue_notice(" +
      sqlLiteral(patient) +
      "," +
      sqlLiteral(fixtures.family.id) +
      ",'req.issued'," +
      sqlLiteral(req.id) +
      "," +
      sqlLiteral(event) +
      ")",
  );
  assert.equal(
    sql(
      "select count(*) from public.requisition_notifications where document_id=" +
        sqlLiteral(req.id) +
        " and recipient_user_id=" +
        sqlLiteral(fixtures.family.id) +
        " and channel='whatsapp'",
    ),
    "1",
  );
  for (const action of [
    "req.science_recorded",
    "req.reopened",
    "req.archived.manual",
    "req.archived.automatic",
  ]) {
    sql(
      "select private.enqueue_notice(" +
        sqlLiteral(patient) +
        "," +
        sqlLiteral(fixtures.family.id) +
        "," +
        sqlLiteral(action) +
        "," +
        sqlLiteral(req.id) +
        ")",
    );
    assert.equal(
      sql(
        "select count(*) from public.requisition_notifications where document_id=" +
          sqlLiteral(req.id) +
          " and event_key=" +
          sqlLiteral(action) +
          " and channel='whatsapp'",
      ),
      "0",
    );
    assert.equal(
      sql(
        "select count(*) from public.requisition_notifications where document_id=" +
          sqlLiteral(req.id) +
          " and event_key=" +
          sqlLiteral(action) +
          " and channel='internal'",
      ),
      "1",
    );
  }
  sql(
    "update public.meta_template_versions set approval='PREPARED' where name='hca_req_ciencia_familia_v4'",
  );
  sql(
    "update public.requisition_notifications set next_attempt_at=now()-interval '100 years' where document_id=" +
      sqlLiteral(req.id),
  );
  const worker = randomUUID(),
    jobs = await rpc(service, "claim_notification_jobs", {
      p_limit: 100,
      p_worker_id: worker,
      p_external_enabled: true,
    }),
    job = jobs.find(
      (j) => j.document_id === req.id && j.channel === "whatsapp",
    );
  assert.ok(job);
  for (const name of ["family", "global"]) {
    const unauthorized = await actor(name, patient);
    assert.equal(
      (
        await unauthorized.rpc("validate_notification_job", {
          p_id: job.id,
          p_worker_id: worker,
        })
      ).error?.code,
      "42501",
    );
    assert.equal(
      (
        await unauthorized.rpc("complete_notification_job", {
          p_id: job.id,
          p_worker_id: worker,
          p_state: "delivered",
        })
      ).error?.code,
      "42501",
    );
  }
  assert.equal(
    (
      await rpc(service, "bind_notification_template", {
        p_id: job.id,
        p_worker: worker,
        p_name: "hca_req_ciencia_familia_v4",
        p_version: 4,
        p_language: "pt_BR",
      })
    ).approval,
    "PREPARED",
  );
  const held = await rpc(service, "complete_notification_job", {
    p_id: job.id,
    p_worker_id: worker,
    p_state: "pending",
    p_error: "TEMPLATE_NOT_APPROVED",
  });
  assert.equal(held.state, "pending");
  assert.equal(held.next_attempt_at, "infinity");
  assert.ok(
    !(
      await rpc(service, "claim_notification_jobs", {
        p_limit: 100,
        p_worker_id: randomUUID(),
        p_external_enabled: true,
      })
    ).some((j) => j.id === job.id),
  );
  assert.equal(
    sql(
      "select attempts from public.requisition_notifications where id=" +
        sqlLiteral(job.id),
    ),
    String(held.attempts),
  );
  // LOCAL registry fixture only: no Meta approval is claimed.
  sql(
    "update public.meta_template_versions set approval='APPROVED' where name='hca_req_ciencia_familia_v4'",
  );
  assert.equal(
    sql(
      "select next_attempt_at<=now() from public.requisition_notifications where id=" +
        sqlLiteral(job.id),
    ),
    "t",
  );
  let nextWorker = randomUUID();
  assert.ok(
    (
      await rpc(service, "claim_notification_jobs", {
        p_limit: 100,
        p_worker_id: nextWorker,
        p_external_enabled: true,
      })
    ).some((j) => j.id === job.id),
  );
  await rule("req.issued", ["internal", "whatsapp"], false);
  const pdfHold = await rpc(service, "complete_notification_job", {
    p_id: job.id,
    p_worker_id: nextWorker,
    p_state: "pending",
    p_error: "PDF_TEMPLATE_VARIANT_REQUIRED",
  });
  assert.equal(pdfHold.next_attempt_at, "infinity");
  assert.ok(
    !(
      await rpc(service, "claim_notification_jobs", {
        p_limit: 100,
        p_worker_id: randomUUID(),
        p_external_enabled: true,
      })
    ).some((j) => j.id === job.id),
  );
  assert.equal(
    sql(
      "select attempts from public.requisition_notifications where id=" +
        sqlLiteral(job.id),
    ),
    String(pdfHold.attempts),
  );
  await rule("req.issued", ["internal", "whatsapp"], true);
  assert.equal(
    sql(
      "select include_pdf and next_attempt_at<=now() and last_error is null from public.requisition_notifications where id=" +
        sqlLiteral(job.id),
    ),
    "t",
  );
  nextWorker = randomUUID();
  assert.ok(
    (
      await rpc(service, "claim_notification_jobs", {
        p_limit: 100,
        p_worker_id: nextWorker,
        p_external_enabled: true,
      })
    ).some((j) => j.id === job.id),
  );
  await rule("req.issued", []);
  assert.equal(
    await rpc(service, "validate_notification_job", {
      p_id: job.id,
      p_worker_id: nextWorker,
    }),
    false,
  );
  assert.equal(
    sql(
      "select state from public.requisition_notifications where id=" +
        sqlLiteral(job.id),
    ),
    "cancelled",
  );
  await rule("req.issued", []);
  const disabled = await issue(patient, [products[1]]);
  assert.equal(
    sql(
      "select count(*) from public.requisition_notifications where document_id=" +
        sqlLiteral(disabled.id) +
        " and recipient_user_id=" +
        sqlLiteral(fixtures.family.id),
    ),
    "0",
  );
  await rule("com.issued", []);
  const draft = await rpc(family, "create_supply_document", {
    p_patient: patient,
    p_type: "COM",
    p_payload: { lines: [{ productId: products[0], quantity: "1" }] },
    p_key: randomUUID(),
    p_draft: true,
  });
  await rpc(family, "supply_document_command", {
    p_id: draft.id,
    p_action: "submit",
    p_body: {},
    p_key: randomUUID(),
    p_version: draft.version,
  });
  assert.equal(
    sql(
      "select count(*) from public.requisition_notifications where document_id=" +
        sqlLiteral(draft.id) +
        " and recipient_user_id=" +
        sqlLiteral(fixtures.family.id) +
        " and channel='whatsapp'",
    ),
    "0",
  );
});
