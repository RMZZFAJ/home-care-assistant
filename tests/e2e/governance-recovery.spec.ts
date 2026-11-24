import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { actor, fixtures, rpc, setup, adjustCapability } from "../integration/v4-fixtures.mjs";
import { shiftWorker } from "../integration/shift-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";
import { audit } from "./accessibility-audit";
import type { ReviewedMembershipCommand } from "../../src/lib/validation/reviewed-membership";

test.setTimeout(180_000);
mkdirSync("output/playwright/phase-d", { recursive: true });
async function login(page: Page, account: "global" | "adminA" | { email: string }, patient: string | null) {
  await page.goto("/login");
  const email = page.getByLabel("E-mail", { exact: true });
  await expect(email).toBeVisible({ timeout: 30_000 });
  await email.fill(typeof account === "string" ? fixtures[account].email : account.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible();
  await selectContext(page, patient);
}
test.afterEach(async ({ page }) => { await page.unrouteAll({ behavior: "wait" }); });
const count = (patient: string) => Number(sql(`select count(*) from public.access_change_requests where care_recipient_id=${sqlLiteral(patient)};`));

test("E10-05 confirma uma proposta, recupera a resposta perdida e abre a configuração atual de uma proposta superada", async ({ page, browser }, info) => {
  const f = await setup(), author = await actor("global"), reviewer = await shiftWorker(f.patient, "admin");
  const create = (days: number) => rpc(author, "configure_patient_access", {
    p_patient: f.patient, p_kind: "settings", p_change: { archiveDays: days }, p_key: randomUUID(), p_version: 1,
  });
  const approved = await create(43), obsolete = await create(31);
  const before = sql(`select version from public.patient_settings where care_recipient_id=${sqlLiteral(f.patient)};`);
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(reviewer.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible();
  await selectContext(page, f.patient);
  await page.goto("/configuracoes?area=people&careRecipientId=" + f.patient);
  const list = page.getByRole("region", { name: "Propostas de configuração", exact: true });
  const row = (id: string) => list.getByRole("article", { name: "Proposta " + id.slice(0, 8), exact: true }).getByRole("button");
  const review = page.getByRole("dialog", { name: "Conferir proposta", exact: true });
  const confirm = page.getByRole("dialog", { name: "Aprovar esta proposta?", exact: true });
  const packets: { careRecipientId: string; proposalId: string; attemptKey: string; intent: unknown }[] = [];
  let lookups = 0;
  await page.route("**/api/patient-settings/proposals", async route => {
    const packet = route.request().postDataJSON();
    packets.push(packet);
    if (packet.intent) {
      const committed = await route.fetch();
      expect(committed.status()).toBe(200);
      return route.abort("connectionreset");
    }
    lookups++;
    return lookups === 1 ? route.fulfill({ status: 503, json: { error: "Consulta temporariamente indisponível" } }) : route.continue();
  });
  await row(approved.id).click();
  const values = review.getByRole("region", { name: "Compare a alteração", exact: true });
  await expect(values).toContainText("43");
  await expect(values.getByText("7", { exact: true })).toBeVisible();
  if (info.project.name === "chromium") {
    const reference = await browser.newContext({ viewport: { width: 1280, height: 900 }, isMobile: false, hasTouch: false, deviceScaleFactor: 1 });
    try {
      const model = await reference.newPage();
      await model.route(/^https?:/, route => route.abort());
      await model.goto(pathToFileURL(resolve("hca-laboratorio-04-v2-aprovado.html")).href + "#E10-05/pending");
      await model.getByRole("button", { name: /Permitir contagem para Joana Castro/ }).click();
      for (const width of [360, 412]) {
        await page.setViewportSize({ width, height: 900 });
        await model.getByRole("combobox", { name: "Visualização", exact: true }).selectOption(String(width));
        await expect(model.getByRole("heading", { name: "Conferir proposta", exact: true })).toBeVisible();
        await info.attach("L4-proposta-" + width, { body: await model.locator("#device-frame").screenshot(), contentType: "image/png" });
        await info.attach("proposta-" + width, { body: await page.screenshot(), contentType: "image/png" });
      }
    } finally { await reference.close(); }
  }
  await review.getByRole("button", { name: "Aprovar proposta", exact: true }).click();
  await expect(confirm).toBeVisible();
  expect(packets).toHaveLength(0);
  expect(sql(`select status from public.access_change_requests where id=${sqlLiteral(approved.id)};`)).toBe("pending");
  await confirm.getByRole("button", { name: "Aprovar proposta", exact: true }).click();
  const failure = page.getByRole("dialog", { name: "A resposta da decisão não chegou", exact: true });
  const retry = failure.getByRole("button", { name: "Conferir resultado", exact: true });
  await expect(failure).toBeVisible();
  await retry.click();
  await expect(failure.getByText(/Tentativas de recuperação/)).toBeAttached();
  await expect.poll(() => lookups).toBe(1);
  // Reopening the workspace keeps the receipt reference and the spent consultation.
  await page.reload();
  await list.getByRole("button", { name: "Conferir resultado", exact: true }).click();
  await retry.click();
  const result = page.getByRole("dialog", { name: "Proposta aplicada", exact: true });
  await result.getByRole("button", { name: "Concluir", exact: true }).click();
  const { careRecipientId, proposalId, attemptKey } = packets[0];
  expect(packets).toHaveLength(3);
  expect(packets.slice(1)).toEqual(Array.from({ length: 2 }, () => ({ careRecipientId, proposalId, attemptKey, intent: null })));
  expect(sql(`select version from public.patient_settings where care_recipient_id=${sqlLiteral(f.patient)};`)).toBe(String(Number(before || "1") + 1));
  await row(obsolete.id).click();
  await expect(review.getByRole("button", { name: "Aprovar proposta", exact: true })).toHaveCount(0);
  await review.getByRole("button", { name: "Preparar nova proposta", exact: true }).click();
  await page.getByRole("dialog", { name: "Rever a configuração atual", exact: true }).getByRole("button", { name: "Ver configuração atual", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Configuração atual", exact: true })).toContainText("43");
  expect(sql(`select status from public.access_change_requests where id=${sqlLiteral(obsolete.id)};`)).toBe("pending");
});

test("E10-05 vincula a reemissão ao convite da proposta que aguarda aceite", async ({ page }) => {
  const f = await setup(), author = await actor("global"), reviewer = await shiftWorker(f.patient, "admin");
  const proposal = await rpc(author, "configure_patient_access", {
    p_patient: f.patient, p_kind: "membership", p_change: { userId: fixtures.adminB.id, role: "professional" },
    p_key: randomUUID(), p_version: 1,
  });
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(reviewer.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible();
  await selectContext(page, f.patient);
  await page.goto("/configuracoes?area=people&careRecipientId=" + f.patient);
  const row = page.getByRole("article", { name: "Proposta " + proposal.id.slice(0, 8), exact: true }).getByRole("button");
  await row.click();
  await page.getByRole("dialog", { name: "Conferir proposta", exact: true }).getByRole("button", { name: "Aprovar proposta", exact: true }).click();
  await page.getByRole("dialog", { name: "Aprovar esta proposta?", exact: true }).getByRole("button", { name: "Aprovar proposta", exact: true }).click();
  const done = page.getByRole("dialog", { name: "Proposta aprovada", exact: true });
  const originalLink = await done.getByRole("textbox", { name: "Convite aprovado", exact: true }).inputValue();
  await done.getByRole("button", { name: "Concluir", exact: true }).click();
  await expect(row).toContainText("Aguardando aceite do destinatário");
  await row.click();
  const approved = page.getByRole("dialog", { name: "Proposta aprovada", exact: true });
  await expect(approved).toContainText("O destinatário ainda precisa aceitar");
  await approved.getByRole("link", { name: "Reemitir convite", exact: true }).click();
  const invitation = page.getByRole("dialog", { name: "Convite da residência", exact: true });
  await expect(invitation).toContainText(fixtures.adminB.email);
  await invitation.getByRole("button", { name: "Reemitir link", exact: true }).click();
  await page.getByRole("dialog", { name: "Reemitir convite?", exact: true }).getByRole("button", { name: "Reemitir convite", exact: true }).click();
  const reissued = await page.getByRole("textbox", { name: "Link", exact: true }).inputValue();
  expect(reissued).not.toBe(originalLink);
  expect(sql(`select count(*) from public.care_recipient_memberships where care_recipient_id=${sqlLiteral(f.patient)} and user_id=${sqlLiteral(fixtures.adminB.id)};`)).toBe("0");
});

test("L4 confirma a exceção crítica além da função e registra a mudança efetiva", async ({ page }) => {
  const f = await setup();
  await login(page, "adminA", f.patient);
  await page.goto("/configuracoes?area=permissions&careRecipientId=" + f.patient);
  const matrix = page.getByRole("region", { name: "Matriz de permissões", exact: true });
  await matrix.getByLabel("Visualizar permissões", { exact: true }).selectOption(fixtures.professional.id);
  const open = () => matrix.getByRole("button", { name: /^Administrar acessos do paciente/ }).click();
  const title = "Administrar acessos do paciente";
  await expect(matrix.getByRole("button", { name: /^Administrar acessos do paciente/ })).toContainText("Restrito");
  await open();
  await page.getByRole("dialog", { name: title, exact: true }).getByLabel("Exceção pessoal", { exact: true }).selectOption("true");
  await page.getByRole("button", { name: "Revisar alteração", exact: true }).click();
  const review = page.getByRole("dialog", { name: "Permitir além da função?", exact: true });
  await expect(review).toContainText("Acesso fora do padrão");
  await expect(review).toContainText("Com este acesso, a pessoa pode gerir permissões e participantes");
  const confirm = review.getByRole("button", { name: "Confirmar ampliação", exact: true });
  await expect(confirm).toBeDisabled();
  expect(count(f.patient)).toBe(0);
  await review.getByRole("checkbox", { name: "Confirmo a ampliação deste acesso", exact: true }).check();
  const completion = page.waitForResponse(response =>
    response.request().method() === "POST" && new URL(response.url()).pathname === "/api/patient-settings");
  await confirm.click();
  expect((await completion).status()).toBe(200);
  await expect(review).toHaveCount(0);
  await expect(matrix.getByRole("button", { name: /^Administrar acessos do paciente/ })).toContainText("Exceção pessoal");
  await matrix.getByRole("link", { name: /^Histórico de permissões/ }).click();
  await expect(page.getByText(/Permissão efetiva restrita → permitida/)).toBeVisible();
});

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

test("L4 diferencia a autorização da custódia familiar de uma permissão antiga de relato", async ({ page }) => {
  const f = await setup();
  await adjustCapability(f.admin, f.patient, { capability: "stock.family.read", subjectRole: "professional", enabled: true });
  // This row represents a saved team reporting grant from before the scope was explicit.
  sql(`insert into public.capability_overrides(care_recipient_id, capability, subject_user, enabled)
    values (${sqlLiteral(f.patient)}, 'consumption.report', ${sqlLiteral(fixtures.professional.id)}, true);`);
  await login(page, "adminA", f.patient);
  await page.goto("/configuracoes?area=permissions&careRecipientId=" + f.patient);
  const matrix = page.getByRole("region", { name: "Matriz de permissões", exact: true });
  await matrix.getByLabel("Visualizar permissões", { exact: true }).selectOption(fixtures.professional.id);
  await matrix.getByRole("button", { name: /^Relatar faltas e consumo/ }).click();
  const edit = page.getByRole("dialog", { name: "Relatar faltas e consumo", exact: true });
  await expect(edit.getByLabel("Exceção pessoal", { exact: true })).toHaveValue("true");
  await edit.getByRole("button", { name: "Revisar alteração", exact: true }).click();
  const review = page.getByRole("dialog", { name: "Permitir além da função?", exact: true });
  await expect(review).toContainText("poderá relatar faltas e consumo da família");
  await review.getByRole("checkbox", { name: "Confirmo a ampliação deste acesso", exact: true }).check();
  const commit = page.waitForResponse(response =>
    response.request().method() === "POST" && new URL(response.url()).pathname === "/api/patient-settings");
  await review.getByRole("button", { name: "Confirmar ampliação", exact: true }).click();
  expect((await commit).status()).toBe(200);
  await expect(review).toHaveCount(0);
  await matrix.getByRole("link", { name: /^Histórico de permissões/ }).click();
  await expect(page.getByText(/Relatos da família restritos → permitidos/)).toBeVisible();
});

test("D3 proposta administrativa recupera a mesma intenção e ambas as entradas recusam rebase ou conteúdo alterado", async ({ page }, info) => {
  const f = await setup();
  await login(page, "global", null);
  await page.goto(`/admin?careRecipientId=${f.patient}&section=memberships`);
  await page.getByRole("button", { name: "Vincular pessoa", exact: true }).click();
  const drawer = page.getByRole("dialog", { name: "Vincular pessoa", exact: true });
  await drawer.getByLabel("Buscar conta pelo nome", { exact: true }).fill("Teste professional");
  await drawer.getByRole("button", { name: "Buscar contas", exact: true }).click();
  await drawer.getByLabel("Conta a vincular", { exact: true }).selectOption(fixtures.professional.id);
  await drawer.getByLabel("Função na residência", { exact: true }).selectOption("family");
  const packets: ReviewedMembershipCommand[] = [];
  await page.route("**/api/admin/memberships", async route => {
    if (route.request().method() !== "POST") return route.continue();
    packets.push(route.request().postDataJSON());
    if (packets.length === 1) { const response = await route.fetch(); expect(response.status()).toBe(200); await route.fulfill({ status: 400, contentType: "application/json", body: "{unreadable-after-commit" }); }
    else if (packets.length === 2) await route.fulfill({ status: 403, json: { code: "FORBIDDEN", error: "Permissão indisponível nesta recuperação fictícia." } });
    else if (packets.length === 3) await route.fulfill({ status: 200, json: { data: {} } });
    else await route.continue();
  });
  await drawer.getByRole("button", { name: "Revisar vínculo", exact: true }).click();
  await page.getByRole("dialog", { name: "Enviar proposta de vínculo?", exact: true }).getByRole("button", { name: "Propor vínculo", exact: true }).click();
  const failure = page.getByRole("dialog", { name: "Não foi possível confirmar o vínculo", exact: true });
  const reconcile = failure.getByRole("button", { name: "Conferir resultado", exact: true });
  await expect(reconcile).toBeEnabled();
  await expect(drawer).toHaveCount(0);
  expect(count(f.patient)).toBe(1);
  await reconcile.click();
  await expect.poll(() => packets.length).toBe(2);
  await expect(reconcile).toBeEnabled();
  expect(count(f.patient)).toBe(1);
  await reconcile.click();
  await expect(failure.getByRole("button", { name: "Copiar detalhes", exact: true })).toBeEnabled();
  await expect(reconcile).toHaveCount(0);
  await expect(failure).toContainText("Copie os detalhes e avise o responsável pelo sistema.");
  expect(packets).toHaveLength(3);
  const original = packets[0];
  for (const pointer of packets.slice(1)) expect(pointer).toEqual({ ...original, intent: null });
  expect(count(f.patient)).toBe(1);
  const row = JSON.parse(sql(`select to_jsonb(c) from public.access_change_requests c where care_recipient_id=${sqlLiteral(f.patient)};`));
  const recovered = await page.request.post("/api/admin/memberships", { data: { ...original, intent: null } });
  expect(recovered.status()).toBe(200); expect((await recovered.json()).outcome.proposalId).toBe(row.id);
  const settingsPacket = { careRecipientId: f.patient, kind: "membership", change: { userId: fixtures.professional.id, role: "family" }, idempotencyKey: original.key, expectedVersion: row.base_version };
  const replay = await page.request.post("/api/patient-settings", { data: settingsPacket });
  expect(replay.status()).toBe(200); expect((await replay.json()).data.id).toBe(row.id);
  for (const [path, body] of [
    ["/api/admin/memberships", { ...original, intent: { ...original.intent, fields: { ...original.intent?.fields, role: "reader" } } }],
    ["/api/admin/memberships", { ...original, intent: { ...original.intent, referenceHash: "0".repeat(64) } }],
    ["/api/patient-settings", { ...settingsPacket, change: { ...settingsPacket.change, role: "reader" } }],
    ["/api/patient-settings", { ...settingsPacket, expectedVersion: Number(settingsPacket.expectedVersion) + 1 }],
  ] as const) expect((await page.request.post(path, { data: body })).status()).toBe(409);
  const { key: removedKey, ...noIntent } = original;
  expect(removedKey).toBeTruthy();
  expect((await page.request.post("/api/admin/memberships", { data: noIntent })).status()).toBe(400);
  expect(count(f.patient)).toBe(1);
  expect(sql(`select role from public.care_recipient_memberships where care_recipient_id=${sqlLiteral(f.patient)} and user_id=${sqlLiteral(fixtures.professional.id)};`)).toBe("professional");
  await widths(page, "E10-02 pending proposal after two recovery attempts");
  await page.screenshot({ path: `output/playwright/phase-d/d3-governance-recovered-${info.project.name}.png`, fullPage: true });
});

test("D3 regra preserva a tentativa incerta e distingue confirmação de falha na consulta posterior", async ({ page }) => {
  const f = await setup(); await login(page, "global", null);
  await page.goto("/configuracoes?careRecipientId=" + f.patient);
  await page.getByRole("button", { name: "Editar Encerramento e histórico", exact: true }).click();
  const drawer = page.getByRole("dialog"), field = drawer.getByLabel("Arquivar após conclusão ou cancelamento (dias)", { exact: true });
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
  const f = await setup(), global = await actor("global"), reviewer = await shiftWorker(f.patient, "admin");
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
  const review = page.getByRole("dialog", { name: "Conferir proposta", exact: true });
  await expect(region.getByText("5 propostas encontradas · página 1 de 1", { exact: true })).toBeVisible();
  await expect(region.getByRole("article")).toHaveCount(5);
  for (const proposal of proposals) {
    await region.getByRole("article", { name: "Proposta " + proposal.id.slice(0, 8), exact: true }).getByRole("button").click();
    await expect(review.getByRole("region", { name: "Compare a alteração", exact: true })).toBeVisible();
    await expect(review.getByRole("button", { name: "Aprovar proposta", exact: true })).toHaveCount(0);
    await review.getByRole("button", { name: "Voltar", exact: true }).click();
  }
  await expect(region.locator("pre,textarea,input[readonly]")).toHaveCount(0);
  await expect(region.getByRole("button", { name: "Aprovar proposta", exact: true })).toHaveCount(0);
  const administration = region.getByRole("article", { name: "Proposta " + proposals[4].id.slice(0, 8), exact: true }).getByRole("button");
  await administration.click();
  await widths(page, "D3 five proposal comparisons");
  await page.setViewportSize({ width: 390, height: 900 });
  await review.screenshot({ path: `output/playwright/phase-d/d3-proposal-comparisons-${info.project.name}.png` });
  await review.getByRole("button", { name: "Voltar", exact: true }).click();
  await administration.screenshot({ path: `output/playwright/phase-d/d3-proposal-card-${info.project.name}.png` });
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
  await login(page, reviewer, f.patient); await page.goto(`/configuracoes?area=people&proposalStatus=all&proposalQuery=${proposals[0].id}`);
  await expect(region.getByText("1 proposta encontrada · página 1 de 1", { exact: true })).toBeVisible();
  const proposal = region.getByRole("article", { name: "Proposta " + proposals[0].id.slice(0, 8), exact: true });
  await proposal.getByRole("button").click();
  await expect(review.getByRole("button", { name: "Aprovar proposta", exact: true })).toBeEnabled();
  await review.getByRole("button", { name: "Voltar", exact: true }).click();
  const frozen = sql(`select proposed::text from public.access_change_requests where id=${sqlLiteral(proposals[0].id)};`);
  let future: Record<string, unknown> | null = null;
  await page.route("**/api/patient-settings?**", async route => {
    if (route.request().method() !== "GET") return route.continue();
    const response = await route.fetch(), body = await response.json();
    if (!future || !Array.isArray(body.changes)) return route.fulfill({ response });
    return route.fulfill({ response, json: { ...body, changes: body.changes.map((change: { id: string }) => change.id === proposals[0].id ? { ...change, ...future } : change) } });
  });
  for (const unsupported of [
    { kind: "constructor", proposed: { archiveDays: 9 } },
    { kind: "administration", proposed: { operation: "constructor", args: { displayName: "Nome preservado" } } },
    { kind: "capability", proposed: { capability: "future.capability", subjectRole: "professional", enabled: true } },
    { kind: "notification_rule", proposed: { event: "req.issued", role: "family", channels: ["future_channel"] } },
  ]) {
    future = unsupported; await page.reload();
    await proposal.getByRole("button").click();
    await expect(review.getByText("Esta proposta contém um tipo ou campo que esta versão não reconhece. Consulte a origem antes de aprovar.", { exact: true })).toBeVisible();
    await expect(review.locator("textarea,input,select,pre")).toHaveCount(0);
    await expect(review.getByRole("button", { name: "Aprovar proposta", exact: true })).toBeDisabled();
    expect(sql(`select proposed::text from public.access_change_requests where id=${sqlLiteral(proposals[0].id)};`)).toBe(frozen);
  }
  future = { status: "constructor" }; await page.reload();
  await expect(proposal.getByText("Situação não reconhecida", { exact: false })).toBeVisible();
  await proposal.getByRole("button").click();
  await expect(page.getByRole("dialog", { name: "Decisão da proposta", exact: true }).getByRole("button", { name: "Aprovar proposta", exact: true })).toHaveCount(0);
  future = null; await page.unrouteAll({ behavior: "wait" }); await page.reload();
  const denied = await page.request.get(`/api/patient-settings?careRecipientId=${otherPatient.id}&changesOnly=true&status=all&query=${otherProposal.id}`);
  expect(denied.status()).toBe(404); expect((await denied.json()).code).toBe("NOT_FOUND");
  expect(await denied.text()).not.toContain("Conteúdo exclusivo fictício de outro paciente");
  expect(count(f.patient)).toBe(55);
  await proposal.getByRole("button").click();
  await review.getByRole("button", { name: "Aprovar proposta", exact: true }).click();
  const posted = page.waitForRequest(request => request.method() === "POST" && new URL(request.url()).pathname === "/api/patient-settings/proposals");
  await page.getByRole("dialog", { name: "Aprovar esta proposta?", exact: true }).getByRole("button", { name: "Aprovar proposta", exact: true }).click();
  const approval = (await posted).postDataJSON();
  expect(approval.proposalId).toBe(proposals[0].id);
  expect(approval.intent).toEqual({ decision: "approve", reference: expect.stringMatching(/^[0-9a-f]{64}$/) });
  await expect.poll(() => sql(`select status from public.access_change_requests where id=${sqlLiteral(proposals[0].id)};`)).toBe("applied");
  expect(sql(`select settings->>'archiveDays' from public.patient_settings where care_recipient_id=${sqlLiteral(f.patient)};`)).toBe("9");
  expect(count(f.patient)).toBe(55);
  await page.getByRole("dialog", { name: "Proposta aplicada", exact: true }).getByRole("button", { name: "Concluir", exact: true }).click();
  await region.getByRole("button", { name: "Limpar filtros de propostas", exact: true }).click();
  await expect(region.getByText("4 propostas encontradas · página 1 de 1", { exact: true })).toBeVisible();
  await region.getByRole("article", { name: "Proposta " + proposals[1].id.slice(0, 8), exact: true }).getByRole("button").click();
  await expect(review.getByRole("button", { name: "Aprovar proposta", exact: true })).toHaveCount(0);
  await expect(review.getByRole("button", { name: "Preparar nova proposta", exact: true })).toBeVisible();
  await review.getByRole("button", { name: "Voltar", exact: true }).click();
  expect(count(otherPatient.id)).toBe(1);
  await page.goto("/configuracoes?area=permissions");
  const matrix = page.getByRole("region", { name: "Matriz de permissões", exact: true });
  const opener = matrix.getByRole("button", { name: /^Emitir REQ · Profissional ·/ });
  await opener.click();
  const editor = page.getByRole("dialog", { name: "Emitir REQ", exact: true });
  const configuration = editor.getByRole("combobox", { name: "Configuração deste perfil", exact: true });
  await expect(configuration.getByRole("option")).toHaveCount(3);
  for (const option of [/^Herdar/, /^Permitir$/, /^Restringir$/]) await expect(configuration.getByRole("option", { name: option })).toBeAttached();
  await expect(editor.locator('input[type="search"],input[type="text"]')).toHaveCount(0);
  await editor.press("Escape"); await expect(opener).toBeFocused();
  const deniedName = "Residência negada " + randomUUID().slice(0, 8);
  expect((await page.request.post("/api/admin", { data: { action: "recipient", id: null, displayName: deniedName, isActive: true, isDevelopment: true, initialAdministratorEmail: fixtures.adminA.email } })).status()).toBe(403);
  expect(sql(`select count(*) from public.care_recipients where display_name=${sqlLiteral(deniedName)};`)).toBe("0");
  expect(sql(`select coalesce(jsonb_agg(to_jsonb(m) order by id),'[]') from public.stock_movements m where care_recipient_id=${sqlLiteral(f.patient)};`)).toBe(ledger);
});
