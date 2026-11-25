import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { cancellationFixture, awareness, awarenessFacts, rpc } from "../integration/cancellation-awareness-fixtures.mjs";
import { shiftWorker } from "../integration/shift-fixtures.mjs";
import { loginDecision } from "./l1-decision-policy";
import { generatedPdf } from "./generated-pdf";
import { auditFromTop } from "./accessibility-audit";

test.setTimeout(180_000);
test.afterEach(async ({ page }) => page.unrouteAll({ behavior: "wait" }));
test("COM cancellation confirmation retains focus during a held read and never queues a premature acknowledgement", async ({ page }) => {
  const f = await cancellationFixture("COM"), id = f.document.id;
  const family = await shiftWorker(f.patient, "family");
  await loginDecision(page, family.email, f.patient);
  await page.setViewportSize({ width: 320, height: 940 });
  await page.goto("/fichas/" + id);
  const notice = page.getByRole("region", { name: "Ciência do cancelamento", exact: true });
  const confirm = notice.getByRole("button", { name: "Estou ciente deste cancelamento", exact: true });
  await expect(confirm).toBeEnabled(); await confirm.focus();
  await confirm.evaluate(element => {
    const navigation = document.querySelector(".hca-bottom-navigation")!.getBoundingClientRect();
    window.scrollBy({ top: element.getBoundingClientRect().bottom - navigation.top + 3, behavior: "instant" });
  });
  const aboveNavigation = () => confirm.evaluate(element =>
    element.getBoundingClientRect().bottom <= document.querySelector(".hca-bottom-navigation")!.getBoundingClientRect().top,
  );
  await expect.poll(aboveNavigation).toBe(true);
  const before = awarenessFacts(id); let posts = 0, release!: () => void, entered!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  const sent = new Promise<void>(resolve => { entered = resolve; });
  await page.route("**/api/documents/" + id + "/cancellation", async route => {
    if (route.request().method() === "POST") { posts++; await route.continue(); return; }
    entered(); await held; await route.continue();
  });
  try {
    await page.evaluate(() => window.dispatchEvent(new Event("hca:data-changed"))); await sent;
    await expect(confirm).toHaveAttribute("aria-disabled", "true"); await expect(confirm).toBeFocused();
    await expect.poll(aboveNavigation, { message: "The focused action must stay above the navigation while refreshing" }).toBe(true);
    await confirm.evaluate((button: HTMLButtonElement) => button.click());
    expect(posts).toBe(0); expect((await awareness(family.client, id)).totalAcknowledgements).toBe(0);
  } finally { release(); }
  await expect(confirm).not.toHaveAttribute("aria-disabled", "true"); await expect(confirm).toBeFocused();

  await page.setViewportSize({ width: 320, height: 650 });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await expect.poll(() => confirm.evaluate(element => element.getBoundingClientRect().top >= window.innerHeight)).toBe(true);
  const refreshed = page.waitForResponse(response =>
    response.request().method() === "GET" && new URL(response.url()).pathname === "/api/documents/" + id + "/cancellation",
  );
  await page.evaluate(() => window.dispatchEvent(new Event("hca:data-changed")));
  await (await refreshed).finished();
  await expect(confirm).not.toHaveAttribute("aria-disabled", "true");
  await expect(confirm).toBeFocused();
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  expect(posts).toBe(0); expect(awarenessFacts(id)).toBe(before);
});
for (const type of ["REQ", "COM"]) test(type + " preserves original facts and recovers the personal cancellation awareness after a lost response", async ({ page }, info) => {
  // This journey includes five full-page audits and a real signed PDF. Retained
  // local fixtures make those checks slower than on the clean CI database.
  test.setTimeout(240_000);
  const f = await cancellationFixture(type), id = f.document.id, before = awarenessFacts(id);
  const family = await shiftWorker(f.patient, "family");
  await loginDecision(page, family.email, f.patient);
  let failRead = true, denyWrite = true, loseReply = true, writes = 0;
  await page.route("**/api/documents/" + id + "/cancellation", async route => {
    if (route.request().method() === "GET" && failRead) {
      await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "Consulta controlada indisponível.", code: "SERVICE_UNAVAILABLE" }) }); return;
    }
    if (route.request().method() === "POST") {
      writes++;
      if (denyWrite) { denyWrite = false; await route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ error: "Acesso recusado na resposta controlada.", code: "FORBIDDEN" }) }); return; }
      const response = await route.fetch(); expect(response.status()).toBe(200);
      if (loseReply) { loseReply = false; await route.abort(); return; }
      await route.fulfill({ response }); return;
    }
    await route.continue();
  });
  await page.goto((type === "REQ" ? "/historico/" : "/fichas/") + id);
  const notice = page.getByRole("region", { name: "Ciência do cancelamento", exact: true });
  await expect(notice).toContainText("Não foi possível consultar a ciência do cancelamento.");
  await expect(notice.getByRole("button", { name: "Estou ciente deste cancelamento", exact: true })).toHaveCount(0);
  expect((await awareness(family.client, id)).totalAcknowledgements).toBe(0);
  failRead = false;
  await notice.getByRole("button", { name: "Consultar minha confirmação", exact: true }).click();
  const confirm = notice.getByRole("button", { name: "Estou ciente deste cancelamento", exact: true });
  await expect(confirm).toBeEnabled();
  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 940 });
    await expect(page.locator(".app-header")).toHaveCSS("height", width <= 850 ? "104px" : "65px");
    await expect(page.locator(".app-header .hca-profile-identity")).toHaveCSS("display", width <= 850 ? "none" : "grid");
    await page.evaluate(() => document.fonts.ready);
    await auditFromTop(page, "cancellation-awareness-" + type + "-" + width);
  }
  const source = await awareness(family.client, id);
  await rpc(f.admin, "acknowledge_document_cancellation", { p_id: id, p_event: source.cancellation.id, p_key: randomUUID() });
  const refreshDocument = page.getByRole("button", { name: "Atualizar ficha", exact: true });
  await refreshDocument.click();
  await expect(notice).toContainText("Ciência familiar registrada por");
  await expect(refreshDocument).toBeEnabled();
  await expect(confirm).toBeEnabled();
  await confirm.focus();
  await expect.poll(() => confirm.evaluate(element => {
    const box = element.getBoundingClientRect(), hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
    return {
      focused: element === document.activeElement,
      minimumSize: box.width >= 24 && box.height >= 24,
      covered: !hit || !element.contains(hit),
    };
  }), { message: "The focused cancellation control must settle in a clickable area" })
    .toEqual({ focused: true, minimumSize: true, covered: false });
  await confirm.click();
  await expect(notice).toContainText("Acesso recusado na resposta controlada.");
  await expect(notice).not.toContainText("Cancelamento registrado por");
  await expect(confirm).toHaveCount(0);
  await notice.getByRole("button", { name: "Consultar minha confirmação", exact: true }).click();
  await expect(confirm).toBeEnabled();
  const lostReply = page.waitForEvent("requestfailed", request => request.method() === "POST" && new URL(request.url()).pathname === "/api/documents/" + id + "/cancellation");
  await confirm.focus(); await confirm.click(); await lostReply;
  await expect(notice.getByRole("button", { name: "Consultar minha confirmação", exact: true })).toBeEnabled();
  await expect(confirm).toBeDisabled();
  expect((await awareness(family.client, id)).totalAcknowledgements).toBe(2);
  await page.reload();
  await expect(notice).toContainText("Sua ciência do cancelamento está registrada");
  await expect(notice.getByRole("button", { name: "Estou ciente deste cancelamento", exact: true })).toHaveCount(0);
  expect(writes).toBe(2); expect(awarenessFacts(id)).toBe(before);
  await notice.getByRole("button", { name: "Consultar minha confirmação", exact: true }).click();
  await expect(notice).toContainText("Sua ciência do cancelamento está registrada");
  expect(writes).toBe(2); expect((await awareness(family.client, id)).totalAcknowledgements).toBe(2);
  await auditFromTop(page, "cancellation-awareness-recovered-" + type);
  const pdf = await generatedPdf(page, "/api/documents/" + id + "/pdf");
  expect(pdf.status()).toBe(200);
  mkdirSync("output/pdf/phase-d", { recursive: true });
  writeFileSync("output/pdf/phase-d/cancellation-awareness-" + type.toLowerCase() + "-" + info.project.name + ".pdf", await pdf.body());
  expect(awarenessFacts(id)).toBe(before);
  mkdirSync("output/playwright/phase-d", { recursive: true });
  await notice.screenshot({ path: "output/playwright/phase-d/cancellation-awareness-" + type.toLowerCase() + "-" + info.project.name + ".png", animations: "disabled" });
});
