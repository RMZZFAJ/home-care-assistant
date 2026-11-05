import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { openNavigation } from "../../../../tests/e2e/navigation";
import { audit } from "../../../../tests/e2e/accessibility-audit";

const results: Record<string, unknown>[] = [];
test.beforeEach(async ({ context }) => {
  await context.route(/^https?:/, (route) => route.abort("blockedbyclient"));
});
test.afterAll(() => writeFileSync(path.join(process.cwd(), "docs/audits/2026-10-30-phase-b8-quality-maintainability/evidence/browser-observations.json"), JSON.stringify(results, null, 2) + "\n"));

const desktop = (ready: boolean) => `<!doctype html><html lang="pt-BR"><head><title>Home Care Assistant</title></head><body>
<main><h1>Controle sintético</h1>
<button id="trigger" style="display:${ready ? "block" : "none"}" onclick="document.querySelector('nav').style.display='block'">Abrir navegação</button>
<nav style="display:none" aria-label="Navegação principal"><a href="#">Histórico</a></nav>
</main></body></html>`;

test("Q6-01 stable desktop branch is handled", async ({ page }) => {
  await page.setContent(desktop(true));
  const opened = await openNavigation(page);
  await expect(opened.nav).toBeVisible();
  results.push({ id: "Q6-01", actual: "desktop ready; helper passes", scope: "synthetic DOM; real helper" });
});
test("Q6-02 transient desktop selects the permanently absent mobile branch", async ({ page }) => {
  await page.setContent(desktop(false));
  page.setDefaultTimeout(600);
  const outcome = openNavigation(page).then(() => "passed", (error: Error) => error.message);
  // Release the desktop readiness only after the real helper has begun.
  await page.waitForFunction(() => document.getElementById("trigger")?.style.display === "none");
  await page.evaluate(() => setTimeout(() => { document.getElementById("trigger")!.style.display = "block"; }, 80));
  const message = await outcome;
  expect(message).toContain("Navegação do plantão");
  await expect(page.getByRole("button", { name: "Abrir navegação", exact: true })).toBeVisible();
  results.push({ id: "Q6-02", actual: "helper timed out on absent mobile branch while desktop trigger became visible", timeoutMs: 600, scope: "controlled scheduling; no estimate of CI frequency" });
});
test("Q6-03 the same desktop works when readiness precedes the helper", async ({ page }) => {
  await page.setContent(desktop(false));
  await page.evaluate(() => { document.getElementById("trigger")!.style.display = "block"; });
  await expect(page.getByRole("button", { name: "Abrir navegação", exact: true })).toBeVisible();
  const opened = await openNavigation(page);
  await expect(opened.nav).toBeVisible();
  results.push({ id: "Q6-03", actual: "same DOM and helper pass after explicit readiness", scope: "counterproof, not a helper fix" });
});
const accessible = `<!doctype html><html lang="pt-BR"><head><title>Home Care Assistant</title></head><body>
<main><h1>Controle de acessibilidade</h1><button>Continuar</button>
<p style="color:#777;background:linear-gradient(white,black)">Conteúdo em fundo variável para revisão humana de contraste.</p>
</main></body></html>`;
test("Q9-01 incomplete axe contrast review is omitted by the real helper", async ({ page }) => {
  await page.setContent(accessible);
  await audit(page, "synthetic-gradient");
  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(result.violations).toEqual([]);
  expect(result.incomplete.some((item) => item.id === "color-contrast")).toBe(true);
  results.push({ id: "Q9-01", actual: "helper passes with review still required", incomplete: result.incomplete.map((r) => r.id), violations: result.violations.map((r) => r.id), scope: "synthetic gradient only; does not prove an application contrast defect" });
});
test("Q9-02 the same helper rejects an unnamed button", async ({ page }) => {
  await page.setContent(accessible.replace("<button>Continuar</button>", "<button></button>"));
  await expect(audit(page, "synthetic-unnamed-button")).rejects.toThrow();
  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(result.violations.some((item) => item.id === "button-name")).toBe(true);
  results.push({ id: "Q9-02", actual: "helper rejects button-name violation", scope: "counterproof against a disabled or vacuous axe check" });
});
