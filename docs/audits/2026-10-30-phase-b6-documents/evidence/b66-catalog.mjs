/* Reachability counterproof for PV09. New patient/catalog/COM only; ROLLBACK.
 * Business RPCs run with real local Auth claims after privileged fixture setup. */
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { actors } from './local-actors.mjs';
import { sql,sqlLiteral as lit } from '../../../../scripts/test-environment.mjs';
const a=(await actors()).issuer;
const output=sql(`begin;
set local statement_timeout='20s';
select set_config('request.jwt.claims','{"role":"service_role"}',true) is not null;
do $b6$
declare p uuid:=gen_random_uuid();product jsonb;d jsonb;n text:=repeat(E'M\n',77)||'FIM_B6';begin
 insert into public.profiles(id,full_name,role,status) values(${lit(a.id)},'Pessoa fictícia B6 catálogo','professional','active');
 insert into public.care_recipients(id,display_name,is_development) values(p,'Paciente fictício B6 catálogo',true);
 insert into public.care_recipient_memberships(care_recipient_id,user_id,role) values(p,${lit(a.id)},'admin');
 perform set_config('request.jwt.claims',${lit(JSON.stringify(a.claims))},true);
 perform public.select_active_context(p);
 select to_jsonb(x) into product from public.admin_upsert_recipient_product(p,null,n,'higiene','unidade','{}',true) x;
 d:=public.create_supply_document(p,'COM',jsonb_build_object('lines',jsonb_build_array(jsonb_build_object('productId',product->>'product_id','quantity','1'))),gen_random_uuid(),false);
 perform set_config('b6.result',jsonb_build_object('nameLength',length(n),'paragraphs',78,'storedNameExact',d->'lines'->0->>'name_snapshot'=n,'snapshotNameExact',d->'canonical_snapshot'->'lines'->0->>'name_snapshot'=n,'status',d->>'status','canonicalHashValid',(select content_hash=encode(extensions.digest(body::text,'sha256'),'hex') from public.document_events where document_id=(d->>'id')::uuid),'rollback',true)::text,true);
end;$b6$;
select current_setting('b6.result')::jsonb;
rollback;`);
const data=JSON.parse(output.split('\n').find(s=>s.startsWith('{')));
assert.equal(data.nameLength,160);assert(data.storedNameExact&&data.snapshotNameExact&&data.canonicalHashValid);
writeFileSync(new URL('b66-catalog-results.json',import.meta.url),JSON.stringify({recordedAt:new Date().toISOString(),scenario:'B66-S02',method:'Real catalog and COM RPC;real synthetic Auth claims;new privileged patient/membership fixture;rollback;not HTTP/UI',data},null,2)+'\n');console.log(data);
