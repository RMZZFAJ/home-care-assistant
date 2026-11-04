/* Existing official guarded runner; six selected browser cases, no fixture reset. */
import {spawn} from 'node:child_process';
import {dirname,delimiter,resolve} from 'node:path';
import {createWriteStream,writeFileSync} from 'node:fs';
import {getE2EEnvironment} from '../../../../scripts/e2e-environment.mjs';
if(process.versions.node!=='24.22.0')throw new Error('Required project Node');
const out=new URL('./',import.meta.url),startedAt=new Date().toISOString();
const env={...getE2EEnvironment(),PATH:dirname(process.execPath)+delimiter+process.env.PATH,
 PLAYWRIGHT_JSON_OUTPUT_FILE:resolve('docs/audits/2026-10-29-phase-b2-processes/evidence/e2e-results.json')};
const args=['scripts/run-e2e.mjs','tests/e2e/workflows.spec.ts','--project=chromium','--project=mobile','--project=ios','--grep','REQ → COM doação|resposta perdida e recarga','--reporter=line,json','--output=docs/audits/2026-10-29-phase-b2-processes/evidence/e2e-output'];
const stream=createWriteStream(new URL('e2e-current.log',out)),child=spawn(process.execPath,args,{env,stdio:['ignore','pipe','pipe'],windowsHide:true});
child.stdout.pipe(stream,{end:false});child.stderr.pipe(stream,{end:false});
const exitCode=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',resolve);});
await new Promise(resolve=>stream.end(resolve));
writeFileSync(new URL('e2e-execution.json',out),JSON.stringify({startedAt,finishedAt:new Date().toISOString(),exitCode,args,node:process.versions.node,externalSending:false,localBackend:'127.0.0.1:54321',fixturePolicy:'Existing test creates new development patients/products/memberships;no reset or seed;existing official Auth fixtures only authenticate',limits:'Six selected cases,not complete suite;emulated mobile/iOS,not physical devices or human acceptance'},null,2)+'\n');
console.log(JSON.stringify({exitCode,result:'e2e-results.json',log:'e2e-current.log'}));
