import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { rpc, setup } from "../integration/v4-fixtures.mjs";
import { shiftWorker } from "../integration/shift-fixtures.mjs";
import { seedFlowSuggestion } from "../integration/flow-preparation-fixtures.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { selectContext } from "./auth-context";
import { openFlowSuggestions } from "./navigation";
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

test("a sugestão do WhatsApp continua no assistente e baixa o estoque uma única vez", async ({ page }, info) => {
  const f = await fixture();
  const original = "Material informado pela equipe na mensagem do plantão.";
  const suggestion = seedFlowSuggestion(f.patient, f.professional.id, [f.products[0]], original);
  const balance = () => Number(sql(`select private.stock_quantity(${q(f.patient)},${q(f.products[0])},'CARE_TEAM')::text`));
  const source = page.getByRole("region", { name: "Sugestões pendentes do Flow", exact: true });
  const launch = source.getByRole("button", { name: "Continuar consumo", exact: true });
  await openConsumption(page, f);
  await expect(source).toHaveCount(0);
  await openFlowSuggestions(page);
  await launch.click();
  const wizard = page.getByRole("dialog", { name: "Continuar consumo", exact: true });
  await expect(wizard.getByRole("region", { name: "Sugestão do WhatsApp", exact: true })).toContainText(original);
  const amount = wizard.getByRole("textbox", { name: "Quantidade consumida · " + f.name, exact: true });
  await expect(wizard.getByRole("checkbox", { name: f.name, exact: true })).toBeChecked();
  await expect(amount).toHaveValue("");
  expect(balance()).toBe(10);
  await amount.fill("3");
  await expect(wizard.getByText("Último rascunho salvo.", { exact: true })).toBeVisible();
  await page.reload();
  await openFlowSuggestions(page);
  await launch.click();
  await page.getByRole("button", { name: "Continuar rascunho", exact: true }).click();
  await expect(amount).toHaveValue("3");
  await expect(wizard.getByRole("region", { name: "Sugestão do WhatsApp", exact: true })).toContainText(original);
  await audit(page, "continuidade da sugestão de consumo");
  await info.attach("sugestao-whatsapp-no-assistente", { body: await wizard.screenshot(), contentType: "image/png" });
  await wizard.getByRole("button", { name: "Continuar", exact: true }).click();
  await wizard.getByRole("button", { name: "Continuar", exact: true }).click();
  await wizard.getByRole("button", { name: "Revisar consumo", exact: true }).click();
  await expect(wizard.getByText(/Após o consumo · 7/)).toBeVisible();
  expect(balance()).toBe(10);
  await page.route("**/api/consumption/records", async route => {
    expect(route.request().postDataJSON()).toMatchObject({ flowSubmissionId: suggestion, action: "issue" });
    const stored = await route.fetch();
    expect(stored.status(), await stored.text()).toBe(201);
    await route.abort();
  }, { times: 1 });
  await wizard.getByRole("button", { name: "Registrar consumo", exact: true }).click();
  await wizard.getByRole("button", { name: "Conferir resultado", exact: true }).click();
  const report = page.getByRole("region", { name: "Detalhe do relato", exact: true });
  await expect(page.getByRole("dialog", { name: "Sugestões do WhatsApp", exact: true })).toHaveCount(0);
  await expect(report.getByText("Sugestão do WhatsApp", { exact: true })).toBeVisible();
  await expect(report.getByText("Registrado", { exact: true })).toBeVisible();
  await expect(launch).toHaveCount(0);
  expect(balance()).toBe(7);
  expect(sql(`select status from public.flow_submissions where id=${q(suggestion)}`)).toBe("confirmed");
});

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
  const open = panel.getByRole("link", { name: "Ver ficha " + f.delivery.code, exact: true });
  await open.click();
  await expect(page.getByRole("tab", { name: "Materiais", exact: true })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("button", { name: "Voltar ao painel", exact: true }).click();
  await expect(open).toBeFocused();
  await expect(deliveryLink).toHaveAttribute("aria-expanded", "true");
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
  await correction.getByRole("button", { name: "Selecionar materiais", exact: true }).click();
  await correction.getByRole("button", { name: /^Higiene/ }).click();
  await correction.getByRole("textbox", { name: "Quantidade consumida · " + f.name, exact: true }).fill("3");
  await correction.getByRole("button", { name: "Continuar", exact: true }).click();
  await correction.getByRole("button", { name: "Continuar", exact: true }).click();
  await correction.getByRole("textbox", { name: "Motivo da correção", exact: true }).fill("Conferência após o término do plantão.");
  await correction.getByRole("button", { name: "Revisar correção", exact: true }).click();
  const impact = correction.getByRole("region", { name: "Impacto da correção no estoque", exact: true });
  await expect(impact).toContainText("Retorno ao saldo · 1 unidade");
  await expect(impact).toContainText("Saldo após a correção · 7 unidade");
  expect(Number(balance())).toBe(6);
  await correction.getByRole("button", { name: "Registrar correção", exact: true }).click();
  await expect(detail.getByRole("heading", { name: "Correção · versão 2", exact: true })).toBeVisible();
  expect(Number(balance())).toBe(7);
  await detail.getByRole("button", { name: "Cancelar consumo", exact: true }).click();
  const cancellation = page.getByRole("dialog", { name: "Cancelar este consumo?", exact: true });
  const returns = cancellation.getByRole("region", { name: "Materiais que voltarão ao estoque", exact: true });
  await expect(returns).toContainText(f.name);
  await expect(returns).toContainText("+3 unidade");
  expect(Number(balance())).toBe(7);
  await cancellation.getByRole("textbox", { name: "Motivo da alteração", exact: true }).fill("Registro cancelado pela equipe após conferência.");
  await page.route("**/api/consumption/records", async route => {
    expect(route.request().postDataJSON()).toMatchObject({ action: "cancel", expectedVersion: 2 });
    const response = await route.fetch();
    expect(response.ok(), await response.text()).toBe(true);
    await route.abort();
  }, { times: 1 });
  await cancellation.getByRole("button", { name: "Cancelar consumo", exact: true }).click();
  await cancellation.getByRole("button", { name: "Conferir resultado", exact: true }).click();
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

test("correção compara a versão concorrente e confirma somente a nova diferença", async ({ page }) => {
  const f = await fixture();
  const productId = f.products[0];
  const initialReference = await rpc(f.professional.client, "team_consumption_reference", {
    p_patient: f.patient, p_products: [productId],
  });
  const issued = await rpc(f.professional.client, "submit_team_consumption", {
    p_patient: f.patient, p_key: randomUUID(), p_reference: initialReference.referenceHash,
    p_body: { action: "issue", lines: [{ productId, quantity: "2" }] },
  });
  await openConsumption(page, f);
  await page.goto(`/consumo?careRecipientId=${f.patient}&ref=${issued.id}&refKind=report`);
  await page.getByRole("button", { name: "Corrigir consumo", exact: true }).click();
  const correction = page.getByRole("dialog", { name: "Corrigir consumo", exact: true });
  await correction.getByRole("button", { name: "Selecionar materiais", exact: true }).click();
  await correction.getByRole("button", { name: /^Higiene/ }).click();
  await correction.getByRole("textbox", { name: "Quantidade consumida · " + f.name, exact: true }).fill("3");
  await correction.getByRole("button", { name: "Continuar", exact: true }).click();
  await correction.getByRole("button", { name: "Continuar", exact: true }).click();
  const reason = correction.getByRole("textbox", { name: "Motivo da correção", exact: true });
  await reason.fill("Conferência do plantão preservada.");
  await correction.getByRole("button", { name: "Revisar correção", exact: true }).click();
  const impact = correction.getByRole("region", { name: "Impacto da correção no estoque", exact: true });
  await expect(impact).toContainText("Baixa adicional · 1 unidade");

  const next = await rpc(f.admin, "team_consumption_correction_reference", {
    p_patient: f.patient, p_report: issued.id, p_products: [productId],
  });
  await rpc(f.admin, "submit_team_consumption", {
    p_patient: f.patient, p_key: randomUUID(), p_reference: next.referenceHash,
    p_body: { action: "correct", reportId: issued.id, expectedVersion: 1,
      reason: "Conferência feita em outra sessão.", observation: "Contexto atualizado pela supervisão.",
      lines: [{ productId, quantity: "4" }] },
  });
  await correction.getByRole("button", { name: "Registrar correção", exact: true }).click();
  await expect(reason).toHaveValue("Conferência do plantão preservada.");
  await correction.getByRole("button", { name: "Revisar correção", exact: true }).click();
  const comparison = correction.getByRole("region", { name: "Comparar versões do consumo", exact: true });
  await expect(comparison).toContainText("Versão 1 · 2 unidade");
  await expect(comparison).toContainText("Versão 2 · 4 unidade");
  await expect(comparison).toContainText("Seu ajuste · 3 unidade");
  await correction.getByRole("button", { name: "Aplicar meus ajustes à versão atual", exact: true }).click();
  await expect(correction.getByRole("textbox", { name: "Observações", exact: true })).toHaveValue("Contexto atualizado pela supervisão.");
  await correction.getByRole("button", { name: "Revisar correção", exact: true }).click();
  await expect(impact).toContainText("Retorno ao saldo · 1 unidade");
  await expect(impact).toContainText("Saldo após a correção · 7 unidade");
  await correction.getByRole("button", { name: "Registrar correção", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Correção · versão 3", exact: true })).toBeVisible();
  expect(Number(sql(`select private.stock_quantity(${q(f.patient)},${q(productId)},'CARE_TEAM')::text`))).toBe(7);
});

test("aviso reiterado confirma o material original sem alterar o saldo", async ({ page }) => {
  const f = await fixture();
  const original = await rpc(f.professional.client, "submit_team_consumption", {
    p_patient: f.patient, p_key: randomUUID(), p_reference: null,
    p_body: { action: "shortage", observation: "Reposição necessária.",
      lines: [{ productId: f.products[0], quantity: "2" }] },
  });
  await openConsumption(page, f);
  await page.goto(`/consumo?careRecipientId=${f.patient}&ref=${original.id}&refKind=report`);
  const detail = page.getByRole("region", { name: "Detalhe do relato", exact: true });
  await detail.getByRole("button", { name: "Avisar novamente", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Avisar falta à família", exact: true });
  await expect(dialog.getByRole("textbox", { name: "Quantidade em falta · " + f.name, exact: true })).toHaveValue("2");
  await expect(dialog.getByRole("textbox", { name: "Mensagem para a família", exact: true })).toHaveValue(
    "O material continua em falta. Precisamos de reposição.",
  );
  await dialog.getByRole("button", { name: "Enviar aviso", exact: true }).click();
  await expect(detail.getByText("Comunicado à família", { exact: true })).toBeVisible();
  await expect(page).not.toHaveURL(new RegExp("ref=" + original.id));
  expect(sql(`select count(*) from private.consumption_acts
    where care_recipient_id=${q(f.patient)} and action='shortage' and request->>'repeatedReportId'=${q(original.id)}`)).toBe("1");
  expect(Number(sql(`select private.stock_quantity(${q(f.patient)},${q(f.products[0])},'CARE_TEAM')::text`))).toBe(10);
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
