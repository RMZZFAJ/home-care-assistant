import { selectProfileSection } from "./profile-sections";
import { expect, test, type Page } from "@playwright/test";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdirSync, readFileSync } from "node:fs";
import { fixtureFile, sql, sqlLiteral } from "../../scripts/test-environment.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { setup, actor, rpc } from "../integration/v4-fixtures.mjs";
import { selectContext } from "./auth-context";
import { audit } from "./accessibility-audit";

const fixtures = () => JSON.parse(readFileSync(fixtureFile, "utf8"));
test("CFinal021 conta alheia tem revisão global própria e não atravessa Meu perfil ou o escopo local", async ({ page }) => {
  test.setTimeout(120_000);
  const f = await setup(), target = fixtures().shared.id, own = fixtures().global.id;
  const profile = (id: string) => JSON.parse(sql(`select jsonb_build_object('fullName',full_name,'role',role,'status',status,'globalScope',global_scope) from public.profiles where id=${sqlLiteral(id)};`));
  const before = profile(target), ownBefore = profile(own), changedName = "Conta fictícia revisada " + randomUUID().slice(0, 8);
  try {
    await login(page, "global", null); await page.goto("/admin?section=profiles");
    const search = page.getByRole("searchbox", { name: "Pesquisar contas globais", exact: true });
    await search.fill(before.fullName);
    await page.getByRole("button", { name: "Buscar contas", exact: true }).click();
    await page.getByRole("button", { name: "Editar conta " + before.fullName, exact: true }).click();
    const editor = page.getByRole("dialog", { name: "Editar conta global", exact: true });
    await expect(editor.getByRole("heading", { name: "Meu perfil e segurança", exact: true })).toHaveCount(0);
    const classification = editor.getByRole("combobox", { name: "Papel global", exact: true });
    await expect(classification.locator("option")).toHaveText(["Administração", "Supervisão", "Profissional", "Leitura"]);
    await expect(classification).toHaveValue(before.role);
    await expect(editor.getByLabel("Nome da conta", { exact: true })).toHaveValue(before.fullName);
    await editor.getByLabel("Nome da conta", { exact: true }).fill(changedName);
    await editor.getByRole("button", { name: "Revisar alteração", exact: true }).click();
    const review = page.getByRole("dialog", { name: "Revisar conta global", exact: true });
    await expect(review.locator("input,textarea,select")).toHaveCount(0);
    await expect(review.getByText(changedName, { exact: true })).toBeVisible();
    expect(profile(target)).toEqual(before);
    const saved = page.waitForResponse(response => new URL(response.url()).pathname === "/api/admin" && response.request().method() === "POST");
    await review.getByRole("button", { name: "Confirmar conta global", exact: true }).click(); expect((await saved).ok()).toBe(true);
    await expect.poll(() => profile(target)).toEqual({ ...before, fullName: changedName });
    await expect(editor).toHaveCount(0); await expect(review).toHaveCount(0);
    expect(profile(own)).toEqual(ownBefore);
    await search.fill(changedName);
    await page.getByRole("button", { name: "Buscar contas", exact: true }).click();
    await page.getByRole("button", { name: "Editar conta " + changedName, exact: true }).click();
    await editor.getByLabel("Nome da conta", { exact: true }).fill(before.fullName);
    await editor.getByRole("button", { name: "Revisar alteração", exact: true }).click();
    const restored = page.waitForResponse(response => new URL(response.url()).pathname === "/api/admin" && response.request().method() === "POST");
    await review.getByRole("button", { name: "Confirmar conta global", exact: true }).click(); expect((await restored).ok()).toBe(true);
    await expect.poll(() => profile(target)).toEqual(before);
    await page.goto("/perfil"); await selectProfileSection(page, "identity");
    await expect(page.getByLabel("Nome", { exact: true })).toHaveValue(ownBefore.fullName);
    await login(page, "adminA", f.patient);
    expect((await page.request.get("/api/admin?section=profiles")).status()).toBe(403);
    expect((await page.request.post("/api/admin", { data: { action: "profile", userId: target, ...before, fullName: changedName } })).status()).toBe(403);
    expect(profile(target)).toEqual(before); expect(profile(own)).toEqual(ownBefore);
  } finally {
    // Only the exact synthetic rename from this case can be compensated.
    sql(`update public.profiles set full_name=${sqlLiteral(before.fullName)} where id=${sqlLiteral(target)} and full_name=${sqlLiteral(changedName)} and role=${sqlLiteral(before.role)} and status=${sqlLiteral(before.status)} and global_scope=${before.globalScope ? "true" : "false"};`);
  }
});
async function enter(page: Page, name: string) {
  await page.getByLabel("E-mail", { exact: true }).fill(fixtures()[name].email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
}
async function login(page: Page, name: string, patient: string | null) {
  await page.goto("/login"); await enter(page, name);
  await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible();
  await selectContext(page, patient);
}

test("convite exige a conta correta e apresenta o vínculo somente para leitura antes do aceite", async ({ page }) => {
  test.setTimeout(120_000);
  const f = await setup(), token = randomBytes(32).toString("base64url"), hash = createHash("sha256").update(token).digest("hex");
  const invitation = await rpc(f.admin, "admin_create_invitation", { p_care_recipient_id: f.patient, p_email: fixtures().adminB.email, p_role: "professional", p_can_manage_stock: false, p_can_count_stock: true, p_token_hash: hash, p_expires_at: new Date(Date.now() + 3600_000).toISOString() });
  await login(page, "adminA", f.patient);
  await page.goto("/convites/aceitar#token=" + token);
  await expect(page.getByRole("button", { name: "Trocar conta", exact: true })).toBeVisible();
  await expect(page.getByRole("definition")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Aceitar convite com minha conta", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Trocar conta", exact: true }).click();
  await expect(page).toHaveURL(/\/login\?next=/); await enter(page, "adminB");
  const preview = page.getByRole("definition");
  await expect(preview).toContainText([sql(`select display_name from public.care_recipients where id=${sqlLiteral(f.patient)};`), "Profissional", fixtures().adminB.email, "Teste adminA", "America/Sao_Paulo", "Realizar contagem"]);
  const summary = page.locator('dl[aria-label="Resumo do vínculo convidado"]');
  await expect(summary.locator("input,select,textarea")).toHaveCount(0);
  for (const width of [1440, 390]) { await page.setViewportSize({ width, height: 900 }); await audit(page, "D1 invitation preview " + width); }
  mkdirSync("output/playwright/phase-d", { recursive: true });
  await page.screenshot({ path: `output/playwright/phase-d/invitation-preview-${test.info().project.name}.png`, fullPage: true, animations: "disabled" });
  const sent = page.waitForRequest(request => request.method() === "POST" && new URL(request.url()).pathname === "/api/invitations/accept");
  await page.getByRole("button", { name: "Aceitar convite com minha conta", exact: true }).click();
  expect(Object.keys((await sent).postDataJSON()).sort()).toEqual(["decision", "token"]);
  await expect(page.getByText("Convite aceito.", { exact: false })).toBeVisible();
  expect(sql(`select role::text from public.care_recipient_memberships where care_recipient_id=${sqlLiteral(f.patient)} and user_id=${sqlLiteral(fixtures().adminB.id)};`)).toBe("professional");
  await page.goto("/convites/aceitar#token=" + token);
  await expect(page.getByText("Convite já aceito por sua conta.", { exact: false })).toBeVisible();
  expect(sql(`select accepted_by::text from public.care_recipient_invitations where id=${sqlLiteral(invitation.id)};`)).toBe(fixtures().adminB.id);
});

test("retry de aprovação oferece reemissão explícita sem duplicar convite nem inventar o segredo", async ({ page }) => {
  test.setTimeout(120_000);
  const f = await setup(), global = await actor("global");
  const version = (await rpc(f.admin, "patient_governance", { p_patient: f.patient })).data.version;
  const proposal = await rpc(global, "configure_patient_access", { p_patient: f.patient, p_kind: "membership", p_change: { userId: fixtures().adminB.id, role: "professional" }, p_key: randomUUID(), p_version: version });
  await login(page, "adminA", f.patient);
  const payload = { careRecipientId: f.patient, kind: "membership", change: {}, idempotencyKey: randomUUID(), expectedVersion: proposal.base_version, requestId: proposal.id, decision: "approve" };
  // Persist the first real approval, then discard its response as a lost client
  // result. Retry the same approved request through HTTP with a new attempt.
  const first = await page.request.post("/api/patient-settings", { data: payload });
  expect(first.ok()).toBe(true); const issued = await first.json();
  expect(issued.invitationUrl).toBeTruthy();
  const retried = await page.request.post("/api/patient-settings", { data: { ...payload, idempotencyKey: randomUUID() } });
  expect(retried.ok()).toBe(true); const recovered = await retried.json();
  expect(recovered).not.toHaveProperty("invitationUrl");
  expect(recovered.invitationRecovery).toMatchObject({ action: "reissue", invitationId: issued.data.resolution.invitationId });
  expect(sql(`select count(*) from public.care_recipient_invitations where care_recipient_id=${sqlLiteral(f.patient)};`)).toBe("1");
  await page.goto("/configuracoes?area=people");
  const renewed = page.waitForResponse(response => response.request().method() === "POST" && new URL(response.url()).pathname === "/api/admin");
  await page.getByRole("button", { name: "Reemitir convite e invalidar link anterior", exact: true }).click();
  expect((await renewed).ok()).toBe(true);
  const newLink = await page.getByRole("textbox", { name: "Convite aprovado", exact: true }).inputValue();
  expect(newLink).not.toBe(issued.invitationUrl);
  const oldToken = new URLSearchParams(new URL(issued.invitationUrl).hash.slice(1)).get("token");
  const oldPreview = await page.request.post("/api/invitations/preview", { data: { token: oldToken } });
  expect(await oldPreview.json()).toEqual({ data: { state: "invalid" } });
  expect(sql(`select count(*) from public.care_recipient_invitations where care_recipient_id=${sqlLiteral(f.patient)};`)).toBe("1");
  expect(sql(`select count(*) from public.care_recipient_memberships where care_recipient_id=${sqlLiteral(f.patient)} and user_id=${sqlLiteral(fixtures().adminB.id)};`)).toBe("0");
});

test("UUID global inválido retorna erro de validação seguro e não recuperável", async ({ page }) => {
  await login(page, "global", null);
  const response = await page.request.get("/api/admin?section=memberships&careRecipientId=not-a-uuid");
  expect(response.status()).toBe(400);
  expect(await response.json()).toMatchObject({ code: "VALIDATION_ERROR", retryable: false });
  expect(response.headers()["x-correlation-id"]).toBeTruthy();
});

test("perfil recebe invalidação externa e senha nova conserva limites em caracteres e UTF-8", async ({ page }) => {
  test.setTimeout(120_000);
  const f = await setup(); await login(page, "adminA", f.patient); await page.goto("/perfil");
  const previous = JSON.parse(sql(`select to_jsonb(p) from public.profiles p where id=${sqlLiteral(fixtures().adminA.id)};`));
  const name = "Nome fictício atualizado " + randomUUID().slice(0, 8);
  try {
    await rpc(f.admin, "update_my_profile", { p_name: name, p_registration: "", p_state: null, p_category: "", p_preferences: {} });
    await expect(page.getByLabel("Menu do usuário", { exact: true })).toContainText(name);
    await selectProfileSection(page, "security");
    const password = page.getByLabel("Nova senha", { exact: true });
    await expect(password).toHaveAttribute("minlength", "12"); await expect(password).toHaveAttribute("maxlength", "72");
    await expect(password).toHaveAttribute("autocomplete", "new-password");
    await password.fill("a".repeat(72)); expect(await password.evaluate((input: HTMLInputElement) => input.checkValidity())).toBe(true);
    await password.fill("á".repeat(37)); expect(await password.evaluate((input: HTMLInputElement) => input.checkValidity())).toBe(false);
    expect(await password.evaluate((input: HTMLInputElement) => input.validationMessage)).toContain("72 bytes");
    await expect(page.getByText("Letras acentuadas podem ocupar mais de um byte.", { exact: false })).toBeVisible();
    await password.fill("a".repeat(12)); await page.getByRole("button", { name: "Mostrar nova senha", exact: true }).click(); await expect(password).toHaveAttribute("type", "text");
    await page.getByRole("button", { name: "Ocultar nova senha", exact: true }).click(); await expect(password).toHaveAttribute("type", "password");
    await password.fill("");
    await audit(page, "D1 profile password");
  } finally {
    await rpc(f.admin, "update_my_profile", { p_name: previous.full_name, p_registration: previous.professional_registration ?? "", p_state: previous.professional_state, p_category: previous.professional_category ?? "", p_preferences: previous.notification_preferences });
  }
});

test("API de estoque rejeita o sétimo decimal em número e texto antes de gravar", async ({ page }) => {
  const f = await setup(); await login(page, "adminA", f.patient);
  for (const quantity of [1.0000004, "1.0000004", 0.0000001, "0.0000001"]) {
    const key = randomUUID();
    const response = await page.request.post("/api/stock/movements", { data: { careRecipientId: f.patient, productId: f.products[0], quantity, action: "inbound", reason: "Precisão numérica da API fictícia", idempotencyKey: key } });
    expect(response.status()).toBe(400); expect(await response.json()).toMatchObject({ code: "VALIDATION_ERROR" });
    expect(sql(`select count(*) from public.stock_movements where idempotency_key=${sqlLiteral(key)};`)).toBe("0");
  }
});
