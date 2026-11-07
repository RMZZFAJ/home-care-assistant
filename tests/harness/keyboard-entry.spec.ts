import { test, expect } from "@playwright/test";
import { assertKeyboardEntry } from "../e2e/keyboard-entry";

test.beforeEach(async ({ page }) => { await page.route("**/*", (route) => route.abort()); });

test("a previous end-of-document origin is distinct from a broken keyboard entry", async ({ page }) => {
  await page.setContent('<a href="#content">Ir para o conteúdo</a><input aria-label="Primeiro campo"><main id="content" tabindex="-1"><input id="last" aria-label="Último campo"></main>');
  await page.locator("#last").focus();
  await page.locator("#last").evaluate(element => (element as HTMLElement).blur());
  expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);
  await assertKeyboardEntry(page, "known navigation origin");
  await expect(page.getByLabel("Primeiro campo", { exact: true })).toBeFocused();
});

test("a Tab trap cannot pass by focusing the initial link", async ({ page }) => {
  await page.setContent('<a href="#content" onkeydown="if(event.key===\'Tab\')event.preventDefault()">Ir para o conteúdo</a><main id="content" tabindex="-1"><button>Continuar</button></main>');
  await expect(assertKeyboardEntry(page, "trapped control")).rejects.toThrow("different accessible content");
});

test("a hidden keyboard stop remains a failure", async ({ page }) => {
  await page.setContent('<a href="#content">Ir para o conteúdo</a><button aria-hidden="true">Oculto para AT</button><main id="content" tabindex="-1"><input aria-label="Campo visível"></main>');
  await expect(assertKeyboardEntry(page, "hidden control")).rejects.toThrow("different accessible content");
});

test("a public form with a non-focusable main uses its existing first control", async ({ page }) => {
  await page.setContent('<main><input id="first" aria-label="E-mail"><input id="second" aria-label="Senha"><button>Entrar</button></main>');
  await page.locator("#second").focus();
  await page.locator("#second").evaluate(element => (element as HTMLElement).blur());
  await assertKeyboardEntry(page, "public form origin");
  await expect(page.locator("#second")).toBeFocused();
});

test("the public-form fallback cannot pass a trapped first control", async ({ page }) => {
  await page.setContent('<main><input aria-label="E-mail" onkeydown="if(event.key===\'Tab\')event.preventDefault()"><input aria-label="Senha"></main>');
  await expect(assertKeyboardEntry(page, "trapped public form")).rejects.toThrow("different accessible content");
});
