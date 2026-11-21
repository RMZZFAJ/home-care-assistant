-- The private issuance guard checks supplemental frozen facts, not document
-- authority itself. Verification details must use the complete live read gate.
do $l1$
declare definition text;anchor text:='perform private.require_pdf_issuance_access(r);';
begin
 definition:=pg_get_functiondef('public.pdf_verification_details(text,boolean)'::regprocedure);
 if position(anchor in definition)=0 then raise exception 'verification authority contract drift';end if;
 execute replace(definition,anchor,'perform public.pdf_issuance(r.id);');
end;$l1$;
notify pgrst,'reload schema';
