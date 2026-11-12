import { selectProfileSection } from "./profile-sections";
import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { actor, rpc, fixtures, setup } from "../integration/v4-fixtures.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";
import { audit } from "./accessibility-audit";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
test.setTimeout(180_000);
test.afterEach(async ({ page }) => { await page.unrouteAll({ behavior: "wait" }); });
async function login(page: Page, patient: string) {
  await page.goto("/login"); await page.getByLabel("E-mail", { exact: true }).fill(fixtures.adminA.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword); await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible(); await selectContext(page, patient);
}

test("D3 perfil termina carregamento em falha recupera a leitura e preserva edição pessoal", async ({ page }) => {
  const f = await setup(); await login(page, f.patient);
  let release!: () => void, entered!: () => void, mode: "delay" | "error" | "invalid" | "emptyOptional" | "restrictedMembership" | "live" = "delay";
  const gate = new Promise<void>(resolve => { release = resolve; }), first = new Promise<void>(resolve => { entered = resolve; });
  await page.route("**/api/profile", async route => {
    if (route.request().method() !== "GET") return route.continue();
    if (mode === "delay") { const response = await route.fetch(); entered(); await gate; return route.fulfill({ response }); }
    if (mode === "error") return route.fulfill({ status: 500, json: { code: "INTERNAL_ERROR", error: "Falha controlada na leitura do perfil" } });
    if (mode === "invalid") return route.fulfill({ status: 200, json: { data: null, sessions: [], memberships: [] } });
    if (mode === "emptyOptional") { const response = await route.fetch(), body = await response.json(); return route.fulfill({ response, json: { ...body, data: { ...body.data, professional_registration: null, professional_state: null, professional_category: null, avatar: null, phone: null }, memberships: [], sessions: [] } }); }
    if (mode === "restrictedMembership") { const response = await route.fetch(), body = await response.json(); return route.fulfill({ response, json: { ...body, memberships: body.memberships.slice(0, 1).map((membership: Record<string, unknown>) => ({ ...membership, care_recipients: null })) } }); }
    return route.continue();
  });
  try {
    await page.goto("/perfil?careRecipientId=" + f.patient); await first;
    const panel = page.getByRole("region", { name: "Perfil pessoal", exact: true });
    await expect(panel.getByText("Carregando perfil…", { exact: true })).toBeVisible();
    release(); await expect(panel.getByRole("heading", { name: "Identidade pessoal", exact: true })).toBeVisible();
    await selectProfileSection(page, "identity");
    const name = panel.getByLabel("Nome", { exact: true }); await name.fill("Edição pessoal ainda não salva");
    mode = "error"; await page.evaluate(() => window.dispatchEvent(new Event("hca:data-changed")));
    await expect(panel.getByRole("alert")).toContainText("Falha controlada na leitura do perfil");
    await expect(panel.getByText("Carregando perfil…", { exact: true })).toHaveCount(0);
    await expect(panel.getByText("Atualizando consulta do perfil…", { exact: true })).toHaveCount(0);
    mode = "invalid"; await panel.getByRole("button", { name: "Consultar perfil novamente", exact: true }).click();
    await expect(panel.getByRole("alert")).toContainText("A resposta da consulta do perfil não pôde ser lida");
    mode = "emptyOptional"; await panel.getByRole("button", { name: "Consultar perfil novamente", exact: true }).click();
    await expect(panel.getByRole("alert")).toHaveCount(0); await expect(name).toHaveValue("Edição pessoal ainda não salva");
    await expect(panel.getByRole("heading", { name: "Seus vínculos com pacientes", exact: true })).toBeVisible();
    await expect(panel.getByText("Nenhum vínculo local disponível para consulta.", { exact: false })).toBeVisible();
    mode = "restrictedMembership"; await page.evaluate(() => window.dispatchEvent(new Event("hca:data-changed")));
    await expect(panel.getByText("Paciente com acesso indisponível", { exact: true })).toBeVisible();
    await expect(panel.getByText(/Situação do paciente indisponível/)).toBeVisible();
    await expect(panel.getByText(/Paciente inativo/)).toHaveCount(0);
    // Empty collections and restricted metadata above are controlled HTTP responses; the
    // profile itself remains the real authorized record and is never mutated.
    mode = "live"; await page.evaluate(() => window.dispatchEvent(new Event("hca:data-changed")));
    await expect(panel.getByText("Nenhum vínculo local disponível para consulta.", { exact: false })).toHaveCount(0);
    await expect(name).toHaveValue("Edição pessoal ainda não salva");
    const current = await (await page.request.get("/api/profile")).json(); expect(current.data.full_name).not.toBe("Edição pessoal ainda não salva");
    mode = "error"; await page.reload();
    await expect(panel.getByRole("alert")).toContainText("Falha controlada na leitura do perfil");
    await expect(panel.getByText("Carregando perfil…", { exact: true })).toHaveCount(0);
    await expect(panel.getByRole("heading", { name: "Identidade pessoal", exact: true })).toHaveCount(0);
    mode = "live"; await panel.getByRole("button", { name: "Consultar perfil novamente", exact: true }).click();
    await expect(panel.getByRole("heading", { name: "Identidade pessoal", exact: true })).toBeVisible();
    for (const width of [320, 390, 768, 1440]) { await page.setViewportSize({ width, height: 900 }); await audit(page, "D3 profile read " + width); }
  } finally { release(); }
});

test("D3 consumo distingue demora vazio dados falha e repetição sem inventar movimentação", async ({ page }) => {
  const f = await setup(); await login(page, f.patient);
  let release!: () => void, entered!: () => void, mode: "delay" | "error" | "invalid" | "live" = "delay";
  const gate = new Promise<void>(resolve => { release = resolve; }), first = new Promise<void>(resolve => { entered = resolve; });
  await page.route("**/api/consumption?*", async route => {
    if (mode === "delay") { const response = await route.fetch(); entered(); await gate; return route.fulfill({ response }); }
    if (mode === "error") return route.fulfill({ status: 500, json: { code: "INTERNAL_ERROR", error: "Falha controlada na leitura do consumo" } });
    if (mode === "invalid") return route.fulfill({ status: 200, json: { data: null, next: null } });
    return route.continue();
  });
  try {
    await page.goto("/consumo?careRecipientId=" + f.patient); await first;
    const panel = page.getByRole("region", { name: "Relatos registrados", exact: true });
    await expect(panel.getByText("Carregando relatos…", { exact: true })).toBeVisible();
    await expect(panel.getByText("Nenhum relato encontrado para estes filtros.", { exact: true })).toHaveCount(0);
    mode = "error"; release(); await expect(panel.getByText("Nenhum relato encontrado para estes filtros.", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Atualizar lista", exact: true }).click();
    await expect(panel.getByRole("alert")).toContainText("Falha controlada na leitura do consumo");
    await expect(panel.getByText("Nenhum relato encontrado para estes filtros.", { exact: true })).toHaveCount(0); await expect(panel.getByText("Carregando relatos…", { exact: true })).toHaveCount(0);
    mode = "invalid"; await page.getByRole("button", { name: "Atualizar lista", exact: true }).click();
    await expect(panel.getByRole("alert")).toContainText("A resposta recebida não corresponde à consulta dos relatos. Atualize a lista.");
    const admin = await actor("adminA", f.patient), text = "Relato fictício para estados de consulta " + randomUUID().slice(0, 8);
    await rpc(admin, "report_extraordinary_consumption", { p_patient: f.patient, p_kind: "shortage", p_location: "FAMILY", p_text: text, p_lines: [], p_key: randomUUID() });
    mode = "live"; await page.getByRole("button", { name: "Atualizar lista", exact: true }).click();
    await expect(panel.getByText(text, { exact: true })).toBeVisible(); await expect(panel.getByRole("alert")).toHaveCount(0);
    for (const width of [320, 390, 768, 1440]) { await page.setViewportSize({ width, height: 900 }); await audit(page, "D3 consumption read " + width); }
    const query = panel.getByLabel("Buscar no relato original", { exact: true }); await query.fill("Termo fictício sem correspondência"); await panel.getByRole("button", { name: "Aplicar filtros", exact: true }).click();
    await expect(panel.getByText("Nenhum relato encontrado para estes filtros.", { exact: true })).toBeVisible(); await expect(panel.getByText(text, { exact: true })).toHaveCount(0);
    const report = (await (await page.request.get("/api/consumption?careRecipientId=" + f.patient)).json()).data;
    expect(report).toHaveLength(1); expect(report[0].body).toBe(text); expect(report[0].status).toBe("reported");
    expect(sql(`select count(*) from public.stock_movements where care_recipient_id=${sqlLiteral(f.patient)} and reference_type='consumption';`)).toBe("0");
  } finally { release(); }
});
