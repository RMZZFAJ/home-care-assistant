import { test, expect, type Page } from "@playwright/test";
import { credentialFixture, credentialRead, reviewPacket, credentialHistory, fixtures, rpc } from "../integration/credential-fixtures.mjs";
import { officialState } from "../integration/private-draft-fixtures.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";
import { audit } from "./accessibility-audit";

test.setTimeout(180_000);
type Fixture = Awaited<ReturnType<typeof credentialFixture>>;
async function login(page: Page, f: Fixture, email = fixtures.adminA.email) {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible();
  await selectContext(page, f.patient);
}
const drawer = (page: Page) => page.getByRole("dialog", { name: "Conferência familiar da credencial", exact: true });
async function open(page: Page, f: Fixture) {
  await page.goto(`/admin?careRecipientId=${f.patient}&section=memberships`);
  const opener = page.getByRole("article").filter({ has: page.getByRole("heading", { name: "Técnica fictícia", exact: true }) }).getByRole("button", { name: "Conferir credencial", exact: true });
  await opener.click();
  await expect(drawer(page).getByRole("region", { name: "Declaração consultada", exact: true })).toContainText("001234");
  return opener;
}
async function prepare(page: Page) {
  await drawer(page).getByRole("combobox", { name: "Resultado da conferência", exact: true }).selectOption("checked");
  await drawer(page).getByRole("checkbox", { name: /Revisei os dados da versão exibida/ }).check();
}
async function submit(page: Page) {
  const done = page.waitForResponse(r => new URL(r.url()).pathname === "/api/admin/credentials" && r.request().method() === "POST");
  await drawer(page).getByRole("button", { name: "Registrar conferência familiar", exact: true }).click();
  return done;
}

test("credencial familiar recupera resposta perdida após reload, pagina história e separa erro de leitura de validação", async ({ page }) => {
  const f = await credentialFixture(), before = officialState(f), read = await credentialRead(f);
  await login(page, f);
  await open(page, f);
  await prepare(page);
  const note = drawer(page).getByRole("textbox", { name: "Observação da conferência", exact: true });
  await note.fill("Conferência familiar fictícia");
  await drawer(page).getByRole("button", { name: "Fechar edição", exact: true }).click();
  await drawer(page).getByRole("button", { name: "Continuar editando", exact: true }).click();
  await expect(note).toBeFocused(); await expect(note).toHaveValue("Conferência familiar fictícia");
  const packets: unknown[] = []; let dropped = false;
  await page.route("**/api/admin/credentials", async route => {
    if (route.request().method() === "POST") {
      packets.push(route.request().postDataJSON());
      if (!dropped) { const response = await route.fetch(); expect(response.status()).toBe(200); dropped = true; await route.abort("failed"); return; }
    }
    await route.continue();
  });
  await drawer(page).getByRole("button", { name: "Registrar conferência familiar", exact: true }).click();
  await expect(drawer(page).getByRole("region", { name: "Tentativa de conferência preservada", exact: true })).toBeVisible();
  const saved = credentialHistory(f);
  expect(JSON.parse(saved)).toHaveLength(1);
  await page.reload(); await open(page, f);
  await expect(drawer(page).getByRole("combobox", { name: "Resultado da conferência", exact: true })).toBeDisabled();
  await drawer(page).getByRole("button", { name: "Recuperar mesma conferência", exact: true }).click();
  await expect(drawer(page).getByText("A conferência foi registrada. Consulte abaixo a situação atual e o histórico.", { exact: true })).toBeVisible();
  await expect(drawer(page).getByRole("region", { name: "Declaração consultada", exact: true })).toContainText("Conferido pela família");
  expect(packets).toHaveLength(2); expect(packets[1]).toEqual(packets[0]); expect(credentialHistory(f)).toBe(saved);
  for (let i = 0; i < 21; i++) await rpc(f.reviewer, "review_professional_credential", reviewPacket(f, read, { p_note: `Histórico fictício ${i}` }));
  await drawer(page).getByRole("button", { name: "Consultar versão atual", exact: true }).click();
  const history = drawer(page).getByRole("region", { name: "Histórico de conferências", exact: true });
  await expect(history.getByRole("article", { name: "Registro de conferência", exact: true })).toHaveCount(20);
  await history.getByRole("button", { name: "Carregar conferências anteriores", exact: true }).click();
  await expect(history.getByRole("article", { name: "Registro de conferência", exact: true })).toHaveCount(22);
  const finalHistory = credentialHistory(f);
  await page.route("**/api/admin/credentials?**", route => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "Falha controlada na consulta da credencial", code: "READ_UNAVAILABLE" }) }));
  await drawer(page).getByRole("button", { name: "Consultar versão atual", exact: true }).click();
  await expect(drawer(page)).toContainText("Falha controlada na consulta da credencial");
  await expect(drawer(page).getByRole("region", { name: "Declaração consultada", exact: true })).toHaveCount(0);
  await expect(drawer(page).locator('[aria-invalid="true"]')).toHaveCount(0);
  expect(credentialHistory(f)).toBe(finalHistory);
  await page.unroute("**/api/admin/credentials?**");
  await drawer(page).getByRole("button", { name: "Consultar credencial novamente", exact: true }).click();
  await expect(drawer(page).getByRole("region", { name: "Declaração consultada", exact: true })).toBeVisible();
  for (const width of [320, 390, 768, 1440]) { await page.setViewportSize({ width, height: 900 }); await audit(page, `credential history ${width}`); }
  expect(officialState(f)).toBe(before);
  await drawer(page).getByRole("button", { name: "Fechar edição", exact: true }).click();
  await expect(drawer(page)).toHaveCount(0);
});

test("titular altera credencial no próprio perfil; família recebe409 sem rebase, confere novamente e mantém o valor anterior", async ({ page, browser }) => {
  const f = await credentialFixture(), before = officialState(f);
  const capabilities = await rpc(f.subject.client, "patient_capabilities", { p_patient: f.patient });
  await login(page, f); await open(page, f); await prepare(page);
  expect((await submit(page)).status()).toBe(200);
  await expect(drawer(page).getByRole("region", { name: "Declaração consultada", exact: true })).toContainText("Conferido pela família");
  const old = await credentialRead(f), oldHistory = credentialHistory(f);
  const owner = await browser.newContext();
  try {
    const own = await owner.newPage(); await login(own, f, f.subject.email);
    await own.goto("/perfil"); await own.getByRole("button", { name: "Identidade pessoal", exact: true }).click();
    await own.getByLabel("Nome", { exact: true }).fill("Cuidadora fictícia");
    await own.getByLabel("Categoria profissional", { exact: true }).fill("Cuidadora");
    await own.getByLabel("Registro profissional", { exact: true }).fill("");
    await own.locator('select[name="state"]').selectOption("");
    const updated = own.waitForResponse(r => new URL(r.url()).pathname === "/api/profile" && r.request().method() === "POST");
    await own.getByRole("button", { name: "Salvar perfil", exact: true }).click(); expect((await updated).status()).toBe(200);
    await expect(own.getByText("Perfil atualizado.", { exact: true })).toBeVisible();
  } finally { await owner.close(); }
  await prepare(page);
  expect((await submit(page)).status()).toBe(409);
  await expect(drawer(page)).toContainText("Os dados ou a intenção da conferência mudaram");
  expect(credentialHistory(f)).toBe(oldHistory);
  await drawer(page).getByRole("button", { name: "Consultar versão atual", exact: true }).click();
  const declared = drawer(page).getByRole("region", { name: "Declaração consultada", exact: true });
  await expect(declared).toContainText("nova conferência necessária"); await expect(declared).toContainText("Cuidadora"); await expect(declared).toContainText("Sem registro informado");
  await expect(drawer(page).getByRole("region", { name: "Última conferência familiar", exact: true })).toContainText("001234");
  await prepare(page); expect((await submit(page)).status()).toBe(200);
  await expect(declared).toContainText("Conferido pela família");
  const current = await credentialRead(f);
  expect(current.history).toHaveLength(2); expect(current.latestReview?.declaration.registration).toBeNull();
  expect(current.history[1].declaration.registration).toBe("001234"); expect(current.latestReview?.credentialRevision).not.toBe(old.declaration.revision);
  expect(current.externalValidation).toBeNull(); expect(officialState(f)).toBe(before);
  expect(await rpc(f.subject.client, "patient_capabilities", { p_patient: f.patient })).toEqual(capabilities);
});
