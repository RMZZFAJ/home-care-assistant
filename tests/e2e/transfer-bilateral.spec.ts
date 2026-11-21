import { expectNoOperationalDocumentAction, openOperationalDocumentAction } from "./document-sections";
import { selectDocumentSection, openDocumentAction } from "./document-sections";
import { generatedPdf } from "./generated-pdf";
import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import {
  declareTransfer,
  transferFixture,
  transferCommand,
  transferState,
  rpc,
} from "../integration/transfer-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";
import { audit } from "./accessibility-audit";
import type { SupplyDocument } from "../../src/types/documents";

test.setTimeout(180_000);
async function login(page: Page, email: string, patient: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Visão geral", exact: true }),
  ).toBeVisible();
  await selectContext(page, patient);
}
async function fillDeclaration(
  page: Page,
  f: Awaited<ReturnType<typeof transferFixture>>,
  info?: TestInfo,
) {
  await page.goto("/fichas/" + f.origin.id);
  await openOperationalDocumentAction(page, "Preparar devolução");
  await expect(page).toHaveURL(new RegExp("/fichas/devolucao\\?.*originId=" + f.origin.id));
  await expect(page.getByRole("button", { name: "Preparar devolução", exact: true })).toHaveCount(0);
  const drawer = page.getByRole("region", {
    name: "Nova devolução",
    exact: true,
  });
  await expect(drawer.getByRole("combobox", { name: /^Contraparte para concordância/ })).toHaveCount(0);
  await selectReturnRecipient(page, f.recipient.id, "Quem vai receber tem disponibilidade para a conferência.");
  const generalSources = drawer.getByRole("region", { name: "Fichas vinculadas", exact: true });
  await expect(generalSources).toContainText(f.origin.code!);
  await generalSources.getByRole("button", { name: "Alterar", exact: true }).click();
  const sources = page.getByRole("dialog", { name: "Vincular fichas", exact: true });
  await expect(sources.getByRole("checkbox", { name: "Vincular " + f.origin.code, exact: true })).toBeChecked();
  await expect(sources.getByRole("checkbox", { name: /^Importar materiais/ })).toBeChecked();
  await sources.getByRole("button", { name: "Aplicar vínculos", exact: true }).click();
  await drawer.getByRole("button", { name: "Selecionar materiais", exact: true }).click();
  await drawer.getByRole("button", { name: /^Higiene/ }).click();
  const amount = drawer.getByRole("textbox", { name: /^Quantidade de Material fictício V4 0/ });
  await expect(amount).toHaveValue("10");
  if (info) await convertReturnQuantity(page, drawer, info);
  else await amount.fill("5");
  await expect(amount).toHaveValue("5");
  const menu = drawer.getByRole("button", { name: "Mais ações de Material fictício V4 0", exact: true });
  await menu.click();
  await page.getByRole("menuitem", { name: "Vincular a uma ficha", exact: true }).click();
  const materialSources = page.getByRole("dialog", { name: "Vincular este material", exact: true });
  await expect(materialSources.getByRole("checkbox", { name: "Vincular " + f.origin.code, exact: true })).toBeChecked();
  await materialSources.getByRole("button", { name: "Aplicar vínculos", exact: true }).click();
  await expect(menu).toBeFocused();
  await expect(amount).toHaveValue("5");
  if (info?.project.use.hasTouch) await info.attach("DEV · material com vínculo", {
    body: await page.screenshot({ animations: "disabled", scale: "css" }), contentType: "image/png",
  });
  await drawer.getByRole("button", { name: "Continuar", exact: true }).click();
  await drawer.getByRole("button", { name: "Continuar", exact: true }).click();
  await drawer.getByRole("button", { name: "Adicionar observação", exact: true }).click();
  await drawer
    .getByLabel("Observação 1", { exact: true })
    .fill(
      "Devolução física de cinco unidades, com Bruno como recebedor pessoal.",
    );
  return drawer;
}

async function convertReturnQuantity(page: Page, drawer: Locator, info: TestInfo) {
  const read = drawer.getByRole("button", { name: "Ler código", exact: true });
  await read.click();
  const scanner = page.getByRole("dialog", { name: "Ler código", exact: true });
  const manualCode = scanner.getByRole("textbox", { name: "Código manual", exact: true });
  await manualCode.fill("12345678");
  await scanner.getByRole("button", { name: "Identificar", exact: true }).click();
  const unknownCode = page.getByRole("dialog", { name: "Código não cadastrado", exact: true });
  await expect(unknownCode.getByRole("button", { name: "Selecionar na lista", exact: true })).toBeVisible();
  await unknownCode.getByRole("button", { name: "Tentar outro código", exact: true }).click();
  await manualCode.fill("0123456789012");
  await scanner.getByRole("button", { name: "Identificar", exact: true }).click();
  const conversion = scanner.getByRole("region", { name: "Conversão da apresentação", exact: true });
  await expect(conversion).toContainText("Caixa fictícia para devolução · 3 unidade");
  await expect(conversion).toContainText("Estoque atual da equipe: 10 unidade");
  await expect(conversion.getByLabel("Quantidade lida", { exact: true })).toHaveCount(0);
  await conversion.getByRole("button", { name: "Corrigir", exact: true }).click();
  await conversion.getByLabel("Quantidade lida", { exact: true }).fill("4");
  const applyQuantity = scanner.getByRole("button", { name: "Atualizar quantidade", exact: true });
  await expect(applyQuantity).toBeDisabled();
  await expect(conversion.getByText("A quantidade excede o estoque disponível para devolução.", { exact: true })).toBeVisible();
  const presentation = conversion.getByRole("combobox", { name: "Tipo de apresentação", exact: true });
  const factor = conversion.getByLabel("Unidades por apresentação", { exact: true });
  await presentation.selectOption({ label: "Caixa" });
  await expect(factor).toHaveValue("");
  await expect(applyQuantity).toBeDisabled();
  await presentation.selectOption({ label: "Par" });
  await expect(factor).toHaveValue("2");
  await expect(conversion).toContainText("8 unidade");
  await conversion.getByRole("checkbox", { name: "Corrigir o total convertido", exact: true }).check();
  const finalQuantity = conversion.getByLabel("Total corrigido em unidade", { exact: true });
  await finalQuantity.fill("5");
  await finalQuantity.scrollIntoViewIfNeeded();
  if (info.project.use.hasTouch) await expect(finalQuantity).toBeInViewport({ ratio: 1 });
  if (info.project.use.hasTouch) await info.attach("DEV · conferência da conversão", {
    body: await page.screenshot({ animations: "disabled", scale: "css" }), contentType: "image/png",
  });
  await applyQuantity.click();
  await expect(read).toBeFocused();
}
test("devolução separa expedidor e recebedor, recupera expedição incerta com perda de escrita e recebe três de cinco de material inativo", async ({
  page,
  browser,
}, info) => {
  if (!process.env.CI && info.project.name === "ios") test.setTimeout(300_000);
  const f = await transferFixture(),
    before = JSON.parse(transferState(f));
  await rpc(f.admin, "configure_catalogue_unit", {
    p_patient: f.patient, p_product: f.products[0], p_unit: "unidade", p_decimals: 0,
    p_barcode: "0123456789012", p_presentation: "Caixa fictícia para devolução", p_base_quantity: "3",
  });
  sql(
    `update public.care_recipient_products set is_active=false where care_recipient_id=${sqlLiteral(f.patient)} and product_id=${sqlLiteral(f.products[0])};`,
  );
  await login(page, f.initiator.email, f.patient);
  const denied = await page.request.get(
    `/api/stock/balances?careRecipientId=${f.patient}&custody=FAMILY`,
  );
  expect(denied.status()).toBe(200);
  const stock = await denied.json();
  expect(
    stock.data.every((row: { location: string }) => row.location !== "FAMILY"),
  ).toBe(true);
  expect(
    stock.overview.every((row: { family: unknown }) => row.family === null),
  ).toBe(true);
  expect(
    stock.metrics.every(
      (row: { location: string }) => row.location !== "FAMILY",
    ),
  ).toBe(true);
  const editor = await fillDeclaration(page, f, info);
  await editor
    .getByRole("button", { name: "Revisar ficha", exact: true })
    .click();
  const review = editor;
  await expect(review.getByText("5 unidade · Inativo com saldo", { exact: true })).toBeVisible();
  const packets: unknown[] = [];
  let document: SupplyDocument | undefined;
  await page.route("**/api/transfers", async (route) => {
    packets.push(route.request().postDataJSON());
    const response = await route.fetch();
    expect(response.ok()).toBe(true);
    document = (await response.json()).data;
    if (packets.length === 1) {
      sql(
        `update public.capability_overrides set enabled=false where care_recipient_id=${sqlLiteral(f.patient)} and subject_user=${sqlLiteral(f.initiator.id)} and capability='ent.create';`,
      );
      await route.abort("failed");
    } else await route.fulfill({ response });
  });
  await review
    .getByRole("button", {
      name: "Expedir devolução",
      exact: true,
    })
    .click();
  const recovery = page.getByRole("dialog", { name: "Resultado ainda não confirmado", exact: true });
  await expect(recovery).toBeVisible();
  expect(JSON.parse(transferState(f)).ledger).toHaveLength(before.ledger.length + 1);
  await recovery.getByRole("button", { name: "Consultar resultado", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Devolução expedida", exact: true }),
  ).toBeVisible({ timeout: 60_000 }); // The initial PDF route also has a 60-second budget.
  expect(packets).toHaveLength(1);
  expect(document!.code).toMatch(/^DEV-/);
  expect(document!.status).toBe("pending_receipt");
  expect(document!.transfer?.agreement).toBeNull();
  expect(document!.transfer?.declaration.actor.id).toBe(f.initiator.id);
  expect(document!.originDocuments).toMatchObject([{ documentId: f.origin.id, general: true, productIds: [f.products[0]] }]);
  await page.unroute("**/api/transfers");
  await page
    .getByRole("button", {
      name: "Acompanhar ficha",
      exact: true,
    })
    .click();
  await selectDocumentSection(page, "materials");
  const id = document!.id;
  await expect(page.getByText("Expedido", { exact: true })).toBeVisible();
  await selectDocumentSection(page, "workflow");
  await expect(
    page.getByRole("heading", {
      name: "Atos da devolução de materiais",
      exact: true,
    }),
  ).toBeVisible();
  sql(
    `update public.capability_overrides set enabled=true where care_recipient_id=${sqlLiteral(f.patient)} and subject_user=${sqlLiteral(f.initiator.id)} and capability='ent.create';`,
  );
  const baseURL = new URL(page.url()).origin;
  const anaContext = await browser.newContext({ baseURL });
  try {
    const ana = await anaContext.newPage();
    await login(ana, f.counterparty.email, f.patient);
    await ana.goto("/entregas");
    await expect(ana.locator(`[data-delivery-id="${id}"]`)).toHaveCount(0);
    await ana.goto("/documentos/" + id);
    await selectDocumentSection(ana, "workflow");
    await expect(ana.getByRole("button", { name: "Concordar com a transferência", exact: true })).toHaveCount(0);
    await expectNoOperationalDocumentAction(ana, "Conferir recebimento");
    expect(JSON.parse(transferState(f)).ledger.length).toBe(
      before.ledger.length + 1,
    );
  } finally {
    await anaContext.close();
  }
  await expectNoOperationalDocumentAction(page, "Trocar recebedor");
  await page.close();
  const brunoContext = await browser.newContext({ baseURL });
  try {
    const bruno = await brunoContext.newPage();
    await bruno.bringToFront();
    await login(bruno, f.recipient.email, f.patient);
    await bruno.goto("/entregas");
    const receiptTask = bruno.locator(`[data-delivery-id="${id}"]`);
    await expect(receiptTask).toContainText("Conferir meu recebimento");
    await receiptTask.getByRole("link", { name: "Conferir", exact: true }).click();
    await expect(bruno.getByRole("heading", { name: document!.code!, exact: true })).toBeVisible();
    await expect(bruno.locator(".hca-activity-overlay")).toHaveCount(0);
    await expect(bruno.getByRole("tab", { name: "Materiais", exact: true })).toHaveAttribute("aria-selected", "true");
    await openDocumentAction(bruno, "Informar divergência");
    await bruno
      .getByRole("checkbox", { name: /Material fictício V4 0.*expedido/ })
      .check();
    await bruno
      .getByRole("textbox", { name: "Efetivamente recebido", exact: true })
      .fill("3");
    await bruno
      .getByRole("textbox", { name: "Observações da divergência", exact: true })
      .fill("Bruno recebeu pessoalmente somente três das cinco unidades.");
    await bruno
      .getByRole("button", { name: "Revisar operação", exact: true })
      .click();
    await bruno
      .getByRole("button", { name: "Confirmar operação", exact: true })
      .click();
    await expect(
      bruno.getByText(
        "Operação confirmada e registrada na ficha. Consulte os eventos e as notificações para acompanhar o processamento.",
        { exact: true },
      ),
    ).toBeVisible();
    const received = (
      await (await bruno.request.get("/api/documents/" + id)).json()
    ).data as SupplyDocument;
    expect(received.status).toBe("disputed");
    expect(received.workflow_data.acceptedBy).toBe(f.recipient.id);
    expect(received.transfer?.agreement).toBeNull();
    expect(Number(received.lines[0].accepted_quantity)).toBe(3);
    expect(
      Number(
        sql(
          `select private.stock_quantity(${sqlLiteral(f.patient)},${sqlLiteral(f.products[0])},'CARE_TEAM');`,
        ),
      ),
    ).toBe(5);
    expect(
      Number(
        sql(
          `select private.stock_quantity(${sqlLiteral(f.patient)},${sqlLiteral(f.products[0])},'FAMILY');`,
        ),
      ),
    ).toBe(23);
    expect(
      Number(
        sql(
          `select private.stock_quantity(${sqlLiteral(f.patient)},${sqlLiteral(f.products[0])},'TRANSIT');`,
        ),
      ),
    ).toBe(2);
    await expect(bruno.locator(".hca-activity-overlay")).toHaveCount(0);
    for (const width of [320, 390, 768, 1440]) {
      await bruno.setViewportSize({ width, height: 900 });
      await audit(bruno, `transfer-direct-receipt-${width}`);
    }
    if (info.project.use.hasTouch) {
      await bruno.setViewportSize({ width: 320, height: 520 });
      const toolbar = bruno.getByRole("group", { name: "Ações da ficha", exact: true });
      const pdfButton = toolbar.getByRole("button", { name: "Gerar PDF", exact: true });
      const resolveButton = toolbar.getByRole("button", { name: "Conciliar divergência", exact: true });
      const fab = bruno.locator(".hca-document-fab");
      await pdfButton.scrollIntoViewIfNeeded();
      const fabPosition = (await fab.boundingBox())!;
      await pdfButton.evaluate((element, y) => {
        const box = element.getBoundingClientRect();
        window.scrollBy({ top: box.top + box.height / 2 - y, behavior: "instant" });
      }, fabPosition.y + fabPosition.height / 2);
      await expect.poll(async () => {
        const pdf = (await pdfButton.boundingBox())!;
        const resolve = (await resolveButton.boundingBox())!;
        const trigger = (await fab.boundingBox())!;
        return {
          pdfSharesHeight: pdf.y < trigger.y + trigger.height && trigger.y < pdf.y + pdf.height,
          actionsClear: Math.max(pdf.x + pdf.width, resolve.x + resolve.width) < trigger.x,
        };
      }).toEqual({ pdfSharesHeight: true, actionsClear: true });
      await pdfButton.click({ trial: true });
      await info.attach("DEV · ações e botão flutuante a 320 px", {
        body: await bruno.screenshot({ animations: "disabled", scale: "css" }), contentType: "image/png",
      });
      await fab.press("Enter");
      const menu = bruno.getByRole("menu", { name: "Ações operacionais", exact: true });
      await expect(menu).toBeInViewport({ ratio: 1 });
      const popup = (await menu.boundingBox())!;
      const trigger = (await fab.boundingBox())!;
      expect(popup.y + popup.height).toBeLessThan(trigger.y);
      await menu.press("Escape");
      await expect(fab).toBeFocused();
    }
    mkdirSync("output/playwright/phase-d", { recursive: true });
    await bruno.setViewportSize({ width: 320, height: 900 });
    await bruno.screenshot({
      path: `output/playwright/phase-d/transfer-${id}-${info.project.name}.png`,
      fullPage: true,
    });
    mkdirSync("output/pdf/phase-d", { recursive: true });
    const base = `output/pdf/phase-d/transfer-${id}-v${received.version}`;
    const pdf = await generatedPdf(
      bruno,
      `/api/documents/${id}/pdf?version=${received.version}`,
    );
    expect(pdf.ok()).toBe(true);
    const bytes = await pdf.body();
    writeFileSync(base + ".pdf", bytes);
    writeFileSync(
      base + "-source.json",
      JSON.stringify(
        {
          document: received,
          before,
          after: JSON.parse(transferState(f)),
          sha256: createHash("sha256").update(bytes).digest("hex"),
        },
        null,
        2,
      ),
    );
    writeFileSync(
      base + "-database.json",
      sql(
        `select jsonb_build_object('document',(select to_jsonb(d) from public.operational_documents d where id=${sqlLiteral(id)}),'events',(select jsonb_agg(to_jsonb(e) order by version) from public.document_events e where document_id=${sqlLiteral(id)}),'renders',(select jsonb_agg(to_jsonb(r)) from private.pdf_issuances r where state='ready' and document_id=${sqlLiteral(id)}));`,
      ),
    );
    expect(
      (await bruno.request.get(`/api/documents/${id}/pdf?version=1`)).status(),
    ).toBe(400);
  } finally {
    await brunoContext.close();
  }
});

test("conflitos preservam a expedição, exigem adoção explícita e não reabrem o encerramento legado", async ({
  page,
}) => {
  const f = await transferFixture();
  const officialPosts: unknown[] = [];
  page.on("request", (request) => {
    if (
      new URL(request.url()).pathname === "/api/transfers" &&
      request.method() === "POST"
    )
      officialPosts.push(request.postDataJSON());
  });
  await login(page, f.initiator.email, f.patient);
  const editor = await fillDeclaration(page, f);
  const report = await rpc(
    f.initiator.client,
    "report_extraordinary_consumption",
    {
      p_patient: f.patient,
      p_kind: "consumption",
      p_location: "CARE_TEAM",
      p_text: "Consumo que torna a referência da preparação obsoleta",
      p_lines: [{ productId: f.products[0], quantity: "1" }],
      p_key: crypto.randomUUID(),
    },
  );
  await rpc(f.admin, "decide_consumption_report", {
    p_id: report,
    p_accept: true,
    p_reason: null,
    p_key: crypto.randomUUID(),
    p_version: 1,
  });
  let ledger = JSON.parse(transferState(f)).ledger;
  await editor
    .getByRole("button", { name: "Revisar ficha", exact: true })
    .click();
  // Fresh review rejects a stale source before any official declaration POST.
  await expect(
    page.getByRole("button", {
      name: "Expedir devolução",
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(
    editor.getByRole("alert").filter({ hasText: "A origem mudou" }),
  ).toBeVisible();
  expect(officialPosts).toHaveLength(0);
  expect(JSON.parse(transferState(f)).ledger).toEqual(ledger);
  await expect(
    editor.getByLabel("Observação 1", { exact: true }),
  ).toHaveValue(/Devolução física de cinco/);
  await expect(
    editor.getByRole("textbox", {
      name: /^Quantidade de Material fictício V4 0/,
    }),
  ).toHaveValue("5");
  await expect(
    editor.getByRole("button", { name: "Revisar ficha", exact: true }),
  ).toBeDisabled();
  let failed = false;
  await page.route("**/api/transfers/preparation?*", async (route) => {
    if (!failed) {
      failed = true;
      await route.fulfill({
        status: 503,
        json: { error: "Referência temporariamente indisponível" },
      });
    } else await route.continue();
  });
  await editor
    .getByRole("button", { name: "Comparar referência atual", exact: true })
    .click();
  await expect(
    editor.getByText(/Referência temporariamente indisponível/),
  ).toBeVisible();
  await editor
    .getByRole("button", { name: "Comparar referência atual", exact: true })
    .click();
  await expect(
    editor.getByRole("region", {
      name: "Comparação da referência da transferência",
      exact: true,
    }),
  ).toContainText("atual 9");
  await editor
    .getByRole("button", {
      name: "Adotar referência atual e revisar meus campos",
      exact: true,
    })
    .click();
  await editor
    .getByRole("button", { name: "Revisar ficha", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Revise antes de expedir",
      exact: true,
    }),
  ).toBeFocused();
  const postReviewReport = await rpc(
    f.initiator.client,
    "report_extraordinary_consumption",
    {
      p_patient: f.patient,
      p_kind: "consumption",
      p_location: "CARE_TEAM",
      p_text: "Mudança real após a revisão da declaração",
      p_lines: [{ productId: f.products[0], quantity: "1" }],
      p_key: crypto.randomUUID(),
    },
  );
  await rpc(f.admin, "decide_consumption_report", {
    p_id: postReviewReport,
    p_accept: true,
    p_reason: null,
    p_key: crypto.randomUUID(),
    p_version: 1,
  });
  ledger = JSON.parse(transferState(f)).ledger;
  const beforeNativeConflict = transferState(f);
  await page
    .getByRole("button", {
      name: "Expedir devolução",
      exact: true,
    })
    .click();
  await expect(
    editor.getByRole("button", { name: "Revisar ficha", exact: true }),
  ).toBeDisabled();
  await expect(
    editor.getByRole("textbox", {
      name: /^Quantidade de Material fictício V4 0/,
    }),
  ).toHaveValue("5");
  expect(officialPosts).toHaveLength(1);
  expect(transferState(f)).toBe(beforeNativeConflict);
  await editor
    .getByRole("button", { name: "Comparar referência atual", exact: true })
    .click();
  await expect(
    editor.getByRole("region", {
      name: "Comparação da referência da transferência",
      exact: true,
    }),
  ).toContainText("atual 8");
  await editor
    .getByRole("button", {
      name: "Adotar referência atual e revisar meus campos",
      exact: true,
    })
    .click();
  await editor
    .getByRole("button", { name: "Revisar ficha", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Revise antes de expedir",
      exact: true,
    }),
  ).toBeFocused();

  await page
    .getByRole("button", {
      name: "Expedir devolução",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("heading", { name: "Devolução expedida", exact: true }),
  ).toBeVisible();
  expect(JSON.parse(transferState(f)).ledger).toHaveLength(ledger.length + 1);
  ledger = JSON.parse(transferState(f)).ledger;
  expect(officialPosts).toHaveLength(2);
  await page.unroute("**/api/transfers/preparation?*");
  const legacy = await declareTransfer(f, { quantity: "1" });
  expect(legacy.response.error).toBeNull();
  const d = legacy.response.data as SupplyDocument;
  await page.goto("/documentos/" + d.id);
  await selectDocumentSection(page, "workflow");
  await page
    .getByRole("button", { name: "Encerrar declaração sem expedir", exact: true })
    .click();
  const reason = page.getByRole("textbox", {
    name: /^Sua justificativa para este ato/,
  });
  await reason.fill(
    "Motivo próprio preservado enquanto outra sessão encerra a declaração.",
  );
  const withdrawn = await transferCommand(
    f.initiator.client,
    d.id,
    "withdraw",
    d.version,
    { reason: "Declarante encerra pessoalmente a declaração legada" },
  );
  expect(withdrawn.error).toBeNull();
  await page
    .getByRole("button", { name: "Revisar meu ato", exact: true })
    .click();
  // The review checks live authority before an official submission.
  await expect(
    page.getByRole("button", { name: "Confirmar decisão", exact: true }),
  ).toHaveCount(0);
  await expect(reason).toHaveValue(/Motivo próprio preservado/);
  await expect(reason).toBeFocused();
  await page
    .getByRole("button", {
      name: "Consultar e comparar transferência atual",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Adotar estado atual e revisar minha decisão",
      exact: true,
    }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Revisar meu ato", exact: true }),
  ).toBeDisabled();
  expect(JSON.parse(transferState(f)).ledger).toEqual(ledger);
});
import { selectReturnRecipient } from "./delivery-recipient";
