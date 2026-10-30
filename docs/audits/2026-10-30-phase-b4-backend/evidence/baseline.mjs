/* READ ONLY. Local guard, hashes and metadata; no credentials or row payloads. */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { getTestEnvironment, sql } from '../../../../scripts/test-environment.mjs';
if (process.versions.node !== '24.22.0') throw new Error('Node 24.22.0 required');
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', windowsHide: true }).trim();
if (git('branch', '--show-current') !== 'audit/phase-b') throw new Error('Wrong branch');
getTestEnvironment();
const out = new URL('./', import.meta.url);
const json = (name, value) => writeFileSync(new URL(name, out), JSON.stringify(value, null, 2) + '\n');
const read = (query) => JSON.parse(sql(`begin read only; select coalesce(jsonb_agg(x),'[]') from (${query}) x; rollback;`));
const paths = git('ls-files').split('\n').filter(p => !p.startsWith('docs/') && p !== 'README.md');
const hashes = paths.map(path => ({ path, sha256: createHash('sha256').update(readFileSync(path)).digest('hex') }));
const tables = read("select tablename from pg_tables where schemaname='public' order by 1");
const rows = {};
for (const { tablename } of tables) {
  if (!/^[a-z_]+$/.test(tablename)) throw new Error('Unsafe table');
  rows[tablename] = read(`select md5(to_jsonb(t)::text) row_hash from public.${tablename} t order by 1`).map(r=>r.row_hash);
}
const routines = read("select n.nspname schema,p.proname name,pg_get_function_identity_arguments(p.oid) signature,md5(pg_get_functiondef(p.oid)) definition_md5 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','private') and p.prokind in ('f','p') order by 1,2,3");
const prior = JSON.parse(readFileSync('docs/audits/2026-10-29-phase-b3-database/evidence/catalog.json','utf8')).routines;
const drift = routines.filter(r=>!prior.some(p=>p.schema===r.schema && p.name===r.name && p.signature===r.signature && createHash('md5').update(p.definition).digest('hex')===r.definition_md5));
const isolation = read("select exists(select 1 from vault.secrets where name='hca_worker_url') worker_url_configured,exists(select 1 from vault.secrets where name='hca_worker_bearer') worker_bearer_configured,(select count(*) from net.http_request_queue) network_queue_count")[0];
if (isolation.worker_url_configured || isolation.worker_bearer_configured || Number(isolation.network_queue_count)!==0) throw new Error('External isolation not proven');
const baseline = { recordedAt: new Date().toISOString(), clientDate:'2026-10-30', timezone:'America/Sao_Paulo', node:process.versions.node, branch:git('branch','--show-current'), head:git('rev-parse','HEAD'), master:git('rev-parse','master'), originPhaseB:git('rev-parse','origin/audit/phase-b'), initialStatus:git('status','--porcelain'), functionalSha:'37cb7f85e96e551d6419871f94dd950712e2565b', functionalDiff:git('diff','--name-only','37cb7f85e96e551d6419871f94dd950712e2565b','HEAD','--','src','supabase','tests','scripts','package.json','package-lock.json','proxy.ts','next.config.ts'), protectedFiles:hashes.length, guardPassed:true, project:'home-care-assistant', api:'127.0.0.1:54321', database:'127.0.0.1:54322', container:'supabase_db_home-care-assistant', isolation, routineCount:routines.length, routineDriftFromB3:drift, buildId:readFileSync('.next/BUILD_ID','utf8').trim(), jobs:read('select jobid,jobname,schedule,active,md5(command) command_md5 from cron.job order by 1'), limits:'Local metadata and hashes only. Initial status includes this newly created B4 package. Remote not queried. No mutation.' };
json('baseline.json', baseline); json('protected-source-hashes.json', hashes); json('original-row-hashes.json',rows);
console.log(JSON.stringify(baseline,null,2));
