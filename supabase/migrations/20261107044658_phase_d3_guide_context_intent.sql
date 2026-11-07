-- A stale browser's progress must never be written into a newly selected scope.
alter function public.guide_progress_command(integer,integer,text,uuid) set schema private;
alter function private.guide_progress_command(integer,integer,text,uuid) rename to phase_d3_progress_command;
revoke all on function private.phase_d3_progress_command(integer,integer,text,uuid) from public,anon,authenticated,service_role;
create function public.guide_progress_command(p_scope text,p_expected integer,p_step integer,p_status text,p_key uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare c jsonb;result jsonb;begin
 c:=public.guide_context();
 if p_scope is null or p_scope is distinct from c->>'scope' then raise exception 'guide context changed' using errcode='PT409';end if;
 result:=private.phase_d3_progress_command(p_expected,p_step,p_status,p_key);
 c:=public.guide_context();
 if p_scope is distinct from c->>'scope' or p_scope is distinct from result->>'scope' then raise exception 'guide context changed' using errcode='PT409';end if;
 return result;
end;$$;
revoke all on function public.guide_progress_command(text,integer,integer,text,uuid) from public,anon,authenticated,service_role;
grant execute on function public.guide_progress_command(text,integer,integer,text,uuid) to authenticated;
