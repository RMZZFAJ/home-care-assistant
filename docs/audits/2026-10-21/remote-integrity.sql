begin read only;
select jsonb_build_object(
  'migrations',(select count(*) from supabase_migrations.schema_migrations),
  'products',(select count(*) from public.products),
  'patients',(select count(*) from public.care_recipients),
  'profiles',(select count(*) from public.profiles),
  'requests',(select count(*) from public.requisitions),
  'items',(select count(*) from public.requisition_items),
  'movements',(select count(*) from public.stock_movements),
  'global_admins',(select count(*) from public.profiles where role='admin' and status='active' and global_scope),
  'request_integrity',(select md5(coalesce(string_agg(jsonb_build_array(id,protocol,created_by,care_recipient_id,status,created_at)::text,'' order by id),'')) from public.requisitions),
  'item_integrity',(select md5(coalesce(string_agg(jsonb_build_array(id,requisition_id,product_id,custom_name,current_stock,urgent)::text,'' order by id),'')) from public.requisition_items),
  'movement_integrity',(select md5(coalesce(string_agg(jsonb_build_array(id,product_id,quantity,movement_type,care_recipient_id,source_location,destination_location)::text,'' order by id),'')) from public.stock_movements)
) as integrity;
commit;
