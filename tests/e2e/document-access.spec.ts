import { isDocumentAccessReport } from "./display-access-report";
import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { setup, rpc, issue, fixtures } from "../integration/v4-fixtures.mjs";
import { shiftWorker } from "../integration/shift-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";
import { selectDocumentSection } from "./document-sections";
import { auditFromTop } from "./accessibility-audit";
import { loginDecision } from "./l1-decision-policy";

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
  let accessWrites = 0;
  await page.route("**" + endpoint, async route => {
    if (route.request().method() !== "POST") return route.continue();
    accessWrites++;
    if (intercepted) return route.continue();
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
    await page.evaluate(() => window.dispatchEvent(new Event("offline")));
    await expect(page.getByText(/^Sem conexão\./)).toBeVisible();
    await page.evaluate(() => window.dispatchEvent(new Event("online")));
    await expect(retry).toBeEnabled();
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))));
    expect(accessWrites).toBe(1);
    const recovered = page.waitForResponse(response => new URL(response.url()).pathname === endpoint && response.request().method() === "POST");
    await retry.click();
    expect((await recovered).status()).toBe(200);
    expect(accessWrites).toBe(2);
    await expect(retry).toHaveCount(0);
    await expect(page.getByRole("region", { name: "Histórico de acesso à ficha", exact: true }).getByRole("listitem")).toHaveCount(1);
    expect(physical(f.patient)).toBe(before);
  } finally {
    release();
    await page.unrouteAll({ behavior: "wait" });
  }
});

test("background ficha refresh keeps the summary stationary and tabs selectable while the retained read is pending", async ({ page }) => {
  const f = await setup();
  const doc = await rpc(f.admin, "create_supply_document", {
    p_patient: f.patient, p_type: "COM", p_key: randomUUID(), p_draft: false,
    p_payload: { origin: "purchase", lines: [{ productId: f.products[0], quantity: "1" }] },
  });
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(fixtures.adminA.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible();
  await selectContext(page, f.patient);
  await page.goto("/documentos/" + doc.id);
  const header = page.getByRole("region", { name: "Resumo da ficha", exact: true });
  const refresh = page.getByRole("button", { name: "Atualizar ficha", exact: true });
  await expect(header).toBeVisible();
  await expect(refresh).toHaveAttribute("aria-disabled", "false");
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  const before = physical(f.patient), bounds = await header.boundingBox();
  let entered!: () => void, release!: () => void;
  const read = new Promise<void>(resolve => { entered = resolve; });
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/documents/" + doc.id, async route => {
    if (route.request().method() !== "GET") return route.continue();
    const response = await route.fetch();
    entered();
    await gate;
    await route.fulfill({ response });
  });
  try {
    await page.evaluate(() => window.dispatchEvent(new Event("hca:data-changed")));
    await read;
    // A background read keeps explicit refresh available; it can replace the
    // older read. Busy feedback stays on the control, without a blocking layer.
    await expect(refresh).toHaveAttribute("aria-disabled", "false");
    await expect(refresh).toHaveAttribute("aria-busy", "true");
    await expect(page.getByRole("dialog", { name: "Consultando a ficha", exact: true })).toHaveCount(0);
    const announcement = page.getByRole("status").filter({ hasText: "Atualizando consulta da ficha…" });
    await expect(announcement).toHaveText("Atualizando consulta da ficha…");
    await expect(announcement).toHaveClass("sr-only");
    await expect(announcement).toHaveCSS("position", "absolute");
    await expect(announcement).toHaveCSS("width", "1px");
    await expect(announcement).toHaveCSS("height", "1px");
    expect(await header.boundingBox()).toEqual(bounds);
    await selectDocumentSection(page, "attachments");
    release();
    await expect(refresh).toHaveAttribute("aria-disabled", "false");
    await expect(refresh).toHaveAttribute("aria-busy", "false");
    await expect(page.getByRole("button", { name: "Anexos", exact: true })).toHaveAttribute("aria-pressed", "true");
    expect(physical(f.patient)).toBe(before);
  } finally {
    release();
    await page.unrouteAll({ behavior: "wait" });
  }
});

test("L2 revogação deixa só o fundo neutro mesmo quando uma leitura autorizada chega atrasada", async ({ page }, info) => {
  const f = await setup();
  const family = await shiftWorker(f.patient, "family");
  const privateNote = "Observação reservada da residência " + randomUUID();
  const patientName = sql(`select display_name from public.care_recipients where id=${q(f.patient)}`);
  const doc = await rpc(f.admin, "create_supply_document", {
    p_patient: f.patient, p_type: "COM", p_key: randomUUID(), p_draft: false,
    p_payload: { origin: "purchase", notes: privateNote, lines: [{ productId: f.products[0], quantity: "2" }] },
  });
  await loginDecision(page, family.email, f.patient);
  await page.goto(`/fichas/${doc.id}`);
  await expect(page.getByRole("heading", { name: doc.code, exact: true })).toBeVisible();
  await expect(page.getByRole("tabpanel", { name: "Visão geral", exact: true }).getByText(privateNote, { exact: true })).toBeVisible();
  const endpoint = "/api/documents/" + doc.id;
  let release!: () => void, captured!: () => void, returned!: () => void;
  const hold = new Promise<void>(resolve => { release = resolve; });
  const first = new Promise<void>(resolve => { captured = resolve; });
  const finished = new Promise<void>(resolve => { returned = resolve; });
  let intercepted = false;
  await page.route("**" + endpoint, async route => {
    if (intercepted || route.request().method() !== "GET") return route.continue();
    intercepted = true;
    const oldResponse = await route.fetch({ maxRetries: 1 });
    expect(oldResponse.ok()).toBe(true);
    captured();
    await hold;
    try { await route.fulfill({ response: oldResponse }); }
    catch { /* Unmounting may cancel the intercepted read before delivery. */ }
    finally { returned(); }
  });
  try {
    await page.evaluate(() => window.dispatchEvent(new Event("hca:data-changed")));
    await first;
    sql(`update public.care_recipient_memberships set status='revoked'
         where care_recipient_id=${q(f.patient)} and user_id=${q(family.id)}`);
    await page.evaluate(() => window.dispatchEvent(new Event("hca:profile-updated")));
    const modal = page.getByRole("dialog", { name: "O acesso à residência foi revogado", exact: true });
    await expect(modal).toBeVisible();
    const returnLink = page.getByRole("link", { name: "Voltar ao início", exact: true });
    await expect(returnLink).toHaveCount(0);
    release();
    await finished;
    await expect(modal).toBeVisible();
    await expect(page.getByText(patientName, { exact: true })).toHaveCount(0);
    await expect(page.getByText(privateNote, { exact: true })).toHaveCount(0);
    await expect(page.locator("[data-document-heading]")).toHaveCount(0);
    await expect(page.locator(".hca-bottom-navigation")).toHaveCount(0);
    const response = await page.request.get(endpoint);
    expect([403, 404]).toContain(response.status());
    expect(await response.text()).not.toContain(privateNote);
    if (info.project.use.hasTouch) await info.attach("E06-17 acesso revogado", {
      body: await page.screenshot({ animations: "disabled", scale: "css" }), contentType: "image/png",
    });
    await modal.getByRole("button", { name: "Entendi", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Acesso encerrado", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Conferir decisão na minha conta", exact: true })).toHaveCount(0);
    await expect(returnLink).toBeFocused();
    await returnLink.click();
    await expect(page.getByText(patientName, { exact: true })).toHaveCount(0);
  } finally {
    release();
    await page.unrouteAll({ behavior: "wait" });
  }
});
