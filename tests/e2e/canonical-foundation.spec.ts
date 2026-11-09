import { expect, test } from "@playwright/test";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { remainingNeedFixture, physicalState, fixtures } from "../integration/remaining-need-fixtures.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";
import { audit } from "./accessibility-audit";

test.setTimeout(180_000);

test("UIR fundação compara modal ao HTML em cinco larguras e conserva foco e leitura", async ({ page, browser }, info) => {
  const f = await remainingNeedFixture();
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(fixtures.professional.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible();
  await selectContext(page, f.patient);
  const sourceOpening = page.waitForResponse(response => new URL(response.url()).pathname === `/api/requisitions/${f.source.id}/openings` && response.request().method() === "POST");
  await page.goto(`/historico/${f.source.id}`); expect((await sourceOpening).status()).toBe(200);
  const before = physicalState(f), writes: string[] = [];
  page.on("request", request => { if (/^\/api\/(documents|requisitions|stock|balances)/.test(new URL(request.url()).pathname) && request.method() !== "GET") writes.push(new URL(request.url()).pathname); });
  const opener = page.getByRole("button", { name: new RegExp("^" + f.ent.code + " · aceito") });
  await opener.click();
  const dialog = page.getByRole("dialog"); await expect(dialog.getByText("Expedido", { exact: true })).toBeVisible();
  const reference = await browser.newContext({ serviceWorkers: "block" });
  try {
    const model = await reference.newPage();
    await model.route(/^https?:/, route => route.abort());
    await model.goto(pathToFileURL(resolve("Home_Care_Assistant_Modelo_Integral.html")).href + "#ficha/REQ-0003");
    await model.getByRole("button", { name: "Registrar andamento", exact: true }).click();
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 }); await model.setViewportSize({ width, height: 900 });
      const styles = (element: HTMLElement | SVGElement) => {
        const value = getComputedStyle(element);
        return { background: value.backgroundColor, color: value.color, radius: value.borderTopLeftRadius, border: value.borderTopColor, borderWidth: value.borderTopWidth };
      };
      const expected = await model.getByRole("dialog").evaluate(styles);
      expect(await dialog.evaluate(styles)).toEqual(expected);
      await audit(page, "UIR canonical modal " + width);
      await info.attach("canonical-reference-" + width, { body: await model.screenshot({ fullPage: true }), contentType: "image/png" });
      await info.attach("current-modal-" + width, { body: await page.screenshot({ fullPage: true }), contentType: "image/png" });
    }
    await page.bringToFront();
    await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
    const close = dialog.getByRole("button", { name: "Fechar diálogo", exact: true });
    await close.focus();
    await page.keyboard.press("Tab"); await page.keyboard.press("Shift+Tab");
    await expect(close).toBeFocused();
    expect(await close.evaluate(element => getComputedStyle(element).outlineStyle)).not.toBe("none");
    await page.keyboard.press("Escape"); await expect(dialog).toHaveCount(0); await expect(opener).toBeFocused();
    await page.emulateMedia({ forcedColors: "none", reducedMotion: "no-preference" });
    // The professional shell uses its bottom navigation. Exercise the global
    // drawer in a separate authenticated page, without changing this actor.
    const navigationPage = await reference.newPage();
    await navigationPage.setViewportSize({ width: 390, height: 900 });
    await navigationPage.goto(new URL("/login", page.url()).href);
    await navigationPage.getByLabel("E-mail", { exact: true }).fill(fixtures.global.email);
    await navigationPage.getByLabel("Senha", { exact: true }).fill(fixturePassword);
    await navigationPage.getByRole("button", { name: "Entrar", exact: true }).click();
    await expect(navigationPage.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible();
    await selectContext(navigationPage, null);
    const navigation = navigationPage.getByRole("button", { name: "Abrir navegação", exact: true });
    await navigation.focus(); await navigation.press("Enter");
    await expect(navigationPage.getByRole("dialog", { name: "Home Care Assistant", exact: true })).toBeVisible();
    await navigationPage.keyboard.press("Escape"); await expect(navigation).toBeFocused();
    expect(writes).toEqual([]); expect(physicalState(f)).toBe(before);
  } finally { await reference.close(); }
});
