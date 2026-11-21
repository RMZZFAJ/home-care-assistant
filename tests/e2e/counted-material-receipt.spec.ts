import { openOperationalDocumentAction } from "./document-sections";
import { randomUUID } from "node:crypto";
import { PDF } from "@libpdf/core";
import { expect, test, type Page } from "@playwright/test";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { rpc, transferFixture, transferState } from "../integration/transfer-fixtures.mjs";
import { selectContext } from "./auth-context";
import { selectDocumentSection } from "./document-sections";
import { generatedPdf, pdfIssuanceReference } from "./generated-pdf";
import { audit } from "./accessibility-audit";
import type { SupplyDocument } from "../../src/types/documents";

test("ENT confere falta e excedente na mesma ficha e recupera confirmação sem nova movimentação", async ({ page }, info) => {
  test.setTimeout(150_000);
  const f = await transferFixture();
  const shipmentNote = "Expedição fictícia separada em dois volumes.";
  const receiptNote = "Segundo volume continha oito unidades fictícias.";
  const sent = await rpc(f.admin, "create_supply_document", {
    p_patient: f.patient,
    p_type: "ENT",
    p_key: randomUUID(),
    p_payload: {
      source: "FAMILY", destination: "CARE_TEAM", recipientId: f.initiator.id,
      recipientReason: "Profissional fictício do plantão.",
      notes: shipmentNote,
      lines: [
        { productId: f.products[0], quantity: "5" },
        { productId: f.products[1], quantity: "6" },
      ],
    },
  }) as SupplyDocument;
  const before = JSON.parse(transferState(f));
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(f.initiator.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible();
  await selectContext(page, f.patient);
  await page.goto("/fichas/" + sent.id);
  await openOperationalDocumentAction(page, "Conferir recebimento");
  const editor = page.getByRole("dialog", { name: "Conferir recebimento", exact: true });
  const short = editor.getByRole("textbox", { name: /Recebidas de Material fictício V4 0/ });
  const excess = editor.getByRole("textbox", { name: /Recebidas de Material fictício V4 1/ });
  const confirm = editor.getByRole("button", { name: "Confirmar recebimento", exact: true });
  await expect(short).toHaveValue("5");
  await expect(excess).toHaveValue("6");
  await expect(confirm).toBeInViewport({ ratio: 1 });
  await audit(page, "conferência pessoal de ENT");
  if (info.project.use.hasTouch) await capture(page, "Conferência de ENT");
  await short.fill("3");
  await excess.fill("8");
  await editor.getByText("Dados e observação da expedição", { exact: true }).click();
  await expect(editor).toContainText(shipmentNote);
  await editor.getByText("Adicionar observação ao recebimento", { exact: true }).click();
  await editor.getByRole("textbox", { name: "Sua observação no recebimento" }).fill(receiptNote);
  await confirm.click();
  const review = page.getByRole("dialog", { name: "Confirmar diferença no recebimento", exact: true });
  await expect(review.getByText(/2 unidade a menos/)).toBeVisible();
  await expect(review.getByText(/2 unidade a mais/)).toBeVisible();
  await expect(review).toContainText("2 ficam em conciliação");
  await expect(review).toContainText("O excedente aguarda regularização da origem.");
  expect(JSON.parse(transferState(f))).toEqual(before);
  if (info.project.use.hasTouch) await capture(page, "Revisão da diferença de ENT");
  await review.getByRole("button", { name: "Voltar e editar" }).click();
  await expect(short).toHaveValue("3");
  await expect(excess).toHaveValue("8");
  await editor.getByText("Adicionar observação ao recebimento", { exact: true }).click();
  await expect(editor.getByRole("textbox", { name: "Sua observação no recebimento" })).toHaveValue(receiptNote);
  await confirm.click();

  const decisionPath = "/api/documents/" + sent.id + "/decisions";
  let originalWrites = 0, recoveryReads = 0;
  await page.route(url => url.pathname === decisionPath, async route => {
    originalWrites += 1;
    const response = await route.fetch({ maxRetries: 0 });
    if (response.ok()) await route.abort("failed");
    else await route.fulfill({ response });
  });
  await page.route(url => url.pathname === decisionPath + "/reconcile", async route => {
    recoveryReads += 1;
    await route.continue();
  });
  try {
    await review.getByRole("button", { name: "Registrar diferença" }).click();
    const result = page.getByRole("dialog", { name: "Recebimento registrado com diferença", exact: true });
    await expect(result).toContainText("Excedente em apuração");
    await expect(result).toContainText("Reconhecidas no estoque");
    await result.getByRole("button", { name: "Voltar à ficha" }).click();
    expect(originalWrites).toBe(1);
    expect(recoveryReads).toBe(1);
  } finally {
    await page.unrouteAll({ behavior: "wait" });
  }
  const after = JSON.parse(transferState(f));
  expect(after.ledger).toHaveLength(before.ledger.length + 2);
  await selectDocumentSection(page, "materials");
  const materials = page.getByRole("list", { name: "Materiais da entrega ou transferência", exact: true });
  await materials.getByRole("button", { name: "Detalhes de Material fictício V4 1", exact: true }).click();
  const panel = page.getByRole("dialog", { name: "Material fictício V4 1", exact: true });
  await expect(panel.getByText("Recebido declarado", { exact: true })).toBeVisible();
  await expect(panel.getByText("Excedente em apuração", { exact: true })).toBeVisible();
  await panel.getByRole("button", { name: "Voltar à ficha", exact: true }).click();
  const receiptObservation = page.getByRole("region", { name: "Materiais da entrega ou transferência", exact: true })
    .getByText("Observação do recebedor", { exact: true }).locator("..");
  await expect(receiptObservation).toBeVisible();
  await expect(receiptObservation).toContainText(receiptNote);
  const pdf = await generatedPdf(page, "/api/documents/" + sent.id + "/pdf");
  expect(pdf.ok(), await pdf.text()).toBe(true);
  const pdfBytes = await pdf.body();
  await pdfIssuanceReference(page, sent.id, pdfBytes);
  const text = (await PDF.load(pdfBytes)).extractText().flatMap(page =>
    page.lines.flatMap(line => line.spans.flatMap(span => span.chars.map(char => char.char))),
  ).join("").normalize("NFKC").replaceAll(/\s/g, "");
  for (const evidence of [
    shipmentNote, receiptNote, "Recebido declarado", "Reconhecido", "O excedente fica em apuração",
    "Material fictício V4 1 8 unidade 6 unidade 0 unidade 2 unidade",
    "Material fictício V4 0 3 unidade 3 unidade 2 unidade 0 unidade",
  ]) {
    expect(text).toContain(evidence.normalize("NFKC").replaceAll(/\s/g, ""));
  }
});

async function capture(page: Page, name: string) {
  await test.info().attach(name, { contentType: "image/png", body: await page.screenshot({ animations: "disabled", scale: "css" }) });
}
