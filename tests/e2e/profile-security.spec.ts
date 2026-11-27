import { expect, test, type Page } from "@playwright/test";
import { setup } from "../integration/v4-fixtures.mjs";
import { shiftWorker } from "../integration/shift-fixtures.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { selectContext } from "./auth-context";
import { totp } from "./auth-totp";
import { openProfilePassword } from "./profile-sections";

test.setTimeout(180_000);
// Credentials, OTP and the authenticator QR exist only in the fake account's live session.
test.use({ trace: "off", screenshot: "off", video: "off" });

async function login(page: Page, email: string, patient: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible();
  await selectContext(page, patient);
  await page.goto("/perfil?profileTab=security");
}

async function currentSession(page: Page) {
  const response = await page.request.get("/api/profile");
  expect(response.ok()).toBe(true);
  const row = (await response.json()).sessions.find((session: { current: boolean }) => session.current);
  expect(Boolean(row?.id)).toBe(true);
  return String(row.id);
}

test("E11-03 ativa TOTP com código válido, preserva a sessão ao alterar senha e exige código para remoção", async ({ page, browser }) => {
  const fixture = await setup(), account = await shiftWorker(fixture.patient, "family");
  await login(page, account.email, fixture.patient);
  await page.getByRole("button", { name: /^Aplicativo autenticador/ }).click();
  const authenticator = page.getByRole("dialog", { name: "Aplicativo autenticador", exact: true });
  const prepared = page.waitForResponse(response => /\/auth\/v1\/factors$/.test(new URL(response.url()).pathname) && response.request().method() === "POST");
  await authenticator.getByRole("button", { name: "Configurar autenticador", exact: true }).click();
  const response = await prepared;
  expect(response.ok()).toBe(true);
  const enrollment = await response.json(), factor = String(enrollment.id), secret = String(enrollment.totp.secret);
  const status = () => sql(`select status from auth.mfa_factors where id=${q(factor)} and user_id=${q(account.id)};`);
  expect(status()).toBe("unverified");
  await expect(authenticator.getByAltText("QR privado para cadastrar seu autenticador")).toBeVisible();
  const code = authenticator.getByLabel(/Código de 6 dígitos/);
  const windowCodes = [-60_000, -30_000, 0, 30_000, 60_000].map(offset => totp(secret, Date.now() + offset));
  const wrong = ["000000", "000001", "000002", "000003", "000004", "000005"].find(value => !windowCodes.includes(value))!;
  await code.fill(wrong);
  await authenticator.getByRole("button", { name: "Ativar proteção", exact: true }).click();
  const invalid = page.getByRole("dialog", { name: "Código inválido ou expirado", exact: true });
  await invalid.getByRole("button", { name: "Digitar outro código", exact: true }).click();
  expect(status()).toBe("unverified");
  await expect(code).toHaveValue("");
  const used = totp(secret);
  await code.fill(used);
  await authenticator.getByRole("button", { name: "Ativar proteção", exact: true }).click();
  await page.getByRole("dialog", { name: "Proteção adicional ativada", exact: true }).getByRole("button", { name: "Concluir", exact: true }).click();
  expect(status()).toBe("verified");
  await authenticator.getByRole("button", { name: "Voltar", exact: true }).click();

  const sid = await currentSession(page);
  const assurance = () => sql(`select aal from auth.sessions where id=${q(sid)} and user_id=${q(account.id)};`);
  expect(assurance()).toBe("aal2");
  const password = await openProfilePassword(page);
  const changed = "Senha fictícia renovada 71!";
  await password.getByLabel(/Senha atual/).fill(fixturePassword);
  await password.getByLabel("Nova senha", { exact: true }).fill(changed);
  await password.getByLabel(/Repita a nova senha/).fill("Confirmação diferente 71!");
  await password.getByRole("button", { name: "Atualizar senha", exact: true }).click();
  await expect(password.getByText("A confirmação deve ser igual à nova senha.", { exact: true })).toBeVisible();
  await password.getByLabel(/Repita a nova senha/).fill(changed);
  await password.getByRole("button", { name: "Atualizar senha", exact: true }).click();
  await page.getByRole("dialog", { name: "Senha atualizada", exact: true }).getByRole("button", { name: "Concluir", exact: true }).click();
  expect(await currentSession(page)).toBe(sid);
  expect(assurance()).toBe("aal2");
  expect((await (await page.request.get("/api/context")).json()).data.activeContext.care_recipient_id).toBe(fixture.patient);
  const unverified = await browser.newContext();
  try {
    const second = await unverified.newPage();
    await second.goto(new URL("/login", page.url()).href);
    await second.getByLabel("E-mail", { exact: true }).fill(account.email);
    await second.getByLabel("Senha", { exact: true }).fill(changed);
    await second.getByRole("button", { name: "Entrar", exact: true }).click();
    await expect(second).toHaveURL(/\/perfil\?mfa=required/);
    await expect(second.getByRole("dialog", { name: "Verificação adicional", exact: true })).toBeVisible();
    const deniedPassword = await second.request.post("/api/profile", {
      data: { action: "password", currentPassword: changed, password: "Tentativa fictícia 99!" },
    });
    const deniedSessions = await second.request.post("/api/profile", { data: { action: "signoutOthers" } });
    expect([deniedPassword.status(), deniedSessions.status()]).toEqual([403, 403]);
    expect([(await deniedPassword.json()).code, (await deniedSessions.json()).code]).toEqual(["MFA_REQUIRED", "MFA_REQUIRED"]);
  } finally { await unverified.close(); }

  await page.getByRole("button", { name: /^Aplicativo autenticador/ }).click();
  await authenticator.getByRole("button", { name: "Remover método", exact: true }).click();
  const confirmation = page.getByRole("dialog", { name: "Verificação adicional", exact: true });
  await expect(confirmation).toBeVisible();
  let newCode = "";
  await expect.poll(() => { newCode = totp(secret); return newCode !== used; }, { timeout: 38_000, intervals: [1_000] }).toBe(true);
  await page.route("**/auth/v1/factors/*/verify", route => route.abort("failed"));
  await confirmation.getByLabel(/Código de 6 dígitos/).fill(newCode);
  await confirmation.getByRole("button", { name: "Verificar código", exact: true }).click();
  const removal = page.getByRole("dialog", { name: "Remover o autenticador?", exact: true });
  const uncertain = page.getByRole("dialog", { name: "Não foi possível confirmar a solicitação", exact: true });
  await uncertain.getByRole("button", { name: "Conferir resultado", exact: true }).click();
  await expect(uncertain.getByText(/A consulta ainda não confirmou/)).toBeVisible();
  await expect(removal).toHaveCount(0);
  await uncertain.getByRole("button", { name: "Voltar", exact: true }).click();
  await page.unroute("**/auth/v1/factors/*/verify");
  await confirmation.getByLabel(/Código de 6 dígitos/).fill(totp(secret));
  await confirmation.getByRole("button", { name: "Verificar código", exact: true }).click();
  await expect(removal).toBeVisible();
  expect(status()).toBe("verified");
  await removal.getByRole("button", { name: "Remover método", exact: true }).click();
  await page.getByRole("dialog", { name: "Autenticador removido", exact: true }).getByRole("button", { name: "Concluir", exact: true }).click();
  expect(status()).toBe("");
  expect(await currentSession(page)).toBe(sid);
});

test("E11-03 confere encerramento das outras sessões sem reenviar e mantém a sessão atual", async ({ page }, info) => {
  const fixture = await setup(), account = await shiftWorker(fixture.patient, "family");
  await login(page, account.email, fixture.patient);
  const sid = await currentSession(page);
  await expect(page.getByRole("button", { name: /^Aplicativo autenticador/ })).toContainText("Adicione uma etapa de confirmação ao acesso");
  for (const width of [360, 412]) {
    await page.setViewportSize({ width, height: 844 });
    await expect(page.getByRole("heading", { name: "A proteção da sua conta", exact: true })).toBeVisible();
    await info.attach(`e11-seguranca-${width}`, { body: await page.screenshot(), contentType: "image/png" });
  }
  await page.getByRole("button", { name: /^Onde minha conta está aberta/ }).click();
  const sessions = page.getByRole("dialog", { name: "Minhas sessões", exact: true });
  await expect(sessions.getByText("Esta sessão", { exact: true })).toBeVisible();
  await expect(sessions.getByRole("heading", { name: "Outras sessões", exact: true })).toBeVisible();
  let posts = 0;
  await page.route("**/api/profile", async route => {
    if (route.request().method() !== "POST" || route.request().postDataJSON().action !== "signoutOthers") return route.continue();
    posts += 1;
    expect((await route.fetch()).ok()).toBe(true);
    await route.abort("failed");
  });
  await sessions.getByRole("button", { name: "Encerrar outras sessões", exact: true }).click();
  const confirm = page.getByRole("dialog", { name: "Encerrar as outras sessões?", exact: true });
  await expect(confirm.getByText(/Credenciais já emitidas/)).toBeVisible();
  expect(posts).toBe(0);
  await confirm.getByRole("button", { name: "Encerrar outras sessões", exact: true }).click();
  const uncertain = page.getByRole("dialog", { name: "Não foi possível confirmar o encerramento", exact: true });
  await uncertain.getByRole("button", { name: "Conferir sessões", exact: true }).click();
  await page.getByRole("dialog", { name: "Encerramento solicitado", exact: true }).getByRole("button", { name: "Concluir", exact: true }).click();
  await expect(sessions.getByRole("heading", { name: "Somente esta sessão", exact: true })).toBeVisible();
  expect(posts).toBe(1);
  expect(await currentSession(page)).toBe(sid);
  expect(Boolean((await account.client.auth.refreshSession()).error)).toBe(true);
  for (const width of [360, 412]) {
    await page.setViewportSize({ width, height: 844 });
    await expect(sessions).toBeVisible();
    const box = await sessions.boundingBox();
    expect(box && box.x + box.width).toBeLessThanOrEqual(width);
    await info.attach(`e11-sessoes-${width}`, { body: await page.screenshot(), contentType: "image/png" });
  }
});
