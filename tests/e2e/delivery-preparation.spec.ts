import { isDocumentAccessReport } from "./display-access-report";
import { selectDocumentSection } from "./document-sections";
import { generatedPdf } from "./generated-pdf";
import { historyHashes } from "../integration/version-history-fixtures.mjs";
import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { setup, actor, rpc, fixtures } from "../integration/v4-fixtures.mjs";
import { currentDeliveryShift } from "../integration/delivery-preparation-fixtures.mjs";
import {
  fixtureFile,
  sql,
  sqlLiteral,
} from "../../scripts/test-environment.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";
import { selectDeliveryRecipient } from "./delivery-recipient";
import { audit, auditFromTop } from "./accessibility-audit";
import type { SupplyDocument } from "../../src/types/documents";

test.setTimeout(150_000);
const reason =
  "A pessoa vinculada indicada receberá fisicamente estes materiais";
async function open(page: Page, patient: string) {
  const ids = JSON.parse(readFileSync(fixtureFile, "utf8"));
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(ids.adminA.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Visão geral", exact: true }),
  ).toBeVisible();
  await selectContext(page, patient);
  await page.goto("/fichas/ent");
}
const next = (page: Page) =>
  page.getByRole("button", { name: /^(Avançar|Revisar)$/ }).click();
async function materialsAndReview(page: Page) {
  await next(page);
  await next(page);
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
    .getByRole("button", { name: "Confirmar e concluir", exact: true })
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
  const f = await setup(),
    before = ledger(f.patient);
  await open(page, f.patient);
  await expect(
    page.getByText(/Não há sugestão inequívoca da escala/),
  ).toBeVisible();
  await selectDeliveryRecipient(page, "Teste professional", "");
  await next(page);
  await expect(explanation(page)).toBeFocused();
  await expect(explanation(page)).toHaveAttribute("aria-invalid", "true");
  expect(ledger(f.patient)).toBe(before);
  await explanation(page).fill(reason);
  await materialsAndReview(page);
  await expect(
    page.getByText("Justificativa da escolha: " + reason, { exact: true }),
  ).toBeVisible();
  const attempts: unknown[] = [];
  let saved: SupplyDocument | undefined;
  await page.route("**/api/documents", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    attempts.push(route.request().postDataJSON());
    if (attempts.length === 1) {
      const response = await route.fetch();
      expect(response.ok()).toBe(true);
      saved = (await response.json()).data;
      await route.abort("failed");
    } else await route.continue();
  });
  await page
    .getByRole("button", { name: "Confirmar e concluir", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Recuperar esta tentativa", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Voltar", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Recuperar esta tentativa", exact: true })
    .click();
  await expect(
    page.getByText("Documento persistido", { exact: true }),
  ).toBeVisible();
  expect(attempts).toHaveLength(2);
  expect(attempts[1]).toEqual(attempts[0]);
  expect(saved).toBeTruthy();
  const result = (await rpc(f.admin, "operational_document", {
    p_id: saved!.id,
  })) as SupplyDocument;
  expect(result.workflow_data.recipientSelection?.selectedBy).toBe(
    fixtures.adminA.id,
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
  await page.getByRole("link", { name: /Acompanhar ficha/ }).click();
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
    const combo = page.getByRole("combobox", {
      name: "Destinatário designado",
      exact: true,
    });
    await expect(combo).toHaveValue("Teste professional");
    await expect(explanation(page)).toHaveCount(0);
    await selectDeliveryRecipient(page, "Teste global", reason);
    await expect(explanation(page)).toHaveValue(reason);
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
  await page.getByRole("button", { name: /^Identificação/ }).click();
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
    .getByRole("button", { name: "Atualizar pessoas e escala", exact: true })
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
      .getByRole("button", { name: "Atualizar pessoas e escala", exact: true })
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
    await next(page);
    await next(page);
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
      .getByRole("button", { name: "Confirmar e concluir", exact: true })
      .click();
    expect((await response).status()).toBe(409);
    expect(ledger(f.patient)).toBe(before);
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
    for (let index = 0; index < 5; index++) await next(page);
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
    page.getByRole("combobox", { name: "Destinatário designado", exact: true }),
  ).toBeDisabled();
  await next(page);
  await expect(
    page.getByRole("heading", { name: "Identificação", exact: true }),
  ).toBeVisible();
  expect(ledger(f.patient)).toBe(before);
  expect(
    sql(
      `select count(*) from public.operational_documents where care_recipient_id=${sqlLiteral(f.patient)};`,
    ),
  ).toBe("0");
});
