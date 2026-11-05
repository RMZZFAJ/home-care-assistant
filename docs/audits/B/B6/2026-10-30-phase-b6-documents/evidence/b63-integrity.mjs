/* Read-only aggregate checks; never exports pre-existing document bodies. */
import { writeFileSync } from 'node:fs';
import { getTestEnvironment,sql } from '../../../../scripts/test-environment.mjs';
getTestEnvironment();
const result=sql(`begin read only;
with chain as(select *,lag(content_hash) over(partition by document_id order by version) previous_hash,lag(version) over(partition by document_id order by version) previous_version from public.document_events)
select jsonb_build_object(
'events',count(*),'documents',count(distinct document_id),
'bodyHashMismatch',count(*) filter(where content_hash<>encode(extensions.digest(body::text,'sha256'),'hex')),
'chainMismatch',count(*) filter(where previous_hash is not null and body->>'previousHash' is distinct from previous_hash),
'nonAdjacentVersion',count(*) filter(where previous_version is not null and version<>previous_version+1),
'bodyVersionMismatch',count(*) filter(where body->>'version' is distinct from version::text),
'bodyIdentityMismatch',count(*) filter(where body->>'id' is distinct from document_id::text),
'actorNamePresent',count(*) filter(where actor_id is not null and nullif(actor_name,'') is not null),
'systemEvents',count(*) filter(where actor_id is null),'authoritySystem',count(*) filter(where authority_context->>'mode'='system'),
'headerMismatch',(select count(*) from public.operational_documents d join public.document_events e on e.document_id=d.id and e.version=d.version where d.content_hash is distinct from e.content_hash or d.canonical_snapshot is distinct from e.body),
'headersWithoutCurrentEvent',(select count(*) from public.operational_documents d where not exists(select 1 from public.document_events e where e.document_id=d.id and e.version=d.version))) from chain;
rollback;`);
const data=JSON.parse(result);
writeFileSync(new URL('b63-integrity-results.json',import.meta.url),JSON.stringify({recordedAt:new Date().toISOString(),method:'READ ONLY existing local aggregate;PostgreSQL jsonb::text SHA-256;no body/name exported;no corruption injected',scenario:'B63-R01',data},null,2)+'\n');console.log(data);
