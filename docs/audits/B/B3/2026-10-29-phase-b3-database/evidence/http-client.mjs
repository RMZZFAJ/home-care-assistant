/* Real Auth SSR cookie sessions kept in memory, never printed or persisted. Local only. */
import {createServerClient} from '@supabase/ssr';
import {state,env,assert} from './local-harness.mjs';
const {FormData}=globalThis;
export const origin='http://127.0.0.1:3100';
const sessions=new Map();
export async function httpActor(name,patient=state.patient){
 if(!sessions.has(name)){
 const jar=new Map(),client=createServerClient(env.url,env.anonKey,{cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:rows=>rows.forEach(c=>jar.set(c.name,c.value))},auth:{autoRefreshToken:false}}),a=state.actors[name];
 const login=await client.auth.signInWithPassword({email:a.email,password:a.password});assert.ifError(login.error);const selected=await client.rpc('select_active_context',{p_patient:patient});assert.ifError(selected.error);sessions.set(name,{client,jar});}
 return sessions.get(name);
}
export async function app(name,path,{body,method='GET',headers={}}={}){
 const url=new URL(path,origin);if(url.origin!==origin)throw new Error('Nonlocal app origin refused');
 const s=await httpActor(name),h={cookie:[...s.jar].map(([k,v])=>k+'='+v).join('; '),origin,...headers};
 if(body&&!(body instanceof FormData)&&!Buffer.isBuffer(body)){body=JSON.stringify(body);h['content-type']='application/json';}
 return fetch(url,{method,headers:h,body,signal:AbortSignal.timeout(45000),redirect:'manual'});
}
export async function localSignedFetch(url){const target=new URL(url);if(target.origin!=='http://127.0.0.1:54321'||!target.pathname.startsWith('/storage/v1/'))throw new Error('Nonlocal signed URL refused');return fetch(target,{signal:AbortSignal.timeout(15000)});}
