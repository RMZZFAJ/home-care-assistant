/* AUDIT ONLY. Auth/context locally mutable; evidence only in B1. No tokens exported. */
/* global window, document, scrollX, scrollY */
import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {getE2EEnvironment} from '../../../../scripts/e2e-environment.mjs';
import {fixturePassword,patientA} from '../../../../scripts/test-constants.mjs';
export const env=getE2EEnvironment(),accounts=JSON.parse(readFileSync('supabase/.temp/hca-fixtures.json','utf8')),out=new URL('./',import.meta.url);
if(env.NEXT_PUBLIC_SUPABASE_URL!=='http://127.0.0.1:54321'||env.NOTIFICATIONS_EXTERNAL_ENABLED!=='false'||env.META_FLOWS_ENABLED!=='false')throw Error('Unsafe environment');
export async function harness(name){
 const browser=await chromium.launch({headless:true}),result={sha:'37cb7f85e96e551d6419871f94dd950712e2565b',startedAt:new Date().toISOString(),origin:env.NEXT_PUBLIC_APP_URL,externalSending:false,cases:[],failures:[]};
 const clean=s=>s.replaceAll(fixturePassword,'[REDACTED]').replace(/[^\s"]*\/storage\/v1\/object\/sign[^\s"]*/g,'[REDACTED_SIGNED_URL]').replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,'[REDACTED_JWT]');
 const save=()=>writeFileSync(new URL(name+'.json',out),JSON.stringify(result,null,2)+'\n');
 async function login(role,patient=patientA,account=accounts[role]){
  const c=await browser.newContext({baseURL:env.NEXT_PUBLIC_APP_URL,viewport:{width:390,height:844},locale:'pt-BR'}),p=await c.newPage();p.setDefaultTimeout(12000);
  await p.goto('/login');await p.getByLabel('E-mail',{exact:true}).fill(account.email);await p.getByLabel('Senha',{exact:true}).fill(fixturePassword);await p.getByRole('button',{name:'Entrar',exact:true}).click();await p.getByRole('heading',{name:'Visão geral',exact:true}).waitFor();
  const response=await p.request.post('/api/context',{data:{careRecipientId:patient}});if(!response.ok())throw Error('Context selection failed '+response.status());
  await p.goto('/');await p.locator('.hca-dashboard').waitFor();return p;
 }
 async function capture(p,role,label,{width,fullPage=false,note='',state='READY',target,mask=[]}={}){
  if(width)await p.setViewportSize({width,height:width<768?844:1000});
  if(fullPage)await p.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
  await p.waitForFunction(()=>document.getAnimations().every(a=>a.playState!=='running'||a.effect?.getComputedTiming().iterations===Infinity));
  const dialog=p.getByRole('dialog').last(),scope=target||(await dialog.count()&&await dialog.isVisible()?dialog:p.getByRole('main').first());
  const file=name+'-'+role+'-'+label+'.png';
  await p.screenshot({path:fileURLToPath(new URL(file,out)),animations:'disabled',fullPage,mask});
  const item={at:new Date().toISOString(),role,label,path:new URL(p.url()).pathname+new URL(p.url()).search,width:p.viewportSize().width,state,note,file,fullPage,scroll:await p.evaluate(()=>({x:scrollX,y:scrollY})),text:clean(await scope.innerText()),snapshot:clean(await scope.ariaSnapshot()),visualInspected:false};
  result.cases.push(item);save();return item;
 }
 async function attempt(label,fn){try{await fn();}catch(e){result.failures.push({label,error:clean(e.message)});save();}}
 async function finish(){await browser.close();result.finishedAt=new Date().toISOString();save();console.log(JSON.stringify({name,cases:result.cases.length,failures:result.failures}));}
 return {browser,result,login,capture,attempt,finish,save};
}
