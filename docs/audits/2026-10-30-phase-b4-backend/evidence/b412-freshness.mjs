/* Directed browser diagnostic, not a broad E2E suite. Known local server only.
 * Uses the already installed Playwright library, no new dependency or fixtures.
 * No traces/storageState exported; cookies remain in memory; new report only. */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { state,actor,rpc,http,select,record,origin } from './http-local.mjs';
const server=JSON.parse(readFileSync(new URL('local-server.json',import.meta.url),'utf8'));
assert.equal(server.origin,origin);assert.equal(server.external,false);assert.equal(server.dist,'.next-e2e');assert.equal(server.buildId,readFileSync('.next-e2e/BUILD_ID','utf8').trim());
await select('professional');const person=await actor('professional');
const browser=await chromium.launch({headless:true});
try{
 const context=await browser.newContext();await context.addCookies([...person.jar].map(([name,value])=>({name,value,url:origin,sameSite:'Lax'})));
 let externalBlocked=0;await context.route('**/*',async route=>{const url=new URL(route.request().url());if(!['127.0.0.1','localhost'].includes(url.hostname)||!['3100','54321'].includes(url.port)){externalBlocked++;await route.abort();}else await route.continue();});
 const page=await context.newPage();let reads=0,contexts=0;
 page.on('response',r=>{const u=new URL(r.url());if(u.pathname==='/api/consumption'&&r.request().method()==='GET')reads++;if(u.pathname==='/api/context')contexts++;});
 const ready=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/consumption'&&r.status()===200);
 await page.goto(origin+'/consumo?careRecipientId='+state.patients[0]);await ready;
 await page.getByText('Nenhum relato registrado.',{exact:true}).waitFor();
 const revisionBefore=String(await rpc(person.client,'workspace_revision'));
 const readsBefore=reads,contextsBefore=contexts,text='Relato sintético de frescor '+randomUUID().slice(0,8);
 const posted=await http('professional','/api/consumption',{method:'POST',body:{action:'report',careRecipientId:state.patients[0],kind:'shortage',location:'CARE_TEAM',text,lines:[],idempotencyKey:randomUUID()}});assert.equal(posted.status,200);
 const revisionAfter=String(await rpc(person.client,'workspace_revision'));assert.notEqual(revisionAfter,revisionBefore);
 const reloadedContext=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/context'&&r.status()===200);
 await page.evaluate(()=>globalThis.window.dispatchEvent(new globalThis.Event('hca:data-changed')));await reloadedContext;
 await page.waitForTimeout(1500);
 const afterSignal={additionalContextReads:contexts-contextsBefore,additionalConsumptionReads:reads-readsBefore,newReportVisible:await page.getByText(text,{exact:true}).count()};
 assert(afterSignal.additionalContextReads>=1);assert.equal(afterSignal.additionalConsumptionReads,0);assert.equal(afterSignal.newReportVisible,0);
 const nextRead=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/consumption'&&r.status()===200);await page.reload();await nextRead;await page.getByText(text,{exact:true}).waitFor();
 record('b412-freshness-results.json',{recordedAt:new Date().toISOString(),category:'REAL_BROWSER_LOCAL_HTTP_AUTH_AND_REVISION',results:[{id:'B412-01',contract:'Confirmed invalidation should reload consumption read model without changing permissions or patient',backendRevisionAdvanced:true,reportId:posted.data.id,afterSignal,afterFullReload:{newReportVisible:true,consumptionReads:reads},externalRequestsBlocked:externalBlocked,cause:'WorkspaceProvider reuses equal patient row;Reports effect depends on context.patient and attempt;no useLiveRevision',counterproof:'Manual page reload fetches and displays the persisted report;backend revision did advance',limits:'One Chromium local diagnostic with explicit hca:data-changed injection;not proof of provider/Reatime event delivery or human acceptance. No screenshot/trace/cookies exported.'}]});
 console.log(JSON.stringify({scenarios:1,staleConsumerConfirmed:true,fullReloadRecovers:true,externalRequestsBlocked:externalBlocked}));
}finally{await browser.close();}
