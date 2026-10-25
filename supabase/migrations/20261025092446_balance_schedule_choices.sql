-- Configuration choices are authorized by BAL consultation; they do not grant
-- general schedule administration or access to another patient's agenda.
do $$declare v_def text;v_old text:='''obligations'',coalesce';begin
 v_def:=pg_get_functiondef('public.balance_workspace(uuid)'::regprocedure);
 if strpos(v_def,v_old)=0 then raise exception 'unexpected balance read model';end if;
 execute replace(v_def,v_old,
 '''types'',coalesce((select jsonb_agg(to_jsonb(t) order by t.starts_local,t.name) from public.shift_types t where t.care_recipient_id=p_patient),''[]''),
 ''professionals'',coalesce((select jsonb_agg(jsonb_build_object(''id'',p.id,''name'',p.full_name) order by p.full_name) from public.profiles p where private.schedule_worker(p_patient,p.id) and private.member_can(p_patient,p.id,''bal.count'')),''[]''),'||v_old);
end;$$;
