import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { getTestEnvironment, sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { trustedExecutable } from "../../scripts/trusted-executable.mjs";

test("local Auth accepts six characters and preserves the other password requirements", async()=>{
 const env=getTestEnvironment();
 assert.equal(new URL(env.url).origin,"http://127.0.0.1:54321");
 const auth=JSON.parse(execFileSync(trustedExecutable("docker"),["inspect","supabase_auth_home-care-assistant"],{encoding:"utf8"}))[0];
 assert.equal(auth.Config.Labels["com.supabase.cli.project"],"home-care-assistant");
 assert.ok(auth.Config.Env.some(value=>/^GOTRUE_SMTP_HOST=supabase_(?:mailpit|inbucket)_home-care-assistant$/.test(value)),"signup email must remain in the local capture");
 const client=createClient(env.url,env.anonKey,{auth:{persistSession:false,autoRefreshToken:false}});
 for(const password of ["Aa1!x","aa1!xx"]){
  const email=`password-rejected-${randomUUID()}@example.invalid`;
  const result=await client.auth.signUp({email,password});
  assert.equal(result.error?.code,"weak_password");
  assert.equal(sql("select count(*) from auth.users where email="+q(email)),"0");
 }
 const email=`password-six-${randomUUID()}@example.invalid`;
 const accepted=await client.auth.signUp({email,password:"Aa1!xx"});
 assert.ifError(accepted.error);assert.ok(accepted.data.user?.id);
 assert.equal(sql("select count(*) from auth.users where email="+q(email)),"1");
});
