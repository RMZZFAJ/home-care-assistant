import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { cancellationFixture, awareness, awarenessFacts, rpc } from "../integration/cancellation-awareness-fixtures.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { fixtures } from "../integration/v4-fixtures.mjs";
import { selectContext } from "./auth-context";
import { generatedPdf } from "./generated-pdf";
import { auditFromTop } from "./accessibility-audit";

test.setTimeout(180_000);
test.afterEach(async ({ page }) => page.unrouteAll({ behavior: "wait" }));
test("COM cancellation confirmation retains focus during a held read and never queues a premature acknowledgement", async ({ page }) => {
  const f = await cancellationFixture("COM"), id = f.document.id;
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(fixtures.family.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible();
  await selectContext(page, f.patient); await page.goto("/fichas/" + id);
  const notice = page.getByRole("region", { name: "Ciência do cancelamento", exact: true });
  const confirm = notice.getByRole("button", { name: "Estou ciente deste cancelamento", exact: true });
  await expect(confirm).toBeEnabled(); await confirm.focus();
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
    await confirm.evaluate((button: HTMLButtonElement) => button.click());
    expect(posts).toBe(0); expect((await awareness(f.family, id)).totalAcknowledgements).toBe(0);
  } finally { release(); }
  await expect(confirm).not.toHaveAttribute("aria-disabled", "true"); await expect(confirm).toBeFocused();
  expect(posts).toBe(0); expect(awarenessFacts(id)).toBe(before);
});
for (const type of ["REQ", "COM"]) test(type + " preserves original facts and recovers the personal cancellation awareness after a lost response", async ({ page }, info) => {
  // This journey includes five full-page audits and a real signed PDF. Retained
  // local fixtures make those checks slower than on the clean CI database.
  test.setTimeout(240_000);
  const f = await cancellationFixture(type), id = f.document.id, before = awarenessFacts(id);
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(fixtures.family.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible();
  await selectContext(page, f.patient);
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
  expect((await awareness(f.family, id)).totalAcknowledgements).toBe(0);
  failRead = false;
  await notice.getByRole("button", { name: "Consultar minha confirmação", exact: true }).click();
  const confirm = notice.getByRole("button", { name: "Estou ciente deste cancelamento", exact: true });
  await expect(confirm).toBeEnabled();
  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 940 });
    await expect(page.locator(".app-header")).toHaveCSS("height", width <= 850 ? "110px" : "64px");
    await expect(page.locator(".app-header .hca-profile-identity")).toHaveCSS("display", width <= 850 ? "none" : "grid");
    await page.evaluate(() => document.fonts.ready);
    await auditFromTop(page, "cancellation-awareness-" + type + "-" + width);
  }
  const source = await awareness(f.family, id);
  await rpc(f.admin, "acknowledge_document_cancellation", { p_id: id, p_event: source.cancellation.id, p_key: randomUUID() });
  await page.getByRole("button", { name: "Atualizar ficha", exact: true }).click();
  await expect(notice).toContainText("Ciência familiar registrada por");
  await expect(confirm).toBeEnabled();
  await confirm.focus(); await expect(confirm).toBeFocused();
  const target = await confirm.evaluate(element => {
    const box = element.getBoundingClientRect(), hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
    return { width: box.width, height: box.height, covered: !hit || !element.contains(hit) };
  });
  expect(target.width).toBeGreaterThanOrEqual(24); expect(target.height).toBeGreaterThanOrEqual(24); expect(target.covered).toBe(false);
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
  expect((await awareness(f.family, id)).totalAcknowledgements).toBe(2);
  await page.reload();
  await expect(notice).toContainText("Sua ciência do cancelamento está registrada");
  await expect(notice.getByRole("button", { name: "Estou ciente deste cancelamento", exact: true })).toHaveCount(0);
  expect(writes).toBe(2); expect(awarenessFacts(id)).toBe(before);
  await notice.getByRole("button", { name: "Consultar minha confirmação", exact: true }).click();
  await expect(notice).toContainText("Sua ciência do cancelamento está registrada");
  expect(writes).toBe(2); expect((await awareness(f.family, id)).totalAcknowledgements).toBe(2);
  await auditFromTop(page, "cancellation-awareness-recovered-" + type);
  const pdf = await generatedPdf(page, "/api/documents/" + id + "/pdf");
  expect(pdf.status()).toBe(200);
  mkdirSync("output/pdf/phase-d", { recursive: true });
  writeFileSync("output/pdf/phase-d/cancellation-awareness-" + type.toLowerCase() + "-" + info.project.name + ".pdf", await pdf.body());
  expect(awarenessFacts(id)).toBe(before);
  mkdirSync("output/playwright/phase-d", { recursive: true });
  await notice.screenshot({ path: "output/playwright/phase-d/cancellation-awareness-" + type.toLowerCase() + "-" + info.project.name + ".png", animations: "disabled" });
});
