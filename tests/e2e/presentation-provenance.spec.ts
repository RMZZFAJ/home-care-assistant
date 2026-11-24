import { selectMaterialCategory } from "./material-category";
import { selectDocumentSection } from "./document-sections";
import { generatedPdf } from "./generated-pdf";
import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { randomUUID, createHash } from "node:crypto";
import { setup, rpc, fixtures } from "../integration/v4-fixtures.mjs";
import { shiftWorker } from "../integration/shift-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";
import { audit } from "./accessibility-audit";

test.setTimeout(120_000);
async function login(page: Page, patient: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(fixtures.adminA.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Visão geral", exact: true }),
  ).toBeVisible();
  await selectContext(page, patient);
}
async function loginToPurchaseWizard(page: Page, patient: string) {
  const admin = await shiftWorker(patient, "admin");
  await page.goto("/login?next=%2Ffichas%2Fcom");
  await page.getByLabel("E-mail", { exact: true }).fill(admin.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(url => url.pathname === "/fichas/com");
  await expect(page.locator(".hca-workspace")).toHaveAttribute("data-context-patient", patient);
}
async function seed() {
  const f = await setup();
  const result = await rpc(f.admin, "configure_catalogue_unit", {
    p_patient: f.patient,
    p_product: f.products[0],
    p_unit: "unidade",
    p_decimals: 0,
    p_barcode: "0123456789012",
    p_presentation: "Pacote fictício com dez unidades",
    p_base_quantity: "10",
  });
  return { ...f, presentation: result.presentationId };
}
const edit = (
  f: Awaited<ReturnType<typeof seed>>,
  version: number,
  factor = "12",
) => ({
  p_patient: f.patient,
  p_id: f.presentation,
  p_version: version,
  p_key: randomUUID(),
  p_body: {
    productId: f.products[0],
    name: "Pacote fictício com dez unidades",
    barcode: "0123456789012",
    baseQuantity: factor,
    active: true,
  },
});
const ledger = (patient: string) =>
  sql(
    `select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${sqlLiteral(patient)};`,
  );
async function chooseProduct(page: Page, name: string) {
  const combo = page.getByRole("combobox", {
    name: "Material da apresentação",
    exact: true,
  });
  await expect(combo).toBeVisible();
  const before = await combo.boundingBox();
  await combo.click();
  await expect(combo).toBeInViewport({ ratio: 1 });
  await combo.fill(name);
  await combo.press("ArrowDown");
  const option = page.getByRole("option", { name: new RegExp(name) });
  await expect(option).toBeInViewport({ ratio: 1 });
  await expect
    .poll(() =>
      option.evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        const hit = document.elementFromPoint(
          bounds.x + bounds.width / 2,
          bounds.y + bounds.height / 2,
        );
        return hit === element || Boolean(hit && element.contains(hit));
      }),
    )
    .toBe(true);
  await test.info().attach("presentation-product-pointer-" + name, {
    body: JSON.stringify(
      {
        before,
        after: await combo.boundingBox(),
        option: await option.boundingBox(),
        viewport: page.viewportSize(),
      },
      null,
      2,
    ),
    contentType: "application/json",
  });
  await option.click();
  await expect(combo).toHaveValue(name);
}
async function openPackageEditor(page: Page) {
  const menu = page.getByRole("button", { name: "Mais ações de Material fictício V4 0", exact: true });
  const editor = page.getByRole("dialog", { name: "Embalagens de Material fictício V4 0", exact: true });
  await menu.click();
  await page.getByRole("menuitem", { name: "Editar embalagens", exact: true }).click();
  await expect(editor).toBeVisible();
  return { editor, menu };
}

async function wizard(page: Page) {
  await page.getByRole("button", { name: "Selecionar materiais", exact: true }).click();
  await selectMaterialCategory(page);
  await page.getByRole("checkbox", { name: /Material fictício V4 0/ }).check();
  await expect(page.getByRole("combobox", { name: "Apresentação de Material fictício V4 0", exact: true })).toHaveCount(0);
  const { editor, menu } = await openPackageEditor(page);
  const combo = editor.getByRole("combobox", {
    name: "Apresentação de Material fictício V4 0",
    exact: true,
  });
  await combo.fill("Pacote fictício");
  await combo.press("ArrowDown");
  await page
    .getByRole("option", { name: /Pacote fictício com dez unidades/ })
    .click();
  await editor
    .getByRole("button", {
      name: /Adicionar embalagem de Material fictício V4 0/,
    })
    .click();
  await editor
    .getByLabel("Embalagens — Pacote fictício com dez unidades", {
      exact: true,
    })
    .fill("2");
  await expect(
    editor.getByText("Quantidade total calculada:", { exact: false }),
  ).toContainText("20 unidade");
  await editor.getByRole("button", { name: "Voltar ao material", exact: true }).click();
  await expect(menu).toBeFocused();
  await expect(page.getByText("Quantidade total calculada:", { exact: false })).toContainText("20 unidade");
}
async function review(page: Page) {
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.getByRole("button", { name: "Revisar ficha", exact: true }).click();
}

const catalogueCommand = "/api/admin/catalogue-actions";
const presentationReview = (page: Page) => page.getByRole("dialog", { name: "Confirmar apresentação?", exact: true });
const finishPresentation = (page: Page) => page.getByRole("dialog", { name: "Apresentação registrada", exact: true })
  .getByRole("button", { name: "Concluir", exact: true }).click();

test("apresentações recuperam criação própria, preservam versões e estoque, e recusam código duplicado sem apagar o formulário", async ({ page }, info) => {
  test.setTimeout(180_000);
  const f = await setup(), before = ledger(f.patient);
  await login(page, f.patient);
  await page.goto("/unidades?careRecipientId=" + f.patient);
  const add = page.getByRole("button", { name: "Adicionar apresentação", exact: true });
  const drawer = page.getByRole("dialog", { name: "Nova apresentação", exact: true });
  await add.click();
  await drawer.getByLabel("Código de barras", { exact: true }).fill("0123456789012");
  await expect(drawer.getByRole("button", { name: "Salvar preenchimento privado", exact: true })).toHaveCount(0);
  await drawer.getByRole("button", { name: "Fechar edição", exact: true }).click();
  await page.reload();
  await add.click();
  await expect(drawer.getByLabel("Código de barras", { exact: true })).toHaveValue("");
  await chooseProduct(page, "Material fictício V4 0");
  await drawer.getByLabel("Nome da apresentação", { exact: true }).fill("Pacote fictício com dez unidades");
  await drawer.getByLabel("Código de barras", { exact: true }).fill("0123456789012");
  await drawer.getByLabel("Quantidade na unidade base", { exact: true }).fill("10");

  const attempts: { intent: unknown }[] = [];
  await page.route("**" + catalogueCommand, async route => {
    if (route.request().method() !== "POST") return route.continue();
    attempts.push(route.request().postDataJSON());
    if (attempts.length === 1) {
      const result = await route.fetch();
      expect(result.ok(), await result.text()).toBe(true);
      await route.abort("failed");
    } else await route.continue();
  });
  await drawer.getByRole("button", { name: "Revisar apresentação", exact: true }).click();
  await presentationReview(page).getByRole("button", { name: "Confirmar apresentação", exact: true }).click();
  const recovery = page.getByRole("dialog", { name: "A resposta da edição não chegou", exact: true });
  await expect(recovery).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Conferir resultado pendente", exact: true }).click();
  await recovery.getByRole("button", { name: "Conferir resultado", exact: true }).click();
  await finishPresentation(page);
  expect(attempts).toHaveLength(2);
  expect(attempts[1]).toEqual({ ...attempts[0], intent: null });
  await page.unroute("**" + catalogueCommand);

  const row = page.getByRole("button", { name: /Material fictício V4 0 · Pacote fictício com dez unidades/ });
  await row.click();
  const editor = page.getByRole("dialog", { name: "Apresentação da embalagem", exact: true });
  if (info.project.name === "chromium") {
    for (const width of [360, 412]) {
      await page.setViewportSize({ width, height: 920 });
      await editor.screenshot({ path: info.outputPath("apresentacao-" + width + ".png") });
    }
  }
  await editor.getByRole("button", { name: /^Histórico de equivalências/ }).click();
  const versions = page.getByRole("dialog", { name: "Histórico de equivalências", exact: true });
  await expect(versions).toContainText("1 embalagem = 10 unidade");
  await versions.getByRole("button", { name: "Voltar", exact: true }).click();
  await editor.getByRole("switch", { name: "Disponível para novas escolhas", exact: true }).uncheck();
  await editor.getByRole("button", { name: "Revisar apresentação", exact: true }).click();
  await presentationReview(page).getByRole("button", { name: "Confirmar apresentação", exact: true }).click();
  await finishPresentation(page);
  await expect(editor).toHaveCount(0);
  await expect(page.getByRole("searchbox", { name: "Pesquisar apresentações", exact: true })).toBeFocused();
  await page.getByRole("combobox", { name: "Situação das apresentações", exact: true }).selectOption("inactive");
  await expect(row).toBeVisible();
  await row.click();
  await editor.getByRole("button", { name: /^Histórico de equivalências/ }).click();
  await expect(versions.getByRole("heading", { name: /^Versão 2/ })).toBeVisible();
  await expect(versions.getByRole("heading", { name: /^Versão 1/ })).toBeVisible();
  await versions.getByRole("button", { name: "Voltar", exact: true }).click();
  await editor.getByRole("button", { name: "Voltar", exact: true }).click();

  await add.click();
  await chooseProduct(page, "Material fictício V4 1");
  const name = drawer.getByLabel("Nome da apresentação", { exact: true });
  await name.fill("Outro pacote fictício");
  await drawer.getByLabel("Código de barras", { exact: true }).fill("0123456789012");
  await drawer.getByLabel("Quantidade na unidade base", { exact: true }).fill("2");
  await drawer.getByRole("button", { name: "Revisar apresentação", exact: true }).click();
  await presentationReview(page).getByRole("button", { name: "Confirmar apresentação", exact: true }).click();
  const rejected = page.getByRole("dialog", { name: "Não foi possível salvar a apresentação", exact: true });
  await expect(rejected).toBeVisible();
  await rejected.getByRole("button", { name: "Voltar", exact: true }).click();
  await expect(name).toHaveValue("Outro pacote fictício");
  await expect(drawer.getByLabel("Código de barras", { exact: true })).toHaveValue("0123456789012");
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 940 });
    await name.focus();
    await audit(page, "presentation-editor-" + width);
  }
  await drawer.screenshot({ path: info.outputPath("presentation-editor.png"), animations: "disabled" });
  expect(ledger(f.patient)).toBe(before);
});

test("edição obsoleta compara o fator atual e só adota a referência por ação explícita; leitura não abre campos editáveis", async ({ page }) => {
  const f = await seed(), before = ledger(f.patient);
  await login(page, f.patient);
  await page.goto("/unidades?careRecipientId=" + f.patient);
  const row = page.getByRole("button", { name: /Material fictício V4 0 · Pacote fictício com dez unidades/ });
  await row.click();
  const drawer = page.getByRole("dialog", { name: "Apresentação da embalagem", exact: true });
  const factor = drawer.getByLabel("Quantidade na unidade base", { exact: true });
  await factor.fill("11");
  await drawer.getByRole("button", { name: "Revisar apresentação", exact: true }).click();
  await rpc(f.admin, "catalogue_presentation_command", edit(f, 1));
  await presentationReview(page).getByRole("button", { name: "Confirmar apresentação", exact: true }).click();
  await page.getByRole("dialog", { name: "Não foi possível salvar a apresentação", exact: true })
    .getByRole("button", { name: "Conferir cadastro atual", exact: true }).click();
  const comparison = page.getByRole("dialog", { name: "Referência atual da apresentação", exact: true });
  await expect(comparison).toContainText("1 embalagem = 12 unidade");
  await comparison.getByRole("button", { name: "Usar referência atual", exact: true }).click();
  await expect(factor).toHaveValue("11");
  await drawer.getByRole("button", { name: "Revisar apresentação", exact: true }).click();
  await presentationReview(page).getByRole("button", { name: "Confirmar apresentação", exact: true }).click();
  await finishPresentation(page);
  await expect(drawer).toHaveCount(0);
  expect(sql("select base_quantity::text from public.product_presentations where id=" + sqlLiteral(f.presentation))).toBe("11.000000");
  sql("insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(" +
    sqlLiteral(f.patient) + "," + sqlLiteral(fixtures.adminA.id) + ",'catalog.manage',false)");
  await page.reload();
  await expect(page.getByRole("button", { name: "Adicionar apresentação", exact: true })).toHaveCount(0);
  await row.click();
  await expect(factor).toHaveCount(0);
  await expect(drawer.getByText("1 embalagem = 11 unidade", { exact: true })).toBeVisible();
  expect(ledger(f.patient)).toBe(before);
});

test("gravação não concluída confirma ausência e permite salvar os mesmos campos em nova tentativa", async ({ page }) => {
  const f = await setup(), name = "Embalagem após resposta perdida";
  await login(page, f.patient);
  await page.goto("/unidades?careRecipientId=" + f.patient);
  await page.getByRole("button", { name: "Adicionar apresentação", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "Nova apresentação", exact: true });
  await chooseProduct(page, "Material fictício V4 0");
  await editor.getByLabel("Nome da apresentação", { exact: true }).fill(name);
  await editor.getByLabel("Código de barras", { exact: true }).fill("01234565");
  await editor.getByLabel("Quantidade na unidade base", { exact: true }).fill("4");
  const attempts: { key: string; intent: unknown }[] = [];
  await page.route("**" + catalogueCommand, async route => {
    if (route.request().method() !== "POST") return route.continue();
    attempts.push(route.request().postDataJSON());
    if (attempts.length === 1) await route.abort("failed");
    else await route.continue();
  });
  const confirm = async () => {
    await editor.getByRole("button", { name: "Revisar apresentação", exact: true }).click();
    await presentationReview(page).getByRole("button", { name: "Confirmar apresentação", exact: true }).click();
  };
  await confirm();
  await page.getByRole("dialog", { name: "A resposta da edição não chegou", exact: true })
    .getByRole("button", { name: "Conferir resultado", exact: true }).click();
  const closed = page.getByRole("dialog", { name: "Gravação não concluída", exact: true });
  await expect(closed).toContainText("esta tentativa não alterou o catálogo");
  const count = () => sql("select count(*) from public.product_presentations where care_recipient_id=" + sqlLiteral(f.patient));
  expect(count()).toBe("0");
  await closed.getByRole("button", { name: "Concluir", exact: true }).click();
  await expect(editor.getByLabel("Nome da apresentação", { exact: true })).toHaveValue(name);
  await expect(editor.getByLabel("Código de barras", { exact: true })).toHaveValue("01234565");
  await expect(editor.getByLabel("Quantidade na unidade base", { exact: true })).toHaveValue("4");
  await confirm();
  await finishPresentation(page);
  expect(attempts).toHaveLength(3);
  expect(attempts[1]).toEqual({ ...attempts[0], intent: null });
  expect(attempts[2].key).not.toBe(attempts[0].key);
  expect(attempts[2].intent).toEqual(attempts[0].intent);
  expect(count()).toBe("1");
});

test("conversão emitida mantém dois pacotes de dez após fator doze e recupera a mesma intenção sem crédito duplicado", async ({
  page,
}, info) => {
  test.setTimeout(170_000);
  const f = await seed();
  await loginToPurchaseWizard(page, f.patient);
  await wizard(page);
  await review(page);
  const attempts: { idempotencyKey: string }[] = [];
  await page.route("**/api/documents", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    attempts.push(route.request().postDataJSON());
    if (attempts.length === 1) {
      const result = await route.fetch();
      expect(result.ok(), await result.text()).toBe(true);
      await rpc(f.admin, "catalogue_presentation_command", edit(f, 1));
      await route.abort("failed");
    } else await route.continue();
  });
  const lookups: { idempotencyKey: string }[] = [];
  await page.route("**/api/drafts/issuance/reconcile", async route => {
    lookups.push(route.request().postDataJSON());
    if (lookups.length === 1) {
      await route.fulfill({ status: 503, json: { code: "DATABASE_UNAVAILABLE", error: "Consulta indisponível" } });
    } else await route.continue();
  });
  await page
    .getByRole("button", { name: "Emitir compra", exact: true })
    .click();
  const uncertain = page.getByRole("dialog", { name: "Envio sem confirmação", exact: true });
  await expect(uncertain).toContainText("O preenchimento foi guardado antes do envio.");
  await info.attach("E05-16 envio sem confirmação", { body: await uncertain.screenshot(), contentType: "image/png" });
  await uncertain.getByRole("button", { name: "Verificar confirmação", exact: true }).click();
  const failed = page.getByRole("dialog", { name: "Não foi possível consultar o envio", exact: true });
  await expect(failed).toContainText("mesma tentativa");
  await info.attach("E05-16 consulta indisponível", { body: await failed.screenshot(), contentType: "image/png" });
  await failed.getByRole("button", { name: "Tentar novamente", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Compra emitida", exact: true }),
  ).toBeVisible({ timeout: 65_000 });
  expect(attempts).toHaveLength(1);
  expect(lookups).toHaveLength(2);
  expect(lookups[0]).toEqual(lookups[1]);
  expect(lookups[1].idempotencyKey).toBe(attempts[0].idempotencyKey);
  const id = sql(
    `select id from public.operational_documents where care_recipient_id=${sqlLiteral(f.patient)};`,
  );
  const response = await page.request.get("/api/documents/" + id);
  expect(response.ok()).toBe(true);
  let document = (await response.json()).data;
  expect(document.lines[0].quantity).toBe(20);
  expect(document.lines[0].presentation_conversions).toEqual([
    expect.objectContaining({
      barcode: "0123456789012",
      packages: "2",
      baseQuantity: "10",
      convertedQuantity: "20",
      version: 1,
    }),
  ]);
  document = await rpc(f.admin, "supply_document_command", {
    p_id: id,
    p_action: "purchase",
    p_body: { lines: [{ lineId: document.lines[0].id, quantity: "20" }] },
    p_key: randomUUID(),
    p_version: document.version,
  });
  document = await rpc(f.admin, "supply_document_command", {
    p_id: id,
    p_action: "receive",
    p_body: { lines: [{ lineId: document.lines[0].id, quantity: "20" }] },
    p_key: randomUUID(),
    p_version: document.version,
  });
  expect(
    sql(
      `select sum(quantity)::text from public.stock_movements where care_recipient_id=${sqlLiteral(f.patient)} and reference_type='purchase_receipt';`,
    ),
  ).toBe("20.000000");
  await page.goto("/fichas/" + id);
  await selectDocumentSection(page, "materials");
  const material = document.lines[0].name_snapshot;
  await page.getByRole("button", { name: "Detalhes de " + material, exact: true }).click();
  const details = page.getByRole("dialog", { name: material, exact: true });
  await expect(
    details.getByText(/código 0123456789012.*2 × 10 unidade = 20 unidade.*v1/),
  ).toBeVisible();
  await details.getByRole("button", { name: "Fechar diálogo", exact: true }).click();
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 940 });
    await page.evaluate(() => {
      if (document.activeElement instanceof HTMLElement)
        document.activeElement.blur();
      window.scrollTo(0, 0);
    });
    await audit(page, "presentation-issued-" + width);
  }
  const pdf = await generatedPdf(page, `/api/documents/${id}/pdf`);
  expect(pdf.status()).toBe(200);
  const bytes = await pdf.body();
  mkdirSync("output/pdf/phase-d", { recursive: true });
  const base = `output/pdf/phase-d/presentation-provenance-${id}-v${document.version}`;
  writeFileSync(base + ".pdf", bytes);
  writeFileSync(
    base + "-source.json",
    JSON.stringify(
      {
        id,
        sha256: createHash("sha256").update(bytes).digest("hex"),
        document,
      },
      null,
      2,
    ),
  );
  mkdirSync("output/playwright/phase-d", { recursive: true });
  await page.screenshot({
    path: `output/playwright/phase-d/presentation-issued-${id}-${info.project.name}.png`,
    fullPage: true,
    animations: "disabled",
  });
});

test("nova emissão com fator obsoleto conserva a escolha e exige comparação antes de calcular 24", async ({
  page,
}, info) => {
  const f = await seed();
  if (info.project.use.hasTouch) await page.setViewportSize({ width: 320, height: 740 });
  await loginToPurchaseWizard(page, f.patient);
  await wizard(page);
  if (info.project.use.hasTouch) await info.attach("COM · total na linha a 320 px", {
    body: await page.screenshot({ animations: "disabled", scale: "css" }), contentType: "image/png",
  });
  await rpc(f.admin, "catalogue_presentation_command", edit(f, 1));
  await review(page);
  await page
    .getByRole("button", { name: "Emitir compra", exact: true })
    .click();
  await expect(
    page.getByText(/A apresentação mudou ou ficou indisponível/),
  ).toBeVisible();
  await page.getByRole("button", { name: "Voltar", exact: true }).click();
  await page.getByRole("button", { name: "Voltar", exact: true }).click();
  await page.getByRole("button", { name: "Voltar", exact: true }).click();
  await expect(page.getByRole("button", { name: /^Higiene/ })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Ler código", exact: true }).click();
  const scanner = page.getByRole("dialog", { name: "Ler código", exact: true });
  await scanner.getByLabel("Código manual").fill("0123456789012");
  await scanner.getByRole("button", { name: "Identificar", exact: true }).click();
  await expect(scanner.getByText(/O fator cadastrado mudou/)).toBeVisible();
  await expect(scanner.getByRole("button", { name: "Usar material", exact: true })).toBeDisabled();
  await scanner.getByRole("button", { name: "Voltar", exact: true }).click();
  const { editor } = await openPackageEditor(page);
  await editor
    .getByRole("button", {
      name: "Atualizar embalagens de Material fictício V4 0",
      exact: true,
    })
    .click();
  await expect(editor.getByText(/Cadastro atual v2/)).toBeVisible();
  await expect(
    editor.getByText("Quantidade total calculada:", { exact: false }),
  ).toContainText("20 unidade");
  if (info.project.use.hasTouch) await info.attach("COM · comparação de fatores a 320 px", {
    body: await editor.screenshot({ animations: "disabled", scale: "css" }), contentType: "image/png",
  });
  await editor
    .getByRole("button", {
      name: "Adotar fator atual de Pacote fictício com dez unidades",
      exact: true,
    })
    .click();
  await expect(
    editor.getByText("Quantidade total calculada:", { exact: false }),
  ).toContainText("24 unidade");
  await editor.getByRole("button", { name: "Voltar ao material", exact: true }).click();
  await review(page);
  await page
    .getByRole("button", { name: "Emitir compra", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Compra emitida", exact: true }),
  ).toBeVisible({ timeout: 65_000 });
  expect(
    sql(
      `select quantity::text from public.document_lines where care_recipient_id=${sqlLiteral(f.patient)};`,
    ),
  ).toBe("24.000000");
});
