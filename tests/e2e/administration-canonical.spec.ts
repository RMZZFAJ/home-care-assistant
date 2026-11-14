import { expect, test, type Page, type Locator } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { mkdirSync } from "node:fs";
import { actor, fixtures, rpc, setup } from "../integration/v4-fixtures.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { selectContext } from "./auth-context";
import { auditFromTop } from "./accessibility-audit";

test.setTimeout(180_000);
const widths = [320, 390, 768, 1024, 1440];
const referenceUrl = pathToFileURL(resolve("Home_Care_Assistant_Modelo_Integral.html")).href;
const facts = (patient: string) => sql(`select jsonb_build_object(
  'settings',(select to_jsonb(s) from public.patient_settings s where care_recipient_id=${q(patient)}),
  'changes',(select jsonb_agg(to_jsonb(c) order by id) from public.access_change_requests c where care_recipient_id=${q(patient)}),
  'members',(select jsonb_agg(to_jsonb(m) order by user_id) from public.care_recipient_memberships m where care_recipient_id=${q(patient)}),
  'stock',(select jsonb_agg(to_jsonb(s) order by id) from public.stock_movements s where care_recipient_id=${q(patient)}));`);
async function login(page: Page, patient: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(fixtures.adminA.email);
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

test("15 ADM02 ADM03 patient resources and policy follow the model without changing facts by navigation", async ({ page, browser }, info) => {
  const f = await setup(); await login(page, f.patient);
  await page.goto(`/admin?section=patient&careRecipientId=${f.patient}`);
  const card = page.getByRole("region", { name: "Cadastro do paciente", exact: true });
  await expect(card).toBeVisible();
  const before = facts(f.patient), writes: string[] = [];
  page.on("request", request => { if (new URL(request.url()).pathname.startsWith("/api/") && request.method() !== "GET") writes.push(request.url()); });
  const reference = await browser.newContext();
  try {
    const model = await reference.newPage(); await model.route(/^https?:/, route => route.abort());
    await model.goto(referenceUrl + "#administracao/residencia");
    const destinations = page.getByRole("navigation", { name: "Destinos autorizados do paciente", exact: true });
    const hrefs = await destinations.getByRole("link").evaluateAll(nodes => nodes.map(node => node.getAttribute("href")));
    expect(hrefs).toHaveLength(3); expect(hrefs.every(href => href?.includes(f.patient))).toBe(true);
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 }); await model.setViewportSize({ width, height: 900 }); await model.screenshot();
      await compare(card, model.locator(".card.pad").first(), cardProperties);
      await compare(card.getByRole("heading"), model.locator(".card.pad h2").first(), ["font-size", "font-weight"]);
      await compare(card.locator(".hca-field > label").first(), model.locator(".field").first(), ["font-size", "font-weight"]);
      const columns = await card.locator("form").evaluate(node => getComputedStyle(node).gridTemplateColumns.split(" ").length);
      expect(columns).toBe(width <= 500 ? 1 : 2);
      await auditFromTop(page, "administration resources " + width);
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

test("15 ADM04 NOT03 proposals retain comparison and notice rules recover a failed read without a write", async ({ page, browser }, info) => {
  const f = await setup(), global = await actor("global");
  const proposal = await rpc(global, "configure_patient_access", { p_patient: f.patient, p_kind: "settings", p_change: { patientShortName: "Residência proposta de conferência" }, p_key: randomUUID(), p_version: 1 });
  await login(page, f.patient); await page.goto(`/configuracoes?careRecipientId=${f.patient}&area=people`);
  const card = page.locator(`article[data-proposal-id="${proposal.id}"]`); await expect(card).toBeVisible();
  const before = facts(f.patient), writes: string[] = [];
  page.on("request", request => { if (new URL(request.url()).pathname.startsWith("/api/") && request.method() !== "GET") writes.push(request.url()); });
  const reference = await browser.newContext();
  try {
    const model = await reference.newPage(); await model.route(/^https?:/, route => route.abort());
    await model.goto(referenceUrl + "#administracao/residencia");
    await card.getByText("Comparar configuração vigente e proposta", { exact: true }).click();
    await expect(card.getByRole("table", { name: "Configuração vigente e proposta", exact: true })).toContainText("Residência proposta de conferência");
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 }); await model.setViewportSize({ width, height: 900 }); await model.screenshot();
      await compare(card, model.locator(".card.pad").first(), cardProperties);
      await auditFromTop(page, "administration proposal " + width);
    }
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
