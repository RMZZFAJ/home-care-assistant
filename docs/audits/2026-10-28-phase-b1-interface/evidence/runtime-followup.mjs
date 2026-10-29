/* LOCAL AUDIT: Auth/context and draft fields; does not confirm final commands.
 * PDF GET may prepare/register synthetic local receipt objects. */
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {harness,out} from './browser-harness.mjs';
const h=await harness('b11-followup'),f=JSON.parse(readFileSync(new URL('b1-fixture.json',import.meta.url),'utf8'));
const go=async(p,url)=>{await p.goto(url,{waitUntil:'networkidle'});};
try{
 const p=await h.login('adminA',f.patient);
 await h.attempt('com-purchase-review',async()=>{await go(p,'/documentos/'+f.com);await p.getByRole('button',{name:'Registrar aquisição',exact:true}).click();await h.capture(p,'adminA','com-purchase-editor',{fullPage:true,note:'COM de doação está aprovada; não possui Aprovar itens, conforme estado real.'});await p.getByRole('button',{name:'Revisar operação',exact:true}).click();await h.capture(p,'adminA','com-purchase-review');});
 await h.attempt('movement-review',async()=>{await go(p,'/estoque?custody=FAMILY');await p.getByRole('button',{name:'Movimentar estoque familiar',exact:true}).click();const d=p.getByRole('dialog');await d.getByLabel('Operação',{exact:true}).selectOption('outbound');await d.getByLabel('Produto',{exact:true}).selectOption(f.products[0]);await d.getByLabel('Quantidade',{exact:true}).fill('2');await d.getByLabel('Motivo',{exact:true}).fill('Revisão fictícia B1 sem confirmação');await d.getByRole('button',{name:'Revisar movimentação',exact:true}).click();await h.capture(p,'adminA','movement-review');});
 await h.attempt('bal-config-review',async()=>{await go(p,'/balancos');await p.getByRole('button',{name:'Configurar dia e plantão',exact:true}).click();const d=p.getByRole('dialog');await d.getByLabel('Justificativa',{exact:true}).fill('Revisão fictícia B1 sem confirmação');await d.getByRole('button',{name:'Revisar decisão',exact:true}).click();await h.capture(p,'adminA','bal-config-review');});
 h.result.pdfs=[];
 for(const [kind,id]of [['REQ',f.req],['COM',f.com],['ENT',f.ent]])await h.attempt('pdf-'+kind,async()=>{const r=await p.request.get('/api/documents/'+id+'/pdf');if(!r.ok())throw Error('PDF '+r.status());const bytes=await r.body(),file='current-'+kind+'.pdf';writeFileSync(new URL(file,out),bytes);h.result.pdfs.push({at:new Date().toISOString(),kind,id,file,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),scenario:'Synthetic B1 local persisted document; renderer 4; no external navigation'});h.save();});
 await h.attempt('legacy-aliases',async()=>{for(const [prefix,label]of [['historico','legacy-req'],['fichas','legacy-ent']]){await go(p,'/'+prefix+'/'+(prefix==='historico'?f.req:f.ent));await h.capture(p,'adminA',label,{fullPage:true});}});
 await p.context().close();
 const pro=await h.login('professional',f.patient);
 await h.attempt('ent-divergence',async()=>{await go(pro,'/documentos/'+f.ent);await pro.getByRole('button',{name:'Informar divergência',exact:true}).click();await pro.getByRole('checkbox').first().check();await pro.getByLabel('Efetivamente recebido',{exact:true}).fill('6');await h.capture(pro,'professional','ent-divergence-editor',{fullPage:true,note:'Designated recipient is fixture professional, distinct from new BAL worker.'});await pro.getByRole('button',{name:'Revisar operação',exact:true}).click();await h.capture(pro,'professional','ent-divergence-review');});
 await pro.context().close();
 const publicPage=await h.browser.newPage({baseURL:h.result.origin,viewport:{width:390,height:844}});
 await h.attempt('invite-synthetic-token',async()=>{await go(publicPage,'/convites/aceitar#token='+'A'.repeat(43));await h.capture(publicPage,'public','invite-token-present',{note:'Unissued synthetic token, UI branch only; no acceptance/registration submitted. Token absent from screenshots.'});});
 await h.attempt('callback-invalid',async()=>{await go(publicPage,'/auth/callback');await h.capture(publicPage,'public','callback-invalid',{state:'ERROR_BLOCKED'});});
 for(let i=1;i<=6;i++)await h.attempt('demo-'+i,async()=>{const id='00000000-0000-4000-8000-00000000d00'+i;await go(publicPage,'/documentos/'+id);await h.capture(publicPage,'public','demo-'+i,{fullPage:true,note:'Public fixed synthetic demo, not an authenticated operational document.'});});
 await publicPage.close();
}finally{await h.finish();}
