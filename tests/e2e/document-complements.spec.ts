import { test, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { cancellationFixture, awarenessFacts } from "../integration/cancellation-awareness-fixtures.mjs";
import { createComplementCandidate, loadComplementDocument, readComplementLinks } from "../integration/document-complements-fixtures.mjs";
import { fixtures } from "../integration/v4-fixtures.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";
import { auditFromTop } from "./accessibility-audit";

test.setTimeout(180_000);
test.afterEach(async ({ page }) => page.unrouteAll({ behavior: "wait" }));
for (const type of ["REQ", "COM"]) test(type + " links a new issued complement and recovers the exact attempt without changing original facts", async ({ page }, info) => {
  const f = await cancellationFixture(type), sourceId = f.document.id;
  const childId = await createComplementCandidate(f, "COM"), candidate = await loadComplementDocument(f.admin, childId);
  const original = awarenessFacts(sourceId), material = awarenessFacts(childId);
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(fixtures.adminA.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible();
  await selectContext(page, f.patient);
  let failRead = true, mismatchCandidate = true, denyWrite = true, loseReply = true, writes = 0;
  const endpoint = "/api/documents/" + sourceId + "/complements";
  await page.route("**" + endpoint + "*", async route => {
    const request = route.request(), url = new URL(request.url());
    if (request.method() === "GET" && failRead) {
      await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "Consulta controlada indisponível.", code: "SERVICE_UNAVAILABLE" }) }); return;
    }
    if (request.method() === "GET" && url.searchParams.get("mode") === "candidates" && mismatchCandidate) {
      mismatchCandidate = false; const response = await route.fetch(); expect(response.status()).toBe(200);
      const data = await response.json(); data.data.sourceId = "30000000-0000-4000-8000-000000000099";
      await route.fulfill({ response, json: data }); return;
    }
    if (request.method() === "POST") {
      writes++;
      if (denyWrite) { denyWrite = false; await route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ error: "Acesso recusado na resposta controlada.", code: "FORBIDDEN" }) }); return; }
      const response = await route.fetch(); expect(response.status()).toBe(200);
      if (loseReply) { loseReply = false; await route.abort(); return; }
      await route.fulfill({ response }); return;
    }
    await route.continue();
  });
  await page.goto((type === "REQ" ? "/historico/" : "/fichas/") + sourceId);
  const panel = page.getByRole("region", { name: "Fichas complementares", exact: true });
  await expect(panel).toContainText("Consulta controlada indisponível.");
  await expect(panel.getByRole("button", { name: "Vincular ficha emitida", exact: true })).toHaveCount(0);
  failRead = false;
  await panel.getByRole("button", { name: "Atualizar vínculos", exact: true }).click();
  await expect(panel).toContainText("Nenhuma ficha complementar vinculada.");
  const originLink = panel.getByRole("link", { name: "Emitir compra ou doação", exact: true });
  await expect(originLink).toHaveAttribute("href", "/fichas/com?complementOf=" + sourceId + "&complementType=" + type);
  const trigger = panel.getByRole("button", { name: "Vincular ficha emitida", exact: true });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Vincular ficha complementar", exact: true });
  await expect(dialog).toContainText("A consulta de fichas não corresponde à seleção.");
  await expect(dialog.getByRole("button", { name: "Conferir vínculo", exact: true })).toBeDisabled();
  await dialog.getByRole("button", { name: "Atualizar fichas disponíveis", exact: true }).click();
  await expect(page.locator('[role="dialog"]').getByRole("button", { name: "Atualizar fichas disponíveis", exact: true })).toBeEnabled();
  await dialog.getByRole("combobox", { name: "Tipo da nova ficha", exact: true }).selectOption("COM");
  await dialog.getByRole("radio", { name: new RegExp(candidate.code) }).check();
  const reason = "Complementação formal com a observação adicional necessária, preservando os materiais e as ciências anteriores. A nova ficha mantém seus atos próprios e o vínculo não representa atendimento ou alteração de estoque.";
  await dialog.getByRole("textbox", { name: "Motivo do complemento", exact: true }).fill(reason);
  await dialog.getByRole("button", { name: "Conferir vínculo", exact: true }).click();
  await expect(dialog).toContainText(reason);
  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 940 });
    await expect(page.locator(".app-header")).toHaveCSS("height", width <= 850 ? "110px" : "64px");
    await expect(page.locator(".app-header .hca-profile-identity")).toHaveCSS("display", width <= 850 ? "none" : "grid");
    await page.evaluate(() => document.fonts.ready);
    await auditFromTop(page, "complement-review-" + type + "-" + width);
  }
  await dialog.getByRole("button", { name: "Confirmar vínculo complementar", exact: true }).click();
  await expect(dialog).toContainText("Acesso recusado na resposta controlada.");
  await dialog.getByRole("button", { name: "Consultar a mesma tentativa", exact: true }).click();
  await expect(dialog).toContainText("A consulta confirmou que esta tentativa não registrou um vínculo.");
  const failedReply = page.waitForEvent("requestfailed", request => request.method() === "POST" && new URL(request.url()).pathname === endpoint);
  await dialog.getByRole("button", { name: "Reenviar a mesma tentativa", exact: true }).click(); await failedReply;
  await expect(dialog.getByRole("button", { name: "Consultar a mesma tentativa", exact: true })).toBeEnabled();
  expect((await readComplementLinks(f.admin, sourceId)).total).toBe(1);
  await page.reload();
  await expect(panel).toContainText(reason);
  await panel.getByRole("button", { name: "Vincular ficha emitida", exact: true }).click();
  await expect(dialog).toContainText("Há uma tentativa de vínculo para consultar.");
  expect(writes).toBe(2);
  await dialog.getByRole("button", { name: "Consultar a mesma tentativa", exact: true }).click();
  await expect(dialog).toContainText("Vínculo confirmado.");
  await dialog.getByRole("button", { name: "Fechar", exact: true }).click();
  await expect(trigger).toBeFocused();
  expect(writes).toBe(2); expect((await readComplementLinks(f.admin, sourceId)).total).toBe(1);
  expect(awarenessFacts(sourceId)).toBe(original); expect(awarenessFacts(childId)).toBe(material);
  await expect(panel).toContainText(candidate.code);
  await auditFromTop(page, "complement-recovered-" + type);
  mkdirSync("output/playwright/phase-d", { recursive: true });
  await panel.screenshot({ path: "output/playwright/phase-d/complement-" + type.toLowerCase() + "-" + info.project.name + ".png", animations: "disabled" });
});
