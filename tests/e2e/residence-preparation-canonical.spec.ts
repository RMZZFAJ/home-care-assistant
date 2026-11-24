import { expect, test } from "@playwright/test";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { mkdirSync } from "node:fs";
import { fixtures } from "../integration/v4-fixtures.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { sql } from "../../scripts/test-environment.mjs";
import { selectContext } from "./auth-context";
import { auditFromTop } from "./accessibility-audit";

test.setTimeout(180_000);
const facts = () => sql(`select jsonb_build_object(
  'residences',(select count(*) from public.care_recipients),
  'preparations',(select count(*) from private.residence_preparations),
  'commands',(select count(*) from private.phase_d3_commands),
  'members',(select count(*) from public.care_recipient_memberships));`);

test("E12-03 uses the approved mobile sections and leaves abandoned fields in memory only", async ({ page, browser }, info) => {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(fixtures.global.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible();
  await selectContext(page, null);
  await page.goto("/preparar-residencia");
  const panel = page.getByRole("form", { name: "Preparação da residência", exact: true });
  const name = "Residência de Helena Almeida";
  const before = facts(), writes: string[] = [];
  page.on("request", request => {
    if (new URL(request.url()).pathname === "/api/residence-preparations" && request.method() === "POST")
      writes.push(request.postDataJSON().action);
  });
  const residenceName = panel.getByRole("textbox", { name: "Nome da residência", exact: true });
  await residenceName.fill(name);
  await panel.getByRole("textbox", { name: "E-mail da conta administradora inicial", exact: true }).fill(fixtures.family.email);
  await expect(panel.getByRole("combobox", { name: "Titular da continuidade", exact: true })).toBeEnabled({ timeout: 90_000 });
  const reference = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  mkdirSync("output/playwright/l4/reference", { recursive: true });
  try {
    const model = await reference.newPage();
    await model.route(/^https?:/, route => route.abort());
    await model.goto(pathToFileURL(resolve("hca-laboratorio-04-v2-aprovado.html")).href + "#E12-03/draft");
    for (const title of ["Identificação da residência", "Administração e continuidade", "Primeiro acesso"]) {
      await expect(panel.getByRole("heading", { name: title, exact: true })).toBeVisible();
      await expect(model.locator("#product-app").getByRole("heading", { name: title, exact: true })).toBeVisible();
    }
    const frame = model.locator("#device-frame");
    for (const width of [360, 412]) {
      await model.getByRole("combobox", { name: "Visualização", exact: true }).selectOption(String(width));
      const size = await frame.boundingBox();
      expect(size).not.toBeNull();
      await page.setViewportSize({ width, height: Math.round(size!.height) });
      await auditFromTop(page, "E12-03 residence creation " + width);
      await expect(panel.getByRole("button", { name: "Revisar criação", exact: true })).toBeInViewport({ ratio: 1 });
      await frame.screenshot({ path: "output/playwright/l4/reference/residence-create-" + width + ".png" });
      await page.screenshot({ path: "output/playwright/l4/residence-create-" + info.project.name + "-" + width + ".png" });
    }
  } finally { await reference.close(); }
  await expect(panel.getByRole("switch", { name: "Mostrar guia no primeiro acesso" })).toBeChecked();
  await expect(panel.getByRole("switch", { name: "Cadastro de desenvolvimento" })).toBeChecked();
  await panel.getByRole("button", { name: "Cancelar", exact: true }).click();
  const leave = page.getByRole("dialog", { name: "Sair deste preenchimento?", exact: true });
  await leave.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(residenceName).toHaveValue(name);
  await panel.getByRole("button", { name: "Cancelar", exact: true }).click();
  await leave.getByRole("button", { name: "Sair", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Guias e ajuda", exact: true })).toBeVisible();
  await page.goto("/preparar-residencia");
  await expect(residenceName).toHaveValue("");
  expect(writes).toEqual([]);
  expect(facts()).toBe(before);
});
