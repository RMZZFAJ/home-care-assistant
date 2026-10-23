alter table public.flow_sessions add column purpose text not null default 'occurrence' check(purpose in ('occurrence','ent_receipt')),
 add column document_id uuid references public.operational_documents(id),add column document_version integer,
 add column verified_phone text,add column payload_state jsonb not null default '{}',add column review_ready boolean not null default false;
create trigger v4_workspace_invalidation after insert or update on public.flow_submissions for each row execute function private.invalidate_workspace();
create function public.create_receipt_flow_session(p_document uuid,p_hash text) returns uuid language plpgsql security definer set search_path='' as $$
declare d public.operational_documents;phone text;sid uuid;begin
 select * into d from public.operational_documents where id=p_document;
 perform private.require_cap(d.care_recipient_id,'ent.receive');
 if d.type<>'ENT' or d.status<>'pending_receipt' or d.recipient_id<>auth.uid() or not coalesce((select (settings->>'whatsappSimpleAcceptance')::boolean from public.patient_settings where care_recipient_id=d.care_recipient_id),false) then raise exception 'receipt flow authorization required' using errcode='42501';end if;
 select v.phone into phone from public.verified_phones v join auth.users u on u.id=v.user_id where v.user_id=auth.uid() and u.phone_confirmed_at is not null and '+'||ltrim(u.phone,'+')=v.phone;
 if phone is null or p_hash!~'^[a-f0-9]{64}$' then raise exception 'verified phone required' using errcode='42501';end if;
 insert into public.flow_sessions(care_recipient_id,user_id,token_hash,expires_at,purpose,document_id,document_version,verified_phone)
 values(d.care_recipient_id,auth.uid(),p_hash,now()+interval '10 minutes','ent_receipt',d.id,d.version,phone) returning id into sid;return sid;
end;$$;
alter function public.flow_exchange(text,jsonb) rename to v3_flow_exchange;
revoke all on function public.v3_flow_exchange(text,jsonb) from public,anon,authenticated,service_role;
create function public.flow_exchange(p_hash text,p_submit jsonb default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.flow_sessions;d public.operational_documents;l public.document_lines;q numeric;state jsonb;diffs jsonb;result jsonb;claims text;sub text;previous text;summary text;begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'verified Flow endpoint required' using errcode='42501';end if;
 select * into s from public.flow_sessions where token_hash=p_hash for update;
 if not found or s.expires_at<=now() then raise exception 'flow session expired' using errcode='42501';end if;
 if s.purpose='occurrence' then
 if p_submit is null then return public.v3_flow_exchange(p_hash,null)||jsonb_build_object('screen','REPORT_MODE','purpose','occurrence');end if;
 if p_submit->>'operation'='occurrence_mode' and p_submit->>'kind' in ('consumption','shortage') then
 update public.flow_sessions set payload_state=jsonb_build_object('kind',p_submit->>'kind') where id=s.id;
 return public.v3_flow_exchange(p_hash,null)||jsonb_build_object('screen','REPORT','kind',p_submit->>'kind','purpose','occurrence');end if;
 if p_submit->>'kind'='no_issues' then
 if not private.member_can(s.care_recipient_id,s.user_id,'consumption.report') or s.used_at is not null then raise exception 'flow session expired or revoked' using errcode='42501';end if;
 insert into public.flow_submissions(session_id,care_recipient_id,user_id,body,status) values(s.id,s.care_recipient_id,s.user_id,p_submit,'no_issues');
 update public.flow_sessions set used_at=now() where id=s.id;
 insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(s.user_id,'shift.no_issues','flow',s.id,jsonb_build_object('care_recipient_id',s.care_recipient_id,'stockChanged',false));
 return jsonb_build_object('purpose','occurrence','pendingConfirmation',false,'noIssues',true);end if;
 return public.v3_flow_exchange(p_hash,p_submit);end if;
 if not private.member_can(s.care_recipient_id,s.user_id,'ent.receive') then raise exception 'Flow recipient revoked' using errcode='42501';end if;
 if s.used_at is not null then
 if p_submit->>'operation'='confirm' then return s.payload_state->'result';end if;
 raise exception 'Flow token already used' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended('stock:'||s.care_recipient_id,0));
 select * into strict d from public.operational_documents where id=s.document_id for update;
 if d.recipient_id<>s.user_id or d.version<>s.document_version or d.status<>'pending_receipt'
 or not coalesce((select (settings->>'whatsappSimpleAcceptance')::boolean from public.patient_settings where care_recipient_id=d.care_recipient_id),false)
 or not exists(select 1 from public.verified_phones v join auth.users u on u.id=v.user_id where v.user_id=s.user_id and v.phone=s.verified_phone and '+'||ltrim(u.phone,'+')=v.phone and u.phone_confirmed_at is not null) then raise exception 'stale or unauthorized receipt Flow' using errcode='42501';end if;
 state:=s.payload_state;
 if p_submit->>'operation'='mode' and p_submit->>'mode'='all' then state:='{}';update public.flow_sessions set payload_state=state where id=s.id;end if;
 if p_submit->>'operation'='mode' and p_submit->>'mode' not in ('all','divergence') then raise exception 'invalid receipt mode';end if;
 if p_submit->>'operation'='line' then
 select * into l from public.document_lines where document_id=d.id and id=(p_submit->>'lineId')::uuid;
 q:=(p_submit->>'acceptedQuantity')::numeric;
 if not found or q is null or q<0 or q>l.quantity or q<>round(q,(select quantity_decimals from public.care_recipient_products where care_recipient_id=d.care_recipient_id and product_id=l.product_id)) or length(coalesce(p_submit->>'notes',''))>1000 then raise exception 'invalid Flow divergence';end if;
 state:=state||jsonb_build_object(l.id::text,jsonb_build_object('lineId',l.id,'acceptedQuantity',q::text,'notes',p_submit->>'notes'));
 update public.flow_sessions set payload_state=state where id=s.id;
 end if;
 select coalesce(jsonb_agg(value),'[]') into diffs from jsonb_each(state);
 select string_agg(l.name_snapshot||': expedido '||l.quantity::text||', aceito '||coalesce(state->l.id::text->>'acceptedQuantity',l.quantity::text),E'\n' order by l.name_snapshot) into summary from public.document_lines l where l.document_id=d.id;
 if p_submit->>'operation'='confirm' then
 if not s.review_ready then raise exception 'receipt review required';end if;
 insert into private.worker_authority values(pg_backend_pid(),txid_current(),s.user_id,s.care_recipient_id,'verified_whatsapp_flow_receipt');
 claims:=current_setting('request.jwt.claims',true);sub:=current_setting('request.jwt.claim.sub',true);previous:=current_setting('hca.verified_whatsapp_provider',true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',s.user_id,'role','authenticated')::text,true);perform set_config('request.jwt.claim.sub',s.user_id::text,true);
 perform set_config('hca.verified_whatsapp_provider','flow:'||s.id,true);
 result:=public.supply_document_command(d.id,'receive',jsonb_build_object('divergences',diffs),s.id,d.version);
 perform set_config('request.jwt.claims',coalesce(claims,''),true);perform set_config('request.jwt.claim.sub',coalesce(sub,''),true);perform set_config('hca.verified_whatsapp_provider',coalesce(previous,''),true);
 delete from private.worker_authority where backend_pid=pg_backend_pid() and transaction_id=txid_current();
 result:=jsonb_build_object('purpose','ent_receipt','accepted',true,'documentId',d.id,'status',result->>'status');
 update public.flow_sessions set used_at=now(),payload_state=jsonb_build_object('result',result) where id=s.id;
 insert into public.flow_submissions(session_id,care_recipient_id,user_id,body,status) values(s.id,s.care_recipient_id,s.user_id,jsonb_build_object('divergences',diffs),'accepted');
 return result;
 end if;
 if p_submit->>'operation'='mode' and p_submit->>'mode'='all' or p_submit->>'operation'='line' and p_submit->>'next'='review' then update public.flow_sessions set review_ready=true where id=s.id;
 elsif p_submit is not null then update public.flow_sessions set review_ready=false where id=s.id;end if;
 return jsonb_build_object('purpose','ent_receipt','screen',case when p_submit is null then 'RECEIPT_MODE' when p_submit->>'operation'='mode' and p_submit->>'mode'='divergence' or p_submit->>'operation'='line' and p_submit->>'next'='another' then 'RECEIPT_LINE' else 'RECEIPT_REVIEW' end,
 'documentCode',d.code,'reviewText',summary,
 'lines',(select jsonb_agg(jsonb_build_object('id',l.id,'title',l.name_snapshot||' - expedido '||l.quantity::text||' '||l.unit_snapshot) order by l.name_snapshot) from public.document_lines l where document_id=d.id));
end;$$;
grant execute on function public.flow_exchange(text,jsonb) to service_role;
grant execute on function public.create_receipt_flow_session(uuid,text) to authenticated;
