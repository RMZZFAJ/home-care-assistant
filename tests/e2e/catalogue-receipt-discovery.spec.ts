import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { actor, fixtures, rpc, setup } from "../integration/v4-fixtures.mjs";
import { catalogueHistoryFixture } from "../integration/catalogue-history-fixtures.mjs";
import type { CatalogueAttempt } from "../../src/lib/validation/catalogue-preparation";
import { selectContext } from "./auth-context";
import { audit } from "./accessibility-audit";

async function login(page: Page, patient: string | null, role: "adminA" | "global" = "adminA") {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(fixtures[role].email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible();
  await selectContext(page, patient);
}

async function priorCatalogueReceipt(client: Awaited<ReturnType<typeof actor>>, patient: string, name: string, mode: "patient" | "global") {
  const scope = { p_patient: patient, p_mode: mode, p_purpose: "create", p_target: null };
  const { reference } = await rpc(client, "catalogue_preparation_read", scope);
  const attempt: CatalogueAttempt = {
    patientId: patient, mode, purpose: "create", targetId: null, action: "commit", id: null, revision: 0,
    key: randomUUID(), referenceHash: reference.hash,
    fields: { name, unit: "unidade", category: "higiene", description: "", aliases: "", sortOrder: "0", isActive: true },
  };
  return rpc(client, "catalogue_preparation_command", {
    ...scope, p_action: attempt.action, p_key: attempt.key, p_id: attempt.id, p_revision: attempt.revision,
    p_fields: attempt.fields, p_reference_hash: attempt.referenceHash,
  });
}

test("L4 histórico do material mostra alterações oficiais e recupera a própria consulta", async ({ page, context }, info) => {
  test.setTimeout(180_000);
  const f = await catalogueHistoryFixture();
  await login(page, f.patient);
  await page.goto("/admin?careRecipientId=" + f.patient + "&section=catalog");
  await page.getByRole("button", { name: /^Histórico de alterações/ }).click();
  const collection = page.getByRole("dialog", { name: "Histórico de alterações", exact: true });
  const selection = collection.getByRole("combobox", { name: "Material para consultar", exact: true });
  await selection.fill(f.currentName);
  await selection.press("ArrowDown");
  await page.getByRole("option", { name: f.currentName + " · unidade", exact: true }).click();
  await expect(collection.getByRole("button", { name: /^Material reativado/ })).toBeVisible();
  await collection.getByRole("button", { name: "Voltar ao catálogo", exact: true }).click();

  await page.locator("[data-product-id]").filter({ hasText: f.currentName }).click();
  const product = page.getByRole("dialog", { name: f.currentName, exact: true });
  await product.getByRole("button", { name: /^Histórico do material/ }).click();
  const history = page.getByRole("dialog", { name: "Histórico do material", exact: true });
  const presentation = history.getByRole("button", { name: /^Apresentação atualizada/ });
  await expect(presentation).toBeVisible();
  await expect(history.getByRole("button", { name: /^Cadastro do material atualizado/ })).toBeVisible();
  if (info.project.name === "chromium") {
    for (const width of [360, 412]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(history.getByRole("button", { name: "Atualizar histórico", exact: true })).toBeInViewport({ ratio: 1 });
      await history.screenshot({ path: info.outputPath("historico-material-" + width + ".png") });
    }
    await audit(page, "historico-material");
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  }
  await presentation.click();
  const detail = page.getByRole("dialog", { name: "Apresentação atualizada", exact: true });
  await expect(detail).toContainText("1 embalagem = 10 unidade");
  await expect(detail).toContainText("1 embalagem = 8 unidade");
  if (info.project.name === "chromium") {
    await detail.getByRole("button", { name: "Copiar referência", exact: true }).click();
    const reference = await page.evaluate(() => navigator.clipboard.readText());
    expect(reference).toMatch(/^[a-f0-9-]{36}\/v2$/);
  }
  await detail.getByRole("button", { name: "Voltar", exact: true }).click();
  await expect(presentation).toBeFocused();

  const historyRoute = "**/api/catalog/history?*";
  let failures = 1;
  await page.route(historyRoute, route => failures-- > 0
    ? route.fulfill({ status: 503, json: { error: "Consulta indisponível" } })
    : route.continue());
  await history.getByRole("button", { name: "Atualizar histórico", exact: true }).click();
  const error = page.getByRole("dialog", { name: "Não foi possível consultar o histórico", exact: true });
  await error.getByRole("button", { name: "Consultar novamente", exact: true }).click();
  const updated = page.getByRole("dialog", { name: "Histórico atualizado", exact: true });
  await updated.getByRole("button", { name: "Concluir", exact: true }).click();
  await expect(presentation).toBeVisible();

  failures = 3;
  await history.getByRole("button", { name: "Atualizar histórico", exact: true }).click();
  for (let retry = 0; retry < 2; retry++) await error.getByRole("button", { name: "Consultar novamente", exact: true }).click();
  await expect(error.getByRole("button", { name: "Copiar detalhes", exact: true })).toBeVisible();
  await error.getByRole("button", { name: "Voltar", exact: true }).click();
  await expect(presentation).toBeVisible();
  await page.unroute(historyRoute);
  await history.getByRole("button", { name: "Voltar ao material", exact: true }).click();
  await expect(product.getByRole("button", { name: /^Histórico do material/ })).toBeFocused();
});

test("a tentativa própria segue disponível ao titular após perder edição e iniciar outra sessão", async ({ page, browser }) => {
  const f = await setup();
  const item = "Material confirmado " + randomUUID().slice(0, 8);
  const attempt = await priorCatalogueReceipt(f.admin, f.patient, item, "patient");
  await login(page, f.patient);
  await page.goto("/mais");
  await expect(page.getByRole("link", { name: /^Comprovantes do catálogo/ })).toHaveCount(0);
  expect((await page.request.get("/comprovantes-catalogo")).status()).toBe(404);
  sql("insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(" +
    q(f.patient) + "," + q(fixtures.adminA.id) + ",'catalog.manage',false)");

  const freshContext = await browser.newContext();
  try {
    const freshPage = await freshContext.newPage();
    await login(freshPage, f.patient);
    const scope = new URLSearchParams({ patientId: f.patient, mode: "patient" });
    const response = await freshPage.request.get("/api/admin/catalogue-preparations/receipts?" + scope);
    expect(response.ok()).toBe(true);
    expect(response.headers()["cache-control"]).toContain("no-store");
    expect((await response.json()).entries.map((row: { currentName: string }) => row.currentName)).toEqual([item]);
    scope.set("key", attempt.key);
    scope.set("purpose", "create");
    const exact = await freshPage.request.get("/api/admin/catalogue-preparations?" + scope);
    expect(exact.ok()).toBe(true);
    expect((await exact.json()).receipt).toEqual(attempt);
    const scopedHistory = await freshPage.request.get("/api/catalog/history?" + new URLSearchParams({
      careRecipientId: f.patient, productId: attempt.outcome.productId,
    }));
    expect(scopedHistory.status()).toBe(403);
  } finally {
    await freshContext.close();
  }
});

test("a consulta técnica da proposta global mantém seu paciente separado das unidades gerais", async ({ page }) => {
  const f = await setup();
  await login(page, null, "global");
  const proposal = await priorCatalogueReceipt(await actor("global"), f.patient, "Proposta fictícia para histórico", "global");
  const general = "/api/admin/catalogue-preparations/receipts?mode=global";
  const response = await page.request.get(general + "&patientId=" + f.patient);
  expect(response.ok()).toBe(true);
  const { entries } = await response.json();
  expect(entries).toEqual(expect.arrayContaining([expect.objectContaining({ id: proposal.id, outcome: proposal.outcome })]));
  const units = await page.request.get(general);
  expect(units.ok()).toBe(true);
  expect((await units.json()).entries).not.toEqual(expect.arrayContaining([expect.objectContaining({ id: proposal.id })]));
  expect((await page.request.get("/api/catalog/history?" + new URLSearchParams({
    careRecipientId: f.patient, productId: f.products[0],
  }))).status()).toBe(404);
});
