/* Exact-local guard. One NEW synthetic Auth actor, no SMS/email send.
 * Password/session stay outside Git; no existing account modified. */
import assert from 'node:assert/strict';
import { readFileSync,writeFileSync,existsSync,mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID,randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { getTestEnvironment,sql,sqlLiteral as lit } from '../../../../scripts/test-environment.mjs';
assert.equal(process.versions.node,'24.22.0');
export const env=getTestEnvironment();
const transport=async(url,init)=>{const u=new URL(String(url));assert.equal(u.origin,env.url,'Nonlocal Auth call refused');return fetch(url,init);};
const options={global:{fetch:transport},auth:{persistSession:false,autoRefreshToken:false}};
const dir=join(process.env.LOCALAPPDATA,'home-care-assistant','audit-b5');mkdirSync(dir,{recursive:true});
const file=join(dir,'synthetic-actor.json');
export async function localActor(){
 let state;
 if(existsSync(file))state=JSON.parse(readFileSync(file,'utf8'));
 else {
  const proof=JSON.parse(readFileSync(new URL('backup-proof.json',import.meta.url),'utf8'));assert.equal(proof.archiveListVerified,true);
  const service=createClient(env.url,env.serviceKey,options);
  const tag=randomUUID().replaceAll('-','');
  state={email:'b5-'+tag+'@example.invalid',password:'B5!'+randomBytes(24).toString('base64url'),phone:'+1555'+String(BigInt('0x'+tag.slice(0,8))%10000000n).padStart(7,'0')};
  const r=await service.auth.admin.createUser({email:state.email,password:state.password,email_confirm:true,phone:state.phone,phone_confirm:true,user_metadata:{full_name:'Pessoa fictícia B5'}});
  assert(!r.error,'New local synthetic Auth actor creation failed');state.id=r.data.user.id;
  writeFileSync(file,JSON.stringify(state,null,2)+'\n',{mode:0o600});
  sql(`insert into public.profiles(id,full_name,role,status,notification_preferences) values(${lit(state.id)},'Pessoa fictícia B5','professional','active','{"whatsapp":true,"scienceWhatsApp":true,"scienceAutomatic":true}') on conflict(id) do nothing;`);
 }
 const client=createClient(env.url,env.anonKey,options);
 const login=await client.auth.signInWithPassword({email:state.email,password:state.password});assert(!login.error,'Synthetic local login failed');
 const claims=JSON.parse(Buffer.from(login.data.session.access_token.split('.')[1],'base64url').toString());
 return {...state,client,claims};
}
export {sql,lit};
