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

test("an inert runtime gate must become interactive before keyboard entry", async ({ page }) => {
  await page.setContent('<div id="gate" inert><a href="#content">Ir para o conteúdo</a><input aria-label="Primeiro campo"><main id="content" tabindex="-1"><input aria-label="Último campo"></main></div>');
  await page.evaluate(() => { setTimeout(() => document.getElementById("gate")?.removeAttribute("inert"), 50); });
  await assertKeyboardEntry(page, "released runtime gate");
  await expect(page.getByLabel("Primeiro campo", { exact: true })).toBeFocused();
});

test("a permanently inert page cannot pass the keyboard oracle", async ({ page }) => {
  await page.setContent('<div inert><a href="#content">Ir para o conteúdo</a><main id="content" tabindex="-1"><button>Continuar</button></main></div>');
  await expect(assertKeyboardEntry(page, "blocked runtime gate")).rejects.toThrow("requires an interactive landmark");
});

test("a hidden landmark cannot become an accessible keyboard origin", async ({ page }) => {
  await page.setContent('<a href="#content">Ir para o conteúdo</a><main id="content" tabindex="-1" aria-hidden="true"><button>Oculto</button></main>');
  await expect(assertKeyboardEntry(page, "hidden landmark")).rejects.toThrow("requires an interactive landmark");
});

test("a cached hidden route cannot make the active landmark ambiguous", async ({ page }) => {
  await page.setContent('<main hidden tabindex="-1"><input aria-label="Campo da rota preservada"></main><main id="active" tabindex="-1"><input aria-label="Campo atual"><button>Avançar atual</button></main>');
  await assertKeyboardEntry(page, "active route with hidden cached landmark");
  await expect(page.getByLabel("Campo atual", { exact: true })).toBeFocused();
});

test("two visible landmarks cannot pass the keyboard oracle", async ({ page }) => {
  await page.setContent('<main tabindex="-1"><button>Primeira rota</button></main><main tabindex="-1"><button>Segunda rota</button></main>');
  await expect(assertKeyboardEntry(page, "ambiguous visible landmarks")).rejects.toThrow("requires an interactive landmark");
});
