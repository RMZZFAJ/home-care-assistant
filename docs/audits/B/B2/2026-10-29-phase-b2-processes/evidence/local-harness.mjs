/* MUTABLE LOCAL AUDIT HARNESS. Creates only NEW fictitious identities/patients.
 * No reset, replacement fixtures, schema changes, external worker or real messages.
 * Auth issued officially; business commands use authenticated RPCs. Passwords/tokens
 * stay in private user data outside Git. SQL reads are scoped to audit IDs; the only
 * bootstrap SQL is INSERT of a new profile for a newly issued Auth identity. */
import assert from 'node:assert/strict';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { getTestEnvironment, sql, sqlLiteral, fixtureFile } from '../../../../scripts/test-environment.mjs';
import { fixturePassword } from '../../../../scripts/test-constants.mjs';

if (process.versions.node !== '24.22.0') throw new Error('Required Node 24.22.0');
export const env = getTestEnvironment();
export const output = new URL('./', import.meta.url);
const privateDir = join(process.env.LOCALAPPDATA, 'home-care-assistant', 'audit-b2');
mkdirSync(privateDir, { recursive: true });
const stateFile = join(privateDir, 'local-state.json');
export const state = existsSync(stateFile) ? JSON.parse(readFileSync(stateFile, 'utf8')) : { tag: 'B2-20261029-' + randomUUID().slice(0,8), actors: {}, patient: null, products: [], objects: {} };
export const save = () => writeFileSync(stateFile, JSON.stringify(state, null, 2) + '\n', { mode: 0o600 });
const clientOptions = { auth: { persistSession: false, autoRefreshToken: false } };
export const service = createClient(env.url, env.serviceKey, clientOptions);
const clients = new Map();
export async function rpc(client, name, args = {}) {
  const { data, error } = await client.rpc(name, args);
  if (error) throw Object.assign(new Error(`${name}: ${error.message}`), { sqlstate: error.code, rpc: name });
  return data;
}
export async function actor(name, patient = state.patient) {
  if (!clients.has(name)) {
    const item = state.actors[name];
    if (!item) throw new Error('Audit actor missing');
    const client = createClient(env.url, env.anonKey, clientOptions);
    const result = await client.auth.signInWithPassword({ email: item.email, password: item.password });
    if (result.error) throw new Error('Local synthetic login failed');
    clients.set(name, client);
  }
  const client = clients.get(name);
  if (patient !== null) await rpc(client, 'select_active_context', { p_patient: patient });
  return client;
}
export async function initialize() {
  if (state.initialized) return;
  const fixtures = JSON.parse(readFileSync(fixtureFile, 'utf8'));
  const global = createClient(env.url, env.anonKey, clientOptions);
  const login = await global.auth.signInWithPassword({ email: fixtures.global.email, password: fixturePassword });
  if (login.error) throw new Error('Existing local global fixture login failed');
  await rpc(global, 'select_active_context', { p_patient: null });
  for (const name of ['admin','family','professional','supervisor','reader','replacement','admin2']) {
    if (state.actors[name]) continue;
    const email = `${state.tag.toLowerCase()}-${name}@example.invalid`;
    const password = 'B2!' + randomBytes(24).toString('base64url');
    const created = await service.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: 'Pessoa fictícia B2 ' + name } });
    if (created.error) throw new Error('Synthetic Auth creation failed');
    const id = created.data.user.id;
    sql(`insert into public.profiles(id,full_name,role,status) values(${sqlLiteral(id)},${sqlLiteral('Pessoa fictícia B2 '+name)},'professional','active') on conflict(id) do nothing;`);
    state.actors[name] = { id, email, password };
    save();
  }
  if (!state.patient) {
    const patient = await rpc(global, 'create_patient_with_administrator', { p_name: 'Residência fictícia ' + state.tag, p_development: true, p_administrator_email: state.actors.admin.email });
    state.patient = patient.id;
    save();
  }
  const admin = await actor('admin');
  const bootstrap = [];
  for (const name of ['family','professional','supervisor','reader','replacement','admin2']) {
    const role = name === 'replacement' ? 'professional' : name === 'admin2' ? 'admin' : name;
    const membership = sql(`select status from public.care_recipient_memberships where care_recipient_id=${sqlLiteral(state.patient)} and user_id=${sqlLiteral(state.actors[name].id)};`);
    if (membership === 'active') { bootstrap.push({ role, invitationAccepted: true, membershipActive: true, resumed: true }); continue; }
    let hash = sql(`select token_hash from public.care_recipient_invitations where care_recipient_id=${sqlLiteral(state.patient)} and email=${sqlLiteral(state.actors[name].email)} and status='pending' order by created_at desc limit 1;`);
    if (!hash) {
      hash = createHash('sha256').update(randomBytes(32)).digest('hex');
      await rpc(admin, 'admin_create_invitation', { p_care_recipient_id: state.patient, p_email: state.actors[name].email, p_role: role, p_can_manage_stock: ['family','supervisor','admin'].includes(role), p_can_count_stock: ['professional','supervisor'].includes(role), p_token_hash: hash, p_expires_at: new Date(Date.now()+86400000).toISOString() });
    }
    const client = await actor(name, null);
    const accepted = await rpc(client, 'accept_invitation', { p_token_hash: hash });
    assert.equal(accepted.user_id, state.actors[name].id);
    bootstrap.push({ role, invitationAccepted: true, membershipActive: accepted.status === 'active', via: 'official Auth and authorized invitation RPCs' });
  }
  for (let index = 0; index < 4; index++) {
    if (state.products[index]) continue;
    const product = await rpc(admin, 'admin_upsert_recipient_product', { p_care_recipient_id: state.patient, p_product_id: null, p_name: 'Material fictício B2 ' + (index+1), p_category: ['higiene','medicamentos','dieta','higiene'][index], p_unit: 'unidade', p_aliases: ['Alternativo fictício B2 '+(index+1)], p_is_active: true });
    state.products.push(product.product_id);
    save();
  }
  state.initialized = true;
  save();
  writeFileSync(new URL('synthetic-setup.json', output), JSON.stringify({ recordedAt: new Date().toISOString(), tag: state.tag, patientId: state.patient, productIds: state.products, actors: Object.entries(state.actors).map(([name, data])=>({ name, id: data.id })), bootstrap, externalSending: false, realAccountsChanged: false, existingDataReplaced: false, limits: 'Setup only; no human onboarding or provider validation. Seven newly issued identities and one new development patient; existing global test identity only authenticated.' }, null, 2)+'\n');
}
export async function addAuditActor(name, role = 'professional', patient = state.patient) {
  if (!/^[a-z0-9_]+$/.test(name)) throw new Error('Invalid synthetic actor name');
  if (!state.actors[name]) {
    const email = `${state.tag.toLowerCase()}-${name}@example.invalid`, password = 'B2!' + randomBytes(24).toString('base64url');
    const created = await service.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: 'Pessoa fictícia B2 '+name } });
    if (created.error) throw new Error('Synthetic Auth creation failed');
    const id=created.data.user.id;
    sql(`insert into public.profiles(id,full_name,role,status) values(${sqlLiteral(id)},${sqlLiteral('Pessoa fictícia B2 '+name)},'professional','active') on conflict(id) do nothing;`);
    state.actors[name]={id,email,password};save();
  }
  const member=sql(`select status from public.care_recipient_memberships where care_recipient_id=${sqlLiteral(patient)} and user_id=${sqlLiteral(state.actors[name].id)};`);
  if(member!=='active') {
    const admin=await actor('admin',patient),hash=createHash('sha256').update(randomBytes(32)).digest('hex');
    await rpc(admin,'admin_create_invitation',{p_care_recipient_id:patient,p_email:state.actors[name].email,p_role:role,p_can_manage_stock:role==='supervisor',p_can_count_stock:['professional','supervisor'].includes(role),p_token_hash:hash,p_expires_at:new Date(Date.now()+86400000).toISOString()});
    const client=await actor(name,null);await rpc(client,'accept_invitation',{p_token_hash:hash});
  }
  return {id:state.actors[name].id,client:await actor(name,patient)};
}
export async function createAuditPatient(label, members = []) {
  const fixtures=JSON.parse(readFileSync(fixtureFile,'utf8')),global=createClient(env.url,env.anonKey,clientOptions);
  const login=await global.auth.signInWithPassword({email:fixtures.global.email,password:fixturePassword});if(login.error)throw new Error('Local global fixture login failed');
  await rpc(global,'select_active_context',{p_patient:null});
  const result=await rpc(global,'create_patient_with_administrator',{p_name:'Residência fictícia '+state.tag+' '+label,p_development:true,p_administrator_email:state.actors.admin.email});
  state.objects.additionalPatients??=[];state.objects.additionalPatients.push(result.id);save();
  for(const [name,role] of members)await addAuditActor(name,role,result.id);
  await actor('admin',state.patient);
  return result.id;
}
export function countStock(product = state.products[0]) {
  return JSON.parse(sql(`select jsonb_build_object('FAMILY',coalesce(sum(case when destination_location='FAMILY' then quantity else 0 end)-sum(case when source_location='FAMILY' then quantity else 0 end),0)::text,'CARE_TEAM',coalesce(sum(case when destination_location='CARE_TEAM' then quantity else 0 end)-sum(case when source_location='CARE_TEAM' then quantity else 0 end),0)::text,'TRANSIT',coalesce(sum(case when destination_location='TRANSIT' then quantity else 0 end)-sum(case when source_location='TRANSIT' then quantity else 0 end),0)::text,'movements',count(*)) from public.stock_movements where care_recipient_id=${sqlLiteral(state.patient)} and product_id=${sqlLiteral(product)};`));
}
export function docState(id) {
  return JSON.parse(sql(`select jsonb_build_object('id',d.id,'status',d.status,'version',d.version,'number',d.number,'lines',(select jsonb_agg(jsonb_build_object('id',l.id,'productId',l.product_id,'quantity',l.quantity::text,'approved',l.approved_quantity::text,'purchased',l.purchased_quantity::text,'accepted',l.accepted_quantity::text,'reconciled',l.reconciled_quantity::text,'fullyChecked',l.fully_checked,'metadata',l.metadata)) from public.document_lines l where l.document_id=d.id),'events',(select count(*) from public.document_events e where e.document_id=d.id),'receipts',(select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'state',r.state,'lines',r.lines)),'[]') from public.purchase_receipts r where r.document_id=d.id)) from public.operational_documents d where d.id=${sqlLiteral(id)} and d.care_recipient_id=${sqlLiteral(state.patient)};`));
}
export const createDoc = (client, type, payload, key = randomUUID(), draft = false) => rpc(client, 'create_supply_document', { p_patient: state.patient, p_type: type, p_payload: payload, p_key: key, p_draft: draft });
export const command = async (client, id, action, body, key = randomUUID(), version = null) => rpc(client, 'supply_document_command', { p_id: id, p_action: action, p_body: body, p_key: key, p_version: version ?? docState(id).version });
export async function issue(client, products = [state.products[0]], overrides = {}) {
  const key = overrides.key ?? randomUUID();
  const args = { p_care_recipient_id: state.patient, p_idempotency_key: key, p_payload_hash: 'server-computes', p_lines: products.map(productId=>({ productId, currentStock: '0', urgent: true, ...(overrides.repeatReason ? { repeatReason: overrides.repeatReason } : {}) })), p_extra_items: overrides.extras ?? [], p_observations: overrides.observations ?? [] };
  const result = await rpc(client, 'submit_requisition', args);
  const id = result[0].requisition_id;
  const lines = JSON.parse(sql(`select coalesce(jsonb_agg(jsonb_build_object('id',id,'productId',product_id,'customName',custom_name)),'[]') from public.requisition_items where requisition_id=${sqlLiteral(id)};`));
  return { id, key, args, lines };
}
export const move = (client, product, quantity, action = 'inbound', reason = 'Fato sintético auditável B2') => rpc(client, 'family_stock_movement', { p_patient: state.patient, p_product: product, p_quantity: quantity, p_action: action, p_reason: reason, p_key: randomUUID() });
export function recorder(group, options = {}) {
  const file = new URL(group.toLowerCase().replaceAll('.','') + '-results.json', output);
  const result = options.resume && existsSync(file) ? JSON.parse(readFileSync(file,'utf8')) : { group, startedAt: new Date().toISOString(), productSha: '37cb7f85e96e551d6419871f94dd950712e2565b', environment: 'verified local home-care-assistant; loopback 54321/54322', fixture: state.tag, patient: state.patient, method: 'Authenticated RPC and independent persisted SQL read-back; no browser unless explicitly stated', scenarios: [], limits: ['Synthetic local data only','Not production, provider or human validation','No reset, migration or existing data replacement'] };
  if(options.resume) { result.previousAttempts=[...(result.previousAttempts??[]),...result.scenarios.filter(row=>row.execution!=='EXECUTED')];result.scenarios=result.scenarios.filter(row=>row.execution==='EXECUTED'); }
  return { result, async scenario(id, purpose, body) {
    if(options.resume && result.scenarios.some(row=>row.id===id)) return result.scenarios.find(row=>row.id===id).observed;
    const row = { id, purpose, recordedAt: new Date().toISOString() };
    try { row.observed = await body(); row.execution = 'EXECUTED'; }
    catch (error) { row.execution = 'HARNESS_OR_UNEXPECTED_FAILURE'; row.error = { message: error.message, sqlstate: error.sqlstate ?? null }; result.scenarios.push(row); writeFileSync(file, JSON.stringify(result,null,2)+'\n'); throw error; }
    result.scenarios.push(row); writeFileSync(file, JSON.stringify(result,null,2)+'\n');
    console.log(JSON.stringify({ id, execution: row.execution, observed: row.observed }));
    return row.observed;
  }, finish() { result.finishedAt = new Date().toISOString(); writeFileSync(file, JSON.stringify(result,null,2)+'\n'); } };
}
export async function rejected(body, expectedPattern) {
  try { await body(); return { rejected: false }; }
  catch (error) { if (expectedPattern) assert.match(error.message, expectedPattern); return { rejected: true, sqlstate: error.sqlstate ?? null, message: error.message }; }
}
export { assert, randomUUID, sql, sqlLiteral };
