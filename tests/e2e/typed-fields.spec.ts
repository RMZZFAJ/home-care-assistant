import { openProfilePassword, selectProfileSection } from "./profile-sections";
import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { totp } from "./auth-totp";
import { setup, fixtures } from "../integration/v4-fixtures.mjs";
import { shiftWorker } from "../integration/shift-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";

test.setTimeout(150_000);
// Auth challenges remain in memory; no OTP, QR, trace, screenshot or video artifact.
test.use({ trace: "off", screenshot: "off", video: "off" });
const owned = new Set<string>();
test.afterEach(() => { for (const id of owned) sql(`update public.care_recipients set is_active=false where id=${q(id)};`); owned.clear(); });
async function login(page: Page, email: string) {
  await page.goto("/login");
  const password = page.getByLabel("Senha", { exact: true });
  await expect(password).toHaveAttribute("autocomplete", "current-password");
  expect(await password.getAttribute("minlength")).toBeNull();
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await password.fill(fixturePassword); await page.getByRole("button", { name: "Entrar", exact: true }).click();
}

test("CFinal019 catálogo e unidade preservam inteiros, código textual e escopo com persistência real", async ({ page }, info) => {
  const f = await setup(); owned.add(f.patient);
  const ledger = sql(`select coalesce(jsonb_agg(to_jsonb(m) order by id),'[]') from public.stock_movements m where care_recipient_id=${q(f.patient)};`);
  await login(page, fixtures.adminA.email);
  await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible();
  await selectContext(page, f.patient);
  await page.goto(`/admin?careRecipientId=${f.patient}&section=catalog`);
  await page.getByRole("button", { name: "Novo item", exact: true }).click();
  const drawer = page.getByRole("dialog", { name: "Novo material", exact: true });
  const order = drawer.getByLabel("Ordem na lista", { exact: true });
  await expect(order).toHaveAttribute("type", "number");
  for (const value of ["-1", "12.5", "1000001"]) {
    await order.fill(value); expect(await order.evaluate((element: HTMLInputElement) => element.checkValidity()), "invalid order " + value).toBe(false);
  }
  await order.fill("12"); expect(await order.evaluate((element: HTMLInputElement) => element.checkValidity())).toBe(true);
  const name = "Nome livre 001234 / água " + randomUUID().slice(0, 6);
  await drawer.getByLabel("Nome do material", { exact: true }).fill(name);
  expect(await drawer.getByLabel("Nome do material", { exact: true }).evaluate(input => (input as HTMLInputElement).type)).toBe("text");
  await drawer.getByLabel("Unidade de controle", { exact: true }).selectOption("unidade");
  const saved = page.waitForResponse(response => new URL(response.url()).pathname === "/api/admin/catalogue-actions" && response.request().method() === "POST");
  await drawer.getByRole("button", { name: "Revisar material", exact: true }).click();
  await page.getByRole("dialog", { name: "Adicionar material?", exact: true }).getByRole("button", { name: "Adicionar material", exact: true }).click();
  expect((await saved).ok()).toBe(true);
  await page.getByRole("dialog", { name: "Material adicionado", exact: true }).getByRole("button", { name: "Concluir", exact: true }).click();
  expect(sql(`select sort_order from public.care_recipient_products where care_recipient_id=${q(f.patient)} and name=${q(name)};`)).toBe("12");
  await page.goto("/unidades?careRecipientId=" + f.patient);
  if (info.project.name === "chromium") {
    const viewport = page.viewportSize();
    for (const width of [360, 412]) {
      await page.setViewportSize({ width, height: 910 });
      for (const label of ["Pesquisar unidades", "Pesquisar apresentações"]) {
        const spacing = await page.getByRole("searchbox", { name: label, exact: true }).evaluate(input => {
          const icon = input.parentElement?.querySelector("svg");
          return icon ? input.getBoundingClientRect().left + Number.parseFloat(getComputedStyle(input).paddingInlineStart) - icon.getBoundingClientRect().right : -1;
        });
        expect(spacing).toBeGreaterThanOrEqual(4);
      }
      await page.screenshot({ path: info.outputPath("unidades-espacamento-" + width + ".png") });
    }
    if (viewport) await page.setViewportSize(viewport);
  }
  await page.getByRole("button", { name: "Nova unidade", exact: true }).click();
  const unit = page.getByRole("dialog", { name: "Nova unidade", exact: true });
  await unit.getByLabel("Código", { exact: true }).fill("001234");
  await expect(unit.getByRole("button", { name: "Salvar preenchimento privado", exact: true })).toHaveCount(0);
  await unit.getByRole("button", { name: "Fechar edição", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "Nova unidade", exact: true }).click();
  await expect(unit.getByLabel("Código", { exact: true })).toHaveValue("");
  await unit.getByLabel("Código", { exact: true }).fill("001234");
  await unit.getByLabel("Nome", { exact: true }).fill("Volume livre / código preservado");
  await unit.getByRole("combobox", { name: "Dimensão", exact: true }).selectOption("volume");
  await expect(unit.getByText("Esta residência", { exact: true })).toBeVisible();
  const decimals = unit.getByLabel("Casas decimais", { exact: true });
  expect(await decimals.locator("option").evaluateAll(options => options.map(option => (option as HTMLOptionElement).value))).toEqual(["0", "1", "2", "3", "4", "5", "6"]);
  await decimals.selectOption("6");
  const created = page.waitForResponse(response => new URL(response.url()).pathname === "/api/admin/catalogue-actions" && response.request().method() === "POST");
  await unit.getByRole("button", { name: "Criar unidade", exact: true }).click();
  const response = await created; expect(response.ok()).toBe(true); const id = (await response.json()).outcome.unitId;
  await page.getByRole("dialog", { name: "Unidade criada", exact: true }).getByRole("button", { name: "Concluir", exact: true }).click();
  expect(JSON.parse(sql(`select jsonb_build_object('code',code,'name',name,'dimension',dimension,'decimals',decimals,'patient',care_recipient_id) from public.measurement_units where id=${q(id)};`))).toEqual({ code: "001234", name: "Volume livre / código preservado", dimension: "volume", decimals: 6, patient: f.patient });
  const payload = { careRecipientId: f.patient, code: "OUTRA", name: "Outra unidade", dimension: "count", decimals: 0 };
  for (const bad of [{ decimals: 1.5 }, { decimals: 7 }, { decimals: "6" }, { code: 1234 }, { dimension: "unknown" }]) expect((await page.request.post("/api/units", { data: { ...payload, ...bad } })).status()).toBe(400);
  expect((await page.request.post("/api/units", { data: { ...payload, careRecipientId: null } })).status()).toBe(403);
  await expect(unit).toHaveCount(0);
  await page.getByRole("button", { name: "Adicionar apresentação", exact: true }).click();
  const presentation = page.getByRole("dialog", { name: "Nova apresentação", exact: true });
  const material = presentation.getByRole("combobox", { name: "Material da apresentação", exact: true });
  await material.fill("Material fictício V4 0"); await material.press("ArrowDown");
  await page.getByRole("option", { name: /Material fictício V4 0/ }).click();
  await presentation.getByLabel("Nome da apresentação", { exact: true }).fill("Apresentação livre / zeros preservados");
  const barcode = presentation.getByLabel("Código de barras", { exact: true });
  await barcode.fill("001234");
  const sixDigits = await barcode.evaluate((element: HTMLInputElement) => ({ type: element.type, textPreserved: element.value === "001234", valid: element.checkValidity() }));
  expect(sixDigits).toEqual({ type: "text", textPreserved: true, valid: false });
  await barcode.fill("00123456");
  await presentation.getByLabel("Quantidade na unidade base", { exact: true }).fill("1");
  await presentation.getByRole("button", { name: "Revisar apresentação", exact: true }).click();
  const presentationSaved = page.waitForResponse(response => new URL(response.url()).pathname === "/api/admin/catalogue-actions" && response.request().method() === "POST");
  await page.getByRole("dialog", { name: "Confirmar apresentação?", exact: true }).getByRole("button", { name: "Confirmar apresentação", exact: true }).click();
  expect((await presentationSaved).ok()).toBe(true);
  await page.getByRole("dialog", { name: "Apresentação registrada", exact: true }).getByRole("button", { name: "Concluir", exact: true }).click();
  const found = await page.request.get(`/api/catalog/presentations?careRecipientId=${f.patient}&barcode=00123456`);
  expect(found.ok()).toBe(true); expect(JSON.stringify(await found.json())).toContain('"barcode":"00123456"');
  expect(sql(`select coalesce(jsonb_agg(to_jsonb(m) order by id),'[]') from public.stock_movements m where care_recipient_id=${q(f.patient)};`)).toBe(ledger);
});

test("CFinal019 login, nova senha e OTP usam contratos distintos sem persistir desafio no navegador", async ({ page }) => {
  const { patient } = await setup(); owned.add(patient);
  const { client, email } = await shiftWorker(patient, "family");
  const enrolled = await client.auth.mfa.enroll({ factorType: "totp", friendlyName: "Campo fictício " + randomUUID().slice(0, 8) });
  expect(enrolled.error).toBeNull(); const factor = enrolled.data!.id;
  try {
    expect((await client.auth.mfa.challengeAndVerify({ factorId: factor, code: totp(enrolled.data!.totp.secret) })).error).toBeNull();
    await login(page, email);
    await expect(page).toHaveURL(url => url.pathname === "/perfil" && url.searchParams.get("mfa") === "required");
    await expect(page.getByRole("dialog", { name: "Verificação adicional", exact: true })).toBeVisible();
    await page.goto("/perfil");
    await selectProfileSection(page, "security");
    const password = await openProfilePassword(page);
    const current = password.getByLabel(/Senha atual/), next = password.getByLabel("Nova senha", { exact: true });
    await expect(current).toHaveAttribute("autocomplete", "current-password"); expect(await current.getAttribute("minlength")).toBeNull();
    await expect(next).toHaveAttribute("autocomplete", "new-password"); await expect(next).toHaveAttribute("minlength", "6");
    await password.getByRole("button", { name: "Cancelar", exact: true }).click();
    async function openVerification() {
      await page.getByRole("button", { name: /^Aplicativo autenticador/ }).click();
      await page.getByRole("dialog", { name: "Aplicativo autenticador", exact: true }).getByRole("button", { name: "Verificar esta sessão", exact: true }).click();
    }
    await openVerification();
    const code = page.getByRole("dialog", { name: "Verificação adicional", exact: true }).getByLabel(/Código de 6 dígitos/);
    await expect(code).toBeVisible(); await expect(code).toHaveAttribute("inputmode", "numeric"); await expect(code).toHaveAttribute("autocomplete", "one-time-code");
    await expect(page.getByAltText("QR privado para cadastrar seu autenticador", { exact: true })).toHaveCount(0);
    await code.fill("000012"); const valid = await code.evaluate((element: HTMLInputElement) => ({ length: element.value.length === 6, zeros: element.value.startsWith("0000"), valid: element.checkValidity() }));
    await code.fill("12"); const rejected = await code.evaluate((element: HTMLInputElement) => element.validity.patternMismatch); await code.fill("");
    expect(valid).toEqual({ length: true, zeros: true, valid: true }); expect(rejected).toBe(true);
    const stored = await page.evaluate(() => [...Array(localStorage.length).keys()].map(index => localStorage.key(index)!).filter(key => /draft/i.test(key)));
    expect(stored).toEqual([]);
    await code.fill("000012"); await page.reload();
    await selectProfileSection(page, "security");
    await openVerification();
    await expect(code).toHaveValue("");
  } finally { expect((await client.auth.mfa.unenroll({ factorId: factor })).error).toBeNull(); }
});
