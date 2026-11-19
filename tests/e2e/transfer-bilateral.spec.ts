import { selectDocumentSection, openDocumentMore, closeDocumentMore, openDocumentAction } from "./document-sections";
import { generatedPdf } from "./generated-pdf";
import { expect, test, type Page } from "@playwright/test";
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
) {
  await page.goto("/transferencias");
  await page
    .getByRole("combobox", { name: /^Custódia de origem/ })
    .selectOption("CARE_TEAM");
  await page
    .getByRole("button", { name: "Preparar declaração", exact: true })
    .click();
  const drawer = page.getByRole("region", {
    name: "Nova devolução",
    exact: true,
  });
  await expect(drawer.getByRole("combobox", { name: /^Contraparte para concordância/ })).toHaveCount(0);
  await drawer
    .getByRole("combobox", { name: /^Recebedor físico designado/ })
    .selectOption(f.recipient.id);
  await drawer.getByRole("button", { name: "Selecionar materiais", exact: true }).click();
  const material = drawer.getByRole("combobox", {
    name: /^Adicionar material da origem/,
  });
  await material.click();
  await expect(material).toBeInViewport({ ratio: 1 });
  await material.fill("Material fictício V4 0");
  await material.press("ArrowDown");
  await page.getByRole("option", { name: /Material fictício V4 0/ }).click();
  await drawer
    .getByRole("textbox", { name: /^Quantidade de Material fictício V4 0/ })
    .fill("5");
  await drawer.getByRole("button", { name: "Continuar", exact: true }).click();
  await drawer.getByRole("button", { name: "Continuar", exact: true }).click();
  await drawer
    .getByRole("combobox", { name: /^ENT documental de origem/ })
    .selectOption(f.origin.id);
  await drawer
    .getByRole("textbox", { name: /^Sua justificativa para a (entrega|devolução) de materiais/ })
    .fill(
      "Devolução física de cinco unidades, com Bruno como recebedor pessoal.",
    );
  return drawer;
}
test("devolução separa expedidor e recebedor, recupera expedição incerta com perda de escrita e recebe três de cinco de material inativo", async ({
  page,
  browser,
}, info) => {
  const f = await transferFixture(),
    before = JSON.parse(transferState(f));
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
  const editor = await fillDeclaration(page, f);
  await editor
    .getByRole("button", { name: "Revisar ficha", exact: true })
    .click();
  const review = editor;
  await expect(review.getByText(/inativo com saldo/)).toBeVisible();
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
  ).toBeVisible();
  expect(packets).toHaveLength(1);
  expect(document!.code).toMatch(/^DEV-/);
  expect(document!.status).toBe("pending_receipt");
  expect(document!.transfer?.agreement).toBeNull();
  expect(document!.transfer?.declaration.actor.id).toBe(f.initiator.id);
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
  const anaContext = await browser.newContext({
      baseURL: new URL(page.url()).origin,
    }),
    brunoContext = await browser.newContext({
      baseURL: new URL(page.url()).origin,
    });
  try {
    const ana = await anaContext.newPage();
    await login(ana, f.counterparty.email, f.patient);
    await ana.goto("/entregas");
    await expect(ana.locator(`[data-delivery-id="${id}"]`)).toHaveCount(0);
    await ana.goto("/documentos/" + id);
    await selectDocumentSection(ana, "workflow");
    await expect(ana.getByRole("button", { name: "Concordar com a transferência", exact: true })).toHaveCount(0);
    await expect(
      ana.getByRole("button", { name: "Conferir recebimento", exact: true }),
    ).toHaveCount(0);
    expect(JSON.parse(transferState(f)).ledger.length).toBe(
      before.ledger.length + 1,
    );
    await openDocumentMore(page);
    await expect(
      page.getByRole("menuitem", { name: "Alterar destinatário", exact: true }),
    ).toHaveCount(0);
    await closeDocumentMore(page);
    const bruno = await brunoContext.newPage();
    await login(bruno, f.recipient.email, f.patient);
    await bruno.goto("/entregas");
    const receiptTask = bruno.locator(`[data-delivery-id="${id}"]`);
    await expect(receiptTask).toContainText("Conferir meu recebimento");
    await receiptTask.getByRole("link", { name: "Conferir", exact: true }).click();
    await selectDocumentSection(bruno, "workflow");
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
    for (const width of [320, 390, 768, 1440]) {
      await bruno.setViewportSize({ width, height: 900 });
      await audit(bruno, `transfer-direct-receipt-${width}`);
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
    await anaContext.close();
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
    editor.getByRole("textbox", {
      name: /^Sua justificativa para a (entrega|devolução) de materiais/,
    }),
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
