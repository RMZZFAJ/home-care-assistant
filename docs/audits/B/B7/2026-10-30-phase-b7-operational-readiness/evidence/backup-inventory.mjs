/* Existing backups only. Hash/header/TOC inspection; never executes archived SQL. */
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {getTestEnvironment,testContainer} from '../../../../scripts/test-environment.mjs';
assert.equal(process.versions.node,'24.22.0');getTestEnvironment();
const dir=join(process.env.LOCALAPPDATA,'home-care-assistant/backups');
const hash=b=>createHash('sha256').update(b).digest('hex');
const files=readdirSync(dir);
const archives=files.filter(f=>f.endsWith('.dump.json')).map(name=>{
 const m=JSON.parse(readFileSync(join(dir,name),'utf8'));const file=name.slice(0,-5);const bytes=readFileSync(join(dir,file));
 return {name:file,createdAt:m.createdAt,projectId:m.projectId,container:m.container,bytes:bytes.length,sha256:hash(bytes),manifestShaMatches:hash(bytes)===m.sha256,customHeader:bytes.subarray(0,5).toString()==='PGDMP',format:m.format,archiveListPreviouslyVerified:m.archiveListVerified};
}).sort((a,b)=>a.createdAt.localeCompare(b.createdAt));
const latest=archives.at(-1);assert(latest.manifestShaMatches&&latest.customHeader);
const toc=spawnSync('docker',['exec','-i',testContainer,'sh','-c','archive=$(mktemp); cat > "$archive" && pg_restore --list "$archive"; result=$?; rm -f -- "$archive"; exit "$result"'],{input:readFileSync(join(dir,latest.name)),windowsHide:true,maxBuffer:4000000,timeout:30000});
assert.equal(toc.status,0,'Archive TOC unreadable; no SQL executed');
const lines=toc.stdout.toString().split(/\r?\n/);
const tableData=lines.filter(l=>/ TABLE DATA /.test(l)).map(l=>l.match(/ TABLE DATA (\S+) (\S+) /)?.slice(1).join('.')).filter(Boolean).sort();
const remoteManifests=['remote-bal-review-20261025-manifest.json','remote-claims-20261025-manifest.json'].map(name=>{
 const m=JSON.parse(readFileSync(join(dir,name),'utf8'));
 return {name,projectRef:m.projectRef??'not recorded',verifiedAt:m.verifiedAt??null,fullRestoreTested:m.fullRestoreTested??'not recorded',files:m.files.map(f=>{
   assert(/^[a-zA-Z0-9_.-]+$/.test(f.name));const bytes=readFileSync(join(dir,f.name));
   const copyHeaders=[...bytes.toString('utf8').matchAll(/^COPY "?([a-z_][a-z_0-9]*)"?\."?([a-z_][a-z_0-9]*)"?\s*\(/gm)].map(x=>`${x[1]}.${x[2]}`).sort();
   return {name:f.name,bytes:bytes.length,sha256:hash(bytes),manifestShaMatches:hash(bytes)===f.sha256,copyTables:copyHeaders};
 })};
});
const remote=spawnSync(process.execPath,['scripts/supabase-project.mjs','backups','list','--output-format','json'],{encoding:'utf8',windowsHide:true,maxBuffer:2000000,timeout:45000});
let managedBackupMetadata;
if(remote.status===0){try{const d=JSON.parse(remote.stdout);managedBackupMetadata={ok:true,keys:Object.keys(d),pitrEnabled:d.pitr_enabled,region:d.region,physicalBackupData:d.physical_backup_data?{earliest:d.physical_backup_data.earliest_physical_backup_date,latest:d.physical_backup_data.latest_physical_backup_date}:undefined,backups:Array.isArray(d)?d.map(b=>({status:b.status,insertedAt:b.inserted_at,isPhysical:b.is_physical})):d.backups?.map(b=>({status:b.status,insertedAt:b.inserted_at,isPhysical:b.is_physical}))};}catch{managedBackupMetadata={ok:false,status:'NOT_VERIFIED — REMOTE_ACCESS_REQUIRED',reason:'JSON metadata shape unavailable; no raw response retained'};}}
else managedBackupMetadata={ok:false,status:'NOT_VERIFIED — REMOTE_ACCESS_REQUIRED',reason:remote.stderr.slice(-350)};
const result={recordedAt:new Date().toISOString(),method:'SHA256, PGDMP header and pg_restore --list only; SQL archives read only for COPY headers; no dump or row content copied',localArchives:archives,unmanifestedArchives:files.filter(f=>f.endsWith('.dump')&&!files.includes(`${f}.json`)),latestToc:{archive:latest.name,entries:lines.filter(l=>/^\d+;/.test(l)).length,tableData,includesStorageBytes:false,includesClusterGlobals:false,restoreExecuted:false},remoteManifests,managedBackupMetadata,limits:'Local backup objects do not prove provider retention, offsite isolation, encryption-at-rest policy, keys or full restore. Database archive can include encrypted Vault rows without the decryption key.'};
writeFileSync(new URL('backup-inventory.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({localArchives:archives.length,allHashesValid:archives.every(x=>x.manifestShaMatches),unmanifestedArchives:result.unmanifestedArchives,latest:latest.name,tocEntries:result.latestToc.entries,tableDataCount:tableData.length,authTables:tableData.filter(x=>x.startsWith('auth.')),cronTables:tableData.filter(x=>x.startsWith('cron.')),vaultTables:tableData.filter(x=>x.startsWith('vault.')),remoteManifests:remoteManifests.map(x=>({name:x.name,valid:x.files.every(f=>f.manifestShaMatches),copyTableCount:x.files.flatMap(f=>f.copyTables).length})),managedBackupMetadata},null,2));
