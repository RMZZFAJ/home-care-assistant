import {expect} from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
export async function audit(page: import("@playwright/test").Page, label: string) {
  // Enter the application as a keyboard user. Tabster's document-edge
  // sentinels redirect focus immediately and become untabbable inside the app.
  // Keep every axe rule enabled and verify the redirect, rather than excluding
  // hidden-focus findings (microsoft/tabster#288).
  if (await page.evaluate(() => !document.activeElement || [document.body, document.documentElement].includes(document.activeElement as HTMLElement))) {
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Ir para o conteúdo", exact: true });
    if (await skip.evaluateAll((items) => items.some((item) => item === document.activeElement))) {
      await page.keyboard.press("Enter");
      await expect(page.getByRole("main")).toBeFocused();
    }
    await expect.poll(() => page.evaluate(() => {
      const active = document.activeElement;
      return Boolean(active && active !== document.body && active !== document.documentElement && !active.hasAttribute("data-tabster-dummy") && !active.closest('[aria-hidden="true"]'));
    }), { message: label + " keyboard entry must reach accessible content" }).toBe(true);
  }
  await page.waitForFunction(() => document.getAnimations().every((animation) => animation.playState !== "running" || animation.effect?.getComputedTiming().iterations === Infinity));
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(result.violations, label).toEqual([]);
  const size = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(size.content, label + " overflow").toBeLessThanOrEqual(size.width);
}
