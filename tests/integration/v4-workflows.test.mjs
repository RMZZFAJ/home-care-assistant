import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID, randomBytes, createHmac } from "node:crypto";
import { setInterval, clearInterval } from "node:timers";
import { createClient } from "@supabase/supabase-js";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";

import {
  env,
  fixtures,
  actor,
  rpc,
  setup,
  issue,
  delivery,
  request,
  claimExternalFixtureJob,
} from "./v4-fixtures.mjs";

test("V4: concurrent local administrator revocations preserve one active administrator", async () => {
  const { patient, admin } = await setup();
  const otherAdmin = await actor("global", patient);
  const results = await Promise.all([
    admin.rpc("admin_set_membership_status", {
      p_care_recipient_id: patient,
      p_user_id: fixtures.adminA.id,
      p_status: "revoked",
    }),
    otherAdmin.rpc("admin_set_membership_status", {
      p_care_recipient_id: patient,
      p_user_id: fixtures.global.id,
      p_status: "revoked",
    }),
  ]);
  assert.equal(results.filter((result) => !result.error).length, 1);
  assert.match(
    results.find((result) => result.error).error.message,
    /last patient administrator|local administrator/,
  );
  assert.equal(
    sql(
      "select count(*) from public.care_recipient_memberships where care_recipient_id=" +
        sqlLiteral(patient) +
        " and role='admin' and status='active'",
    ),
    "1",
  );
});

test("V4: shared needs, partial receipt, formal resolution and science remain independent", async () => {
  const { patient, admin, products } = await setup();
  const req = await issue(patient, products);
  const pro = await actor("professional", patient);
  const duplicate = await pro.rpc(
    "submit_requisition",
    request(patient, [products[0]]),
  );
  assert.ok(duplicate.error);
  assert.match(duplicate.error.message, /duplicate review/);
  const duplicateArgs = request(patient, [products[0]]);
  duplicateArgs.p_lines[0].repeatReason =
    "A mesma necessidade permanece pendente";
  const second = (await rpc(pro, "submit_requisition", duplicateArgs))[0];
  const secondLines = await pro
    .from("requisition_items")
    .select("id")
    .eq("requisition_id", second.requisition_id);
  assert.ifError(secondLines.error);
  const family = await actor("family", patient);
  const payload = {
    source: "FAMILY",
    destination: "CARE_TEAM",
    recipientId: fixtures.professional.id,
    lines: products.map((productId, i) => ({
      productId,
      quantity: i ? "2" : "10",
      requisitionItemIds: [
        req.lines.find((row) => row.product_id === productId).id,
        ...(i ? [] : [secondLines.data[0].id]),
      ],
      metadata: i
        ? {}
        : {
            sharedNeedReason:
              "Duas requisições reiteram a mesma necessidade física",
          },
    })),
  };
  const key = randomUUID();
  const ent = await rpc(family, "create_supply_document", {
    p_patient: patient,
    p_type: "ENT",
    p_payload: payload,
    p_key: key,
  });
  assert.equal(
    (
      await rpc(family, "create_supply_document", {
        p_patient: patient,
        p_type: "ENT",
        p_payload: payload,
        p_key: key,
      })
    ).id,
    ent.id,
  );
  const progress = await rpc(pro, "requisition_progress", { p_id: req.id });
  assert.equal(progress.scienceSatisfied, true);
  assert.equal(progress.science[0].mode, "dispatch");
  assert.equal(progress.science[0].user_id, fixtures.family.id);
  assert.equal(ent.status, "pending_receipt");
  assert.equal(ent.fullyCheckedLines, 0);
  assert.ok(ent.lines.every((row) => !row.metadata.issueOpen));
  const first = ent.lines.find((row) => row.product_id === products[0]);
  const accepted = await rpc(pro, "supply_document_command", {
    p_id: ent.id,
    p_action: "receive",
    p_body: {
      divergences: [
        {
          lineId: first.id,
          acceptedQuantity: "6",
          notes: "Quatro unidades não chegaram",
        },
      ],
    },
    p_key: randomUUID(),
    p_version: ent.version,
  });
  assert.equal(accepted.status, "disputed");
  assert.equal(accepted.fullyCheckedLines, 1);
  const currentSnapshot = await rpc(pro, "operational_document", {
    p_id: req.id,
  });
  assert.equal(
    currentSnapshot.canonical_snapshot.fulfillmentLines.filter(
      (line) => line.attended,
    ).length,
    2,
  );
  assert.equal(
    (await rpc(pro, "requisition_fulfillment", { p_requisition: req.id }))
      .fulfilled,
    2,
  );
  assert.equal(
    (
      await rpc(pro, "requisition_fulfillment", {
        p_requisition: second.requisition_id,
      })
    ).fulfilled,
    1,
  );
  assert.equal(
    (await rpc(pro, "requisition_progress", { p_id: req.id })).completedAt,
    null,
  );
  const fixed = await rpc(admin, "supply_document_command", {
    p_id: ent.id,
    p_action: "resolve",
    p_body: {
      lineId: first.id,
      quantity: "4",
      resolution: "missing",
      reason: "Falta confirmada por conferência formal",
    },
    p_key: randomUUID(),
    p_version: accepted.version,
  });
  assert.equal(fixed.status, "confirmed");
  assert.equal(fixed.fullyCheckedLines, 1);
  const finished = await rpc(admin, "requisition_progress", { p_id: req.id });
  assert.ok(finished.completedAt);
  assert.equal(finished.manualArchiveRequired, false);
  const balance = await admin
    .from("current_stock_balances")
    .select("balance,location")
    .eq("care_recipient_id", patient)
    .eq("product_id", products[0]);
  assert.ifError(balance.error);
  assert.equal(
    String(balance.data.find((row) => row.location === "CARE_TEAM").balance),
    "6",
  );
  assert.equal(
    String(balance.data.find((row) => row.location === "FAMILY").balance),
    "20",
  );
  const queued = sql(
    `select count(*) from public.requisition_notifications where document_id=${sqlLiteral(req.id)} and recipient_user_id=${sqlLiteral(fixtures.professional.id)} and event_key='req.registered_author' and include_pdf=false;`,
  );
  assert.equal(queued, "1");
  const global = await actor("global");
  assert.ok(
    (
      await global.rpc("archive_requisition", {
        p_id: req.id,
        p_reason: "Global não é autoridade operacional local",
      })
    ).error,
  );
  const archived = await rpc(admin, "archive_requisition", {
    p_id: req.id,
    p_reason: "Conferência administrativa concluída",
  });
  assert.ok(archived.archivedAt);
});

test("V4: local changes apply immediately; global proposals need a different local person", async () => {
  const { patient, admin } = await setup();
  const local = await rpc(admin, "configure_patient_access", {
    p_patient: patient,
    p_kind: "settings",
    p_change: { scienceByDispatch: false },
    p_key: randomUUID(),
    p_version: 1,
  });
  assert.equal(local.status, "applied");
  const global = await actor("global");
  const proposed = await rpc(global, "configure_patient_access", {
    p_patient: patient,
    p_kind: "settings",
    p_change: { balReview: "required" },
    p_key: randomUUID(),
    p_version: 2,
  });
  assert.equal(proposed.status, "pending");
  const own = await actor("global", patient);
  assert.ok(
    (
      await own.rpc("configure_patient_access", {
        p_patient: patient,
        p_kind: "settings",
        p_change: {},
        p_key: randomUUID(),
        p_version: 2,
        p_request_id: proposed.id,
        p_decision: "approve",
      })
    ).error,
  );
  const accepted = await rpc(admin, "configure_patient_access", {
    p_patient: patient,
    p_kind: "settings",
    p_change: {},
    p_key: randomUUID(),
    p_version: 2,
    p_request_id: proposed.id,
    p_decision: "approve",
  });
  assert.equal(accepted.status, "applied");
  const denied = await actor("reader", patient);
  assert.ok(
    (
      await denied.rpc("configure_patient_access", {
        p_patient: patient,
        p_kind: "settings",
        p_change: { balReview: "optional" },
        p_key: randomUUID(),
        p_version: 3,
      })
    ).error,
  );
});

test("V4: completion without science permanently blocks automatic archive and preserves later acknowledgement", async () => {
  const { patient, admin, products } = await setup();
  await rpc(admin, "configure_patient_access", {
    p_patient: patient,
    p_kind: "settings",
    p_change: { scienceByDispatch: false },
    p_key: randomUUID(),
    p_version: 1,
  });
  const req = await issue(patient, [products[0]]),
    ent = await delivery(patient, req, [products[0]]);
  const pro = await actor("professional", patient);
  await rpc(pro, "supply_document_command", {
    p_id: ent.id,
    p_action: "receive",
    p_body: { divergences: [] },
    p_key: randomUUID(),
    p_version: ent.version,
  });
  let progress = await rpc(admin, "requisition_progress", { p_id: req.id });
  assert.ok(progress.completedAt);
  assert.equal(progress.scienceSatisfied, false);
  assert.equal(progress.manualArchiveRequired, true);
  sql(
    `update public.requisition_lifecycle set completed_at=now()-interval '30 days' where requisition_id=${sqlLiteral(req.id)};`,
  );
  const service = createClient(env.url, env.serviceKey, {
    auth: { persistSession: false },
  });
  await rpc(service, "run_operational_schedule");
  assert.equal(
    (await rpc(admin, "requisition_progress", { p_id: req.id })).archivedAt,
    null,
  );
  const family = await actor("family", patient);
  progress = await rpc(family, "acknowledge_requisition", {
    p_id: req.id,
    p_mode: "express",
    p_version: progress.version,
  });
  assert.equal(progress.scienceSatisfied, true);
  assert.equal(progress.manualArchiveRequired, true);
  await rpc(service, "run_operational_schedule");
  assert.equal(
    (await rpc(admin, "requisition_progress", { p_id: req.id })).archivedAt,
    null,
  );
  assert.ok(
    (
      await rpc(admin, "archive_requisition", {
        p_id: req.id,
        p_reason: "Arquivamento manual com evidência da exceção",
      })
    ).archivedAt,
  );
});

test("V4: automatic science requires both policy and personal consent, preserving its actual origin", async () => {
  const { patient, admin, products } = await setup();
  await rpc(admin, "configure_patient_access", {
    p_patient: patient,
    p_kind: "settings",
    p_change: { scienceAutomatic: true, scienceByDispatch: false },
    p_key: randomUUID(),
    p_version: 1,
  });
  const req = await issue(patient, [products[0]]),
    family = await actor("family", patient);
  await rpc(family, "update_my_profile", {
    p_name: "Teste family",
    p_registration: "",
    p_state: null,
    p_category: "",
    p_preferences: {
      internal: true,
      whatsapp: false,
      email: false,
      scienceExpress: true,
      scienceAutomatic: false,
      scienceWhatsApp: false,
    },
  });
  assert.ok(
    (
      await family.rpc("acknowledge_requisition", {
        p_id: req.id,
        p_mode: "app_visible",
        p_version: 1,
      })
    ).error,
  );
  await rpc(family, "update_my_profile", {
    p_name: "Teste family",
    p_registration: "",
    p_state: null,
    p_category: "",
    p_preferences: {
      internal: true,
      whatsapp: false,
      email: false,
      scienceExpress: true,
      scienceAutomatic: true,
      scienceWhatsApp: false,
    },
  });
  const accepted = await rpc(family, "acknowledge_requisition", {
    p_id: req.id,
    p_mode: "app_visible",
    p_version: 1,
  });
  assert.equal(accepted.scienceSatisfied, true);
  assert.equal(accepted.science[0].mode, "app_visible");
  const repeated = await rpc(family, "acknowledge_requisition", {
    p_id: req.id,
    p_mode: "app_visible",
    p_version: 1,
  });
  assert.equal(repeated.science.length, 1);
  const pro = await actor("professional", patient);
  assert.ok(
    (
      await pro.rpc("acknowledge_requisition", {
        p_id: req.id,
        p_mode: "express",
        p_version: accepted.version,
      })
    ).error,
  );
  await rpc(family, "update_my_profile", {
    p_name: "Teste family",
    p_registration: "",
    p_state: null,
    p_category: "",
    p_preferences: {
      internal: true,
      whatsapp: false,
      email: false,
      scienceExpress: true,
      scienceAutomatic: false,
      scienceWhatsApp: false,
    },
  });
});

test(
  "V4: two Auth sessions receive private invalidations; another user's topic is refused",
  { timeout: 35000 },
  async () => {
    const { patient, products } = await setup();
    const family = await actor("family", patient),
      pro = await actor("professional", patient);
    const channels = [];
    function subscribe(client, uid) {
      const received = [];
      const listeners = [];
      let timer;
      const ready = new Promise((resolve, reject) => {
        timer = setTimeout(
          () => reject(new Error("Realtime private subscription timed out")),
          20000,
        );
        const channel = client
          .channel("hca:user:" + uid, { config: { private: true } })
          .on("broadcast", { event: "invalidate" }, (event) => {
            received.push(event.payload);
            for (const notify of listeners) notify(event.payload);
          })
          .subscribe((status) => {
            if (status === "SUBSCRIBED") {
              clearTimeout(timer);
              resolve();
            }
            if (status === "CHANNEL_ERROR") {
              clearTimeout(timer);
              reject(new Error("Realtime private subscription rejected"));
            }
          });
        channels.push([client, channel]);
      });
      return { ready, received, listeners };
    }
    try {
      const a = subscribe(family, fixtures.family.id),
        b = subscribe(pro, fixtures.professional.id);
      await Promise.all([a.ready, b.ready]);
      // Require the real database stream, not merely a joined WebSocket, to be ready.
      await new Promise((resolve, reject) => {
        let interval;
        let timeout;
        const check = () => {
          if (a.received.length && b.received.length) {
            clearInterval(interval);
            clearTimeout(timeout);
            resolve();
          }
        };
        a.listeners.push(check);
        b.listeners.push(check);
        const ping = () =>
          sql(
            `select realtime.send('{"revision":0}'::jsonb,'invalidate','hca:user:${fixtures.family.id}',true);select realtime.send('{"revision":0}'::jsonb,'invalidate','hca:user:${fixtures.professional.id}',true);`,
          );
        interval = setInterval(ping, 400);
        timeout = setTimeout(() => {
          clearInterval(interval);
          reject(new Error("Database broadcast stream is not ready"));
        }, 10000);
        ping();
        check();
      });
      const changes = [a, b].map(
        (subscription) =>
          new Promise((resolve) =>
            subscription.listeners.push((payload) => {
              if (Number(payload.revision) > 0) resolve(payload);
            }),
          ),
      );
      const req = await issue(patient, [products[0]]);
      const payloads = await Promise.race([
        Promise.all(changes),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Realtime update missing")), 10000),
        ),
      ]);
      for (const payload of payloads)
        assert.ok(
          Object.keys(payload).every((key) => ["revision", "id"].includes(key)),
        );
      for (const client of [family, pro]) {
        const result = await client
          .from("requisitions")
          .select("id")
          .eq("id", req.id)
          .single();
        assert.ifError(result.error);
        assert.equal(result.data.id, req.id);
      }
      let timer;
      const rejected = await new Promise((resolve) => {
        timer = setTimeout(() => resolve(false), 10000);
        const channel = pro
          .channel("hca:user:" + fixtures.family.id, {
            config: { private: true },
          })
          .subscribe((status) => {
            if (status === "CHANNEL_ERROR") {
              clearTimeout(timer);
              resolve(true);
            }
            if (status === "SUBSCRIBED") {
              clearTimeout(timer);
              resolve(false);
            }
          });
        channels.push([pro, channel]);
      });
      assert.equal(rejected, true);
    } finally {
      await Promise.all(
        channels.map(([client, channel]) => client.removeChannel(channel)),
      );
      await Promise.all([
        family.realtime.disconnect(),
        pro.realtime.disconnect(),
      ]);
    }
  },
);

test("V4: scheduled standalone reminders are idempotent, scoped and do not change stock", async () => {
  const { patient, admin, products } = await setup();
  await rpc(admin, "configure_patient_access", {
    p_patient: patient,
    p_kind: "settings",
    p_change: {
      shiftReminder: {
        enabled: true,
        hour: 0,
        days: ["0", "1", "2", "3", "4", "5", "6"],
        userIds: [fixtures.professional.id],
      },
    },
    p_key: randomUUID(),
    p_version: 1,
  });
  const service = createClient(env.url, env.serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const before = sql(
    "select coalesce(sum(quantity),0) from public.stock_movements where care_recipient_id=" +
      sqlLiteral(patient),
  );
  await rpc(service, "run_operational_schedule");
  await rpc(service, "run_operational_schedule");
  const pro = await actor("professional", patient);
  const queueSize = Number(sql("select count(*) from public.requisition_notifications"));
  let deliveredCount = Number(sql("select count(*) from public.requisition_notifications where channel='internal' and state='delivered'"));
  let notices;
  for (let batch = 0; batch <= queueSize; batch++) {
    sql("select private.deliver_internal_notifications()");
    notices = await pro
      .from("requisition_notifications")
      .select("id,state,event_key,reminder_id")
      .eq("care_recipient_id", patient)
      .eq("event_key", "shift.reminder");
    assert.ifError(notices.error);
    if (notices.data[0]?.state === "delivered") break;
    const nextCount = Number(sql("select count(*) from public.requisition_notifications where channel='internal' and state='delivered'"));
    if (nextCount === deliveredCount) break;
    deliveredCount = nextCount;
  }
  assert.ifError(notices.error);
  assert.equal(notices.data.length, 1);
  assert.equal(notices.data[0].state, "delivered");
  assert.equal(
    sql(
      "select coalesce(sum(quantity),0) from public.stock_movements where care_recipient_id=" +
        sqlLiteral(patient),
    ),
    before,
  );
  assert.ok((await pro.rpc("run_operational_schedule")).error);
  assert.equal(
    sql(
      "select has_function_privilege('anon','public.select_active_context(uuid)','EXECUTE')",
    ),
    "f",
  );
  const req = await issue(patient, [products[0]]);
  const ent = await delivery(patient, req, [products[0]]);
  sql(
    "update public.operational_documents set updated_at=now()-interval '25 hours' where id=" +
      sqlLiteral(ent.id),
  );
  const ledger = () =>
    sql(
      "select coalesce(jsonb_agg(to_jsonb(m) order by id),'[]') from public.stock_movements m where care_recipient_id=" +
        sqlLiteral(patient),
    );
  const originalLedger = ledger();
  await rpc(service, "run_operational_schedule");
  await rpc(service, "run_operational_schedule");
  assert.equal(
    sql(
      "select count(*) from public.document_events where action='ent.reminder' and document_id=" +
        sqlLiteral(ent.id),
    ),
    "1",
  );
  assert.equal(ledger(), originalLedger);
});

function totp(secret) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const c of secret.replaceAll("=", ""))
    bits += alphabet.indexOf(c).toString(2).padStart(5, "0");
  const key = Buffer.from(bits.match(/.{8}/g).map((part) => parseInt(part, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const mac = createHmac("sha1", key).update(counter).digest(),
    offset = mac.at(-1) & 15;
  return String((mac.readUInt32BE(offset) & 0x7fffffff) % 1000000).padStart(
    6,
    "0",
  );
}
test("V4: real Auth TOTP enforces AAL2 for administration and revoked sessions lose authority", async () => {
  const { patient, products } = await setup();
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
  await rpc(client, "select_active_context", { p_patient: patient });
  let factor;
  try {
    const enrolled = await client.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "Local verification " + randomUUID(),
    });
    assert.ifError(enrolled.error);
    factor = enrolled.data.id;
    assert.ifError(
      (
        await client.auth.mfa.challengeAndVerify({
          factorId: factor,
          code: totp(enrolled.data.totp.secret),
        })
      ).error,
    );
    const limited = createClient(env.url, env.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    assert.ifError(
      (
        await limited.auth.signInWithPassword({
          email: fixtures.adminA.email,
          password: fixturePassword,
        })
      ).error,
    );
    await rpc(limited, "select_active_context", { p_patient: patient });
    const args = {
      p_patient: patient,
      p_product: products[0],
      p_quantity: "1",
      p_action: "inbound",
      p_reason: "Verificação local de autenticação em duas etapas",
      p_key: randomUUID(),
    };
    assert.ok((await limited.rpc("family_stock_movement", args)).error);
    await rpc(client, "family_stock_movement", args);
    await limited.auth.signOut({ scope: "local" });
  } finally {
    if (factor)
      assert.ifError(
        (await client.auth.mfa.unenroll({ factorId: factor })).error,
      );
  }
  const session = (await client.auth.getSession()).data.session;
  assert.ok(session);
  assert.ifError((await client.auth.signOut({ scope: "local" })).error);
  const response = await fetch(env.url + "/rest/v1/rpc/my_session_valid", {
    method: "POST",
    headers: {
      apikey: env.anonKey,
      authorization: "Bearer " + session.access_token,
      "content-type": "application/json",
    },
    body: "{}",
  });
  assert.equal(await response.json(), false);
});

test("V4: purpose-bound receipt Flow preserves partial stock and no-issues never debits", async () => {
  const { patient, admin, products } = await setup();
  await rpc(admin, "configure_patient_access", {
    p_patient: patient,
    p_kind: "settings",
    p_change: { whatsappSimpleAcceptance: true },
    p_key: randomUUID(),
    p_version: 1,
  });
  const req = await issue(patient, products),
    ent = await delivery(patient, req, products),
    pro = await actor("professional", patient);
  await rpc(pro, "register_verified_phone");
  const hash = randomBytes(32).toString("hex"),
    service = createClient(env.url, env.serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  await rpc(pro, "create_receipt_flow_session", {
    p_document: ent.id,
    p_hash: hash,
  });
  assert.ok(
    (
      await service.rpc("flow_exchange", {
        p_hash: hash,
        p_submit: { operation: "confirm" },
      })
    ).error,
  );
  assert.equal(
    (await rpc(service, "flow_exchange", { p_hash: hash })).screen,
    "RECEIPT_MODE",
  );
  await rpc(service, "flow_exchange", {
    p_hash: hash,
    p_submit: { operation: "mode", mode: "divergence" },
  });
  assert.ok(
    (
      await service.rpc("flow_exchange", {
        p_hash: hash,
        p_submit: {
          operation: "line",
          lineId: ent.lines[0].id,
          acceptedQuantity: "999",
          next: "review",
        },
      })
    ).error,
  );
  await rpc(service, "flow_exchange", {
    p_hash: hash,
    p_submit: {
      operation: "line",
      lineId: ent.lines.find((l) => l.product_id === products[0]).id,
      acceptedQuantity: "6",
      notes: "Quatro unidades ausentes",
      next: "review",
    },
  });
  const result = await rpc(service, "flow_exchange", {
    p_hash: hash,
    p_submit: { operation: "confirm" },
  });
  assert.equal(result.status, "disputed");
  assert.deepEqual(
    await rpc(service, "flow_exchange", {
      p_hash: hash,
      p_submit: { operation: "confirm" },
    }),
    result,
  );
  const balances = await pro
    .from("current_stock_balances")
    .select("product_id,balance")
    .eq("care_recipient_id", patient)
    .eq("location", "CARE_TEAM");
  assert.ifError(balances.error);
  assert.equal(
    String(balances.data.find((l) => l.product_id === products[0]).balance),
    "6",
  );
  assert.equal(
    String(balances.data.find((l) => l.product_id === products[1]).balance),
    "2",
  );
  const noIssues = randomBytes(32).toString("hex");
  await rpc(pro, "create_flow_session", {
    p_patient: patient,
    p_hash: noIssues,
  });
  const before = sql(
    "select count(*) from public.stock_movements where care_recipient_id=" +
      sqlLiteral(patient),
  );
  assert.equal(
    (
      await rpc(service, "flow_exchange", {
        p_hash: noIssues,
        p_submit: { kind: "no_issues" },
      })
    ).noIssues,
    true,
  );
  assert.equal(
    sql(
      "select count(*) from public.stock_movements where care_recipient_id=" +
        sqlLiteral(patient),
    ),
    before,
  );
  assert.ok(
    (
      await service.rpc("flow_exchange", {
        p_hash: noIssues,
        p_submit: { kind: "consumption", text: "Outro propósito" },
      })
    ).error,
  );
});

test("V4: WhatsApp science requires verified contact, consent and correlated template evidence (local provider contract)", async () => {
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
      scienceAutomatic: true,
      scienceWhatsApp: true,
    },
  });
  await rpc(admin, "configure_patient_access", {
    p_patient: patient,
    p_kind: "settings",
    p_change: {
      scienceWhatsApp: true,
      scienceAutomatic: true,
      scienceByDispatch: false,
    },
    p_key: randomUUID(),
    p_version: 1,
  });
  await rpc(admin, "configure_recipient_notification", {
    p_care_recipient_id: patient,
    p_recipient_user_id: fixtures.family.id,
    p_recipient_group: "family",
    p_channel: "whatsapp",
    p_destination: "+15555550102",
    p_enabled: true,
  });
  // Registry approval is a LOCAL fixture only; no Meta submission or delivery is represented.
  sql(
    "update public.meta_template_versions set approval='APPROVED' where name in ('hca_req_ciencia_simplificada_v4','hca_req_ciencia_familia_v4')",
  );
  async function queued(product) {
    const req = await issue(patient, [product]);
    sql(
      "update public.requisition_notifications set next_attempt_at=now()-interval '100 years' where document_id=" +
        sqlLiteral(req.id),
    );
    const worker = randomUUID();
    const job = await claimExternalFixtureJob(service, worker,
      (n) =>
        n.document_id === req.id &&
        n.channel === "whatsapp" &&
        n.recipient_user_id === fixtures.family.id,
    );
    assert.ok(job);
    return { req, worker, job };
  }
  const first = await queued(products[0]),
    hash = randomBytes(32).toString("hex");
  assert.equal(
    await rpc(service, "issue_science_challenge", {
      p_notification: first.job.id,
      p_worker: first.worker,
      p_hash: hash,
    }),
    true,
  );
  assert.equal(
    await rpc(service, "confirm_whatsapp_science", {
      p_provider_id: "local-wrong-" + randomUUID(),
      p_phone: "15555550999",
      p_hash: hash,
    }),
    false,
  );
  assert.equal(
    await rpc(service, "confirm_whatsapp_science", {
      p_provider_id: "local-science-" + randomUUID(),
      p_phone: "15555550102",
      p_hash: hash,
    }),
    true,
  );
  assert.equal(
    (await rpc(family, "requisition_progress", { p_id: first.req.id }))
      .science[0].mode,
    "whatsapp_confirm",
  );
  assert.equal(
    await rpc(service, "confirm_whatsapp_science", {
      p_provider_id: "local-reused-" + randomUUID(),
      p_phone: "15555550102",
      p_hash: hash,
    }),
    false,
  );
  const second = await queued(products[1]);
  assert.ok(
    await rpc(service, "bind_notification_template", {
      p_id: second.job.id,
      p_worker: second.worker,
      p_name: "hca_req_ciencia_familia_v4",
      p_version: 4,
      p_language: "pt_BR",
    }),
  );
  const reference = "local-read-contract-" + randomUUID();
  await rpc(service, "complete_notification_job", {
    p_id: second.job.id,
    p_worker_id: second.worker,
    p_state: "accepted",
    p_provider_reference: reference,
  });
  await rpc(service, "notification_webhook", {
    p_provider_reference: "unrelated-" + randomUUID(),
    p_state: "read",
    p_notification_id: second.job.id,
  });
  assert.equal(
    (await rpc(family, "requisition_progress", { p_id: second.req.id })).science
      .length,
    0,
  );
  await rpc(service, "notification_webhook", {
    p_provider_reference: reference,
    p_state: "read",
    p_notification_id: second.job.id,
  });
  assert.equal(
    (await rpc(family, "requisition_progress", { p_id: second.req.id }))
      .science[0].mode,
    "whatsapp_read",
  );
});
