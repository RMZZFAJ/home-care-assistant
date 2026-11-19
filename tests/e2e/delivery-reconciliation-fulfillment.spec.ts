import { randomUUID } from "node:crypto";
import { PDF } from "@libpdf/core";
import { expect, test, type Page } from "@playwright/test";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { actor, delivery, fixtures, issue, rpc, setup } from "../integration/v4-fixtures.mjs";
import { selectContext } from "./auth-context";
import { selectDocumentSection } from "./document-sections";
import { generatedPdf } from "./generated-pdf";
import type { SupplyDocument } from "../../src/types/documents";

async function openDelivery(page: Page, patient: string, document: string, email: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible();
  await selectContext(page, patient);
  await page.goto("/fichas/" + document);
}

test("ENT concilia um material com avaliação familiar e preserva o outro em apuração", async ({ page }, info) => {
  const f = await setup(), req = await issue(f.patient, f.products);
  const team = await actor("professional", f.patient);
  const ent = await delivery(f.patient, req, f.products, { quantity: "5", requestFulfillment: "partial" }) as SupplyDocument;
  const [first, second] = ent.lines;
  const reason = "Duas unidades ficaram no armário da origem.";
  await rpc(team, "supply_document_command", {
    p_id: ent.id, p_action: "receive", p_key: randomUUID(), p_version: ent.version,
    p_body: { countedReceipt: { lines: ent.lines.map(line => ({ lineId: line.id, receivedQuantity: "3" })) } },
  });
  await openDelivery(page, f.patient, ent.id, fixtures.family.email);
  await page.getByRole("button", { name: "Conciliar divergência", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Resolver diferença de quantidade", exact: true });
  const submit = dialog.getByRole("button", { name: "Registrar decisão do item", exact: true });
  await expect(dialog.getByRole("heading", { name: first.name_snapshot, exact: true })).toBeVisible();
  await expect(dialog.getByRole("heading", { name: second.name_snapshot, exact: true })).toBeVisible();
  await expect(dialog.getByLabel("Quantidade esclarecida")).toHaveValue("2");
  await expect(submit).toBeInViewport({ ratio: 1 });
  await expect(submit).toHaveCSS("white-space", "normal");
  await expect(dialog.locator(".hca-reconcile-amount .hca-field")).toHaveCSS("flex-direction", "row");
  if (info.project.use.hasTouch) await test.info().attach("Conciliação por material", {
    contentType: "image/png", body: await page.screenshot({ animations: "disabled", scale: "css" }),
  });
  await dialog.getByLabel("O que aconteceu?").selectOption("not_sent");
  await dialog.getByLabel("Como foi conferido?").fill(reason);
  await dialog.getByRole("switch", { name: "Necessidade integralmente atendida" }).check();
  await submit.click();
  const result = page.getByRole("dialog", { name: "Avaliação registrada na conciliação", exact: true });
  await expect(result).toContainText("Necessidade integralmente atendida");
  await expect(result).toContainText("A entrega ainda tem quantidades em apuração.");
  await result.getByRole("button", { name: "Voltar à ficha", exact: true }).click();
  await expect(result).toHaveCount(0);
  await page.getByRole("button", { name: "Conciliar divergência", exact: true }).click();
  await expect(dialog.getByRole("article").filter({ hasText: first.name_snapshot })).toContainText("Necessidade integralmente atendida");
  await expect(dialog.getByRole("article").filter({ hasText: second.name_snapshot })).toContainText("2 unidade em apuração");
  await dialog.getByRole("button", { name: "Voltar", exact: true }).click();
  const pdf = await generatedPdf(page, "/api/documents/" + ent.id + "/pdf");
  expect(pdf.ok(), await pdf.text()).toBe(true);
  const content = (await PDF.load(await pdf.body())).extractText().flatMap(page =>
    page.lines.flatMap(line => line.spans.flatMap(span => span.chars.map(char => char.char))),
  ).join("").normalize("NFKC").replaceAll(/\s/g, "");
  for (const fact of [reason, "Material permaneceu na origem", "Nova avaliação familiar"]) {
    expect(content).toContain(fact.normalize("NFKC").replaceAll(/\s/g, ""));
  }
});

test("ENT solicita reavaliação com a quantidade conferida e mostra à família o motivo da equipe", async ({ page, browser }, info) => {
  const f = await setup(), req = await issue(f.patient, [f.products[0]]);
  const ent = await delivery(f.patient, req, [f.products[0]], { quantity: "5", requestFulfillment: "complete" }) as SupplyDocument;
  const [line] = ent.lines;
  const reason = "As unidades recebidas não cobrem o próximo plantão.";
  await openDelivery(page, f.patient, ent.id, fixtures.professional.email);
  await page.getByRole("button", { name: "Conferir recebimento", exact: true }).click();
  const receipt = page.getByRole("dialog", { name: "Conferir recebimento", exact: true });
  await receipt.getByRole("switch", { name: "Necessidade suprida · " + line.name_snapshot }).uncheck();
  await receipt.getByLabel("Motivo do pedido de reavaliação").fill(reason);
  await receipt.getByRole("button", { name: "Confirmar recebimento", exact: true }).click();
  const requested = page.getByRole("dialog", { name: "Recebimento confirmado · revisão solicitada", exact: true });
  await expect(requested).toBeVisible();
  await requested.getByRole("button", { name: "Voltar à ficha", exact: true }).click();
  const familyPage = await browser.newPage({ baseURL: new URL(page.url()).origin });
  try {
    await openDelivery(familyPage, f.patient, ent.id, fixtures.family.email);
    await selectDocumentSection(familyPage, "materials");
    await familyPage.getByRole("button", { name: "Avaliar suficiência de " + line.name_snapshot, exact: true }).click();
    const review = familyPage.getByRole("dialog", { name: "Reavaliar necessidade", exact: true });
    await expect(review).toContainText(reason);
    await expect(review).toContainText("5 unidade recebidos");
    if (info.project.use.hasTouch) await test.info().attach("Motivo da equipe na reavaliação", {
      contentType: "image/png", body: await familyPage.screenshot({ animations: "disabled", scale: "css" }),
    });
    await review.getByRole("button", { name: "Parcialmente", exact: true }).click();
    await review.getByLabel("Justificativa da avaliação").fill("A família manterá o restante da requisição em aberto.");
    await review.getByRole("button", { name: "Registrar avaliação familiar", exact: true }).click();
    await expect(review).toHaveCount(0);
    await expect(familyPage.getByText(/Nova avaliação familiar: atendimento parcial/)).toBeVisible();
  } finally {
    await familyPage.close();
  }
});
