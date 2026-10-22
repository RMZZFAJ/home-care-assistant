import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
import { fixturePassword, patientA } from "../../scripts/test-constants.mjs";
import { fixtureFile } from "../../scripts/test-environment.mjs";

test("login e formulário permitem navegação acessível em desktop e celular", async ({page}) => {
  test.setTimeout(120_000);
  const fixture = JSON.parse(readFileSync(fixtureFile, "utf8"));
  await page.goto("/login");
  const login = await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze();
  expect(login.violations).toEqual([]);
  await page.getByLabel("E-mail", {exact:true}).fill(fixture.global.email);
  await page.getByLabel("E-mail", {exact:true}).press("Tab");
  await expect(page.getByLabel("Senha", {exact:true})).toBeFocused();
  await page.keyboard.type(fixturePassword);
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", {name:"Entrar",exact:true})).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading",{name:"Requisição de insumos"}).first()).toBeVisible();
  await page.goto(`/?careRecipientId=${patientA}`);
  await expect(page.getByRole("combobox",{name:"Pessoa assistida",exact:true})).toBeVisible();
  await page.getByRole("button",{name:"Continuar",exact:true}).click();
  await page.getByRole("button",{name:"Continuar",exact:true}).click();
  await page.getByRole("checkbox",{name:"Fralda",exact:true}).check();
  const form = await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze();
  expect(form.violations).toEqual([]);
  const width = await page.evaluate(() => ({viewport:document.documentElement.clientWidth,content:document.documentElement.scrollWidth}));
  expect(width.content).toBeLessThanOrEqual(width.viewport);
  for (const [path, heading] of [["/historico", "Histórico de requisições"], ["/estoque", "Estoque por custódia"], ["/inventarios", "Inventários e contagem semanal"], ["/admin", "Administração"]]) {
    await page.goto(`${path}?careRecipientId=${patientA}`);
    await expect(page.getByRole("heading", { name: heading, exact: true }).first()).toBeVisible();
    await expect(page.getByText("Validando sessão e pacientes autorizados…", { exact: true })).toHaveCount(0);
    await expect(page.getByText(/^Carregando/)).toHaveCount(0);
    const result = await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze();
    expect(result.violations, `Acessibilidade em ${path}`).toEqual([]);
    const bounds = await page.evaluate(() => ({viewport:document.documentElement.clientWidth,content:document.documentElement.scrollWidth}));
    expect(bounds.content, `Largura em ${path}`).toBeLessThanOrEqual(bounds.viewport);
  }
});
