import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { setInterval, clearInterval } from "node:timers";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { getTestEnvironment, fixtureFile, sql, sqlLiteral } from "../../scripts/test-environment.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";

const env = getTestEnvironment(), fixtures = JSON.parse(readFileSync(fixtureFile, "utf8"));
const clients = new Map();
async function actor(name, patient) {
  if (!clients.has(name)) {
    const client = createClient(env.url, env.anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    assert.ifError((await client.auth.signInWithPassword({ email: fixtures[name].email, password: fixturePassword })).error);
    clients.set(name, client);
  }
  const client = clients.get(name);
  assert.ifError((await client.rpc("select_active_context", { p_patient: patient ?? null })).error);
  return client;
}
async function rpc(client, name, args) { const result = await client.rpc(name, args); assert.ifError(result.error); return result.data; }
const request = (patient, products) => ({ p_care_recipient_id: patient, p_idempotency_key: randomUUID(), p_payload_hash: "ignored", p_lines: products.map(productId => ({ productId, currentStock: "0", urgent: true })), p_extra_items: [], p_observations: [] });
async function setup() {
  const global = await actor("global");
  const patient = (await rpc(global, "admin_upsert_recipient", { p_id: null, p_display_name: "Homologação fictícia V4 " + randomUUID().slice(0,8), p_is_active: true, p_is_development: true })).id;
  // Controlled fixture setup only. All identities were issued by the official Auth API.
  for (const name of ["global", "adminA", "family", "professional", "reader"]) sql(`insert into public.care_recipient_memberships(care_recipient_id,user_id,role) values(${sqlLiteral(patient)},${sqlLiteral(fixtures[name].id)},${sqlLiteral(["global","adminA"].includes(name) ? "admin" : name)});`);
  const admin = await actor("adminA", patient);
  const products = [];
  for (let i = 0; i < 2; i++) products.push((await rpc(admin, "admin_upsert_recipient_product", { p_care_recipient_id: patient, p_product_id: null, p_name: "Material fictício V4 " + i, p_category: "higiene", p_unit: "unidade", p_aliases: [], p_is_active: true })).product_id);
  for (const product of products) await rpc(admin, "family_stock_movement", { p_patient: patient, p_product: product, p_quantity: "30", p_action: "inbound", p_reason: "Saldo fictício controlado de homologação V4", p_key: randomUUID() });
  return { patient, admin, products };
}
async function issue(patient, products) {
  const pro = await actor("professional", patient);
  const row = (await rpc(pro, "submit_requisition", request(patient, products)))[0];
  const lines = await pro.from("requisition_items").select("id,product_id").eq("requisition_id", row.requisition_id);assert.ifError(lines.error);
  return { id: row.requisition_id, lines: lines.data };
}
async function delivery(patient, req, products, extras = {}) {
  const family = await actor("family", patient);
  return rpc(family, "create_supply_document", { p_patient: patient, p_type: "ENT", p_key: randomUUID(), p_payload: { source: "FAMILY", destination: "CARE_TEAM", recipientId: fixtures.professional.id, lines: products.map((productId, i) => ({ productId, quantity: i ? "2" : "10", requisitionItemIds: [req.lines.find(row => row.product_id === productId).id], ...extras })) } });
}
test("V4: shared needs, partial receipt, formal resolution and science remain independent", async () => {
  const { patient, admin, products } = await setup();
  const req = await issue(patient, products);
  const pro = await actor("professional", patient);
  const duplicate = await pro.rpc("submit_requisition", request(patient, [products[0]])); assert.ok(duplicate.error);assert.match(duplicate.error.message,/duplicate review/);
  const duplicateArgs = request(patient, [products[0]]);duplicateArgs.p_lines[0].repeatReason = "A mesma necessidade permanece pendente";
  const second = (await rpc(pro, "submit_requisition", duplicateArgs))[0];
  const secondLines = await pro.from("requisition_items").select("id").eq("requisition_id", second.requisition_id);assert.ifError(secondLines.error);
  const family = await actor("family", patient);
  const payload = { source: "FAMILY", destination: "CARE_TEAM", recipientId: fixtures.professional.id, lines: products.map((productId,i) => ({ productId, quantity: i ? "2" : "10", requisitionItemIds: [req.lines.find(row => row.product_id === productId).id, ...(i ? [] : [secondLines.data[0].id])], metadata: i ? {} : { sharedNeedReason: "Duas requisições reiteram a mesma necessidade física" } })) };
  const key = randomUUID();
  const ent = await rpc(family, "create_supply_document", { p_patient: patient, p_type: "ENT", p_payload: payload, p_key: key });
  assert.equal((await rpc(family, "create_supply_document", { p_patient: patient, p_type: "ENT", p_payload: payload, p_key: key })).id,ent.id);
  const progress = await rpc(pro,"requisition_progress",{p_id:req.id});assert.equal(progress.scienceSatisfied,true);assert.equal(progress.science[0].mode,"dispatch");assert.equal(progress.science[0].user_id,fixtures.family.id);
  assert.equal(ent.status,"pending_receipt");assert.equal(ent.fullyCheckedLines,0);assert.ok(ent.lines.every(row=>!row.metadata.issueOpen));
  const first = ent.lines.find(row=>row.product_id===products[0]);
  const accepted = await rpc(pro,"supply_document_command",{p_id:ent.id,p_action:"receive",p_body:{divergences:[{lineId:first.id,acceptedQuantity:"6",notes:"Quatro unidades não chegaram"}]},p_key:randomUUID(),p_version:ent.version});
  assert.equal(accepted.status,"disputed");assert.equal(accepted.fullyCheckedLines,1);
  assert.equal((await rpc(pro,"requisition_fulfillment",{p_requisition:req.id})).fulfilled,2);
  assert.equal((await rpc(pro,"requisition_fulfillment",{p_requisition:second.requisition_id})).fulfilled,1);
  assert.equal((await rpc(pro,"requisition_progress",{p_id:req.id})).completedAt,null);
  const fixed = await rpc(admin,"supply_document_command",{p_id:ent.id,p_action:"resolve",p_body:{lineId:first.id,quantity:"4",resolution:"missing",reason:"Falta confirmada por conferência formal"},p_key:randomUUID(),p_version:accepted.version});
  assert.equal(fixed.status,"confirmed");assert.equal(fixed.fullyCheckedLines,1);
  const finished = await rpc(admin,"requisition_progress",{p_id:req.id});assert.ok(finished.completedAt);assert.equal(finished.manualArchiveRequired,false);
  const balance = await admin.from("current_stock_balances").select("balance,location").eq("care_recipient_id",patient).eq("product_id",products[0]);assert.ifError(balance.error);
  assert.equal(String(balance.data.find(row=>row.location==="CARE_TEAM").balance),"6");assert.equal(String(balance.data.find(row=>row.location==="FAMILY").balance),"20");
  const queued = sql(`select count(*) from public.requisition_notifications where document_id=${sqlLiteral(req.id)} and recipient_user_id=${sqlLiteral(fixtures.professional.id)} and event_key='req.registered_author' and include_pdf=false;`);assert.equal(queued,"1");
  const global = await actor("global");assert.ok((await global.rpc("archive_requisition",{p_id:req.id,p_reason:"Global não é autoridade operacional local"})).error);
  const archived = await rpc(admin,"archive_requisition",{p_id:req.id,p_reason:"Conferência administrativa concluída"});assert.ok(archived.archivedAt);
});

test("V4: local changes apply immediately; global proposals need a different local person", async () => {
  const { patient, admin } = await setup();
  const local = await rpc(admin,"configure_patient_access",{p_patient:patient,p_kind:"settings",p_change:{scienceByDispatch:false},p_key:randomUUID(),p_version:1});assert.equal(local.status,"applied");
  const global = await actor("global");
  const proposed = await rpc(global,"configure_patient_access",{p_patient:patient,p_kind:"settings",p_change:{balReview:"required"},p_key:randomUUID(),p_version:2});assert.equal(proposed.status,"pending");
  const own = await actor("global",patient);
  assert.ok((await own.rpc("configure_patient_access",{p_patient:patient,p_kind:"settings",p_change:{},p_key:randomUUID(),p_version:2,p_request_id:proposed.id,p_decision:"approve"})).error);
  const accepted = await rpc(admin,"configure_patient_access",{p_patient:patient,p_kind:"settings",p_change:{},p_key:randomUUID(),p_version:2,p_request_id:proposed.id,p_decision:"approve"});assert.equal(accepted.status,"applied");
  const denied = await actor("reader",patient);assert.ok((await denied.rpc("configure_patient_access",{p_patient:patient,p_kind:"settings",p_change:{balReview:"optional"},p_key:randomUUID(),p_version:3})).error);
});

test("V4: completion without science permanently blocks automatic archive and preserves later acknowledgement", async () => {
  const { patient, admin, products } = await setup();
  await rpc(admin,"configure_patient_access",{p_patient:patient,p_kind:"settings",p_change:{scienceByDispatch:false},p_key:randomUUID(),p_version:1});
  const req = await issue(patient,[products[0]]), ent = await delivery(patient,req,[products[0]]);
  const pro = await actor("professional",patient);
  await rpc(pro,"supply_document_command",{p_id:ent.id,p_action:"receive",p_body:{divergences:[]},p_key:randomUUID(),p_version:ent.version});
  let progress = await rpc(admin,"requisition_progress",{p_id:req.id});assert.ok(progress.completedAt);assert.equal(progress.scienceSatisfied,false);assert.equal(progress.manualArchiveRequired,true);
  sql(`update public.requisition_lifecycle set completed_at=now()-interval '30 days' where requisition_id=${sqlLiteral(req.id)};`);
  const service = createClient(env.url,env.serviceKey,{auth:{persistSession:false}});
  await rpc(service,"run_operational_schedule");
  assert.equal((await rpc(admin,"requisition_progress",{p_id:req.id})).archivedAt,null);
  const family = await actor("family",patient);
  progress = await rpc(family,"acknowledge_requisition",{p_id:req.id,p_mode:"express",p_version:progress.version});assert.equal(progress.scienceSatisfied,true);assert.equal(progress.manualArchiveRequired,true);
  await rpc(service,"run_operational_schedule");assert.equal((await rpc(admin,"requisition_progress",{p_id:req.id})).archivedAt,null);
  assert.ok((await rpc(admin,"archive_requisition",{p_id:req.id,p_reason:"Arquivamento manual com evidência da exceção"})).archivedAt);
});

test("V4: automatic science requires both policy and personal consent, preserving its actual origin", async () => {
  const { patient, admin, products } = await setup();
  await rpc(admin,"configure_patient_access",{p_patient:patient,p_kind:"settings",p_change:{scienceAutomatic:true,scienceByDispatch:false},p_key:randomUUID(),p_version:1});
  const req = await issue(patient,[products[0]]), family = await actor("family",patient);
  await rpc(family,"update_my_profile",{p_name:"Teste family",p_registration:"",p_state:null,p_category:"",p_preferences:{internal:true,whatsapp:false,email:false,scienceExpress:true,scienceAutomatic:false,scienceWhatsApp:false}});
  assert.ok((await family.rpc("acknowledge_requisition",{p_id:req.id,p_mode:"app_visible",p_version:1})).error);
  await rpc(family,"update_my_profile",{p_name:"Teste family",p_registration:"",p_state:null,p_category:"",p_preferences:{internal:true,whatsapp:false,email:false,scienceExpress:true,scienceAutomatic:true,scienceWhatsApp:false}});
  const accepted = await rpc(family,"acknowledge_requisition",{p_id:req.id,p_mode:"app_visible",p_version:1});
  assert.equal(accepted.scienceSatisfied,true);assert.equal(accepted.science[0].mode,"app_visible");
  const repeated = await rpc(family,"acknowledge_requisition",{p_id:req.id,p_mode:"app_visible",p_version:1});assert.equal(repeated.science.length,1);
  const pro = await actor("professional",patient);assert.ok((await pro.rpc("acknowledge_requisition",{p_id:req.id,p_mode:"express",p_version:accepted.version})).error);
  await rpc(family,"update_my_profile",{p_name:"Teste family",p_registration:"",p_state:null,p_category:"",p_preferences:{internal:true,whatsapp:false,email:false,scienceExpress:true,scienceAutomatic:false,scienceWhatsApp:false}});
});

test("V4: two Auth sessions receive private invalidations; another user's topic is refused", {timeout:35000}, async () => {
  const {patient,products}=await setup();
  const family=await actor("family",patient),pro=await actor("professional",patient);
  const channels=[];
  function subscribe(client,uid) {
    const received=[];const listeners=[];
    let timer;
    const ready=new Promise((resolve,reject)=>{
      timer=setTimeout(()=>reject(new Error("Realtime private subscription timed out")),20000);
      const channel=client.channel("hca:user:"+uid,{config:{private:true}}).on("broadcast",{event:"invalidate"},event=>{received.push(event.payload);for(const notify of listeners)notify(event.payload);}).subscribe(status=>{
        if(status==="SUBSCRIBED"){clearTimeout(timer);resolve();}
        if(status==="CHANNEL_ERROR"){clearTimeout(timer);reject(new Error("Realtime private subscription rejected"));}
      });channels.push([client,channel]);
    });
    return {ready,received,listeners};
  }
  try {
    const a=subscribe(family,fixtures.family.id),b=subscribe(pro,fixtures.professional.id);await Promise.all([a.ready,b.ready]);
    // Require the real database stream, not merely a joined WebSocket, to be ready.
    await new Promise((resolve,reject)=>{
      let interval;let timeout;
      const check=()=>{if(a.received.length&&b.received.length){clearInterval(interval);clearTimeout(timeout);resolve();}};
      a.listeners.push(check);b.listeners.push(check);
      const ping=()=>sql(`select realtime.send('{"revision":0}'::jsonb,'invalidate','hca:user:${fixtures.family.id}',true);select realtime.send('{"revision":0}'::jsonb,'invalidate','hca:user:${fixtures.professional.id}',true);`);
      interval=setInterval(ping,400);timeout=setTimeout(()=>{clearInterval(interval);reject(new Error("Database broadcast stream is not ready"));},10000);ping();check();
    });
    const changes=[a,b].map(subscription=>new Promise(resolve=>subscription.listeners.push(payload=>{if(Number(payload.revision)>0)resolve(payload);} )));
    const req=await issue(patient,[products[0]]);
    const payloads=await Promise.race([Promise.all(changes),new Promise((_,reject)=>setTimeout(()=>reject(new Error("Realtime update missing")),10000))]);
    for(const payload of payloads)assert.ok(Object.keys(payload).every(key=>["revision","id"].includes(key)));
    for(const client of [family,pro]){const result=await client.from("requisitions").select("id").eq("id",req.id).single();assert.ifError(result.error);assert.equal(result.data.id,req.id);}
    let timer;
    const rejected=await new Promise(resolve=>{
      timer=setTimeout(()=>resolve(false),10000);
      const channel=pro.channel("hca:user:"+fixtures.family.id,{config:{private:true}}).subscribe(status=>{if(status==="CHANNEL_ERROR"){clearTimeout(timer);resolve(true);}if(status==="SUBSCRIBED"){clearTimeout(timer);resolve(false);}});channels.push([pro,channel]);
    });assert.equal(rejected,true);
  } finally {await Promise.all(channels.map(([client,channel])=>client.removeChannel(channel)));await Promise.all([family.realtime.disconnect(),pro.realtime.disconnect()]);}
});
