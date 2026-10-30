CREATE OR REPLACE FUNCTION public.v4_accept_invitation(p_token_hash text)
 RETURNS care_recipient_memberships
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare i public.care_recipient_invitations;result public.care_recipient_memberships;begin
 if not exists(select 1 from auth.sessions where id=nullif(auth.jwt()->>'session_id','')::uuid and user_id=auth.uid() and (not_after is null or not_after>now())) then raise exception 'active Auth session required' using errcode='42501';end if;
 select * into i from public.care_recipient_invitations where token_hash=p_token_hash;
 if not found then raise exception 'invalid invitation' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended('stock:'||i.care_recipient_id,0));
 select * into i from public.care_recipient_invitations where token_hash=p_token_hash for update;
 if not found or not exists(select 1 from auth.users where id=auth.uid() and lower(email)=i.email and email_confirmed_at is not null) then raise exception 'invalid invitation' using errcode='42501';end if;
 if i.status<>'accepted' and (i.status<>'pending' or i.expires_at<=now() or not exists(select 1 from public.care_recipient_memberships m join public.profiles p on p.id=m.user_id where m.care_recipient_id=i.care_recipient_id and m.user_id=i.invited_by and m.status='active' and m.role='admin' and p.status='active')) then raise exception 'invalid or expired invitation' using errcode='42501';end if;
 insert into private.membership_authority values(pg_backend_pid(),txid_current(),i.care_recipient_id,auth.uid(),i.role,i.role<>'reader' and i.can_manage_stock,i.role<>'reader' and i.can_count_stock) on conflict do nothing;
 result:=public.v3_accept_invitation(p_token_hash);
 delete from private.membership_authority where backend_pid=pg_backend_pid() and transaction_id=txid_current() and care_recipient_id=i.care_recipient_id and user_id=auth.uid();return result;
end;$function$
