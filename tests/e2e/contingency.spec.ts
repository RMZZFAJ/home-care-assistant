import {expect,test,type Page} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import sharp from 'sharp';
import {actor,fixtures,issue,rpc,setup} from '../integration/v4-fixtures.mjs';
import {preparedPatient} from '../integration/local-preparation-fixtures.mjs';
import {contingencyBody,contingencyPacket,recordContingency} from '../integration/contingency-fixtures.mjs';
import {sql,sqlLiteral as q} from '../../scripts/test-environment.mjs';
import {fixturePassword} from '../../scripts/test-constants.mjs';
import {selectContext} from './auth-context';
import {audit,auditFromTop} from './accessibility-audit';
test.setTimeout(180_000);
async function login(page:Page,role:string,patient:string|null){await page.goto('/login');await page.getByLabel('E-mail',{exact:true}).fill(fixtures[role].email);await page.getByLabel('Senha',{exact:true}).fill(fixturePassword);await page.getByRole('button',{name:'Entrar',exact:true}).click();await expect(page.getByRole('heading',{name:'Visão geral',exact:true})).toBeVisible();await selectContext(page,patient);}
const target=(patient:string,id?:string)=>'/contingencias?careRecipientId='+patient+'&process=REQ'+(id?'&id='+id:'');
const facts=(patient:string)=>sql("select jsonb_build_object('stock',(select jsonb_agg(to_jsonb(x) order by id) from public.stock_movements x where care_recipient_id="+q(patient)+"),'docs',(select jsonb_agg(to_jsonb(x) order by id) from public.operational_documents x where care_recipient_id="+q(patient)+"),'events',(select count(*) from public.document_events where care_recipient_id="+q(patient)+"),'science',(select count(*) from public.requisition_science_events where requisition_id in(select id from public.operational_documents where care_recipient_id="+q(patient)+")))");
const count=(patient:string)=>Number(sql('select count(*) from private.contingency_cases where care_recipient_id='+q(patient)));
async function start(page:Page,text:string){
 await page.getByRole('button',{name:'Declarar fato',exact:true}).click();
 const drawer=page.getByRole('dialog',{name:'Declarar um fato',exact:true});
 await drawer.getByRole('textbox',{name:'O que aconteceu?',exact:true}).fill(text);
 return drawer;
}
async function review(page:Page){
 await page.getByRole('button',{name:'Revisar declaração',exact:true}).click();
 const drawer=page.getByRole('dialog',{name:'Confira a declaração',exact:true});
 await expect(drawer.getByRole('heading',{name:'Confira os fatos conhecidos e os desconhecidos',exact:true})).toBeFocused();
 await expect(drawer.locator('input,select,textarea')).toHaveCount(0);
 return drawer;
}
async function addMaterial(page:Page,drawer:ReturnType<Page["getByRole"]>,name:string){
 await drawer.getByRole('button',{name:'Adicionar',exact:true}).click();
 const picker=page.getByRole('dialog',{name:'Adicionar material declarado',exact:true});
 await picker.getByRole('textbox',{name:'Buscar material',exact:true}).fill(name);
 await picker.getByRole('button',{name:new RegExp('^'+name+' ')}).click();
}
async function openConfirmedDossier(page:Page,title:string){
 const result=page.getByRole('dialog',{name:title,exact:true});
 await expect(result).toContainText('Nenhum movimento ou aceite criado');
 await result.getByRole('button',{name:'Abrir dossiê',exact:true}).click();
 await expect(page.getByRole('region',{name:'Dossiê selecionado',exact:true}).getByRole('heading',{name:'O que foi declarado',exact:true})).toBeVisible();
}

test('E12-04 filters the authorized dossiers and opens facts, materials and history without writes',async({page,browser},info)=>{
 const f=await setup(), reference='Caderno %, folha 18';
 const c=await recordContingency(f.admin,f.patient,'REQ',contingencyBody({knownReference:reference,fact:'Luvas registradas no caderno da residência.'}));
 await recordContingency(f.admin,f.patient,'REQ',contingencyBody({knownReference:'Outra referência'}));
 await login(page,'family',f.patient);
 const before=facts(f.patient),writes:string[]=[];
 page.on('request',request=>{if(new URL(request.url()).pathname==='/api/contingencies'&&request.method()!=='GET')writes.push(request.method());});
 await page.goto(target(f.patient));
 const input=page.getByRole('textbox',{name:'Buscar por referência ou descrição',exact:true});
 const trigger=page.getByRole('button',{name:/^Caderno %, folha 18/});
 const drawer=page.getByRole('dialog',{name:reference,exact:true});
 await input.fill('Seringa inexistente');await input.press('Enter');
 await expect(page.getByRole('heading',{name:'Nenhuma contingência encontrada',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Limpar busca',exact:true}).click();
 await expect(page.getByRole('button',{name:/^Outra referência/})).toBeVisible();
 await input.fill('CADERNO %');await input.press('Enter');
 await expect(trigger).toBeVisible();await expect(page.getByRole('button',{name:/^Outra referência/})).toHaveCount(0);
 await trigger.click();await expect(drawer.getByText('Luvas registradas no caderno da residência.')).toBeVisible();
 await expect(page).toHaveURL(new RegExp('id='+c.caseId));
 await drawer.getByRole('tab',{name:'Materiais',exact:true}).click();
 await expect(drawer.getByText('Nenhum material identificado nesta declaração.')).toBeVisible();
 await drawer.getByRole('tab',{name:'Histórico',exact:true}).click();
 await expect(drawer.getByRole('heading',{name:'Declaração registrada',exact:true})).toBeVisible();
 await drawer.getByRole('button',{name:'Fechar dossiê',exact:true}).click();await expect(trigger).toBeFocused();
 await input.fill('');await input.press('Enter');await expect(page.getByRole('button',{name:/^Outra referência/})).toBeVisible();
 const modelContext=await browser.newContext({viewport:{width:1280,height:900}});
 mkdirSync('output/playwright/l4/reference',{recursive:true});
 try {
  const model=await modelContext.newPage();await model.route(/^https?:/,route=>route.abort());
  await model.goto(pathToFileURL(resolve('hca-laboratorio-04-v2-aprovado.html')).href+'#E12-04/list');
  const referenceFrame=model.locator('#device-frame');
  await expect(referenceFrame.getByRole('heading',{name:'Registros de contingência',exact:true})).toBeVisible();
  for(const width of [360,412]){
   await model.getByRole('combobox',{name:'Visualização',exact:true}).selectOption(String(width));
   const size=await referenceFrame.boundingBox();if(!size)throw new Error('A referência visual do dossiê não foi exibida.');
   await page.setViewportSize({width,height:Math.round(size.height)});
   await auditFromTop(page,'E12-04 contingências '+width);
   await referenceFrame.screenshot({path:'output/playwright/l4/reference/contingency-'+width+'.png'});
   await page.screenshot({path:'output/playwright/l4/contingency-'+info.project.name+'-'+width+'.png'});
  }
  await model.goto(pathToFileURL(resolve('hca-laboratorio-04-v2-aprovado.html')).href+'#E12-04/detail');
  await model.getByRole('combobox',{name:'Visualização',exact:true}).selectOption('412');
  await trigger.click();await expect(drawer.getByRole('tab',{name:'Fatos',exact:true})).toBeVisible();
  await referenceFrame.getByRole('button',{name:/^CTG-0012/}).click();
  await expect(referenceFrame.getByText('Fatos',{exact:true})).toBeVisible();
  await referenceFrame.screenshot({path:'output/playwright/l4/reference/contingency-dossier-412.png',animations:'disabled'});
  await page.screenshot({path:'output/playwright/l4/contingency-dossier-'+info.project.name+'-412.png',animations:'disabled'});
 } finally {await modelContext.close();}
 expect(writes).toEqual([]);expect(facts(f.patient)).toBe(before);
});

test('contingency real declaration evidence and independent link preserve physical facts and all unknowns',async({page,browser},info)=>{
 const f=await setup(),req=await issue(f.patient,f.products),before=facts(f.patient),text='Requisição física fictícia e estoque observado; autoria física e horário desconhecidos. Não presumir ciência pessoal.';
 await login(page,'professional',f.patient);await page.goto('/guias');await page.getByRole('link',{name:/^Contingência física/}).click();await page.getByRole('combobox',{name:'Tipo de processo',exact:true}).selectOption('REQ');
 const editor=await start(page,text);
 const material=sql('select name from public.care_recipient_products where care_recipient_id='+q(f.patient)+' and product_id='+q(f.products[0]));
 await addMaterial(page,editor,material);
 await editor.getByRole('textbox',{name:'Quantidade física',exact:true}).fill('0');
 await editor.getByText('Ressalvas e comunicações',{exact:true}).click();
 await editor.getByRole('button',{name:'Acrescentar comunicação',exact:true}).click();
 await editor.getByRole('textbox',{name:'Pessoa ou referência histórica',exact:true}).fill('Responsável fictício a consultar');
 await editor.getByRole('textbox',{name:'Base da declaração',exact:true}).fill('Aguardar conferência pessoal do registro físico sob guarda autorizada');
 for(const width of [320,390,768,1024,1440]){
  await page.setViewportSize({width,height:1000});
  await editor.getByRole('textbox',{name:'O que aconteceu?',exact:true}).focus();
  await audit(page,'contingency declaration '+width);
 }
 const checked=await review(page);
 await expect(checked).toContainText('0 unidade');
 await expect(checked).toContainText('Quem declara');
 await page.keyboard.press('Tab');
 await expect(checked.getByRole('button',{name:'Voltar ao preenchimento',exact:true})).toBeFocused();
 await page.keyboard.press('Tab');
 const confirm=checked.getByRole('button',{name:'Confirmar declaração',exact:true});
 await expect(confirm).toBeFocused();
 await confirm.press('Enter');
 await openConfirmedDossier(page,'Declaração registrada');
 const id=sql('select id from private.contingency_cases where care_recipient_id='+q(f.patient)+' order by created_at desc limit 1'),body=JSON.parse(sql('select content from private.contingency_cases where id='+q(id)));
 expect(body.receiver).toBeNull();expect(body.occurredOn).toBeNull();expect(body.materials[0].quantity).toBe('0');expect(body.materials[0].unit).toBe('unidade');expect(body.communications[0].state).toBe('pending');expect(count(f.patient)).toBe(1);
 await page.getByRole('tab',{name:'Materiais',exact:true}).click();await expect(page.getByRole('tabpanel',{name:'Materiais',exact:true})).toContainText('0 unidade');
 await page.getByRole('tab',{name:'Fatos',exact:true}).click();
 const detail=page.getByRole('region',{name:'Dossiê selecionado',exact:true});await detail.getByRole('button',{name:'Adicionar anexo',exact:true}).click();const attachment=page.getByRole('dialog',{name:'Adicionar anexo',exact:true});const png=await sharp({create:{width:16,height:16,channels:3,background:'white'}}).png().toBuffer();await attachment.getByLabel('Adicionar foto ou PDF',{exact:true}).setInputFiles({name:'registro-fisico-ficticio.png',mimeType:'image/png',buffer:png});await attachment.getByRole('button',{name:'Enviar anexo',exact:true}).click();await expect(detail.getByRole('link',{name:'registro-fisico-ficticio.png',exact:true})).toBeVisible();
 await page.getByRole('tab',{name:'Histórico',exact:true}).click();await expect(detail.getByRole('heading',{name:'Evidência anexada',exact:true})).toBeVisible();
 await expect(detail.getByText(/registro-fisico-ficticio\.png/).filter({visible:true})).toHaveCount(1);
 const other=await browser.newContext();try{const family=await other.newPage();await login(family,'family',f.patient);await family.goto(target(f.patient,id));await family.getByRole('button',{name:'Conferir e vincular',exact:true}).click();let decision=family.getByRole('dialog',{name:'Conciliar declaração de contingência',exact:true});await decision.getByRole('combobox',{name:'Decisão de conciliação',exact:true}).selectOption('link_existing');await decision.getByRole('combobox',{name:'Registro existente',exact:true}).selectOption(req.id);await decision.getByRole('textbox',{name:'Motivo e base da regularização',exact:true}).fill('Registro físico comparado com a requisição já existente; desconhecidos preservados, sem novo movimento.');await decision.getByRole('button',{name:'Revisar regularização',exact:true}).click();decision=family.getByRole('dialog',{name:'Revisar conciliação',exact:true});await expect(decision.getByRole('heading',{name:'Confira a decisão e sua referência',exact:true})).toBeFocused();await expect(decision.locator('input,textarea,select')).toHaveCount(0);await audit(family,'contingency independent decision');await decision.getByRole('button',{name:'Confirmar conciliação',exact:true}).click();await expect(family.getByText('O vínculo preserva a declaração e as evidências conferidas, sem novo crédito, débito, ciência ou recebimento.',{exact:false})).toBeVisible();expect(count(f.patient)).toBe(1);
 const event=JSON.parse(sql('select body from private.contingency_events where case_id='+q(id)));expect(event.targetId).toBe(req.id);expect(event.evidence).toHaveLength(1);
 for(const width of [320,390,768,1024,1440]){await family.setViewportSize({width,height:1000});await auditFromTop(family,'contingency linked dossier '+width);}await family.setViewportSize({width:390,height:1000});await family.screenshot({path:'output/playwright/phase-d/contingency-'+info.project.name+'.png',fullPage:true});
 }finally{await other.close();}expect(facts(f.patient)).toBe(before);
});

test('contingency lost response recovers after reload and a fenced unsent intent rejects its delayed arrival',async({page})=>{
 const f=await setup(),before=facts(f.patient),text='Declaração física fictícia com resposta oficial perdida, sem rascunho comum.';await login(page,'professional',f.patient);await page.goto(target(f.patient));
 await page.route('**/api/contingencies',async route=>{if(route.request().method()!=='POST'||route.request().postDataJSON().action!=='record')return route.continue();const response=await route.fetch();expect(response.status()).toBe(200);await route.abort('failed');},{times:1});
 await start(page,text);const checked=await review(page);await checked.getByRole('button',{name:'Confirmar declaração',exact:true}).click();await expect(page.getByRole('dialog',{name:'Resultado da declaração a conferir',exact:true})).toBeVisible();expect(count(f.patient)).toBe(1);expect(await page.evaluate(()=>Object.keys(sessionStorage).filter(k=>k.startsWith('hca:contingency-intent:')).map(k=>sessionStorage.getItem(k)).join(''))).not.toContain(text);
 page.on('dialog',d=>void d.accept());await page.reload();await page.getByRole('button',{name:'Conferir resultado e encerrar tentativa pendente',exact:true}).click();await openConfirmedDossier(page,'Declaração localizada');expect(count(f.patient)).toBe(1);
 await page.getByRole('button',{name:'Fechar dossiê',exact:true}).click();let delayed:Record<string,unknown>|null=null;await page.route('**/api/contingencies',route=>{if(route.request().method()!=='POST'||route.request().postDataJSON().action!=='record')return route.continue();delayed=route.request().postDataJSON();return route.abort('failed');},{times:1});await start(page,'Segunda declaração fictícia, interrompida antes de alcançar o banco.');const second=await review(page);await second.getByRole('button',{name:'Confirmar declaração',exact:true}).click();const failure=page.getByRole('dialog',{name:'Resultado da declaração a conferir',exact:true});await failure.getByRole('button',{name:'Conferir resultado',exact:true}).click();await expect(page.getByRole('dialog',{name:'Tentativa encerrada sem execução',exact:true})).toBeVisible();expect(delayed).not.toBeNull();expect((await page.request.post('/api/contingencies',{data:delayed!})).status()).toBe(409);expect(count(f.patient)).toBe(1);expect(facts(f.patient)).toBe(before);
});

test('E12-05 compares catalogue precision, preserves other facts and appends a confirmed supplement',async({page},info)=>{
 const f=await setup(),before=facts(f.patient);
 const {product_id:editableMaterial}=await rpc(f.admin,'admin_upsert_recipient_product',{
  p_care_recipient_id:f.patient,p_product_id:null,p_name:'Material sem movimentação',p_category:'higiene',
  p_unit:'unidade',p_aliases:[],p_is_active:true,
 });
 await login(page,'professional',f.patient);
 await page.goto(target(f.patient));
 const fact='Materiais contados no armário e anotados durante a interrupção.';
 const editor=await start(page,fact);
 await addMaterial(page,editor,'Material sem movimentação');
 await editor.getByRole('textbox',{name:'Quantidade física',exact:true}).fill('3');
 await addMaterial(page,editor,'Material fictício V4 1');
 await editor.getByRole('checkbox',{name:'Não sei informar a quantidade',exact:true}).nth(1).check();
 await editor.getByText('Referência, data e pessoas',{exact:true}).click();
 await editor.getByRole('checkbox',{name:'Não sei informar: Referência física',exact:true}).uncheck();
 await editor.getByRole('textbox',{name:'Referência física',exact:true}).fill('Armário · folha 4');
 await editor.getByText('Referência, data e pessoas',{exact:true}).click();
 await page.setViewportSize({width:390,height:709});
 await editor.locator('.hca-modal-content').evaluate(element=>element.scrollTo(0,0));
 await page.screenshot({path:'output/playwright/l4/contingency-declaration-'+info.project.name+'.png',animations:'disabled'});
 const checked=await review(page);
 await page.screenshot({path:'output/playwright/l4/contingency-review-'+info.project.name+'.png',animations:'disabled'});
 sql('update public.care_recipient_products set quantity_decimals=2 where care_recipient_id='+q(f.patient)+' and product_id='+q(editableMaterial));
 await checked.getByRole('button',{name:'Confirmar declaração',exact:true}).click();
 await checked.getByRole('button',{name:'Conferir unidade',exact:true}).click();
 const comparison=page.getByRole('dialog',{name:'Confira a unidade atual',exact:true});
 await expect(comparison).toContainText('Casas decimais atuais');
 await expect(comparison.getByText('2',{exact:true})).toBeVisible();
 await page.screenshot({path:'output/playwright/l4/contingency-conflict-'+info.project.name+'.png',animations:'disabled'});
 expect(count(f.patient)).toBe(0);
 await comparison.getByRole('button',{name:'Usar unidade atual',exact:true}).click();
 await expect(editor.getByRole('textbox',{name:'O que aconteceu?',exact:true})).toHaveValue(fact);
 await expect(editor.getByRole('textbox',{name:'Quantidade física',exact:true})).toHaveValue('');
 await expect(editor.getByRole('checkbox',{name:'Não sei informar a quantidade',exact:true}).nth(1)).toBeChecked();
 await editor.getByRole('textbox',{name:'Quantidade física',exact:true}).fill('2,5');
 await editor.getByText('Referência, data e pessoas',{exact:true}).click();
 await expect(editor.getByRole('textbox',{name:'Referência física',exact:true})).toHaveValue('Armário · folha 4');
 await (await review(page)).getByRole('button',{name:'Confirmar declaração',exact:true}).click();
 await openConfirmedDossier(page,'Declaração registrada');
 const dossier=page.getByRole('dialog',{name:'Armário · folha 4',exact:true});
 await dossier.getByRole('button',{name:'Complementar',exact:true}).click();
 const supplement=page.getByRole('dialog',{name:'Acrescentar informações',exact:true});
 await supplement.getByRole('textbox',{name:'O que aconteceu?',exact:true}).fill('Complemento que não será confirmado.');
 await supplement.getByRole('button',{name:'Fechar',exact:true}).click();
 await page.getByRole('dialog',{name:'Sair sem concluir?',exact:true}).getByRole('button',{name:'Sair e descartar',exact:true}).click();
 await dossier.getByRole('button',{name:'Complementar',exact:true}).click();
 const added='A folha também indicava que as caixas estavam com a família.';
 await expect(supplement.getByRole('textbox',{name:'O que aconteceu?',exact:true})).toHaveValue('');
 await supplement.getByRole('textbox',{name:'O que aconteceu?',exact:true}).fill(added);
 const supplementReview=await review(page);
 const caseId=sql('select id from private.contingency_cases where care_recipient_id='+q(f.patient));
 const concurrent='Foi localizada uma segunda folha na pasta de registros.';
 await rpc(f.admin,'contingency_command',contingencyPacket(f.patient,'REQ',{
  p_id:caseId,p_expected:1,p_action:'supplement',p_body:contingencyBody({fact:concurrent}),
 }));
 await supplementReview.getByRole('button',{name:'Confirmar declaração',exact:true}).click();
 const latest=page.getByRole('dialog',{name:'Confira a versão atual do dossiê',exact:true});
 await expect(latest).toContainText(concurrent);
 await latest.getByRole('button',{name:'Usar esta versão',exact:true}).click();
 await expect(supplementReview).toContainText(added);
 await supplementReview.getByRole('button',{name:'Confirmar declaração',exact:true}).click();
 await openConfirmedDossier(page,'Complemento registrado');
 await expect(dossier).toContainText(fact);
 await dossier.getByRole('tab',{name:'Histórico',exact:true}).click();
 await expect(dossier).toContainText(added);
 await expect(dossier).toContainText(concurrent);
 const body=JSON.parse(sql('select content from private.contingency_cases where care_recipient_id='+q(f.patient)));
 expect(body.materials.map((row:{quantity:string|null})=>row.quantity)).toEqual(['2.5',null]);
 expect(body.knownReference).toBe('Armário · folha 4');
 expect(count(f.patient)).toBe(1);
 expect(facts(f.patient)).toBe(before);
});

test('E12-05 stops after two recovery attempts and retains only the official reference',async({page})=>{
 const f=await setup(),before=facts(f.patient);
 await login(page,'professional',f.patient);
 await page.goto(target(f.patient));
 let writes=0,recoveries=0;
 await page.route('**/api/contingencies',route=>{
  if(route.request().method()!=='POST')return route.continue();
  if(route.request().postDataJSON().action==='resolve')recoveries++;
  else writes++;
  return route.abort('failed');
 });
 const text='Declaração fictícia interrompida enquanto a confirmação estava sendo enviada.';
 await start(page,text);
 await (await review(page)).getByRole('button',{name:'Confirmar declaração',exact:true}).click();
 const failure=page.getByRole('dialog',{name:'Resultado da declaração a conferir',exact:true});
 const recover=failure.getByRole('button',{name:'Conferir resultado',exact:true});
 for(const attempt of [1,2]){
  await recover.click();
  await expect.poll(()=>recoveries).toBe(attempt);
 }
 await expect(failure.getByRole('button',{name:'Copiar detalhes',exact:true})).toBeVisible();
 await expect(recover).toHaveCount(0);
 expect(writes).toBe(1);
 const metadata=await page.evaluate(()=>{
  const key=Object.keys(sessionStorage).find(key=>key.startsWith('hca:contingency-intent:'));
  return key?JSON.parse(sessionStorage.getItem(key)??'null'):null;
 });
 expect(Object.keys(metadata).sort()).toEqual(['action','actorId','key','patientId','process','recoveryAttempts']);
 expect(metadata.recoveryAttempts).toBe(2);
 expect(count(f.patient)).toBe(0);
 expect(facts(f.patient)).toBe(before);
});

test('contingency conflicting review preserves the reason and requires explicit comparison before another confirmation',async({page})=>{
 const f=await setup(),pro=await actor('professional',f.patient),created=await recordContingency(pro,f.patient),before=facts(f.patient);await login(page,'family',f.patient);await page.goto(target(f.patient,created.caseId));await page.getByRole('button',{name:'Conferir e vincular',exact:true}).click();let d=page.getByRole('dialog',{name:'Conciliar declaração de contingência',exact:true});const reason='Solicitar identificação física antes da conciliação definitiva.';await d.getByRole('textbox',{name:'Motivo e base da regularização',exact:true}).fill(reason);
 await rpc(pro,'contingency_command',contingencyPacket(f.patient,'REQ',{p_id:created.caseId,p_expected:1,p_action:'supplement',p_body:contingencyBody({receiver:'Referência histórica acrescentada por quem registrou o fato'})}));await d.getByRole('button',{name:'Revisar regularização',exact:true}).click();d=page.getByRole('dialog',{name:'Revisar conciliação',exact:true});await d.getByRole('button',{name:'Confirmar conciliação',exact:true}).click();await expect(d.getByRole('alert').filter({hasText:'A referência da contingência mudou'})).toBeVisible();await d.getByRole('button',{name:'Consultar resultado desta tentativa',exact:true}).click();await d.getByRole('button',{name:'Usar esta revisão após a conferência',exact:true}).click();d=page.getByRole('dialog',{name:'Conciliar declaração de contingência',exact:true});await expect(d.getByRole('textbox',{name:'Motivo e base da regularização',exact:true})).toHaveValue(reason);await d.getByRole('button',{name:'Revisar regularização',exact:true}).click();await page.getByRole('button',{name:'Confirmar conciliação',exact:true}).click();await expect(page.getByText('Operação registrada com autoria e referências próprias.',{exact:false})).toBeVisible();expect(sql('select count(*) from private.contingency_events where case_id='+q(created.caseId))).toBe('2');expect(facts(f.patient)).toBe(before);
});

test('contingency account context and strict queries refuse unrelated sessions without leaking or creating a dossier',async({page,browser})=>{
 const f=await preparedPatient();await login(page,'global',null);let reads=0;page.on('request',r=>{if(new URL(r.url()).pathname==='/api/contingencies')reads++;});await page.goto(target(f.patient));await expect(page.getByRole('region',{name:'Mudar perfil',exact:true})).toBeVisible();expect(reads).toBe(0);expect((await page.request.get('/api/contingencies?careRecipientId='+f.patient+'&process=REQ')).status()).toBe(404);
 const peer=await browser.newContext();try{const family=await peer.newPage();await login(family,'family',f.patient);const packet={careRecipientId:f.patient,process:'REQ',expectedActorId:fixtures.global.id,idempotencyKey:randomUUID(),action:'record',content:contingencyBody()};const denied=await family.request.post('/api/contingencies',{data:packet});expect(denied.status()).toBe(409);expect((await denied.json()).code).toBe('CONTEXT_REQUIRED');expect(count(f.patient)).toBe(0);
 for(const query of ['','careRecipientId='+f.patient,'careRecipientId='+f.patient+'&process=REQ&process=COM','careRecipientId='+f.patient+'&process=REQ&role=admin'])expect((await family.request.get('/api/contingencies?'+query)).status()).toBe(400);
 const good=await family.request.get('/api/contingencies?careRecipientId='+f.patient.toUpperCase()+'&process=REQ');expect(good.status()).toBe(200);expect(good.headers()['cache-control']).toContain('no-store');
 }finally{await peer.close();}
});
