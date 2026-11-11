import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { fixtures, setup } from "../integration/v4-fixtures.mjs";
import { selectContext } from "./auth-context";
import { auditFromTop } from "./accessibility-audit";

async function login(page: Page, patient: string | null, role: "adminA" | "global" = "adminA") {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(fixtures[role].email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible();
  await selectContext(page, patient);
}

test("catalogue receipt is discoverable after closing the editor, losing write access and opening another session", async ({ page, browser }) => {
  test.setTimeout(120_000);
  const f = await setup();
  const item = "Material confirmado " + randomUUID().slice(0, 8);
  const count = () => sql(`select count(*) from public.care_recipient_products where care_recipient_id=${q(f.patient)} and name=${q(item)};`);
  let sent = 0;
  await login(page, f.patient);
  await page.goto(`/admin?careRecipientId=${f.patient}&section=catalog`);
  await page.route("**/api/admin", async route => {
    if (route.request().method() !== "POST" || route.request().postDataJSON().action !== "product") return route.continue();
    sent += 1;
    const response = await route.fetch();
    expect(response.status()).toBe(200);
    await route.abort("failed");
  });
  await page.getByRole("button", { name: "Novo item", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "Adicionar item exclusivo deste paciente" });
  await editor.getByLabel("Nome", { exact: true }).fill(item);
  await editor.getByRole("button", { name: "Salvar item", exact: true }).click();
  await editor.getByRole("button", { name: "Fechar e recuperar depois", exact: true }).click();
  await expect(editor).toHaveCount(0);
  expect(count()).toBe("1");
  sql(`insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${q(f.patient)},${q(fixtures.adminA.id)},'catalog.manage',false);`);

  await page.goto("/mais");
  const actions = page.getByRole("navigation", { name: "Rotina e funções autorizadas" });
  await expect(actions.getByRole("link", { name: /^Unidades e apresentações/ })).toHaveCount(0);
  await actions.getByRole("link", { name: /^Comprovantes do catálogo/ }).click();
  const confirmed = page.getByRole("region", { name: "Comprovantes confirmados", exact: true });
  await expect(confirmed.getByText(item, { exact: true })).toBeVisible();
  const pending = page.getByRole("region", { name: "Tentativas aguardando confirmação" });
  const consult = pending.getByRole("button", { name: /^Consultar tentativa de Novo item/ });
  await page.route("**/api/admin/catalogue-preparations?**", async route => {
    const key = new URL(route.request().url()).searchParams.get("key");
    if (!key) return route.continue();
    const response = await route.fetch();
    const { receipt } = await response.json();
    await route.fulfill({ response, json: { receipt: { ...receipt, key: randomUUID() } } });
  });
  await consult.click();
  await expect(pending.getByText("O comprovante recebido não corresponde a esta tentativa.")).toBeVisible();
  await page.unroute("**/api/admin/catalogue-preparations?**");
  await consult.click();
  await expect(pending).toHaveCount(0);
  await expect(confirmed.getByText(item, { exact: true })).toBeVisible();
  expect(sent).toBe(1);

  const freshContext = await browser.newContext();
  try {
    const freshPage = await freshContext.newPage();
    await login(freshPage, f.patient);
    await freshPage.goto("/comprovantes-catalogo");
    await expect(freshPage.getByRole("region", { name: "Comprovantes confirmados", exact: true })
      .getByText(item, { exact: true })).toBeVisible();
    await expect(freshPage.getByRole("region", { name: "Tentativas aguardando confirmação" })).toHaveCount(0);
    const response = await freshPage.request.get(`/api/admin/catalogue-preparations/receipts?mode=patient&patientId=${f.patient}`);
    expect(response.headers()["cache-control"]).toContain("no-store");
    expect((await response.json()).entries).toHaveLength(1);
  } finally {
    await freshContext.close();
  }
  expect(count()).toBe("1");
  if (test.info().project.name === "chromium") {
    for (const width of [320, 390, 768, 1150, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await auditFromTop(page, "catalogue-receipts-" + width);
    }
  }
});

test("global catalogue proposal is found in its patient history, separately from global units", async ({ page }) => {
  test.setTimeout(120_000);
  const f = await setup();
  await login(page, null, "global");
  await page.goto(`/admin?careRecipientId=${f.patient}&section=catalog`);
  await page.getByRole("button", { name: "Novo item", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "Adicionar item exclusivo deste paciente" });
  await editor.getByLabel("Nome", { exact: true }).fill("Proposta fictícia para histórico");
  await editor.getByRole("button", { name: "Salvar item", exact: true }).click();
  await expect(editor).toHaveCount(0);
  await page.getByRole("link", { name: "Comprovantes do catálogo", exact: true })
    .filter({ hasNot: page.locator("nav") }).and(page.locator('a[href*="paciente="]')).click();
  const confirmed = page.getByRole("region", { name: "Comprovantes confirmados", exact: true });
  await expect(confirmed.getByText("Proposta registrada para aprovação local.", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Comprovantes de unidades globais", exact: true }).click();
  await expect(confirmed.getByText(/Unidades globais/).first()).toBeVisible();
  await expect(confirmed.getByText("Proposta registrada para aprovação local.", { exact: true })).toHaveCount(0);
});
