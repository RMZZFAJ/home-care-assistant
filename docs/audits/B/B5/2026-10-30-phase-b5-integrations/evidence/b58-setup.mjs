/* MUTABLE LOCAL: two NEW synthetic patients, one pending Flow; no previous
 * rows replaced. Guarded Auth/RPC only. Browser cookies saved outside Git. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {randomBytes,createHash} from 'node:crypto';
import {createServerClient} from '@supabase/ssr';
import {createClient} from '@supabase/supabase-js';
import {actor as priorActor,rpc} from '../../2026-10-30-phase-b4-backend/evidence/http-local.mjs';
import {localActor,env,sql,lit} from './local-actor.mjs';
const person=await localActor(),dir=join(process.env.LOCALAPPDATA,'home-care-assistant','audit-b5');
const stateFile=join(dir,'browser-fixture.json');
let state=existsSync(stateFile)?JSON.parse(readFileSync(stateFile,'utf8')):{patients:[]};
const save=()=>writeFileSync(stateFile,JSON.stringify(state,null,2)+'\n',{mode:0o600});
if(state.patients.length<2){const {client}=await priorActor('global');await rpc(client,'select_active_context',{p_patient:null});for(let i=state.patients.length;i<2;i++){const p=await rpc(client,'create_patient_with_administrator',{p_name:'Residência fictícia B5 atualização '+(i+1),p_development:true,p_administrator_email:person.email});state.patients.push(p.id);save();}}
if(process.argv.includes('--submit')){
 assert(!state.submission,'Do not duplicate the directed UI scenario');
 await rpc(person.client,'select_active_context',{p_patient:state.patients[0]});
 const hash=createHash('sha256').update(randomBytes(32)).digest('hex');
 await rpc(person.client,'create_flow_session',{p_patient:state.patients[0],p_hash:hash});
 const service=createClient(env.url,env.serviceKey,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:async(url,init)=>{assert.equal(new URL(String(url)).origin,env.url);return fetch(url,init);}}});
 const r=await rpc(service,'flow_exchange',{p_hash:hash,p_submit:{kind:'shortage',text:'Relato fictício B5 recebido com a tela aberta'}});
 state.submission=r.submissionId;save();
 const count=sql(`begin read only;select count(*) from public.flow_submissions where id=${lit(state.submission)} and status='pending_confirmation';rollback;`);assert.equal(count,'1');
 const report={recordedAt:new Date().toISOString(),newPendingSubmissions:1,readbackConfirmed:true,method:'Actual local Auth/RPC and independent SQL read; encrypted/Meta transport not used',externalSending:false};writeFileSync(new URL('b58-submission-results.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(report);
}else{
 const jar=new Map();
 const client=createServerClient(env.url,env.anonKey,{cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:xs=>xs.forEach(({name,value})=>jar.set(name,value))},auth:{autoRefreshToken:false}});
 const signed=await client.auth.signInWithPassword({email:person.email,password:person.password});assert(!signed.error);
 await rpc(client,'select_active_context',{p_patient:state.patients[0]});
 writeFileSync(join(dir,'storage-state.json'),JSON.stringify({cookies:[...jar].map(([name,value])=>({name,value,domain:'127.0.0.1',path:'/',httpOnly:false,secure:false,sameSite:'Lax',expires:-1})),origins:[]}),{mode:0o600});
 const browserDir=join(dir,'browser');mkdirSync(browserDir,{recursive:true});
 writeFileSync(join(dir,'cli.config.json'),JSON.stringify({browser:{browserName:'chromium',launchOptions:{headless:true},contextOptions:{viewport:{width:1440,height:1000}}},outputDir:browserDir,outputMode:'file',network:{allowedOrigins:['http://127.0.0.1:3100','http://127.0.0.1:54321','ws://127.0.0.1:54321']}}));
 console.log(JSON.stringify({newSyntheticPatients:state.patients.length,credentialsLocation:'outside Git in LOCALAPPDATA/audit-b5',external:false,flows:false,noReset:true}));
}
