import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { autonomousReturnFixture, returnBalances, transferState } from "../integration/autonomous-return-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";
import { selectDocumentSection } from "./document-sections";
import { audit } from "./accessibility-audit";
import { generatedPdf } from "./generated-pdf";

test.setTimeout(180_000);
test.afterEach(async ({ page }) => page.unrouteAll({ behavior: "wait" }));
async function login(page: Page, email: string, patient: string) {
  await page.goto("/login"); await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible();
  await selectContext(page, patient);
}
test("autonomous return has its own daily entry, recovers its preparation and preserves three personal acts without a prior ENT", async ({ page, browser }, info) => {
  const f = await autonomousReturnFixture();
  expect(sql("select count(*) from public.operational_documents where care_recipient_id=" + q(f.patient) + " and type='ENT'")).toBe("0");
  const before = transferState(f);
  await login(page, f.initiator.email, f.patient); await page.goto("/mais");
  await page.getByRole("navigation", { name: "Rotina e funções autorizadas", exact: true }).getByRole("link", { name: /Nova devolução de materiais/ }).click();
  await expect(page).toHaveURL(/\/fichas\/devolucao$/);
  await expect(page.getByRole("heading", { name: "Devolução de materiais", exact: true })).toBeVisible();
  await expect(page.getByRole("combobox", { name: /^Custódia de origem/ })).toHaveCount(0);
  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 940 });
    await page.getByRole("button", { name: "Preparar devolução", exact: true }).focus();
    await audit(page, "autonomous-return-entry-" + width);
  }
  await page.getByRole("button", { name: "Preparar devolução", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "Preparar devolução de materiais", exact: true });
  await editor.getByRole("combobox", { name: /^Contraparte para concordância/ }).selectOption(f.counterparty.id);
  await editor.getByRole("combobox", { name: /^Recebedor físico designado/ }).selectOption(f.recipient.id);
  const search = editor.getByRole("combobox", { name: /^Adicionar material da origem/ });
  await search.click(); await search.fill("Material fictício V4 0"); await search.press("ArrowDown");
  await page.getByRole("option", { name: /Material fictício V4 0/ }).click();
  await editor.getByRole("textbox", { name: /^Quantidade de Material fictício V4 0/ }).fill("5");
  await expect(editor.getByRole("combobox", { name: /^ENT documental de origem/ })).toHaveValue("");
  await editor.getByRole("textbox", { name: /^Sua justificativa para a devolução/ }).fill("Devolução autônoma de cinco unidades à família, sem entrega de origem vinculada.");
  const saved = page.waitForResponse(response => new URL(response.url()).pathname === "/api/drafts" && response.request().method() === "POST");
  await editor.getByRole("button", { name: "Salvar preenchimento privado", exact: true }).click(); expect((await saved).ok()).toBe(true);
  expect(transferState(f)).toBe(before);
  await page.reload(); await page.getByRole("button", { name: "Preparar devolução", exact: true }).click();
  await editor.getByRole("button", { name: "Continuar rascunho", exact: true }).click();
  await expect(editor.getByRole("textbox", { name: /^Quantidade de Material fictício V4 0/ })).toHaveValue("5");
  await editor.getByRole("button", { name: "Comparar referência atual", exact: true }).click();
  await editor.getByRole("button", { name: "Adotar referência atual e revisar meus campos", exact: true }).click();
  await editor.getByRole("button", { name: "Revisar declaração", exact: true }).click();
  const review = page.getByRole("dialog", { name: "Revisar declaração da devolução de materiais", exact: true });
  const recorded = page.waitForResponse(response => new URL(response.url()).pathname === "/api/transfers" && response.request().method() === "POST");
  await review.getByRole("button", { name: "Registrar declaração sem expedir", exact: true }).click();
  const response = await recorded; expect(response.ok()).toBe(true);
  const document = (await response.json()).data, id = document.id;
  expect(document.transfer.originDocumentId).toBeNull(); expect(document.protocol).toBeNull();
  expect(returnBalances(f)).toEqual({ family: 30, team: 10, transit: 0 });
  const peerOptions = { baseURL: new URL(page.url()).origin, viewport: info.project.use.viewport,
    isMobile: info.project.use.isMobile, hasTouch: info.project.use.hasTouch,
    deviceScaleFactor: info.project.use.deviceScaleFactor, userAgent: info.project.use.userAgent };
  const counterContext = await browser.newContext(peerOptions), receiverContext = await browser.newContext(peerOptions);
  try {
    const counter = await counterContext.newPage(); await login(counter, f.counterparty.email, f.patient);
    await counter.goto("/documentos/" + id); await selectDocumentSection(counter, "workflow");
    await counter.getByRole("button", { name: "Concordar com a transferência", exact: true }).click();
    await counter.getByRole("textbox", { name: /^Sua justificativa para este ato/ }).fill("Concordância familiar própria; outra pessoa fará o recebimento físico.");
    await counter.getByRole("button", { name: "Revisar meu ato", exact: true }).click();
    await counter.getByRole("button", { name: "Confirmar decisão", exact: true }).click();
    await expect(counter.getByText("Concordância registrada com sua autoria. Ainda não houve expedição nem recebimento.", { exact: true })).toBeVisible();
    expect(returnBalances(f)).toEqual({ family: 30, team: 10, transit: 0 });
    await page.goto("/documentos/" + id); await selectDocumentSection(page, "workflow");
    await page.getByRole("button", { name: "Expedir transferência", exact: true }).click();
    await page.getByRole("button", { name: "Revisar meu ato", exact: true }).click();
    await page.getByRole("button", { name: "Confirmar expedição", exact: true }).click();
    await expect(page.getByText("Expedição confirmada. Os materiais estão em trânsito até o recebimento pessoal.", { exact: true })).toBeVisible();
    expect(returnBalances(f)).toEqual({ family: 30, team: 5, transit: 5 });
    const receiver = await receiverContext.newPage(); await login(receiver, f.recipient.email, f.patient);
    await receiver.goto("/entregas"); const task = receiver.locator('[data-delivery-id="' + id + '"]');
    await expect(task).toContainText("Devolução de materiais"); await task.getByRole("link", { name: "Conferir", exact: true }).click();
    await selectDocumentSection(receiver, "workflow");
    await receiver.getByRole("button", { name: "Informar divergência", exact: true }).click();
    await receiver.getByRole("checkbox", { name: /Material fictício V4 0.*expedido/ }).check();
    await receiver.getByRole("textbox", { name: "Efetivamente recebido", exact: true }).fill("3");
    await receiver.getByRole("textbox", { name: "Observações da divergência", exact: true }).fill("Recebi três das cinco unidades desta devolução autônoma.");
    await receiver.getByRole("button", { name: "Revisar operação", exact: true }).click();
    await receiver.getByRole("button", { name: "Confirmar operação", exact: true }).click();
    await expect(receiver.getByText("Operação confirmada e registrada na ficha. Consulte os eventos e as notificações para acompanhar o processamento.", { exact: true })).toBeVisible();
    const final = (await (await receiver.request.get("/api/documents/" + id)).json()).data;
    expect(final.workflow_data.acceptedBy).toBe(f.recipient.id); expect(final.transfer.agreement.actor.id).toBe(f.counterparty.id);
    expect(final.created_by).toBe(f.initiator.id); expect(final.transfer.originDocumentId).toBeNull(); expect(final.code).toBe("DEV-0001");
    expect(returnBalances(f)).toEqual({ family: 33, team: 5, transit: 2 });
    const after = transferState(f), pdf = await generatedPdf(receiver, "/api/documents/" + id + "/pdf"); expect(pdf.status()).toBe(200);
    mkdirSync("output/pdf/phase-d", { recursive: true }); writeFileSync("output/pdf/phase-d/autonomous-return-" + info.project.name + ".pdf", await pdf.body());
    expect(transferState(f)).toBe(after);
    mkdirSync("output/playwright/phase-d", { recursive: true });
    await receiver.setViewportSize({ width: 320, height: 940 }); await audit(receiver, "autonomous-return-personal-receipt");
    await receiver.screenshot({ path: "output/playwright/phase-d/autonomous-return-" + info.project.name + ".png", fullPage: true, animations: "disabled" });
  } finally { await counterContext.close(); await receiverContext.close(); }
});
