-- Effective capabilities reflect the non-delegable boundaries shown by the UI.
-- Global status never replaces the active local membership checked here.
do $$declare v_def text;v_old text:='if p_capability=''access.manage'' then';begin
 v_def:=pg_get_functiondef('private.member_can(uuid,uuid,text)'::regprocedure);
 if strpos(v_def,v_old)=0 then raise exception 'unexpected member authority function';end if;
 execute replace(v_def,v_old,
 'if p_capability in (''bal.defer.approve'',''bal.schedule.manage'',''bal.approve.family'') and r not in (''admin'',''family'') then return false;end if;
 if p_capability=''bal.count'' and r not in (''professional'',''supervisor'') and exists(select 1 from public.bal_regimes where care_recipient_id=p_patient and activated_at is not null) then return false;end if;
 '||v_old);
end;$$;
