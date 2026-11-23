import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { remainingNeedFixture, physicalState, fixtures } from "../integration/remaining-need-fixtures.mjs";
import { rpc } from "../integration/v4-fixtures.mjs";
import { shiftWorker } from "../integration/shift-fixtures.mjs";
import { purchaseBalanceCommand, purchaseBalanceFacts, purchaseBalanceFixture } from "../integration/purchase-entry-balance-fixtures.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { selectContext } from "./auth-context";
import { selectDocumentSection } from "./document-sections";

test("E04-09 linked purchases and deliveries are consultable from the requisition header", async ({ page }, info) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  const f = await remainingNeedFixture();
  const purchase = await rpc(f.admin, "create_supply_document", {
    p_patient: f.patient, p_type: "COM", p_key: randomUUID(), p_draft: false,
    p_payload: {
      origin: "purchase",
      lines: [{ productId: f.products[0], quantity: "5" }],
      sources: [{ documentId: f.source.id, general: true, productIds: [] }],
    },
  });
  const unrelated = await rpc(f.admin, "create_supply_document", {
    p_patient: f.patient, p_type: "COM", p_key: randomUUID(), p_draft: false,
    p_payload: { origin: "purchase", lines: [{ productId: f.products[0], quantity: "5" }] },
  });
  const viewer = await shiftWorker(f.patient, "family");
  const before = physicalState(f);
  await page.goto("/login?next=" + encodeURIComponent(`/fichas/${f.source.id}`));
  await page.getByLabel("E-mail", { exact: true }).fill(viewer.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(url => url.pathname === `/fichas/${f.source.id}`);
  await expect(page.locator(".hca-workspace")).toHaveAttribute("data-context-patient", f.patient);

  const related = page.getByRole("region", { name: "Fichas relacionadas", exact: true });
  const buy = related.getByRole("button", { name: "Consultar compra " + purchase.code, exact: true });
  const delivery = related.getByRole("button", { name: "Consultar entrega " + f.ent.code, exact: true });
  await expect(buy).toBeVisible();
  await expect(delivery).toBeVisible();
  await expect(related.getByText(unrelated.code, { exact: true })).toHaveCount(0);
  await related.screenshot({ path: info.outputPath("fichas-relacionadas-req.png"), animations: "disabled", scale: "css" });

  for (const [trigger, code] of [[buy, purchase.code], [delivery, f.ent.code]] as const) {
    await trigger.click();
    const preview = page.getByRole("dialog", { name: code, exact: true });
    await expect(preview.getByRole("heading", { name: "Identificação do registro", exact: true })).toBeVisible();
    if (code === purchase.code) {
      await preview.getByRole("link", { name: "Abrir " + code, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`/fichas/${purchase.id}`));
      await page.getByRole("button", { name: "Voltar ao painel", exact: true }).click();
      await expect(preview.getByRole("heading", { name: "Identificação do registro", exact: true })).toBeVisible();
    }
    await preview.getByRole("button", { name: "Voltar à origem", exact: true }).click();
    await expect(trigger).toBeFocused();
  }
  await selectDocumentSection(page, "materials");
  await expect(page.getByRole("region", { name: "Dimensões independentes da requisição" })).toContainText("0/2 itens atendidos");
  expect(physicalState(f)).toBe(before);
});

test("material panel retains its linked consultation, search, and focus after a full document visit", async ({ page }, info) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 390, height: 620 });
  const f = await remainingNeedFixture();
  const viewer = await shiftWorker(f.patient);
  sql(`insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled)
    values(${q(f.patient)},${q(viewer.id)},'stock.family.read',false),
    (${q(f.patient)},${q(viewer.id)},'req.family_stock',false);`);
  const before = physicalState(f);
  await page.goto("/login?next=" + encodeURIComponent(`/fichas/${f.source.id}`));
  await page.getByLabel("E-mail", { exact: true }).fill(viewer.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(url => url.pathname === `/fichas/${f.source.id}`);
  await expect(page.locator(".hca-workspace")).toHaveAttribute("data-context-patient", f.patient);
  await selectDocumentSection(page, "materials");
  const search = page.getByRole("searchbox", { name: "Pesquisar material", exact: true });
  await search.fill("V4 0");
  const list = page.getByRole("list", { name: "Materiais requisitados", exact: true });
  await expect(list.getByRole("listitem")).toHaveCount(1);
  const material = list.getByRole("button", { name: /^Detalhes de Material fictício V4 0/ });
  await expect(material).toContainText("Informado na REQ");
  await material.click();
  const panel = page.getByRole("dialog", { name: "Material fictício V4 0", exact: true });
  await expect(panel.getByRole("tab", { name: /^Nesta ficha/ })).toHaveAttribute("aria-selected", "true");
  await expect(panel.getByRole("heading", { name: "Material nesta ficha", exact: true })).toBeVisible();
  await panel.getByRole("tab", { name: "Estoque", exact: true }).click();
  await expect(panel.getByRole("heading", { name: "Estoque atual", exact: true })).toBeVisible();
  await expect(panel.getByText("Equipe · disponível", { exact: true })).toBeVisible();
  await expect(panel.getByText("Família · disponível", { exact: true })).toHaveCount(0);
  const commitments = panel.getByRole("region", { name: "A receber", exact: true });
  await expect(commitments.getByText("Destino · Equipe", { exact: true })).toBeVisible();
  await expect(commitments.getByText("Compra para a família", { exact: true })).toHaveCount(0);
  await commitments.getByRole("button", { name: "Consultar fichas de entrega", exact: true }).click();
  await expect(panel.getByRole("tab", { name: "Fichas", exact: true })).toBeFocused();
  await expect(panel.getByRole("button", { name: "ENT", exact: true })).toHaveAttribute("aria-pressed", "true");
  await panel.getByRole("tab", { name: "Estoque", exact: true }).click();
  await expect(panel.getByText("Estoque informado nas requisições", { exact: true })).toBeVisible();
  await info.attach("painel-estoque", { body: await panel.screenshot({ animations: "disabled" }), contentType: "image/png" });
  const tabs = panel.getByRole("tablist", { name: "Consulta do material", exact: true });
  const footerAction = panel.getByRole("button", { name: "Voltar à ficha", exact: true });
  const viewport = page.viewportSize()!;
  await page.setViewportSize({ ...viewport, height: 420 });
  const tabsBefore = await tabs.boundingBox();
  const footerBefore = await footerAction.boundingBox();
  const scroll = panel.getByRole("region", { name: "Conteúdo de Material fictício V4 0", exact: true });
  await scroll.evaluate(element => { element.scrollTop = element.scrollHeight; });
  await expect.poll(() => scroll.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
  expect(await tabs.boundingBox()).toEqual(tabsBefore);
  expect(await footerAction.boundingBox()).toEqual(footerBefore);
  await page.setViewportSize(viewport);
  await panel.getByRole("tab", { name: "Histórico", exact: true }).click();
  await expect(panel.getByRole("heading", { name: "Movimentações e decisões", exact: true })).toBeVisible();
  await expect(panel.getByRole("button", { name: f.ent.code, exact: true }).first()).toBeVisible();
  const operations = panel.locator("details[data-stock-act]").filter({ hasText: f.ent.code });
  await expect.poll(() => operations.count()).toBeGreaterThan(1);
  const operation = operations.first();
  const summary = operation.locator("summary");
  await summary.click();
  await expect(operation).toHaveAttribute("open", "");
  const effect = operation.getByRole("button", { name: "Consultar origem · Material fictício V4 0", exact: true }).first();
  await effect.click();
  const origin = page.getByRole("dialog", { name: "Origem da movimentação", exact: true });
  await expect(origin.getByText("Saldo anterior", { exact: true })).toBeVisible();
  await expect(origin.getByText("Saldo posterior", { exact: true })).toBeVisible();
  await origin.press("Escape");
  await expect(origin).toHaveCount(0);
  await expect(effect).toBeFocused();
  await expect(operation).toHaveAttribute("open", "");
  await panel.getByRole("tab", { name: "Fichas", exact: true }).click();
  const movements = panel.getByRole("region", { name: "Aquisição e movimentação", exact: true });
  const link = movements.getByRole("button", { name: f.ent.code, exact: true });
  await expect(link).toContainText("Entrega de materiais");
  await expect(link).toHaveAccessibleDescription(/Entrega de materiais.*Divergência pendente/);
  await expect(panel.getByRole("region", { name: "Histórico arquivado", exact: true })).toHaveCount(0);
  const kinds = panel.getByRole("navigation", { name: "Tipos de ficha relacionada" });
  await kinds.getByRole("button", { name: "COM", exact: true }).click();
  await expect(link).toHaveCount(0);
  await kinds.getByRole("button", { name: "ENT", exact: true }).click();
  await expect(link).toBeVisible();
  await panel.getByRole("button", { name: "Buscar fichas vinculadas", exact: true }).click();
  const code = panel.getByRole("searchbox", { name: "Número da ficha", exact: true });
  await code.fill("ENT-SEM-RESULTADO");
  await code.press("Enter");
  await expect(panel.getByText("Nenhuma ficha corresponde aos filtros.", { exact: true })).toBeVisible();
  await code.fill(f.ent.code);
  await code.press("Enter");
  await expect(link).toBeVisible();
  await panel.screenshot({ path: info.outputPath("fichas-relacionadas.png"), scale: "css", animations: "disabled" });
  await link.click();
  const preview = page.getByRole("dialog", { name: f.ent.code, exact: true });
  await expect(preview.getByRole("heading", { name: "Identificação do registro", exact: true })).toBeVisible();
  await expect(preview.getByText("Registrado por", { exact: true })).toBeVisible();
  await expect(preview.getByRole("heading", { name: "Quantidades da movimentação", exact: true })).toBeVisible();
  await expect(preview).toContainText("Material fictício V4 0");
  await preview.screenshot({ path: info.outputPath("previa-entre-fichas.png"), scale: "css", animations: "disabled" });
  const destinationSummary = `**/api/documents/${f.ent.id}/materials`;
  await page.route(destinationSummary, route => route.fulfill({
    status: 503, json: { code: "DATABASE_UNAVAILABLE", message: "Saldo temporariamente indisponível." },
  }));
  await preview.getByRole("link", { name: "Abrir " + f.ent.code, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/fichas/${f.ent.id}`));
  await expect(page.getByRole("tab", { name: "Visão geral", exact: true })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Materiais", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByText("O saldo atual não pôde ser consultado.", { exact: true })).toBeVisible();
  const destination = page.getByRole("button", { name: /^Detalhes de Material fictício V4 0/ });
  await expect(destination).toHaveAttribute("data-visit-material", "true");
  await expect(destination).toBeFocused();
  await page.getByRole("button", { name: "Voltar ao painel", exact: true }).click();
  await expect(preview).toBeVisible();
  await preview.getByRole("button", { name: "Voltar ao material", exact: true }).click();
  await expect(kinds.getByRole("button", { name: "ENT", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(code).toHaveValue(f.ent.code.toLowerCase());
  await expect(panel.getByRole("tab", { name: "Fichas", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(link).toBeFocused();
  await page.unroute(destinationSummary);
  await panel.getByRole("button", { name: "Voltar à ficha", exact: true }).click();
  await expect(search).toHaveValue("V4 0");
  await expect(material).toBeFocused();
  await page.goto(`/fichas/${f.ent.id}`);
  await expect(page.getByRole("tab", { name: "Visão geral", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Voltar ao painel", exact: true })).toHaveCount(0);
  expect(physicalState(f)).toBe(before);
});

test("material history shows a correction and a separate arrival, then returns to the exact entry", async ({ page }, info) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 700 });
  const f = await purchaseBalanceFixture();
  const viewer = await shiftWorker(f.patient, "family");
  const line = f.document.lines.find((item: { product_id: string }) => item.product_id === f.products[0]);
  const pending = await purchaseBalanceCommand(f.family, f.document, "receive", {
    lines: [{ lineId: line.id, quantity: "4", expectedQuantity: "6", remainingAction: "wait" }],
  });
  const reason = "Confira as unidades de cada embalagem.";
  const correction = await purchaseBalanceCommand(f.admin, pending, "request_receipt_correction", {
    receiptId: pending.receipts[0].id, reason,
  });
  const { result: arrival } = await rpc(viewer.client, "unlinked_arrival_command", {
    p_patient: f.patient, p_key: randomUUID(), p_body: { origin: "gift", lines: [{ productId: line.product_id, quantity: "2" }] },
  });
  const before = purchaseBalanceFacts(f);
  await page.goto("/login?next=" + encodeURIComponent(`/fichas/${f.document.id}`));
  await page.getByLabel("E-mail", { exact: true }).fill(viewer.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(url => url.pathname === `/fichas/${f.document.id}`);
  await expect(page.locator(".hca-workspace")).toHaveAttribute("data-context-patient", f.patient);
  await selectDocumentSection(page, "materials");
  const material = page.getByRole("button", { name: "Detalhes de Material fictício V4 0", exact: true });
  await expect(material).toHaveAccessibleDescription(/Correção solicitada.*Chegou \/ entrou 4 \/ 0/);
  await expect(material).toContainText(reason);
  await material.screenshot({ path: info.outputPath("material-com-correcao.png"), animations: "disabled", scale: "css" });
  await material.click();
  const panel = page.getByRole("dialog", { name: "Material fictício V4 0", exact: true });
  const history = panel.getByRole("tab", { name: "Histórico", exact: true });
  await history.click();
  const correctionEntry = panel.getByRole("listitem").filter({ hasText: reason });
  await expect(correctionEntry).toContainText("Correção solicitada");
  await expect(correctionEntry).toContainText("4 unidade");
  await expect(correctionEntry).toContainText(correction.receipts[0].corrections[0].requesterName);
  const arrivalEntry = panel.getByRole("listitem").filter({ hasText: "Chegada avulsa informada" });
  const arrivalLink = arrivalEntry.getByRole("link", { name: arrival.code, exact: true });
  await expect(arrivalLink).toBeVisible();
  await info.attach("historico-do-material", { body: await panel.screenshot({ animations: "disabled" }), contentType: "image/png" });
  await arrivalLink.click();
  const arrivalDetails = page.getByRole("dialog", { name: "Detalhes da chegada", exact: true });
  await expect(arrivalDetails).toContainText(arrival.code);
  await expect(arrivalDetails).toContainText("Recebidas: 2 unidade");
  await arrivalDetails.getByRole("button", { name: "Voltar ao painel", exact: true }).click();
  await expect(history).toHaveAttribute("aria-selected", "true");
  await expect(arrivalLink).toBeFocused();
  expect(purchaseBalanceFacts(f)).toBe(before);
  await panel.getByRole("button", { name: "Voltar à ficha", exact: true }).click();

  const resubmitted = await purchaseBalanceCommand(f.family, correction, "resubmit_receipt", {
    receiptId: pending.receipts[0].id, lines: [{ lineId: line.id, quantity: "5", expectedQuantity: "6", remainingAction: "wait" }],
  });
  await page.reload();
  await selectDocumentSection(page, "materials");
  await expect(material).toHaveAccessibleDescription(/Aguardando nova aprovação.*Chegou \/ entrou 5 \/ 0/);
  await expect(material).toContainText("Motivo da correção anterior: " + reason);
  const refusal = "A parcela informada ainda não chegou.";
  await purchaseBalanceCommand(f.admin, resubmitted, "reject_receipt", { receiptId: pending.receipts[0].id, reason: refusal });
  await page.reload();
  await selectDocumentSection(page, "materials");
  await expect(material).toHaveAccessibleDescription(/Chegada recusada.*Chegou \/ entrou 0 \/ 0/);
  await expect(material).toContainText(refusal);
  expect(JSON.parse(purchaseBalanceFacts(f)).stock).toEqual(JSON.parse(before).stock);
});

test("catalogue consultation preserves a requisition edit through a full linked document and opens from stock", async ({ page }, info) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 740 });
  const f = await remainingNeedFixture();
  const before = physicalState(f);
  const writer = await shiftWorker(f.patient);
  await page.goto("/login?next=%2Ffichas%2Freq");
  await page.getByLabel("E-mail", { exact: true }).fill(writer.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(url => url.pathname === "/fichas/req");
  await expect(page.locator(".hca-workspace")).toHaveAttribute("data-context-patient", f.patient);
  const next = page.getByRole("button", { name: "Selecionar materiais", exact: true });
  await next.click();
  const categories = page.getByRole("navigation", { name: "Tipos de material" });
  await expect(categories.getByRole("button", { name: /^Higiene/, pressed: true })).toBeVisible();
  const search = page.getByLabel("Buscar material", { exact: true });
  await search.fill("V4 0");
  const selection = page.getByRole("checkbox", { name: /Material fictício V4 0/ });
  await expect(selection).toHaveCSS("width", "32px");
  await expect(selection).toHaveCSS("height", "19px");
  await selection.click();
  const duplicate = page.getByRole("dialog", { name: "Este produto já está em uma requisição pendente" });
  await duplicate.getByLabel("Justificativa da nova requisição", { exact: true }).fill("Contagem fictícia ainda necessária para esta residência.");
  await duplicate.getByRole("button", { name: "Manter nova requisição", exact: true }).click();
  const amount = page.getByLabel("Estoque atual · unidade", { exact: true });
  const unknown = page.getByRole("checkbox", { name: "Não sei informar", exact: true });
  await unknown.check();
  await expect(amount).toBeDisabled();
  await unknown.uncheck();
  await amount.fill("9");
  const opener = page.getByRole("button", { name: "Mais ações de Material fictício V4 0", exact: true });
  await opener.scrollIntoViewIfNeeded();
  if (info.project.use.hasTouch) await info.attach("E04-01 material selecionado", {
    body: await page.locator(".hca-wizard-material").filter({ has: opener }).screenshot({ scale: "css", animations: "disabled" }),
    contentType: "image/png",
  });
  const sourceScroll = await page.evaluate(() => window.scrollY);
  await opener.click();
  await page.getByRole("menuitem", { name: "Detalhes do material", exact: true }).click();
  const consultation = page.getByRole("dialog", { name: "Material fictício V4 0", exact: true });
  const linksTab = consultation.getByRole("tab", { name: "Fichas", exact: true });
  await linksTab.click();
  const requests = consultation.getByRole("region", { name: "Requisições em acompanhamento", exact: true });
  const requestLink = requests.getByRole("button", { name: f.sourceDoc.code, exact: true });
  await requestLink.click();
  const requestPreview = page.getByRole("dialog", { name: f.sourceDoc.code, exact: true });
  await expect(requestPreview.getByRole("heading", { name: "Identificação do registro", exact: true })).toBeVisible();
  await expect(requestPreview.getByText("Estoque da equipe informado", { exact: true }).first()).toBeVisible();
  await requestPreview.getByRole("button", { name: "Voltar ao material", exact: true }).click();
  await expect(requestLink).toBeFocused();
  const reference = consultation.getByRole("button", { name: f.ent.code, exact: true });
  await reference.click();
  const preview = page.getByRole("dialog", { name: f.ent.code, exact: true });
  const fullLink = preview.getByRole("link", { name: "Abrir " + f.ent.code, exact: true });
  await fullLink.click();
  const full = page.getByRole("dialog", { name: f.ent.code, exact: true });
  await expect(full.getByRole("tab", { name: "Materiais", exact: true })).toHaveAttribute("aria-selected", "true");
  await full.getByRole("tab", { name: "Andamentos", exact: true }).click();
  await expect(full.getByRole("tabpanel", { name: "Andamentos", exact: true })).toBeVisible();
  await info.attach("ficha-completa-na-edicao", { body: await full.screenshot({ animations: "disabled" }), contentType: "image/png" });
  await full.getByRole("button", { name: "Voltar ao painel", exact: true }).click();
  await expect(fullLink).toBeFocused();
  await preview.getByRole("button", { name: "Voltar ao material", exact: true }).click();
  await expect(linksTab).toHaveAttribute("aria-selected", "true");
  await expect(reference).toBeFocused();
  await consultation.getByRole("button", { name: "Voltar ao preenchimento", exact: true }).click();
  await expect(opener).toBeFocused();
  await expect(search).toHaveValue("V4 0");
  await expect(selection).toBeChecked();
  await expect(amount).toHaveValue("9");
  // Chromium emulado pode arredondar a mesma posição por um pixel CSS.
  await expect.poll(async () => Math.abs(await page.evaluate(() => window.scrollY) - sourceScroll)).toBeLessThanOrEqual(1);
  await page.goto(`/estoque?careRecipientId=${f.patient}&custody=CARE_TEAM`);
  const stockOpener = page.getByRole("button", { name: "Consultar Material fictício V4 0 · Equipe", exact: true });
  await stockOpener.click();
  const stock = page.getByRole("dialog", { name: "Material fictício V4 0", exact: true });
  await expect(stock.getByRole("heading", { name: "A receber", exact: true })).toBeVisible();
  await expect(stock.getByRole("heading", { name: "Consumo no período", exact: true })).toBeVisible();
  await expect(stock.getByRole("heading", { name: "Equipe", exact: true })).toBeVisible();
  await expect(stock.getByRole("region", { name: "A receber", exact: true })
    .getByText("Destino · Equipe", { exact: true })).toBeVisible();
  await expect(stock.getByRole("tab", { name: /^Nesta ficha/ })).toHaveCount(0);
  await stock.getByRole("tab", { name: "Histórico", exact: true }).click();
  await expect(stock.getByText("Recebimento conferido", { exact: true })).toBeVisible();
  await stock.getByRole("button", { name: "Voltar ao estoque", exact: true }).click();
  await expect(stockOpener).toBeFocused();
  expect(physicalState(f)).toBe(before);
});

test("catalogue consultation from a purchase keeps the quantity when using browser Back", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 740 });
  const f = await purchaseBalanceFixture();
  const { result: arrival } = await rpc(f.family, "unlinked_arrival_command", {
    p_patient: f.patient, p_key: randomUUID(),
    p_body: { origin: "gift", lines: [{ productId: f.products[0], quantity: "2" }] },
  });
  const before = purchaseBalanceFacts(f);
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(fixtures.family.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await selectContext(page, f.patient);
  await page.goto("/fichas/com");
  const next = page.getByRole("button", { name: "Selecionar materiais", exact: true });
  await next.click();
  const categories = page.getByRole("navigation", { name: "Tipos de material" });
  await expect(categories.getByRole("button", { name: /^Higiene/, pressed: true })).toBeVisible();
  await page.getByRole("checkbox", { name: /^Material fictício V4 0/ }).check();
  const amount = page.getByLabel("Quantidade — Material fictício V4 0", { exact: true });
  await amount.fill("4");
  const options = page.getByRole("button", { name: "Mais ações de Material fictício V4 0", exact: true });
  await options.click();
  await page.getByRole("menuitem", { name: "Detalhes do material", exact: true }).click();
  const panel = page.getByRole("dialog", { name: "Material fictício V4 0", exact: true });
  await panel.getByRole("tab", { name: "Fichas", exact: true }).click();
  await panel.getByRole("button", { name: f.document.code, exact: true }).click();
  const preview = page.getByRole("dialog", { name: f.document.code, exact: true });
  await preview.getByRole("link", { name: "Abrir " + f.document.code, exact: true }).click();
  await expect(page.getByRole("button", { name: "Voltar ao painel", exact: true })).toBeVisible();
  await expect(preview.getByRole("tab", { name: "Materiais", exact: true })).toHaveAttribute("aria-selected", "true");
  await page.goBack();
  await expect(preview.getByRole("link", { name: "Abrir " + f.document.code, exact: true })).toBeFocused();
  await preview.getByRole("button", { name: "Voltar ao material", exact: true }).click();
  await panel.getByRole("tab", { name: "Histórico", exact: true }).click();
  const arrivalLink = panel.getByRole("link", { name: arrival.code, exact: true });
  await arrivalLink.click();
  const arrivalDetails = page.getByRole("dialog", { name: arrival.code, exact: true });
  await expect(arrivalDetails).toContainText("Recebidas: 2 unidade");
  await arrivalDetails.getByRole("button", { name: "Voltar ao painel", exact: true }).click();
  await expect(arrivalLink).toBeFocused();
  await panel.getByRole("button", { name: "Voltar ao preenchimento", exact: true }).click();
  await expect(options).toBeFocused();
  await expect(amount).toHaveValue("4");
  expect(purchaseBalanceFacts(f)).toBe(before);
});
