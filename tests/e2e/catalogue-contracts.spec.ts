import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { setup, rpc, fixtures } from "../integration/v4-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";

async function login(page: Page, patient: string) {
  await page.goto("/login");
  await page
    .getByLabel("E-mail", { exact: true })
    .fill(fixtures.professional.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Visão geral", exact: true }),
  ).toBeVisible();
  await selectContext(page, patient);
}

test("delegado do catálogo usa as duas rotas equivalentes sem administrar vínculos; fatores inválidos não deixam alterações", async ({
  page,
}) => {
  const f = await setup();
  sql(
    `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${sqlLiteral(f.patient)},${sqlLiteral(fixtures.professional.id)},'catalog.manage',true);`,
  );
  await login(page, f.patient);
  const context = (await (await page.request.get("/api/context")).json()).data;
  const capabilities = context.patients.find(
    (p: { id: string }) => p.id === f.patient,
  ).capabilities;
  expect(capabilities["catalog.manage"]).toBe(true);
  expect(capabilities["access.manage"]).toBe(false);
  const payload = {
    careRecipientId: f.patient,
    id: null,
    name: "Líquido delegado " + randomUUID().slice(0, 8),
    category: "higiene",
    unit: "mL",
    aliases: [],
    isActive: true,
    sortOrder: 0,
  };
  const admin = await page.request.post("/api/admin", {
    data: { ...payload, action: "product" },
  });
  expect(admin.ok(), await admin.text()).toBe(true);
  const id = (await admin.json()).data.product_id as string;
  const edited = { ...payload, id, name: payload.name + " revisado" };
  const alias = await page.request.post("/api/catalog", { data: edited });
  expect(alias.status(), await alias.text()).toBe(200);
  expect((await alias.json()).data.product_id).toBe(id);
  const presentation = {
    careRecipientId: f.patient,
    productId: id,
    unit: "mL",
    decimals: 1,
    barcode: "0123456789012",
    name: "Embalagem de 1,5 mL",
    baseQuantity: "1.5",
  };
  const valid = await page.request.post("/api/catalog/presentations", {
    data: presentation,
  });
  expect(valid.ok(), await valid.text()).toBe(true);
  const before = sql(
    `select jsonb_agg(to_jsonb(p) order by id) from public.product_presentations p where care_recipient_id=${sqlLiteral(f.patient)};`,
  );
  for (const factor of ["NaN", "Infinity", "-1", "0", "0.0000001", null]) {
    expect(
      (
        await page.request.post("/api/catalog/presentations", {
          data: { ...presentation, baseQuantity: factor },
        })
      ).status(),
    ).toBe(400);
    expect(
      sql(
        `select jsonb_agg(to_jsonb(p) order by id) from public.product_presentations p where care_recipient_id=${sqlLiteral(f.patient)};`,
      ),
    ).toBe(before);
  }
  const read = await page.request.get(
    `/api/catalog/presentations?careRecipientId=${f.patient}&barcode=0123456789012`,
  );
  expect(read.ok()).toBe(true);
  expect((await read.json()).data).toEqual([
    expect.objectContaining({
      barcode: "0123456789012",
      base_quantity: 1.5,
      product_id: id,
    }),
  ]);
  expect(
    (
      await page.request.get(
        `/api/admin?careRecipientId=${f.patient}&section=memberships`,
      )
    ).status(),
  ).toBe(403);
  sql(
    `update public.capability_overrides set enabled=false where care_recipient_id=${sqlLiteral(f.patient)} and subject_user=${sqlLiteral(fixtures.professional.id)} and capability='catalog.manage';`,
  );
  for (const [url, data] of [
    ["/api/admin", { ...edited, action: "product" }],
    ["/api/catalog", edited],
    ["/api/catalog/presentations", presentation],
  ] as const)
    expect((await page.request.post(url, { data })).status()).toBe(403);
  expect(
    sql(
      `select name from public.care_recipient_products where care_recipient_id=${sqlLiteral(f.patient)} and product_id=${sqlLiteral(id)};`,
    ),
  ).toBe(edited.name);
});

test("apresentação fracionária pode ser configurada na interface existente por delegado legítimo", async ({
  page,
}) => {
  const f = await setup();
  const product = await rpc(f.admin, "admin_upsert_recipient_product", {
    p_care_recipient_id: f.patient,
    p_product_id: null,
    p_name: "Líquido fracionário da interface",
    p_category: "higiene",
    p_unit: "mL",
    p_aliases: [],
    p_is_active: true,
  });
  sql(
    `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${sqlLiteral(f.patient)},${sqlLiteral(fixtures.professional.id)},'catalog.manage',true);`,
  );
  await login(page, f.patient);
  await page.goto("/unidades?careRecipientId=" + f.patient);
  await page
    .getByRole("button", { name: "Configurar unidade e precisão", exact: true })
    .click();
  const drawer = page.getByRole("dialog", {
    name: "Unidade base e precisão",
    exact: true,
  });
  await drawer
    .getByRole("combobox", { name: "Produto", exact: true })
    .selectOption(product.product_id);
  await drawer.getByLabel("Precisão do produto", { exact: true }).fill("1");
  await drawer
    .getByRole("button", { name: "Salvar unidade / precisão", exact: true })
    .click();
  await expect(drawer).toHaveCount(0);
  await page
    .getByRole("button", { name: "Nova apresentação", exact: true })
    .click();
  const presentation = page.getByRole("dialog", {
    name: "Nova apresentação",
    exact: true,
  });
  const combo = presentation.getByRole("combobox", {
    name: "Material da apresentação",
    exact: true,
  });
  await combo.fill("Líquido fracionário da interface");
  await combo.press("ArrowDown");
  await page
    .getByRole("option", { name: /Líquido fracionário da interface/ })
    .click();
  await presentation
    .getByLabel("Código da apresentação", { exact: false })
    .fill("0123456789012");
  await presentation
    .getByLabel("Nome da apresentação", { exact: true })
    .fill("Frasco fracionário fictício");
  await presentation
    .getByLabel("Fator na unidade base", { exact: false })
    .fill("1.5");
  await presentation
    .getByRole("button", { name: "Revisar apresentação", exact: true })
    .click();
  await presentation
    .getByRole("button", { name: "Confirmar apresentação", exact: true })
    .click();
  await expect(presentation).toHaveCount(0);
  expect(
    sql(
      `select base_quantity::text from public.product_presentations where care_recipient_id=${sqlLiteral(f.patient)} and product_id=${sqlLiteral(product.product_id)};`,
    ),
  ).toBe("1.500000");
});
