/* New fictional Auth identities only. Exact-local transport, no message send.
 * Passwords and claims never written into the documentary package. */
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getTestEnvironment } from '../../../../scripts/test-environment.mjs';
assert.equal(process.versions.node, '24.22.0');
const env=getTestEnvironment();
const directory=join(process.env.LOCALAPPDATA,'home-care-assistant','audit-b6');
mkdirSync(directory,{recursive:true});
const privateFile=join(directory,'actors.json');
const transport=async(url,init)=>{assert.equal(new URL(String(url)).origin,env.url);return fetch(url,init);};
const options={global:{fetch:transport},auth:{persistSession:false,autoRefreshToken:false}};
export async function actors(){
 const proof=JSON.parse(readFileSync(new URL('backup-proof.json',import.meta.url),'utf8'));
 assert(proof.archiveListVerified);
 const state=existsSync(privateFile)?JSON.parse(readFileSync(privateFile,'utf8')):{};
 const service=createClient(env.url,env.serviceKey,options);
 for(const role of ['issuer','recipient']){
  if(!state[role]){
   const email='b6-'+randomBytes(12).toString('hex')+'@example.invalid',password='B6!'+randomBytes(24).toString('base64url');
   const created=await service.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name:'Pessoa fictícia B6 '+role}});
   assert(!created.error,'Synthetic local Auth create failed');
   state[role]={id:created.data.user.id,email,password};
   writeFileSync(privateFile,JSON.stringify(state,null,2)+'\n',{mode:0o600});
  }
 }
 const sessions={};
 for(const role of ['issuer','recipient']){
  const client=createClient(env.url,env.anonKey,options);
  const signed=await client.auth.signInWithPassword({email:state[role].email,password:state[role].password});
  assert(!signed.error,'Synthetic local Auth sign in failed');
  sessions[role]={id:state[role].id,claims:JSON.parse(Buffer.from(signed.data.session.access_token.split('.')[1],'base64url').toString())};
 }
 return sessions;
}
