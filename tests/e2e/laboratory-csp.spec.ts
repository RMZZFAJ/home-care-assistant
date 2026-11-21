import { test, expect } from "@playwright/test";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

test("laboratório executa somente seu script aprovado e bloqueia código inline adicional", async ({ page }) => {
  const violations: string[] = [];
  await page.route(/^https?:/, route => route.abort());
  await page.goto(pathToFileURL(resolve("hca-laboratorio-01-v3-final.html")).href + "#/ficha/REQ-0003");
  const materials = page.locator("#product-app").getByRole("tab", { name: /^Materiais/ });
  await expect(materials).toBeVisible();
  await materials.click();
  await expect(materials).toHaveAttribute("aria-selected", "true");
  await page.exposeFunction("recordLabCspViolation", (directive: string) => violations.push(directive));
  await page.evaluate(() => {
    document.addEventListener("securitypolicyviolation", event => {
      void (window as unknown as { recordLabCspViolation: (value: string) => Promise<void> }).recordLabCspViolation(event.effectiveDirective);
    });
    const injected = document.createElement("script");
    injected.textContent = "window.unapprovedLabScriptExecuted = true";
    document.body.append(injected);
    const control = document.createElement("button");
    control.textContent = "Contraprova CSP fictícia";
    control.setAttribute("onclick", "window.unapprovedLabHandlerExecuted = true");
    document.body.append(control);
    control.click();
  });
  await expect.poll(() => violations.some(value => value.startsWith("script-src"))).toBe(true);
  expect(await page.evaluate(() => {
    const state = window as unknown as Record<string, unknown>;
    return [state.unapprovedLabScriptExecuted, state.unapprovedLabHandlerExecuted];
  })).toEqual([undefined, undefined]);
  // The legitimate script remains active after refusing both injections.
  const overview = page.locator("#product-app").getByRole("tab", { name: /^Visão geral/ });
  await overview.click();
  await expect(overview).toHaveAttribute("aria-selected", "true");
});
