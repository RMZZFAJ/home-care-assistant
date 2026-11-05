/* Documentary validator only. Never executes functional probes or writes DB.
 * Validates current artifact counts, evidence, secrets, syntax and own Markdown. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,readdirSync,existsSync,statSync} from 'node:fs';
import {resolve,relative,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync,spawnSync} from 'node:child_process';
assert.equal(process.versions.node,'24.22.0');
const root=fileURLToPath(new URL('../',import.meta.url)),workspace=process.cwd();
const read=name=>JSON.parse(readFileSync(join(root,name),'utf8'));
const list=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?list(join(dir,e.name)):[join(dir,e.name)]);
const files=list(root),md=files.filter(p=>p.endsWith('.md'));
const required=['README.md','CHECKPOINT.md','00_BASELINE_SCOPE_AND_METHOD.md','01_AUTOMATIONS_AND_INTEGRATIONS_INVENTORY.csv','01_INTEGRATION_DEPENDENCY_MAP.md','02_SCHEDULERS_CRON_AND_PROGRESS.md','03_OUTBOX_WORKERS_LEASES_AND_RETRIES.md','04_WHATSAPP_OUTBOUND_TEMPLATES_AND_MEDIA.md','04_EVENT_TEMPLATE_MATRIX.csv','05_WEBHOOKS_CALLBACKS_AND_INBOUND_MESSAGES.md','06_INTERACTIVE_RESPONSES_SCIENCE_AND_CONFIRMATIONS.md','07_WHATSAPP_FLOWS_SECURITY_AND_CONTRACTS.md','08_INTERNAL_NOTIFICATIONS_REALTIME_AND_FRESHNESS.md','09_AUTH_EMAIL_SMS_OAUTH_BOUNDARIES.md','10_FAILURE_RECOVERY_AND_ADVERSARIAL_SCENARIOS.md','11_PRIVACY_OBSERVABILITY_AND_CAPACITY.md','12_HUMAN_CONTINUITY_AND_CROSS_PROCESS_REVIEW.md','13_NEW_GAPS_AND_INTEGRATION_OPPORTUNITIES.md','14_FINDINGS_MASTER.csv','14_FINDINGS_MASTER.md','15_ACCEPTANCE_AND_REGRESSION_CRITERIA.md','16_CROSS_GROUP_DEPENDENCIES.md','17_GROUP_B5_EXECUTIVE_ASSESSMENT.md','18_PHASE_C_DECISION_HANDOFF.md'];
for(const name of required)assert(existsSync(join(root,name))&&statSync(join(root,name)).size>0,name);
function csv(path){
 const text=readFileSync(path,'utf8').replace(/^\uFEFF/,'');const data=[];let row=[],value='',quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){value+='"';i++;}else quoted=!quoted;}else if(!quoted&&(c===','||c==='\n')){row.push(value);value='';if(c==='\n'){if(row.some(Boolean))data.push(row);row=[];}}else if(c!=='\r')value+=c;}
 assert(!quoted,'CSV quote mismatch');if(value||row.length){row.push(value);data.push(row);}const fields=data.shift();assert(fields&&new Set(fields).size===fields.length);for(const r of data)assert.equal(r.length,fields.length,'CSV columns');return {fields,rows:data.map(r=>Object.fromEntries(fields.map((f,i)=>[f,r[i]])))};
}
const inventory=csv(join(root,required[3])),matrix=csv(join(root,required[8])),findings=csv(join(root,'14_FINDINGS_MASTER.csv')),scenarios=csv(join(root,'evidence/SCENARIOS.csv')),prior=csv(join(root,'evidence/PRIOR_PROOFS.csv'));
assert.equal(inventory.rows.length,32);assert.equal(inventory.fields.length,24);assert.equal(matrix.rows.length,34);assert.equal(findings.rows.length,14);assert.equal(findings.fields.length,31);assert.equal(scenarios.rows.length,44);assert.equal(prior.rows.length,11);
const parameters=csv(join(root,'evidence/TEMPLATE_PARAMETERS.csv'));
assert.equal(matrix.fields.length,14);assert.equal(parameters.rows.length,34);
const usedParameters=[...new Set(matrix.rows.flatMap(r=>r.parameters.split(';')))].sort();
assert.deepEqual(parameters.rows.map(r=>r.parameter).sort(),usedParameters);
assert(matrix.rows.every(r=>['target_policy','expected_communication','semantic_caveats','values_source'].every(k=>r[k]?.trim())));
for(const dataset of [inventory,findings,scenarios]){assert.equal(new Set(dataset.rows.map(r=>r.id)).size,dataset.rows.length);assert(dataset.rows.every(r=>Object.values(r).every(v=>v.trim())));}
assert.equal(findings.rows.filter(r=>r.priority==='P2').length,12);assert.equal(findings.rows.filter(r=>r.priority==='P3').length,2);
const methods=Object.fromEntries(['ADAPTADOR_CONTROLADO','SQL_LOCAL_ROLLBACK','NAVEGADOR_LOCAL_AUTH_RPC_READBACK'].map(m=>[m,scenarios.rows.filter(r=>r.method===m).length]));assert.deepEqual(Object.values(methods),[22,20,2]);assert.equal(scenarios.rows.filter(r=>r.result==='HIPOTESE_REFUTADA').length,1);
let evidenceReferences=0;
for(const r of findings.rows){
 assert(readFileSync(join(root,'14_FINDINGS_MASTER.md'),'utf8').includes(r.id));assert(readFileSync(join(root,'15_ACCEPTANCE_AND_REGRESSION_CRITERIA.md'),'utf8').includes(r.id));
 for(const item of r.evidence.split(';')){const [name,fragment]=item.trim().split('#');const path=existsSync(join(root,name))?join(root,name):resolve(workspace,name);assert(existsSync(path),'Evidence missing: '+name);if(fragment)assert(readFileSync(path,'utf8').includes(fragment),'Evidence ID absent: '+fragment);evidenceReferences++;}
}
for(const r of scenarios.rows){const [name,fragment]=r.evidence.split('#');assert(existsSync(join(root,name)));if(fragment)assert(readFileSync(join(root,name),'utf8').includes(fragment));}
for(const r of prior.rows){const path=resolve(root,r.path);assert(existsSync(path));assert.equal(createHash('sha256').update(readFileSync(path)).digest('hex'),r.sha256,'Prior proof changed');}
let links=0;const deferred=new Set(['evidence/MANIFEST.json','evidence/package-validation.json']);
for(const path of md){const content=readFileSync(path,'utf8');for(const match of content.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)){const href=match[1].replace(/^<|>$/g,'').split('#')[0];if(!href||/^https?:|^mailto:/.test(href))continue;assert(existsSync(resolve(path,'..',href))||deferred.has(href),'Broken link '+relative(root,path)+' → '+href);links++;}}
const credentials=[];
if(existsSync('.env.local'))for(const line of readFileSync('.env.local','utf8').split(/\r?\n/)){const m=line.match(/^([A-Z0-9_]+)=(.*)$/);if(m&&/SECRET|TOKEN|SERVICE_ROLE|PRIVATE_KEY|PASSWORD/.test(m[1])){const v=m[2].trim().replace(/^['"]|['"]$/g,'');if(v.length>16&&!/^env\(|EXAMPLE|YOUR_|false/.test(v))credentials.push(v);}}
const localData=process.env.LOCALAPPDATA;
for(const suffix of ['audit-b3/local-state.json','audit-b4/local-state.json','audit-b5/synthetic-actor.json']){const p=join(localData,'home-care-assistant',suffix);if(existsSync(p)){const data=JSON.parse(readFileSync(p,'utf8'));const walk=x=>{if(x&&typeof x==='object')for(const [k,v] of Object.entries(x)){if(/password|access_token|refresh_token/i.test(k)&&typeof v==='string'&&v.length>10)credentials.push(v);else if(typeof v==='object')walk(v);}};walk(data);}}
const secretHits=[];
for(const path of files){if(/MANIFEST\.json|package-validation\.json$/.test(path))continue;const content=readFileSync(path,'utf8');const kind=[];if(/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/.test(content))kind.push('JWT');if(/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----[\r\n]/.test(content))kind.push('private key');if(/[?&](?:access_token|token|sig|apikey)=[A-Za-z0-9_.-]{16,}/i.test(content))kind.push('active credential URL');if(credentials.some(v=>content.includes(v)))kind.push('known private credential');for(const phone of content.match(/\+[1-9]\d{7,14}\b/g)??[])if(!phone.startsWith('+1555'))kind.push('non-synthetic phone');if(kind.length)secretHits.push({path:relative(root,path),kinds:[...new Set(kind)]});}
assert.equal(secretHits.length,0,'Credential scan failed; values intentionally not printed');
const protectedFiles=read('evidence/protected-source-hashes.json');for(const r of protectedFiles)assert.equal(createHash('sha256').update(readFileSync(r.path)).digest('hex'),r.sha256,'Protected source changed');
const preservation=read('evidence/preservation-results.json'),background=read('evidence/background-progress-results.json'),topology=read('evidence/active-topology.json');assert.equal(preservation.protectedFilesChanged.length,0);assert.equal(preservation.routineDrift.length,0);assert.equal(preservation.auth.stableFieldsChanged,0);assert.equal(preservation.originalHashChanges.length,2);assert.equal(background.results.length,1);assert(background.results.every(r=>r.hashChainValid&&r.systemActor&&r.nextReminderMatchesPolicy));assert.equal(topology.sqlSupportMissing.length,0);
const git=(...args)=>execFileSync('git',args,{encoding:'utf8',windowsHide:true}).trim();assert.equal(git('branch','--show-current'),'audit/phase-b');assert.equal(git('rev-parse','master'),read('evidence/baseline.json').master);
const checks=[];
const run=(name,args)=>{const r=spawnSync(process.execPath,args,{encoding:'utf8',windowsHide:true,maxBuffer:2000000});checks.push({name,args,exitCode:r.status,output:(r.stdout+r.stderr).trim()});assert.equal(r.status,0,name+' failed');};
for(const p of files.filter(p=>/\.(mjs|js)$/.test(p)))run('syntax '+relative(root,p),['--check',p]);
run('Markdown B5 and phase-B index',['node_modules/markdownlint-cli2/markdownlint-cli2-bin.mjs','docs/audits/2026-10-30-phase-b5-integrations/**/*.md','docs/audits/phase-b/README.md']);
run('ESLint affected final auxiliaries',['node_modules/eslint/bin/eslint.js','docs/audits/2026-10-30-phase-b5-integrations/evidence/preservation.mjs','docs/audits/2026-10-30-phase-b5-integrations/evidence/background-progress.mjs','docs/audits/2026-10-30-phase-b5-integrations/evidence/validate-package.mjs']);
let controlledPassed=0;for(const name of ['b53-provider-results.json','b54-content-results.json','b55-webhook-results.json','b57-endpoint-results.json','b59-phone-results.json']){const report=read('evidence/'+name);assert.equal(report.numFailedTests,0);controlledPassed+=report.numPassedTests;}assert.equal(controlledPassed,22);
const server=read('evidence/local-server.json');assert(server.stoppedAt,'Own server still running');
const report={recordedAt:new Date().toISOString(),status:'PASS',node:process.versions.node,clientDate:'2026-10-30',requiredDeliverables:required.length,inventoryMechanisms:32,inventoryFields:24,externalEvents:25,eventVariants:34,templateParametersReviewed:34,findings:14,findingFields:31,priorProofs:11,scenarios:44,methods,refutedHypotheses:1,controlledTestsPassed:22,linksChecked:links,evidenceReferencesChecked:evidenceReferences,credentialMatches:0,protectedFilesUnchanged:protectedFiles.length,sqlFunctionsUnchanged:232,publicData:'60 tables preserve all original hashes;1 document/lifecycle advanced by system reminder with stable fields and hash chain reconciled',authAccountsStable:77,authFieldsCompared:13,checks,previousAuxiliaryChecks:{typecheck:{exitCode:0,command:'Node24.22.0 node_modules/typescript/bin/tsc --noEmit --project evidence/tsconfig.audit.json',scope:'New audit TS/imports only; passed after type-only annotation, no runtime test rerun'},eslintAllInstruments:{exitCode:0,scope:'All audit js/mjs/ts passed before final preservation helpers; affected final helpers checked above'}},ownServerStopped:true,externalEffects:{realMessages:false,providerConfigMutations:false,remoteDatabaseMutations:false,deployCommand:false,pr:false,merge:false,provenance:'Session actions;not a remote-state audit. Authorized Git push is separate.'},limits:'No global build/typecheck/unit/E2E/migration replay. No provider/human/physical acceptance. Manifest excludes itself, includes this report, and is written after validation.'};
writeFileSync(join(root,'evidence/package-validation.json'),JSON.stringify(report,null,2)+'\n');
const manifestFiles=list(root).filter(p=>!p.endsWith('MANIFEST.json')).sort();const entries=manifestFiles.map(path=>({path:relative(root,path).replaceAll('\\','/'),bytes:statSync(path).size,sha256:createHash('sha256').update(readFileSync(path)).digest('hex')}));
writeFileSync(join(root,'evidence/MANIFEST.json'),JSON.stringify({algorithm:'SHA-256',selfExcluded:'evidence/MANIFEST.json',files:entries.length,entries},null,2)+'\n');
for(const r of entries)assert.equal(createHash('sha256').update(readFileSync(join(root,r.path))).digest('hex'),r.sha256);
console.log(JSON.stringify({status:report.status,requiredDeliverables:required.length,findings:14,scenarios:44,methods,credentialMatches:0,linksChecked:links,manifestEntries:entries.length,syntaxChecks:checks.filter(x=>x.name.startsWith('syntax')).length},null,2));
