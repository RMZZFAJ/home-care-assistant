/* Read-only local baseline. Never prints credentials or row contents. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { getTestEnvironment, sql } from '../../../../scripts/test-environment.mjs';
assert.equal(process.versions.node, '24.22.0');
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', windowsHide: true }).trim();
assert.equal(git('branch', '--show-current'), 'audit/phase-b');
assert.equal(git('rev-parse', 'HEAD'), 'a21cea055dc2ba858b261924ee6dd7781112b2bf');
getTestEnvironment();
const read = query => JSON.parse(sql(`begin read only; select coalesce(jsonb_agg(x),'[]') from (${query}) x; rollback;`));
const save = (name, value) => writeFileSync(new URL(name, import.meta.url), JSON.stringify(value, null, 2) + '\n');
const paths = git('ls-files').split('\n').filter(p => !p.startsWith('docs/') && p !== 'README.md');
const sources = paths.map(path => ({ path, sha256: createHash('sha256').update(readFileSync(path)).digest('hex') }));
const routines = read("select n.nspname schema,p.proname name,pg_get_function_identity_arguments(p.oid) signature,md5(pg_get_functiondef(p.oid)) definition_md5 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','private') and p.prokind in ('f','p') order by 1,2,3");
const prior = JSON.parse(readFileSync('docs/audits/2026-10-29-phase-b3-database/evidence/catalog.json','utf8')).routines;
const drift = routines.filter(r => !prior.some(p => p.schema === r.schema && p.name === r.name && p.signature === r.signature && createHash('md5').update(p.definition).digest('hex') === r.definition_md5));
assert.equal(drift.length, 0);
const isolation = read("select exists(select 1 from vault.secrets where name='hca_worker_url') worker_url_configured,exists(select 1 from vault.secrets where name='hca_worker_bearer') worker_bearer_configured,(select count(*) from net.http_request_queue) network_queue_count")[0];
assert.equal(isolation.worker_url_configured, false); assert.equal(isolation.worker_bearer_configured, false); assert.equal(Number(isolation.network_queue_count), 0);
const rows = {};
for (const {tablename} of read("select tablename from pg_tables where schemaname='public' order by 1")) {
  assert.match(tablename, /^[a-z_]+$/);
  rows[tablename] = read(`select md5(to_jsonb(t)::text) row_hash from public.${tablename} t order by 1`).map(r => r.row_hash);
}
const config = readFileSync('.env.local','utf8');
const envValue = name => config.match(new RegExp(`^${name}=(.*)$`, 'm'))?.[1]?.trim()?.replace(/^['"]|['"]$/g, '');
const order = readFileSync('C:/Users/renat/.codex/attachments/64886d17-a11a-466c-93f7-722058d83e31/pasted-text-1.txt');
const result = {
 recordedAt:new Date().toISOString(), clientDate:'2026-10-30', timezone:'America/Sao_Paulo', node:process.versions.node,
 branch:git('branch','--show-current'), head:git('rev-parse','HEAD'), master:git('rev-parse','master'), originPhaseB:git('rev-parse','origin/audit/phase-b'),
 initialTree:'clean before creating this package', functionalSha:'37cb7f85e96e551d6419871f94dd950712e2565b',
 functionalDiff:git('diff','--name-only','37cb7f85e96e551d6419871f94dd950712e2565b','HEAD','--','src','supabase','tests','scripts','package.json','package-lock.json','proxy.ts','next.config.ts'),
 protectedFiles:sources.length, routineCount:routines.length, routineDriftFromB3:drift, guardPassed:true,
 project:'home-care-assistant', api:'127.0.0.1:54321', database:'127.0.0.1:54322', container:'supabase_db_home-care-assistant', isolation,
 config:{localSupabase:envValue('NEXT_PUBLIC_SUPABASE_URL')==='http://127.0.0.1:54321',externalFlag:envValue('NOTIFICATIONS_EXTERNAL_ENABLED')??'absent',flowsFlag:envValue('META_FLOWS_ENABLED')??'absent'},
 jobs:read('select jobid,jobname,schedule,active,md5(command) command_md5 from cron.job order by 1'),
 orderSha256:createHash('sha256').update(order).digest('hex'),
 limits:'Local read-only guard and hashes. Existing cron remains active. No remote database or provider queried. Network in controlled probes will be replaced, not merely disabled by absent credentials.'
};
assert.equal(result.functionalDiff,''); assert.equal(result.config.localSupabase,true);
save('baseline.json',result); save('protected-source-hashes.json',sources); save('original-row-hashes.json',rows);
console.log(JSON.stringify(result,null,2));
