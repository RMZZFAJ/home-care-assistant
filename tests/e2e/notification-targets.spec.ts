import {expect,test,type Page} from "@playwright/test";
import {randomUUID} from "node:crypto";
import {referenceFixture,personalReminderFixture,reminderState} from "../integration/notice-reference-fixtures.mjs";
import {fixturePassword} from "../../scripts/test-constants.mjs";
import {selectContext} from "./auth-context";
import {audit} from "./accessibility-audit";
test.setTimeout(180_000);
test.afterEach(async({page})=>{await page.unrouteAll({behavior:"wait"});});
async function login(page:Page,f:{patient:string;pro:{email:string}}){
 await page.goto("/login");await page.getByLabel("E-mail",{exact:true}).fill(f.pro.email);await page.getByLabel("Senha",{exact:true}).fill(fixturePassword);await page.getByRole("button",{name:"Entrar",exact:true}).click();await expect(page.getByRole("heading",{name:"Visão geral",exact:true})).toBeVisible();await selectContext(page,f.patient);
}
const card=(page:Page)=>page.getByRole("region",{name:"Referência selecionada",exact:true});
const path=(area:string,f:{patient:string},ref:string,kind="reminder")=>area+"?"+new URLSearchParams({careRecipientId:f.patient,ref,refKind:kind});
async function widths(page:Page,label:string){for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});await audit(page,label+" "+width);}}
test("aviso localiza o plantão futuro no fuso próprio, evento BAL e alerta sem criar nova obrigação",async({page})=>{
 const f=await referenceFixture(),before=reminderState(f);await login(page,f);
 await page.goto(path("/notificacoes",f,f.scheduleRef));
 const inbox = await page.request.get("/api/notifications?careRecipientId=" + f.patient + "&q=Plantão+alterado");
 expect(inbox.ok()).toBe(true);
 const scheduleNotice = (await inbox.json()).data.find((row: { reminder_id?: string }) => row.reminder_id === f.scheduleRef);
 expect(scheduleNotice).toBeTruthy();
 const row = page.getByRole("region", { name: "Acompanhamento pessoal", exact: true }).locator(`li[data-notification-id="${scheduleNotice.id}"]`);
 await row.getByRole("button", { name: "Ver aviso de Plantão alterado", exact: true }).click();
 const detail = page.getByRole("dialog", { name: "Plantão alterado", exact: true });
 await detail.getByRole("button", { name: "Abrir escalas e plantões", exact: true }).click();
 await expect(page).toHaveURL(url => url.pathname === "/escalas" && url.searchParams.get("careRecipientId") === f.patient &&
   url.searchParams.get("ref") === f.scheduleRef && url.searchParams.get("refKind") === "reminder");
 await expect(page.getByLabel("Data de referência",{exact:true})).toHaveValue(f.day);await expect(card(page)).toContainText("Alteração fictícia para referência individual");
 await expect(card(page)).toContainText("America/Manaus");await expect(card(page)).toContainText("Referência atual autorizada");await widths(page,"D3 exact future schedule");
 await page.goto(path("/balancos",f,f.balanceRef));await expect(card(page).getByRole("heading",{name:"Atribuição indicada pelo aviso",exact:true})).toBeVisible();await widths(page,"D3 BAL event reference");
 await page.goto(path("/fichas/bal",f,f.legacyBalance));await expect(card(page)).toContainText("não cria uma obrigação retroativa");await expect(page.getByRole("button",{name:/Registrar contagem/})).toHaveCount(0);await expect(card(page).getByRole("link",{name:"Abrir contagem do momento atual",exact:true})).toBeVisible();
 await page.goto(path("/estoque",f,f.alert,"alert"));await expect(card(page)).toContainText("Saldo observado no alerta");await expect(card(page)).toContainText("Saldo oficial consultado agora");await card(page).getByRole("button",{name:"Consultar movimentos deste material",exact:true}).click();await expect(page.getByRole("heading",{name:"Histórico auditável",exact:true})).toBeFocused();await widths(page,"D3 exact stock alert");
 expect(reminderState(f)).toBe(before);
});
test("lembrete pessoal exige revisão e recupera sem ocorrências após recarga e rejeição sem duplicar efeitos",async({page})=>{
 const f=await personalReminderFixture(),before=JSON.parse(reminderState(f)),packets:Record<string,unknown>[]=[];await login(page,f);await page.goto(path("/consumo",f,f.reminder));
 await expect(card(page)).toContainText("Lembrete de registro de ocorrências");expect(JSON.parse(reminderState(f))).toEqual(before);
 let mode="save";
 await page.route("**/api/notifications/target",async route=>{
  if(route.request().method()!=="POST")return route.continue();packets.push(route.request().postDataJSON());
  if(mode==="save"){const response=await route.fetch();expect(response.ok(),await response.text()).toBe(true);return route.abort("failed");}
  if(mode==="denied")return route.fulfill({status:403,json:{code:"FORBIDDEN",error:"Recuperação temporariamente indisponível"}});return route.continue();
 });
 await card(page).getByRole("button",{name:"Declarar que não houve ocorrências",exact:true}).click();expect(JSON.parse(reminderState(f)).reminder.acknowledged_at).toBeNull();await card(page).getByRole("button",{name:"Confirmar ausência de ocorrências",exact:true}).click();await expect(card(page).getByRole("button",{name:"Recuperar resposta do lembrete",exact:true})).toBeVisible();
 mode="denied";await page.reload();await card(page).getByRole("button",{name:"Recuperar resposta do lembrete",exact:true}).click();await expect(card(page)).toContainText("Recuperação temporariamente indisponível");await expect(card(page).getByRole("button",{name:"Recuperar resposta do lembrete",exact:true})).toBeVisible();
 mode="recover";await card(page).getByRole("button",{name:"Recuperar resposta do lembrete",exact:true}).click();await expect(card(page)).toContainText("Confirmação anterior recuperada");expect(packets).toHaveLength(3);expect(packets[1]).toEqual(packets[0]);expect(packets[2]).toEqual(packets[0]);
 const after=JSON.parse(reminderState(f));expect(after.reminder.acknowledged_at).toBeTruthy();expect(after.reports).toBeNull();expect(after.stock).toEqual(before.stock);expect(after.audit.filter((a:{action:string})=>a.action==="shift.no_issues")).toHaveLength(1);await widths(page,"D3 personal reminder recovery");
});
test("ocorrência mantém origem e equipe congeladas, recupera resposta perdida e abre o relato vinculado",async({page})=>{
 const f=await personalReminderFixture(),before=JSON.parse(reminderState(f)),text="Falta fictícia vinculada ao lembrete "+randomUUID(),packets:Record<string,unknown>[]=[];await login(page,f);await page.goto(path("/consumo",f,f.reminder));
 await expect(card(page).getByRole("button",{name:"Registrar consumo deste lembrete",exact:true})).toBeVisible();
 await card(page).getByRole("button",{name:"Avisar falta deste lembrete",exact:true}).click();
 const drawer=page.getByRole("dialog",{name:"Avisar falta à família",exact:true});
 await expect(drawer.getByRole("region",{name:"Origem preservada do relato",exact:true})).toContainText("Estoque da equipe");
 await expect(drawer.getByLabel("Custódia",{exact:true})).toHaveCount(0);
 await drawer.getByLabel("Mensagem para a família",{exact:true}).fill(text);
 await page.route("**/api/consumption/records",async route=>{
  if(route.request().method()!=="POST")return route.continue();
  packets.push(route.request().postDataJSON());
  const response=await route.fetch();expect(response.ok(),await response.text()).toBe(true);
  return route.abort("failed");
 });
 await drawer.getByRole("button",{name:"Enviar aviso",exact:true}).click();
 const recovered=page.waitForResponse(response=>{
  const url=new URL(response.url());
  return url.pathname==="/api/consumption/records" && response.request().method()==="GET"
   && url.searchParams.get("idempotencyKey")===packets[0]?.idempotencyKey;
 });
 await drawer.getByRole("button",{name:"Conferir resultado",exact:true}).click();
 expect((await recovered).ok()).toBe(true);
 await expect(drawer).toHaveCount(0);
 expect(packets).toHaveLength(1);
 expect(packets[0]).toMatchObject({action:"shortage",reminderId:f.reminder});
 const after=JSON.parse(reminderState(f));expect(after.reports).toHaveLength(1);expect(after.reports[0]).toMatchObject({source_reminder_id:f.reminder,body:text,location:"CARE_TEAM",status:"communicated"});expect(after.stock).toEqual(before.stock);
 await expect(page.getByRole("region",{name:"Detalhe do relato",exact:true})).toContainText(text);await page.getByRole("link",{name:"Consultar lembrete de origem",exact:true}).click();await expect(card(page)).toContainText("1 relato(s) vinculado(s)");await card(page).getByRole("link",{name:/Relato de falta/}).click();await expect(page.getByRole("region",{name:"Detalhe do relato",exact:true})).toContainText(text);await page.getByRole("link",{name:"Consultar lembrete de origem",exact:true}).click();await expect(card(page)).toContainText("Lembrete de registro de ocorrências");await widths(page,"D3 linked personal occurrence");
 const all=card(page).getByRole("link",{name:"Consultar todos os relatos deste lembrete",exact:true});await all.click();await expect(page).toHaveURL(new RegExp("sourceReminder="+f.reminder));await expect(page.getByText(text,{exact:true})).toBeVisible();
});
test("referência de outro paciente e confirmação inválida não produzem sucesso aparente",async({page})=>{
 const f=await personalReminderFixture(),other=await personalReminderFixture();await login(page,f);await page.goto(path("/consumo",f,other.reminder));await expect(card(page).getByRole("alert")).toBeVisible();await expect(card(page).getByRole("button",{name:"Declarar que não houve ocorrências",exact:true})).toHaveCount(0);
 await page.goto(path("/consumo",f,f.reminder));const before=reminderState(f);await page.route("**/api/notifications/target",async route=>route.request().method()==="POST"?route.fulfill({status:200,json:{data:{recorded:true}}}):route.continue());await card(page).getByRole("button",{name:"Declarar que não houve ocorrências",exact:true}).click();await card(page).getByRole("button",{name:"Confirmar ausência de ocorrências",exact:true}).click();await expect(card(page).getByRole("button",{name:"Recuperar resposta do lembrete",exact:true})).toBeVisible();await expect(card(page)).toContainText("confirmação reconhecível");expect(reminderState(f)).toBe(before);
});
