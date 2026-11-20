import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { actor, fixtures, rpc, setup } from "../integration/v4-fixtures.mjs";
import { shiftWorker } from "../integration/shift-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { loginDecision, noPrivateWrites } from "./l1-decision-policy";

test.setTimeout(150_000);

test("L2 abertura da REQ separa indisponibilidade, resposta incompleta e acesso negado sem abrir a primeira etapa", async ({ page }, info) => {
  const f = await setup();
  const requester = await shiftWorker(f.patient);
  await loginDecision(page, requester.email, f.patient);
  const writes = noPrivateWrites(page);
  const correlationId = randomUUID();
  let reads = 0;
  await page.route("**/api/catalog?**", async route => {
    reads++;
    if (reads === 2) return route.fulfill({ json: { data: [] } });
    return route.fulfill({
      status: reads === 3 ? 403 : 503,
      json: { code: "CATALOGUE_READ_TEST", error: "Detalhe reservado do teste", correlationId },
    });
  });
  await page.goto("/fichas/req");
  const unavailable = page.getByRole("dialog", { name: "Catálogo indisponível", exact: true });
  const retry = unavailable.getByRole("button", { name: "Tentar novamente", exact: true });
  await expect(unavailable).toBeVisible();
  if (info.project.use.hasTouch) await info.attach("E04-16 falha antes da abertura", {
    body: await page.screenshot({ animations: "disabled", scale: "css" }), contentType: "image/png",
  });
  await expect(page.getByRole("button", { name: "Selecionar materiais", exact: true })).toHaveCount(0);
  const malformed = page.waitForResponse(response => new URL(response.url()).pathname === "/api/catalog" && response.status() === 200);
  await retry.click();
  await malformed;
  await expect(unavailable).toBeVisible();
  await expect(page.getByText("Nenhum material cadastrado", { exact: true })).toHaveCount(0);
  await retry.click();
  const denied = page.getByRole("dialog", { name: "Não foi possível acessar os dados da ficha", exact: true });
  await expect(denied).toBeVisible();
  await expect(denied.getByRole("button", { name: "Tentar novamente", exact: true })).toHaveCount(0);
  await expect(denied.getByText("Detalhe reservado do teste", { exact: true })).toHaveCount(0);
  await denied.getByText("Detalhes para suporte", { exact: true }).click();
  await expect(denied.locator("pre")).toContainText(correlationId);
  await expect(denied.locator("pre")).toContainText("Tentativas de consulta: 2");
  await expect(denied.getByRole("button", { name: "Copiar detalhes", exact: true }).first()).toBeVisible();
  expect(reads).toBe(3);
  expect(writes).toEqual([]);
  await denied.getByRole("button", { name: "Voltar", exact: true }).click();
  await expect(page).toHaveURL(/\/fichas$/);
});

test("L2 abertura distingue catálogo vazio e inativo e oferece cadastro somente a quem administra", async ({ page, browser }, info) => {
  const global = await actor("global");
  const { id: patient } = await rpc(global, "admin_upsert_recipient", {
    p_id: null, p_display_name: "Catálogo fictício vazio " + randomUUID().slice(0, 8),
    p_is_active: true, p_is_development: true,
  });
  sql(`insert into public.care_recipient_memberships(care_recipient_id,user_id,role) values
    (${q(patient)},${q(fixtures.adminA.id)},'admin'),
    (${q(patient)},${q(fixtures.professional.id)},'professional')`);
  expect(sql(`select count(*) from public.care_recipient_products where care_recipient_id=${q(patient)}`)).toBe("0");
  await loginDecision(page, fixtures.adminA.email, patient);
  await page.goto("/fichas/com");
  await expect(page.getByRole("heading", { name: "Catálogo de materiais", level: 1, exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Nenhum material cadastrado", exact: true })).toBeVisible();
  if (info.project.use.hasTouch) await info.attach("E04-16 catálogo vazio do administrador", {
    body: await page.screenshot({ animations: "disabled", scale: "css" }), contentType: "image/png",
  });
  await page.getByRole("link", { name: "Cadastrar material", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Catálogo do paciente", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Novo item", exact: true })).toBeEnabled();

  const context = await browser.newContext();
  try {
    const professional = await context.newPage();
    await loginDecision(professional, fixtures.professional.email, patient);
    await professional.goto("/fichas/req");
    await expect(professional.getByText("Peça ao administrador do paciente para cadastrar os materiais da residência.", { exact: true })).toBeVisible();
    await expect(professional.getByRole("link", { name: "Cadastrar material", exact: true })).toHaveCount(0);
    await expect(professional.getByRole("button", { name: "Selecionar materiais", exact: true })).toHaveCount(0);

    const admin = await actor("adminA", patient);
    await rpc(admin, "admin_upsert_recipient_product", {
      p_care_recipient_id: patient, p_product_id: null, p_name: "Material fictício inativo",
      p_category: "higiene", p_unit: "unidade", p_aliases: [], p_is_active: false,
    });
    await professional.reload();
    await expect(professional.getByRole("heading", { name: "Nenhum material ativo", exact: true })).toBeVisible();
    await expect(professional.getByRole("heading", { name: "Nenhum material cadastrado", exact: true })).toHaveCount(0);
  } finally {
    await context.close();
  }
});

test("L2 abertura da DEV retoma a identificação depois de recuperar a referência de estoque", async ({ page }) => {
  const f = await setup();
  await loginDecision(page, fixtures.adminA.email, f.patient);
  const writes = noPrivateWrites(page);
  let failed = false;
  await page.route("**/api/transfers/preparation?**", route => {
    if (failed) return route.continue();
    failed = true;
    return route.fulfill({ status: 503, json: { code: "REFERENCE_UNAVAILABLE", error: "Falha fictícia de consulta." } });
  });
  await page.goto("/fichas/devolucao");
  await page.getByRole("button", { name: "Preparar devolução", exact: true }).click();
  const modal = page.getByRole("dialog", { name: "Dados da ficha indisponíveis", exact: true });
  await expect(modal).toBeVisible();
  const next = page.getByRole("button", { name: "Selecionar materiais", exact: true });
  await expect(next).toHaveCount(0);
  await modal.getByRole("button", { name: "Tentar novamente", exact: true }).click();
  await expect(page.getByRole("region", { name: "Nova devolução", exact: true })).toBeVisible();
  expect(writes).toEqual([]);
  await page.getByRole("combobox", { name: "Recebedor físico designado", exact: true }).selectOption(fixtures.family.id);
  await page.getByRole("textbox", { name: "Justificativa da escolha do recebedor", exact: true }).fill("Pessoa da família presente para a conferência.");
  await next.click();
  await expect(page.getByRole("button", { name: "Materiais", exact: true })).toHaveAttribute("aria-current", "step");
});
