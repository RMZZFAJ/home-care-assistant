import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { rpc, setup } from "../integration/v4-fixtures.mjs";
import { shiftWorker } from "../integration/shift-fixtures.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { selectContext } from "./auth-context";

test.setTimeout(180_000);

async function fixture() {
  const name = "Material utilizado no plantão";
  const f = await setup({ catalogue: [{ name, category: "higiene", unit: "unidade", aliases: [] }] });
  const professional = await shiftWorker(f.patient);
  const delivery = await rpc(f.admin, "create_supply_document", {
    p_patient: f.patient, p_type: "ENT", p_key: randomUUID(), p_draft: false,
    p_payload: {
      source: "FAMILY", destination: "CARE_TEAM", recipientId: professional.id,
      recipientReason: "Materiais previstos para o plantão.",
      lines: [{ productId: f.products[0], quantity: "10" }],
    },
  });
  await rpc(professional.client, "supply_document_command", {
    p_id: delivery.id, p_action: "receive", p_key: randomUUID(), p_version: delivery.version, p_body: { divergences: [] },
  });
  return { ...f, professional, name };
}

async function openConsumption(page: Page, f: Awaited<ReturnType<typeof fixture>>) {
  await page.goto("/login?next=" + encodeURIComponent("/consumo?careRecipientId=" + f.patient));
  await page.getByLabel("E-mail", { exact: true }).fill(f.professional.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Consumo e faltas", exact: true })).toBeVisible({ timeout: 30000 });
  await selectContext(page, f.patient);
}

test("consumo preserva o último rascunho, recupera a baixa e permite correção e cancelamento", async ({ page }) => {
  const f = await fixture();
  const balance = () => sql(`select private.stock_quantity(${q(f.patient)},${q(f.products[0])},'CARE_TEAM')::text`);
  const launch = page.getByRole("button", { name: "Registrar consumo", exact: true });
  await openConsumption(page, f);
  await launch.click();
  const wizard = page.getByRole("dialog", { name: "Registrar consumo", exact: true });
  await wizard.getByRole("button", { name: "Selecionar materiais", exact: true }).click();
  await wizard.getByRole("button", { name: /^Higiene/ }).click();
  await wizard.getByRole("checkbox", { name: f.name, exact: true }).check();
  await wizard.getByRole("textbox", { name: "Quantidade consumida · " + f.name, exact: true }).fill("4");
  await expect(wizard.getByText("Último rascunho salvo.", { exact: true })).toBeVisible();
  expect(Number(balance())).toBe(10);
  await page.reload();
  await launch.click();
  const resume = page.getByRole("dialog", { name: "Continuar o preenchimento?", exact: true });
  await expect(resume.getByText(f.name, { exact: true })).toBeVisible();
  await resume.getByRole("button", { name: "Continuar rascunho", exact: true }).click();
  await wizard.getByRole("button", { name: /^Higiene/ }).click();
  await expect(wizard.getByRole("textbox", { name: "Quantidade consumida · " + f.name, exact: true })).toHaveValue("4");
  await wizard.getByRole("button", { name: "Continuar", exact: true }).click();
  await wizard.getByRole("button", { name: "Continuar", exact: true }).click();
  await wizard.getByRole("textbox", { name: "Observações", exact: true }).fill("Uso registrado durante o plantão.");
  await wizard.getByRole("button", { name: "Revisar consumo", exact: true }).click();
  await expect(wizard.getByText(/Após o consumo · 6/)).toBeVisible();
  await page.route("**/api/consumption/records", async route => {
    const saved = await route.fetch();
    expect(saved.status()).toBe(201);
    await route.abort();
  }, { times: 1 });
  await wizard.getByRole("button", { name: "Registrar consumo", exact: true }).click();
  await wizard.getByRole("button", { name: "Conferir resultado", exact: true }).click();
  const detail = page.getByRole("region", { name: "Detalhe do relato", exact: true });
  await expect(detail.getByText("Registrado", { exact: true })).toBeVisible();
  expect(Number(balance())).toBe(6);
  await detail.getByRole("tab", { name: "Andamentos", exact: true }).click();
  await expect(detail.getByText("Consumo registrado no estoque da equipe", { exact: true })).toBeVisible();
  await detail.getByRole("button", { name: "Novo andamento", exact: true }).click();
  const progress = page.getByRole("dialog", { name: "Novo andamento", exact: true });
  const progressText = "Uso conferido na passagem do plantão.";
  await progress.getByRole("textbox", { name: "Texto do andamento", exact: true }).fill(progressText);
  await progress.getByRole("button", { name: "Registrar andamento", exact: true }).click();
  await expect(detail.getByText(progressText, { exact: true })).toBeVisible();
  expect(Number(balance())).toBe(6);
  await detail.getByRole("tab", { name: "Materiais", exact: true }).click();
  await detail.getByRole("button", { name: "Corrigir consumo", exact: true }).click();
  const correction = page.getByRole("dialog", { name: "Corrigir consumo", exact: true });
  await correction.getByRole("textbox", { name: "Quantidade consumida · " + f.name, exact: true }).fill("3");
  await correction.getByRole("textbox", { name: "Motivo da alteração", exact: true }).fill("Conferência após o término do plantão.");
  await correction.getByRole("button", { name: "Confirmar", exact: true }).click();
  await expect(detail.getByRole("heading", { name: "Correção · versão 2", exact: true })).toBeVisible();
  expect(Number(balance())).toBe(7);
  await detail.getByRole("button", { name: "Cancelar consumo", exact: true }).click();
  const cancellation = page.getByRole("dialog", { name: "Cancelar consumo", exact: true });
  await cancellation.getByRole("textbox", { name: "Motivo da alteração", exact: true }).fill("Registro cancelado pela equipe após conferência.");
  await cancellation.getByRole("button", { name: "Confirmar", exact: true }).click();
  await expect(detail.getByText("Cancelado", { exact: true })).toBeVisible();
  expect(Number(balance())).toBe(10);
});
