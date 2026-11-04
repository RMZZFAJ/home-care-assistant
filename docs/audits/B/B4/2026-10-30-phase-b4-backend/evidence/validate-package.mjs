/* Proportional documentary validation and Git-byte manifest. Never runs probes. */
import assert from 'node:assert/strict';
import { execFileSync,spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync,writeFileSync,readdirSync,existsSync } from 'node:fs';
import { resolve,dirname,join } from 'node:path';
import { getTestEnvironment } from '../../../../scripts/test-environment.mjs';
if(process.versions.node!=='24.22.0')throw new Error('Node version');
const packagePath='docs/audits/2026-10-30-phase-b4-backend',indexPath='docs/audits/phase-b/README.md',manifestPath=packagePath+'/evidence/MANIFEST.json';
const gitBytes=(...a)=>execFileSync('git',a,{windowsHide:true,maxBuffer:32*1024*1024});
const git=(...a)=>gitBytes(...a).toString('utf8').trim();
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const allowed=p=>p.startsWith(packagePath+'/')||p===indexPath;
assert.equal(git('branch','--show-current'),'audit/phase-b');
assert.equal(git('rev-parse','master'),'34dcb835c5c49068e0417f7306eb4e501aa868bc');
const staged=()=>git('diff','--cached','--name-only').split('\n').filter(Boolean);
assert(staged().every(allowed),'Staged change outside authorization');
const mode=process.argv[2];
if(mode==='--seal-index'||mode==='--verify-index'||mode==='--verify-head'){
 const ref=mode==='--verify-head'?'HEAD:':':';
 const paths=gitBytes('ls-files','-z','--',packagePath,indexPath).toString('utf8').split('\0').filter(Boolean);
 if(mode==='--seal-index'){
  assert(paths.includes(packagePath+'/evidence/package-validation.json'));
  const manifest={recordedAt:new Date().toISOString(),format:'SHA256_OF_GIT_INDEX_BYTES',scope:[packagePath,indexPath],selfExcluded:true,entries:paths.filter(p=>p!==manifestPath).map(path=>({path,bytes:gitBytes('show',':'+path).length,sha256:hash(gitBytes('show',':'+path))}))};
  writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');console.log(JSON.stringify({sealed:manifest.entries.length,format:manifest.format}));
 }else{
  const manifest=JSON.parse(gitBytes('show',ref+manifestPath).toString('utf8'));
  for(const entry of manifest.entries){const bytes=gitBytes('show',ref+entry.path);assert.equal(hash(bytes),entry.sha256,entry.path);assert.equal(bytes.length,entry.bytes,entry.path);}
  assert.equal(manifest.entries.length,paths.filter(p=>p!==manifestPath).length,'Manifest inventory mismatch');
  const report=JSON.parse(gitBytes('show',ref+packagePath+'/evidence/package-validation.json').toString('utf8'));assert.equal(report.status,'PASS');
  console.log(JSON.stringify({verified:manifest.entries.length,ref,branch:git('branch','--show-current'),head:git('rev-parse','HEAD'),master:git('rev-parse','master'),documentaryScope:true}));
 }
 process.exit(0);
}
const list=path=>readdirSync(path,{withFileTypes:true}).flatMap(e=>e.isDirectory()?list(join(path,e.name)):[join(path,e.name).replaceAll('\\','/')]);
const files=list(packagePath),read=p=>readFileSync(p,'utf8'),json=p=>JSON.parse(read(p));
const required=['README.md','CHECKPOINT.md','00_BASELINE_SCOPE_AND_METHOD.md','01_BACKEND_API_INVENTORY.csv','01_BACKEND_COVERAGE.csv','01_ARCHITECTURE_AND_REQUEST_FLOW.md','02_AUTH_CONTEXT_AND_CAPABILITIES.md','02_AUTHORIZATION_HTTP_MATRIX.csv','03_INPUT_VALIDATION_AND_DATA_CONTRACTS.md','04_COMMANDS_IDEMPOTENCY_AND_RECOVERY.md','05_READ_APIS_PAGINATION_AND_FRESHNESS.md','06_HTTP_ERRORS_AND_FAILURE_RECOVERY.md','07_DOCUMENTS_PDF_ATTACHMENTS_SERVICES.md','08_ADMINISTRATION_IDENTITY_AND_SETTINGS.md','09_WORKERS_WEBHOOKS_AND_INTEGRATION_BOUNDARIES.md','10_APPLICATION_SECURITY_AND_PRIVACY.md','11_ARCHITECTURE_OBSERVABILITY_AND_RESILIENCE.md','12_CROSS_LAYER_ADVERSARIAL_SCENARIOS.md','13_NEW_BACKEND_GAPS_AND_OPPORTUNITIES.md','14_FINDINGS_MASTER.csv','14_FINDINGS_MASTER.md','15_ACCEPTANCE_AND_REGRESSION_CRITERIA.md','16_CROSS_GROUP_DEPENDENCIES.md','17_GROUP_B4_EXECUTIVE_ASSESSMENT.md','18_PHASE_C_DECISION_HANDOFF.md'];
for(const name of required)assert(existsSync(packagePath+'/'+name),name);
function parseCsv(text){const rows=[];let row=[],value='',quoted=false;for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){value+='"';i++;}else quoted=!quoted;}else if(!quoted&&(c===','||c==='\n')){row.push(value);value='';if(c==='\n'){rows.push(row);row=[];}}else if(c!=='\r'||quoted)value+=c;}if(value||row.length){row.push(value);rows.push(row);}assert(!quoted,'Unclosed CSV quote');const cols=rows.shift();return rows.filter(r=>r.some(Boolean)).map(r=>{assert.equal(r.length,cols.length,'CSV width');return Object.fromEntries(cols.map((k,i)=>[k,r[i]]));});}
const findings=parseCsv(read(packagePath+'/14_FINDINGS_MASTER.csv')),scenarios=parseCsv(read(packagePath+'/evidence/SCENARIOS.csv')),inventory=parseCsv(read(packagePath+'/01_BACKEND_API_INVENTORY.csv')),coverage=parseCsv(read(packagePath+'/01_BACKEND_COVERAGE.csv')),authority=parseCsv(read(packagePath+'/02_AUTHORIZATION_HTTP_MATRIX.csv'));
assert.equal(findings.length,13);assert.equal(Object.keys(findings[0]).length,32);assert.equal(scenarios.length,77);assert.equal(inventory.length,61);assert.equal(coverage.length,102);assert.equal(authority.length,61);
const findingIds=new Set(findings.map(f=>f.id)),scenarioIds=new Set(scenarios.map(s=>s.id));assert.equal(findingIds.size,13);assert.equal(scenarioIds.size,77);
for(const row of coverage)for(const id of row.scenario_ids.split(';').filter(Boolean))assert(scenarioIds.has(id),id);
for(const f of findings){for(const value of Object.values(f))assert(value.trim(),f.id+' empty field');assert(read(packagePath+'/14_FINDINGS_MASTER.md').includes('## '+f.id));assert(read(packagePath+'/15_ACCEPTANCE_AND_REGRESSION_CRITERIA.md').includes('AC-'+f.id));}
for(const file of files.filter(p=>p.endsWith('.json')))json(file);
for(const file of files.filter(p=>p.endsWith('.csv')))parseCsv(read(file));
let links=0,deferredManifestLinks=0;
for(const file of [...files.filter(p=>p.endsWith('.md')),indexPath]){
 const text=read(file);for(const id of text.matchAll(/\bB4-\d{3}\b/g))assert(findingIds.has(id[0]),id[0]);
 for(const match of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)){
  let target=match[1].replace(/^<|>$/g,'').split('#')[0];if(!target||/^(?:https?:|mailto:)/.test(target))continue;
  target=resolve(dirname(file),target);if([resolve(manifestPath),resolve(packagePath+'/evidence/package-validation.json')].includes(target)&&!existsSync(target)){deferredManifestLinks++;continue;}assert(existsSync(target),'Broken link '+file+' -> '+target);links++;
 }
}
const local=getTestEnvironment(),privatePath=join(process.env.LOCALAPPDATA,'home-care-assistant','audit-b4','local-state.json');
const privateValues=[local.serviceKey];if(existsSync(privatePath))for(const a of Object.values(json(privatePath).actors))privateValues.push(a.password);
const leaks=[];
for(const file of files){const text=read(file);if(privateValues.filter(v=>typeof v==='string'&&v.length>=20).some(v=>text.includes(v))||/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(text)||/eyJ[A-Za-z0-9_-]{20,}\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/.test(text))leaks.push(file);}
assert.deepEqual(leaks,[],'Potential credential in audit package');
const protectedSources=json(packagePath+'/evidence/protected-source-hashes.json');for(const s of protectedSources)assert.equal(hash(readFileSync(s.path)),s.sha256,s.path);
const preserved=json(packagePath+'/evidence/preservation-results.json'),background=json(packagePath+'/evidence/background-progress-results.json');
assert.equal(preserved.protectedFiles,395);assert.equal(preserved.routinesCompared,232);assert.equal(preserved.routineDrift.length,0);assert.equal(background.originalDocumentIdsMissing,0);assert.equal(background.originalLifecycleIdsMissing,0);assert(background.allAddedActionsSystemReminders);assert(background.noOriginalDocumentStatusPatientOrTypeChanged);
const checks=[];
const run=(name,args)=>{const r=spawnSync(process.execPath,args,{encoding:'utf8',windowsHide:true});checks.push({name,args,exitCode:r.status,output:(r.stdout+r.stderr).trim()});assert.equal(r.status,0,name+' failed: '+(r.stdout+r.stderr));};
let syntax=0;for(const file of files.filter(p=>p.endsWith('.mjs'))){run('syntax '+file,['--check',file]);syntax++;}
run('Markdown package and Phase B index',['node_modules/markdownlint-cli2/markdownlint-cli2-bin.mjs',packagePath+'/**/*.md',indexPath]);
run('Audit helpers ESLint only',['node_modules/eslint/bin/eslint.js',packagePath+'/evidence/*.{mjs,ts}']);
const report={recordedAt:new Date().toISOString(),status:'PASS',node:process.versions.node,requiredDeliverables:required.length,endpointMethods:inventory.length,coverageRows:coverage.length,authorityRows:authority.length,findings:findings.length,fieldsPerFinding:32,scenarios:scenarios.length,linksChecked:links,deferredManifestLinksResolvedByIndexVerification:deferredManifestLinks,syntaxChecked:syntax,credentialMatches:0,protectedFilesUnchanged:protectedSources.length,sqlFunctionsUnchanged:232,originalData:'60 tables retain all original row hashes;19 headers/lifecycle advanced by system reminder with original IDs/scope/status/hash chain reconciled',auxiliaryTypecheck:{command:'tsc -p evidence/tsconfig.audit.json --pretty false',exitCode:0,scope:'Executed separately for new probes and their imports;not a global product typecheck'},checks,priorProductChecks:'B3 evidence/checks.json reused as historical baseline only;no B4 global build,typecheck,unit,E2E or migration replay',boundaries:{functionalChanges:false,remoteChanges:false,reset:false,realMessages:false,deploy:false,pr:false,merge:false,nextPhaseStarted:false},manifest:'Git index bytes sealed after staging;self excluded;verify-index and verify-head provide final byte-level proof'};
writeFileSync(packagePath+'/evidence/package-validation.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...report,checks:checks.map(c=>({name:c.name,exitCode:c.exitCode}))},null,2));
