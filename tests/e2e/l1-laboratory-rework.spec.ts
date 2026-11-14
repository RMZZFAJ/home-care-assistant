import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { setup, issue, fixtures } from "../integration/v4-fixtures.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";
import { selectDocumentSection } from "./document-sections";
import { auditFromTop } from "./accessibility-audit";

test.setTimeout(180_000);
const directory = "output/playwright/l1-rework";
async function capture(page: Page, name: string, fullPage = true) {
  mkdirSync(directory, { recursive: true });
  if (fullPage) {
    await page.evaluate(() => { scrollTo({ top: 0, behavior: "instant" }); });
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
    await expect(page.locator(".hca-document-compact:visible")).toHaveCount(0);
  }
  const layout = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth, overflow: [...document.querySelectorAll("main *")].filter(element => element.getBoundingClientRect().right > innerWidth + 1).map(element => ({ tag: element.tagName, class: element.className, width: element.getBoundingClientRect().width })).slice(0, 30), fonts: [...document.querySelectorAll("h1,.btn,.av-metric")].slice(0, 5).map(element => ({ class: element.className, font: getComputedStyle(element).fontFamily })) }));
  writeFileSync(`${directory}/${name}.json`, JSON.stringify(layout, null, 2));
  await page.screenshot({ path: `${directory}/${name}.png`, fullPage, animations: "disabled" });
  expect(layout.scroll).toBeLessThanOrEqual(layout.width);
}
async function login(page: Page, patient: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(fixtures.family.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible();
  await selectContext(page, patient);
  await expect(page.locator(".hca-activity-overlay")).toHaveCount(0);
}

test("L1 laboratório: início e histórico usam as composições reais em desktop e celular", async ({ page }) => {
  const f = await setup(); await issue(f.patient, f.products);
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 940 }); await page.goto("/login");
    await expect(page.getByRole("button", { name: "Entrar", exact: true })).toBeEnabled(); await capture(page, `login-${width}`);
  }
  await page.goto("/verificar");
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 940 });
    await expect(page.getByRole("tab", { name: "Consultar código", exact: true })).toHaveAttribute("aria-selected", "true");
    await capture(page, `verificacao-codigo-${width}`);
    await page.getByRole("tab", { name: "Conferir PDF", exact: true }).click();
    await expect(page.getByLabel("Arquivo PDF para conferir", { exact: true })).toBeVisible();
    await capture(page, `verificacao-arquivo-${width}`);
    await page.getByRole("tab", { name: "Consultar código", exact: true }).click();
  }
  await login(page, f.patient);
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 940 });
    await expect(page.locator(".request-progress-row").first()).toBeVisible();
    await expect(page.locator(".av-metric").first().locator(".metric-icon")).toBeVisible();
    await expect(page.locator(".av-metric").first().locator(".metric-link")).toContainText("Ver requisições");
    await capture(page, `inicio-${width}`);
  }
  await page.goto(`/historico?careRecipientId=${f.patient}`);
  await expect(page.locator(".av-record").first()).toBeVisible();
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 940 });
    await expect(page.getByRole("searchbox", { name: "Buscar por código ou protocolo" })).toBeVisible();
    await capture(page, `historico-${width}`);
    await page.getByRole("button", { name: "Filtros", exact: true }).click();
    await expect(page.getByLabel("Tipo de ficha", { exact: true })).toBeVisible();
    await capture(page, `historico-filtros-${width}`);
    await page.getByRole("button", { name: "Aplicar filtros", exact: true }).click();
    await expect(page.getByLabel("Tipo de ficha", { exact: true })).toHaveCount(0);
    await expect(page.locator(".history-results .av-record").first()).toBeVisible();
    await expect(page.locator(".hca-activity-overlay")).toHaveCount(0);
  }
  await auditFromTop(page, "Histórico L1 reproduzido");
});

test("L1 laboratório: ficha, ciência em etapas e exemplares preservam os atos reais", async ({ page }) => {
  const f = await setup(), req = await issue(f.patient, f.products); await login(page, f.patient);
  await page.goto(`/documentos/${req.id}`);
  await expect(page.locator(".doc-feed")).toBeVisible();
  await page.getByRole("combobox", { name: "Período dos andamentos", exact: true }).selectOption("custom");
  const feed = page.locator(".hca-progress-feed");
  await feed.getByLabel("De", { exact: true }).fill("1900-01-01"); await feed.getByLabel("Até", { exact: true }).fill("1900-01-01");
  await feed.getByRole("button", { name: "Aplicar período", exact: true }).click();
  await expect(feed).toContainText("Nenhum andamento corresponde a este filtro e página.");
  await page.getByRole("combobox", { name: "Período dos andamentos", exact: true }).selectOption("all");
  await expect(page.locator(".doc-feed")).toBeVisible();
  for (const width of [1440, 390]) { await page.setViewportSize({ width, height: 940 }); await capture(page, `req-visao-geral-${width}`); }
  await selectDocumentSection(page, "materials");
  await expect(page.getByRole("heading", { name: "Ciência familiar", exact: true })).toBeVisible();
  for (const width of [1440, 390]) { await page.setViewportSize({ width, height: 940 }); await capture(page, `req-materiais-${width}`); }
  let postRelease!: () => void, postSeen!: () => void, readRelease!: () => void, readSeen!: () => void;
  const postGate = new Promise<void>(resolve => { postRelease = resolve; }), posted = new Promise<void>(resolve => { postSeen = resolve; });
  const readGate = new Promise<void>(resolve => { readRelease = resolve; }), read = new Promise<void>(resolve => { readSeen = resolve; });
  await page.route(`**/api/requisitions/${req.id}/science*`, async route => {
    const response = await route.fetch();
    if (route.request().method() === "POST") { postSeen(); await postGate; } else { readSeen(); await readGate; }
    await route.fulfill({ response });
  });
  try {
    await page.getByRole("button", { name: "Dar ciência", exact: true }).click();
    await page.getByRole("button", { name: "Confirmar minha ciência", exact: true }).click(); await posted;
    await expect(page.getByRole("dialog", { name: "Registrando sua ciência", exact: true })).toBeVisible();
    await capture(page, "carregamento-ciencia-registro", false);
    postRelease(); await read;
    await expect(page.getByRole("dialog", { name: "Conferindo a resposta", exact: true })).toBeVisible();
    await capture(page, "carregamento-ciencia-conferencia", false); readRelease();
    await expect(page.getByText("Ciência registrada para o conteúdo confirmado.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Dar ciência", exact: true })).toHaveCount(0);
  } finally { postRelease(); readRelease(); }
  await page.unroute(`**/api/requisitions/${req.id}/science*`);
  await selectDocumentSection(page, "files");
  await page.getByRole("button", { name: "Gerar PDF", exact: true }).click();
  await expect(page.getByRole("link", { name: "Visualizar", exact: true }).first()).toBeVisible({ timeout: 90_000 });
  for (const width of [1440, 390]) { await page.setViewportSize({ width, height: 940 }); await capture(page, `req-arquivos-${width}`); }
  const summary = page.getByText("Identificação do exemplar", { exact: true }).first(); await summary.click();
  expect(await summary.evaluate(element => getComputedStyle(element).listStyleType)).toBe("none");
  await capture(page, "req-identificacao-exemplar"); await auditFromTop(page, "Arquivos L1 reproduzidos");
  const fileUrl = await page.getByRole("link", { name: "Visualizar", exact: true }).first().getAttribute("href");
  const pdf = await page.request.get(fileUrl!); expect(pdf.status()).toBe(200); const bytes = await pdf.body();
  await page.getByRole("link", { name: "Abrir validação pública", exact: true }).click();
  const result = page.getByRole("region", { name: "Resultado da verificação", exact: true });
  await expect(result.getByRole("heading", { name: "Emissão localizada", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Voltar à ficha", exact: true })).toHaveAttribute("href", `/documentos/${req.id}?documentTab=files`);
  await page.getByRole("tab", { name: "Conferir PDF", exact: true }).click();
  await page.getByLabel("Arquivo PDF para conferir", { exact: true }).setInputFiles({ name: "exemplar-ficticio-l1.pdf", mimeType: "application/pdf", buffer: bytes });
  await page.getByRole("button", { name: "Conferir PDF", exact: true }).click();
  await expect(result).toContainText("Os bytes coincidem com o exemplar registrado");
  await result.getByText("Detalhes da conferência", { exact: true }).click();
  await expect(result.getByText("Os bytes coincidem com o exemplar registrado.", { exact: true })).toBeVisible();
  for (const width of [1440, 390]) { await page.setViewportSize({ width, height: 940 }); await capture(page, `verificacao-exemplar-real-${width}`); }
  await auditFromTop(page, "Verificação pública L1 reproduzida");
});

test("L1 laboratório: consulta bloqueante usa a sobreposição simples e libera a tela ao terminar", async ({ page }) => {
  const f = await setup(); await login(page, f.patient);
  let release!: () => void, seen!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; }), entered = new Promise<void>(resolve => { seen = resolve; });
  await page.route("**/api/documents?*", async route => { const response = await route.fetch(); seen(); await gate; await route.fulfill({ response }); });
  try {
    await page.goto(`/historico?careRecipientId=${f.patient}`); await entered;
    const dialog = page.getByRole("dialog", { name: "Consultando as fichas", exact: true }); await expect(dialog).toBeVisible();
    await expect(page.locator(".activity-spinner")).toBeVisible(); await expect(page.locator(".activity-steps")).toHaveCount(0);
    await page.keyboard.press("Escape"); await expect(dialog).toBeVisible(); await capture(page, "carregamento-simples", false);
    release(); await expect(dialog).toHaveCount(0);
    await expect(page.getByRole("searchbox", { name: "Buscar por código ou protocolo" })).toBeEnabled();
  } finally { release(); }
});
