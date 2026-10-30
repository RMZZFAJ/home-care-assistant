/* READ ONLY source/database comparison; no repair, reset, or row payloads. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync,writeFileSync } from 'node:fs';
import { getTestEnvironment,sql } from '../../../../scripts/test-environment.mjs';
if(process.versions.node!=='24.22.0')throw new Error('Node version');getTestEnvironment();
const readFile=name=>JSON.parse(readFileSync(new URL(name,import.meta.url),'utf8'));
const original=readFile('original-row-hashes.json'),sources=readFile('protected-source-hashes.json'),baseline=readFile('baseline.json');
const sourceChanged=sources.filter(s=>createHash('sha256').update(readFileSync(s.path)).digest('hex')!==s.sha256);assert.equal(sourceChanged.length,0,'Protected source changed');
const git=(...a)=>execFileSync('git',a,{encoding:'utf8',windowsHide:true}).trim();assert.equal(git('branch','--show-current'),'audit/phase-b');assert.equal(git('rev-parse','master'),baseline.master);
const tables=[];
for(const [table,before] of Object.entries(original)){
 assert(/^[a-z_]+$/.test(table));const current=JSON.parse(sql(`begin read only;select coalesce(jsonb_agg(row_hash order by row_hash),'[]') from(select md5(to_jsonb(t)::text) row_hash from public.${table} t)x;rollback;`));
 const remaining=[...current];let missing=0;for(const hash of before){const at=remaining.indexOf(hash);if(at<0)missing++;else remaining.splice(at,1);}
 tables.push({table,originalRows:before.length,currentRows:current.length,originalHashesMissing:missing,newOrChangedHashes:remaining.length});
}
const prior=JSON.parse(readFileSync('docs/audits/2026-10-29-phase-b3-database/evidence/catalog.json','utf8')).routines;
const routines=JSON.parse(sql("begin read only;select jsonb_agg(x) from(select n.nspname schema,p.proname name,pg_get_function_identity_arguments(p.oid) signature,md5(pg_get_functiondef(p.oid)) definition_md5 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','private') and p.prokind in ('f','p'))x;rollback;"));
const drift=routines.filter(r=>!prior.some(p=>p.schema===r.schema&&p.name===r.name&&p.signature===r.signature&&createHash('md5').update(p.definition).digest('hex')===r.definition_md5));assert.equal(drift.length,0);
const result={recordedAt:new Date().toISOString(),protectedFiles:sources.length,protectedFilesChanged:sourceChanged,branch:git('branch','--show-current'),headBeforeDocumentCommit:git('rev-parse','HEAD'),master:git('rev-parse','master'),routinesCompared:routines.length,routineDrift:drift,tables,changedOriginalHashTables:tables.filter(t=>t.originalHashesMissing),limits:'Multiset hashes detect changed/deleted row representations,not their cause. New rows are synthetic B4;existing background cron remains active. Any original-hash difference needs separate interpretation before claiming preservation.'};
writeFileSync(new URL('preservation-results.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({...result,tables:undefined},null,2));
