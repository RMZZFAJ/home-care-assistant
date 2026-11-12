import { isDocumentAccessReport } from "./display-access-report";
import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { setup, rpc, issue, fixtures } from "../integration/v4-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";
import { selectDocumentSection } from "./document-sections";
import { auditFromTop } from "./accessibility-audit";

test.setTimeout(150_000);
const physical = (patient: string) => sql("select jsonb_build_object('documents',(select jsonb_agg(to_jsonb(d) order by id) from public.operational_documents d where care_recipient_id="+q(patient)+"),'events',(select jsonb_agg(to_jsonb(e) order by document_id,version) from public.document_events e where care_recipient_id="+q(patient)+"),'science',(select jsonb_agg(to_jsonb(s) order by id) from public.requisition_science_events s where care_recipient_id="+q(patient)+"),'stock',(select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id="+q(patient)+"));");

test("issued COM, ENT and BAL report foreground access, group reloads and restrict history independently of document reading", async ({ page }) => {
  const f = await setup();await issue(f.patient,[f.products[0]]);
  const docs=[];
  for(const type of ["COM","ENT","BAL"])docs.push(await rpc(f.admin,"create_supply_document",{p_patient:f.patient,p_type:type,p_key:randomUUID(),p_draft:false,p_payload:{...(type==="COM"?{origin:"purchase"}:{}),...(type==="ENT"?{source:"FAMILY",destination:"CARE_TEAM",recipientId:fixtures.professional.id,recipientReason:"Pessoa designada no teste de acesso."}:{}),lines:(type==="BAL"?f.products:[f.products[0]]).map((productId:string)=>({productId,quantity:"1"}))}}));
  const draft=await rpc(f.admin,"create_supply_document",{p_patient:f.patient,p_type:"COM",p_key:randomUUID(),p_draft:true,p_payload:{origin:"purchase",lines:[{productId:f.products[0],quantity:"1"}]}});
  const before=physical(f.patient);
  await page.goto("/login");await page.getByLabel("E-mail",{exact:true}).fill(fixtures.adminA.email);await page.getByLabel("Senha",{exact:true}).fill(fixturePassword);
  await page.getByRole("button",{name:"Entrar",exact:true}).click();await expect(page.getByRole("heading",{name:"Visão geral",exact:true})).toBeVisible();await selectContext(page,f.patient);
  const privateReports:string[]=[];const observe=(request:import("@playwright/test").Request)=>{if(new URL(request.url()).pathname==="/api/documents/"+draft.id+"/access"&&request.method()==="POST")privateReports.push(request.url());};page.on("request",observe);
  await page.goto("/documentos/"+draft.id);await selectDocumentSection(page,"files");await expect(page.getByText("Esta declaração ou rascunho ainda não tem emissão documental definitiva.",{exact:true})).toBeVisible();
  await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));expect(privateReports).toEqual([]);page.off("request",observe);
  expect((await page.request.post("/api/documents/"+draft.id+"/access",{data:{referenceVersion:draft.version,key:randomUUID()}})).status()).toBe(409);
  for(const doc of docs){
    const observed=page.waitForResponse(response=>new URL(response.url()).pathname==="/api/documents/"+doc.id+"/access"&&response.request().method()==="POST");
    await page.goto("/documentos/"+doc.id);const first=await observed;expect(first.status(),await first.text()).toBe(200);expect(isDocumentAccessReport(first.request())).toBe(true);const row=(await first.json()).data;
    await selectDocumentSection(page,"history");const history=page.getByRole("region",{name:"Histórico de acesso à ficha",exact:true});await expect(history.getByRole("listitem")).toHaveCount(1);await expect(history).toContainText("20 minutos");
    await page.setViewportSize({width:320,height:900});await auditFromTop(page,"access history "+doc.type+" 320");expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);
    const again=page.waitForResponse(response=>new URL(response.url()).pathname==="/api/documents/"+doc.id+"/access"&&response.request().method()==="POST");
    await page.reload();const second=await again;expect(second.status()).toBe(200);expect((await second.json()).data).toMatchObject({id:row.id,windowReused:true});
    await selectDocumentSection(page,"history");await expect(history.getByRole("listitem")).toHaveCount(1);
  }
  const target=docs[0];sql("insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values("+[q(f.patient),q(fixtures.adminA.id),q("document.access.read"),"false"].join(",")+")");
  const denied=await page.request.get("/api/documents/"+target.id+"/access");expect(denied.status()).toBe(403);expect(await denied.text()).not.toContain("recordedAt");
  expect((await page.request.get("/api/documents/"+target.id)).status()).toBe(200);
  await page.goto("/documentos/"+target.id);await selectDocumentSection(page,"history");const restricted=page.getByRole("region",{name:"Histórico de acesso à ficha",exact:true});
  await expect(restricted).toContainText(/competência|permissão/);await expect(restricted.getByRole("listitem")).toHaveCount(0);
  expect(physical(f.patient)).toBe(before);
});


test("access-report failure stays in history without moving the ficha controls and recovers only on request", async ({ page }) => {
  const f = await setup();
  const doc = await rpc(f.admin, "create_supply_document", { p_patient: f.patient, p_type: "COM", p_key: randomUUID(), p_draft: false,
    p_payload: { origin: "purchase", lines: [{ productId: f.products[0], quantity: "1" }] } });
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(fixtures.adminA.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible();
  await selectContext(page, f.patient);
  const before = physical(f.patient), endpoint = "/api/documents/" + doc.id + "/access";
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  let intercepted = false;
  await page.route("**" + endpoint, async route => {
    if (route.request().method() !== "POST" || intercepted) return route.continue();
    intercepted = true;
    await held;
    await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "Registro temporariamente indisponível." }) });
  });
  try {
    const report = page.waitForRequest(request => new URL(request.url()).pathname === endpoint && request.method() === "POST");
    await page.goto("/documentos/" + doc.id);
    await report;
    const header = page.getByRole("region", { name: "Resumo da ficha", exact: true });
    const bounds = await header.boundingBox();
    release();
    const retry = page.getByRole("button", { name: "Recuperar registro deste acesso", exact: true, includeHidden: true });
    await expect(retry).toHaveCount(1);
    await expect(retry).not.toBeVisible();
    expect(await header.boundingBox()).toEqual(bounds);
    await selectDocumentSection(page, "workflow");
    await selectDocumentSection(page, "history");
    await expect(retry).toBeVisible();
    const recovered = page.waitForResponse(response => new URL(response.url()).pathname === endpoint && response.request().method() === "POST");
    await retry.click();
    expect((await recovered).status()).toBe(200);
    await expect(retry).toHaveCount(0);
    await expect(page.getByRole("region", { name: "Histórico de acesso à ficha", exact: true }).getByRole("listitem")).toHaveCount(1);
    expect(physical(f.patient)).toBe(before);
  } finally {
    release();
    await page.unrouteAll({ behavior: "wait" });
  }
});
