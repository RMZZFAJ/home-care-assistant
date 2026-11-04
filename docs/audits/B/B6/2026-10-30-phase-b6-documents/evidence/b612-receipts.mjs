/* Second-pass adversarial COM provenance. Real business RPCs, actual synthetic
 * Auth claims; new privileged patient/membership fixture; full SQL ROLLBACK. */
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { actors } from './local-actors.mjs';
import { sql,sqlLiteral as lit } from '../../../../scripts/test-environment.mjs';
const a=await actors();
const output=sql(`begin;
set local statement_timeout='25s';
select set_config('request.jwt.claims','{"role":"service_role"}',true) is not null;
do $b6$
declare p uuid:=gen_random_uuid();prod jsonb;d jsonb;v_document_id uuid;line_id uuid;r1 uuid;r2 uuid;v integer;pending_body jsonb;outcome jsonb;begin
 insert into public.profiles(id,full_name,role,status) values(${lit(a.issuer.id)},'Administrador fictício B6 receipts','professional','active'),(${lit(a.recipient.id)},'Familiar fictício B6 receipts','professional','active');
 insert into public.care_recipients(id,display_name,is_development) values(p,'Paciente fictício B6 receipts',true);
 insert into public.care_recipient_memberships(care_recipient_id,user_id,role) values(p,${lit(a.issuer.id)},'admin'),(p,${lit(a.recipient.id)},'family');
 perform set_config('request.jwt.claims',${lit(JSON.stringify(a.issuer.claims))},true);perform public.select_active_context(p);
 select to_jsonb(x) into prod from public.admin_upsert_recipient_product(p,null,'Material fictício B6 receipts','higiene','unidade','{}',true) x;
 d:=public.create_supply_document(p,'COM',jsonb_build_object('origin','purchase','lines',jsonb_build_array(jsonb_build_object('productId',prod->>'product_id','quantity','10'))),gen_random_uuid(),false);
 v_document_id:=(d->>'id')::uuid;line_id:=(d->'lines'->0->>'id')::uuid;
 d:=public.supply_document_command(v_document_id,'purchase',jsonb_build_object('lines',jsonb_build_array(jsonb_build_object('lineId',line_id,'quantity','3'))),gen_random_uuid(),(d->>'version')::integer);
 perform set_config('request.jwt.claims',${lit(JSON.stringify(a.recipient.claims))},true);perform public.select_active_context(p);
 d:=public.supply_document_command(v_document_id,'receive',jsonb_build_object('lines',jsonb_build_array(jsonb_build_object('lineId',line_id,'quantity','1'))),gen_random_uuid(),(d->>'version')::integer);
 select pr.id into r1 from public.purchase_receipts pr where document_id=v_document_id;
 d:=public.supply_document_command(v_document_id,'receive',jsonb_build_object('lines',jsonb_build_array(jsonb_build_object('lineId',line_id,'quantity','1'))),gen_random_uuid(),(d->>'version')::integer);
 select pr.id into r2 from public.purchase_receipts pr where document_id=v_document_id and pr.id<>r1;
 pending_body:=d->'canonical_snapshot';
 perform set_config('request.jwt.claims',${lit(JSON.stringify(a.issuer.claims))},true);perform public.select_active_context(p);
 d:=public.supply_document_command(v_document_id,'reject_receipt',jsonb_build_object('receiptId',r1,'reason','RESSALVA_REJEICAO_FICTICIA_B6'),gen_random_uuid(),(d->>'version')::integer);
 d:=public.supply_document_command(v_document_id,'validate_receipt',jsonb_build_object('receiptId',r2),gen_random_uuid(),(d->>'version')::integer);
 outcome:=jsonb_build_object('document',d,'pendingBody',pending_body,
 'twoIndependentReceipts',(select count(*)=2 from public.purchase_receipts where document_id=v_document_id),
 'pendingReceiptsNotInSnapshot',not(pending_body?'receipts'),
 'receiveEventsWithoutReceiptIdentity',(select count(*)=2 from public.document_events e where document_id=v_document_id and action='com.receive' and not(body->'event'?'receiptId')),
 'oneRejectedOneApproved',(select count(*) filter(where state='rejected')=1 and count(*) filter(where state='approved')=1 from public.purchase_receipts where document_id=v_document_id),
 'finalAccepted',(d->'lines'->0->>'accepted_quantity')::numeric,
 'rejectionReasonInHistoricalEvent',(select count(*)=1 from public.document_events where document_id=v_document_id and body->'event'->>'reason'='RESSALVA_REJEICAO_FICTICIA_B6'));
 perform set_config('b6.result',outcome::text,true);
end;$b6$;
select current_setting('b6.result')::jsonb;
rollback;`);
const data=JSON.parse(output.split('\n').find(s=>s.startsWith('{')));
assert(data.twoIndependentReceipts&&data.pendingReceiptsNotInSnapshot&&data.receiveEventsWithoutReceiptIdentity&&data.oneRejectedOneApproved&&data.rejectionReasonInHistoricalEvent);assert.equal(data.finalAccepted,1);
writeFileSync(new URL('b612-receipts-results.json',import.meta.url),JSON.stringify({scenario:'B612-S01',recordedAt:new Date().toISOString(),method:'Real COM create/purchase/receive/reject/validate RPC;synthetic local Auth;all new rows in rollback;no PDF rerender needed for unchanged projection',data},null,2)+'\n');
console.log(Object.fromEntries(Object.entries(data).filter(([,v])=>typeof v!=='object')));
