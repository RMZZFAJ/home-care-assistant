import { expect, test, type Locator, type Page } from "@playwright/test";

/** Use a real touch point clear of the fixed workspace navigation. */
export async function pressWorkspaceControl(page: Page, control: Locator) {
  await expect(page.locator(".hca-activity-overlay")).toBeHidden();
  if (!test.info().project.use.hasTouch) {
    await control.scrollIntoViewIfNeeded();
    await control.click();
    return;
  }

  await expect(control).toBeEnabled();
  await control.evaluate(element => {
    const { left, top, width, height } = element.getBoundingClientRect();
    if (!element.contains(document.elementFromPoint(left + width / 2, top + height / 2))) {
      element.scrollIntoView({ block: "center", inline: "nearest", behavior: "instant" });
    }
  });

  let position: { x: number; y: number } | null = null;
  await expect.poll(async () => {
    position = await control.evaluate(element => {
      const { left, top, right, bottom } = element.getBoundingClientRect();
      const x = (Math.max(left, 0) + Math.min(right, innerWidth)) / 2;
      const y = (top + bottom) / 2;
      if (element.contains(document.elementFromPoint(x, y)))
        return { x: x - left - element.clientLeft, y: y - top - element.clientTop };

      // WebKit can align a sticky control under the bottom bar when scrolling it into view.
      const header = document.querySelector(".app-header")?.getBoundingClientRect();
      const navigation = document.querySelector(".hca-bottom-navigation")?.getBoundingClientRect();
      const topEdge = header?.height ? Math.max(0, header.bottom) : 0;
      const bottomEdge = navigation?.height ? Math.min(innerHeight, navigation.top) : innerHeight;
      if (y < topEdge || y >= bottomEdge) {
        window.scrollBy({ top: y - (topEdge + bottomEdge) / 2, behavior: "instant" });
      }
      return null;
    });
    return position;
  }, { message: "The control must receive touch outside the fixed navigation" }).not.toBeNull();
  // Keep the point relative to its control so Playwright checks stability and
  // verifies the hit target again before delivering the touch.
  await control.tap({ position: position! });
}
