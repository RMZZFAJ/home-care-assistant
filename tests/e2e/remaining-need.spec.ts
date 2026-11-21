import { openDocumentMore, selectDocumentSection } from "./document-sections";
import { generatedPdf } from "./generated-pdf";
import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import {
  remainingNeedFixture,
  remainingPacket,
  physicalState,
  rpc,
  fixtures,
} from "../integration/remaining-need-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";
import { auditFromTop } from "./accessibility-audit";

test.setTimeout(180_000);
const next = (page: Page) =>
  page.getByRole("button", { name: /^(Selecionar materiais|Continuar|Revisar ficha)$/ }).click();
const reason = (page: Page) =>
  page.getByLabel("Motivo da necessidade remanescente", { exact: true });
const source = (page: Page) =>
  page.getByRole("region", { name: "Nova necessidade vinculada", exact: true });
function expectOnlyNewCount(f: Awaited<ReturnType<typeof remainingNeedFixture>>, before: string, issuedId: string) {
  type Movement = { id: string; quantity: number };
  const { ledger: oldLedger, ...oldFacts } = JSON.parse(before) as { ledger: Movement[] };
  const after = physicalState(f);
  const { ledger, ...facts } = JSON.parse(after) as { ledger: Movement[] };
  const oldIds = new Set(oldLedger.map(movement => movement.id));
  expect(facts).toEqual(oldFacts);
  expect(ledger.filter(movement => oldIds.has(movement.id))).toEqual(oldLedger);
  expect(ledger.filter(movement => !oldIds.has(movement.id))).toEqual([
    expect.objectContaining({
      quantity: 2, product_id: f.products[0], source_location: "CARE_TEAM", destination_location: null,
      reference_type: "requisition_count", reference_id: issuedId, performed_by: fixtures.professional.id,
    }),
  ]);
  expect(sql(`select balance_before::text || ':' || counted_quantity::text
    from private.requisition_stock_counts where requisition_id=${sqlLiteral(issuedId)}`)).toBe("2.000000:0.000000");
  return after;
}
async function prepare(
  page: Page,
  f: Awaited<ReturnType<typeof remainingNeedFixture>>,
  text: string,
) {
  await page.goto("/login");
  await page
    .getByLabel("E-mail", { exact: true })
    .fill(fixtures.professional.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Visão geral", exact: true }),
  ).toBeVisible();
  await selectContext(page, f.patient);
  await page.goto(`/historico/${f.source.id}`);
  await selectDocumentSection(page, "materials");
  await expect(
    page.getByText("0/2 itens atendidos", { exact: true }),
  ).toBeVisible();
  await openDocumentMore(page);
  await page
    .getByRole("menuitem", {
      name: "Declarar nova necessidade remanescente",
      exact: true,
    })
    .click();
  await source(page)
    .getByRole("button", {
      name: "Preparar nova necessidade com esta referência",
      exact: true,
    })
    .click();
  await reason(page).fill(text);
  await next(page);
  await page.getByRole("navigation", { name: "Tipos de material" }).getByRole("button", { name: /^Higiene/ }).click();
  const choice = page.getByRole("checkbox", {
    name: "Material fictício V4 0 unidade",
    exact: true,
  });
  await expect(choice).not.toBeChecked();
  // This fixture deliberately keeps the source item partially fulfilled.
  // Selecting it therefore requires the real repetition acknowledgement.
  await choice.click();
  const repeat = page.getByRole("dialog", { name: "Este produto já está em uma requisição pendente", exact: true });
  await expect(repeat).toBeVisible();
  await repeat.getByRole("textbox", { name: "Justificativa da nova requisição", exact: true }).fill(text);
  await repeat.getByRole("button", { name: "Manter nova requisição", exact: true }).click();
  await expect(choice).toBeChecked();
  const observation = page.getByLabel("Estoque atual", {
    exact: false,
  });
  await expect(observation).toHaveValue("2");
  await expect(
    page.getByRole("checkbox", { name: "Não sei informar", exact: true }),
  ).not.toBeChecked();
  await observation.fill("0");
  for (let i = 0; i < 3; i++) await next(page);
  await expect(
    page.getByRole("heading", { name: "Revise antes de emitir", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("textbox")).toHaveCount(0);
  await expect(source(page)).toContainText(text);
}

test("nova REQ vinculada preserva aceite parcial e PDF anterior; resposta perdida recupera a própria emissão após perda de escrita", async ({
  page,
}, info) => {
  const f = await remainingNeedFixture(),
    before = physicalState(f),
    ownReason =
      "O material entregue não encerrou a necessidade; observei zero agora e declaro uma nova intenção";
  await prepare(page, f, ownReason);
  const oldPdf = await generatedPdf(
    page,
    `/api/documents/${f.source.id}/pdf?version=${f.sourceVersion}`,
  );
  expect(oldPdf.ok(), await oldPdf.text()).toBe(true);
  const oldBytes = await oldPdf.body(),
    oldHash = createHash("sha256").update(oldBytes).digest("hex");
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await auditFromTop(page, `remaining-need-review-${width}`);
  }
  mkdirSync("output/playwright/phase-d", { recursive: true });
  await page.setViewportSize({ width: 320, height: 900 });
  await page.screenshot({
    path: `output/playwright/phase-d/remaining-need-review-${info.project.name}.png`,
    fullPage: true,
  });
  let lose = true,
    created = "";
  const packets: Record<string, unknown>[] = [];
  await page.route("**/api/requisitions", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    packets.push(route.request().postDataJSON());
    if (!lose) return route.continue();
    lose = false;
    const response = await route.fetch();
    expect(response.ok(), await response.text()).toBe(true);
    created = (await response.json()).receipt.requisitionId;
    await route.abort("failed");
  });
  await page
    .getByRole("button", { name: "Emitir requisição", exact: true })
    .click();
  const recovery = page.getByRole("dialog", { name: "Resultado ainda não confirmado", exact: true });
  await expect(recovery).toBeVisible();
  expect(
    sql(
      `select count(*) from public.requisitions where source_requisition_id=${sqlLiteral(f.source.id)};`,
    ),
  ).toBe("1");
  sql(
    `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${sqlLiteral(f.patient)},${sqlLiteral(fixtures.professional.id)},'req.create',false);`,
  );
  const changed = page.waitForResponse(async (response) => {
    if (!response.url().endsWith("/api/context") || !response.ok())
      return false;
    const { data } = await response.json();
    return data.patients.some(
      (row: { id: string; capabilities: Record<string, boolean> }) =>
        row.id === f.patient && row.capabilities["req.create"] === false,
    );
  });
  await page.evaluate(() =>
    window.dispatchEvent(new Event("hca:profile-updated")),
  );
  await changed;
  await recovery.getByRole("button", { name: "Consultar resultado", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Requisição emitida", exact: true }),
  ).toBeVisible();
  expect(packets).toHaveLength(1);
  expect(packets[0].remainingNeed).toMatchObject({
    requisitionId: f.source.id,
    version: f.sourceVersion,
    reason: ownReason,
  });
  await page.getByRole("dialog", { name: "Requisição emitida", exact: true })
    .getByRole("button", { name: "Acompanhar ficha", exact: true }).click();
  await selectDocumentSection(page, "overview");
  await expect(
    page.getByRole("region", {
      name: "Origem da necessidade remanescente",
      exact: true,
    }),
  ).toContainText(ownReason);
  const after = expectOnlyNewCount(f, before, created);
  const oldAgain = await generatedPdf(
    page,
    `/api/documents/${f.source.id}/pdf?version=${f.sourceVersion}`,
  );
  expect(oldAgain.ok()).toBe(true);
  expect(
    createHash("sha256")
      .update(await oldAgain.body())
      .digest("hex"),
  ).toBe(oldHash);
  const pdf = await generatedPdf(page, `/api/documents/${created}/pdf`);
  expect(pdf.ok(), await pdf.text()).toBe(true);
  const bytes = await pdf.body();
  expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
  mkdirSync("output/phase-d-work", { recursive: true });
  writeFileSync(
    `output/phase-d-work/remaining-need-${info.project.name}.pdf`,
    bytes,
  );
  const canonical = JSON.parse(
    sql(
      `select jsonb_build_object('document',(select to_jsonb(d) from public.operational_documents d where id=${sqlLiteral(created)}),'request',(select to_jsonb(r) from public.requisitions r where id=${sqlLiteral(created)}),'sourceVersion',(select version from public.operational_documents where id=${sqlLiteral(f.source.id)}),'ledger',(select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${sqlLiteral(f.patient)}),'renderers',(select jsonb_agg(to_jsonb(e)) from private.pdf_issuances e where state='ready' and document_id=${sqlLiteral(created)}));`,
    ),
  );
  expect(canonical.request.source_requisition_id).toBe(f.source.id);
  expect(canonical.sourceVersion).toBe(f.sourceVersion + 1);
  writeFileSync(
    `output/phase-d-work/remaining-need-${info.project.name}-canonical.json`,
    JSON.stringify(
      {
        ...canonical,
        pdfSha256: createHash("sha256").update(bytes).digest("hex"),
        oldPdfSha256: oldHash,
        physicalSha256: createHash("sha256").update(before).digest("hex"),
      },
      null,
      2,
    ),
  );
  await page.goto(`/historico/${f.source.id}`);
  await selectDocumentSection(page, "overview");
  await expect(
    page.getByRole("region", { name: "Necessidades seguintes", exact: true }),
  ).toContainText(ownReason);
  expect(
    sql(
      `select count(*) from public.requisitions where source_requisition_id=${sqlLiteral(f.source.id)};`,
    ),
  ).toBe("1");
  expect(physicalState(f)).toBe(after);
});

test("origem obsoleta exige comparação e adoção explícita após falha; seleção, zero e motivo continuam preservados", async ({
  page,
}, info) => {
  const f = await remainingNeedFixture(),
    before = physicalState(f),
    ownReason =
      "Minha necessidade remanescente é própria e mantém meu motivo ao comparar uma nova referência";
  await prepare(page, f, ownReason);
  await rpc(f.pro, "submit_remaining_requisition", remainingPacket(f));
  let unavailable = true;
  await page.route(`**/api/requisitions/${f.source.id}`, async (route) => {
    if (unavailable) {
      unavailable = false;
      return route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          code: "TEMPORARY_FAILURE",
          error: "Consulta fictícia indisponível",
        }),
      });
    }
    return route.continue();
  });
  await page
    .getByRole("button", { name: "Emitir requisição", exact: true })
    .click();
  await expect(page.getByText(/A requisição de origem mudou/)).toBeVisible();
  await expect(reason(page)).toHaveValue(ownReason);
  await expect(reason(page)).toBeFocused();
  await expect(
    source(page).getByText("Consulta fictícia indisponível", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Selecionar materiais", exact: true }),
  ).toBeDisabled();
  expect(
    sql(
      `select count(*) from public.requisitions where source_requisition_id=${sqlLiteral(f.source.id)};`,
    ),
  ).toBe("1");
  expect(physicalState(f)).toBe(before);
  await source(page)
    .getByRole("button", { name: "Tentar origem novamente", exact: true })
    .click();
  await expect(
    source(page).getByText(/A origem mudou. Compare o atendimento acima/),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Selecionar materiais", exact: true }),
  ).toBeDisabled();
  await source(page)
    .getByRole("button", {
      name: "Adotar referência atual e manter meu motivo",
      exact: true,
    })
    .click();
  await expect(reason(page)).toHaveValue(ownReason);
  for (let i = 0; i < 4; i++) await next(page);
  await expect(
    page.getByText("Estoque atual da equipe: 0 unidade", { exact: true }),
  ).toBeVisible();
  await expect(source(page)).toContainText(
    `Minha referência para a confirmação: versão ${f.sourceVersion + 1}`,
  );
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await auditFromTop(page, `remaining-need-adopted-${width}`);
  }
  await page
    .getByRole("button", { name: "Emitir requisição", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Requisição emitida", exact: true }),
  ).toBeVisible();
  expect(
    sql(
      `select count(*) from public.requisitions where source_requisition_id=${sqlLiteral(f.source.id)};`,
    ),
  ).toBe("2");
  const issuedId = new URL(page.url()).pathname.split("/").at(-1)!;
  expectOnlyNewCount(f, before, issuedId);
  await info.attach("independent-remaining-need-state", {
    contentType: "application/json",
    body: Buffer.from(
      JSON.stringify({
        source: f.source.id,
        physicalSha256: createHash("sha256").update(before).digest("hex"),
        confirmedChildren: 2,
      }),
    ),
  });
});
