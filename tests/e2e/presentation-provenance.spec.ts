import { selectDocumentSection } from "./document-sections";
import { generatedPdf } from "./generated-pdf";
import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { randomUUID, createHash } from "node:crypto";
import { setup, rpc, fixtures } from "../integration/v4-fixtures.mjs";
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
  const next = page.getByRole("button", { name: "Iniciar outro preenchimento", exact: true });
  await expect(combo.or(next).first()).toBeVisible();
  if (await next.isVisible()) await next.click();
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
async function wizard(page: Page, patient: string) {
  await page.goto("/fichas/com?careRecipientId=" + patient);
  await page
    .getByLabel("Forma de aquisição", { exact: false })
    .selectOption("purchase");
  await page.getByRole("button", { name: "Avançar", exact: true }).click();
  await page.getByRole("button", { name: "Avançar", exact: true }).click();
  await page.getByRole("checkbox", { name: /Material fictício V4 0/ }).check();
  const combo = page.getByRole("combobox", {
    name: "Apresentação de Material fictício V4 0",
    exact: true,
  });
  await combo.fill("Pacote fictício");
  await combo.press("ArrowDown");
  await page
    .getByRole("option", { name: /Pacote fictício com dez unidades/ })
    .click();
  await page
    .getByRole("button", {
      name: /Adicionar embalagem de Material fictício V4 0/,
    })
    .click();
  await page
    .getByLabel("Embalagens — Pacote fictício com dez unidades", {
      exact: true,
    })
    .fill("2");
  await expect(
    page.getByText("Quantidade total calculada:", { exact: false }),
  ).toContainText("20 unidade");
}
async function review(page: Page) {
  await page.getByRole("button", { name: "Avançar", exact: true }).click();
  await page.getByRole("button", { name: "Avançar", exact: true }).click();
  await page.getByRole("button", { name: "Revisar", exact: true }).click();
}

test("apresentações recuperam criação própria, preservam versões e estoque, e recusam código duplicado sem apagar o formulário", async ({
  page,
}, info) => {
  const f = await setup(),
    before = ledger(f.patient);
  await login(page, f.patient);
  await page.goto("/unidades?careRecipientId=" + f.patient);
  await page
    .getByRole("button", { name: "Nova apresentação", exact: true })
    .click();
  await chooseProduct(page, "Material fictício V4 0");
  const drawer = page.getByRole("dialog", {
    name: "Nova apresentação",
    exact: true,
  });
  await drawer
    .getByLabel("Nome da apresentação", { exact: true })
    .fill("Pacote fictício com dez unidades");
  await drawer
    .getByLabel("Código da apresentação", { exact: false })
    .fill("0123456789012");
  await drawer.getByLabel("Fator na unidade base", { exact: false }).fill("10");
  await drawer.getByRole("button", { name: "Salvar preenchimento privado", exact: true }).click();
  await expect(drawer.getByText(/Preenchimento privado salvo/)).toBeVisible();
  await drawer.getByRole("button", { name: "Fechar edição", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "Nova apresentação", exact: true }).click();
  await expect(drawer.getByLabel("Fator na unidade base", { exact: false })).toHaveValue("10");
  await expect(drawer.getByLabel("Código da apresentação", { exact: false })).toHaveValue("0123456789012");
  await expect(drawer.getByRole("combobox", { name: "Material da apresentação", exact: true })).toHaveValue("Material fictício V4 0");
  const attempts: unknown[] = [];
  await page.route("**/api/catalog/presentations", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    attempts.push(route.request().postDataJSON());
    if (attempts.length === 1) {
      const result = await route.fetch();
      expect(result.ok(), await result.text()).toBe(true);
      await route.abort("failed");
    } else await route.continue();
  });
  await drawer
    .getByRole("button", { name: "Revisar apresentação", exact: true })
    .click();
  await drawer
    .getByRole("button", { name: "Confirmar apresentação", exact: true })
    .click();
  await expect(
    drawer.getByRole("button", { name: "Fechar edição", exact: true }),
  ).toBeDisabled();
  await expect(
    drawer.getByRole("button", { name: "Voltar aos campos", exact: true }),
  ).toBeDisabled();
  await drawer
    .getByRole("button", { name: "Recuperar apresentação", exact: true })
    .click();
  await expect(drawer).toHaveCount(0);
  expect(attempts).toHaveLength(2);
  expect(attempts[0]).toEqual(attempts[1]);
  await page.unroute("**/api/catalog/presentations");
  await page
    .getByRole("button", {
      name: "Consultar Pacote fictício com dez unidades",
      exact: true,
    })
    .click();
  const editor = page.getByRole("dialog", {
    name: "Apresentação e histórico",
    exact: true,
  });
  await expect(
    editor.getByRole("region", {
      name: "Histórico da apresentação",
      exact: true,
    }),
  ).toContainText("10");
  await editor
    .getByLabel("Apresentação ativa para novas escolhas", { exact: true })
    .uncheck();
  await editor
    .getByRole("button", { name: "Revisar apresentação", exact: true })
    .click();
  await editor
    .getByRole("button", { name: "Confirmar apresentação", exact: true })
    .click();
  await expect(editor).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Atualizar apresentações", exact: true }),
  ).toBeFocused();
  await page
    .getByRole("combobox", { name: "Situação das apresentações", exact: true })
    .selectOption("inactive");
  await expect(
    page.getByRole("button", {
      name: "Consultar Pacote fictício com dez unidades",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Nova apresentação", exact: true })
    .click();
  await chooseProduct(page, "Material fictício V4 1");
  await drawer
    .getByLabel("Nome da apresentação", { exact: true })
    .fill("Outro pacote fictício");
  await drawer
    .getByLabel("Código da apresentação", { exact: false })
    .fill("0123456789012");
  await drawer.getByLabel("Fator na unidade base", { exact: false }).fill("2");
  await drawer
    .getByRole("button", { name: "Revisar apresentação", exact: true })
    .click();
  await drawer
    .getByRole("button", { name: "Confirmar apresentação", exact: true })
    .click();
  await expect(
    drawer.getByLabel("Nome da apresentação", { exact: true }),
  ).toHaveValue("Outro pacote fictício");
  await expect(
    drawer.getByLabel("Código da apresentação", { exact: false }),
  ).toHaveValue("0123456789012");
  await expect(
    drawer.getByLabel("Nome da apresentação", { exact: true }),
  ).toBeFocused();
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 940 });
    await drawer.getByLabel("Nome da apresentação", { exact: true }).focus();
    await audit(page, "presentation-editor-" + width);
  }
  mkdirSync("output/playwright/phase-d", { recursive: true });
  await page.screenshot({
    path: `output/playwright/phase-d/presentation-editor-${f.patient}-${info.project.name}.png`,
    animations: "disabled",
  });
  expect(ledger(f.patient)).toBe(before);
});

test("edição obsoleta compara o fator atual e só adota a referência por ação explícita; leitura não abre campos editáveis", async ({
  page,
}) => {
  const f = await seed(),
    before = ledger(f.patient);
  await login(page, f.patient);
  await page.goto("/unidades?careRecipientId=" + f.patient);
  await page
    .getByRole("button", {
      name: "Consultar Pacote fictício com dez unidades",
      exact: true,
    })
    .click();
  const drawer = page.getByRole("dialog", {
    name: "Apresentação e histórico",
    exact: true,
  });
  await drawer.getByLabel("Fator na unidade base", { exact: false }).fill("11");
  await rpc(f.admin, "catalogue_presentation_command", edit(f, 1));
  await drawer
    .getByRole("button", { name: "Revisar apresentação", exact: true })
    .click();
  await drawer
    .getByRole("button", { name: "Confirmar apresentação", exact: true })
    .click();
  await expect(
    drawer.getByLabel("Fator na unidade base", { exact: false }),
  ).toHaveValue("11");
  await expect(
    drawer.getByText("Você editou v1; cadastro atual v2.", { exact: true }),
  ).toBeVisible();
  await drawer
    .getByRole("button", {
      name: "Adotar referência atual e manter meus campos",
      exact: true,
    })
    .click();
  await expect(
    drawer.getByLabel("Fator na unidade base", { exact: false }),
  ).toHaveValue("11");
  await drawer
    .getByRole("button", { name: "Revisar apresentação", exact: true })
    .click();
  await drawer
    .getByRole("button", { name: "Confirmar apresentação", exact: true })
    .click();
  await expect(drawer).toHaveCount(0);
  expect(
    sql(
      `select base_quantity::text from public.product_presentations where id=${sqlLiteral(f.presentation)};`,
    ),
  ).toBe("11.000000");
  sql(
    `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${sqlLiteral(f.patient)},${sqlLiteral(fixtures.adminA.id)},'catalog.manage',false);`,
  );
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Nova apresentação", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", {
      name: "Consultar Pacote fictício com dez unidades",
      exact: true,
    })
    .click();
  await expect(
    drawer.getByLabel("Fator na unidade base", { exact: false }),
  ).toHaveCount(0);
  await expect(drawer.getByText("11 unidade", { exact: true })).toBeVisible();
  expect(ledger(f.patient)).toBe(before);
});

test("conversão emitida mantém dois pacotes de dez após fator doze e recupera a mesma intenção sem crédito duplicado", async ({
  page,
}, info) => {
  const f = await seed();
  await login(page, f.patient);
  await wizard(page, f.patient);
  await review(page);
  const attempts: unknown[] = [];
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
  await page
    .getByRole("button", { name: "Confirmar e concluir", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Recuperar esta tentativa", exact: true })
    .click();
  await expect(
    page.getByText("Documento persistido", { exact: true }),
  ).toBeVisible();
  expect(attempts).toHaveLength(2);
  expect(attempts[0]).toEqual(attempts[1]);
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
  await expect(
    page.getByText(/código 0123456789012.*2 × 10 unidade = 20 unidade.*v1/),
  ).toBeVisible();
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
}) => {
  const f = await seed();
  await login(page, f.patient);
  await wizard(page, f.patient);
  await rpc(f.admin, "catalogue_presentation_command", edit(f, 1));
  await review(page);
  await page
    .getByRole("button", { name: "Confirmar e concluir", exact: true })
    .click();
  await expect(
    page.getByText(/A apresentação mudou ou ficou indisponível/),
  ).toBeVisible();
  await page.getByRole("button", { name: "Voltar", exact: true }).click();
  await page.getByRole("button", { name: "Voltar", exact: true }).click();
  await page.getByRole("button", { name: "Voltar", exact: true }).click();
  await page
    .getByRole("button", {
      name: "Atualizar embalagens de Material fictício V4 0",
      exact: true,
    })
    .click();
  await expect(page.getByText(/Cadastro atual v2/)).toBeVisible();
  await expect(
    page.getByText("Quantidade total calculada:", { exact: false }),
  ).toContainText("20 unidade");
  await page
    .getByRole("button", {
      name: "Adotar fator atual de Pacote fictício com dez unidades",
      exact: true,
    })
    .click();
  await expect(
    page.getByText("Quantidade total calculada:", { exact: false }),
  ).toContainText("24 unidade");
  await review(page);
  await page
    .getByRole("button", { name: "Confirmar e concluir", exact: true })
    .click();
  await expect(
    page.getByText("Documento persistido", { exact: true }),
  ).toBeVisible();
  expect(
    sql(
      `select quantity::text from public.document_lines where care_recipient_id=${sqlLiteral(f.patient)};`,
    ),
  ).toBe("24.000000");
});
