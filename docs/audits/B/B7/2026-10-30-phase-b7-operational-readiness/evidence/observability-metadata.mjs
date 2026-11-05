/* Only aggregate operational metadata. No patient/job/destination/provider IDs. */
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {getTestEnvironment,sql} from '../../../../scripts/test-environment.mjs';
assert.equal(process.versions.node,'24.22.0');getTestEnvironment();
const file='docs/audits/2026-10-30-phase-b7-operational-readiness/evidence/observability-metadata.sql';
const statement=readFileSync(file,'utf8');assert.match(statement,/^begin read only;/);
const local=JSON.parse(sql(statement));
const r=spawnSync(process.execPath,['scripts/supabase-project.mjs','db','query','--linked','--file',file,'--output-format','json'],{encoding:'utf8',windowsHide:true,maxBuffer:2000000,timeout:45000});
const remote=r.status===0?JSON.parse(r.stdout).rows[0].metadata:{status:'NOT_VERIFIED — REMOTE_ACCESS_REQUIRED',error:r.stderr.slice(-400)};
const result={recordedAt:new Date().toISOString(),method:'Read-only aggregate metadata; no network send, lease claim, job invocation or configuration change',local,remote,limits:'Cron success does not prove HTTP worker success or per-patient progress; existing local synthetic backlog is not a production incident. Snapshot has no alert delivery or operator-acknowledgement proof.'};
writeFileSync(new URL('observability-metadata.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
