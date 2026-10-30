/* Local rollback SQL; current challenge functions; no provider messages. */
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {localActor,sql,lit} from './local-actor.mjs';
const actor=await localActor();
const raw=sql(`begin;set local statement_timeout='15s';
select set_config('request.jwt.claims',${lit(JSON.stringify(actor.claims))},true) is not null;
select public.register_verified_phone();
do $b5$ declare p uuid:=gen_random_uuid();r uuid:=gen_random_uuid();expired uuid:=gen_random_uuid();w uuid:=gen_random_uuid();n uuid:=gen_random_uuid();hash text:=encode(extensions.digest(gen_random_uuid()::text,'sha256'),'hex');ehash text:=encode(extensions.digest(gen_random_uuid()::text,'sha256'),'hex');wrong boolean;purpose boolean;expiry boolean;ok boolean;duplicate boolean;revoked boolean;begin
 perform set_config('request.jwt.claims','{"role":"service_role"}',true);
 insert into public.care_recipients(id,display_name,is_development) values(p,'Paciente fictício B5 interações',true);
 insert into public.care_recipient_memberships(care_recipient_id,user_id,role) values(p,${lit(actor.id)},'professional');
 insert into public.operational_reminders(id,care_recipient_id,user_id,kind,period,expected_at) values(r,p,${lit(actor.id)},'shift',current_date,now()),(expired,p,${lit(actor.id)},'shift',current_date-1,now()-interval '1 day');
 insert into public.reminder_challenges(reminder_id,user_id,phone,token_hash,expires_at) values(r,${lit(actor.id)},${lit(actor.phone)},hash,now()+interval '20 minutes'),(expired,${lit(actor.id)},${lit(actor.phone)},ehash,now()-interval '1 minute');
 insert into public.requisition_notifications(id,care_recipient_id,reminder_id,recipient_user_id,recipient_group,recipient_label,channel,state,event_key,destination)
 values(n,p,r,${lit(actor.id)},'care_team','Pessoa fictícia B5','whatsapp','accepted','shift.reminder',${lit(actor.phone)});
 wrong:=not public.acknowledge_no_issues('B5-wrong-phone', '+15550000002',hash);
 purpose:=not public.confirm_whatsapp_science('B5-wrong-purpose',${lit(actor.phone)},hash) and not coalesce((public.accept_whatsapp_receipt('B5-wrong-purpose2',${lit(actor.phone)},hash)->>'accepted')::boolean,false);
 expiry:=not public.acknowledge_no_issues('B5-expired',${lit(actor.phone)},ehash);
 ok:=public.acknowledge_no_issues('B5-valid-no-issues',${lit(actor.phone)},hash);
 duplicate:=not public.acknowledge_no_issues('B5-valid-no-issues',${lit(actor.phone)},hash);
 update public.reminder_challenges set expires_at=now()+interval '10 minutes' where reminder_id=expired;
 update public.care_recipient_memberships set status='revoked' where care_recipient_id=p and user_id=${lit(actor.id)};
 revoked:=not public.acknowledge_no_issues('B5-revoked',${lit(actor.phone)},ehash);
 perform set_config('b5.result',jsonb_build_object(
 'B56-S01',jsonb_build_object('wrongPhoneRejected',wrong,'wrongPurposeRejected',purpose,'expiredRejected',expiry),
 'B56-S02',jsonb_build_object('accepted',ok,'externalRowSeenAtSet',(select seen_at is not null from public.requisition_notifications where id=n),'oneAudit',(select count(*)=1 from public.audit_events where entity_id=r and action='shift.no_issues'),'ledgerRows',(select count(*) from public.stock_movements where care_recipient_id=p)),
 'B56-S03',jsonb_build_object('repeatRefusedWithoutNewAudit',duplicate),
 'B56-S04',jsonb_build_object('revokedRejected',revoked,'expiredReminderStillOpen',(select acknowledged_at is null from public.operational_reminders where id=expired)))::text,true);
end;$b5$;select current_setting('b5.result')::jsonb;rollback;`);
const scenarios=JSON.parse(raw.split('\n').find(s=>s.startsWith('{')));
assert(Object.values(scenarios['B56-S01']).every(Boolean));assert.equal(scenarios['B56-S02'].accepted,true);assert.equal(scenarios['B56-S02'].externalRowSeenAtSet,true);assert.equal(scenarios['B56-S02'].oneAudit,true);assert.equal(scenarios['B56-S02'].ledgerRows,0);assert.equal(scenarios['B56-S03'].repeatRefusedWithoutNewAudit,true);assert(Object.values(scenarios['B56-S04']).every(Boolean));
const report={recordedAt:new Date().toISOString(),method:'Current SQL with synthetic official Auth phone; service context simulated; new rows rollback. No app opened, no Meta/SMS.',scenarios,externalCalls:0,rollback:true};
writeFileSync(new URL('b56-interaction-results.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(report);
