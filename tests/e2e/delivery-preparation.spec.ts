import { selectMaterialCategory } from "./material-category";
import { isDocumentAccessReport } from "./display-access-report";
import { selectDocumentSection } from "./document-sections";
import { generatedPdf } from "./generated-pdf";
import { historyHashes } from "../integration/version-history-fixtures.mjs";
import { expect, test, type Page } from "@playwright/test";
import { PDF } from "@libpdf/core";
import { mkdirSync, writeFileSync } from "node:fs";
import { setup, actor, rpc, fixtures } from "../integration/v4-fixtures.mjs";
import { currentDeliveryShift } from "../integration/delivery-preparation-fixtures.mjs";
import { shiftWorker } from "../integration/shift-fixtures.mjs";
import {
  sql,
  sqlLiteral,
} from "../../scripts/test-environment.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";
import { openDeliveryRecipient, selectDeliveryRecipient } from "./delivery-recipient";
import { audit, auditFromTop } from "./accessibility-audit";
import type { SupplyDocument } from "../../src/types/documents";

test.setTimeout(150_000);
const reason =
  "A pessoa vinculada indicada receberá fisicamente estes materiais";
async function open(page: Page, patient: string, singlePatientEmail?: string) {
  await page.goto(singlePatientEmail ? "/login?next=%2Ffichas%2Fent" : "/login", { waitUntil: "domcontentloaded" });
  await page.getByLabel("E-mail", { exact: true }).fill(singlePatientEmail ?? fixtures.adminA.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  if (singlePatientEmail) {
    await expect(page).toHaveURL(url => url.pathname === "/fichas/ent");
    await expect(page.locator(".hca-workspace")).toHaveAttribute("data-context-patient", patient);
    return;
  }
  await expect(
    page.getByRole("heading", { name: "Visão geral", exact: true }),
  ).toBeVisible();
  await selectContext(page, patient);
  await page.goto("/fichas/ent");
}
const next = (page: Page) =>
  page.getByRole("button", { name: /^(Selecionar materiais|Continuar|Revisar ficha)$/ }).click();
async function materialsAndReview(page: Page) {
  await next(page);
  await selectMaterialCategory(page);
  await page.getByRole("checkbox", { name: /^Material fictício V4 0/ }).check();
  await page
    .getByLabel("Quantidade — Material fictício V4 0", { exact: true })
    .fill("2");
  await next(page);
  await next(page);
  await next(page);
  await expect(
    page.getByRole("heading", { name: "Revisão", exact: true }),
  ).toBeVisible();
}
const ledger = (patient: string) =>
  sql(
    `select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${sqlLiteral(patient)};`,
  );
const explanation = (page: Page) =>
  page.getByRole("textbox", {
    name: "Justificativa da escolha do recebedor",
    exact: true,
  });
async function finish(page: Page) {
  const pending = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/documents" &&
      response.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Expedir entrega", exact: true })
    .click();
  const response = await pending;
  expect(response.ok(), await response.text()).toBe(true);
  return (await response.json()).data as SupplyDocument;
}

test("C-FINAL023 ENT recupera consulta sem pedir correção de origem ou quantidade expedida", async ({ page }) => {
  const f = await setup();
  const doc = await rpc(f.admin, "create_supply_document", { p_patient: f.patient, p_type: "ENT", p_key: crypto.randomUUID(), p_draft: false, p_payload: { source: "FAMILY", destination: "CARE_TEAM", recipientId: fixtures.professional.id, recipientReason: "Recebedor indicado para a consulta fictícia", lines: [{ productId: f.products[0], quantity: "2" }] } });
  await open(page, f.patient); await page.goto(`/fichas/${doc.id}`);
  await selectDocumentSection(page, "materials");
  const material = page.getByText(doc.lines[0].name_snapshot, { exact: true }).first();
  await expect(material).toBeVisible();
  const before = historyHashes(doc.id), stock = ledger(f.patient);
  let writes = 0;
  page.on("request", request => { if (new URL(request.url()).pathname.startsWith("/api/documents") && request.method() !== "GET" && !isDocumentAccessReport(request)) writes++; });
  const refresh = page.getByRole("button", { name: "Atualizar ficha", exact: true });
  for (const status of [503, 403]) {
    await page.route(`**/api/documents/${doc.id}`, route => route.fulfill({ status, contentType: "application/json", body: JSON.stringify({ error: "Consulta fictícia da ENT indisponível", code: "READ_UNAVAILABLE" }) }), { times: 1 });
    await refresh.focus(); await refresh.press("Enter");
    await expect(page.getByRole("alert").filter({ hasText: "Consulta fictícia da ENT indisponível" })).toBeVisible();
    await expect(page.locator('[aria-invalid="true"]')).toHaveCount(0);
    if (status === 403) await expect(material).toHaveCount(0);
    await expect(refresh).toBeFocused(); await refresh.press("Enter");
    await expect(refresh).toBeEnabled(); await expect(material).toBeVisible(); await expect(refresh).toBeFocused();
  }
  expect(writes).toBe(0); expect(historyHashes(doc.id)).toBe(before); expect(ledger(f.patient)).toBe(stock);
  for (const width of [320, 390, 768, 1440]) { await page.setViewportSize({ width, height: 900 }); await audit(page, "immutable ENT read " + width); }
});

test("P06 escolha manual exige motivo, revisa quem recebe e recupera uma única expedição sem aceite substituto", async ({
  page,
}, info) => {
  test.setTimeout(210_000);
  const f = await setup(),
    before = ledger(f.patient), admin = await shiftWorker(f.patient, "admin");
  await open(page, f.patient, admin.email);
  await expect(
    page.getByText(/Não há sugestão inequívoca da escala/),
  ).toBeVisible();
  await selectDeliveryRecipient(page, "Teste professional", "");
  const useRecipient = page.getByRole("button", { name: "Usar recebedor", exact: true });
  await expect(useRecipient).toBeDisabled();
  expect(ledger(f.patient)).toBe(before);
  await explanation(page).fill(reason);
  await useRecipient.click();
  await materialsAndReview(page);
  await expect(
    page.getByText("Justificativa da escolha: " + reason, { exact: true }),
  ).toBeVisible();
  const attempts: unknown[] = [];
  let saved: SupplyDocument | undefined;
  let attemptedPdf: { id: string; issuanceId: string } | undefined;
  const releasePdfResponse = Promise.withResolvers<void>();
  const releaseNoticeResponse = Promise.withResolvers<void>();
  const noticeResponses: { noticesPrepared: boolean; noticesNeedAttention: boolean; issuanceId: string | null }[] = [];
  await page.route(/\/issuances\/initial\?phase=notices$/, async route => {
    const response = await route.fetch();
    expect(response.ok()).toBe(true);
    noticeResponses.push(await response.json());
    await releaseNoticeResponse.promise;
    await route.fulfill({ response });
  });
  await page.route("**/api/documents/*/issuances/initial", async route => {
    if (route.request().method() !== "POST") return route.continue();
    const response = await route.fetch({ timeout: 65_000 });
    expect(response.status(), await response.text()).toBe(200);
    attemptedPdf = await response.json();
    await releasePdfResponse.promise;
    await route.abort("failed");
  });
  await page.route("**/api/documents", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    attempts.push(route.request().postDataJSON());
    if (attempts.length === 1) {
      const response = await route.fetch();
      expect(response.ok()).toBe(true);
      saved = (await response.json()).data;
      const affected = sql(`update public.requisition_notifications set state='failed',last_error='synthetic controlled result'
        where id=(select id from public.requisition_notifications
          where document_id=${sqlLiteral(saved!.id)} and event_key='ent.issued' and channel='internal' order by id limit 1)
        returning id`);
      expect(affected).not.toBe("");
      await route.abort("failed");
    } else await route.continue();
  });
  await page
    .getByRole("button", { name: "Expedir entrega", exact: true })
    .click();
  const uncertain = page.getByRole("dialog", { name: "Resultado ainda não confirmado", exact: true });
  await expect(uncertain).toBeVisible();
  await expect(uncertain.getByText(/Seu rascunho está salvo/)).toHaveCount(0);
  try {
    await uncertain.getByRole("button", { name: "Consultar resultado", exact: true }).click();
    const processingNotices = page.getByRole("dialog", { name: "Processando os avisos da emissão", exact: true });
    await expect(processingNotices).toBeVisible({ timeout: 65_000 });
    await expect.poll(() => noticeResponses.length).toBe(1);
    expect(noticeResponses[0]).toMatchObject({ noticesPrepared: true, noticesNeedAttention: true, issuanceId: null });
    await info.attach("emissao-processando-avisos", {
      body: await processingNotices.screenshot({ animations: "disabled" }), contentType: "image/png",
    });
    releaseNoticeResponse.resolve();
    await expect.poll(() => Boolean(attemptedPdf), { timeout: 65_000 }).toBe(true);
    await expect(page.getByRole("heading", { name: "Gerando o PDF de emissão", exact: true })).toBeVisible();
    await expect(page.getByRole("list", { name: "Etapas da operação" }).locator('[aria-current="step"]'))
      .toContainText("Gerando o PDF de emissão");
  } finally {
    releaseNoticeResponse.resolve();
    releasePdfResponse.resolve();
  }
  const emitted = page.getByRole("dialog", { name: "Entrega expedida", exact: true });
  await expect(emitted).toBeVisible();
  await expect(emitted.getByRole("link", { name: "Consultar avisos", exact: true })).toHaveAttribute("href", `/fichas/${saved!.id}?documentTab=communications`);
  await expect(emitted.getByRole("link", { name: "Baixar PDF", exact: true })).toHaveCount(0);
  await emitted.getByRole("button", { name: "Recuperar PDF", exact: true }).click();
  const href = `/api/documents/${saved!.id}/pdf?issuance=${attemptedPdf!.issuanceId}`;
  await expect(emitted.getByRole("link", { name: "Baixar PDF", exact: true })).toHaveAttribute("href", href);
  const file = await page.request.get(href);
  expect(file.ok()).toBe(true);
  const text = (await PDF.load(await file.body())).extractText().flatMap(p =>
    p.lines.map(l => l.spans.flatMap(s => s.chars.map(c => c.char)).join(""))).join(" ").replace(/\s+/g, " ");
  expect(text).toContain("Comunicações da emissão");
  expect(text).toContain("Aviso no aplicativo · Falhou · 1");
  expect(text).toContain("Aviso no aplicativo · Entregue");
  expect(text).not.toContain("synthetic controlled result");
  expect(noticeResponses).toHaveLength(1);
  await info.attach("emissao-confirmada-com-aviso", {
    body: await emitted.screenshot({ animations: "disabled" }), contentType: "image/png",
  });
  expect(sql(`select count(*) from private.pdf_issuances where initial_request_id=${sqlLiteral(attemptedPdf!.id)}`)).toBe("1");
  expect(attempts).toHaveLength(1);
  expect(saved).toBeTruthy();
  const result = (await rpc(f.admin, "operational_document", {
    p_id: saved!.id,
  })) as SupplyDocument;
  expect(result.workflow_data.recipientSelection?.selectedBy).toBe(
    admin.id,
  );
  expect(result.workflow_data.recipientSelection?.recipientId).toBe(
    fixtures.professional.id,
  );
  expect(result.workflow_data.recipientSelection?.reason).toBe(reason);
  expect(result.workflow_data.acceptedBy).toBeUndefined();
  expect(result.status).toBe("pending_receipt");
  expect(
    sql(
      `select count(*) from public.stock_movements where reference_type='document' and reference_id=${sqlLiteral(result.id)};`,
    ),
  ).toBe("1");
  expect(
    sql(
      `select count(*) from public.operational_documents where care_recipient_id=${sqlLiteral(f.patient)} and type='ENT';`,
    ),
  ).toBe("1");
  await emitted.getByRole("button", { name: "Acompanhar ficha", exact: true }).click();
  await selectDocumentSection(page, "workflow");
  await expect(
    page.getByRole("region", { name: "Indicação do recebedor", exact: true }),
  ).toContainText(reason);
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await auditFromTop(page, "P06 selected recipient " + width);
  }
  await page.screenshot({
    path: `output/playwright/phase-d/delivery-preparation-${info.project.name}.png`,
    fullPage: true,
    animations: "disabled",
  });
  const pdf = await generatedPdf(page, `/api/documents/${result.id}/pdf`);
  expect(pdf.ok()).toBe(true);
  if (info.project.name === "chromium") {
    mkdirSync("output/pdf/phase-d", { recursive: true });
    writeFileSync(
      `output/pdf/phase-d/delivery-preparation-${result.id}-v${result.version}.pdf`,
      await pdf.body(),
      { flag: "wx" },
    );
  }
});

test("P06 escala sugere, a família pode escolher outra pessoa e o profissional escalado não aceita em seu lugar", async ({
  page,
}) => {
  const f = await setup(),
    shift = currentDeliveryShift(f);
  try {
    await open(page, f.patient);
    const recipient = page.getByRole("region", { name: "Escolha do recebedor", exact: true });
    await expect(recipient).toContainText("Teste professional");
    await expect(recipient).toContainText("Em plantão");
    await expect(explanation(page)).toHaveCount(0);
    await selectDeliveryRecipient(page, "Teste global", reason);
    await materialsAndReview(page);
    const recipientSummary = page.locator("dl > div").filter({
      has: page.locator("dt").filter({ hasText: /^Recebedor$/ }),
    }).locator("dd");
    await expect(recipientSummary).toBeVisible();
    await expect(recipientSummary).toContainText("Teste global");
    await expect(page.getByText("Sugestão: ", { exact: false })).toContainText(
      "Teste professional",
    );
    const document = await finish(page);
    expect(document.workflow_data.recipientSelection?.suggestedId).toBe(
      fixtures.professional.id,
    );
    expect(document.workflow_data.recipientSelection?.recipientId).toBe(
      fixtures.global.id,
    );
    expect(document.workflow_data.recipientSelection?.manual).toBe(true);
    const pro = await actor("professional", f.patient),
      before = ledger(f.patient);
    const denied = await pro.rpc("supply_document_command", {
      p_id: document.id,
      p_action: "receive",
      p_body: { divergences: [] },
      p_key: crypto.randomUUID(),
      p_version: document.version,
    });
    expect(denied.error?.code).toBe("42501");
    expect(ledger(f.patient)).toBe(before);
  } finally {
    shift.close();
  }
});

test("P06 erro de consulta e escala alterada preservam edição e exigem adotar a referência atual antes da expedição", async ({
  page,
}) => {
  const f = await setup(),
    before = ledger(f.patient);
  await open(page, f.patient);
  await selectDeliveryRecipient(page, "Teste professional", reason);
  await materialsAndReview(page);
  await page.getByRole("navigation", { name: "Etapas da ENT" }).getByRole("button", { name: "Confirmação", exact: true }).click();
  await openDeliveryRecipient(page);
  await page.route("**/api/documents/delivery-preparation?**", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        code: "DEPENDENCY_UNAVAILABLE",
        error: "Consulta de recebedores indisponível neste ensaio",
      }),
    }),
  );
  await page
    .getByRole("button", { name: "Consultar escala atual", exact: true })
    .click();
  await expect(
    page
      .getByText(/Consulta de recebedores indisponível|Não foi possível/)
      .first(),
  ).toBeVisible();
  await expect(explanation(page)).toHaveValue(reason);
  expect(ledger(f.patient)).toBe(before);
  await page.unroute("**/api/documents/delivery-preparation?**");
  const shift = currentDeliveryShift(f, fixtures.global.id);
  try {
    await page
      .getByRole("button", { name: "Consultar escala atual", exact: true })
      .click();
    await expect(
      page.getByRole("region", {
        name: "Comparação do recebedor",
        exact: true,
      }),
    ).toContainText("Teste global");
    await expect(
      page.getByRole("combobox", {
        name: "Destinatário designado",
        exact: true,
      }),
    ).toBeDisabled();
    await expect(explanation(page)).toHaveValue(reason);
    await page
      .getByRole("button", { name: "Usar referências atuais", exact: true })
      .click();
    await expect(
      page.getByRole("combobox", {
        name: "Destinatário designado",
        exact: true,
      }),
    ).toBeFocused();
    await expect(
      page.getByRole("combobox", {
        name: "Destinatário designado",
        exact: true,
      }),
    ).toHaveValue("Teste professional");
    await page.getByRole("button", { name: "Usar recebedor", exact: true }).click();
    await next(page);
    await selectMaterialCategory(page);
    await expect(
      page.getByLabel("Quantidade — Material fictício V4 0", { exact: true }),
    ).toHaveValue("2");
    await next(page);
    await next(page);
    await next(page);
    shift.close();
    const response = page.waitForResponse(
      (r) =>
        new URL(r.url()).pathname === "/api/documents" &&
        r.request().method() === "POST",
    );
    await page
      .getByRole("button", { name: "Expedir entrega", exact: true })
      .click();
    expect((await response).status()).toBe(409);
    expect(ledger(f.patient)).toBe(before);
    await openDeliveryRecipient(page);
    await expect(
      page.getByRole("region", {
        name: "Comparação do recebedor",
        exact: true,
      }),
    ).toBeVisible();
    await expect(explanation(page)).toHaveValue(reason);
    await page
      .getByRole("button", { name: "Usar referências atuais", exact: true })
      .click();
    await page.getByRole("button", { name: "Usar recebedor", exact: true }).click();
    for (let index = 0; index < 4; index++) await next(page);
    const document = await finish(page);
    expect(document.recipient_id).toBe(fixtures.professional.id);
    expect(document.workflow_data.recipientSelection?.reason).toBe(reason);
  } finally {
    shift.close();
  }
});

test("P06 sem pessoa elegível mantém preparação pendente e nenhuma leitura ou navegação fabrica expedição", async ({
  page,
}) => {
  const f = await setup();
  for (const name of ["professional", "global"])
    sql(
      `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${sqlLiteral(f.patient)},${sqlLiteral(fixtures[name].id)},'ent.receive',false);`,
    );
  const before = ledger(f.patient);
  await open(page, f.patient);
  await expect(
    page.getByText(/Não há pessoa elegível para receber nesta direção/),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Escolher recebedor", exact: true }),
  ).toBeDisabled();
  await next(page);
  await expect(
    page.getByRole("heading", { name: "Confirme os dados da ficha", exact: true }),
  ).toBeVisible();
  expect(ledger(f.patient)).toBe(before);
  expect(
    sql(
      `select count(*) from public.operational_documents where care_recipient_id=${sqlLiteral(f.patient)};`,
    ),
  ).toBe("0");
});
