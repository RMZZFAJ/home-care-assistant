/* LOCALLY MUTABLE AUDIT: Auth/context, local draft autosave; no final commands
 * except the separate fixture creator. Opens decisions without confirming. */
import {readFileSync} from 'node:fs';
import {harness} from './browser-harness.mjs';
const h=await harness('b11-supplement'),f=JSON.parse(readFileSync(new URL('b1-fixture.json',import.meta.url),'utf8'));
const go=async(p,url)=>{await p.goto(url,{waitUntil:'networkidle'});};
try{
 const p=await h.login('adminA');
 for(const [section,label] of [['','admin-overview'],['invitations','admin-invitations'],['alerts','admin-alerts'],['notificationRecipients','admin-recipients'],['notifications','admin-queue'],['import','admin-import']])await h.attempt(label,async()=>{await go(p,'/admin'+(section?'?section='+section:''));await h.capture(p,'adminA',label,{fullPage:true});});
 for(const area of ['permissions','notifications','people'])await h.attempt('policy-'+area,async()=>{await go(p,'/configuracoes?area='+area);await h.capture(p,'adminA','policy-'+area,{fullPage:true});});
 await h.attempt('profile-menu',async()=>{await go(p,'/');await p.getByLabel('Menu do usuário',{exact:true}).click();await h.capture(p,'adminA','profile-menu',{target:p.getByRole('menu')});await p.getByRole('menuitem',{name:'Mudar perfil',exact:true}).click();await h.capture(p,'adminA','context-menu',{target:p.getByRole('menu')});await p.keyboard.press('Escape');});
 await h.attempt('notification-bell',async()=>{await p.getByRole('button',{name:/^Notificações/}).click();await h.capture(p,'adminA','notification-bell',{target:p.getByRole('region',{name:'Notificações recentes'})});await p.keyboard.press('Escape');});
 const drawers=[['/admin?section=catalog','Novo item','catalog-new'],['/admin?section=catalog','Adotar modelo','catalog-model'],['/admin?section=memberships','Vincular conta','membership-new'],['/unidades','Nova unidade','unit-new'],['/unidades','Configurar apresentação','presentation'],['/escalas','Novo tipo de plantão','schedule-type'],['/escalas','Nova programação','schedule-series'],['/balancos','Configurar dia e plantão','bal-configure'],['/estoque?custody=FAMILY','Movimentar estoque familiar','stock-movement'],['/consumo','Registrar ocorrência','occurrence-new']];
 for(const [url,button,label]of drawers)await h.attempt(label,async()=>{await go(p,url);await p.getByRole('button',{name:button,exact:true}).click();await h.capture(p,'adminA',label);await p.keyboard.press('Escape');});
 for(const button of ['Identidade pessoal','Foto de perfil','Alterar senha','Autenticação em duas etapas','Contatos e métodos de login','Seus vínculos com pacientes','Sessões autenticadas'])await h.attempt('profile '+button,async()=>{await go(p,'/perfil');await p.getByRole('button',{name:button,exact:true}).click();await h.capture(p,'adminA','profile-'+['Identidade pessoal','Foto de perfil','Alterar senha','Autenticação em duas etapas','Contatos e métodos de login','Seus vínculos com pacientes','Sessões autenticadas'].indexOf(button),{fullPage:true});});
 await h.attempt('req-steps',async()=>{await go(p,'/fichas/req');for(let i=1;i<7;i++){await p.getByRole('button',{name:i===6?'Revisar':'Avançar',exact:true}).click();await h.capture(p,'adminA','req-step-'+i,{fullPage:true});}});
 await h.attempt('com-products',async()=>{await go(p,'/fichas/com');await p.getByRole('button',{name:'Avançar',exact:true}).click();await h.capture(p,'adminA','com-products',{fullPage:true});});
 await h.attempt('stock-details',async()=>{await go(p,'/estoque?custody=CARE_TEAM');await p.getByRole('button',{name:/^Consultar /}).filter({visible:true}).first().click();await h.capture(p,'adminA','stock-details');});
 await h.attempt('policy-rules-drawer',async()=>{await go(p,'/configuracoes');await p.getByRole('button',{name:'Editar Comunicação e lembretes',exact:true}).click();await h.capture(p,'adminA','policy-messages');});
 await p.context().close();
 const p2=await h.login('adminA',f.patient);
 for(const [id,label]of [[f.req,'document-req-isolated'],[f.com,'document-com'],[f.ent,'document-ent-pending']])await h.attempt(label,async()=>{await go(p2,'/documentos/'+id);await h.capture(p2,'adminA',label,{fullPage:true});});
 await h.attempt('com-approve-review',async()=>{await go(p2,'/documentos/'+f.com);await p2.getByRole('button',{name:'Aprovar itens',exact:true}).click();await h.capture(p2,'adminA','com-approve-editor',{fullPage:true});await p2.getByRole('button',{name:'Revisar operação',exact:true}).click();await h.capture(p2,'adminA','com-approve-review');});
 await p2.context().close();
 const pro=await h.login('shiftWorker',f.patient,f.pro);
 await h.attempt('ent-divergence',async()=>{await go(pro,'/documentos/'+f.ent);await pro.getByRole('button',{name:'Informar divergência',exact:true}).click();await pro.getByRole('checkbox').first().check();await pro.getByLabel('Efetivamente recebido',{exact:true}).fill('6');await h.capture(pro,'shiftWorker','ent-divergence-editor',{fullPage:true});await pro.getByRole('button',{name:'Revisar operação',exact:true}).click();await h.capture(pro,'shiftWorker','ent-divergence-review');});
 await h.attempt('scheduled-bal',async()=>{await go(pro,'/fichas/bal');await pro.getByPlaceholder('Quantidade física',{exact:true}).first().waitFor();const inputs=pro.getByPlaceholder('Quantidade física',{exact:true});for(let i=0;i<await inputs.count();i++)await inputs.nth(i).fill(i?'0':'1');await h.capture(pro,'shiftWorker','scheduled-bal-count',{fullPage:true});await pro.getByRole('button',{name:'Revisar',exact:true}).click();await h.capture(pro,'shiftWorker','scheduled-bal-review',{fullPage:true});});
 await pro.context().close();
 const prior=JSON.parse(readFileSync('docs/audits/2026-10-25-production-readiness/evidence/ui-runtime-fixture.json','utf8'));
 const a=await h.login('adminA',prior.patient);
 await h.attempt('scale-prior-proposal',async()=>{await go(a,'/escalas');await a.getByRole('button',{name:'Aprovar alteração',exact:true}).first().click();await h.capture(a,'adminA','scale-prior-review-390');await h.capture(a,'adminA','scale-prior-review-1440',{width:1440});});
 await a.context().close();
}finally{await h.finish();}
