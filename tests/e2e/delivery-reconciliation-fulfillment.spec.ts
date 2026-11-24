import { openOperationalDocumentAction } from "./document-sections";
import { randomUUID } from "node:crypto";
import { PDF } from "@libpdf/core";
import { expect, test, type Page } from "@playwright/test";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { actor, delivery, fixtures, issue, rpc, setup } from "../integration/v4-fixtures.mjs";
import { selectContext } from "./auth-context";
import { selectDocumentSection } from "./document-sections";
import { generatedPdf } from "./generated-pdf";
import { audit } from "./accessibility-audit";
import { confirmedOutcome, noPrivateWrites } from "./l1-decision-policy";
import { shiftWorker } from "../integration/shift-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
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

test("ENT mantém a conciliação aberta entre cinco materiais e registra só a linha confirmada", async ({ page }, info) => {
  test.setTimeout(150_000);
  const f = await setup({ catalogue: ["Algodão", "Compressa", "Fralda", "Gaze", "Soro"].map(name => ({
    name: name + " fictício", category: "higiene", unit: "unidade", aliases: [],
  })) });
  const family = await shiftWorker(f.patient, "family"), req = await issue(f.patient, f.products);
  const team = await actor("professional", f.patient);
  const ent = await delivery(f.patient, req, f.products, { quantity: "5", requestFulfillment: "partial" }) as SupplyDocument;
  const [first, second] = ent.lines;
  const reason = "Duas unidades ficaram no armário da origem.";
  const unsent = "Material separado para uma conferência adicional.";
  await rpc(team, "supply_document_command", {
    p_id: ent.id, p_action: "receive", p_key: randomUUID(), p_version: ent.version,
    p_body: { countedReceipt: { lines: ent.lines.map(line => ({ lineId: line.id, receivedQuantity: "3" })) } },
  });
  const privateWrites = noPrivateWrites(page);
  await openDelivery(page, f.patient, ent.id, family.email);
  await page.getByRole("button", { name: "Conciliar divergência", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Resolver diferença de quantidade", exact: true });
  const submit = dialog.getByRole("button", { name: "Registrar decisão do item", exact: true });
  await expect(dialog.getByRole("article")).toHaveCount(5);
  const card = (line: SupplyDocument["lines"][number]) => dialog.getByRole("article").filter({ has: page.getByRole("heading", { name: line.name_snapshot, exact: true }) });
  const choose = (line: SupplyDocument["lines"][number]) => card(line).getByRole("button", { name: `Avaliar este material · ${line.name_snapshot}`, exact: true }).click();
  await expect(dialog.getByLabel("Quantidade esclarecida")).toHaveValue("2");
  await expect(submit).toBeInViewport({ ratio: 1 });
  await expect(submit).toHaveCSS("white-space", "normal");
  await expect(dialog.locator(".hca-reconcile-amount .hca-field")).toHaveCSS("flex-direction", "row");
  if (info.project.use.hasTouch) await page.setViewportSize({ width: 360, height: 844 });
  await choose(second);
  await dialog.getByLabel("Como foi conferido?").fill(unsent);
  await choose(first);
  await dialog.getByLabel("O que aconteceu?").selectOption("not_sent");
  await dialog.getByLabel("Como foi conferido?").fill(reason);
  await dialog.getByRole("switch", { name: "Necessidade integralmente atendida" }).check();
  await confirmedOutcome(page, ent.id, "Registrar decisão do item");
  await page.unroute(`**/api/documents/${ent.id}/decisions`);
  await expect(dialog).toBeVisible();
  await expect(card(first)).toContainText("Diferença conciliada");
  await expect(card(first)).toContainText("Necessidade integralmente atendida");
  await expect(card(second)).toContainText("2 unidade em apuração");
  await expect(card(second).getByRole("heading")).toBeFocused();
  await expect(card(second).getByLabel("Como foi conferido?")).toHaveValue(unsent);
  await expect(dialog.getByRole("status")).toHaveText(`Decisão registrada para ${first.name_snapshot}.`);
  const confirmed = await rpc(f.admin, "operational_document", { p_id: ent.id }) as SupplyDocument;
  expect(confirmed.events.filter(event => event.action === "ent.resolve")).toMatchObject([{ actorId: family.id }]);
  expect(confirmed.fulfillmentReviews).toMatchObject([{ lineId: first.id, decision: "complete", reason }]);
  expect(confirmed.lines.map(line => [line.id, Number(line.accepted_quantity), Number(line.reconciled_quantity)])).toEqual(
    ent.lines.map(line => [line.id, 3, line.id === first.id ? 2 : 0]),
  );
  const familyStock = (line: SupplyDocument["lines"][number]) => Number(sql(`select private.stock_quantity(${q(f.patient)},${q(line.product_id)},'FAMILY')`));
  expect(familyStock(first)).toBe(27);
  expect(familyStock(second)).toBe(25);
  if (info.project.use.hasTouch) {
    for (const width of [360, 412]) {
      await page.setViewportSize({ width, height: 844 });
      await expect(submit).toBeInViewport({ ratio: 1 });
      await info.attach(`E06-08 conciliação ${width} px`, { contentType: "image/png", body: await dialog.screenshot({ animations: "disabled", scale: "css" }) });
    }
  }
  await dialog.getByRole("button", { name: "Voltar", exact: true }).click();
  const discard = page.getByRole("dialog", { name: "Sair sem concluir a conciliação?", exact: true });
  await discard.getByRole("button", { name: "Voltar ao preenchimento", exact: true }).click();
  await expect(card(second).getByLabel("Como foi conferido?")).toHaveValue(unsent);
  await dialog.getByRole("button", { name: "Voltar", exact: true }).click();
  await discard.getByRole("button", { name: "Sair e descartar", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page.getByRole("button", { name: "Conciliar divergência", exact: true }).click();
  await expect(card(first)).toContainText("Necessidade integralmente atendida");
  await expect(card(second).getByLabel("Como foi conferido?")).toHaveValue("");
  for (const item of ent.lines.slice(1)) {
    await expect(card(item).getByLabel("Como foi conferido?")).toBeVisible();
    await card(item).getByLabel("Como foi conferido?").fill("A família conferiu o saldo na origem.");
    await submit.click();
  }
  const result = page.getByRole("dialog", { name: "Diferença conciliada", exact: true });
  await expect(result).toContainText("Permaneceu com a família");
  await expect(result).toContainText("2 unidade");
  await result.getByRole("button", { name: "Voltar à ficha", exact: true }).click();
  const beforeConsultation = await rpc(f.admin, "operational_document", { p_id: ent.id }) as SupplyDocument;
  await page.reload();
  await selectDocumentSection(page, "materials");
  const consult = page.getByRole("button", { name: `Consultar avaliação registrada de ${first.name_snapshot}`, exact: true });
  await consult.click();
  const assessment = page.getByRole("dialog", { name: "Avaliação registrada na conciliação", exact: true });
  await expect(assessment.getByRole("heading", { name: first.name_snapshot, exact: true })).toBeVisible();
  await expect(assessment).toContainText("Recebido: 3 unidade");
  await expect(assessment).toContainText("Integralmente suprida");
  await expect(assessment).toContainText(confirmed.fulfillmentReviews![0].actorName);
  await expect(assessment.getByRole("button", { name: `Opções de ${first.name_snapshot}`, exact: true })).toBeVisible();
  await expect(assessment.getByRole("button", { name: "Registrar avaliação", exact: true })).toHaveCount(0);
  if (info.project.use.hasTouch) await info.attach("E06-18 avaliação registrada", {
    body: await assessment.screenshot({ animations: "disabled", scale: "css" }), contentType: "image/png",
  });
  await assessment.getByRole("button", { name: "Voltar à ficha", exact: true }).click();
  await expect(consult).toBeFocused();
  const afterConsultation = await rpc(f.admin, "operational_document", { p_id: ent.id }) as SupplyDocument;
  expect(afterConsultation.version).toBe(beforeConsultation.version);
  expect(afterConsultation.fulfillmentReviews).toEqual(beforeConsultation.fulfillmentReviews);
  expect(privateWrites).toEqual([]);
  const pdf = await generatedPdf(page, "/api/documents/" + ent.id + "/pdf");
  expect(pdf.ok(), await pdf.text()).toBe(true);
  const content = (await PDF.load(await pdf.body())).extractText().flatMap(page =>
    page.lines.flatMap(line => line.spans.flatMap(span => span.chars.map(char => char.char))),
  ).join("").normalize("NFKC").replaceAll(/\s/g, "");
  for (const fact of [reason, "Material permaneceu na origem", "Nova avaliação familiar"]) {
    expect(content).toContain(fact.normalize("NFKC").replaceAll(/\s/g, ""));
  }
});

test("REQ e ENT usam a mesma avaliação familiar com histórico e recebimento preservado", async ({ page, browser }, info) => {
  test.setTimeout(120_000);
  const f = await setup(), req = await issue(f.patient, [f.products[0]]);
  const family = await shiftWorker(f.patient, "family");
  const ent = await delivery(f.patient, req, [f.products[0]], { quantity: "5", requestFulfillment: "complete" }) as SupplyDocument;
  const [line] = ent.lines;
  const reason = "As unidades recebidas não cobrem o próximo plantão.";
  await openDelivery(page, f.patient, ent.id, fixtures.professional.email);
  await openOperationalDocumentAction(page, "Conferir recebimento");
  const receipt = page.getByRole("dialog", { name: "Conferir recebimento", exact: true });
  await receipt.getByRole("switch", { name: "Necessidade suprida · " + line.name_snapshot }).uncheck();
  const assessmentReason = receipt.getByLabel("Motivo do pedido de reavaliação");
  await assessmentReason.fill(reason);
  const helpControl = receipt.getByRole("button", { name: "Ajuda nesta tarefa", exact: true });
  const beforeHelp = sql(`select count(*) from public.document_events where document_id=${q(ent.id)}`);
  const beforeGuide = (await (await page.request.get("/api/guides")).json()).data.progress;
  await assessmentReason.press("Tab");
  await expect(helpControl).toBeInViewport({ ratio: 1 });
  await helpControl.click();
  const help = page.getByRole("dialog", { name: "Conferir o que chegou", exact: true });
  await expect(help).toContainText("A avaliação familiar registra se a necessidade foi atendida.");
  await help.getByRole("button", { name: "Voltar à tarefa", exact: true }).click();
  await expect(helpControl).toBeFocused();
  await expect(assessmentReason).toHaveValue(reason);
  expect(sql(`select count(*) from public.document_events where document_id=${q(ent.id)}`)).toBe(beforeHelp);
  expect((await (await page.request.get("/api/guides")).json()).data.progress).toEqual(beforeGuide);
  await receipt.getByRole("button", { name: "Confirmar recebimento", exact: true }).click();
  const requested = page.getByRole("dialog", { name: "Recebimento confirmado · revisão solicitada", exact: true });
  await expect(requested).toBeVisible();
  await requested.getByRole("button", { name: "Voltar à ficha", exact: true }).click();
  const movements = () => sql(`select count(*) from public.stock_movements where care_recipient_id=${q(f.patient)}`);
  const beforeReview = movements();
  const familyPage = await browser.newPage({
    baseURL: new URL(page.url()).origin, viewport: page.viewportSize() ?? undefined,
    isMobile: info.project.use.isMobile, hasTouch: info.project.use.hasTouch,
  });
  try {
    await openDelivery(familyPage, f.patient, req.id, family.email);
    await expect(familyPage.getByRole("region", { name: "Próximo passo sugerido", exact: true })).toContainText("Avaliar suficiência dos materiais");
    await selectDocumentSection(familyPage, "materials");
    await familyPage.getByRole("button", { name: "Detalhes de " + line.name_snapshot + " · Urgente", exact: true }).click();
    const material = familyPage.getByRole("dialog", { name: line.name_snapshot, exact: true });
    const assess = material.getByRole("button", { name: "Avaliar suficiência de " + line.name_snapshot, exact: true });
    await assess.click();
    const review = familyPage.getByRole("dialog", { name: "Reavaliar necessidade", exact: true });
    await expect(review).toContainText(reason);
    await expect(review).toContainText("5 unidade recebidos");
    await expect(review.getByRole("button", { name: "Integralmente", exact: true })).toHaveAttribute("aria-pressed", "true");
    await review.getByText("Avaliação e fichas de origem", { exact: true }).click();
    await expect(review.getByText("Integralmente suprida", { exact: true })).toBeVisible();
    const linked = review.getByRole("button", { name: ent.code!, exact: true });
    await linked.click();
    const reference = familyPage.getByRole("dialog", { name: ent.code!, exact: true });
    await reference.getByRole("button", { name: "Voltar à origem", exact: true }).click();
    if (info.project.use.hasTouch) for (const width of [360, 412]) {
      await familyPage.setViewportSize({ width, height: 844 });
      await expect(review.getByRole("button", { name: "Registrar avaliação", exact: true })).toBeInViewport();
      const path = info.outputPath(`reavaliacao-${width}.png`);
      await review.screenshot({ path, animations: "disabled", scale: "css" });
      await info.attach(`Motivo da equipe na reavaliação ${width} px`, { contentType: "image/png", path });
    }
    await review.getByRole("button", { name: "Parcialmente", exact: true }).click();
    await review.getByLabel("Justificativa da avaliação").fill("A família manterá o restante da requisição em aberto.");
    await review.getByRole("button", { name: "Registrar avaliação", exact: true }).click();
    const result = familyPage.getByRole("dialog", { name: "Avaliação registrada", exact: true });
    await expect(result).toContainText("Parcialmente suprida");
    await result.getByRole("button", { name: "Voltar à ficha", exact: true }).click();
    await expect(material).toBeVisible();
    await expect(assess).toBeFocused();
    expect(movements()).toBe(beforeReview);
    await expect(familyPage.getByRole("button", { name: "Ver decisão familiar", exact: true })).toHaveCount(0);
    await page.evaluate(() => window.dispatchEvent(new Event("hca:data-changed")));
    await page.getByRole("button", { name: "Ver decisão familiar", exact: true }).click();
    const response = page.getByRole("dialog", { name: "A família alterou o atendimento para parcial", exact: true });
    await expect(response.locator("del")).toContainText("Integral");
    await expect(response.locator("dd strong")).toContainText("Parcial");
    await expect(response).toContainText("A família manterá o restante da requisição em aberto.");
    await response.getByRole("button", { name: "Entendi", exact: true }).click();
    await expect(response).toHaveCount(0);

    await familyPage.goto("/fichas/" + ent.id);
    await selectDocumentSection(familyPage, "materials");
    await familyPage.getByRole("button", { name: "Rever atendimento de " + line.name_snapshot, exact: true }).click();
    const edit = familyPage.getByRole("dialog", { name: "Rever atendimento do item", exact: true });
    await expect(edit.getByRole("button", { name: "Parcialmente", exact: true })).toHaveAttribute("aria-pressed", "true");
    await edit.getByText("Avaliação e fichas de origem", { exact: true }).click();
    await expect(edit).toContainText("A família manterá o restante da requisição em aberto.");
    await edit.getByRole("button", { name: "Integralmente", exact: true }).click();
    await edit.getByLabel("Justificativa da avaliação").fill("A família conferiu que as cinco unidades atendem à necessidade.");
    await edit.getByRole("button", { name: "Registrar avaliação", exact: true }).click();
    await expect(result).toContainText("Integralmente suprida");
    await result.getByRole("button", { name: "Voltar à ficha", exact: true }).click();
    const saved = await rpc(f.admin, "operational_document", { p_id: ent.id }) as SupplyDocument;
    expect(saved.fulfillmentReviews?.map(entry => entry.decision)).toEqual(["partial", "complete"]);
    expect(Number(saved.lines[0].accepted_quantity)).toBe(5);
    expect(movements()).toBe(beforeReview);
  } finally {
    await familyPage.close();
  }
});

test("REQ mostra avaliação mantida e recupera a confirmação sem repetir o aviso na ENT", async ({ page }, info) => {
  const f = await setup(), req = await issue(f.patient, [f.products[0]]);
  const family = await actor("family", f.patient), team = await actor("professional", f.patient);
  const ent = await delivery(f.patient, req, [f.products[0]], { quantity: "5" }) as SupplyDocument;
  const [line] = ent.lines;
  const received = await rpc(team, "supply_document_command", {
    p_id: ent.id, p_action: "receive", p_key: randomUUID(), p_version: ent.version,
    p_body: { countedReceipt: { lines: [{ lineId: line.id, receivedQuantity: "5", reviewReason: "Conferência da suficiência das cinco unidades." }] } },
  });
  const response = await rpc(family, "review_request_fulfillment", {
    p_document: ent.id, p_line: line.id, p_key: randomUUID(), p_version: received.version,
    p_decision: "complete", p_reason: "",
  });
  await openDelivery(page, f.patient, req.id, fixtures.professional.email);
  const notice = page.getByRole("dialog", { name: "A família manteve o atendimento integral", exact: true });
  await expect(notice).toBeVisible();
  await expect(notice).toContainText(line.name_snapshot);
  await expect(notice).toContainText("Integral mantido");
  await expect(notice.locator("del")).toHaveCount(0);
  await audit(page, "L2 resposta da família");
  if (info.project.use.hasTouch) await info.attach("E04-15 avaliação mantida", {
    body: await notice.screenshot({ animations: "disabled", scale: "css" }), contentType: "image/png",
  });

  const endpoint = `/api/documents/${req.id}/fulfillment-review/awareness`;
  const bodies: unknown[] = [];
  await page.route("**" + endpoint, async route => {
    if (route.request().method() !== "POST") return route.continue();
    bodies.push(route.request().postDataJSON());
    const result = await route.fetch();
    expect(result.ok()).toBe(true);
    if (bodies.length === 1) return route.abort("failed");
    await route.fulfill({ response: result });
  });
  await notice.getByRole("button", { name: "Entendi", exact: true }).click();
  await expect(notice).toContainText("Ainda não foi possível confirmar seu registro");
  await notice.getByRole("button", { name: "Confirmar novamente", exact: true }).click();
  await expect(notice).toHaveCount(0);
  expect(bodies).toEqual([{ reviewId: response.reviewId }, { reviewId: response.reviewId }]);
  const loaded = page.waitForResponse(row => new URL(row.url()).pathname === `/api/documents/${ent.id}/fulfillment-review/awareness`);
  await page.goto(`/fichas/${ent.id}`);
  expect((await (await loaded).json()).data.notice).toBeNull();
  await expect(page.getByRole("button", { name: "Ver decisão familiar", exact: true })).toHaveCount(0);
});
