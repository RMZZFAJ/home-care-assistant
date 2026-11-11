import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { actor, delivery, fixtures, issue, rpc, setup } from "../integration/v4-fixtures.mjs";
import { historicalSourceFixture } from "../integration/pdf-source-facts-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";
import { selectDocumentSection } from "./document-sections";
import { audit } from "./accessibility-audit";

test.setTimeout(150_000);
test.afterEach(async ({ page }) => page.unrouteAll({ behavior: "wait" }));

async function login(page: Page, patient: string, role: "family" | "adminA" = "family") {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(fixtures[role].email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible();
  await selectContext(page, patient);
}
async function open(page: Page, id: string) {
  const recorded = page.waitForResponse(response =>
    new URL(response.url()).pathname === `/api/requisitions/${id}/openings`
    && response.request().method() === "POST");
  await page.goto(`/documentos/${id}`);
  expect((await recorded).ok()).toBe(true);
  await expect(page.locator("[data-document-heading]")).toBeVisible();
}
const overview = (page: Page) => page.getByRole("tabpanel");
const facts = (patient: string) => sql(`select jsonb_build_object(
  'documents',(select jsonb_agg(to_jsonb(d) order by id) from public.operational_documents d where care_recipient_id=${q(patient)}),
  'events',(select jsonb_agg(to_jsonb(e) order by id) from public.document_events e where care_recipient_id=${q(patient)}),
  'stock',(select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${q(patient)}))::text;`);
const ledger = (patient: string) => sql(`select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${q(patient)};`);

async function manualPreference(client: Awaited<ReturnType<typeof actor>>) {
  const previous = await rpc(client, "my_requisition_science_preference");
  if (previous.mode !== "manual") {
    await rpc(client, "set_requisition_science_preference", {
      p_mode: "manual", p_consent: false, p_version: previous.version, p_key: randomUUID(),
    });
  }
  return async () => {
    if (previous.mode === "manual") return;
    const current = await rpc(client, "my_requisition_science_preference");
    await rpc(client, "set_requisition_science_preference", {
      p_mode: previous.mode, p_consent: true, p_version: current.version, p_key: randomUUID(),
    });
  };
}

test("REQ follow-up reaches pending ENT and partial fulfillment; stale reads and denied related access never create acts", async ({ page }) => {
  const f = await setup(), req = await issue(f.patient, f.products);
  const ent = await delivery(f.patient, req, [f.products[0]]);
  await login(page, f.patient);
  await open(page, req.id);
  const writes: string[] = [];
  page.on("request", request => {
    const path = new URL(request.url()).pathname;
    if (path.startsWith("/api/") && request.method() !== "GET" && !path.endsWith("/openings")) writes.push(path);
  });
  const before = facts(f.patient);
  await expect(overview(page)).toContainText("2 de 2 itens ainda sem atendimento confirmado");
  const nextStep = overview(page).getByRole("button", { name: "Abrir Materiais e atendimento", exact: true });
  await nextStep.focus();
  await nextStep.press("Enter");
  await expect(page.getByRole("tab", { name: "Materiais", exact: true })).toBeFocused();
  const material = overview(page).getByRole("table", { name: "Materiais requisitados", exact: true }).getByRole("row").filter({ hasText: "Material fictício V4 0" });
  await expect(material).toContainText("Pendente");
  await expect(material).toContainText("Aguardando recebimento");
  await expect(material).toContainText("Quantidade aceita para este item: 0 unidade");
  const linked = material.getByRole("button", { name: ent.code, exact: true });
  await linked.click();
  let dialog = page.getByRole("dialog", { name: ent.code, exact: true });
  await expect(dialog).toContainText("Material fictício V4 0");
  await dialog.getByRole("button", { name: "Fechar diálogo", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(linked).toBeFocused();
  expect(facts(f.patient)).toBe(before);

  await rpc(await actor("professional", f.patient), "supply_document_command", {
    p_id: ent.id, p_action: "receive", p_body: { divergences: [] }, p_key: randomUUID(), p_version: ent.version,
  });
  const partial = facts(f.patient);
  await open(page, req.id);
  await expect(overview(page)).toContainText("1 de 2 itens ainda sem atendimento confirmado");
  await expect(page.getByRole("region", { name: "Dimensões independentes da requisição" })).toContainText("1/2 itens atendidos");
  await page.setViewportSize({ width: 320, height: 900 });
  await audit(page, "REQ partial follow-up");

  await page.route(`**/api/requisitions/${req.id}`, route => route.fulfill({
    status: 503, json: { code: "DATABASE_UNAVAILABLE", error: "Consulta atual fictícia indisponível", retryable: true },
  }));
  await page.getByRole("button", { name: "Atualizar ficha", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Consulta atual fictícia indisponível" })).toBeVisible();
  await expect(overview(page)).toContainText("O acompanhamento atual não foi confirmado");
  await expect(overview(page).getByRole("button", { name: "Abrir Materiais e atendimento", exact: true })).toHaveCount(0);
  await page.unroute(`**/api/requisitions/${req.id}`);
  await page.getByRole("button", { name: "Atualizar ficha", exact: true }).click();
  await expect(overview(page)).toContainText("1 de 2 itens ainda sem atendimento confirmado");
  await overview(page).getByRole("button", { name: "Abrir Materiais e atendimento", exact: true }).click();
  await expect(material).toContainText("Atendido");
  await expect(material).toContainText("Quantidade aceita para este item: 10 unidade");

  sql(`insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled)
    values(${q(f.patient)},${q(fixtures.family.id)},'ent.read',false);`);
  await linked.click();
  dialog = page.getByRole("dialog", { name: ent.code, exact: true });
  await expect(dialog.getByRole("alert")).toBeVisible();
  await expect(dialog.getByText("Material fictício V4 0", { exact: false })).toHaveCount(0);
  await dialog.getByRole("button", { name: "Fechar diálogo", exact: true }).click();
  await expect(linked).toBeFocused();
  expect(writes).toEqual([]);
  expect(facts(f.patient)).toBe(partial);
});

test("REQ completed fulfillment keeps personal science separate and archived follow-up opens preserved history", async ({ page }) => {
  const f = await setup(), family = await actor("family", f.patient);
  const restore = await manualPreference(family);
  try {
    const req = await issue(f.patient, f.products);
    // A qualified family dispatcher records causal science even with manual
    // preference. Use the existing legitimate non-representative dispatch case.
    sql(`insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled)
      values(${q(f.patient)},${q(fixtures.family.id)},'req.science',false);`);
    const ent = await delivery(f.patient, req, f.products);
    expect(sql(`select count(*) from public.requisition_science_events where requisition_id=${q(req.id)};`)).toBe("0");
    sql(`update public.capability_overrides set enabled=true where care_recipient_id=${q(f.patient)}
      and subject_user=${q(fixtures.family.id)} and capability='req.science';`);
    await rpc(await actor("professional", f.patient), "supply_document_command", {
      p_id: ent.id, p_action: "receive", p_body: { divergences: [] }, p_key: randomUUID(), p_version: ent.version,
    });
    const physical = ledger(f.patient);
    const before = await rpc(family, "requisition_fulfillment", { p_requisition: req.id });
    expect(before.fulfilled).toBe(2);
    await login(page, f.patient);
    await open(page, req.id);
    await expect(overview(page)).toContainText("Conferir minha ciência e a conclusão");
    await expect(overview(page)).toContainText("atendimento dos itens está completo");
    await overview(page).getByRole("button", { name: "Abrir Ciência e responsáveis", exact: true }).click();
    await expect(page.getByRole("tab", { name: "Atendimento", exact: true })).toBeFocused();
    await expect(overview(page)).toContainText("Minha ciência: pendente");
    await page.route(`**/api/requisitions/${req.id}/science`, route => route.fulfill({
      status: 503, json: { code: "DATABASE_UNAVAILABLE", error: "Registro de ciência fictício recusado", retryable: true },
    }));
    await page.getByRole("button", { name: "Li a requisição e confirmo minha ciência", exact: true }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Registro de ciência fictício recusado" })).toBeVisible();
    await selectDocumentSection(page, "overview");
    await expect(overview(page)).toContainText("Conferir minha ciência e a conclusão");
    await expect(overview(page)).not.toContainText("O acompanhamento atual não foi confirmado");
    expect(sql(`select count(*) from public.requisition_science_events where requisition_id=${q(req.id)};`)).toBe("0");
    await page.unroute(`**/api/requisitions/${req.id}/science`);
    const science = page.waitForResponse(response => response.url().endsWith(`/api/requisitions/${req.id}/science`)
      && response.request().method() === "POST");
    await page.getByRole("button", { name: "Li a requisição e confirmo minha ciência", exact: true }).click();
    expect((await science).ok()).toBe(true);
    await selectDocumentSection(page, "workflow");
    await expect(overview(page)).toContainText("Minha ciência: registrada");
    await selectDocumentSection(page, "overview");
    await expect(overview(page)).toContainText("Acompanhar a conclusão e o arquivamento");
    expect(await rpc(family, "requisition_fulfillment", { p_requisition: req.id })).toEqual(before);
    expect(ledger(f.patient)).toBe(physical);
    expect(sql(`select count(*) from public.requisition_science_events where requisition_id=${q(req.id)} and user_id=${q(fixtures.family.id)};`)).toBe("1");

    await rpc(f.admin, "archive_requisition", { p_id: req.id, p_reason: "Arquivamento fictício após conferir os fatos independentes" });
    const archived = facts(f.patient);
    await open(page, req.id);
    await expect(overview(page)).toContainText("Consultar o arquivamento");
    await overview(page).getByRole("button", { name: "Abrir Versões e integridade", exact: true }).click();
    await expect(page.getByRole("tab", { name: "Versões e integridade", exact: true })).toBeFocused();
    await expect(overview(page)).toContainText("Linha do tempo");
    expect(facts(f.patient)).toBe(archived);
    expect(ledger(f.patient)).toBe(physical);
  } finally {
    await restore();
  }
});

test("REQ cancelled and real historical import show consultation instead of current fulfillment tasks", async ({ page, browser }, info) => {
  const f = await setup(), req = await issue(f.patient, f.products);
  await rpc(f.admin, "transition_requisition_status", {
    p_requisition_id: req.id, p_to_status: "cancelled", p_reason: "Cancelamento fictício sem presumir recebimento ou ciência",
  });
  await login(page, f.patient, "adminA");
  const cancelled = facts(f.patient);
  await open(page, req.id);
  await expect(overview(page)).toContainText("Consultar o cancelamento");
  await expect(overview(page)).toContainText("Atendimento preservado no encerramento");
  await expect(overview(page)).not.toContainText("Aguardando ENT aceita");
  await selectDocumentSection(page, "materials");
  await expect(overview(page)).toContainText("Sem atendimento confirmado");
  await selectDocumentSection(page, "overview");
  await expect(page.getByRole("link", { name: "Expedir ENT vinculada", exact: true })).toHaveCount(0);
  await overview(page).getByRole("button", { name: "Abrir Versões e integridade", exact: true }).click();
  await expect(overview(page)).toContainText("Linha do tempo");
  expect(facts(f.patient)).toBe(cancelled);

  const historical = await historicalSourceFixture();
  const use = info.project.use;
  const context = await browser.newContext({
    baseURL: new URL(page.url()).origin,
    viewport: use.viewport, isMobile: use.isMobile, hasTouch: use.hasTouch,
    deviceScaleFactor: use.deviceScaleFactor, userAgent: use.userAgent,
  });
  try {
    const reader = await context.newPage();
    await login(reader, historical.patient);
    const preserved = facts(historical.patient);
    await open(reader, historical.doc.id);
    await expect(overview(reader)).toContainText("Consultar o registro histórico");
    await expect(overview(reader)).toContainText("Ciência e atendimento do original não são presumidos");
    await expect(overview(reader)).toContainText("Atendimento original não apurado");
    await expect(overview(reader)).not.toContainText("0/1 itens atendidos");
    await selectDocumentSection(reader, "materials");
    await expect(overview(reader)).toContainText("Não apurado no original");
    await expect(overview(reader).getByText("Pendente", { exact: true })).toHaveCount(0);
    await selectDocumentSection(reader, "overview");
    await expect(reader.getByRole("link", { name: "Expedir ENT vinculada", exact: true })).toHaveCount(0);
    await expect(reader.getByRole("button", { name: "Li a requisição e confirmo minha ciência", exact: true })).toHaveCount(0);
    await overview(reader).getByRole("button", { name: "Abrir Versões e integridade", exact: true }).click();
    await expect(reader.getByRole("tab", { name: "Versões e integridade", exact: true })).toBeFocused();
    await expect(overview(reader)).toContainText("Linha do tempo");
    expect(facts(historical.patient)).toBe(preserved);
  } finally {
    await context.close();
  }
});
