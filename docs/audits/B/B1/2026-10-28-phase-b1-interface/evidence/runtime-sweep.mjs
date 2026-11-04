/* global document, innerWidth */
/* AUDIT ONLY, LOCALLY MUTABLE: Auth sessions/context selection, possible
 * automatic document-science event. Never reset/seed; no external sending.
 * Uses the same guards/environment as scripts/run-e2e.mjs. */
import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {getE2EEnvironment} from '../../../../scripts/e2e-environment.mjs';
import {fixturePassword,patientA} from '../../../../scripts/test-constants.mjs';
import {sql} from '../../../../scripts/test-environment.mjs';
const env=getE2EEnvironment();
if(env.NEXT_PUBLIC_SUPABASE_URL!=='http://127.0.0.1:54321'||env.NOTIFICATIONS_EXTERNAL_ENABLED!=='false'||env.META_FLOWS_ENABLED!=='false')throw Error('Unsafe audit environment');
const accounts=JSON.parse(readFileSync('supabase/.temp/hca-fixtures.json','utf8'));
if(!Object.values(accounts).every(a=>/@example\.(test|com|invalid)$/.test(a.email)))throw Error('Fixture domains not synthetic');
const name=sql(`select display_name from public.care_recipients where id='${patientA}'`);
if(!/test|paciente|audit|fict/i.test(name))throw Error('Patient identity not proven synthetic');
const out=new URL('./',import.meta.url);
const result={sha:'37cb7f85e96e551d6419871f94dd950712e2565b',head:'34dcb835c5c49068e0417f7306eb4e501aa868bc',startedAt:new Date().toISOString(),origin:env.NEXT_PUBLIC_APP_URL,api:env.NEXT_PUBLIC_SUPABASE_URL,externalSending:false,mutations:['Auth session creation','local authority-context selection','document automatic science if enabled by current fixture'],captures:[],failures:[]};
const browser=await chromium.launch({headless:true});
const save=()=>writeFileSync(new URL('runtime-sweep.json',out),JSON.stringify(result,null,2)+'\n');
const clean=s=>s.replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,'[REDACTED_JWT]').replaceAll(fixturePassword,'[REDACTED_PASSWORD]');
async function capture(p,role,route,label,width=390){
 await p.setViewportSize({width,height:width<768?844:1000});
 await p.goto(route,{waitUntil:'networkidle'});
 const main=p.getByRole('main').first();
 const hasMain=await main.count();
 const surface=hasMain?main:p.locator('body');
 await surface.waitFor();
 await p.waitForFunction(()=>![...document.querySelectorAll('[role="status"]')].some(e=>/^(Carregando|Validando|Organizando)/.test(e.textContent.trim())),{},{timeout:12000}).catch(()=>{});
 // Unknown global patient names are masked; no real identity is exported.
 const mask=role==='global'?p.locator('.hca-record-main strong'):undefined;
 const file=`b11-${role}-${label}-${width}.png`;
 await p.screenshot({path:fileURLToPath(new URL(file,out)),fullPage:true,animations:'disabled',...(mask?{mask:[mask]}:{})});
 const text=clean(await surface.innerText());
 const snapshot=role==='global'?'Global patient-name list omitted from text export; screenshot masked.':clean(await surface.ariaSnapshot());
 const geometry=await p.evaluate(()=>({viewport:innerWidth,width:document.documentElement.scrollWidth,main:document.querySelector('main')?.scrollWidth,controls:[...document.querySelectorAll('main button,main input,main select,main textarea')].filter(e=>e.getClientRects().length).map(e=>{const r=e.getBoundingClientRect();return {tag:e.tagName,type:e.getAttribute('type'),name:e.getAttribute('aria-label')||e.getAttribute('name')||e.textContent.trim().slice(0,100),width:r.width,height:r.height,required:e.required||false,disabled:e.disabled||false};})}));
 result.captures.push({at:new Date().toISOString(),role,route,actualPath:new URL(p.url()).pathname,label,width,file,mainLandmark:Boolean(hasMain),ready:!/^Validando|^Carregando/.test(text),text:role==='global'?'Global list names omitted':text,snapshot,geometry,visualInspected:false});save();
}
async function login(role){
 const context=await browser.newContext({baseURL:env.NEXT_PUBLIC_APP_URL,viewport:{width:390,height:844}});
 const p=await context.newPage();p.setDefaultTimeout(15000);
 await p.goto('/login');await p.getByLabel('E-mail',{exact:true}).fill(accounts[role].email);await p.getByLabel('Senha',{exact:true}).fill(fixturePassword);await p.getByRole('button',{name:'Entrar',exact:true}).click();await p.getByRole('heading',{name:'Visão geral',exact:true}).waitFor();
 const response=await p.request.post('/api/context',{data:{careRecipientId:role==='global'?null:patientA}});
 if(!response.ok())throw Error(`Context selection ${role}: ${response.status()}`);
 return p;
}
try{
 const publicPage=await browser.newPage({baseURL:env.NEXT_PUBLIC_APP_URL});
 for(const [route,label] of [['/login','login'],['/recuperar-senha','recovery'],['/convites/aceitar','invite-missing'],['/verificar/00000000-0000-4000-8000-000000000000','verify-invalid'],['/nao-existe-b1','not-found']])await capture(publicPage,'public',route,label);
 await publicPage.close();
 const admin=await login('adminA');
 const routes=[['/','dashboard'],['/historico','history'],['/fichas','forms'],['/fichas/req','req'],['/fichas/com','com'],['/fichas/ent','ent'],['/fichas/bal','bal-count'],['/entregas','deliveries'],['/escalas','schedules'],['/balancos','balances'],['/estoque?custody=FAMILY','stock-family'],['/estoque?custody=CARE_TEAM','stock-team'],['/estoque?custody=TRANSIT','stock-transit'],['/consumo','consumption'],['/admin?section=patient','admin-patient'],['/admin?section=memberships','admin-memberships'],['/admin?section=catalog','admin-catalog'],['/admin?section=audit','admin-audit'],['/configuracoes','policy'],['/unidades','units'],['/perfil','profile'],['/notificacoes','notifications'],['/mais','more'],['/inventarios','legacy-inventory']];
 for(const [route,label] of routes){try{await capture(admin,'adminA',route,label);}catch(e){result.failures.push({role:'adminA',route,error:clean(e.message)});save();}}
 for(const width of [320,768,1440,1920])await capture(admin,'adminA','/','dashboard',width);
 const docs=JSON.parse(sql(`select coalesce(json_agg(x),'[]') from (select distinct on(type) id,type from public.operational_documents where care_recipient_id='${patientA}' order by type,created_at desc) x`));
 for(const d of docs)await capture(admin,'adminA','/documentos/'+d.id,'document-'+d.type,390);
 // Real demo keys are discovered separately, never guessed from friendly labels.
 await admin.context().close();
 for(const role of ['professional','supervisor','family','reader','global']){
  const p=await login(role);await capture(p,role,'/','dashboard',390);
  if(role==='professional'){
   for(const width of [320,768,1440,1920])await capture(p,role,'/','dashboard',width);
   for(const [route,label] of [['/fichas/req','req'],['/fichas/bal','bal-count'],['/entregas','deliveries'],['/mais','more']])await capture(p,role,route,label,390);
  }
  if(role==='global')for(const [route,label] of [['/admin?section=profiles','global-accounts'],['/admin?section=patient','global-patients']])await capture(p,role,route,label,1440);
  if(role==='reader')await capture(p,role,'/fichas/req','req-denied');
  await p.context().close();
 }
}catch(e){result.failures.push({fatal:true,error:clean(e.message)});process.exitCode=1;}
finally{await browser.close();result.finishedAt=new Date().toISOString();save();console.log(JSON.stringify({captures:result.captures.length,failures:result.failures}));}
