-- A deferred assignment can exist before its window. Broadcast its transition
-- into availability once, without recording attendance or a physical count.
do $$declare v_def text;v_old text:='else exit;end if;';begin
 v_def:=pg_get_functiondef('private.process_bal_patient(uuid,timestamptz)'::regprocedure);
 if strpos(v_def,v_old)=0 then raise exception 'unexpected BAL assignment window branch';end if;
 execute replace(v_def,v_old,'else
 if v_a.starts_at<=p_now then perform private.bal_event(p_patient,v_c.id,v_a.id,''bal.cycle.available'',''Contagem disponível no período programado'',jsonb_build_object(''startsAt'',v_a.starts_at,''dueAt'',v_a.ends_at),''available:''||v_a.id);end if;
 exit;end if;');
end;$$;
