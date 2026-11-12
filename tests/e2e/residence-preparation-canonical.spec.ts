import { expect, test, type Locator } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { mkdirSync } from "node:fs";
import { fixtures } from "../integration/v4-fixtures.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { sql } from "../../scripts/test-environment.mjs";
import { selectContext } from "./auth-context";
import { auditFromTop } from "./accessibility-audit";

test.setTimeout(180_000);
const widths = [320, 390, 768, 1024, 1440];
async function compare(actual: Locator, model: Locator, properties: string[]) {
  const expected = await model.evaluate((node, keys) => Object.fromEntries(keys.map(key => [key, getComputedStyle(node).getPropertyValue(key)])), properties);
  for (const [property, value] of Object.entries(expected)) await expect(actual).toHaveCSS(property, value);
}
const facts = () => sql("select jsonb_build_object('patients',(select count(*) from public.care_recipients),'members',(select count(*) from public.care_recipient_memberships),'stock',(select count(*) from public.stock_movements),'documents',(select count(*) from public.operational_documents));");

test("15 GUI02 residence preparation follows canonical fields and numbered navigation without saving or approving tasks by navigation", async ({ page, browser }, info) => {
  await page.goto("/login"); await page.getByLabel("E-mail", { exact: true }).fill(fixtures.global.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword); await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible(); await selectContext(page, null);
  await page.goto("/preparar-residencia"); await page.getByRole("button", { name: "Nova preparação", exact: true }).click();
  const panel = page.getByRole("region", { name: "Preparação da residência", exact: true }); await expect(panel).toBeVisible();
  const before = facts(), posts: string[] = [], name = "Residência de conferência visual " + randomUUID();
  page.on("request", request => { if (new URL(request.url()).pathname === "/api/residence-preparations" && request.method() !== "GET") posts.push(request.method()); });
  await panel.getByLabel("Nome da residência", { exact: true }).fill(name);
  await panel.getByRole("combobox", { name: "Estado inicial", exact: true }).selectOption("false");
  await panel.getByRole("button", { name: "2. Pessoas e responsabilidades", exact: true }).click();
  await panel.getByLabel("E-mail da conta administradora inicial", { exact: true }).fill(fixtures.family.email);
  // The retained local directory has thousands of accounts. Wait for its real
  // complete read; the form must keep this choice blocked until then.
  await expect(panel.getByRole("combobox", { name: "Titular da continuidade", exact: true })).toBeEnabled({ timeout: 90_000 });
  const reference = await browser.newContext();
  try {
    const model = await reference.newPage(); await model.route(/^https?:/, route => route.abort());
    await model.goto(pathToFileURL(resolve("Home_Care_Assistant_Modelo_Integral.html")).href + "#nova/REQ");
    await model.locator(".productoption input[type=checkbox]").first().check(); await model.locator('[data-action="wizardNext"]').click();
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 }); await model.setViewportSize({ width, height: 900 }); await model.screenshot();
      await compare(panel, model.locator(".card.pad").first(), ["padding-top", "padding-left", "border-radius", "border-top-color"]);
      await compare(panel.locator(".hca-preparation-field").first(), model.locator(".field").first(), ["display", "font-size", "font-weight", "row-gap"]);
      await compare(panel.getByLabel("E-mail da conta administradora inicial", { exact: true }), model.locator(".field input").first(), ["font-size", "border-radius", "padding-left"]);
      await compare(panel.locator(".wizard-steps"), model.locator(".wizard-progress"), ["column-gap", "margin-top", "margin-bottom"]);
      await compare(panel.locator('[aria-current="step"] > span'), model.locator(".wizard-progress .active b"), ["width", "height", "background-color", "border-radius", "font-size"]);
      // Fieldset can serialize an unresolved minmax(0px, 1fr). Spaces inside
      // that expression do not count columns; verify the rendered fields.
      const [first, second] = await panel.locator("fieldset > .hca-preparation-field").evaluateAll(nodes => nodes.slice(0, 2).map(node => {
        const r = node.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
      }));
      if (width <= 500) {
        expect(Math.abs(first.left - second.left)).toBeLessThan(1);
        expect(second.top - first.bottom).toBeGreaterThanOrEqual(15);
      } else {
        expect(Math.abs(first.top - second.top)).toBeLessThan(1);
        expect(second.left - first.right).toBeGreaterThanOrEqual(15);
      }
      await auditFromTop(page, "canonical residence preparation " + width);
    }
    const navigation = panel.getByRole("navigation", { name: "Etapas da preparação", exact: true });
    await expect(navigation.getByRole("button")).toHaveCount(7);
    for (const label of ["3. Catálogo", "4. Estoque inicial", "5. Escalas e BAL", "6. Comunicação e contingência", "7. Conferência da preparação"]) {
      await navigation.getByRole("button", { name: label, exact: true }).click();
      await expect(navigation.getByRole("button", { name: label, exact: true })).toHaveAttribute("aria-current", "step");
    }
    await expect(panel).toContainText("Conferência física e aceite humano continuam pendentes.");
    await navigation.getByRole("button", { name: "1. Residência e fuso", exact: true }).click();
    await expect(panel.getByLabel("Nome da residência", { exact: true })).toHaveValue(name);
    await expect(panel.getByRole("combobox", { name: "Estado inicial", exact: true })).toHaveValue("false");
    await navigation.getByRole("button", { name: "2. Pessoas e responsabilidades", exact: true }).click();
    await expect(panel.getByLabel("E-mail da conta administradora inicial", { exact: true })).toHaveValue(fixtures.family.email);
    expect(posts).toEqual([]); expect(facts()).toBe(before);
    await page.setViewportSize({ width: 320, height: 900 });
    const beforePaint = await page.locator(".hca-profile-identity").evaluate(node => ({ display: getComputedStyle(node).display, width: node.getBoundingClientRect().width }));
    mkdirSync("output/playwright/phase-d", { recursive: true });
    // A native capture flushes WebKit's pending responsive paint, as for the
    // reference page above. Do not weaken contrast rules or alter app styles.
    await page.screenshot({ path: `output/playwright/phase-d/residence-preparation-${info.project.name}.png`, fullPage: true, animations: "disabled" });
    const afterPaint = await page.locator(".hca-profile-identity").evaluate(node => ({ display: getComputedStyle(node).display, width: node.getBoundingClientRect().width }));
    await info.attach("residence-responsive-paint", { body: JSON.stringify({ beforePaint, afterPaint }), contentType: "application/json" });
    await expect(page.locator(".hca-profile-identity")).toHaveCSS("display", "none");
    await auditFromTop(page, "canonical residence preparation final320");
  } finally { await reference.close(); }
});
