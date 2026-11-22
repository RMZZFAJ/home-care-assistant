import { test, type Page } from "@playwright/test";

export async function startFocusProbe(page: Page) {
  await page.addInitScript(() => {
    const describe = (element: Element | null) =>
      element
        ? {
            tag: element.tagName,
            id: element.id,
            name: element.getAttribute("name"),
            label: element.getAttribute("aria-label"),
            disabled: element.matches(":disabled"),
            hidden: !!element.closest("[hidden],[inert],[aria-hidden=true]"),
            visible: element.getClientRects().length > 0,
          }
        : null;
    const events: unknown[] = [];
    const record = (kind: string, target: Element | null) => {
      events.push({
        kind,
        at: performance.now(),
        target: describe(target),
        active: describe(document.activeElement),
      });
      if (events.length > 160) events.shift();
    };
    const nativeFocus = HTMLElement.prototype.focus;
    HTMLElement.prototype.focus = function (
      this: HTMLElement,
      options?: FocusOptions,
    ) {
      record("call", this);
      nativeFocus.call(this, options);
      record("return", this);
    };
    for (const kind of ["focusin", "focusout"])
      document.addEventListener(
        kind,
        (event) =>
          record(kind, event.target instanceof Element ? event.target : null),
        true,
      );
    (window as unknown as { hcaFocusProbe: unknown[] }).hcaFocusProbe = events;
  });
}

export async function attachFocusProbe(page: Page) {
  const events = await page.evaluate(() => ({
    events: (window as unknown as { hcaFocusProbe?: unknown[] }).hcaFocusProbe,
    active: {
      tag: document.activeElement?.tagName,
      id: document.activeElement?.id,
    },
  }));
  await test.info().attach("focus-transitions", {
    body: JSON.stringify(events, null, 2),
    contentType: "application/json",
  });
}
