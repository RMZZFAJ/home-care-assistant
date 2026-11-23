import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { rpc, setup } from "../integration/v4-fixtures.mjs";
import { shiftWorker } from "../integration/shift-fixtures.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { selectContext } from "./auth-context";
import { audit } from "./accessibility-audit";

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
  return { ...f, professional, name, delivery };
}

async function openConsumption(page: Page, f: Awaited<ReturnType<typeof fixture>>) {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(f.professional.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible();
  await selectContext(page, f.patient);
  await page.goto("/consumo?careRecipientId=" + f.patient);
  await expect(page.getByRole("heading", { name: "Consumo e faltas", exact: true })).toBeVisible();
}

test("consumo preserva o último rascunho, recupera a baixa e permite correção e cancelamento", async ({ page }, info) => {
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
  const material = detail.getByRole("button", { name: "Consultar material " + f.name, exact: true });
  const panel = page.getByRole("dialog", { name: f.name, exact: true });
  await material.click();
  const contextTab = panel.getByRole("tab", { name: /^Nesta ficha · CON-/ });
  await expect(contextTab).toHaveAttribute("aria-selected", "true");
  await expect(panel.getByRole("tab").first()).toHaveAccessibleName(/^Nesta ficha · CON-/);
  await expect(panel.getByRole("heading", { name: "Material nesta ficha", exact: true })).toBeVisible();
  await expect(panel.getByText("10 unidade", { exact: true })).toBeVisible();
  await expect(panel.getByText("−4 unidade", { exact: true })).toBeVisible();
  await expect(panel.getByText("6 unidade", { exact: true })).toBeVisible();
  await audit(page, "material no consumo");
  await info.attach("efeito-do-consumo", { body: await panel.screenshot(), contentType: "image/png" });
  const linked = panel.getByRole("tab", { name: "Fichas", exact: true });
  await linked.click();
  const deliveryLink = panel.getByRole("button", { name: f.delivery.code, exact: true });
  await deliveryLink.click();
  const relation = page.getByRole("dialog", { name: f.delivery.code, exact: true });
  const open = relation.getByRole("link", { name: "Abrir " + f.delivery.code, exact: true });
  await open.click();
  await expect(page.getByRole("tab", { name: "Materiais", exact: true })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("button", { name: "Voltar ao painel", exact: true }).click();
  await expect(open).toBeFocused();
  await relation.getByRole("button", { name: "Voltar ao material", exact: true }).click();
  await expect(deliveryLink).toBeFocused();
  await expect(linked).toHaveAttribute("aria-selected", "true");
  await panel.getByRole("button", { name: "Voltar à ficha", exact: true }).click();
  await expect(material).toBeFocused();
  await expect(detail.getByRole("tab", { name: "Materiais", exact: true })).toHaveAttribute("aria-selected", "true");
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
  await material.click();
  const compensation = panel.locator("section").filter({
    has: page.getByRole("heading", { name: "Compensação do cancelamento · versão 3", exact: true }),
  }).last();
  await expect(compensation.getByText("7 unidade", { exact: true })).toBeVisible();
  await expect(compensation.getByText("+3 unidade", { exact: true })).toBeVisible();
  await expect(compensation.getByText("10 unidade", { exact: true })).toBeVisible();
});

test("consumo compara a revisão mais recente quando o envio é rejeitado por outro editor", async ({ page }) => {
  const f = await fixture();
  const balance = () => Number(sql(`select private.stock_quantity(${q(f.patient)},${q(f.products[0])},'CARE_TEAM')::text`));
  await openConsumption(page, f);
  await page.getByRole("button", { name: "Registrar consumo", exact: true }).click();
  const wizard = page.getByRole("dialog", { name: "Registrar consumo", exact: true });
  await wizard.getByRole("button", { name: "Selecionar materiais", exact: true }).click();
  await wizard.getByRole("button", { name: /^Higiene/ }).click();
  await wizard.getByRole("checkbox", { name: f.name, exact: true }).check();
  await wizard.getByRole("textbox", { name: "Quantidade consumida · " + f.name, exact: true }).fill("4");
  await wizard.getByRole("button", { name: "Continuar", exact: true }).click();
  await wizard.getByRole("button", { name: "Continuar", exact: true }).click();
  await wizard.getByRole("button", { name: "Revisar consumo", exact: true }).click();
  await expect(wizard.getByText(/Após o consumo · 6/)).toBeVisible();
  await expect(wizard.getByText("Último rascunho salvo.", { exact: true })).toBeVisible();

  await page.route("**/api/consumption/records", async route => {
    const requested = route.request().postDataJSON();
    const scope = { careRecipientId: f.patient, purpose: "consumption_report_team", targetResourceId: f.patient };
    const read = await page.request.get("/api/consumption/preparations?" + new URLSearchParams(scope));
    expect(read.status(), await read.text()).toBe(200);
    const { data: draft } = await read.json();
    expect(draft).toMatchObject({ id: requested.draft.id, revision: requested.draft.revision });
    const update = await page.request.post("/api/consumption/preparations", { data: {
      ...scope, kind: "CONSUMPTION", targetDocumentId: null,
      action: "save", id: draft.id, expectedRevision: draft.revision, idempotencyKey: randomUUID(),
      content: { ...draft.content, consumption: { ...draft.content.consumption,
        text: "Revisão concorrente preservada.", lines: [{ productId: f.products[0], name: f.name, unit: "unidade", quantity: "3" }] } },
      navigation: draft.navigation,
    } });
    expect(update.ok(), await update.text()).toBe(true);
    const rejected = await route.fetch();
    expect(rejected.status()).toBe(409);
    expect(await rejected.json()).toMatchObject({ code: "DRAFT_VERSION_CONFLICT" });
    return route.fulfill({ response: rejected });
  }, { times: 1 });
  await wizard.getByRole("button", { name: "Registrar consumo", exact: true }).click();
  await expect(wizard.getByText("O rascunho foi atualizado. Confira a versão mais recente antes de emitir.", { exact: true })).toBeVisible();
  await expect(wizard.getByRole("button", { name: "Conferir resultado", exact: true })).toHaveCount(0);
  const storageKey = `hca:official-team-consumption:${f.professional.id}:${f.patient}`;
  expect(await page.evaluate(key => sessionStorage.getItem(key), storageKey)).toBeNull();
  expect(balance()).toBe(10);
  await page.getByRole("button", { name: "Usar versão salva no servidor", exact: true }).click();
  await expect(wizard.getByRole("textbox", { name: "Quantidade consumida · " + f.name, exact: true })).toHaveValue("3");
  await wizard.getByRole("button", { name: "Continuar", exact: true }).click();
  await wizard.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(wizard.getByRole("textbox", { name: "Observações", exact: true })).toHaveValue("Revisão concorrente preservada.");
  await wizard.getByRole("button", { name: "Revisar consumo", exact: true }).click();
  await expect(wizard.getByText(/Após o consumo · 7/)).toBeVisible();
  await wizard.getByRole("button", { name: "Registrar consumo", exact: true }).click();
  await expect(page.getByRole("region", { name: "Detalhe do relato", exact: true })).toContainText("Registrado");
  expect(balance()).toBe(7);
});
