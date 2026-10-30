/* Metadata-only operational security. No env retrieval, credential scan output or fixes. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,statSync} from 'node:fs';
import {spawnSync,execFileSync} from 'node:child_process';
import {join} from 'node:path';
assert.equal(process.versions.node,'24.22.0');
const lock=JSON.parse(readFileSync('package-lock.json','utf8'));
const pkg=JSON.parse(readFileSync('package.json','utf8'));
const packages=Object.entries(lock.packages).filter(([k])=>k);
const mismatch=Object.entries({...pkg.dependencies,...pkg.devDependencies}).filter(([name,v])=>lock.packages[`node_modules/${name}`]?.version!==v).map(([name])=>name);
const integrityMissing=packages.filter(([,p])=>p.resolved&&!p.integrity).map(([k])=>k);
const nonRegistry=packages.filter(([,p])=>p.resolved&&!p.resolved.startsWith('https://registry.npmjs.org/')).map(([k])=>k);
const audit=JSON.parse(readFileSync(new URL('dependency-audit.json',import.meta.url),'utf8'));
const advisories=Object.values(audit.vulnerabilities??{}).flatMap(v=>v.via.filter(x=>typeof x==='object')).map(a=>({source:a.source,name:a.name,title:a.title,url:a.url,severity:a.severity,range:a.range}));
const vulnerabilityNodes=Object.values(audit.vulnerabilities??{}).map(v=>({name:v.name,version:lock.packages[`node_modules/${v.name}`]?.version,devOnly:lock.packages[`node_modules/${v.name}`]?.dev===true,severity:v.severity}));
const workflow=readFileSync('.github/workflows/ci.yml','utf8');
const refs=[...new Map([...workflow.matchAll(/uses: ([\w/-]+)@([a-f0-9]{40})\s*#\s*(v[\d.]+)/g)].map(m=>[m[1],{repository:m[1],sha:m[2],tag:m[3]}])).values()];
const gh=path=>{const r=spawnSync('gh',['api',path],{encoding:'utf8',windowsHide:true,timeout:25000,maxBuffer:1000000});return r.status===0?{ok:true,data:JSON.parse(r.stdout)}:{ok:false,reason:r.stderr.slice(-180)};};
const who=gh('user');assert(who.ok&&who.data.login==='RMZZFAJ');
for(const ref of refs){let r=gh(`repos/${ref.repository}/git/ref/tags/${ref.tag}`);if(r.ok&&r.data.object.type==='tag')r=gh(`repos/${ref.repository}/git/tags/${r.data.object.sha}`);ref.tagMatches=r.ok?r.data.object.sha===ref.sha:null;ref.metadataRead=r.ok;}
const headers=[];
for(const url of ['https://home-care-assistant.vercel.app/login','https://home-care-assistant-8j9z02yc2-rmzzfajs-projects.vercel.app/login']){
 try {const r=await fetch(url,{method:'HEAD',redirect:'manual',signal:AbortSignal.timeout(15000)});const names=['cache-control','content-security-policy','content-security-policy-report-only','x-frame-options','x-content-type-options','referrer-policy','permissions-policy','strict-transport-security','server'];headers.push({url,method:'HEAD',status:r.status,headers:Object.fromEntries(names.map(n=>[n,r.headers.get(n)])),setCookiePresent:r.headers.has('set-cookie'),limits:'Anonymous public shell only; no cookies/HTML retained, no authenticated navigation or frame exploit.'});}
 catch{headers.push({url,status:'NOT_VERIFIED',reason:'Header request failed; no body retained'});}
}
const vercelCli=join(process.env.APPDATA,'npm/node_modules/vercel/dist/vc.js');
const drain=spawnSync(process.execPath,[vercelCli,'api','/v1/drains?teamId=team_X3JshR4ahuzIk95k6JMAYhq2&projectId=prj_GwdwNVay81iZ7ltM4Tg5IIXFLGPv','--method','GET','--scope','rmzzfajs-projects'],{encoding:'utf8',windowsHide:true,timeout:30000,maxBuffer:2000000,env:{...process.env,VERCEL_TELEMETRY_DISABLED:'1'}});
let drains={status:'NOT_VERIFIED — REMOTE_ACCESS_REQUIRED'};
if(drain.status===0){try{const d=JSON.parse(drain.stdout);const a=Array.isArray(d)?d:d.drains;drains={status:'READ_METADATA',count:a?.length??null,limits:'Only count retained; endpoints/credentials/log data not requested.'};}catch{/* An unreadable shape remains explicitly NOT_VERIFIED. */}}
const tracked=execFileSync('git',['ls-files'],{encoding:'utf8',windowsHide:true}).split('\n');
const result={recordedAt:new Date().toISOString(),auditFileModifiedAt:statSync(new URL('dependency-audit.json',import.meta.url)).mtime.toISOString(),lockfileVersion:lock.lockfileVersion,lockedPackages:packages.length,topLevelVersionMismatch:mismatch,missingIntegrity:integrityMissing,nonRegistryPackages:nonRegistry,installScriptPackages:packages.filter(([,p])=>p.hasInstallScript).map(([k,p])=>({package:k,dev:!!p.dev,optional:!!p.optional})),auditSummary:audit.metadata,vulnerabilityNodes,uniqueAdvisories:[...new Map(advisories.map(a=>[a.source,a])).values()],actionRefs:refs,headers,drains,trackedEnvPaths:tracked.filter(p=>/(^|\/)\.env/.test(p)),trackedPrivatePaths:tracked.filter(p=>p.startsWith('.private/')||p.startsWith('.venv/')||p.startsWith('supabase/.temp/')),limits:'Registry classification is not exploitability. re2js advisory requires opt-in LOOKBEHINDS plus repeated matching. Runtime auth/cookies not exercised; no dependency update/install, secret decryption or full history secret scan.'};
writeFileSync(new URL('security-metadata.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
