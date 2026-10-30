CREATE OR REPLACE FUNCTION public.normalize_local_capabilities()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$begin
  new.can_manage_stock:=new.role='admin' and coalesce(new.can_manage_stock,false);
  new.can_count_stock:=new.role in ('admin','supervisor','professional') and coalesce(new.can_count_stock,false);
  return new;
end;$function$
