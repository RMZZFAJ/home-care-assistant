/* Catalogs only, with BEGIN READ ONLY, local guard and pinned remote wrapper. */
import assert from 'node:assert/strict';
import {execFileSync,spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {getTestEnvironment,sql} from '../../../../scripts/test-environment.mjs';
assert.equal(process.versions.node,'24.22.0');getTestEnvironment();
const file='docs/audits/2026-10-30-phase-b7-operational-readiness/evidence/schema-metadata.sql';
const statement=readFileSync(file,'utf8');
assert.match(statement,/^begin read only;/);assert(!/\b(insert|update|delete|create|drop|alter|truncate|grant|revoke)\b/i.test(statement));
const local=JSON.parse(sql(statement));
const r=spawnSync(process.execPath,['scripts/supabase-project.mjs','db','query','--linked','--file',file,'--output-format','json'],{encoding:'utf8',windowsHide:true,timeout:45000,maxBuffer:4000000});
const remote=r.status===0?JSON.parse(r.stdout).rows[0].metadata:{status:'NOT_VERIFIED — REMOTE_ACCESS_REQUIRED',error:r.stderr.slice(-400)};
const historical=JSON.parse(readFileSync('scripts/historical-migrations.json','utf8'));
const historicalDrift=Object.entries(historical).filter(([p,h])=>createHash('sha256').update(readFileSync(p,'utf8').replaceAll('\r\n','\n')).digest('hex')!==h).map(([p])=>p);
const migrations=readdirSync('supabase/migrations').filter(p=>p.endsWith('.sql')).sort();
const versions=migrations.map(p=>p.split('_')[0]);
const git=execFileSync('git',['diff','--name-only','37cb7f85e96e551d6419871f94dd950712e2565b','HEAD','--','supabase/migrations'],{encoding:'utf8',windowsHide:true}).trim();
const result={recordedAt:new Date().toISOString(),method:'Catalogs and normalized history hashes only; no data payload or migration executed',historicalProtected:Object.keys(historical).length,historicalDrift,migrationFiles:migrations.length,duplicateVersions:versions.filter((v,i)=>versions.indexOf(v)!==i),functionalMigrationDiff:git,local,remote,comparison:remote.routines?{migrationVersionsEqual:JSON.stringify(local.migrations.versions)===JSON.stringify(remote.migrations.versions),localMissingFiles:versions.filter(v=>!local.migrations.versions.includes(v)),remoteMissingFiles:versions.filter(v=>!remote.migrations.versions.includes(v)),routineDrift:local.routines.filter(l=>!remote.routines.some(x=>l.schema===x.schema&&l.name===x.name&&l.signature===x.signature&&l.definition_md5===x.definition_md5)),remoteExtraRoutines:remote.routines.filter(x=>!local.routines.some(l=>l.schema===x.schema&&l.name===x.name&&l.signature===x.signature)),limits:'Routine equality and migration versions do not certify all tables, data, Auth config, Storage bytes or rollout compatibility.'}:null};
writeFileSync(new URL('schema-metadata.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
if(remote.routines){result.comparison.rawRoutineDriftCount=result.comparison.routineDrift.length;result.comparison.routineDrift=local.routines.filter(l=>!remote.routines.some(x=>l.schema===x.schema&&l.name===x.name&&l.signature===x.signature&&l.normalized_md5===x.normalized_md5));}
writeFileSync(new URL('schema-metadata.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({recordedAt:result.recordedAt,historicalProtected:result.historicalProtected,historicalDrift,migrationFiles:migrations.length,local:{version:local.database_version,routines:local.routines.length,migrations:local.migrations.count},remote:remote.routines?{version:remote.database_version,routines:remote.routines.length,migrations:remote.migrations.count}:remote,comparison:result.comparison},null,2));
