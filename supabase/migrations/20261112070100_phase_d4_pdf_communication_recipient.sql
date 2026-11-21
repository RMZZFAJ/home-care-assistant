-- Human recipient labels are already authorized by document_delivery_status;
-- destination, provider references and templates remain outside distributed sources.
do $$declare definition text;anchor text;begin
 definition:=pg_get_functiondef('private.freeze_pdf_expansion()'::regprocedure);
 anchor:='''group'',n.recipient_group,';
 if position(anchor in definition)=0 then raise exception 'PDF communication source drift';end if;
 execute replace(definition,anchor,anchor||'''recipientLabel'',n.recipient_label,');
end;$$;
