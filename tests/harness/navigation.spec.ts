import { test, expect } from "@playwright/test";
import { openNavigation } from "../e2e/navigation";

test.beforeEach(async ({ page }) => { await page.route("**/*", (route) => route.abort()); });

for (const delayed of [false, true]) {
  test(`desktop navigation waits for its real variant (delayed=${delayed})`, async ({ page }) => {
    await page.setContent(`<button hidden id="open" aria-label="Abrir navegação" onclick="document.querySelector('nav').hidden=false;this.hidden=true">Menu</button><nav hidden aria-label="Navegação principal"><details><summary>Materiais</summary><a href="#">Estoque</a></details></nav>`);
    if (delayed) await page.evaluate(() => { setTimeout(() => { document.querySelector<HTMLButtonElement>("#open")!.hidden = false; }, 200); });
    else await page.locator("#open").evaluate((element) => { (element as HTMLElement).hidden = false; });
    const { nav } = await openNavigation(page);
    await expect(nav.getByRole("link", { name: "Estoque" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Navegação do plantão" })).toHaveCount(0);
  });
}

test("already open desktop navigation remains usable", async ({ page }) => {
  await page.setContent('<nav aria-label="Navegação principal"><details><summary>Materiais</summary><a href="#">Estoque</a></details></nav>');
  await expect((await openNavigation(page)).nav.getByRole("link")).toBeVisible();
});

test("mobile operation follows the actual More navigation", async ({ page }) => {
  await page.setContent(`<nav aria-label="Navegação do plantão"><a href="#" onclick="document.querySelector('#more').hidden=false">Mais</a></nav><nav hidden id="more" aria-label="Rotina e funções autorizadas"><details><summary>Materiais</summary><a href="#">Estoque</a></details></nav>`);
  await expect((await openNavigation(page)).nav.getByRole("link", { name: "Estoque" })).toBeVisible();
});

test("an unavailable shell cannot produce a successful navigation result", async ({ page }) => {
  await page.setContent("<main>Carregando contexto</main>");
  await expect(openNavigation(page)).rejects.toThrow("authorized navigation variant");
});
