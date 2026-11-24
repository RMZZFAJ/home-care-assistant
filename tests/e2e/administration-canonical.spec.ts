import { expect, test, type Page, type Locator } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { mkdirSync } from "node:fs";
import { actor, fixtures, rpc, setup } from "../integration/v4-fixtures.mjs";
import { shiftWorker } from "../integration/shift-fixtures.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { selectContext } from "./auth-context";
import { audit, auditFromTop } from "./accessibility-audit";

test.setTimeout(180_000);
const widths = [320, 390, 768, 1024, 1440];
const referenceUrl = pathToFileURL(resolve("Home_Care_Assistant_Modelo_Integral.html")).href;
const residenceEvidence = "output/playwright/l4-residencia";
const facts = (patient: string) => sql(`select jsonb_build_object(
  'settings',(select to_jsonb(s) from public.patient_settings s where care_recipient_id=${q(patient)}),
  'changes',(select jsonb_agg(to_jsonb(c) order by id) from public.access_change_requests c where care_recipient_id=${q(patient)}),
  'members',(select jsonb_agg(to_jsonb(m) order by user_id) from public.care_recipient_memberships m where care_recipient_id=${q(patient)}),
  'stock',(select jsonb_agg(to_jsonb(s) order by id) from public.stock_movements s where care_recipient_id=${q(patient)}));`);
async function login(page: Page, patient: string | null, account: string | { email: string } = "adminA") {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(typeof account === "string" ? fixtures[account].email : account.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible();
  await selectContext(page, patient);
}
async function compare(actual: Locator, model: Locator, properties: string[]) {
  const expected = await model.evaluate((node, keys) => Object.fromEntries(keys.map(key => [key, getComputedStyle(node).getPropertyValue(key)])), properties);
  for (const [property, value] of Object.entries(expected)) await expect(actual).toHaveCSS(property, value);
}
const cardProperties = ["border-radius", "border-top-color", "padding-top", "padding-left"];

test("E10-04 consulta todas as permissões e grava a alteração somente depois da revisão", async ({ page, browser }, info) => {
  const f = await setup();
  const before = facts(f.patient);
  const writes: string[] = [];
  const reference = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  try {
    await login(page, f.patient);
    await page.goto("/configuracoes?area=permissions");
    page.on("request", request => { if (request.method() === "POST" && new URL(request.url()).pathname === "/api/patient-settings") writes.push(request.method()); });
    const matrix = page.getByRole("region", { name: "Matriz de permissões", exact: true });
    const table = matrix.getByRole("table", { name: "Permissões efetivas", exact: true });
    await expect(matrix.getByRole("searchbox", { name: "Pesquisar permissões", exact: true })).toHaveCSS("padding-left", "38px");
    const count = Number(sql("select count(*) from public.capability_definitions;"));
    await expect(table.locator('th[scope="row"]')).toHaveCount(count);
    await expect(table.getByRole("columnheader")).toHaveCount(6);
    await expect(table.getByRole("rowheader", { name: "Consultar requisições", exact: true })).toBeVisible();
    await expect(table.getByRole("rowheader", { name: /^Arquivar e encerrar REQ/ })).toBeVisible();
    const model = await reference.newPage();
    await model.route(/^https?:/, route => route.abort());
    await model.goto(pathToFileURL(resolve("hca-laboratorio-04-v2-aprovado.html")).href + "#E10-04/permissions");
    for (const width of [360, 412]) {
      await model.getByRole("combobox", { name: "Visualização", exact: true }).selectOption(String(width));
      await page.setViewportSize({ width, height: 900 });
      const frame = model.locator("#device-frame");
      await expect(frame.getByRole("heading", { name: "Permissões por perfil", exact: true })).toBeVisible();
      await info.attach(`L4-permissions-${width}`, { body: await frame.screenshot(), contentType: "image/png" });
      await auditFromTop(page, `E10-04 matrix ${width}`);
      await info.attach(`permissions-${width}`, { body: await page.screenshot(), contentType: "image/png" });
    }
    await reference.close();
    await page.bringToFront();
    const view = matrix.getByRole("combobox", { name: "Visualizar permissões", exact: true });
    const snapshotRead = page.waitForResponse(response => new URL(response.url()).searchParams.get("permissionPerson") === fixtures.professional.id);
    await view.selectOption(fixtures.professional.id);
    const response = await snapshotRead;
    expect(response.status()).toBe(200);
    expect(response.headers()["cache-control"]).toContain("no-store");
    const data = await response.json();
    expect(data.permissions).toHaveLength(count);
    expect(data).toMatchObject({ personId: fixtures.professional.id, careRecipientId: f.patient, role: "professional" });
    await expect(matrix.locator("li .hca-guide-row")).toHaveCount(count);
    await expect(matrix.getByRole("button", { name: /^Emitir REQ Padrão da função Permite/ })).toBeVisible();
    await expect(matrix).toContainText("Limite da função");
    await auditFromTop(page, "E10-04 personal permissions");
    await view.selectOption("");
    await matrix.getByRole("searchbox", { name: "Pesquisar permissões", exact: true }).fill("Emitir REQ");
    const editorButton = matrix.getByRole("button", { name: /^Emitir REQ · Profissional ·/ });
    await editorButton.click();
    const editor = page.getByRole("dialog", { name: "Emitir REQ", exact: true });
    await editor.getByRole("combobox", { name: "Configuração deste perfil" }).selectOption("false");
    await editor.getByRole("button", { name: "Revisar alteração", exact: true }).click();
    const review = page.getByRole("dialog", { name: "Confirmar alteração de permissão", exact: true });
    await expect(review).toContainText("Herdar · permitido");
    await expect(review).toContainText("Restringir");
    await review.press("Escape");
    await expect(editorButton).toBeFocused();
    expect(writes).toEqual([]);
    expect(facts(f.patient)).toBe(before);
    await editorButton.click();
    await editor.getByRole("combobox", { name: "Configuração deste perfil" }).selectOption("false");
    await editor.getByRole("button", { name: "Revisar alteração", exact: true }).click();
    const written = page.waitForResponse(result => new URL(result.url()).pathname === "/api/patient-settings" && result.request().method() === "POST");
    await review.getByRole("button", { name: "Confirmar permissão", exact: true }).click();
    const saved = await written;
    expect(saved.status()).toBe(200);
    expect(saved.request().postDataJSON()).toMatchObject({
      kind: "capability", expectedVersion: data.policyVersion,
      change: { capability: "req.create", subjectRole: "professional", enabled: false },
    });
    await expect(review).toBeHidden();
    await view.selectOption(fixtures.professional.id);
    await expect(matrix.getByRole("button", { name: /^Emitir REQ Configuração da função Restrito/ })).toBeVisible();
    expect(writes).toEqual(["POST"]);
  } finally {
    await reference.close();
    sql(`update public.care_recipients set is_active=false where id=${q(f.patient)};`);
  }
});

test("15 ADM02 ADM03 patient resources and policy follow the model without changing facts by navigation", async ({ page, browser }, info) => {
  const f = await setup(); await login(page, f.patient);
  await page.goto(`/admin?careRecipientId=${f.patient}`);
  const identification = page.getByRole("button", { name: /^Identificação da residência/ });
  await expect(identification).toBeEnabled();
  const before = facts(f.patient), writes: string[] = [];
  page.on("request", request => { if (new URL(request.url()).pathname.startsWith("/api/") && request.method() !== "GET") writes.push(request.url()); });
  const reference = await browser.newContext();
  try {
    mkdirSync(residenceEvidence, { recursive: true });
    const model = await reference.newPage(); await model.route(/^https?:/, route => route.abort());
    await model.goto(pathToFileURL(resolve("hca-laboratorio-04-v2-aprovado.html")).href + "#E10-01/overview");
    const frame = model.locator("#device-frame");
    const destinations = page.getByRole("navigation", { name: "Áreas administrativas", exact: true });
    const hrefs = await destinations.getByRole("link").evaluateAll(nodes => nodes.map(node => node.getAttribute("href")));
    expect(hrefs.every(href => href?.includes(f.patient))).toBe(true);
    await expect(destinations.getByRole("link", { name: /^Pessoas e convites/ })).toContainText("5 vínculos ativos");
    for (const width of [360, 412]) {
      await model.getByRole("combobox", { name: "Visualização", exact: true }).selectOption(String(width));
      await page.setViewportSize({ width, height: 900 });
      await expect(frame.getByRole("heading", { name: "Organização", exact: true })).toBeVisible();
      await auditFromTop(page, `E10-01 administration ${width}`);
      await info.attach(`L4-residence-${width}`, { body: await frame.screenshot(), contentType: "image/png" });
      await info.attach(`residence-${width}`, { body: await page.screenshot({ path: `${residenceEvidence}/app-overview-${info.project.name}-${width}.png` }), contentType: "image/png" });
      await identification.click();
      const editor = page.getByRole("dialog", { name: "Identificação da residência", exact: true });
      await expect(editor.getByRole("switch", { name: "Residência ativa" })).toBeChecked();
      await expect(editor.getByRole("textbox", { name: "Nome do paciente" })).toHaveValue(/^Homologação fictícia V4/);
      await info.attach(`residence-editor-${width}`, { body: await page.screenshot({ path: `${residenceEvidence}/app-edit-${info.project.name}-${width}.png` }), contentType: "image/png" });
      await editor.getByRole("button", { name: "Voltar", exact: true }).click();
      await expect(identification).toBeFocused();
    }
    await page.goto(`/configuracoes?careRecipientId=${f.patient}`);
    const policy = page.getByRole("region", { name: "Política do paciente", exact: true }); await expect(policy).toBeVisible();
    await model.goto(referenceUrl + "#administracao/regras");
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 }); await model.setViewportSize({ width, height: 900 }); await model.screenshot();
      await compare(policy, model.locator(".card.pad").first(), cardProperties);
      await compare(page.getByRole("navigation", { name: "Áreas da configuração", exact: true }), model.locator(".tabs"), ["flex-wrap", "column-gap"]);
      await compare(page.locator('.hca-configuration-tab[aria-current="page"]'), model.locator('.tab[aria-selected="true"]'), ["background-color", "color", "border-bottom-color", "padding-left", "padding-top", "font-size", "font-weight", "column-gap"]);
      await compare(policy.locator(".hca-policy-row").first(), model.locator(".policyrow").first(), ["padding-top", "column-gap", "border-bottom-color"]);
      await auditFromTop(page, "administration policy " + width);
    }
    const edit = page.getByRole("button", { name: "Editar Balanço e revisão", exact: true }); await edit.click();
    const drawer = page.getByRole("dialog", { name: "Balanço e revisão", exact: true }); await expect(drawer).toBeVisible();
    await drawer.press("Escape"); await expect(drawer).toHaveCount(0); await expect(edit).toBeFocused();
    await page.getByRole("link", { name: "Permissões", exact: true }).click();
    await expect(page.getByRole("region", { name: "Matriz de permissões", exact: true })).toBeVisible();
    await page.getByRole("searchbox", { name: "Pesquisar permissões", exact: true }).fill("Nenhuma permissão com este nome");
    await expect(page.getByText("Nenhuma permissão corresponde aos filtros.", { exact: true })).toBeVisible();
    await page.setViewportSize({ width: 320, height: 900 });
    await auditFromTop(page, "administration permissions empty320");
    await page.getByRole("searchbox", { name: "Pesquisar permissões", exact: true }).fill("");
    await expect(page.getByRole("table", { name: "Permissões efetivas", exact: true }).getByRole("row")).not.toHaveCount(1);
    const permissionsScroll = page.getByRole("region", { name: /^Tabela de permissões/ });
    await expect(permissionsScroll).toHaveAttribute("tabindex", "0");
    await permissionsScroll.press("ArrowRight");
    await expect.poll(() => permissionsScroll.evaluate(node => node.scrollLeft)).toBeGreaterThan(0);
    expect(facts(f.patient)).toBe(before); expect(writes).toEqual([]);
    mkdirSync("output/playwright/phase-d", { recursive: true });
    await page.screenshot({ path: `output/playwright/phase-d/administration-permissions-${info.project.name}.png` });
    // Controlled HTTP refusal qualifies UI redaction; native Auth negatives
    // remain covered by the existing governance/API regressions.
    const target = (url: URL) => url.pathname === "/api/patient-settings" && url.searchParams.get("careRecipientId") === f.patient;
    await page.route(target, route => route.fulfill({ status: 403, json: { error: "Acesso indisponível no teste de recuperação." } }));
    await page.evaluate(() => window.dispatchEvent(new Event("hca:data-changed")));
    const retry = page.getByRole("button", { name: "Consultar configuração novamente", exact: true });
    await expect(retry).toBeVisible();
    await expect(page.getByRole("region", { name: "Matriz de permissões", exact: true })).toHaveCount(0);
    await page.unroute(target); await retry.click();
    await expect(page.getByRole("region", { name: "Matriz de permissões", exact: true })).toBeVisible();
    expect(facts(f.patient)).toBe(before); expect(writes).toEqual([]);
  } finally { await reference.close(); await page.unrouteAll({ behavior: "wait" }); }
});

test("E10-01 recovers a lost identification response once and closes an unregistered attempt", async ({ page }) => {
  const f = await setup();
  const before = JSON.parse(facts(f.patient));
  await login(page, f.patient);
  await page.goto(`/admin?section=patient&careRecipientId=${f.patient}`);
  const editor = page.getByRole("dialog", { name: "Identificação da residência", exact: true });
  const name = "Residência de Mariana Borges";
  await editor.getByRole("textbox", { name: "Nome do paciente" }).fill(name);
  await editor.getByRole("button", { name: "Salvar identificação", exact: true }).click();
  const review = page.getByRole("dialog", { name: "Salvar identificação?", exact: true });
  await expect(review).toContainText(name);
  let originalKey: string | undefined;
  await page.route("**/api/admin/residence", async route => {
    const command = route.request().postDataJSON();
    if (command?.action !== "save") { await route.continue(); return; }
    originalKey = command.key;
    expect((await route.fetch()).status()).toBe(200);
    await route.abort();
  });
  await review.getByRole("button", { name: "Salvar identificação", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Não foi possível confirmar o resultado", exact: true })).toBeVisible();
  await page.unroute("**/api/admin/residence");
  await page.reload();
  await expect(editor).toHaveCount(0);
  await page.getByRole("button", { name: "Conferir resultado", exact: true }).click();
  const recovery = page.getByRole("dialog", { name: "Não foi possível confirmar o resultado", exact: true });
  const call = page.waitForRequest(request => request.method() === "POST" && new URL(request.url()).pathname === "/api/admin/residence");
  await recovery.getByRole("button", { name: "Conferir resultado", exact: true }).click();
  expect((await call).postDataJSON()).toEqual({ patientId: f.patient, key: originalKey, action: "recover" });
  await page.getByRole("dialog", { name: "Identificação atualizada", exact: true }).getByRole("button", { name: "Concluir", exact: true }).click();
  await expect(page.getByRole("region", { name: "Residência selecionada" })).toContainText(name);
  expect(sql(`select count(*) from public.audit_events where entity_id=${q(f.patient)} and action='recipient.updated';`)).toBe("2");

  const key = randomUUID();
  const current = await (await page.request.get(`/api/admin/residence?patientId=${f.patient}`)).json();
  const save = { patientId: f.patient, key, action: "save", version: current.version, before: current.identity, identity: { ...current.identity, displayName: "Envio atrasado" } };
  const close = await page.request.post("/api/admin/residence", { data: { patientId: f.patient, key, action: "recover" } });
  expect(await close.json()).toEqual({ state: "closed" });
  expect(await (await page.request.post("/api/admin/residence", { data: save })).json()).toEqual({ state: "closed" });
  expect(sql(`select display_name from public.care_recipients where id=${q(f.patient)};`)).toBe(name);
  expect(JSON.parse(facts(f.patient))).toMatchObject({ members: before.members, stock: before.stock });

  // A change through the preserved administrative contract can supersede the
  // identity without changing the governance settings version.
  await rpc(await actor("adminA", f.patient), "admin_upsert_recipient", {
    p_id: f.patient, p_display_name: "Identificação mais recente", p_is_active: true, p_is_development: true,
  });
  const stale = await page.request.post("/api/admin/residence", { data: { ...save, key: randomUUID() } });
  expect(stale.status()).toBe(409);
  expect(await stale.json()).toMatchObject({ code: "VERSION_CONFLICT" });
  expect(sql(`select display_name from public.care_recipients where id=${q(f.patient)};`)).toBe("Identificação mais recente");
  sql(`update public.care_recipients set is_active=false where id=${q(f.patient)};`);
});

test("E10-01 global identification remains a proposal and a reader receives no administrative data", async ({ page }, info) => {
  const f = await setup();
  const url = `/admin?careRecipientId=${f.patient}`;
  const original = sql(`select display_name from public.care_recipients where id=${q(f.patient)};`);
  const proposedName = `Residência de Marta Dias ${f.patient.slice(0, 8)}`;
  try {
    await login(page, null, "global");
    await page.goto(url);
    await expect(page.getByText("Atuação administrativa", { exact: true })).toBeVisible();
    await page.getByRole("link", { name: /^Preparar nova residência/ }).click();
    await expect(page.getByRole("heading", { name: "Nova residência", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Cancelar", exact: true }).click();
    await page.getByRole("dialog", { name: "Sair deste preenchimento?", exact: true }).getByRole("button", { name: "Sair", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/admin\\?careRecipientId=${f.patient}$`));
    for (const width of [360, 412]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(page.getByRole("button", { name: /^Identificação da residência/ })).toBeEnabled();
      await page.screenshot({ path: `${residenceEvidence}/app-global-${info.project.name}-${width}.png` });
    }
    await page.getByRole("button", { name: /^Identificação da residência/ }).click();
    const editor = page.getByRole("dialog", { name: "Identificação da residência", exact: true });
    await editor.getByRole("textbox", { name: "Nome do paciente" }).fill(proposedName);
    await editor.getByRole("button", { name: "Salvar identificação", exact: true }).click();
    const review = page.getByRole("dialog", { name: "Salvar identificação?", exact: true });
    await review.getByRole("button", { name: "Registrar proposta", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Proposta registrada", exact: true })).toBeVisible();
    expect(sql(`select display_name from public.care_recipients where id=${q(f.patient)};`)).toBe(original);
    expect(sql(`select count(*) from public.access_change_requests where care_recipient_id=${q(f.patient)} and status='pending' and proposed->>'operation'='recipient';`)).toBe("1");
    const proposal = JSON.parse(sql(`select json_build_object('id',id,'version',base_version) from public.access_change_requests where care_recipient_id=${q(f.patient)} and proposed->>'operation'='recipient';`));
    const decision = { p_patient: f.patient, p_kind: "administration", p_change: {}, p_version: proposal.version, p_request_id: proposal.id, p_decision: "approve" };
    const selfApproval = await (await actor("global", f.patient)).rpc("configure_patient_access", { ...decision, p_key: randomUUID() });
    expect(selfApproval.error?.code).toBe("42501");
    const approved = await rpc(await actor("adminA", f.patient), "configure_patient_access", { ...decision, p_key: randomUUID() });
    expect(approved.status).toBe("applied");
    expect(sql(`select display_name from public.care_recipients where id=${q(f.patient)};`)).toBe(proposedName);
    await page.getByRole("button", { name: "Concluir", exact: true }).click();
    await page.getByLabel("Menu do usuário", { exact: true }).click();
    await page.getByRole("menuitem", { name: "Sair", exact: true }).click();
    await login(page, f.patient, "reader");
    await page.goto(url);
    await expect(page.getByRole("heading", { name: "Administração indisponível", exact: true })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Áreas administrativas" })).toHaveCount(0);
    await expect(page.getByRole("region", { name: "Residência selecionada" })).toHaveCount(0);
    expect((await page.request.get(`/api/admin/residence?patientId=${f.patient}`)).status()).toBe(403);
    const available = page.getByRole("button", { name: "Ver acesso disponível", exact: true });
    await available.click();
    const access = page.getByRole("dialog", { name: "Acessos disponíveis", exact: true });
    await expect(access.getByRole("link", { name: "Ver meus acessos", exact: true })).toHaveAttribute("href", "/");
    await expect(access).not.toContainText(proposedName);
    await access.getByRole("button", { name: "Fechar", exact: true }).click();
    await expect(available).toBeFocused();
    for (const width of [360, 412]) {
      await page.setViewportSize({ width, height: 900 });
      await page.screenshot({ path: `${residenceEvidence}/app-lost-${info.project.name}-${width}.png` });
    }
  } finally {
    sql(`update public.care_recipients set is_active=false where id=${q(f.patient)};`);
  }
});

test("15 ADM04 NOT03 proposals retain comparison and notice rules recover a failed read without a write", async ({ page, browser }, info) => {
  const f = await setup(), global = await actor("global"), reviewer = await shiftWorker(f.patient, "admin");
  const proposal = await rpc(global, "configure_patient_access", { p_patient: f.patient, p_kind: "settings", p_change: { patientShortName: "Residência proposta de conferência" }, p_key: randomUUID(), p_version: 1 });
  await login(page, f.patient, reviewer); await page.goto(`/configuracoes?careRecipientId=${f.patient}&area=people`);
  const card = page.locator(`article[data-proposal-id="${proposal.id}"]`); await expect(card).toBeVisible();
  const before = facts(f.patient), writes: string[] = [];
  page.on("request", request => { if (new URL(request.url()).pathname.startsWith("/api/") && request.method() !== "GET") writes.push(request.url()); });
  const reference = await browser.newContext();
  try {
    const model = await reference.newPage(); await model.route(/^https?:/, route => route.abort());
    await model.goto(referenceUrl + "#administracao/residencia");
    await card.getByRole("button").click();
    const proposalReview = page.getByRole("dialog", { name: "Conferir proposta", exact: true });
    await expect(proposalReview.getByRole("region", { name: "Compare a alteração", exact: true })).toContainText("Residência proposta de conferência");
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 }); await model.setViewportSize({ width, height: 900 }); await model.screenshot();
      await expect(proposalReview.getByText("Proposta registrada", { exact: true })).toBeVisible();
      await audit(page, "administration proposal " + width);
    }
    await proposalReview.getByRole("button", { name: "Voltar", exact: true }).click();
    await expect(card.getByRole("button")).toBeFocused();
    let fail = true;
    const endpoint = (url: URL) => url.pathname === "/api/notification-rules" && url.searchParams.get("careRecipientId") === f.patient;
    await page.route(endpoint, route => fail ? route.fulfill({ status: 503, json: { error: "Consulta indisponível no teste de recuperação." } }) : route.continue());
    await page.getByRole("navigation", { name: "Áreas da configuração", exact: true }).getByRole("link", { name: "Notificações", exact: true }).click();
    const retry = page.getByRole("button", { name: "Consultar regras de avisos novamente", exact: true }); await expect(retry).toBeEnabled();
    await expect(page.getByRole("table", { name: "Canais por evento e função", exact: true })).toHaveCount(0);
    fail = false; await retry.click();
    const matrix = page.getByRole("region", { name: "Matriz de notificações", exact: true }); await expect(matrix).toBeVisible();
    await expect(matrix.getByRole("status")).toHaveCount(0);
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 }); await model.setViewportSize({ width, height: 900 }); await model.screenshot();
      await compare(matrix, model.locator(".card.pad").first(), cardProperties);
      await auditFromTop(page, "administration notice rules " + width);
    }
    const options = matrix.getByRole("button", { name: /^Opções de / }).first(); await options.click();
    const drawer = page.getByRole("dialog"); await expect(drawer).toBeVisible(); await drawer.press("Escape");
    await expect(drawer).toHaveCount(0); await expect(options).toBeFocused();
    expect(facts(f.patient)).toBe(before); expect(writes).toEqual([]);
    mkdirSync("output/playwright/phase-d", { recursive: true });
    await page.screenshot({ path: `output/playwright/phase-d/administration-notice-rules-${info.project.name}.png` });
  } finally { await reference.close(); await page.unrouteAll({ behavior: "wait" }); }
});
