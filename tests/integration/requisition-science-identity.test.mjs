import assert from "node:assert/strict";
import { test } from "node:test";
import { randomBytes, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { setup, actor, rpc, issue, request, fixtures, env } from "./v4-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
import { whileAdvisoryWaits } from "./lock-barrier.mjs";

const progress = (client, id) => rpc(client, "requisition_progress", { p_id: id });
const payload = (f, req, quantity = "2") => ({ recipientReason: "Escolha manual fictícia para este recebimento",  source: "FAMILY", destination: "CARE_TEAM", recipientId: fixtures.professional.id, lines: [{ productId: f.products[0], quantity, requisitionItemIds: [req.lines[0].id] }] });
const scienceCount = id => Number(sql(`select count(*) from public.requisition_science_events where requisition_id=${sqlLiteral(id)};`));

test("P02 one shared expedition records a separate SCI for each linked material without duplicating custody or accepted credit", async () => {
  const f = await setup(), first = await issue(f.patient, [f.products[0]]), pro = await actor("professional", f.patient), family = await actor("family", f.patient);
  const args = request(f.patient, [f.products[0]]); args.p_lines[0].repeatReason = "Necessidade compartilhada fictícia reavaliada";
  const second = (await rpc(pro, "submit_requisition", args))[0].requisition_id;
  const secondLine = sql(`select id from public.requisition_items where requisition_id=${sqlLiteral(second)};`);
  const ids = [first.id, second], views = await Promise.all(ids.map(id => progress(family, id)));
  const command = { p_patient: f.patient, p_type: "ENT", p_key: randomUUID(), p_draft: false, p_payload: { recipientReason: "Escolha manual fictícia para este recebimento",  source: "FAMILY", destination: "CARE_TEAM", recipientId: fixtures.professional.id, lines: [{ productId: f.products[0], quantity: "2", requisitionItemIds: [first.lines[0].id, secondLine], metadata: { sharedNeedReason: "Uma única entrega fictícia atende ambas as necessidades" } }] } };
  const ent = await rpc(family, "create_supply_document", command); await rpc(family, "create_supply_document", command);
  for (const [index, id] of ids.entries()) {
    const view = await progress(family, id); assert.equal(view.science.length, 1); assert.equal(view.science[0].mode, "dispatch");
    assert.equal(view.science[0].material_identity, views[index].materialIdentity); assert.equal(view.science[0].evidence.deliveryId, ent.id);
  }
  assert.equal(sql(`select sum(quantity)::text from public.stock_movements where care_recipient_id=${sqlLiteral(f.patient)} and source_location='FAMILY' and destination_location='TRANSIT';`), "2.000000");
  await rpc(pro, "supply_document_command", { p_id: ent.id, p_action: "receive", p_body: { divergences: [] }, p_key: randomUUID(), p_version: ent.version });
  assert.equal(sql(`select sum(quantity)::text from public.stock_movements where care_recipient_id=${sqlLiteral(f.patient)} and destination_location='CARE_TEAM';`), "2.000000");
  for (const [index, id] of ids.entries()) { const view = await progress(family, id); assert.equal(view.science.length, 1); assert.equal(view.materialIdentity, views[index].materialIdentity); }
});

test("P02 a read-only historical REQ cannot become a new COM/ENT need or bypass mandatory SCI", async () => {
  const f = await setup(), family = await actor("family", f.patient);
  const physicalProtocol = Number(sql("select coalesce(max(physical_protocol),0)+1 from public.historical_requisition_imports;"));
  await rpc(f.admin, "import_historical_requisitions", { p_source_hash: randomBytes(32).toString("hex"), p_rows: [{ physicalProtocol, careRecipientId: f.patient, status: "submitted", lines: [{ productId: f.products[0], currentStock: null, urgent: false }], extraItems: [], observations: ["Registro físico fictício somente para consulta."] }] });
  const id = sql(`select id from public.requisitions where care_recipient_id=${sqlLiteral(f.patient)} and is_historical;`);
  const line = sql(`select id from public.requisition_items where requisition_id=${sqlLiteral(id)};`);
  const before = sql(`select jsonb_build_object('request',(select to_jsonb(r) from public.requisitions r where id=${sqlLiteral(id)}),'events',(select jsonb_agg(to_jsonb(e) order by version) from public.document_events e where document_id=${sqlLiteral(id)}),'ledger',(select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${sqlLiteral(f.patient)}));`);
  for (const p_type of ["COM", "ENT"]) for (const p_draft of [false, true]) {
    const key = randomUUID(), lines = [{ productId: f.products[0], quantity: "2", requisitionItemIds: [line] }];
    const p_payload = p_type === "COM" ? { origin: "purchase", lines } : { recipientReason: "Escolha manual fictícia para este recebimento",  source: "FAMILY", destination: "CARE_TEAM", recipientId: fixtures.professional.id, lines };
    const result = await family.rpc("create_supply_document", { p_patient: f.patient, p_type, p_payload, p_draft, p_key: key });
    assert.equal(result.error?.code, "23514");
    assert.match(result.error.message, /historical requisition is read only/);
    assert.equal(sql(`select count(*) from public.operational_documents where idempotency_key=${sqlLiteral(key)};`), "0");
  }
  assert.equal(scienceCount(id), 0);
  assert.equal(sql(`select jsonb_build_object('request',(select to_jsonb(r) from public.requisitions r where id=${sqlLiteral(id)}),'events',(select jsonb_agg(to_jsonb(e) order by version) from public.document_events e where document_id=${sqlLiteral(id)}),'ledger',(select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${sqlLiteral(f.patient)}));`), before);
});

test("P02 SCI-005 records the actual dispatcher after drafts/edits, independently of every legacy disable flag and earlier express SCI", async () => {
  const f = await setup(), req = await issue(f.patient, [f.products[0]]), family = await actor("family", f.patient);
  const before = await progress(f.admin, req.id), originalPreferences = sql(`select notification_preferences from public.profiles where id=${sqlLiteral(fixtures.adminA.id)};`);
  try {
    // Controlled legacy-state fixture. These flags are no longer an opt-out.
    sql(`update public.requisition_lifecycle set policy=policy||'{"scienceByDispatch":false,"scienceRequired":false,"scienceExpress":false,"scienceAutomatic":false,"scienceWhatsApp":false}'::jsonb where requisition_id=${sqlLiteral(req.id)};
     update public.profiles set notification_preferences=notification_preferences||'{"scienceExpress":false,"scienceAutomatic":false,"scienceWhatsApp":false}'::jsonb where id=${sqlLiteral(fixtures.adminA.id)};`);
    const exempt = await progress(f.admin, req.id);
    assert.equal(exempt.scienceSatisfied, true); assert.equal(exempt.familyAware, false); assert.equal(exempt.personalScience, false, "Exemption never invents collective or personal SCI");
    await rpc(f.admin, "acknowledge_requisition", { p_id: req.id, p_mode: "express", p_version: before.version, p_material_identity: before.materialIdentity });
    assert.equal(scienceCount(req.id), 1, "The manual alternative remains available");
    const dispatched = [];
    for (const quantity of ["2", "3"]) {
      let draft = await rpc(family, "create_supply_document", { p_patient: f.patient, p_type: "ENT", p_key: randomUUID(), p_payload: payload(f, req, quantity), p_draft: true });
      assert.equal(scienceCount(req.id), 1 + dispatched.length);
      draft = await rpc(f.admin, "revise_supply_document", { p_id: draft.id, p_payload: payload(f, req, quantity), p_key: randomUUID(), p_version: draft.version });
      assert.equal(scienceCount(req.id), 1 + dispatched.length);
      const command = { p_id: draft.id, p_action: "submit", p_body: {}, p_key: randomUUID(), p_version: draft.version };
      const ent = await rpc(f.admin, "supply_document_command", command);
      await rpc(f.admin, "supply_document_command", command);
      dispatched.push(ent.id);
      assert.equal(scienceCount(req.id), 1 + dispatched.length, "Replay must recover the same causal dispatch");
      assert.equal(sql(`select created_by::text from public.operational_documents where id=${sqlLiteral(ent.id)};`), fixtures.family.id, "The draft author differs from the actual dispatcher");
    }
    const after = await progress(f.admin, req.id), personal = await progress(family, req.id);
    assert.equal(after.materialIdentity, before.materialIdentity);
    assert.equal(after.familyAware, true); assert.equal(after.personalScience, true);
    assert.equal(personal.personalScience, false, "ANY does not assign another person's SCI to this family member");
    assert.equal(after.science.filter(e => e.mode === "express").length, 1);
    const dispatches = after.science.filter(e => e.mode === "dispatch");
    assert.equal(dispatches.length, 2);
    for (const event of dispatches) {
      assert.equal(event.user_id, fixtures.adminA.id);
      assert.equal(event.material_identity, before.materialIdentity);
      assert.equal(event.authority_context.familyRepresentative, true);
      assert.ok(dispatched.includes(event.evidence.deliveryId));
      assert.match(event.source_key, /^dispatch:/);
    }
    assert.equal(new Set(dispatches.map(e => e.source_key)).size, 2);
    assert.equal(sql(`select coalesce(sum(case when destination_location='TRANSIT' then quantity else 0 end-case when source_location='TRANSIT' then quantity else 0 end),0)::text from public.stock_movements where care_recipient_id=${sqlLiteral(f.patient)} and product_id=${sqlLiteral(f.products[0])};`), "5.000000");
    assert.equal(sql(`select count(*) from public.stock_movements where care_recipient_id=${sqlLiteral(f.patient)} and destination_location='CARE_TEAM';`), "0", "SCI and dispatch are not physical acceptance");
    const sameMaterial = { p_id: req.id, p_mode: "express", p_version: before.version, p_material_identity: before.materialIdentity };
    await rpc(family, "acknowledge_requisition", sameMaterial);
    await rpc(family, "acknowledge_requisition", sameMaterial);
    assert.equal(scienceCount(req.id), 4, "Technical events do not invalidate the material shown before them");
    assert.ok((await family.rpc("acknowledge_requisition", { ...sameMaterial, p_material_identity: "0".repeat(64) })).error);
    assert.ok((await family.rpc("acknowledge_requisition", { ...sameMaterial, p_mode: "app_visible" })).error);
    assert.equal(scienceCount(req.id), 4);
  } finally { sql(`update public.profiles set notification_preferences=${sqlLiteral(originalPreferences)}::jsonb where id=${sqlLiteral(fixtures.adminA.id)};`); }
});

test("P02 rechecks a real Auth session after the observed lock and leaves no SCI after revocation", async () => {
  const f = await setup(), family = await actor("family", f.patient), req = await issue(f.patient, [f.products[0]]), view = await progress(family, req.id);
  const token = (await family.auth.getSession()).data.session.access_token;
  const stale = createClient(env.url, env.anonKey, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: "Bearer " + token } } });
  const response = await whileAdvisoryWaits("stock:" + f.patient,
    () => stale.rpc("acknowledge_requisition", { p_id: req.id, p_mode: "express", p_version: view.version, p_material_identity: view.materialIdentity }),
    async () => { assert.ifError((await family.auth.signOut({ scope: "local" })).error); });
  assert.equal(response.error?.code, "42501"); assert.equal(scienceCount(req.id), 0);
});

test("P02 a representative permission revoked while dispatch waits cannot produce family SCI", async () => {
  const f = await setup(), family = await actor("family", f.patient), req = await issue(f.patient, [f.products[0]]);
  const response = await whileAdvisoryWaits("stock:" + f.patient,
    () => family.rpc("create_supply_document", { p_patient: f.patient, p_type: "ENT", p_key: randomUUID(), p_payload: payload(f, req), p_draft: false }),
    async () => { sql(`insert into public.capability_overrides(care_recipient_id,capability,subject_user,enabled) values(${sqlLiteral(f.patient)},'req.science',${sqlLiteral(fixtures.family.id)},false);`); });
  assert.ifError(response.error); assert.equal(response.data.status, "pending_receipt"); assert.equal(scienceCount(req.id), 0);
  assert.equal((await progress(f.admin, req.id)).familyAware, false);
});

test("P02 a legitimate non-representative dispatch moves custody without creating family SCI; no capability or missing designation is a negative", async () => {
  const f = await setup(), family = await actor("family", f.patient), pro = await actor("professional", f.patient), req = await issue(f.patient, [f.products[0]]);
  sql(`insert into public.capability_overrides(care_recipient_id,capability,subject_user,enabled) values(${sqlLiteral(f.patient)},'req.science',${sqlLiteral(fixtures.family.id)},false);`);
  await rpc(family, "create_supply_document", { p_patient: f.patient, p_type: "ENT", p_key: randomUUID(), p_payload: payload(f, req), p_draft: false });
  assert.equal(scienceCount(req.id), 0);
  assert.equal((await progress(f.admin, req.id)).familyAware, false);
  const view = await progress(pro, req.id);
  assert.ok((await pro.rpc("acknowledge_requisition", { p_id: req.id, p_mode: "express", p_version: view.version, p_material_identity: view.materialIdentity })).error);
  for (const p_change of [{ scienceByDispatch: false }, { scienceRequirement: "all" }])
    assert.equal((await f.admin.rpc("configure_patient_access", { p_patient: f.patient, p_kind: "settings", p_change, p_key: randomUUID(), p_version: 1 })).error?.code, "22023");
  await rpc(f.admin, "configure_patient_access", { p_patient: f.patient, p_kind: "settings", p_change: { scienceRoles: [], scienceUsers: [] }, p_key: randomUUID(), p_version: 1 });
  const unassigned = await progress(f.admin, req.id);
  assert.equal(unassigned.designationPending, true); assert.equal(unassigned.familyAware, false);
  assert.ok((await f.admin.rpc("acknowledge_requisition", { p_id: req.id, p_mode: "express", p_version: unassigned.version, p_material_identity: unassigned.materialIdentity })).error);
  assert.equal(scienceCount(req.id), 0);
});

test("P02 failed/rolled-back expeditions leave no SCI or ledger; material guards reject a second material identity", async () => {
  const f = await setup(), family = await actor("family", f.patient), req = await issue(f.patient, [f.products[0]]);
  const ledger = sql(`select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${sqlLiteral(f.patient)};`);
  const key = randomUUID();
  assert.ok((await family.rpc("create_supply_document", { p_patient: f.patient, p_type: "ENT", p_key: key, p_payload: payload(f, req, "10000"), p_draft: false })).error);
  assert.equal(sql(`select count(*) from public.operational_documents where idempotency_key=${sqlLiteral(key)};`), "0");
  const session = (await family.auth.getSession()).data.session, claims = JSON.parse(Buffer.from(session.access_token.split(".")[1], "base64url").toString());
  const rolled = randomUUID();
  sql(`begin;select set_config('request.jwt.claims',${sqlLiteral(JSON.stringify({ sub: claims.sub, session_id: claims.session_id, role: "authenticated", aal: claims.aal }))},true);
   select public.create_supply_document(${sqlLiteral(f.patient)},'ENT',${sqlLiteral(JSON.stringify(payload(f, req)))}::jsonb,${sqlLiteral(rolled)},false);rollback;`);
  assert.equal(sql(`select count(*) from public.operational_documents where idempotency_key=${sqlLiteral(rolled)};`), "0");
  assert.equal(scienceCount(req.id), 0); assert.equal(sql(`select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${sqlLiteral(f.patient)};`), ledger);
  for (const mutation of [
    `update public.requisition_items set current_stock=7 where requisition_id=${sqlLiteral(req.id)}`,
    `update public.requisitions set material_identity=repeat('0',64) where id=${sqlLiteral(req.id)}`,
    `update public.operational_documents set payload=payload||'{"notes":"material alteration"}'::jsonb where id=${sqlLiteral(req.id)}`,
  ]) assert.throws(() => sql(mutation), /immutable/);
  const direct = await family.from("requisition_items").update({ current_stock: 7 }).eq("requisition_id", req.id);
  assert.ok(direct.error);
});
