/* Audit B2: read-only metadata and guards. No Auth login, seed, reset or DDL. */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { getTestEnvironment, sql } from '../../../../scripts/test-environment.mjs';

if (process.versions.node !== '24.22.0') throw new Error('Node 24.22.0 required');
getTestEnvironment();
const out = new URL('./', import.meta.url);
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
if (git('branch', '--show-current') !== 'audit/phase-b') throw new Error('Wrong branch');
const names = process.argv.slice(2);
if (names.length) {
  mkdirSync(new URL('contracts/', out), { recursive: true });
  for (const name of names) {
    if (!/^[a-z_][a-z0-9_]*$/.test(name)) throw new Error('Invalid function name');
    const definition = sql(`select pg_get_functiondef(p.oid) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','private') and p.proname='${name}' order by n.nspname,p.oid;`);
    if (!definition) throw new Error(`Missing function ${name}`);
    writeFileSync(new URL(`contracts/${name}.sql`, out), definition + '\n');
    console.log(JSON.stringify({ name, lines: definition.split('\n').length, sha256: createHash('sha256').update(definition).digest('hex') }));
  }
} else {
  const data = JSON.parse(sql(`select json_build_object(
    'migrations',(select count(*) from supabase_migrations.schema_migrations),
    'publicTables',(select count(*) from pg_tables where schemaname='public'),
    'authUsers',(select count(*) from auth.users),
    'patients',(select count(*) from public.care_recipients),
    'documents',(select count(*) from public.operational_documents),
    'stockMovements',(select count(*) from public.stock_movements),
    'sessions',(select count(*) from auth.sessions),
    'database',current_database(),'serverVersion',current_setting('server_version'));`));
  const baseline = { recordedAt: new Date().toISOString(), clientDate: '2026-10-29', timezone: 'America/Sao_Paulo', node: process.versions.node, npm: execFileSync(process.execPath, ['C:/Users/renat/AppData/Roaming/npm/node_modules/npm/bin/npm-cli.js','--version'], { encoding: 'utf8' }).trim(), branch: git('branch','--show-current'), head: git('rev-parse','HEAD'), master: git('rev-parse','master'), productSha: '37cb7f85e96e551d6419871f94dd950712e2565b', productDiff: git('diff','--name-only','37cb7f85e96e551d6419871f94dd950712e2565b','HEAD','--','src','supabase','tests','scripts','package.json','package-lock.json'), project: 'home-care-assistant', databaseContainer: 'supabase_db_home-care-assistant', api: 'http://127.0.0.1:54321', db: '127.0.0.1:54322', guardPassed: true, mutation: false, data, limits: 'Aggregate metadata only; no identities or private row content exported; no production or human validation.' };
  writeFileSync(new URL('baseline.json', out), JSON.stringify(baseline, null, 2) + '\n');
  const paths = git('ls-files','src','supabase/migrations','tests','scripts','docs/ARCHITECTURE.md','docs/OPERATIONS.md','docs/DATABASE.md','docs/SECURITY.md','docs/API.md','docs/TESTING.md').split('\n');
  writeFileSync(new URL('source-hashes.json', out), JSON.stringify(paths.map(path => ({ path, sha256: createHash('sha256').update(readFileSync(path)).digest('hex') })), null, 2) + '\n');
  console.log(JSON.stringify(baseline, null, 2));
}
