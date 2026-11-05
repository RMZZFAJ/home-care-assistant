/* READ ONLY verification. Never restores, repairs, or outputs row contents.
 * Backup auth data is decoded only in memory to compare stable account fields. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync,spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {getTestEnvironment,sql,testContainer} from '../../../../scripts/test-environment.mjs';
assert.equal(process.versions.node,'24.22.0');getTestEnvironment();
const read=name=>JSON.parse(readFileSync(new URL(name,import.meta.url),'utf8'));
const git=(...args)=>execFileSync('git',args,{encoding:'utf8',windowsHide:true}).trim();
const baseline=read('baseline.json'),sources=read('protected-source-hashes.json'),original=read('original-row-hashes.json');
const changed=sources.filter(x=>createHash('sha256').update(readFileSync(x.path)).digest('hex')!==x.sha256);
assert.equal(changed.length,0);assert.equal(git('branch','--show-current'),'audit/phase-b');assert.equal(git('rev-parse','master'),baseline.master);
const tables=[];
const tableNames=Object.keys(original);for(const table of tableNames)assert.match(table,/^[a-z_]+$/);
const unions=tableNames.map(table=>`select '${table}' name,(select coalesce(jsonb_agg(h order by h),'[]') from(select md5(to_jsonb(t)::text) h from public.${table} t)y) hashes`).join(' union all ');
const allCurrent=JSON.parse(sql(`begin read only;select jsonb_object_agg(name,hashes) from(${unions})x;rollback;`));
for(const [table,before] of Object.entries(original)){
 const current=allCurrent[table];
 const remaining=[...current];let missing=0;for(const h of before){const at=remaining.indexOf(h);if(at<0)missing++;else remaining.splice(at,1);}
 tables.push({table,originalRows:before.length,currentRows:current.length,originalHashesMissing:missing,newOrChangedHashes:remaining.length});
}
const routines=JSON.parse(sql("begin read only;select jsonb_agg(x) from(select n.nspname schema,p.proname name,pg_get_function_identity_arguments(p.oid) signature,md5(pg_get_functiondef(p.oid)) md5 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in('public','private') and p.prokind in('f','p'))x;rollback;"));
const prior=JSON.parse(readFileSync('docs/audits/2026-10-29-phase-b3-database/evidence/catalog.json','utf8')).routines;
const drift=routines.filter(r=>!prior.some(p=>p.schema===r.schema&&p.name===r.name&&p.signature===r.signature&&createHash('md5').update(p.definition).digest('hex')===r.md5));assert.equal(drift.length,0);
const proof=read('backup-proof.json'),backupDir=join(process.env.LOCALAPPDATA,'home-care-assistant','backups');
const manifestFile=readdirSync(backupDir).filter(x=>x.endsWith('.dump.json')).find(x=>JSON.parse(readFileSync(join(backupDir,x),'utf8')).sha256===proof.sha256);assert(manifestFile,'Verified backup not found');
const archive=readFileSync(join(backupDir,manifestFile.slice(0,-5)));assert.equal(createHash('sha256').update(archive).digest('hex'),proof.sha256);
const decoded=spawnSync('docker',['exec','-i',testContainer,'sh','-c','archive=$(mktemp); cat > "$archive" && pg_restore --data-only --schema=auth --table=users --file=- "$archive"; result=$?; rm -f -- "$archive"; exit "$result"'],{input:archive,maxBuffer:16000000,windowsHide:true});assert.equal(decoded.status,0,'Auth backup decode failed; no SQL executed');
const text=decoded.stdout.toString();const match=text.match(/COPY auth\.users \(([^)]+)\) FROM stdin;\r?\n([\s\S]*?)\r?\n\\\./);assert(match,'Auth COPY section absent');
const cols=match[1].split(',').map(s=>s.trim().replaceAll('"',''));
const fields=['id','aud','role','email','encrypted_password','phone','email_confirmed_at','phone_confirmed_at','created_at','banned_until','deleted_at','is_super_admin','is_sso_user'];
const unescape=value=>value==='\\N'?null:value.replace(/\\([\\tnr])/g,(_,c)=>({'\\':'\\',t:'\t',n:'\n',r:'\r'}[c]));
const normalize=row=>Object.fromEntries(fields.map(k=>[k,row[k]===null||row[k]===undefined?null:k.endsWith('_at')||k==='banned_until'?new Date(row[k]).toISOString():['is_super_admin','is_sso_user'].includes(k)?(row[k]===true||row[k]==='t'||row[k]==='true'):row[k]]));
const hash=row=>createHash('sha256').update(JSON.stringify(normalize(row))).digest('hex');
const oldAuth=match[2].split(/\r?\n/).filter(Boolean).map(line=>Object.fromEntries(line.split('\t').map((v,i)=>[cols[i],unescape(v)])));
const currentAuth=JSON.parse(sql(`begin read only;select coalesce(jsonb_agg(x),'[]') from(select ${fields.join(',')} from auth.users)x;rollback;`));
const authChanged=oldAuth.filter(a=>!currentAuth.some(b=>b.id===a.id&&hash(b)===hash(a))).length;
assert.equal(authChanged,0,'Stable prior Auth account fields changed');
const isolation=JSON.parse(sql("begin read only;select jsonb_build_object('urlConfigured',exists(select 1 from vault.secrets where name='hca_worker_url'),'bearerConfigured',exists(select 1 from vault.secrets where name='hca_worker_bearer'),'queuedHttp',(select count(*) from net.http_request_queue));rollback;"));
assert.equal(isolation.urlConfigured,false);assert.equal(isolation.bearerConfigured,false);assert.equal(Number(isolation.queuedHttp),0);
const result={recordedAt:new Date().toISOString(),protectedFiles:sources.length,protectedFilesChanged:changed,branch:git('branch','--show-current'),headBeforeDocumentCommit:git('rev-parse','HEAD'),master:git('rev-parse','master'),routinesCompared:routines.length,routineDrift:drift,tables,originalHashChanges:tables.filter(x=>x.originalHashesMissing),auth:{originalAccountsCompared:oldAuth.length,stableFieldsChanged:authChanged,newAccounts:currentAuth.length-oldAuth.length,fieldsCompared:fields,limits:'Compared to verified pre-probe backup. Login/session timestamps intentionally excluded; no backup contents, account IDs or credential hashes written.'},isolation,limits:'Public-row multiset hashes expose changed/deleted representations, not cause. Existing cron remains active. New synthetic rows may remain. Any originalHashChanges requires investigation before claiming preservation.'};
writeFileSync(new URL('preservation-results.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({...result,tables:undefined},null,2));
