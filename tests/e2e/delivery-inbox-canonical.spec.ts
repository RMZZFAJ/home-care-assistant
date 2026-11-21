import { isDocumentAccessReport } from "./display-access-report";
import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { setup, rpc } from "../integration/v4-fixtures.mjs";
import { shiftWorker } from "../integration/shift-fixtures.mjs";
import { transferFixture, declareTransfer } from "../integration/transfer-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";
import { auditFromTop } from "./accessibility-audit";

test.setTimeout(180_000);
const widths = [320, 390, 768, 1024, 1440];
const card = (page: Page, id: string) => page.locator(`[data-delivery-id="${id}"]`);
const facts = (patient: string) => sql(`select jsonb_build_object('docs',(select jsonb_agg(to_jsonb(d) order by id) from public.operational_documents d where care_recipient_id=${q(patient)}),'events',(select jsonb_agg(to_jsonb(e) order by id) from public.document_events e where care_recipient_id=${q(patient)}),'transfers',(select jsonb_agg(to_jsonb(t) order by document_id) from public.ent_transfers t where care_recipient_id=${q(patient)}),'stock',(select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${q(patient)}));`);
async function login(page: Page, patient: string, email: string) {
  await page.goto("/login"); await page.getByLabel("E-mail", { exact: true }).fill(email); await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click(); await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible(); await selectContext(page, patient);
}
function writes(page: Page, allowAccess = false) {
  const out: string[] = [];
  page.on("request", request => { if (new URL(request.url()).pathname.startsWith("/api/") && request.method() !== "GET" && !(allowAccess && isDocumentAccessReport(request))) out.push(request.url()); });
  return out;
}

test("ENT-02 canonical task preserves recorded names,exact navigation and return filters across five widths", async ({ page, browser }, info) => {
  const f = await setup(), issuer = await shiftWorker(f.patient, "family"), recipient = await shiftWorker(f.patient);
  const issuerName = "Pessoa preservada da emissão " + "responsável ".repeat(6), recipientName = "Pessoa preservada da designação " + "profissional ".repeat(6);
  sql(`update public.profiles set full_name=${q(issuerName.trim())} where id=${q(issuer.id)}; update public.profiles set full_name=${q(recipientName.trim())} where id=${q(recipient.id)};`);
  const doc = await rpc(issuer.client, "create_supply_document", { p_patient: f.patient, p_type: "ENT", p_key: randomUUID(), p_draft: false, p_payload: { source: "FAMILY", destination: "CARE_TEAM", recipientId: recipient.id, recipientReason: "Escolha pessoal fictícia para conferir cartão e navegação", lines: [{ productId: f.products[0], quantity: "1" }] } });
  sql(`update public.profiles set full_name='Nome atual diferente do snapshot' where id in (${q(issuer.id)},${q(recipient.id)});`);
  await login(page, f.patient, recipient.email); const before = facts(f.patient), posted = writes(page, true);
  await page.goto("/entregas?careRecipientId=" + f.patient); const row = card(page, doc.id);
  await expect(row).toContainText(issuerName.trim()); await expect(row).toContainText(recipientName.trim());
  await expect(row).not.toContainText("Nome atual diferente do snapshot");
  await expect(row).toContainText("Família → Equipe"); await expect(row).toContainText("1 material");
  await expect(row.getByRole("link", { name: "Conferir", exact: true })).toHaveAttribute("href", `/documentos/${doc.id}?documentTab=workflow`);
  const context = await browser.newContext();
  try {
    const model = await context.newPage(); await model.route(/^https?:/, route => route.abort());
    await model.goto(pathToFileURL(resolve("Home_Care_Assistant_Modelo_Integral.html")).href + "#entregas/pendentes");
    await model.locator("#roleSelect").selectOption("family"); const reference = model.locator(".record").last();
    await expect(reference).toBeVisible();
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 }); await model.setViewportSize({ width, height: 900 });
      for (const property of ["display", "gap", "padding-top", "padding-left", "border-bottom-color"] as const) await expect(row).toHaveCSS(property, await reference.evaluate((node, property) => getComputedStyle(node).getPropertyValue(property), property));
      for (const property of ["width", "height", "border-radius", "background-color"] as const) await expect(row.locator(".hca-delivery-task-icon")).toHaveCSS(property, await reference.locator(".record-icon").evaluate((node, property) => getComputedStyle(node).getPropertyValue(property), property));
      await auditFromTop(page, "canonical delivery task " + width);
    }
    await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
    expect(await page.evaluate(() => matchMedia("(forced-colors: active)").matches && matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(true);
    await auditFromTop(page, "delivery task forced colors and reduced motion");
    await page.emulateMedia({ forcedColors: "none", reducedMotion: "no-preference" });
    const state = page.getByRole("combobox", { name: "Situação das entregas", exact: true });
    await state.selectOption("pending_receipt"); await expect(page).toHaveURL(/deliveryStatus=pending_receipt/);
    const filtered = page.url(); await row.getByRole("link", { name: "Acompanhar", exact: true }).click();
    await expect(page.getByRole("heading", { name: doc.code, exact: true })).toBeVisible(); await page.goBack();
    await expect(page).toHaveURL(filtered); await expect(state).toHaveValue("pending_receipt"); await expect(row).toBeVisible();
    await page.getByRole("navigation", { name: "Visões das entregas", exact: true }).getByRole("link", { name: "Acompanhar", exact: true }).click();
    await expect(state).toHaveValue("tasks"); const cta = row.getByRole("link", { name: "Conferir", exact: true });
    await expect(cta).not.toHaveAttribute("aria-disabled", "true"); await cta.focus(); await cta.press("Enter");
    await expect(page).toHaveURL(new RegExp(`/documentos/${doc.id}\\?documentTab=workflow$`));
    await expect(page.getByRole("tab", { name: "Materiais", exact: true })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("heading", { name: "Expedição preservada", exact: true })).toBeVisible();
    await page.goBack(); await expect(state).toHaveValue("tasks"); await page.setViewportSize({ width: 320, height: 900 });
    await row.evaluate(node => node.scrollIntoView({ block: "center", behavior: "instant" }));
    mkdirSync("output/playwright/phase-d", { recursive: true });
    await page.screenshot({ path: `output/playwright/phase-d/delivery-task-${info.project.name}.png`, animations: "disabled" });
    expect(facts(f.patient)).toBe(before); expect(posted).toEqual([]);
  } finally { await context.close(); }
});

test("ENT-02 autonomous return keeps three parties and suspends a stale task without inventing missing legacy names", async ({ page }) => {
  const f = await transferFixture(), created = await declareTransfer(f, { originDocumentId: null }); expect(created.response.error).toBeNull();
  const doc = created.response.data, declaration = doc.transfer.declaration;
  await login(page, f.patient, f.counterparty.email); const before = facts(f.patient), posted = writes(page);
  let mode = "live";
  await page.route("**/api/deliveries?*", async route => {
    if (mode === "error") return route.fulfill({ status: 503, json: { code: "UNAVAILABLE", error: "Tarefa atual não confirmada neste ensaio" } });
    const response = await route.fetch(), body = await response.json();
    if (mode === "legacy") for (const row of body.data) row.deliverySummary = { source: null, destination: null, recordedByName: null, recipientName: null, counterpartyName: null, receivedByName: null };
    return route.fulfill({ response, json: body });
  });
  try {
    await page.goto("/entregas?careRecipientId=" + f.patient); const row = card(page, doc.id);
    await expect(row).toContainText("Devolução de materiais"); await expect(row).toContainText("Equipe → Família");
    await expect(row).toContainText(declaration.actor.name); await expect(row).toContainText(declaration.counterparty.name); await expect(row).toContainText(declaration.recipient.name);
    await expect(row.getByRole("link", { name: "Registro sem expedição", exact: true })).toBeVisible();
    const cta = row.getByRole("link", { name: "Abrir tarefa", exact: true }); await cta.focus(); mode = "error";
    await page.evaluate(() => window.dispatchEvent(new Event("hca:data-changed")));
    await expect(page.getByRole("alert").filter({ hasText: "Tarefa atual não confirmada" })).toBeVisible(); await expect(cta).toHaveAttribute("aria-disabled", "true");
    await expect(cta).toBeFocused(); const previous = page.url(); await cta.press("Enter"); expect(page.url()).toBe(previous);
    mode = "live"; await page.getByRole("button", { name: "Tentar novamente", exact: true }).click(); await expect(cta).not.toHaveAttribute("aria-disabled", "true");
    mode = "legacy"; await page.evaluate(() => window.dispatchEvent(new Event("hca:data-changed")));
    await expect(row).toContainText("Percurso não preservado neste registro");
    await expect(row.getByText("Nome não preservado neste registro", { exact: false })).toHaveCount(2);
    await expect(row).not.toContainText("Conferência pessoal registrada por");
    await page.setViewportSize({ width: 320, height: 900 }); await auditFromTop(page, "legacy unavailable delivery names");
    expect(facts(f.patient)).toBe(before); expect(posted).toEqual([]);
  } finally { await page.unrouteAll({ behavior: "wait" }); }
});
