/* MUTABLE LOCAL: NEW synthetic identities/patients only; no reset/seed/delete.
 * Secrets remain outside Git. No external provider calls; exact local guard.
 * Import does NOT provision. Explicit initialize() is the only setup entry. */
import assert from 'node:assert/strict';
import { createHash,randomBytes,randomUUID } from 'node:crypto';
import { readFileSync,writeFileSync,mkdirSync,existsSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { getTestEnvironment,sql,sqlLiteral,fixtureFile } from '../../../../scripts/test-environment.mjs';
import { fixturePassword } from '../../../../scripts/test-constants.mjs';
if(process.versions.node!=='24.22.0')throw new Error('Node version');
export const env=getTestEnvironment(),origin='http://127.0.0.1:3100';
const directory=join(process.env.LOCALAPPDATA,'home-care-assistant','audit-b4');mkdirSync(directory,{recursive:true});
const privateFile=join(directory,'local-state.json');
export const state=existsSync(privateFile)?JSON.parse(readFileSync(privateFile,'utf8')):{tag:'B4-'+randomUUID().slice(0,8),actors:{},patients:[],products:[],objects:{}};
export const save=()=>writeFileSync(privateFile,JSON.stringify(state,null,2)+'\n',{mode:0o600});
export const record=(name,data)=>writeFileSync(new URL(name,import.meta.url),JSON.stringify(data,null,2)+'\n');
export const service=createClient(env.url,env.serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
export const rpc=async(client,name,args={})=>{const r=await client.rpc(name,args);if(r.error)throw Object.assign(new Error(name+': '+r.error.message),{code:r.error.code});return r.data;};
const sessions=new Map();
export async function actor(name){
 if(sessions.has(name))return sessions.get(name);
 const person=name==='global'?{...JSON.parse(readFileSync(fixtureFile,'utf8')).global,password:fixturePassword}:state.actors[name];
 assert(person,'Synthetic actor required');
 const jar=new Map();
 const client=createServerClient(env.url,env.anonKey,{cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:values=>values.forEach(({name,value})=>jar.set(name,value))},auth:{autoRefreshToken:false}});
 const signed=await client.auth.signInWithPassword({email:person.email,password:person.password});
 assert(!signed.error,'Local login failed');
 const result={client,jar,userId:signed.data.user.id};sessions.set(name,result);return result;
}
export async function http(name,path,{method='GET',body,headers={},raw=false,binary=false}={}){
 assert(path.startsWith('/api/')||path.startsWith('/auth/')||path.startsWith('/verificar/'),'Path guard');
 const person=name?await actor(name):null;
 const response=await fetch(origin+path,{method,headers:{...(person?{cookie:[...person.jar].map(([k,v])=>k+'='+v).join('; ')}:{}),...(body!==undefined?{'content-type':'application/json',origin}:{}),...headers},body:body===undefined?undefined:raw?body:JSON.stringify(body),signal:AbortSignal.timeout(40000),redirect:'manual'});
 let data;
 if(binary&&response.ok){const bytes=Buffer.from(await response.arrayBuffer());data={bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),signature:bytes.subarray(0,5).toString()};}
 else{const text=await response.text();try{data=text?JSON.parse(text):null;}catch{data={nonJson:true,bytes:Buffer.byteLength(text)}}}
 return {status:response.status,data,headers:Object.fromEntries(['cache-control','x-correlation-id','location','content-type','access-control-allow-origin','allow','content-security-policy','x-frame-options','x-content-type-options','referrer-policy'].map(h=>[h,response.headers.get(h)]))};
}
export async function select(name,patient=state.patients[0]){const r=await http(name,'/api/context',{method:'POST',body:{careRecipientId:patient}});assert.equal(r.status,200);return r;}
export async function initialize(){
 if(state.initialized)return;
 // Verified backup/TOC is required; never merely trust a filename.
 const proof=JSON.parse(readFileSync(new URL('backup-proof.json',import.meta.url),'utf8'));
 assert(proof.archiveListVerified&&proof.sha256==='5642bcbe4d60fb6f29893cd086a744c8889bbe5a4a990e7bf4f4641715a654b9');
 const {client:global}=await actor('global');await rpc(global,'select_active_context',{p_patient:null});
 for(const name of ['admin','family','professional','outsider']){
  if(state.actors[name])continue;
  const email=state.tag.toLowerCase()+'-'+name+'@example.invalid',password='B4!'+randomBytes(24).toString('base64url');
  const r=await service.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name:'Pessoa fictícia B4 '+name}});
  assert(!r.error,'Synthetic Auth creation');const id=r.data.user.id;
  sql(`insert into public.profiles(id,full_name,role,status) values(${sqlLiteral(id)},${sqlLiteral('Pessoa fictícia B4 '+name)},'professional','active') on conflict(id) do nothing;`);
  state.actors[name]={id,email,password};save();
 }
 for(let i=0;i<2;i++){
  if(state.patients[i])continue;
  const p=await rpc(global,'create_patient_with_administrator',{p_name:'Residência fictícia '+state.tag+' '+i,p_development:true,p_administrator_email:state.actors.admin.email});state.patients[i]=p.id;save();
 }
 const {client:admin}=await actor('admin');
 for(const patient of state.patients){
  await rpc(admin,'select_active_context',{p_patient:patient});
  for(const role of ['family','professional']){
   const hash=createHash('sha256').update(randomBytes(32)).digest('hex');
   await rpc(admin,'admin_create_invitation',{p_care_recipient_id:patient,p_email:state.actors[role].email,p_role:role,p_can_manage_stock:role==='family',p_can_count_stock:role==='professional',p_token_hash:hash,p_expires_at:new Date(Date.now()+86400000).toISOString()});
   await rpc((await actor(role)).client,'accept_invitation',{p_token_hash:hash});
  }
 }
 await rpc(admin,'select_active_context',{p_patient:state.patients[0]});
 for(let i=0;i<2;i++){
  const p=await rpc(admin,'admin_upsert_recipient_product',{p_care_recipient_id:state.patients[0],p_product_id:null,p_name:'Material fictício '+state.tag+' '+i,p_category:'higiene',p_unit:'unidade',p_aliases:[],p_is_active:true});state.products.push(p.product_id);save();
 }
 state.initialized=true;save();
 record('synthetic-setup.json',{recordedAt:new Date().toISOString(),tag:state.tag,actors:Object.keys(state.actors),newPatients:state.patients,newProducts:state.products,externalSending:false,reset:false,existingObjectsReplaced:false,limits:'Official Auth; new profiles bootstrapped by scoped INSERT; authorized creation/invitation RPCs. Existing global synthetic fixture only logs in.'});
}
