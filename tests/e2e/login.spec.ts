import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";
import {
  assertLocalProject,
  fixtureFile,
} from "../../scripts/test-environment.mjs";

test("exibe a tela de login", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();
  await expect(page.getByLabel("E-mail")).toBeVisible();
  await expect(page.getByLabel("Senha", { exact: true })).toBeVisible();
});

test("informa que o Google estará disponível em breve sem iniciar OAuth", async ({ page }) => {
  let authorizationRequests = 0;
  await page.route("**/auth/v1/authorize?**", async (route) => {
    authorizationRequests += 1;
    await route.abort();
  });
  await page.goto("/login");
  await page.getByRole("button", { name: "Continuar com Google", exact: true }).click();
  await expect(page.getByRole("status", { name: "" }).filter({ hasText: "Em breve, você poderá entrar com sua conta Google." })).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
  expect(authorizationRequests).toBe(0);
});

test("login apresenta falha de credencial e de rede e permite recuperar a sessão", async ({
  page,
}) => {
  test.setTimeout(60_000);
  assertLocalProject();
  const fixture = JSON.parse(readFileSync(fixtureFile, "utf8"));
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(fixture.global.email);
  await page.getByLabel("Senha", { exact: true }).fill("Senha-incorreta-2026!");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText(
    "E-mail ou senha inválidos.",
  );
  await expect(
    page.getByRole("button", { name: "Entrar", exact: true }),
  ).toBeEnabled();
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.route("**/auth/v1/token?**", (route) => route.abort("failed"));
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText(
    "Não foi possível conectar. Tente novamente.",
    { timeout: 15_000 },
  );
  await expect(
    page.getByRole("button", { name: "Entrar", exact: true }),
  ).toBeEnabled();
  await expect(page).toHaveURL(/\/login$/);
  await page.unroute("**/auth/v1/token?**");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible();
  await selectContext(page, null);
  await expect(page.getByRole("button", { name: /^Paciente atual/ })).toBeEnabled();
  await page.getByLabel("Menu do usuário", { exact: true }).click();
  await page.getByRole("menuitem", { name: "Sair", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect(
    await page.evaluate(() =>
      Object.keys(sessionStorage).some((key) => key.startsWith("hca:")),
    ),
  ).toBe(false);
});
