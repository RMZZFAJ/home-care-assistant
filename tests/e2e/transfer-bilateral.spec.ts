import { selectDocumentSection, openDocumentMore, closeDocumentMore } from "./document-sections";
import { generatedPdf } from "./generated-pdf";
import { expect, test, type Page } from "@playwright/test";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import {
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
  const drawer = page.getByRole("dialog", {
    name: "Preparar transferência física",
    exact: true,
  });
  await drawer
    .getByRole("combobox", { name: /^Contraparte para concordância/ })
    .selectOption(f.counterparty.id);
  await drawer
    .getByRole("combobox", { name: /^Recebedor físico designado/ })
    .selectOption(f.recipient.id);
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
  await drawer
    .getByRole("combobox", { name: /^ENT documental de origem/ })
    .selectOption(f.origin.id);
  await drawer
    .getByRole("textbox", { name: /^Sua justificativa para a transferência/ })
    .fill(
      "Devolução física de cinco unidades, com Ana como contraparte e Bruno como recebedor pessoal.",
    );
  return drawer;
}
test("transferência separa três autores, recupera declaração incerta com perda de escrita e recebe três de cinco de material inativo", async ({
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
  await expect(editor.getByText(/Inativo com saldo preservado/)).toBeVisible();
  await editor
    .getByRole("button", { name: "Revisar declaração", exact: true })
    .click();
  const review = page.getByRole("dialog", {
    name: "Revisar declaração da transferência",
    exact: true,
  });
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
      name: "Registrar declaração sem expedir",
      exact: true,
    })
    .click();
  await expect(
    review.getByRole("button", {
      name: "Recuperar mesma declaração",
      exact: true,
    }),
  ).toBeVisible();
  expect(JSON.parse(transferState(f)).ledger).toEqual(before.ledger);
  await review
    .getByRole("button", { name: "Recuperar mesma declaração", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Declaração confirmada", exact: true }),
  ).toBeVisible();
  expect(packets).toHaveLength(2);
  expect(packets[1]).toEqual(packets[0]);
  expect(document!.code).toBeNull();
  expect(document!.transfer?.declaration.actor.id).toBe(f.initiator.id);
  await page.unroute("**/api/transfers");
  await page
    .getByRole("link", {
      name: "Consultar a transferência registrada",
      exact: true,
    })
    .click();
  await selectDocumentSection(page, "materials");
  const id = document!.id;
  await expect(page.getByText("Declarado", { exact: true })).toBeVisible();
  await expect(page.getByText("Expedido", { exact: true })).toHaveCount(0);
  await selectDocumentSection(page, "workflow");
  await expect(
    page.getByRole("heading", {
      name: "Atos da transferência física",
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
    await ana
      .getByRole("link")
      .filter({ hasText: "Decidir concordância da transferência" })
      .click();
    await selectDocumentSection(ana, "workflow");
    await ana
      .getByRole("button", {
        name: "Concordar com a transferência",
        exact: true,
      })
      .click();
    await ana
      .getByRole("textbox", { name: /^Sua justificativa para este ato/ })
      .fill(
        "Ana concorda com a transferência; Bruno deve conferir o recebimento físico.",
      );
    await ana
      .getByRole("button", { name: "Revisar meu ato", exact: true })
      .click();
    await ana
      .getByRole("button", { name: "Confirmar decisão", exact: true })
      .click();
    await expect(
      ana.getByText(
        "Concordância registrada com sua autoria. Ainda não houve expedição nem recebimento.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(
      ana.getByRole("button", { name: "Confirmar recebimento", exact: true }),
    ).toHaveCount(0);
    expect(JSON.parse(transferState(f)).ledger).toEqual(before.ledger);
    await page.goto("/documentos/" + id);
  await selectDocumentSection(page, "workflow");
    await page
      .getByRole("button", { name: "Expedir transferência", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Revisar meu ato", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Confirmar expedição", exact: true })
      .click();
    await expect(
      page.getByText(
        "Expedição confirmada. Os materiais estão em trânsito até o recebimento pessoal.",
        { exact: true },
      ),
    ).toBeVisible();
    expect(JSON.parse(transferState(f)).ledger.length).toBe(
      before.ledger.length + 1,
    );
    await openDocumentMore(page);
    await expect(
      page.getByRole("button", { name: "Alterar destinatário", exact: true }),
    ).toHaveCount(0);
    await closeDocumentMore(page);
    const bruno = await brunoContext.newPage();
    await login(bruno, f.recipient.email, f.patient);
    await bruno.goto("/entregas");
    await bruno
      .getByRole("link")
      .filter({ hasText: "Conferir meu recebimento" })
      .click();
    await selectDocumentSection(bruno, "workflow");
    await bruno
      .getByRole("button", { name: "Informar divergência", exact: true })
      .click();
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
    expect(received.transfer?.agreement?.actor.id).toBe(f.counterparty.id);
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
      await audit(bruno, `transfer-three-actors-${width}`);
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

test("conflitos preservam campos da declaração e da contraparte, exigem adoção explícita e não reabrem ato encerrado", async ({
  page,
}) => {
  const f = await transferFixture();
  await login(page, f.initiator.email, f.patient);
  let editor = await fillDeclaration(page, f);
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
  const ledger = JSON.parse(transferState(f)).ledger;
  await editor
    .getByRole("button", { name: "Revisar declaração", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Registrar declaração sem expedir",
      exact: true,
    })
    .click();
  editor = page.getByRole("dialog", {
    name: "Preparar transferência física",
    exact: true,
  });
  await expect(
    editor.getByRole("textbox", {
      name: /^Sua justificativa para a transferência/,
    }),
  ).toHaveValue(/Devolução física de cinco/);
  await expect(
    editor.getByRole("textbox", {
      name: /^Quantidade de Material fictício V4 0/,
    }),
  ).toHaveValue("5");
  await expect(
    editor.getByRole("button", { name: "Revisar declaração", exact: true }),
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
    .getByRole("button", { name: "Revisar declaração", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Registrar declaração sem expedir",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("heading", { name: "Declaração confirmada", exact: true }),
  ).toBeVisible();
  expect(JSON.parse(transferState(f)).ledger).toEqual(ledger);
  const d = JSON.parse(transferState(f)).documents.find(
    (doc: SupplyDocument) => doc.status === "transfer_pending",
  ) as SupplyDocument;
  await page.unroute("**/api/transfers/preparation?*");
  await page.goto("/login");
  // Use a separate Auth identity with its own selected patient context.
  await page.context().clearCookies();
  await login(page, f.counterparty.email, f.patient);
  await page.goto("/documentos/" + d.id);
  await selectDocumentSection(page, "workflow");
  await page
    .getByRole("button", { name: "Concordar com a transferência", exact: true })
    .click();
  const reason = page.getByRole("textbox", {
    name: /^Sua justificativa para este ato/,
  });
  await reason.fill(
    "Parecer próprio preservado enquanto o declarante encerra sua proposta.",
  );
  const withdrawn = await transferCommand(
    f.initiator.client,
    d.id,
    "withdraw",
    d.version,
    { reason: "Declarante encerra pessoalmente antes da concordância" },
  );
  expect(withdrawn.error).toBeNull();
  await page
    .getByRole("button", { name: "Revisar meu ato", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirmar decisão", exact: true })
    .click();
  await expect(reason).toHaveValue(/Parecer próprio preservado/);
  await expect(reason).toBeFocused();
  await page
    .getByRole("button", {
      name: "Adotar estado atual e revisar minha decisão",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("button", { name: "Revisar meu ato", exact: true }),
  ).toBeDisabled();
  expect(JSON.parse(transferState(f)).ledger).toEqual(ledger);
});
