import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, readFileSync } from "node:fs";
import { fixtureFile } from "../../scripts/test-environment.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { setup, rpc } from "../integration/v4-fixtures.mjs";
import { balanceSetup, dayOffset, localToday, shiftCommand, shiftWorker } from "../integration/shift-fixtures.mjs";
import { selectContext } from "./auth-context";
import { audit } from "./accessibility-audit";

async function login(page:Page,email:string,patient:string) {
  await page.goto("/login");await page.getByLabel("E-mail",{exact:true}).fill(email);await page.getByLabel("Senha",{exact:true}).fill(fixturePassword);
  await page.getByRole("button",{name:"Entrar",exact:true}).click();await expect(page.getByRole("heading",{name:"Visão geral",exact:true})).toBeVisible();await selectContext(page,patient);
}
async function logout(page:Page) {await page.getByLabel("Menu do usuário",{exact:true}).click();await page.getByRole("menuitem",{name:"Sair",exact:true}).click();await expect(page).toHaveURL(/\/login/);}
async function capture(page:Page,name:string,operational=false) {
  mkdirSync("output/playwright/fluent",{recursive:true});
  const dialog=await page.getByRole("dialog").count()>0,mobile=(page.viewportSize()?.width??1366)<768;
  if(!dialog){await page.getByRole("main").focus();await page.evaluate(()=>window.scrollTo({top:0,behavior:"instant"}));}
  await page.waitForFunction(()=>document.getAnimations().every(a=>a.playState!=="running"||a.effect?.getComputedTiming().iterations===Infinity));
  const frame=()=>page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));await frame();
  await page.screenshot({path:`output/playwright/fluent/${name}.png`,fullPage:!dialog&&!mobile,animations:"disabled"});
  if(mobile&&!dialog){
    await page.evaluate(()=>window.scrollTo({top:document.documentElement.scrollHeight,behavior:"instant"}));await frame();
    const navigation=page.getByRole("navigation",{name:"Navegação do plantão",exact:true});
    if(operational)await expect(navigation).toBeInViewport({ratio:1});
    else await expect(navigation).toHaveCount(0);
    const bounds=await page.evaluate(()=>{
      const nav=document.querySelector('.hca-bottom-navigation')?.getBoundingClientRect();
      return [...document.querySelectorAll('.hca-wizard-actions button')].map(button=>{const r=button.getBoundingClientRect();return{left:r.left,right:r.right,top:r.top,bottom:r.bottom,limit:nav?.top??innerHeight,width:innerWidth};});
    });
    for(const bound of bounds){expect(bound.left).toBeGreaterThanOrEqual(0);expect(bound.right).toBeLessThanOrEqual(bound.width);expect(bound.top).toBeGreaterThanOrEqual(0);expect(bound.bottom).toBeLessThanOrEqual(bound.limit);}
    await page.screenshot({path:`output/playwright/fluent/${name}-rodape.png`,animations:"disabled"});
    await page.evaluate(()=>window.scrollTo({top:0,behavior:"instant"}));await frame();
  }
}

test("BAL por plantão: ativação local, duas etapas, referência, resposta perdida e documento real",async({page},info)=>{
  test.setTimeout(120_000);
  const fixture=JSON.parse(readFileSync(fixtureFile,"utf8"));
  const {patient,admin,products}=await setup(),pro=await shiftWorker(patient),today=localToday();
  const type=await shiftCommand(admin,patient,"type",{name:"Diurno de homologação",startsLocal:"00:00",durationMinutes:1440});
  await shiftCommand(admin,patient,"series",{professionalId:pro.id,shiftTypeId:type.id,timezone:"America/Sao_Paulo",recurrence:"weekly",weekdays:[0,1,2,3,4,5,6],anchorDate:today,validUntil:dayOffset(today,3),notes:"Agenda fictícia do E2E"});
  const policy=await rpc(admin,"patient_governance",{p_patient:patient});
  await rpc(admin,"configure_patient_access",{p_patient:patient,p_kind:"settings",p_change:{balReview:"required"},p_key:crypto.randomUUID(),p_version:policy.data.version});
  await login(page,fixture.adminA.email,patient);await page.goto("/balancos");
  await page.getByRole("button",{name:"Configurar dia e plantão",exact:true}).click();
  const form=page.getByRole("dialog",{name:"Programação do BAL",exact:true});
  await form.getByRole("checkbox",{name:"Processamento automático neste paciente",exact:true}).check();
  await form.getByLabel("Dia do balanço",{exact:true}).selectOption(String(new Date(today+"T12:00:00Z").getUTCDay()));
  await form.getByLabel("Plantão responsável",{exact:true}).selectOption(type.id);
  await form.getByLabel("Justificativa",{exact:true}).fill("Ativação isolada na homologação fictícia");
  await audit(page,"BAL configuration drawer");
  await form.getByRole("button",{name:"Revisar decisão",exact:true}).click();
  await page.getByRole("dialog",{name:"Revisar decisão do balanço",exact:true}).getByRole("button",{name:"Confirmar decisão",exact:true}).click();
  await expect(form).not.toBeVisible();await expect(page.getByText("Ativa neste paciente",{exact:true})).toBeVisible();
  await expect(page.getByRole("link",{name:"Fazer balanço",exact:true})).toHaveCount(0);
  const state=(await(await page.request.get("/api/balances?careRecipientId="+patient)).json()).data;
  const denied=await page.request.post("/api/documents",{data:{careRecipientId:patient,type:"BAL",idempotencyKey:crypto.randomUUID(),payload:{lines:products.map((productId:string)=>({productId,quantity:"0"})),balanceAssignment:{id:state.eligibility.assignment.id,version:state.eligibility.assignment.version,referenceRevision:state.referenceRevision}}}});
  expect(denied.status()).toBe(403);
  await capture(page,"bal-acompanhamento-"+info.project.name);
  await logout(page);await login(page,pro.email,patient);
  await expect(page.getByRole("link",{name:/Balanço do seu plantão/})).toBeVisible();
  await page.getByRole("link",{name:/Balanço do seu plantão/}).click();
  await expect(page.getByRole("heading",{name:"Balanços e plantões",exact:true})).toBeVisible();
  await page.getByRole("main").getByRole("link",{name:"Fazer balanço",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Balanço semanal",exact:true})).toBeVisible();
  await expect(page.getByRole("list",{name:"Barra de etapas; use as setas do teclado para rolar",exact:true}).getByRole("listitem")).toHaveCount(2);
  await expect(page.getByText(/^Referência:/)).toHaveCount(0);
  await page.getByRole("button",{name:"Revisar",exact:true}).click();
  await expect(page.locator('input[aria-invalid="true"]')).toHaveCount(2);
  const catalogue=(await(await page.request.get("/api/catalog?careRecipientId="+patient)).json()).data;
  for(const [index,p] of catalogue.entries()) await page.getByLabel(`${p.name} · ${p.unit}`,{exact:true}).fill(index?"0":"1");
  await expect(page.locator('input[aria-invalid="true"]')).toHaveCount(0);
  await page.getByLabel("Observações da contagem",{exact:true}).fill("Conferência física atual; diferença para revisão familiar.");
  const widths=info.project.name==="chromium"?[320,360,390,428,768,1024,1366,1920]:[390];
  for(const width of widths){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);}
  await capture(page,"bal-contagem-"+info.project.name,true);
  await audit(page,"scheduled BAL count");
  await page.getByRole("button",{name:"Revisar",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Revisão da contagem",exact:true})).toBeVisible();
  await expect(page.getByText("Referência: 0 unidade",{exact:true})).toHaveCount(2);
  await audit(page,"scheduled BAL review");
  await page.getByRole("button",{name:"Voltar",exact:true}).click();
  await expect(page.getByLabel(`${catalogue[0].name} · ${catalogue[0].unit}`,{exact:true})).toHaveValue("1");
  await page.getByRole("button",{name:"Revisar",exact:true}).click();await capture(page,"bal-revisao-"+info.project.name,true);
  let lost=false;
  await page.route("**/api/documents",async route=>{if(route.request().method()==="POST"&&!lost){await route.fetch();lost=true;await route.abort("failed");}else await route.continue();});
  await page.getByRole("button",{name:"Confirmar contagem",exact:true}).click();
  await expect(page.getByRole("button",{name:"Recuperar esta tentativa",exact:true})).toBeVisible();
  await page.getByRole("button",{name:"Recuperar esta tentativa",exact:true}).click();
  await expect(page.getByText("Contagem enviada para revisão. A aprovação ainda está pendente.",{exact:true})).toBeVisible();
  const href=await page.getByRole("link",{name:"Abrir ficha BAL",exact:true}).getAttribute("href");const id=href!.split("/").at(-1);
  const document=(await(await page.request.get("/api/documents/"+id)).json()).data;
  expect(document.status).toBe("submitted");expect(document.payload.balanceContext.professionalId).toBe(pro.id);
  const list=(await(await page.request.get("/api/documents?careRecipientId="+patient+"&type=BAL")).json()).data;
  expect(list).toHaveLength(1);
  const stock=(await(await page.request.get("/api/stock/balances?careRecipientId="+patient)).json()).overview;
  expect(stock.every((p:{team:{confirmed:string}})=>p.team.confirmed==="0")).toBe(true);
  const pdf=await page.request.get("/api/documents/"+id+"/pdf");expect(pdf.ok()).toBe(true);expect((await pdf.body()).length).toBeGreaterThan(1000);
  await capture(page,"bal-conclusao-"+info.project.name,true);
});

test("supervisão solicita adiamento, família decide e o prazo só muda após a aprovação",async({page},info)=>{
  const fixture=JSON.parse(readFileSync(fixtureFile,"utf8"));
  const {patient,pro}=await balanceSetup(),supervisor=await shiftWorker(patient,"supervisor");
  await login(page,supervisor.email,patient);await page.goto("/balancos");
  await expect(page.getByRole("button",{name:"Adiar com decisão familiar",exact:true})).toHaveCount(0);
  await expect(page.getByRole("button",{name:"Configurar dia e plantão",exact:true})).toHaveCount(0);
  const before=(await(await page.request.get("/api/balances?careRecipientId="+patient)).json()).data;
  await page.getByRole("button",{name:"Solicitar adiamento",exact:true}).click();
  const form=page.getByRole("dialog",{name:"Adiamento do BAL",exact:true});
  await expect(form.getByText(/O adiamento depende de aprovação familiar/)).toBeVisible();
  await form.getByLabel("Justificativa",{exact:true}).fill("Necessidade de reorganização justificada na equipe.");
  await form.getByRole("button",{name:"Revisar decisão",exact:true}).click();
  await page.getByRole("dialog",{name:"Revisar decisão do balanço",exact:true}).getByRole("button",{name:"Confirmar decisão",exact:true}).click();
  await expect(form).not.toBeVisible();await expect(page.getByText("Aguardando decisão familiar",{exact:true})).toBeVisible();
  const pending=(await(await page.request.get("/api/balances?careRecipientId="+patient)).json()).data;
  expect(pending.eligibility.assignment.id).toBe(before.eligibility.assignment.id);
  expect(pending.eligibility.assignment.ends_at).toBe(before.eligibility.assignment.ends_at);
  await logout(page);await login(page,fixture.family.email,patient);await page.goto("/balancos");
  await page.getByRole("button",{name:"Aprovar adiamento",exact:true}).click();
  const decision=page.getByRole("dialog",{name:"Decisão familiar",exact:true});
  await decision.getByLabel("Justificativa",{exact:true}).fill("Família aprova a transferência para o próximo plantão.");
  await decision.getByRole("button",{name:"Revisar decisão",exact:true}).click();
  await page.getByRole("dialog",{name:"Revisar decisão do balanço",exact:true}).getByRole("button",{name:"Confirmar decisão",exact:true}).click();
  await expect(decision).not.toBeVisible();await expect(page.getByText("Adiamento autorizado",{exact:true})).toBeVisible();
  const after=(await(await page.request.get("/api/balances?careRecipientId="+patient)).json()).data;
  expect(after.eligibility.assignment.id).not.toBe(before.eligibility.assignment.id);
  expect(after.assignments.find((a:{id:string})=>a.id===before.eligibility.assignment.id).status).toBe("deferred");
  expect(after.assignments.find((a:{id:string})=>a.id===before.eligibility.assignment.id).missed_at).toBeNull();
  expect(after.eligibility.assignment.professional_id).toBe(pro.id);
  await capture(page,"bal-adiamento-familiar-"+info.project.name);
});
