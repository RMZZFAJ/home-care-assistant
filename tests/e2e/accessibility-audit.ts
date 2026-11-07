import {expect, test} from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { accessibilityEvidence } from "../support/accessibility-results";
import { assertKeyboardEntry } from "./keyboard-entry";
export async function audit(page: import("@playwright/test").Page, label: string, expectedTitle = "Home Care Assistant") {
  await expect(page).toHaveTitle(expectedTitle);
  if (label === "login") await expect(page.getByLabel("E-mail", { exact: true })).toBeEnabled();
  // Establish a known sequential origin before testing keyboard movement.
  // BODY alone does not identify that origin after pointer/viewport changes.
  // Keep all axe rules and the hidden/sentinel focus assertions enabled.
  if (await page.evaluate(() => !document.activeElement || [document.body, document.documentElement].includes(document.activeElement as HTMLElement))) {
    await page.evaluate(() => {
      const state: { events: unknown[]; cleanup?: () => void } = { events: [] };
      const target = (element: EventTarget | null) => element instanceof HTMLElement ? { tag: element.tagName, role: element.getAttribute("role"), tabIndex: element.tabIndex, dummy: element.hasAttribute("data-tabster-dummy"), hidden: Boolean(element.closest('[aria-hidden="true"]')) } : null;
      const record = (event: Event) => { if (!(event instanceof KeyboardEvent) || ["Tab", "Enter"].includes(event.key)) state.events.push({ type: event.type, target: target(event.target), active: target(document.activeElement), documentFocused: document.hasFocus() }); };
      for (const name of ["focusin", "focusout", "keydown"]) document.addEventListener(name, record, true);
      state.cleanup = () => { for (const name of ["focusin", "focusout", "keydown"]) document.removeEventListener(name, record, true); };
      (window as unknown as { hcaFocusEvidence: typeof state }).hcaFocusEvidence = state;
    });
    try {
      await assertKeyboardEntry(page, label);
    } finally {
      const focus = await page.evaluate(() => {
        const state = (window as unknown as { hcaFocusEvidence: { events: unknown[]; cleanup: () => void } }).hcaFocusEvidence;
        state.cleanup();
        return { events: state.events, activeTag: document.activeElement?.tagName, documentFocused: document.hasFocus() };
      });
      await test.info().attach("keyboard-entry-" + label.replaceAll(/[^a-z0-9-]/gi, "-"), { body: JSON.stringify(focus, null, 2), contentType: "application/json" });
    }
  }
  await page.waitForFunction(() => document.getAnimations().every((animation) => animation.playState !== "running" || animation.effect?.getComputedTiming().iterations === Infinity));
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  const evidence = accessibilityEvidence(label, result);
  await test.info().attach("axe-" + label.replaceAll(/[^a-z0-9-]/gi, "-"), {
    body: JSON.stringify(evidence, null, 2), contentType: "application/json",
  });
  if (evidence.reviewRequired.length) test.info().annotations.push({
    type: "accessibility-review-required",
    description: label + ": " + evidence.reviewRequired.map((item) => item.rule).join(", "),
  });
  expect(result.violations, label).toEqual([]);
  const size = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  if (size.content > size.width) {
    const overflow = await page.evaluate(() =>
      Array.from(document.querySelectorAll<HTMLElement>("body *"))
        .filter((element) => {
          const box = element.getBoundingClientRect();
          return (
            box.width > 0 &&
            (box.left < 0 || box.right > document.documentElement.clientWidth)
          );
        })
        .map((element) => ({
          tag: element.tagName,
          class: element.className,
          label: element.getAttribute("aria-label"),
          width: element.getBoundingClientRect().width,
          left: element.getBoundingClientRect().left,
          right: element.getBoundingClientRect().right,
          overflow: getComputedStyle(element).overflowX,
        })),
    );
    await test
      .info()
      .attach("horizontal-overflow-" + label.replaceAll(/[^a-z0-9-]/gi, "-"), {
        body: JSON.stringify({ ...size, elements: overflow }, null, 2),
        contentType: "application/json",
      });
  }
  expect(size.content, label + " overflow").toBeLessThanOrEqual(size.width);
}
