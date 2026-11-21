import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { actor, fixtures, rpc, setup } from "../integration/v4-fixtures.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { selectContext } from "./auth-context";
import { audit } from "./accessibility-audit";
test.setTimeout(180000);
const popup = (page: Page) =>
  page.getByRole("dialog", { name: "Notificações", exact: true });
const trigger = (page: Page) =>
  page.getByRole("button", { name: /^Notificações/ });
const guide = (page: Page) =>
  page.locator('section[aria-label="Apresentação opcional"]');
test("D3 sino mantém apresentação montada, isola foco e acessibilidade, fecha sem ciência e preserva abertura explícita do aviso", async ({
  page,
}, info) => {
  const f = await setup(),
    family = await actor("family", f.patient);
  const doc = await rpc(family, "create_supply_document", {
    p_patient: f.patient,
    p_type: "COM",
    p_payload: {
      origin: "purchase",
      lines: [{ productId: f.products[0], quantity: "1" }],
    },
    p_key: randomUUID(),
    p_draft: false,
  });
  const notification = sql(
    `select id from public.requisition_notifications where document_id=${q(doc.id)} and recipient_user_id=${q(fixtures.family.id)} and channel='internal' limit 1;`,
  );
  const facts = () =>
    sql(
      `select jsonb_build_object('seen',(select seen_at from public.requisition_notifications where id=${q(notification)}),'events',(select count(*) from public.document_events where document_id=${q(doc.id)}),'stock',(select count(*) from public.stock_movements where care_recipient_id=${q(f.patient)}));`,
    );
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(fixtures.family.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Visão geral", exact: true }),
  ).toBeVisible();
  await selectContext(page, f.patient);
  await expect(guide(page)).toBeVisible();
  const beforeGuide = (await (await page.request.get("/api/guides")).json())
    .data;
  expect(beforeGuide).toMatchObject({
    patientId: f.patient,
    showOnFirstAccess: true,
    progress: { revision: 0, status: null },
  });
  const before = facts();
  let writes = 0;
  page.on("request", (request) => {
    if (
      request.method() !== "GET" &&
      ["/api/guides", "/api/notifications"].includes(
        new URL(request.url()).pathname,
      )
    )
      writes++;
  });
  try {
    await page.setViewportSize({ width: 768, height: 900 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(
      page.getByRole("button", { name: "Fechar por agora", exact: true }),
    ).toBeEnabled();
    await trigger(page).click();
    await expect(popup(page)).toBeVisible();
    await expect(
      popup(page).getByText(doc.code, { exact: true }),
    ).toBeVisible();
    await info.attach("notification-onboarding-geometry", {
      body: JSON.stringify(
        await guide(page).evaluate((element) => ({
          guide: element.getBoundingClientRect().toJSON(),
          isolated: Boolean(element.closest('[aria-hidden="true"],[inert]')),
          controls: Array.from(element.querySelectorAll("button")).map(
            (button) => ({
              text: button.textContent,
              box: button.getBoundingClientRect().toJSON(),
            }),
          ),
        })),
        null,
        2,
      ),
      contentType: "application/json",
    });
    // Background stays mounted; only the open popup participates in navigation.
    await expect(guide(page)).toHaveCount(1);
    await expect
      .poll(
        () =>
          guide(page).evaluate((element) =>
            Boolean(element.closest('[aria-hidden="true"],[inert]')),
          ),
        {
          message:
            "Open notification dialog must isolate the mounted onboarding controls",
        },
      )
      .toBe(true);
    await expect(
      page.getByRole("button", { name: "Fechar por agora", exact: true }),
    ).toHaveCount(0);
    await expect(page.locator('[id="notification-panel"]')).toHaveCount(1);
    const close = popup(page).getByRole("button", {
      name: "Fechar notificações",
      exact: true,
    });
    await close.focus();
    for (const key of ["Tab", "Tab", "Tab", "Tab", "Shift+Tab", "Shift+Tab"]) {
      await page.keyboard.press(key);
      await expect
        .poll(() =>
          popup(page).evaluate((element) =>
            element.contains(document.activeElement),
          ),
        )
        .toBe(true);
    }
    for (const width of [768, 320, 390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await expect
        .poll(
          () =>
            popup(page).evaluate((element) => {
              const rect = element.getBoundingClientRect();
              return (
                rect.left >= 0 &&
                rect.right <= document.documentElement.clientWidth
              );
            }),
          {
            message:
              "Notification positioning must settle within the resized layout viewport",
          },
        )
        .toBe(true);
      await audit(page, "notification isolation with onboarding " + width);
    }
    expect(facts()).toBe(before);
    expect(writes).toBe(0);
    await info.attach("notification-isolation", {
      body: await page.screenshot({ animations: "disabled" }),
      contentType: "image/png",
    });
    await page.keyboard.press("Escape");
    await expect(popup(page)).toHaveCount(0);
    await expect(trigger(page)).toBeFocused();
    await expect(
      page.getByRole("button", { name: "Fechar por agora", exact: true }),
    ).toBeEnabled();
    await trigger(page).click();
    await popup(page)
      .getByRole("button", { name: "Fechar notificações", exact: true })
      .click();
    await expect(popup(page)).toHaveCount(0);
    await expect(trigger(page)).toBeFocused();
    expect(facts()).toBe(before);
    expect(writes).toBe(0);
    expect((await (await page.request.get("/api/guides")).json()).data).toEqual(
      beforeGuide,
    );
    await trigger(page).click();
    await popup(page)
      .getByRole("link", { name: "Consultar histórico completo", exact: true })
      .click();
    await expect(page).toHaveURL(/\/notificacoes\?/);
    expect(facts()).toBe(before);
    expect(writes).toBe(0);
    await page.goto("/");
    await expect(guide(page)).toBeVisible();
    await trigger(page).click();
    const marked = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === "/api/notifications" &&
        response.request().method() === "POST",
    );
    await popup(page).getByRole("link").filter({ hasText: doc.code }).click();
    expect((await marked).ok()).toBe(true);
    await expect(page).toHaveURL(new RegExp("/fichas/" + doc.id));
    expect(
      sql(
        `select seen_at is not null from public.requisition_notifications where id=${q(notification)};`,
      ),
    ).toBe("t");
    expect(writes).toBe(1);
    expect((await (await page.request.get("/api/guides")).json()).data).toEqual(
      beforeGuide,
    );
    expect(
      sql(
        `select count(*) from public.document_events where document_id=${q(doc.id)};`,
      ),
    ).toBe(String(JSON.parse(before).events));
    expect(
      sql(
        `select count(*) from public.stock_movements where care_recipient_id=${q(f.patient)};`,
      ),
    ).toBe(String(JSON.parse(before).stock));
  } finally {
    await info.attach("notification-layout-viewport", {
      body: JSON.stringify(
        await page.evaluate(() => ({
          innerWidth,
          clientWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
          scrollX,
          visual: visualViewport && {
            width: visualViewport.width,
            height: visualViewport.height,
            scale: visualViewport.scale,
            left: visualViewport.offsetLeft,
            top: visualViewport.offsetTop,
          },
          popups: Array.from(document.querySelectorAll('[role="dialog"]')).map(
            (element) => element.getBoundingClientRect().toJSON(),
          ),
        })),
        null,
        2,
      ),
      contentType: "application/json",
    });
    await info.attach("notification-isolation-final-state", {
      body: JSON.stringify({
        writes,
        popupCount: await popup(page).count(),
        guideProgress: (await (await page.request.get("/api/guides")).json())
          .data.progress,
      }),
      contentType: "application/json",
    });
  }
});
