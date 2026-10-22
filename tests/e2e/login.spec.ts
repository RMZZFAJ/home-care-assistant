import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import {
  assertLocalProject,
  fixtureFile,
} from "../../scripts/test-environment.mjs";

test("exibe a tela de login", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();
  await expect(page.getByLabel("E-mail")).toBeVisible();
  await expect(page.getByLabel("Senha")).toBeVisible();
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
  await expect(
    page.getByRole("combobox", { name: "Pessoa assistida", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Menu do usuário", { exact: true }).click();
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect(
    await page.evaluate(() =>
      Object.keys(sessionStorage).some((key) => key.startsWith("hca:")),
    ),
  ).toBe(false);
});
