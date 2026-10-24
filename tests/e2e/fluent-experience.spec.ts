import { test, expect, type Page } from "@playwright/test";
import { readFileSync, mkdirSync } from "node:fs";
import { fixtureFile } from "../../scripts/test-environment.mjs";
import { fixturePassword, patientA, patientB } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";

async function login(page: Page, role: string) {
  const fixture = JSON.parse(readFileSync(fixtureFile, "utf8"));
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(fixture[role].email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible();
  await selectContext(page, patientA);
}
async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
}
async function capture(page: Page, name: string, project: string) {
  mkdirSync("output/playwright/fluent", { recursive: true });
  await page.screenshot({ path: `output/playwright/fluent/${name}-${project}.png`, fullPage: await page.getByRole("dialog").count() === 0, animations: "disabled" });
}

test("gestão Fluent troca contexto no submenu, mantém navegação e edita perfil sob demanda", async ({ page }, info) => {
  const failures: string[] = [];
  page.on("pageerror", (error) => failures.push(error.message));
  await login(page, "shared");
  await page.getByLabel("Menu do usuário", { exact: true }).click();
  await page.getByRole("menuitem", { name: "Meu perfil e segurança", exact: true }).click();
  await expect(page).toHaveURL(/\/perfil/);
  await expect(page.getByRole("button", { name: "Identidade pessoal", exact: true })).toHaveAttribute("aria-expanded", "false");
  await page.getByRole("button", { name: "Identidade pessoal", exact: true }).click();
  await expect(page.getByLabel("Nome", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Identidade pessoal", exact: true }).click();
  await expect(page.getByLabel("Nome", { exact: true })).not.toBeVisible();
  await capture(page, "perfil", info.project.name);
  await selectContext(page, patientB);
  await expect(page).toHaveURL(/\/perfil/);
  await expect(page.getByRole("region", { name: "Mudar perfil", exact: true })).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Abrir navegação", exact: true }).click();
  await expect(page.getByRole("navigation", { name: "Navegação principal", exact: true })).toBeVisible();
  await noOverflow(page);
  await capture(page, "menu-gerencial-mobile", info.project.name);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Abrir navegação", exact: true })).toBeFocused();
  expect(failures).toEqual([]);
});

test("operação móvel oferece cinco destinos e caixa de entregas autorizada", async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, "professional");
  const navigation = page.getByRole("navigation", { name: "Navegação do plantão", exact: true });
  for (const label of ["Início", "Histórico", "Entregas", "Estoque", "Mais"]) await expect(navigation.getByRole("link", { name: label, exact: true })).toBeVisible();
  await capture(page, "inicio-equipe-mobile", info.project.name);
  await navigation.getByRole("link", { name: "Entregas", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Entregas e recebimentos", exact: true })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Responsável pelas entregas", exact: true })).toHaveValue("own");
  await noOverflow(page);
  const response = await page.request.get(`/api/deliveries?careRecipientId=${patientA}&scope=own`);
  expect(response.ok()).toBeTruthy();
  const context = (await (await page.request.get("/api/context")).json()).data;
  for (const row of (await response.json()).data) expect(row.recipient_id).toBe(context.userId);
  await capture(page, "entregas-equipe-mobile", info.project.name);
});
