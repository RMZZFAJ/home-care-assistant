import { openProfileIdentity, selectProfileSection } from "./profile-sections";
import { test, expect, type Page } from "@playwright/test";
import { credentialFixture, credentialRead, reviewPacket, credentialHistory, fixtures, rpc } from "../integration/credential-fixtures.mjs";
import { officialState } from "../integration/private-draft-fixtures.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";
import { audit } from "./accessibility-audit";
import { openMembershipDetails } from "./membership-panel";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

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
const drawer = (page: Page) => page.getByRole("dialog", { name: "Credencial profissional", exact: true });
const editor = (page: Page) => page.getByRole("dialog", { name: "Conferência da família", exact: true });
const declaration = (page: Page) => drawer(page).getByRole("region", { name: "Declaração atual", exact: true });
async function open(page: Page, f: Fixture) {
  await page.goto(`/admin?careRecipientId=${f.patient}&section=memberships`);
  const details = await openMembershipDetails(page, "Técnica fictícia");
  const opener = details.getByRole("button", { name: /^Credencial profissional/ });
  await opener.click();
  await expect(declaration(page)).toContainText("001234");
  return opener;
}
async function prepare(page: Page) {
  await drawer(page).getByRole("button", { name: /Conferir declaração|Registrar nova conferência/ }).click();
  await editor(page).getByRole("combobox", { name: "Resultado da conferência", exact: true }).selectOption("checked");
  await editor(page).getByRole("checkbox", { name: "Conferi os dados desta declaração", exact: true }).check();
}
async function submit(page: Page) {
  const done = page.waitForResponse(r => new URL(r.url()).pathname === "/api/admin/credentials" && r.request().method() === "POST");
  await editor(page).getByRole("button", { name: "Registrar conferência", exact: true }).click();
  return done;
}
async function finishReview(page: Page) {
  const result = page.getByRole("dialog", { name: "Conferência registrada", exact: true });
  await result.getByRole("button", { name: "Concluir", exact: true }).click();
  await expect(declaration(page)).toContainText("Conferido pela família");
}

test("credencial familiar recupera resposta perdida após reload, pagina história e separa erro de leitura de validação", async ({ page }) => {
  const f = await credentialFixture(), before = officialState(f), read = await credentialRead(f);
  await login(page, f);
  await open(page, f);
  await prepare(page);
  const note = editor(page).getByRole("textbox", { name: "Observação da família", exact: true });
  await note.fill("Conferência familiar fictícia");
  await editor(page).getByRole("button", { name: "Fechar edição", exact: true }).click();
  await page.getByRole("dialog", { name: "Sair sem concluir?", exact: true }).getByRole("button", { name: "Voltar ao preenchimento", exact: true }).click();
  await expect(note).toBeFocused(); await expect(note).toHaveValue("Conferência familiar fictícia");
  const packets: Record<string, unknown>[] = [];
  const lookups: Record<string, unknown>[] = [];
  let dropped = false;
  await page.route("**/api/admin/credentials/result", async route => {
    lookups.push(route.request().postDataJSON());
    if (lookups.length === 1) {
      await route.fulfill({ status: 503, json: { error: "Resultado indisponível", code: "RECOVERY_UNAVAILABLE" } });
    } else await route.continue();
  });
  let release!: () => void, arrived!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const entered = new Promise<void>(resolve => { arrived = resolve; });
  await page.route("**/api/admin/credentials", async route => {
    if (route.request().method() === "POST") {
      packets.push(route.request().postDataJSON());
      if (!dropped) { arrived(); await gate; const response = await route.fetch(); expect(response.status()).toBe(200); dropped = true; await route.abort("failed"); return; }
    }
    await route.continue();
  });
  const lost = page.waitForEvent("requestfailed", { predicate: request => new URL(request.url()).pathname === "/api/admin/credentials" && request.method() === "POST" });
  await editor(page).getByRole("button", { name: "Registrar conferência", exact: true }).click();
  await entered;
  try {
    await expect(page.getByRole("dialog", { name: "Confirmando a conferência da família", exact: true })).toBeVisible();
    expect(JSON.parse(credentialHistory(f))).toHaveLength(0);
  } finally { release(); }
  await lost; expect(dropped).toBe(true);
  const saved = credentialHistory(f);
  expect(JSON.parse(saved)).toHaveLength(1);
  await page.reload(); await open(page, f);
  const failure = page.getByRole("dialog", { name: "Não foi possível confirmar o resultado", exact: true });
  const lookup = failure.getByRole("button", { name: "Conferir resultado", exact: true });
  await expect(drawer(page).getByRole("button", { name: /Conferir declaração|Registrar nova conferência/ })).toHaveCount(0);
  await drawer(page).getByRole("button", { name: "Conferir resultado", exact: true }).click();
  await lookup.click();
  await expect(failure).toBeVisible();
  await expect(failure.getByText("Tentar novamente", { exact: true })).toHaveCount(0);
  await page.reload(); await open(page, f);
  await drawer(page).getByRole("button", { name: "Conferir resultado", exact: true }).click();
  await lookup.click();
  await finishReview(page);
  expect(packets).toHaveLength(1);
  expect(lookups).toHaveLength(2);
  const { careRecipientId, subjectId, expectedRevision, idempotencyKey } = packets[0];
  expect(lookups).toEqual([0, 1].map(() => ({ careRecipientId, subjectId, expectedRevision, idempotencyKey })));
  expect(credentialHistory(f)).toBe(saved);
  for (let i = 0; i < 21; i++) await rpc(f.reviewer, "review_professional_credential", reviewPacket(f, read, { p_note: `Histórico fictício ${i}` }));
  await drawer(page).getByRole("button", { name: "Ver histórico", exact: true }).click();
  const history = page.getByRole("dialog", { name: "Histórico de conferências", exact: true });
  await expect(history.getByRole("article", { name: "Registro de conferência", exact: true })).toHaveCount(20);
  await history.getByRole("button", { name: "Carregar conferências anteriores", exact: true }).click();
  await expect(history.getByRole("article", { name: "Registro de conferência", exact: true })).toHaveCount(22);
  await history.getByRole("button", { name: "Voltar", exact: true }).click();
  const finalHistory = credentialHistory(f);
  await page.route("**/api/admin/credentials?**", route => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "Falha controlada na consulta da credencial", code: "READ_UNAVAILABLE" }) }));
  await drawer(page).getByRole("button", { name: "Consultar versão atual", exact: true }).click();
  await expect(drawer(page)).toContainText("Falha controlada na consulta da credencial");
  await expect(declaration(page)).toHaveCount(0);
  await expect(drawer(page).locator('[aria-invalid="true"]')).toHaveCount(0);
  expect(credentialHistory(f)).toBe(finalHistory);
  await page.unroute("**/api/admin/credentials?**");
  await drawer(page).getByRole("button", { name: "Consultar credencial novamente", exact: true }).click();
  await expect(declaration(page)).toBeVisible();
  for (const width of [320, 390, 768, 1440]) { await page.setViewportSize({ width, height: 900 }); await audit(page, `credential history ${width}`); }
  expect(officialState(f)).toBe(before);
  await drawer(page).getByRole("button", { name: "Fechar edição", exact: true }).click();
  await expect(drawer(page)).toHaveCount(0);
});

test("titular altera credencial no próprio perfil; família compara a versão atual e mantém o valor anterior", async ({ page, browser }, info) => {
  const f = await credentialFixture(), before = officialState(f);
  const capabilities = await rpc(f.subject.client, "patient_capabilities", { p_patient: f.patient });
  await login(page, f); await open(page, f); await prepare(page);
  expect((await submit(page)).status()).toBe(200);
  await finishReview(page);
  const old = await credentialRead(f), oldHistory = credentialHistory(f);
  await prepare(page);
  const owner = await browser.newContext();
  try {
    const own = await owner.newPage(); await login(own, f, f.subject.email);
    await own.goto("/perfil"); await selectProfileSection(own, "identity");
    await openProfileIdentity(own);
    await own.getByRole("textbox", { name: "Nome completo", exact: true }).fill("Cuidadora fictícia");
    await own.getByLabel("Categoria profissional", { exact: true }).fill("Cuidadora");
    await own.getByLabel("Registro profissional", { exact: true }).fill("");
    await own.locator('select[name="state"]').selectOption("");
    const updated = own.waitForResponse(r => new URL(r.url()).pathname === "/api/profile" && r.request().method() === "POST");
    await own.getByRole("button", { name: "Salvar alterações", exact: true }).click(); expect((await updated).status()).toBe(200);
    await expect(own.getByRole("dialog", { name: "Identificação atualizada", exact: true })).toBeVisible();
  } finally { await owner.close(); }
  expect((await submit(page)).status()).toBe(409);
  await expect(editor(page)).toContainText("A declaração foi alterada enquanto você fazia a conferência.");
  await expect(editor(page).getByRole("button", { name: "Registrar conferência", exact: true })).toBeDisabled();
  expect(credentialHistory(f)).toBe(oldHistory);
  await editor(page).getByRole("button", { name: "Comparar versões", exact: true }).click();
  const compare = page.getByRole("dialog", { name: "A declaração foi atualizada", exact: true });
  await expect(compare.getByText("Declaração conferida", { exact: true })).toBeVisible();
  expect(await compare.evaluate(node => getComputedStyle(node.parentElement!, "::before").backdropFilter)).toBe("blur(2px)");
  const fullComparison = compare.getByText("Comparar todos os dados", { exact: true });
  await fullComparison.click();
  await expect(compare.getByRole("region", { name: "Declaração consultada", exact: true })).toContainText("001234");
  await expect(compare.getByRole("region", { name: "Declaração atualizada", exact: true })).toContainText("Sem registro informado");
  await fullComparison.click();
  if (info.project.name === "chromium") {
    const reference = await browser.newContext({ viewport: { width: 1280, height: 1000 }, isMobile: false, hasTouch: false, deviceScaleFactor: 1 });
    try {
      const model = await reference.newPage();
      await model.route(/^https?:/, route => route.abort());
      await model.goto(pathToFileURL(resolve("hca-laboratorio-04-v2-aprovado.html")).href + "#E10-03/conflict");
      for (const width of [360, 412]) {
        await page.setViewportSize({ width, height: 900 });
        await model.getByRole("combobox", { name: "Visualização", exact: true }).selectOption(String(width));
        await expect(model.getByRole("heading", { name: "A declaração foi atualizada", exact: true })).toBeVisible();
        await info.attach("L4-credencial-" + width, { body: await model.locator("#device-frame").screenshot(), contentType: "image/png" });
        await info.attach("credencial-" + width, { body: await page.screenshot(), contentType: "image/png" });
      }
    } finally { await reference.close(); }
  }
  await compare.getByRole("button", { name: "Usar declaração atual", exact: true }).click();
  await expect(editor(page).getByRole("checkbox", { name: "Conferi os dados desta declaração", exact: true })).not.toBeChecked();
  await expect(editor(page)).toContainText("Cuidadora");
  await editor(page).getByRole("checkbox", { name: "Conferi os dados desta declaração", exact: true }).check();
  expect((await submit(page)).status()).toBe(200);
  await finishReview(page);
  const current = await credentialRead(f);
  expect(current.history).toHaveLength(2); expect(current.latestReview?.declaration.registration).toBeNull();
  expect(current.history[1].declaration.registration).toBe("001234"); expect(current.latestReview?.credentialRevision).not.toBe(old.declaration.revision);
  expect(current.externalValidation).toBeNull(); expect(officialState(f)).toBe(before);
  expect(await rpc(f.subject.client, "patient_capabilities", { p_patient: f.patient })).toEqual(capabilities);
});
