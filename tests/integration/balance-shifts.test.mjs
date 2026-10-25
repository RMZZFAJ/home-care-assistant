import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { actor, env, rpc, setup } from "./v4-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
import { balanceSetup, balanceCommand, shiftWorker, shiftCommand, dayOffset } from "./shift-fixtures.mjs";
const workspace = (client, patient) => rpc(client, "balance_workspace", { p_patient: patient });
test("BAL is opt-in and all count entrypoints enforce actual designated shift and idempotency", async () => {
  const legacy = await setup();
  assert.equal((await workspace(legacy.admin, legacy.patient)).enabled, false);
  const { patient, admin, pro, products } = await balanceSetup();
  const current = await workspace(pro.client, patient), assignment = current.eligibility.assignment;
  assert.equal(current.eligibility.available, true);
  assert.equal((await workspace(admin, patient)).eligibility.available, false);
  const definitions=(await rpc(admin,"patient_governance",{p_patient:patient})).data.definitions;
  assert.equal(definitions.find(d=>d.code==="bal.defer.approve").allowed_roles.includes("supervisor"),false);
  assert.equal(definitions.find(d=>d.code==="bal.count").default_roles.includes("admin"),false);
  const payload = { lines: products.map(productId => ({ productId, quantity: "0" })), balanceAssignment: { id: assignment.id, version: assignment.version, referenceRevision: current.referenceRevision } };
  const args = { p_patient: patient, p_type: "BAL", p_payload: payload, p_key: randomUUID(), p_draft: true };
  assert.equal((await admin.rpc("create_supply_document", args)).error?.code, "42501");
  assert.ok((await pro.client.rpc("create_supply_document", { ...args, p_payload: { lines: payload.lines } })).error);
  const session = (await pro.client.auth.getSession()).data.session;
  const create = async body => {
    const response = await fetch(env.url + "/rest/v1/rpc/create_supply_document", { method: "POST", headers: { apikey: env.anonKey, Authorization: "Bearer " + session.access_token, "content-type": "application/json" }, body: JSON.stringify(body) });
    const data = await response.json();
    return response.ok ? { data } : { error: data };
  };
  // Independent HTTP requests use the real Auth session without sharing the
  // SDK's refresh lifecycle. Serialization is enforced by PostgreSQL.
  const attempts = await Promise.all([create(args), create({ ...args, p_key: randomUUID() })]);
  assert.equal(attempts.filter(r => !r.error).length, 1);
  assert.equal(attempts.find(r => r.error).error.code, "P0001");
  const doc = attempts.find(r => !r.error).data;
  assert.equal(doc.payload.balanceContext.professionalId, pro.id);
  const editArgs = { p_id: doc.id, p_payload: { ...payload, notes: "Contagem física conferida" }, p_key: randomUUID(), p_version: doc.version };
  const revised = await rpc(pro.client, "revise_supply_document", editArgs);
  assert.equal((await rpc(pro.client, "revise_supply_document", editArgs)).version, revised.version);
  const submit = { p_id: doc.id, p_action: "submit", p_body: {}, p_key: randomUUID(), p_version: revised.version };
  const emitted = await rpc(pro.client, "supply_document_command", submit);
  assert.equal((await rpc(pro.client, "supply_document_command", submit)).version, emitted.version);
  assert.equal((await workspace(pro.client, patient)).eligibility.available, false);
  const final = await workspace(admin, patient);
  assert.equal(final.obligations[0].state, "counted");
  assert.equal(final.assignments[0].status, "counted");
  assert.ok((await pro.client.from("bal_assignments").update({ status: "active" }).eq("id", assignment.id)).error);
});
test("pending deferral does not change responsibility; supervisor cannot replace family approval", async () => {
  const { patient, admin, pro } = await balanceSetup(), supervisor = await shiftWorker(patient, "supervisor");
  const initial = await workspace(pro.client, patient), a = initial.eligibility.assignment;
  const target = initial.targets.find(s => s.starts_at >= a.ends_at);
  const deferral = await balanceCommand(pro.client, patient, "request_deferral", { assignmentId: a.id, targetShiftId: target.id, reason: "Solicitação fictícia justificada" }, a.version);
  assert.equal((await workspace(pro.client, patient)).eligibility.assignment.id, a.id);
  sql(`insert into public.capability_overrides(care_recipient_id,capability,subject_user,enabled) values(${sqlLiteral(patient)},'bal.defer.approve',${sqlLiteral(supervisor.id)},true);`);
  assert.equal((await rpc(supervisor.client,"patient_capabilities",{p_patient:patient}))["bal.defer.approve"],false);
  const decision = { p_patient: patient, p_action: "decide_deferral", p_body: { id: deferral.id, approve: true, reason: "Revisão autorizada" }, p_key: randomUUID() };
  assert.equal((await supervisor.client.rpc("balance_command", decision)).error?.code, "42501");
  const family = await actor("family", patient);
  await rpc(family, "balance_command", decision);
  const after = await workspace(pro.client, patient);
  assert.equal(after.eligibility.assignment.shift_id, target.id);
  assert.equal(after.eligibility.available, false);
  assert.equal(after.assignments.find(s => s.id === a.id).status, "deferred");
  assert.equal(after.assignments.find(s => s.id === a.id).missed_at, null);
  assert.equal(after.deferrals[0].status, "approved");
  assert.ok((await admin.rpc("balance_command", { ...decision, p_key: randomUUID() })).error);
});
test("scheduler retains missed shifts and regularizes previous weeks with only one current physical count", async () => {
  const { patient, admin, products } = await setup(), pro = await shiftWorker(patient);
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" }).format(new Date());
  const type = await shiftCommand(admin, patient, "type", { name: "Plantão histórico fictício", startsLocal: "00:00", durationMinutes: 1440 });
  // Only this isolated local fixture simulates two elapsed weeks. No remote or
  // pre-existing history is changed and no historical physical count is inserted.
  const old = dayOffset(today, -14);
  await shiftCommand(admin, patient, "series", { professionalId: pro.id, shiftTypeId: type.id, timezone: "America/Sao_Paulo", recurrence: "weekly", weekdays: [new Date(today + "T12:00:00Z").getUTCDay()], anchorDate: old, validUntil: today, notes: "Simulação de passagem do tempo", reason: "Histórico fictício para verificar atrasos" });
  sql(`insert into public.bal_regimes(care_recipient_id,enabled,weekday,shift_type_id,starts_on,activated_at,updated_by)
  values(${sqlLiteral(patient)},true,${new Date(today + "T12:00:00Z").getUTCDay()},${sqlLiteral(type.id)},${sqlLiteral(old)},now()-interval '14 days',${sqlLiteral((await admin.auth.getUser()).data.user.id)});
  insert into public.patient_settings(care_recipient_id) values(${sqlLiteral(patient)}) on conflict do nothing;
  update public.patient_settings set settings=settings||'{"balReview":"required"}'::jsonb where care_recipient_id=${sqlLiteral(patient)};
  select private.process_bal_patient(${sqlLiteral(patient)});`);
  const pending = await workspace(pro.client, patient);
  assert.equal(pending.obligations.length, 3);
  assert.equal(pending.assignments.filter(a => a.status === "missed").length, 2);
  assert.equal(pending.eligibility.available, true);
  sql(`select private.process_bal_patient(${sqlLiteral(patient)});`);
  const eventCount = (await workspace(pro.client,patient)).events.length;
  sql(`select private.process_bal_patient(${sqlLiteral(patient)});`);
  assert.equal((await workspace(pro.client, patient)).events.length, eventCount);
  const a = pending.eligibility.assignment;
  const doc = await rpc(pro.client, "create_supply_document", { p_patient: patient, p_type: "BAL", p_key: randomUUID(), p_payload: { lines: products.map(productId => ({ productId, quantity: "0" })), balanceAssignment: { id: a.id, version: a.version, referenceRevision: pending.referenceRevision } } });
  assert.equal(doc.status, "submitted");
  const final = await workspace(admin, patient);
  assert.equal(final.obligations.filter(o => o.state === "regularized" && o.regularized_by === doc.id && o.missed_at).length, 2);
  assert.equal(final.obligations.filter(o => o.state === "counted" && o.count_document_id === doc.id).length, 1);
  assert.ok(final.obligations.every(o => new Date(o.actual_count_at).toISOString().slice(0, 10) === new Date().toISOString().slice(0, 10)));
  await balanceCommand(admin, patient, "assign_recount", { documentId: doc.id, targetShiftId: a.shift_id, reason: "Nova conferência física autorizada" }, doc.version);
  const recountState = await workspace(pro.client, patient), recount = recountState.eligibility.assignment;
  const recounted = await rpc(pro.client, "revise_supply_document", { p_id: doc.id, p_key: randomUUID(), p_version: doc.version, p_recount: true, p_payload: { lines: products.map(productId => ({ productId, quantity: "0" })), balanceAssignment: { id: recount.id, version: recount.version, referenceRevision: recountState.referenceRevision } } });
  assert.ok(recounted.version > doc.version);
  assert.ok(recounted.events.some(e => e.action === "bal.recount"));
  assert.equal((await workspace(admin, patient)).assignments.filter(a => a.status === "missed").length, 2);
});

test("a pending request does not stop the scheduler deadline or survive a superseded assignment",async()=>{
  const {patient,admin,pro}=await balanceSetup();
  const before=await workspace(pro.client,patient),a=before.eligibility.assignment;
  const target=before.targets.find(s=>s.starts_at>=a.ends_at);
  const request=await balanceCommand(pro.client,patient,"request_deferral",{assignmentId:a.id,targetShiftId:target.id,reason:"Pedido pendente durante o prazo original"},a.version);
  // Simulate the scheduler's clock only for this newly created local patient.
  const afterDeadline=new Date(new Date(a.ends_at).getTime()+1000).toISOString();
  sql(`select private.process_bal_patient(${sqlLiteral(patient)},${sqlLiteral(afterDeadline)}::timestamptz);`);
  const after=await workspace(admin,patient);
  assert.equal(after.assignments.find(x=>x.id===a.id).status,"missed");
  assert.equal(after.assignments.find(x=>x.id===a.id).ends_at,a.ends_at);
  assert.equal(after.deferrals.find(x=>x.id===request.id).status,"stale");
  assert.notEqual(after.eligibility.assignment.id,a.id);
  const family=await actor("family",patient);
  const stale=await family.rpc("balance_command",{p_patient:patient,p_action:"decide_deferral",p_body:{id:request.id,approve:true,reason:"Aprovação posterior não pode reescrever o prazo"},p_key:randomUUID()});
  assert.ok(stale.error);
});

test("ambiguous coverage is unassigned until family resolution and stays isolated by patient",async()=>{
  const {patient,admin}=await setup(),first=await shiftWorker(patient),second=await shiftWorker(patient);
  const today=new Intl.DateTimeFormat("sv-SE",{timeZone:"America/Sao_Paulo"}).format(new Date());
  const type=await shiftCommand(admin,patient,"type",{name:"Cobertura simultânea fictícia",startsLocal:"00:00",durationMinutes:1440});
  for(const pro of [first,second]) await shiftCommand(admin,patient,"series",{professionalId:pro.id,shiftTypeId:type.id,timezone:"America/Sao_Paulo",recurrence:"once",weekdays:[],anchorDate:today,validUntil:today,notes:"Duas pessoas no mesmo plantão"});
  await balanceCommand(admin,patient,"configure",{enabled:true,timezone:"America/Sao_Paulo",weekday:new Date(today+"T12:00:00Z").getUTCDay(),shiftTypeId:type.id,startsOn:today,reason:"Verificar seleção explícita de responsável"});
  const pending=await workspace(admin,patient);
  assert.equal(pending.eligibility.assignment,null);
  assert.ok(pending.events.some(e=>e.action==="bal.cycle.unassigned"));
  const args={p_patient:patient,p_cycle:pending.obligations[0].cycle_id,p_shift:pending.targets.find(s=>s.professional_id===first.id).id,p_reason:"Família designa a profissional elegível",p_key:randomUUID()};
  assert.equal((await second.client.rpc("resolve_balance_assignment",args)).error?.code,"42501");
  await rpc(admin,"resolve_balance_assignment",args);
  assert.equal((await workspace(first.client,patient)).eligibility.available,true);
  assert.equal((await workspace(second.client,patient)).eligibility.available,false);
  const global=await actor("global");
  assert.equal((await global.rpc("balance_workspace",{p_patient:patient})).error?.code,"42501");
  const other=await setup();
  assert.equal((await first.client.rpc("balance_workspace",{p_patient:other.patient})).error?.code,"42501");
  assert.equal((await first.client.from("bal_obligations").select("id").eq("care_recipient_id",other.patient)).data.length,0);
});

test("ledger changes invalidate a captured count reference and forged schedule context cannot replace the DB snapshot",async()=>{
  const {patient,pro,products}=await balanceSetup(),initial=await workspace(pro.client,patient),a=initial.eligibility.assignment;
  const family=await actor("family",patient);
  const ent=await rpc(family,"create_supply_document",{p_patient:patient,p_type:"ENT",p_key:randomUUID(),p_payload:{source:"FAMILY",destination:"CARE_TEAM",recipientId:pro.id,lines:[{productId:products[0],quantity:"1",metadata:{extraItemReason:"Conferência de revisão do estoque"}}]}});
  await rpc(pro.client,"supply_document_command",{p_id:ent.id,p_action:"receive",p_version:ent.version,p_key:randomUUID(),p_body:{divergences:[]}});
  const payload={lines:products.map(productId=>({productId,quantity:"0"})),balanceAssignment:{id:a.id,version:a.version,referenceRevision:initial.referenceRevision},balanceContext:{professionalId:randomUUID(),professionalName:"Conteúdo não confiável"}};
  const args={p_patient:patient,p_type:"BAL",p_payload:payload,p_key:randomUUID(),p_draft:true};
  const stale=await pro.client.rpc("create_supply_document",args);
  assert.equal(stale.error?.code,"P0001");assert.match(stale.error.message,/reference changed/);
  payload.balanceAssignment.referenceRevision=(await workspace(pro.client,patient)).referenceRevision;
  const doc=await rpc(pro.client,"create_supply_document",args);
  assert.equal(doc.payload.balanceContext.professionalId,pro.id);
  assert.notEqual(doc.payload.balanceContext.professionalName,"Conteúdo não confiável");
});

test("schedule management cannot defer BAL, while a same-window handoff preserves the real counter and distinct review",async()=>{
  const {patient,admin,pro,products}=await balanceSetup(),supervisor=await shiftWorker(patient,"supervisor");
  sql(`insert into public.patient_settings(care_recipient_id) values(${sqlLiteral(patient)}) on conflict do nothing;update public.patient_settings set settings=settings||'{"balReview":"required"}'::jsonb where care_recipient_id=${sqlLiteral(patient)};`);
  const before=await workspace(pro.client,patient),a=before.eligibility.assignment;
  const doc=await rpc(pro.client,"create_supply_document",{p_patient:patient,p_type:"BAL",p_key:randomUUID(),p_draft:true,p_payload:{lines:products.map(productId=>({productId,quantity:"0"})),balanceAssignment:{id:a.id,version:a.version,referenceRevision:before.referenceRevision}}});
  const s=before.targets.find(s=>s.id===a.shift_id);
  const delayed={id:s.id,startsAt:new Date(Date.parse(s.starts_at)+3600000).toISOString(),endsAt:new Date(Date.parse(s.ends_at)+3600000).toISOString(),reason:"Mudança de período não pode substituir decisão familiar"};
  const refused=await supervisor.client.rpc("schedule_command",{p_patient:patient,p_action:"change",p_body:delayed,p_key:randomUUID(),p_version:s.version});
  assert.match(refused.error?.message??"",/family deferral/);
  await shiftCommand(supervisor.client,patient,"change",{id:s.id,professionalId:supervisor.id,reason:"Substituição autorizada no mesmo período"},s.version);
  await balanceCommand(supervisor.client,patient,"refresh",{});
  const changed=await workspace(supervisor.client,patient),newAssignment=changed.eligibility.assignment;
  assert.equal(newAssignment.professional_id,supervisor.id);
  assert.equal(newAssignment.ends_at,a.ends_at);
  assert.equal(changed.assignments.find(x=>x.id===a.id).status,"invalidated");
  const payload={lines:products.map(productId=>({productId,quantity:"0"})),balanceAssignment:{id:newAssignment.id,version:newAssignment.version,referenceRevision:changed.referenceRevision}};
  assert.equal((await pro.client.rpc("revise_supply_document",{p_id:doc.id,p_payload:payload,p_key:randomUUID(),p_version:doc.version})).error?.code,"42501");
  const revised=await rpc(supervisor.client,"revise_supply_document",{p_id:doc.id,p_payload:payload,p_key:randomUUID(),p_version:doc.version});
  const counted=await rpc(supervisor.client,"supply_document_command",{p_id:doc.id,p_action:"submit",p_body:{},p_key:randomUUID(),p_version:revised.version});
  assert.equal(counted.created_by,pro.id);
  assert.equal(counted.payload.balanceContext.professionalId,supervisor.id);
  const selfReview=await supervisor.client.rpc("supply_document_command",{p_id:doc.id,p_action:"approve",p_body:{group:"supervisor"},p_key:randomUUID(),p_version:counted.version});
  assert.equal(selfReview.error?.code,"42501");
  assert.match(selfReview.error.message,/distinct balance reviewer/);
  assert.equal((await workspace(admin,patient)).obligations[0].missed_at,null);
});

test("approved postponement preserves the original due date and does not turn into a historical delay",async()=>{
  const {patient,admin,pro}=await balanceSetup();
  const before=await workspace(admin,patient),a=before.eligibility.assignment,target=before.targets.find(s=>s.starts_at>=a.ends_at);
  await balanceCommand(admin,patient,"defer",{assignmentId:a.id,targetShiftId:target.id,reason:"Decisão familiar dentro do prazo original"},a.version);
  const afterOriginal=new Date(Date.parse(a.ends_at)+1000).toISOString();
  sql(`select private.process_bal_patient(${sqlLiteral(patient)},${sqlLiteral(afterOriginal)}::timestamptz);`);
  const final=await workspace(pro.client,patient);
  assert.equal(final.obligations[0].original_due,before.obligations[0].original_due);
  assert.equal(final.obligations[0].effective_due,target.ends_at);
  assert.equal(final.obligations[0].missed_at,null);
  assert.equal(final.assignments.find(x=>x.id===a.id).status,"deferred");
  assert.ok(final.deferrals[0].target_snapshot.professional_name);
  const currentId=final.eligibility.assignment.id;
  assert.equal(final.events.filter(e=>e.action==="bal.cycle.available"&&e.assignment_id===currentId).length,1);
  sql(`select private.process_bal_patient(${sqlLiteral(patient)},${sqlLiteral(afterOriginal)}::timestamptz);`);
  assert.equal((await workspace(pro.client,patient)).events.filter(e=>e.action==="bal.cycle.available"&&e.assignment_id===currentId).length,1);
});
