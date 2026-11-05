/* Read-only local Storage metadata reconciliation; no byte downloads/writes. */
import { writeFileSync } from 'node:fs';
import { getTestEnvironment,sql } from '../../../../scripts/test-environment.mjs';
getTestEnvironment();
const data=JSON.parse(sql(`begin read only;
select jsonb_build_object(
'renders',(select jsonb_build_object('records',count(*),'missingObjects',count(*) filter(where o.id is null)) from public.document_pdf_renders r left join storage.objects o on o.bucket_id='document-receipts' and o.name=r.object_path),
'legacy',(select count(*) from public.document_pdfs),
'attachments',(select jsonb_agg(x) from(select a.state,count(*) records,count(*) filter(where o.id is null) missing_objects from public.attachments a left join storage.objects o on o.bucket_id='patient-evidence' and o.name=a.object_path group by a.state order by a.state)x),
'unregisteredReceiptObjects',(select count(*) from storage.objects o where bucket_id='document-receipts' and not exists(select 1 from public.document_pdf_renders r where r.object_path=o.name) and not exists(select 1 from public.document_pdfs p where p.object_path=o.name)),
'unregisteredEvidenceObjects',(select count(*) from storage.objects o where bucket_id='patient-evidence' and not exists(select 1 from public.attachments a where a.object_path=o.name)));
rollback;`));
writeFileSync(new URL('b67-storage-results.json',import.meta.url),JSON.stringify({scenario:'B67-R02',recordedAt:new Date().toISOString(),method:'Local READ ONLY metadata;object existence not byte integrity;preexisting B3 fixtures included;no cleanup',data},null,2)+'\n');console.log(data);
