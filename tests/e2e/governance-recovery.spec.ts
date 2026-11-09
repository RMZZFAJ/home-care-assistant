import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { actor, fixtures, rpc, setup } from "../integration/v4-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";
import { audit } from "./accessibility-audit";

test.setTimeout(180_000);
mkdirSync("output/playwright/phase-d", { recursive: true });
async function login(page: Page, role: "global" | "adminA", patient: string | null) {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(fixtures[role].email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible();
  await selectContext(page, patient);
}
test.afterEach(async ({ page }) => { await page.unrouteAll({ behavior: "wait" }); });
const count = (patient: string) => Number(sql(`select count(*) from public.access_change_requests where care_recipient_id=${sqlLiteral(patient)};`));
async function widths(page: Page, label: string) {
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    // Opening comparisons scrolls the document. Compare the same task origin,
    // rather than an arbitrary clipped strip beneath the sticky header.
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    await audit(page, `${label} ${width}`);
  }
}

test("D3 proposta administrativa recupera a mesma intenção e ambas as entradas recusam rebase ou conteúdo alterado", async ({ page }, info) => {
  const f = await setup();
  await login(page, "global", null);
  await page.goto(`/admin?careRecipientId=${f.patient}&section=memberships`);
  await page.getByRole("button", { name: "Vincular conta", exact: true }).click();
  const drawer = page.getByRole("dialog", { name: "Vincular conta existente", exact: true });
  await drawer.getByLabel("Conta vinculada", { exact: true }).selectOption(fixtures.professional.id);
  await drawer.getByLabel("Função neste paciente", { exact: true }).selectOption("family");
  const packets: Record<string, unknown>[] = [];
  let first = true;
  await page.route("**/api/admin", async route => {
    if (route.request().method() !== "POST") return route.continue();
    packets.push(route.request().postDataJSON());
    if (first) { first = false; const response = await route.fetch(); expect(response.status()).toBe(200); await route.fulfill({ status: 400, contentType: "application/json", body: "{unreadable-after-commit" }); }
    else if (packets.length === 2) await route.fulfill({ status: 403, json: { code: "FORBIDDEN", error: "Permissão indisponível nesta recuperação fictícia." } });
    else if (packets.length === 3) await route.fulfill({ status: 200, json: { data: {} } });
    else await route.continue();
  });
  await drawer.getByRole("button", { name: "Salvar vínculo", exact: true }).click();
  await expect(drawer.getByRole("button", { name: "Recuperar mesma alteração administrativa", exact: true })).toBeEnabled();
  await expect(drawer.getByLabel("Função neste paciente", { exact: true })).toBeDisabled();
  await expect(drawer.getByLabel("Função neste paciente", { exact: true })).toHaveValue("family");
  expect(count(f.patient)).toBe(1);
  await drawer.getByRole("button", { name: "Recuperar mesma alteração administrativa", exact: true }).click();
  await expect(drawer.getByRole("alert").filter({ hasText: "O resultado da primeira tentativa continua incerto" })).toBeVisible();
  await expect(drawer.getByRole("button", { name: "Recuperar mesma alteração administrativa", exact: true })).toBeEnabled();
  expect(count(f.patient)).toBe(1);
  await drawer.getByRole("button", { name: "Recuperar mesma alteração administrativa", exact: true }).click();
  await expect(drawer.getByRole("alert").filter({ hasText: "O resultado da primeira tentativa continua incerto" })).toBeVisible();
  await expect(drawer.getByRole("button", { name: "Recuperar mesma alteração administrativa", exact: true })).toBeEnabled();
  await expect(drawer.getByLabel("Função neste paciente", { exact: true })).toBeDisabled();
  expect(count(f.patient)).toBe(1);
  await drawer.getByRole("button", { name: "Recuperar mesma alteração administrativa", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Proposta global registrada." })).toBeVisible();
  expect(packets).toHaveLength(4); for (const replay of packets.slice(1)) expect(replay).toEqual(packets[0]); expect(count(f.patient)).toBe(1);
  const row = JSON.parse(sql(`select to_jsonb(c) from public.access_change_requests c where care_recipient_id=${sqlLiteral(f.patient)};`));
  const settingsPacket = { careRecipientId: f.patient, kind: "membership", change: { userId: fixtures.professional.id, role: "family" }, idempotencyKey: packets[0].idempotencyKey, expectedVersion: packets[0].expectedVersion };
  const replay = await page.request.post("/api/patient-settings", { data: settingsPacket });
  expect(replay.status()).toBe(200); expect((await replay.json()).data.id).toBe(row.id);
  for (const [path, body] of [
    ["/api/admin", { ...packets[0], role: "reader" }],
    ["/api/admin", { ...packets[0], expectedVersion: Number(packets[0].expectedVersion) + 1 }],
    ["/api/patient-settings", { ...settingsPacket, change: { ...settingsPacket.change, role: "reader" } }],
    ["/api/patient-settings", { ...settingsPacket, expectedVersion: Number(settingsPacket.expectedVersion) + 1 }],
  ] as const) expect((await page.request.post(path, { data: body })).status()).toBe(409);
  const noIntent = { ...packets[0] }; delete noIntent.idempotencyKey;
  expect((await page.request.post("/api/admin", { data: noIntent })).status()).toBe(400);
  expect(count(f.patient)).toBe(1);
  expect(sql(`select role from public.care_recipient_memberships where care_recipient_id=${sqlLiteral(f.patient)} and user_id=${sqlLiteral(fixtures.professional.id)};`)).toBe("professional");
  await widths(page, "D3 recovered administrative proposal");
  await page.screenshot({ path: `output/playwright/phase-d/d3-governance-recovered-${info.project.name}.png`, fullPage: true });
});

test("D3 regra preserva a tentativa incerta e distingue confirmação de falha na consulta posterior", async ({ page }) => {
  const f = await setup(); await login(page, "global", null);
  await page.goto("/configuracoes?careRecipientId=" + f.patient);
  await page.getByRole("button", { name: "Editar Encerramento e histórico", exact: true }).click();
  const drawer = page.getByRole("dialog"), field = drawer.getByLabel("Arquivar após conclusão (dias)", { exact: true });
  await field.fill("12");
  const packets: unknown[] = []; let first = true;
  await page.route("**/api/patient-settings", async route => {
    if (route.request().method() !== "POST") return route.continue();
    packets.push(route.request().postDataJSON());
    if (first) { first = false; await route.abort("failed"); } else await route.continue();
  });
  await drawer.getByRole("button", { name: "Registrar política", exact: true }).click();
  await expect(drawer.getByRole("button", { name: "Recuperar mesma alteração", exact: true })).toBeEnabled();
  await expect(field).toHaveValue("12"); await expect(field).toBeDisabled(); expect(count(f.patient)).toBe(0);
  await drawer.getByRole("button", { name: "Recuperar mesma alteração", exact: true }).click();
  await expect(drawer).toHaveCount(0); expect(packets).toHaveLength(2); expect(packets[1]).toEqual(packets[0]); expect(count(f.patient)).toBe(1);
  await page.unrouteAll({ behavior: "wait" });
  await page.getByRole("button", { name: "Editar Encerramento e histórico", exact: true }).click(); await field.fill("13");
  let failRead = false;
  await page.route("**/api/patient-settings**", async route => {
    if (route.request().method() === "POST") { const response = await route.fetch(); expect(response.status()).toBe(200); failRead = true; await route.fulfill({ response }); }
    else if (failRead) { failRead = false; await route.abort("failed"); } else await route.continue();
  });
  await drawer.getByRole("button", { name: "Registrar política", exact: true }).click();
  await expect(drawer).toHaveCount(0);
  await expect(page.getByRole("alert").filter({ hasText: "A ação foi confirmada, mas a consulta posterior falhou" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Recuperar mesma alteração", exact: true })).toHaveCount(0);
  expect(count(f.patient)).toBe(2);
  await page.getByRole("button", { name: "Consultar configuração novamente", exact: true }).click();
  await expect(page.getByRole("button", { name: "Editar Encerramento e histórico", exact: true })).toBeEnabled();
  expect(count(f.patient)).toBe(2);
});

test("D3 lista encontra proposta antiga e compara cinco tipos sem decidir por leitura ou vazar outro paciente", async ({ page }, info) => {
  const f = await setup(), global = await actor("global");
  const ledger = sql(`select coalesce(jsonb_agg(to_jsonb(m) order by id),'[]') from public.stock_movements m where care_recipient_id=${sqlLiteral(f.patient)};`);
  const proposals: { id: string }[] = [];
  const changes = [
    ["settings", { archiveDays: 9 }],
    ["capability", { capability: "req.create", subjectRole: "professional", enabled: false }],
    ["membership", { userId: fixtures.professional.id, role: "family" }],
    ["notification_rule", { event: "req.issued", role: "family", channels: ["internal", "email"], mode: "required" }],
    ["administration", { operation: "recipient", args: { id: f.patient, displayName: "Residência fictícia de comparação\n" + "Nome extenso ".repeat(7), isActive: true, isDevelopment: true } }],
  ] as const;
  for (const [kind, change] of changes) proposals.push(await rpc(global, "configure_patient_access", { p_patient: f.patient, p_kind: kind, p_change: change, p_key: randomUUID(), p_version: 1 }));
  for (let index = 0; index < 50; index++) {
    const row = await rpc(global, "configure_patient_access", { p_patient: f.patient, p_kind: "settings", p_change: { reminderHours: index + 2 }, p_key: randomUUID(), p_version: 1 });
    sql(`update public.access_change_requests set status='rejected',decided_at=clock_timestamp() where id=${sqlLiteral(row.id)};`);
  }
  const otherPatient = await rpc(global, "admin_upsert_recipient", { p_id: null, p_display_name: "Outro paciente fictício protegido " + randomUUID().slice(0, 8), p_is_active: true, p_is_development: true });
  const otherProposal = await rpc(global, "configure_patient_access", { p_patient: otherPatient.id, p_kind: "settings", p_change: { patientShortName: "Conteúdo exclusivo fictício de outro paciente" }, p_key: randomUUID(), p_version: 1 });
  await login(page, "global", null);
  await page.goto(`/configuracoes?careRecipientId=${f.patient}&area=people`);
  const region = page.getByRole("region", { name: "Propostas de configuração", exact: true });
  await expect(region.getByText("5 propostas encontradas · página 1 de 1", { exact: true })).toBeVisible();
  await expect(region.getByRole("article")).toHaveCount(5);
  for (const proposal of proposals) await region.getByRole("article", { name: "Proposta " + proposal.id.slice(0, 8), exact: true }).locator("summary").click();
  await expect(region.locator("pre,textarea,input[readonly]")).toHaveCount(0);
  await expect(region.getByRole("button", { name: "Aprovar proposta", exact: true })).toHaveCount(0);
  await widths(page, "D3 five proposal comparisons");
  await page.setViewportSize({ width: 390, height: 900 });
  await page.evaluate(() => window.scrollTo(0, 0)); await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.screenshot({ path: `output/playwright/phase-d/d3-proposal-comparisons-${info.project.name}.png`, fullPage: true });
  await region.getByRole("article", { name: "Proposta " + proposals[4].id.slice(0, 8), exact: true }).screenshot({ path: `output/playwright/phase-d/d3-proposal-card-${info.project.name}.png` });
  await region.getByLabel("Situação da proposta", { exact: true }).selectOption("all"); await region.getByRole("button", { name: "Consultar propostas", exact: true }).click();
  await expect(region.getByText("55 propostas encontradas · página 1 de 3", { exact: true })).toBeVisible();
  await region.getByRole("button", { name: "Próxima página de propostas", exact: true }).click();
  await expect(region.getByText("55 propostas encontradas · página 2 de 3", { exact: true })).toBeVisible();
  await region.getByRole("button", { name: "Próxima página de propostas", exact: true }).click();
  await expect(region.getByRole("article", { name: "Proposta " + proposals[0].id.slice(0, 8), exact: true })).toBeVisible();
  await region.getByLabel("Buscar proposta por referência ou conteúdo", { exact: true }).fill(proposals[0].id); await region.getByRole("button", { name: "Consultar propostas", exact: true }).click();
  await expect(region.getByText("1 proposta encontrada · página 1 de 1", { exact: true })).toBeVisible();
  await page.reload(); await expect(region.getByLabel("Buscar proposta por referência ou conteúdo", { exact: true })).toHaveValue(proposals[0].id);
  expect(count(f.patient)).toBe(55);
  await login(page, "adminA", f.patient); await page.goto(`/configuracoes?area=people&proposalStatus=all&proposalQuery=${proposals[0].id}`);
  await expect(region.getByText("1 proposta encontrada · página 1 de 1", { exact: true })).toBeVisible();
  await expect(region.getByRole("button", { name: "Aprovar proposta", exact: true })).toBeEnabled();
  const frozen = sql(`select proposed::text from public.access_change_requests where id=${sqlLiteral(proposals[0].id)};`);
  let future: Record<string, unknown> | null = null;
  await page.route("**/api/patient-settings?**", async route => {
    if (route.request().method() !== "GET") return route.continue();
    const response = await route.fetch(), body = await response.json();
    if (!future || !Array.isArray(body.changes)) return route.fulfill({ response });
    return route.fulfill({ response, json: { ...body, changes: body.changes.map((change: { id: string }) => change.id === proposals[0].id ? { ...change, ...future } : change) } });
  });
  const proposal = region.getByRole("article", { name: "Proposta " + proposals[0].id.slice(0, 8), exact: true });
  for (const unsupported of [
    { kind: "constructor", proposed: { archiveDays: 9 } },
    { kind: "administration", proposed: { operation: "constructor", args: { displayName: "Nome preservado" } } },
    { kind: "capability", proposed: { capability: "future.capability", subjectRole: "professional", enabled: true } },
    { kind: "notification_rule", proposed: { event: "req.issued", role: "family", channels: ["future_channel"] } },
  ]) {
    future = unsupported; await page.reload();
    await expect(proposal.getByText("Esta proposta contém um tipo ou campo que esta versão não reconhece. Consulte a origem antes de aprovar.", { exact: true })).toBeVisible();
    await proposal.locator("summary").click();
    await expect(proposal.locator("textarea,input,select,pre")).toHaveCount(0);
    await expect(proposal.getByRole("button", { name: "Aprovar proposta", exact: true })).toBeDisabled();
    expect(sql(`select proposed::text from public.access_change_requests where id=${sqlLiteral(proposals[0].id)};`)).toBe(frozen);
  }
  future = { status: "constructor" }; await page.reload();
  await expect(proposal.getByText("Situação não reconhecida", { exact: false })).toBeVisible();
  await expect(proposal.getByRole("button", { name: "Aprovar proposta", exact: true })).toHaveCount(0);
  future = null; await page.unrouteAll({ behavior: "wait" }); await page.reload();
  await expect(proposal.getByRole("button", { name: "Aprovar proposta", exact: true })).toBeEnabled();
  const denied = await page.request.get(`/api/patient-settings?careRecipientId=${otherPatient.id}&changesOnly=true&status=all&query=${otherProposal.id}`);
  expect(denied.status()).toBe(404); expect((await denied.json()).code).toBe("NOT_FOUND");
  expect(await denied.text()).not.toContain("Conteúdo exclusivo fictício de outro paciente");
  expect(count(f.patient)).toBe(55);
  const posted = page.waitForRequest(request => request.method() === "POST" && new URL(request.url()).pathname === "/api/patient-settings");
  await region.getByRole("button", { name: "Aprovar proposta", exact: true }).click();
  const approval = (await posted).postDataJSON();
  expect(approval.requestId).toBe(proposals[0].id); expect(approval.expectedVersion).toBe(1);
  expect(approval.kind).toBe("settings"); expect(approval.change).toEqual({ archiveDays: 9 });
  await expect.poll(() => sql(`select status from public.access_change_requests where id=${sqlLiteral(proposals[0].id)};`)).toBe("applied");
  expect(sql(`select settings->>'archiveDays' from public.patient_settings where care_recipient_id=${sqlLiteral(f.patient)};`)).toBe("9");
  expect(count(f.patient)).toBe(55);
  await region.getByRole("button", { name: "Limpar filtros de propostas", exact: true }).click();
  await expect(region.getByText("4 propostas encontradas · página 1 de 1", { exact: true })).toBeVisible();
  for (const button of await region.getByRole("button", { name: "Aprovar proposta", exact: true }).all()) await expect(button).toBeDisabled();
  expect(count(otherPatient.id)).toBe(1);
  await page.goto("/configuracoes?area=permissions");
  const matrix = page.getByRole("region", { name: "Matriz de permissões", exact: true });
  const opener = matrix.getByRole("button", { name: /^Emitir REQ · Profissional ·/ });
  await opener.click();
  await expect(page.getByRole("menuitemradio")).toHaveCount(3);
  for (const option of [/^Herdar/, /^Permitir$/, /^Restringir$/]) await expect(page.getByRole("menuitemradio", { name: option })).toBeVisible();
  await expect(page.getByRole("menu").locator('input[type="search"],input[type="text"]')).toHaveCount(0);
  await page.getByRole("menuitemradio", { name: /^Herdar/ }).press("Escape"); await expect(opener).toBeFocused();
  const deniedName = "Residência negada " + randomUUID().slice(0, 8);
  expect((await page.request.post("/api/admin", { data: { action: "recipient", id: null, displayName: deniedName, isActive: true, isDevelopment: true, initialAdministratorEmail: fixtures.adminA.email } })).status()).toBe(403);
  expect(sql(`select count(*) from public.care_recipients where display_name=${sqlLiteral(deniedName)};`)).toBe("0");
  expect(sql(`select coalesce(jsonb_agg(to_jsonb(m) order by id),'[]') from public.stock_movements m where care_recipient_id=${sqlLiteral(f.patient)};`)).toBe(ledger);
});
