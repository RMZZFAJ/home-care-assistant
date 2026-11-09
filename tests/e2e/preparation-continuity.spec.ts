import { expect,test,type Page,type Request as BrowserRequest } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { fixtures,setup } from "../integration/v4-fixtures.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { sql,sqlLiteral } from "../../scripts/test-environment.mjs";
import { selectContext } from "./auth-context";
import { audit } from "./accessibility-audit";
test.setTimeout(180_000);
test.beforeEach(async({page})=>{await page.addInitScript(()=>{
  const native=window.fetch.bind(window);
  window.fetch=(input,init)=>{const url=new URL(typeof input==="string"?input:input instanceof URL?input.href:input.url,window.location.origin),method=init?.method??(input instanceof Request?input.method:"GET");
    const ignore=(window as unknown as {hcaIgnoreReadAbort?:boolean}).hcaIgnoreReadAbort&&method==="GET"&&["/api/consumption","/api/whatsapp/flows/submissions","/api/admin/notifications"].includes(url.pathname);
    return native(input,ignore?{...init,signal:undefined}:init);
  };
});});
test.afterEach(async({page})=>{await page.unrouteAll({behavior:"wait"});});
async function login(page:Page,role:string,patient:string|null){
  await page.goto("/login");await page.getByLabel("E-mail",{exact:true}).fill(fixtures[role].email);await page.getByLabel("Senha",{exact:true}).fill(fixturePassword);await page.getByRole("button",{name:"Entrar",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Visão geral",exact:true})).toBeVisible();await selectContext(page,patient);
}
async function post(page:Page,path:string,data:unknown){const response=await page.request.post(path,{data});expect(response.ok(),await response.text()).toBe(true);return response.json();}
const nameOf=(role:string)=>sql(`select full_name from public.profiles where id=${sqlLiteral(fixtures[role].id)};`);
async function choose(page:Page,label:string,name:string){const field=page.getByRole("combobox",{name:label,exact:true});await field.click();await field.fill(name);await field.press("ArrowDown");await page.getByRole("option",{name,exact:true}).click();}
const guide=(page:Page)=>page.getByRole("region",{name:"Guia do seu perfil",exact:true});
function flow(patient:string,user:string,text:string){
  const session=randomUUID(),id=randomUUID();
  sql(`insert into public.flow_sessions(id,care_recipient_id,user_id,token_hash,expires_at) values(${sqlLiteral(session)},${sqlLiteral(patient)},${sqlLiteral(user)},encode(extensions.digest(${sqlLiteral(session)},'sha256'),'hex'),now()+interval '1 day');
  insert into public.flow_submissions(id,session_id,care_recipient_id,user_id,body) values(${sqlLiteral(id)},${sqlLiteral(session)},${sqlLiteral(patient)},${sqlLiteral(user)},${sqlLiteral(JSON.stringify({kind:"shortage",text,products:[]}))}::jsonb);`);
  return id;
}
async function widths(page:Page,label:string){for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});await page.evaluate(()=>window.scrollTo({top:0,left:0,behavior:"instant"}));await audit(page,label+" "+width);}}

test("D3 preparação global salva antes do cadastro e recupera criação inativa sem duplicar ou conceder vínculo ao criador",async({page,browser})=>{
  await login(page,"global",null);const before=Number(sql("select count(*) from public.care_recipients;"));
  const denied=await page.request.post("/api/admin",{data:{action:"recipient",id:null,displayName:"Cadastro inativo fictício rejeitado no legado",isActive:false,isDevelopment:true,initialAdministratorEmail:fixtures.family.email}});
  expect(denied.status()).toBe(400);expect(Number(sql("select count(*) from public.care_recipients;"))).toBe(before);
  await page.goto("/preparar-residencia");await page.getByRole("button",{name:"Nova preparação",exact:true}).click();
  const panel=page.getByRole("region",{name:"Preparação da residência",exact:true}),name="Residência fictícia navegador "+randomUUID().slice(0,8);
  await panel.getByLabel("Nome da residência",{exact:true}).fill(name);await panel.getByRole("combobox",{name:"Estado inicial",exact:true}).selectOption("false");await choose(page,"Fuso de referência da residência","America/Sao_Paulo");
  await panel.getByLabel("Cadastro de desenvolvimento com dados fictícios",{exact:true}).check();
  await panel.getByRole("button",{name:"Continuar preparação",exact:true}).click();await expect(panel.getByLabel("E-mail da conta administradora inicial",{exact:true})).toBeVisible();
  expect(Number(sql("select count(*) from public.care_recipients;"))).toBe(before);
  await panel.getByLabel("E-mail da conta administradora inicial",{exact:true}).fill(fixtures.family.email);await choose(page,"Titular da continuidade",nameOf("global"));await choose(page,"Substituto da continuidade",nameOf("adminA"));
  await panel.getByLabel("Prazo de resposta em minutos",{exact:true}).fill("60");await panel.getByRole("button",{name:"Salvar e retomar",exact:true}).click();
  await expect(panel.getByText("Etapa de preparação salva.",{exact:false})).toBeVisible();await expect(panel.getByRole("button",{name:"Salvar e retomar",exact:true})).toBeEnabled();
  const another=await browser.newContext();try{const peer=await another.newPage();await login(peer,"global",null);await peer.goto("/preparar-residencia");await peer.getByLabel("Buscar preparação pelo nome",{exact:true}).fill(name);await peer.getByRole("button",{name:"Buscar preparações",exact:true}).click();await peer.getByRole("button",{name:"Retomar preparação "+name,exact:true}).click();const editor=peer.getByRole("region",{name:"Preparação da residência",exact:true});await expect(editor.getByLabel("E-mail da conta administradora inicial",{exact:true})).toHaveValue(fixtures.family.email);await editor.getByLabel("Prazo de resposta em minutos",{exact:true}).fill("90");await editor.getByRole("button",{name:"Salvar e retomar",exact:true}).click();await expect(editor.getByRole("button",{name:"Salvar e retomar",exact:true})).toBeEnabled();
    await panel.getByLabel("Prazo de resposta em minutos",{exact:true}).fill("75");await panel.getByRole("button",{name:"Salvar e retomar",exact:true}).click();const comparison=panel.getByRole("region",{name:"Comparação de revisões",exact:true});await expect(comparison.getByText("Servidor: 90 minutos",{exact:true})).toBeVisible();await expect(panel.getByLabel("Prazo de resposta em minutos",{exact:true})).toHaveValue("75");await comparison.getByRole("button",{name:"Manter meus valores para nova revisão",exact:true}).click();await panel.getByRole("button",{name:"Salvar e retomar",exact:true}).click();await expect(panel.getByRole("button",{name:"Salvar e retomar",exact:true})).toBeEnabled();
  }finally{await another.close();}
  const packets:Record<string,unknown>[]=[];
  await page.route("**/api/residence-preparations",async route=>{
    if(route.request().method()!=="POST"||route.request().postDataJSON().action!=="create")return route.continue();
    packets.push(route.request().postDataJSON());if(packets.length===1){const response=await route.fetch();expect(response.ok()).toBe(true);return route.abort("failed");}return route.continue();
  });
  await panel.getByRole("button",{name:"Revisar criação da residência",exact:true}).click();const review=page.getByRole("dialog",{name:"Revisar criação da residência",exact:true});
  await expect(review.locator("input,textarea,select")).toHaveCount(0);await expect(review.getByText("Inativo",{exact:true})).toBeVisible();await review.getByRole("button",{name:"Confirmar criação da residência",exact:true}).click();
  await expect(review.getByRole("button",{name:"Recuperar a mesma preparação",exact:true})).toBeEnabled();await expect(review.getByRole("button",{name:"Voltar à preparação",exact:true})).toBeDisabled();
  await review.getByRole("button",{name:"Recuperar a mesma preparação",exact:true}).click();await expect(review).toHaveCount(0);expect(packets).toHaveLength(2);expect(packets[0]).toEqual(packets[1]);await expect(panel.getByRole("alert")).toHaveCount(0);
  const patient=sql(`select id from public.care_recipients where display_name=${sqlLiteral(name)};`);expect(Number(sql("select count(*) from public.care_recipients;"))).toBe(before+1);
  expect(sql(`select is_active from public.care_recipients where id=${sqlLiteral(patient)};`)).toBe("f");expect(sql(`select count(*) from public.care_recipient_memberships where care_recipient_id=${sqlLiteral(patient)} and user_id=${sqlLiteral(fixtures.global.id)};`)).toBe("0");
  await panel.getByRole("button",{name:"5. Escalas e BAL",exact:true}).click();
  await expect(panel.locator("input,textarea,select")).toHaveCount(0);
  await expect(panel.getByRole("link",{name:"Preparar escalas",exact:true})).toHaveAttribute("href","/escalas?careRecipientId="+patient);
  await expect(panel.getByRole("link",{name:"Preparar regime BAL",exact:true})).toHaveAttribute("href","/balancos?careRecipientId="+patient);
  await panel.getByRole("button",{name:"6. Comunicação e contingência",exact:true}).click();
  await expect(panel.locator("input,textarea,select")).toHaveCount(0);
  await expect(panel.getByRole("link",{name:"Abrir regras e comunicação",exact:true})).toHaveAttribute("href","/configuracoes?careRecipientId="+patient);
  await expect(panel.getByRole("link",{name:"Consultar orientação de contingência",exact:true})).toHaveAttribute("href","/guias");
  await widths(page,"D3 residence preparation");
  const second=await browser.newContext();try{const family=await second.newPage();await login(family,"family",patient);expect((await family.request.get("/api/residence-preparations")).status()).toBe(403);const inactive=await family.request.post("/api/documents",{data:{careRecipientId:patient,type:"COM",payload:{origin:"purchase",lines:[{productId:"inactive-fixture-product",quantity:"1"}]},idempotencyKey:randomUUID(),draft:false}});expect(inactive.status()).toBe(409);expect(await inactive.json()).toMatchObject({code:"PATIENT_INACTIVE"});expect(sql(`select count(*) from public.operational_documents where care_recipient_id=${sqlLiteral(patient)};`)).toBe("0");await family.goto("/preparar-residencia");await expect(family.getByText("Somente a administração global inicia uma preparação.",{exact:false})).toBeVisible();await expect(family.getByRole("button",{name:"Nova preparação",exact:true})).toHaveCount(0);}finally{await second.close();}
});

test("C-FINAL023 guia não mantém tarefa recusada nem pede editar resultado e recupera foco na consulta", async ({ page }) => {
  const f = await setup(); await login(page, "adminA", f.patient); await page.goto("/guias");
  const panel = guide(page), forward = panel.getByRole("button", { name: "Próxima etapa do guia", exact: true });
  await expect(forward).toBeVisible();
  const initial = (await (await page.request.get("/api/guides")).json()).data;
  const official = sql(`select jsonb_build_object('members',(select jsonb_agg(to_jsonb(m) order by user_id) from public.care_recipient_memberships m where care_recipient_id=${sqlLiteral(f.patient)}),'documents',(select count(*) from public.operational_documents where care_recipient_id=${sqlLiteral(f.patient)}),'ledger',(select count(*) from public.stock_movements where care_recipient_id=${sqlLiteral(f.patient)}));`);
  let writes = 0;
  page.on("request", request => { if (new URL(request.url()).pathname === "/api/guides" && request.method() !== "GET") writes++; });
  await page.route("**/api/guides", route => route.request().method() === "GET" ? route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ error: "Consulta fictícia de guia indisponível", code: "READ_UNAVAILABLE" }) }) : route.continue(), { times: 2 });
  await panel.getByRole("button", { name: /^(Desabilitar|Habilitar) apresentação inicial$/ }).click();
  await expect(panel.getByRole("alert")).toContainText("Consulta fictícia de guia indisponível");
  await expect(forward).toHaveCount(0); await expect(panel.locator('[aria-invalid="true"]')).toHaveCount(0);
  await page.unroute("**/api/guides");
  const refresh = panel.getByRole("button", { name: "Consultar guia novamente", exact: true });
  await refresh.focus(); await refresh.press("Enter"); await expect(forward).toBeVisible(); await expect(refresh).toBeFocused();
  for (const fault of [503, 200]) {
    await page.route("**/api/guides", route => route.fulfill({ status: fault, contentType: "application/json", body: JSON.stringify(fault === 200 ? { data: null } : { error: "Consulta fictícia de guia indisponível", code: "READ_UNAVAILABLE" }) }), { times: 1 });
    await refresh.press("Enter"); await expect(panel.getByRole("alert")).toBeVisible();
    await expect(forward).toHaveCount(0); await expect(panel.locator('[aria-invalid="true"]')).toHaveCount(0);
    await expect(refresh).toBeFocused(); await refresh.press("Enter"); await expect(forward).toBeVisible(); await expect(refresh).toBeFocused();
  }
  const current = (await (await page.request.get("/api/guides")).json()).data;
  expect(current.progress).toEqual(initial.progress); expect(current.showOnFirstAccess).toBe(!initial.showOnFirstAccess);
  expect(writes).toBe(1);
  expect(sql(`select jsonb_build_object('members',(select jsonb_agg(to_jsonb(m) order by user_id) from public.care_recipient_memberships m where care_recipient_id=${sqlLiteral(f.patient)}),'documents',(select count(*) from public.operational_documents where care_recipient_id=${sqlLiteral(f.patient)}),'ledger',(select count(*) from public.stock_movements where care_recipient_id=${sqlLiteral(f.patient)}));`)).toBe(official);
  await widths(page, "immutable guide read");
});

test("D3 guia pode ser pulado recuperado reaberto e configurado sem ciência ou mudança de permissões",async({page,browser})=>{
  const f=await setup();await login(page,"adminA",f.patient);
  await expect(page.getByRole("region",{name:"Apresentação opcional",exact:true})).toBeVisible();await page.goto("/consumo?careRecipientId="+f.patient);await expect(page.getByRole("region",{name:"Apresentação opcional",exact:true})).toHaveCount(0);expect((await(await page.request.get("/api/guides")).json()).data.progress.revision).toBe(0);await page.goto("/");
  const before=sql(`select jsonb_build_object('events',(select count(*) from public.document_events where document_id in(select id from public.operational_documents where care_recipient_id=${sqlLiteral(f.patient)})),'members',(select jsonb_agg(to_jsonb(m) order by user_id) from public.care_recipient_memberships m where care_recipient_id=${sqlLiteral(f.patient)}));`);
  let corrupted=false;const packets:unknown[]=[];
  await page.route("**/api/guides",async route=>{if(route.request().method()!=="POST")return route.continue();packets.push(route.request().postDataJSON());if(!corrupted){corrupted=true;const response=await route.fetch();expect(response.ok()).toBe(true);const actual=await response.json();return route.fulfill({response,json:{data:{...actual.data,scope:randomUUID()}}});}return route.continue();});
  const banner=page.getByRole("region",{name:"Apresentação opcional",exact:true});await banner.getByRole("button",{name:"Pular apresentação",exact:true}).click();await banner.getByRole("button",{name:"Recuperar minha escolha",exact:true}).click();await expect(banner).toHaveCount(0);expect(packets[0]).toEqual(packets[1]);
  await page.goto("/perfil?careRecipientId="+f.patient);await page.getByRole("button",{name:"Guias e ajuda",exact:true}).click();await expect(guide(page).getByRole("heading",{name:"Administrador do paciente",exact:true})).toBeVisible();
  await guide(page).getByRole("button",{name:"Próxima etapa do guia",exact:true}).click();await expect(guide(page).getByText("Etapa 2 de 6",{exact:true})).toBeVisible();
  await guide(page).getByRole("button",{name:"Desabilitar apresentação inicial",exact:true}).click();await expect(guide(page).getByRole("button",{name:"Habilitar apresentação inicial",exact:true})).toBeVisible();
  const second=await browser.newContext();try{const pro=await second.newPage();await login(pro,"professional",f.patient);const data=(await(await pro.request.get("/api/guides")).json()).data;expect(data.role).toBe("professional");expect(data.showOnFirstAccess).toBe(false);expect(data.progress.revision).toBe(0);await pro.goto("/guias");await expect(guide(pro).getByRole("heading",{name:"Profissional",exact:true})).toBeVisible();expect((await pro.request.post("/api/guides",{data:{action:"configure",careRecipientId:f.patient,expectedRevision:1,showOnFirstAccess:true,idempotencyKey:randomUUID()}})).status()).toBe(403);}finally{await second.close();}
  await widths(page,"D3 personal guide");expect(sql(`select jsonb_build_object('events',(select count(*) from public.document_events where document_id in(select id from public.operational_documents where care_recipient_id=${sqlLiteral(f.patient)})),'members',(select jsonb_agg(to_jsonb(m) order by user_id) from public.care_recipient_memberships m where care_recipient_id=${sqlLiteral(f.patient)}));`)).toBe(before);
});

test("D3 duas sessões atualizam consumo sem apagar edição e resposta antiga não atravessa a troca de paciente",async({page,browser})=>{
  const f=await setup(),other=await setup(),second=await browser.newContext();let release!:()=>void;let held:BrowserRequest|null=null;
  try{const pro=await second.newPage();await login(page,"adminA",f.patient);await login(pro,"professional",f.patient);await page.goto("/consumo?careRecipientId="+f.patient);await page.bringToFront();
    await page.getByRole("button",{name:"Registrar ocorrência",exact:true}).click();const drawer=page.getByRole("dialog",{name:"Registrar relato",exact:true});await drawer.getByRole("textbox",{name:"O que aconteceu?",exact:true}).fill("Rascunho próprio preservado enquanto outra sessão registra");
    const text="Nova falta fictícia da segunda sessão "+randomUUID().slice(0,8);await post(pro,"/api/consumption",{action:"report",careRecipientId:f.patient,kind:"shortage",location:"CARE_TEAM",text,lines:[],idempotencyKey:randomUUID()});await page.evaluate(()=>window.dispatchEvent(new Event("online")));
    const list=page.locator('section[aria-label="Relatos registrados"]');await expect(list.getByText(text,{exact:true})).toHaveCount(1);await expect(drawer.getByRole("textbox",{name:"O que aconteceu?",exact:true})).toHaveValue("Rascunho próprio preservado enquanto outra sessão registra");
    let entered!:()=>void;const gate=new Promise<void>(r=>{release=r;}),arrived=new Promise<void>(r=>{entered=r;});let hold=true;
    await page.evaluate(()=>{(window as unknown as {hcaIgnoreReadAbort:boolean}).hcaIgnoreReadAbort=true;});await page.route("**/api/consumption?*",async route=>{if(hold&&new URL(route.request().url()).searchParams.get("careRecipientId")===f.patient){hold=false;held=route.request();const response=await route.fetch();entered();await gate;return route.fulfill({response});}return route.continue();});
    await page.evaluate(()=>window.dispatchEvent(new Event("hca:data-changed")));await arrived;const lateResponse=page.waitForResponse(response=>response.request()===held);await post(page,"/api/context",{careRecipientId:other.patient});await page.evaluate(id=>{const url=new URL(window.location.href);url.searchParams.set("careRecipientId",id);window.history.replaceState(null,"",url);window.dispatchEvent(new Event("online"));},other.patient);
    await expect(page.locator(".hca-workspace")).toHaveAttribute("data-context-patient",other.patient);await expect(drawer).toHaveCount(0);await expect(list.getByText("Nenhum relato encontrado para estes filtros.",{exact:true})).toBeVisible();release();await(await lateResponse).finished();await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));await expect(list.getByText(text,{exact:true})).toHaveCount(0);
    expect(sql(`select count(*) from public.consumption_reports where care_recipient_id=${sqlLiteral(f.patient)};`)).toBe("1");
  }finally{release?.();await second.close();}
});

test("D3 Flow acompanha ingresso controlado e revisão em outra sessão preservando edição e limpando contexto",async({page,browser})=>{
  const f=await setup(),other=await setup(),second=await browser.newContext();let release!:()=>void;let held:BrowserRequest|null=null;
  const first=flow(f.patient,fixtures.professional.id,"Primeira sugestão fictícia para conferência"),hidden=flow(f.patient,fixtures.family.id,"Sugestão privada de outro titular");
  try{const peer=await second.newPage();await login(page,"professional",f.patient);await login(peer,"professional",f.patient);await page.goto("/consumo?careRecipientId="+f.patient);await page.bringToFront();
    const panel=page.locator('section[aria-label="Relatos recebidos por Flow"]');await panel.getByRole("button",{name:"Conferir sugestão",exact:true}).click();await panel.getByRole("textbox",{name:"Descrição conferida",exact:true}).fill("Minha conferência ainda não enviada");
    const text="Outra sugestão fictícia recebida "+randomUUID().slice(0,8);flow(f.patient,fixtures.professional.id,text);
    await post(peer,"/api/whatsapp/flows/submissions",{id:first,accept:false,kind:"shortage",text:"Descartada pelo titular na segunda sessão",lines:[]});const own=(await(await peer.request.get("/api/whatsapp/flows/submissions?careRecipientId="+f.patient)).json()).data;expect(own.some((row:{id:string})=>row.id===hidden)).toBe(false);
    const items=panel.locator(":scope > ul").first();await page.evaluate(()=>window.dispatchEvent(new Event("online")));await expect(items.getByText(text,{exact:true})).toHaveCount(1);await expect(items.getByText("Primeira sugestão fictícia para conferência",{exact:true})).toHaveCount(0);await expect(panel.getByRole("textbox",{name:"Descrição conferida",exact:true})).toHaveValue("Minha conferência ainda não enviada");
    let entered!:()=>void;const gate=new Promise<void>(r=>{release=r;}),arrived=new Promise<void>(r=>{entered=r;});let hold=true;
    await page.evaluate(()=>{(window as unknown as {hcaIgnoreReadAbort:boolean}).hcaIgnoreReadAbort=true;});await page.route("**/api/whatsapp/flows/submissions?*",async route=>{if(hold&&new URL(route.request().url()).searchParams.get("careRecipientId")===f.patient){hold=false;held=route.request();const response=await route.fetch();entered();await gate;return route.fulfill({response});}return route.continue();});
    await page.evaluate(()=>window.dispatchEvent(new Event("hca:data-changed")));await arrived;const lateResponse=page.waitForResponse(response=>response.request()===held);await selectContext(page,other.patient);await expect(panel.getByText("Nenhuma sugestão pendente de confirmação.",{exact:true})).toBeVisible();release();await(await lateResponse).finished();await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));await expect(panel.getByText(text,{exact:true})).toHaveCount(0);await expect(panel.getByLabel("Descrição conferida",{exact:true})).toHaveCount(0);
    expect(sql(`select count(*) from public.consumption_reports where care_recipient_id=${sqlLiteral(f.patient)};`)).toBe("0");
  }finally{release?.();await second.close();}
});

test("D3 fila administrativa atualiza por outra sessão preserva conciliação e descarta resposta do paciente anterior",async({page,browser})=>{
  const f=await setup(),other=await setup(),second=await browser.newContext();let release!:()=>void;let held:BrowserRequest|null=null;
  try{const family=await second.newPage();await login(page,"adminA",f.patient);await login(family,"family",f.patient);
    const emit=()=>post(family,"/api/documents",{careRecipientId:f.patient,type:"COM",payload:{origin:"purchase",lines:[{productId:f.products[0],quantity:"1"}]},idempotencyKey:randomUUID(),draft:false});
    const doc=(await emit()).data,source=sql(`select id from public.requisition_notifications where document_id=${sqlLiteral(doc.id)} and channel='internal' limit 1;`);
    expect(source).toMatch(/^[0-9a-f-]{36}$/);let notice=sql(`select id from public.requisition_notifications where document_id=${sqlLiteral(doc.id)} and channel='whatsapp' limit 1;`);
    if(!notice){notice=randomUUID();const inserted=sql(`insert into public.requisition_notifications(id,care_recipient_id,document_id,recipient_user_id,recipient_group,recipient_label,channel,destination,state,event_key) select ${sqlLiteral(notice)},care_recipient_id,document_id,recipient_user_id,recipient_group,'Resultado externo incerto fictício','whatsapp','+15555550102','uncertain',event_key from public.requisition_notifications where id=${sqlLiteral(source)} returning id;`);expect(inserted).toBe(notice);}else sql(`update public.requisition_notifications set state='uncertain',leased_by=null,lease_expires_at=null where id=${sqlLiteral(notice)};`);
    await page.goto("/admin?section=notifications&careRecipientId="+f.patient);const panel=page.locator('section[aria-label="Acompanhamento de notificações"]'),details=panel.locator("details");await details.getByText("Conciliação de resultado incerto",{exact:true}).click();await expect(details).toHaveAttribute("open","");
    const before=(await(await page.request.get("/api/admin/notifications?careRecipientId="+f.patient)).json()).total;await emit();await page.evaluate(()=>window.dispatchEvent(new Event("online")));
    await expect.poll(()=>panel.locator("li").count()).toBeGreaterThan(before);await expect(details).toHaveAttribute("open","");
    let entered!:()=>void;const gate=new Promise<void>(r=>{release=r;}),arrived=new Promise<void>(r=>{entered=r;});let hold=true;
    await page.evaluate(()=>{(window as unknown as {hcaIgnoreReadAbort:boolean}).hcaIgnoreReadAbort=true;});await page.route("**/api/admin/notifications?*",async route=>{if(hold&&new URL(route.request().url()).searchParams.get("careRecipientId")===f.patient){hold=false;held=route.request();const response=await route.fetch();entered();await gate;return route.fulfill({response});}return route.continue();});
    await page.evaluate(()=>window.dispatchEvent(new Event("hca:data-changed")));await arrived;const lateResponse=page.waitForResponse(response=>response.request()===held);await selectContext(page,other.patient);await expect(panel.getByText("Nenhuma notificação neste paciente.",{exact:true})).toBeVisible();release();await(await lateResponse).finished();await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));await expect(panel.locator("li")).toHaveCount(0);
    expect(sql(`select state from public.requisition_notifications where id=${sqlLiteral(notice)};`)).toBe("uncertain");
  }finally{release?.();await second.close();}
});

test("D3 Flow permite alcançar a sugestão mais antiga entre101 pendências sem truncar a lista",async({page})=>{
  const f=await setup();
  sql(`with sessions as (
    insert into public.flow_sessions(id,care_recipient_id,user_id,token_hash,expires_at)
    select gen_random_uuid(),${sqlLiteral(f.patient)},${sqlLiteral(fixtures.professional.id)},encode(extensions.digest(gen_random_uuid()::text,'sha256'),'hex'),now()+interval '1 day' from generate_series(1,101) returning id
  ), numbered as (select id,row_number() over(order by id)::integer as n from sessions)
  insert into public.flow_submissions(id,session_id,care_recipient_id,user_id,body,created_at)
  select gen_random_uuid(),id,${sqlLiteral(f.patient)},${sqlLiteral(fixtures.professional.id)},jsonb_build_object('kind','shortage','text','Sugestão antiga paginada '||n,'products','[]'::jsonb),now()-make_interval(secs=>n) from numbered;`);
  const oracle=sql(`select string_agg(id::text,',' order by created_at desc,id desc) from public.flow_submissions where care_recipient_id=${sqlLiteral(f.patient)} and user_id=${sqlLiteral(fixtures.professional.id)};`).split(",");
  await login(page,"professional",f.patient);const ids:string[]=[];
  for(const number of [1,2,3]){const response=await page.request.get(`/api/whatsapp/flows/submissions?careRecipientId=${f.patient}&page=${number}&pageSize=50`);expect(response.ok()).toBe(true);const data=await response.json();expect(data.total).toBe(101);expect(data.data).toHaveLength(number===3?1:50);ids.push(...data.data.map((row:{id:string})=>row.id));}
  expect(ids).toEqual(oracle);expect(new Set(ids).size).toBe(101);const bounded=await(await page.request.get(`/api/whatsapp/flows/submissions?careRecipientId=${f.patient}&pageSize=999`)).json();expect(bounded.pageSize).toBe(100);expect(bounded.data).toHaveLength(100);
  await page.goto("/consumo?careRecipientId="+f.patient);const panel=page.locator('section[aria-label="Relatos recebidos por Flow"]');
  for(let number=1;number<=5;number++){await expect(panel.getByText(`Página ${number} de 6 · 101 sugestões`,{exact:true})).toBeVisible();await panel.getByRole("button",{name:"Próxima página de sugestões",exact:true}).click();}
  await expect(panel.getByText("Sugestão antiga paginada 101",{exact:true})).toBeVisible();await panel.getByRole("button",{name:"Conferir sugestão",exact:true}).click();await expect(panel.getByRole("textbox",{name:"Descrição conferida",exact:true})).toHaveValue("Sugestão antiga paginada 101");
  expect(sql(`select count(*) from public.consumption_reports where care_recipient_id=${sqlLiteral(f.patient)};`)).toBe("0");
});
