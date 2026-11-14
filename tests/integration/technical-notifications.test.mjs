import test from "node:test";
import assert from "node:assert/strict";
import { createECDH, randomBytes, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { actor,env,fixtures,rpc } from "./v4-fixtures.mjs";
import { personalReminderFixture } from "./notice-reference-fixtures.mjs";
import { sql,sqlLiteral as q,pauseLocalAutomationForTests } from "../../scripts/test-environment.mjs";

test("global technical attempts preserve source/real pagination, minimize private data and grant no patient or retry authority",async()=>{
  const automation=JSON.parse(sql("select coalesce(jsonb_agg(jsonb_build_object('id',jobid,'name',jobname,'active',active)),'[]') from cron.job where jobname in ('hca-operational-lifecycle','hca-notification-worker');"));
  pauseLocalAutomationForTests();
  const f=await personalReminderFixture(); let device;
  try{
    const curve=createECDH("prime256v1");curve.generateKeys();
    const enrolled=await rpc(f.pro.client,"subscribe_web_push",{p_subscription:{endpoint:"https://fcm.googleapis.com/wp/technical-read-"+randomUUID(),expirationTime:null,keys:{p256dh:curve.getPublicKey().toString("base64url"),auth:randomBytes(16).toString("base64url")}},p_label:"Private technical fixture",p_key_version:"test-v1"});
    device=enrolled.id;
    const seed=sql(`select id from public.requisition_notifications where reminder_id=${q(f.reminder)} limit 1;`);
    assert.ok(seed);
    sql(`insert into public.operational_reminders(care_recipient_id,user_id,kind,period,expected_at)
      select ${q(f.patient)},${q(fixtures.professional.id)},'shift','2099-11-12'::date+g,'2099-11-12T00:00:00Z'::timestamptz+g*interval '1 day' from generate_series(1,101)g;
      insert into public.requisition_notifications(id,care_recipient_id,recipient_user_id,recipient_group,recipient_label,channel,destination,state,event_key,reminder_id,attempts,attempted_at,provider_reference,last_error,created_at)
      select gen_random_uuid(),n.care_recipient_id,n.recipient_user_id,n.recipient_group,'PRIVATE_LABEL_SENTINEL',n.channel,'PRIVATE_DESTINATION_SENTINEL','uncertain',n.event_key||':technical:'||r.id,r.id,1,now(),'PRIVATE_PROVIDER_SENTINEL:'||r.id,'PRIVATE_ERROR_SENTINEL',r.expected_at
      from public.requisition_notifications n cross join public.operational_reminders r where n.id=${q(seed)} and r.care_recipient_id=${q(f.patient)} and r.period>'2099-11-12'::date;
      insert into private.web_push_deliveries(notice_id,device_id,recipient_user_id,state,attempts,dispatch_started_at,last_error,created_at)
      select id,${q(device)},recipient_user_id,'uncertain',1,now(),'PRIVATE_PUSH_ERROR',created_at from public.requisition_notifications where care_recipient_id=${q(f.patient)} and recipient_label='PRIVATE_LABEL_SENTINEL' on conflict(notice_id,device_id) do update set state='uncertain',attempts=1,dispatch_started_at=excluded.dispatch_started_at,last_error=excluded.last_error;
      insert into private.web_push_attempts(delivery_id,ordinal,lease_token,worker_id,started_at,completed_at,outcome,error_code)
      select id,1,gen_random_uuid(),gen_random_uuid(),now()-interval '1 minute',now(),'uncertain','PRIVATE_ATTEMPT_ERROR' from private.web_push_deliveries where device_id=${q(device)} on conflict(delivery_id,ordinal) do nothing;`);
    const snapshot=()=>sql(`select jsonb_build_object('notices',(select jsonb_agg(to_jsonb(n) order by id) from public.requisition_notifications n where care_recipient_id=${q(f.patient)}),'push',(select jsonb_agg(to_jsonb(d) order by id) from private.web_push_deliveries d where device_id=${q(device)}),'stock',(select count(*) from public.stock_movements),'science',(select count(*) from public.requisition_science_events));`);
    const before=snapshot(), global=await actor("global");
    for(const source of ["notices","web_push"]){
      const relation=source==="notices"?"public.requisition_notifications":"private.web_push_deliveries";
      const expected=JSON.parse(sql(`select jsonb_agg(id order by created_at desc,id desc) from (select id,created_at from ${relation} order by created_at desc,id desc limit 150)x;`));
      const actual=[];
      for(let page=1;page<=3;page++){
        const data=await rpc(global,"operations_notification_attempts",{p_source:source,p_page:page,p_size:50});
        assert.equal(data.environment,"shared_database");assert.equal(data.source,source);assert.equal(data.page,page);assert.equal(data.pageSize,50);
        assert.equal(data.total,Number(sql(`select count(*) from ${relation};`)));actual.push(...data.data.map(row=>row.id));
        const serialized=JSON.stringify(data);
        for(const secret of [f.patient,fixtures.professional.id,device,"PRIVATE_","recipient_user_id","endpoint","destination","lease_token","worker_id","provider_reference"]){assert.ok(!serialized.includes(secret),secret);}
        if(page===1){
          const row=data.data[0];assert.equal(row.state,"uncertain");
          assert.equal(row.historyCoverage,source==="notices"?"last_result_only":"recorded_attempts");
          assert.equal(row.attempts.length,source==="notices"?0:1);
          if(source==="web_push"){assert.equal(row.attempts[0].outcome,"uncertain");assert.equal(row.attempts[0].errorRecorded,true);}
        }
      }
      assert.deepEqual(actual,expected);assert.equal(new Set(actual).size,actual.length);
    }
    assert.equal((await global.rpc("operations_notification_attempts",{p_source:null})).error?.code,"22023");
    for(const input of [{p_source:"future"},{p_source:"notices",p_page:0},{p_source:"web_push",p_size:51}])assert.equal((await global.rpc("operations_notification_attempts",input)).error?.code,"22023");
    const local=await actor("adminA",f.patient), anon=createClient(env.url,env.anonKey,{auth:{persistSession:false}}), service=createClient(env.url,env.serviceKey,{auth:{persistSession:false}});
    for(const client of [local,anon,service])assert.ok((await client.rpc("operations_notification_attempts",{p_source:"notices"})).error);
    await rpc(global,"select_active_context",{p_patient:f.patient});assert.equal((await global.rpc("operations_notification_attempts",{p_source:"web_push"})).error?.code,"42501");
    assert.equal(snapshot(),before);
    assert.equal(sql("select has_function_privilege('anon','public.operations_notification_attempts(text,integer,integer)','EXECUTE') or has_function_privilege('service_role','public.operations_notification_attempts(text,integer,integer)','EXECUTE');"),"f");
  }finally{
    if(device)await rpc(f.pro.client,"web_push_device_command",{p_id:device,p_action:"revoke"});
    sql(`update public.care_recipients set is_active=false where id=${q(f.patient)};`);
    for(const job of automation)sql(`select cron.alter_job(jobid,active=>${job.active}) from cron.job where jobid=${Number(job.id)} and jobname=${q(job.name)};`);
  }
});
