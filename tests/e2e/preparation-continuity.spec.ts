import { selectProfileSection } from "./profile-sections";
import { expect,test,type Page,type Request as BrowserRequest } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { fixtures,setup } from "../integration/v4-fixtures.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { sql,sqlLiteral } from "../../scripts/test-environment.mjs";
import { selectContext } from "./auth-context";
import { openFlowSuggestions } from "./navigation";
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

test("E12-03 cria direto da revisão e recupera a mesma residência sem vínculo implícito", async ({ page, browser }) => {
  await login(page, "global", null);
  const before = Number(sql("select count(*) from public.care_recipients;"));
  const denied = await page.request.post("/api/admin", {
    data: { action: "recipient", id: null, displayName: "Cadastro inativo fictício rejeitado no legado",
      isActive: false, isDevelopment: true, initialAdministratorEmail: fixtures.family.email },
  });
  expect(denied.status()).toBe(400);
  const name = "Residência fictícia de criação direta " + randomUUID().slice(0, 8);
  const drafts = () => sql(`select count(*) from private.residence_preparations where content->>'displayName'=${sqlLiteral(name)} and state='draft';`);
  await page.goto("/preparar-residencia");
  const panel = page.getByRole("form", { name: "Preparação da residência", exact: true });
  const residenceName = panel.getByRole("textbox", { name: "Nome da residência", exact: true });
  await residenceName.fill(name);
  await panel.getByRole("combobox", { name: "Estado inicial", exact: true }).selectOption("false");
  await choose(page, "Fuso da residência", "America/Manaus");
  const email = panel.getByRole("textbox", { name: "E-mail da conta administradora inicial", exact: true });
  await email.fill("sem-conta-" + randomUUID() + "@example.test");
  await expect(panel.getByRole("combobox", { name: "Titular da continuidade", exact: true })).toBeEnabled({ timeout: 90_000 });
  await choose(page, "Titular da continuidade", nameOf("global"));
  await choose(page, "Substituto da continuidade", nameOf("adminA"));
  await panel.getByRole("spinbutton", { name: "Prazo de resposta, em minutos", exact: true }).fill("75");
  const reviewButton = panel.getByRole("button", { name: "Revisar criação", exact: true });
  await reviewButton.click();
  const conflict = page.getByRole("dialog", { name: "Conta administradora a conferir", exact: true });
  await expect(conflict).toContainText("ativa e confirmada");
  await conflict.getByRole("button", { name: "Voltar ao preenchimento", exact: true }).click();
  await expect(residenceName).toHaveValue(name);
  await email.fill(fixtures.family.email);
  await reviewButton.click();
  const review = page.getByRole("dialog", { name: "Confira antes de criar", exact: true });
  await expect(review.locator("input,textarea,select")).toHaveCount(0);
  await expect(review.getByText("Inativo", { exact: true })).toBeVisible();
  await expect(review.getByText("America/Manaus", { exact: true })).toBeVisible();
  await expect(review.getByText(nameOf("family"), { exact: true })).toBeVisible();
  expect(Number(sql("select count(*) from public.care_recipients;"))).toBe(before);
  expect(drafts()).toBe("0");

  const packets: Array<{ idempotencyKey: string }> = [];
  const consulted: string[] = [];
  await page.route("**/api/residence-preparations**", async route => {
    const req = route.request();
    if (req.method() === "GET") {
      consulted.push(new URL(req.url()).searchParams.get("attempt") ?? "");
      if (consulted.length <= 2) return route.fulfill({ status: 503, json: { error: "Consulta temporariamente indisponível" } });
      return route.continue();
    }
    if (req.postDataJSON().action !== "create") return route.continue();
    packets.push(req.postDataJSON());
    const recorded = await route.fetch();
    expect(recorded.ok(), await recorded.text()).toBe(true);
    return route.abort("failed");
  });
  await review.getByRole("button", { name: "Criar residência", exact: true }).click();
  const pending = page.getByRole("dialog", { name: "Criação ainda sem confirmação", exact: true });
  await expect(pending).toBeVisible();
  const hint = await page.evaluate(() => {
    const key = Object.keys(sessionStorage).find(item => item.startsWith("hca:residence-creation:"));
    return key ? JSON.parse(sessionStorage.getItem(key) ?? "null") : null;
  });
  expect(hint).toEqual({ key: packets[0].idempotencyKey, retries: 0 });
  await page.reload();
  await expect(pending).toBeVisible();
  await pending.getByText("Ajuda para resolver", { exact: true }).click();
  await expect(pending).toContainText(packets[0].idempotencyKey);
  await pending.getByRole("button", { name: "Conferir resultado", exact: true }).click();
  await expect(pending).toBeVisible();
  await pending.getByRole("button", { name: "Conferir resultado", exact: true }).click();
  const success = page.getByRole("dialog", { name: "Residência criada", exact: true });
  await expect(success).toBeVisible();
  await success.getByRole("button", { name: "Acompanhar tarefas locais", exact: true }).click();
  await expect(page.getByRole("region", { name: "Cadastro confirmado", exact: true })).toContainText(nameOf("global"));
  expect(consulted).toEqual(Array(3).fill(packets[0].idempotencyKey));
  expect(packets).toHaveLength(1);
  const patient = sql(`select id from public.care_recipients where display_name=${sqlLiteral(name)};`);
  expect(Number(sql("select count(*) from public.care_recipients;"))).toBe(before + 1);
  expect(drafts()).toBe("0");
  expect(sql(`select count(*) from public.care_recipient_memberships where care_recipient_id=${sqlLiteral(patient)} and user_id=${sqlLiteral(fixtures.global.id)};`)).toBe("0");

  const tasks = page.getByRole("region", { name: "Próximos passos", exact: true });
  await expect(tasks.getByRole("button")).toHaveCount(6);
  await tasks.getByRole("button", { name: "Escalas e responsabilidades" }).click();
  const local = page.getByRole("dialog", { name: "Continue no vínculo local", exact: true });
  await expect(local).toContainText(name);
  await expect(local.getByRole("link")).toHaveCount(0);
  await local.getByRole("button", { name: "Voltar", exact: true }).click();

  const second = await browser.newContext();
  try {
    const family = await second.newPage();
    await login(family, "family", patient);
    expect((await family.request.get("/api/residence-preparations?attempt=" + packets[0].idempotencyKey)).status()).toBe(403);
    const inactive = await family.request.post("/api/documents", {
      data: { careRecipientId: patient, type: "COM", payload: { origin: "purchase", lines: [{ productId: "inactive-fixture-product", quantity: "1" }] },
        idempotencyKey: randomUUID(), draft: false },
    });
    expect(inactive.status()).toBe(409);
    expect(await inactive.json()).toMatchObject({ code: "PATIENT_INACTIVE" });
    expect(sql(`select count(*) from public.operational_documents where care_recipient_id=${sqlLiteral(patient)};`)).toBe("0");
    await family.goto("/preparar-residencia");
    await expect(family.getByText("Somente a administração global inicia uma residência.", { exact: false })).toBeVisible();
    await expect(family.getByRole("form", { name: "Preparação da residência" })).toHaveCount(0);
  } finally { await second.close(); }
});

test("C-FINAL023 guia não mantém tarefa recusada nem pede editar resultado e recupera foco na consulta", async ({ page }) => {
  const f = await setup(); await login(page, "adminA", f.patient); await page.goto("/guias");
  const panel = guide(page), forward = panel.getByRole("button", { name: "Concluir orientação", exact: true });
  const readFailure = page.getByRole("dialog", { name: "Não foi possível consultar o guia", exact: true });
  await expect(forward).toBeVisible();
  const initial = (await (await page.request.get("/api/guides")).json()).data;
  const official = sql(`select jsonb_build_object('members',(select jsonb_agg(to_jsonb(m) order by user_id) from public.care_recipient_memberships m where care_recipient_id=${sqlLiteral(f.patient)}),'documents',(select count(*) from public.operational_documents where care_recipient_id=${sqlLiteral(f.patient)}),'ledger',(select count(*) from public.stock_movements where care_recipient_id=${sqlLiteral(f.patient)}));`);
  let writes = 0;
  page.on("request", request => { if (new URL(request.url()).pathname === "/api/guides" && request.method() !== "GET") writes++; });
  await page.route("**/api/guides", route => route.request().method() === "GET" ? route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ error: "Consulta fictícia de guia indisponível", code: "READ_UNAVAILABLE" }) }) : route.continue(), { times: 2 });
  await panel.getByRole("button", { name: /^(Desabilitar|Habilitar) apresentação inicial$/ }).click();
  await page.getByRole("dialog", {name:"Apresentação atualizada"}).getByRole("button", {name:"Concluir",exact:true}).click();
  await expect(readFailure).toContainText("Consulta fictícia de guia indisponível");
  await expect(panel.locator("nav")).toHaveCount(0); await expect(panel.locator('[aria-invalid="true"]')).toHaveCount(0);
  await expect(readFailure.getByRole("button", { name: "Consultar guia novamente", exact: true })).toHaveCount(0);
  await page.unroute("**/api/guides");
  const refresh = panel.getByRole("button", { name: "Consultar guia novamente", exact: true });
  await readFailure.getByRole("button",{name:"Voltar ao guia",exact:true}).click();
  await expect(refresh).toBeFocused();
  await expect(refresh).toHaveAttribute("aria-disabled","true");
  await page.reload(); await expect(forward).toBeVisible();
  let reads = 0;
  await page.route("**/api/guides", route => {
    reads++;
    return route.fulfill({
      status: reads === 2 ? 200 : 503,
      json: reads === 2 ? { data: null } : { error: "Consulta fictícia de guia indisponível", code: "READ_UNAVAILABLE" },
    });
  });
  await page.reload();
  const queryAgain = readFailure.getByRole("button", {name:"Consultar guia novamente",exact:true});
  await queryAgain.click();
  await queryAgain.click();
  await expect(readFailure.getByRole("button", {name:"Copiar detalhes",exact:true})).toBeVisible();
  await expect(queryAgain).toHaveCount(0);
  expect(reads).toBe(3);
  await expect(panel.locator("nav")).toHaveCount(0);
  await page.unroute("**/api/guides");
  await page.reload();
  await expect(forward).toBeVisible();
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
  const banner=page.getByRole("region",{name:"Apresentação opcional",exact:true});
  await banner.getByRole("button",{name:"Conhecer o guia",exact:true}).click();
  await page.getByRole("dialog",{name:"Conheça sua rotina no sistema"}).getByRole("button",{name:"Pular apresentação",exact:true}).click();
  await page.getByRole("dialog",{name:"Orientação ainda sem confirmação"}).getByRole("button",{name:"Consultar resultado",exact:true}).click();
  await expect(banner).toHaveCount(0);expect(packets[0]).toEqual(packets[1]);
  expect((await(await page.request.get("/api/guides")).json()).data.progress).toMatchObject({revision:1,status:"skipped"});
  await page.goto("/perfil?careRecipientId="+f.patient);await selectProfileSection(page, "help");await expect(guide(page).getByText("Administrador do paciente",{exact:true})).toBeVisible();
  await guide(page).getByRole("button",{name:"Contexto e responsabilidades"}).click();
  const topic = page.getByRole("dialog",{name:"Contexto e responsabilidades"});
  await expect(topic).toBeVisible();
  await topic.getByRole("button",{name:"Voltar aos guias",exact:true}).click();
  expect((await(await page.request.get("/api/guides")).json()).data.progress).toMatchObject({revision:2,status:"started"});
  await guide(page).getByRole("button",{name:"Desabilitar apresentação inicial",exact:true}).click();
  await page.getByRole("dialog", {name:"Apresentação atualizada"}).getByRole("button", {name:"Concluir",exact:true}).click();
  await expect(guide(page).getByRole("button",{name:"Habilitar apresentação inicial",exact:true})).toBeVisible();
  const second=await browser.newContext();try{const pro=await second.newPage();await login(pro,"professional",f.patient);const data=(await(await pro.request.get("/api/guides")).json()).data;expect(data.role).toBe("professional");expect(data.showOnFirstAccess).toBe(false);expect(data.progress.revision).toBe(0);await pro.goto("/guias");await expect(guide(pro).getByText("Profissional",{exact:true})).toBeVisible();expect((await pro.request.post("/api/guides",{data:{action:"configure",careRecipientId:f.patient,expectedRevision:1,showOnFirstAccess:true,idempotencyKey:randomUUID()}})).status()).toBe(403);}finally{await second.close();}
  await widths(page,"D3 personal guide");expect(sql(`select jsonb_build_object('events',(select count(*) from public.document_events where document_id in(select id from public.operational_documents where care_recipient_id=${sqlLiteral(f.patient)})),'members',(select jsonb_agg(to_jsonb(m) order by user_id) from public.care_recipient_memberships m where care_recipient_id=${sqlLiteral(f.patient)}));`)).toBe(before);
});

test("D3 duas sessões atualizam consumo sem apagar edição e resposta antiga não atravessa a troca de paciente",async({page,browser})=>{
  const f=await setup(),other=await setup(),second=await browser.newContext();let release!:()=>void;let held:BrowserRequest|null=null;
  try{const pro=await second.newPage();await login(page,"adminA",f.patient);await login(pro,"professional",f.patient);await page.goto("/consumo?careRecipientId="+f.patient);await page.bringToFront();
    await page.getByRole("button",{name:"Mais opções de consumo",exact:true}).click();
    await page.getByRole("menuitem",{name:"Relatos anteriores",exact:true}).click();const drawer=page.getByRole("dialog",{name:"Registrar relato",exact:true});await drawer.getByLabel("Custódia",{exact:true}).selectOption("FAMILY");await drawer.getByRole("textbox",{name:"O que aconteceu?",exact:true}).fill("Rascunho próprio preservado enquanto outra sessão registra");
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
    await openFlowSuggestions(page);
    const panel=page.locator('section[aria-label="Relatos recebidos por Flow"]');await panel.getByRole("button",{name:"Conferir sugestão",exact:true}).click();const editor=page.getByRole("dialog",{name:"Revisão do Flow",exact:true});await expect.poll(()=>panel.evaluate(el=>Boolean(el.closest('[aria-hidden="true"],[inert]')))).toBe(true);await editor.getByRole("textbox",{name:"Descrição conferida",exact:true}).fill("Minha conferência ainda não enviada");
    const text="Outra sugestão fictícia recebida "+randomUUID().slice(0,8);flow(f.patient,fixtures.professional.id,text);
    await post(peer,"/api/whatsapp/flows/submissions",{id:first,accept:false,kind:"shortage",text:"Descartada pelo titular na segunda sessão",lines:[]});const own=(await(await peer.request.get("/api/whatsapp/flows/submissions?careRecipientId="+f.patient)).json()).data;expect(own.some((row:{id:string})=>row.id===hidden)).toBe(false);
    const items=panel.getByRole("region",{name:"Sugestões pendentes do Flow",exact:true,includeHidden:true}).locator("ul");await page.evaluate(()=>window.dispatchEvent(new Event("online")));await expect(items.getByText(text,{exact:true})).toHaveCount(1);await expect(items.getByText("Primeira sugestão fictícia para conferência",{exact:true})).toHaveCount(0);await expect(editor.getByRole("textbox",{name:"Descrição conferida",exact:true})).toHaveValue("Minha conferência ainda não enviada");
    let entered!:()=>void;const gate=new Promise<void>(r=>{release=r;}),arrived=new Promise<void>(r=>{entered=r;});let hold=true;
    await page.evaluate(()=>{(window as unknown as {hcaIgnoreReadAbort:boolean}).hcaIgnoreReadAbort=true;});await page.route("**/api/whatsapp/flows/submissions?*",async route=>{if(hold&&new URL(route.request().url()).searchParams.get("careRecipientId")===f.patient){hold=false;held=route.request();const response=await route.fetch();entered();await gate;return route.fulfill({response});}return route.continue();});
    await page.evaluate(()=>window.dispatchEvent(new Event("hca:data-changed")));await arrived;const lateResponse=page.waitForResponse(response=>response.request()===held);await post(page,"/api/context",{careRecipientId:other.patient});await page.evaluate(id=>{const url=new URL(window.location.href);url.searchParams.set("careRecipientId",id);window.history.replaceState(null,"",url);window.dispatchEvent(new Event("online"));},other.patient);await expect(editor).toHaveCount(0);await expect(panel).toHaveCount(0);await openFlowSuggestions(page);await expect(panel.getByText("Nenhuma sugestão pendente de confirmação.",{exact:true})).toBeVisible();release();await(await lateResponse).finished();await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));await expect(panel.getByText(text,{exact:true})).toHaveCount(0);await expect(editor.getByLabel("Descrição conferida",{exact:true})).toHaveCount(0);
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
  await page.goto("/consumo?careRecipientId="+f.patient);await openFlowSuggestions(page);const panel=page.locator('section[aria-label="Relatos recebidos por Flow"]');
  for(let number=1;number<=5;number++){await expect(panel.getByText(`Página ${number} de 6 · 101 sugestões`,{exact:true})).toBeVisible();await panel.getByRole("button",{name:"Próxima página de sugestões",exact:true}).click();}
  await expect(panel.getByText("Sugestão antiga paginada 101",{exact:true})).toBeVisible();await panel.getByRole("button",{name:"Conferir sugestão",exact:true}).click();await expect(page.getByRole("dialog",{name:"Revisão do Flow",exact:true}).getByRole("textbox",{name:"Descrição conferida",exact:true})).toHaveValue("Sugestão antiga paginada 101");
  expect(sql(`select count(*) from public.consumption_reports where care_recipient_id=${sqlLiteral(f.patient)};`)).toBe("0");
});
