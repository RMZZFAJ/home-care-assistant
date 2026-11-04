/* Targeted READ ONLY follow-up to the single null authority aggregate. */
import { writeFileSync } from 'node:fs';
import { getTestEnvironment,sql } from '../../../../scripts/test-environment.mjs';
getTestEnvironment();
const data=JSON.parse(sql(`begin read only;
select coalesce(jsonb_agg(x),'[]') from(select action,body->>'schemaVersion' schema_version,authority_context is null authority_null,body?'authority' body_has_authority,count(*) records from public.document_events where actor_id is null and authority_context->>'mode' is distinct from 'system' group by 1,2,3,4)x;
rollback;`));
writeFileSync(new URL('b612-legacy-context-results.json',import.meta.url),JSON.stringify({scenario:'B612-R02',method:'Targeted read-only aggregate,no ID/name/body exported;not routine execution proof',data},null,2)+'\n');console.log(data);
