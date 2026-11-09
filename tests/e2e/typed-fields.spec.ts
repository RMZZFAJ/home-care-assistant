import { expect, test, type Page } from "@playwright/test";
import { createHmac, randomUUID } from "node:crypto";
import { setup, actor, fixtures } from "../integration/v4-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { fixturePassword, patientA } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";

test.setTimeout(150_000);
// Auth challenges remain in memory; no OTP, QR, trace, screenshot or video artifact.
test.use({ trace: "off", screenshot: "off", video: "off" });
const owned = new Set<string>();
test.afterEach(() => { for (const id of owned) sql(`update public.care_recipients set is_active=false where id=${q(id)};`); owned.clear(); });
async function login(page: Page, role: "adminA" | "family", patient?: string, stepUp = false) {
  await page.goto("/login");
  const password = page.getByLabel("Senha", { exact: true });
  await expect(password).toHaveAttribute("autocomplete", "current-password");
  expect(await password.getAttribute("minlength")).toBeNull();
  await page.getByLabel("E-mail", { exact: true }).fill(fixtures[role].email);
  await password.fill(fixturePassword); await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: stepUp ? "Meu perfil e segurança" : "Visão geral", exact: true })).toBeVisible();
  if (patient) await selectContext(page, patient);
}

test("CFinal019 catálogo e unidade preservam inteiros, código textual e escopo com persistência real", async ({ page }) => {
  const f = await setup(); owned.add(f.patient);
  const ledger = sql(`select coalesce(jsonb_agg(to_jsonb(m) order by id),'[]') from public.stock_movements m where care_recipient_id=${q(f.patient)};`);
  await login(page, "adminA", f.patient);
  await page.goto(`/admin?careRecipientId=${f.patient}&section=catalog`);
  await page.getByRole("button", { name: "Novo item", exact: true }).click();
  const drawer = page.getByRole("dialog", { name: "Adicionar item exclusivo deste paciente", exact: true });
  const order = drawer.getByLabel("Ordem", { exact: true });
  await expect(order).toHaveAttribute("type", "number");
  for (const value of ["-1", "12.5", "1000001"]) {
    await order.fill(value); expect(await order.evaluate((element: HTMLInputElement) => element.checkValidity()), "invalid order " + value).toBe(false);
  }
  await order.fill("12"); expect(await order.evaluate((element: HTMLInputElement) => element.checkValidity())).toBe(true);
  const name = "Nome livre 001234 / água " + randomUUID().slice(0, 6);
  await drawer.getByLabel("Nome", { exact: true }).fill(name);
  await expect(drawer.getByLabel("Nome", { exact: true })).toHaveAttribute("type", "text");
  await drawer.getByLabel("Unidade", { exact: true }).fill("unidade");
  const saved = page.waitForResponse(response => new URL(response.url()).pathname === "/api/admin" && response.request().method() === "POST");
  await drawer.getByRole("button", { name: "Salvar item", exact: true }).click(); expect((await saved).ok()).toBe(true);
  expect(sql(`select sort_order from public.care_recipient_products where care_recipient_id=${q(f.patient)} and name=${q(name)};`)).toBe("12");
  await page.goto("/unidades?careRecipientId=" + f.patient);
  await page.getByRole("button", { name: "Nova unidade", exact: true }).click();
  const unit = page.getByRole("dialog", { name: "Nova unidade", exact: true });
  await unit.getByLabel("Código", { exact: true }).fill("001234");
  await unit.getByLabel("Nome", { exact: true }).fill("Volume livre / código preservado");
  await unit.getByRole("combobox", { name: "Dimensão", exact: true }).selectOption("volume");
  await expect(unit.getByRole("combobox", { name: "Âmbito", exact: true })).toHaveValue("patient");
  const decimals = unit.getByLabel("Casas decimais", { exact: true });
  for (const value of ["-1", "1.5", "7"]) { await decimals.fill(value); expect(await decimals.evaluate((element: HTMLInputElement) => element.checkValidity())).toBe(false); }
  for (const value of ["0", "6"]) { await decimals.fill(value); expect(await decimals.evaluate((element: HTMLInputElement) => element.checkValidity())).toBe(true); }
  const created = page.waitForResponse(response => new URL(response.url()).pathname === "/api/units" && response.request().method() === "POST");
  await unit.getByRole("button", { name: "Criar unidade", exact: true }).click();
  const response = await created; expect(response.ok()).toBe(true); const id = (await response.json()).id;
  expect(JSON.parse(sql(`select jsonb_build_object('code',code,'name',name,'dimension',dimension,'decimals',decimals,'patient',care_recipient_id) from public.measurement_units where id=${q(id)};`))).toEqual({ code: "001234", name: "Volume livre / código preservado", dimension: "volume", decimals: 6, patient: f.patient });
  const payload = { careRecipientId: f.patient, code: "OUTRA", name: "Outra unidade", dimension: "count", decimals: 0 };
  for (const bad of [{ decimals: 1.5 }, { decimals: 7 }, { decimals: "6" }, { code: 1234 }, { dimension: "unknown" }]) expect((await page.request.post("/api/units", { data: { ...payload, ...bad } })).status()).toBe(400);
  expect((await page.request.post("/api/units", { data: { ...payload, careRecipientId: null } })).status()).toBe(403);
  await expect(unit).toHaveCount(0);
  await page.getByRole("button", { name: "Nova apresentação", exact: true }).click();
  const presentation = page.getByRole("dialog", { name: "Nova apresentação", exact: true });
  const material = presentation.getByRole("combobox", { name: "Material da apresentação", exact: true });
  await material.fill("Material fictício V4 0"); await material.press("ArrowDown");
  await page.getByRole("option", { name: /Material fictício V4 0/ }).click();
  await presentation.getByLabel("Nome da apresentação", { exact: true }).fill("Apresentação livre / zeros preservados");
  const barcode = presentation.getByLabel("Código da apresentação", { exact: true });
  await barcode.fill("001234");
  const sixDigits = await barcode.evaluate((element: HTMLInputElement) => ({ type: element.type, textPreserved: element.value === "001234", valid: element.checkValidity() }));
  expect(sixDigits).toEqual({ type: "text", textPreserved: true, valid: false });
  await barcode.fill("00123456");
  await presentation.getByLabel("Fator na unidade base", { exact: true }).fill("1");
  await presentation.getByRole("button", { name: "Revisar apresentação", exact: true }).click();
  const presentationSaved = page.waitForResponse(response => new URL(response.url()).pathname === "/api/catalog/presentations" && response.request().method() === "POST");
  await presentation.getByRole("button", { name: "Confirmar apresentação", exact: true }).click();
  expect((await presentationSaved).ok()).toBe(true);
  const found = await page.request.get(`/api/catalog/presentations?careRecipientId=${f.patient}&barcode=00123456`);
  expect(found.ok()).toBe(true); expect(JSON.stringify(await found.json())).toContain('"barcode":"00123456"');
  expect(sql(`select coalesce(jsonb_agg(to_jsonb(m) order by id),'[]') from public.stock_movements m where care_recipient_id=${q(f.patient)};`)).toBe(ledger);
});

function totp(secret: string) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const bits = [...secret.replaceAll("=", "")].map(character => alphabet.indexOf(character).toString(2).padStart(5, "0")).join("");
  const key = Buffer.from((bits.match(/.{8}/g) ?? []).map(part => parseInt(part, 2))), counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30_000)));
  const mac = createHmac("sha1", key).update(counter).digest(), offset = mac[mac.length - 1] & 15;
  return String((mac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).padStart(6, "0");
}
test("CFinal019 login, nova senha e OTP usam contratos distintos sem persistir desafio no navegador", async ({ page }) => {
  const client = await actor("family", patientA), enrolled = await client.auth.mfa.enroll({ factorType: "totp", friendlyName: "Campo fictício " + randomUUID().slice(0, 8) });
  expect(enrolled.error).toBeNull(); const factor = enrolled.data!.id;
  try {
    expect((await client.auth.mfa.challengeAndVerify({ factorId: factor, code: totp(enrolled.data!.totp.secret) })).error).toBeNull();
    await login(page, "family", undefined, true); await page.goto("/perfil");
    await page.getByRole("button", { name: "Alterar senha", exact: true }).click();
    const current = page.getByLabel("Senha atual", { exact: true }), next = page.getByLabel("Nova senha", { exact: true });
    await expect(current).toHaveAttribute("autocomplete", "current-password"); expect(await current.getAttribute("minlength")).toBeNull();
    await expect(next).toHaveAttribute("autocomplete", "new-password"); await expect(next).toHaveAttribute("minlength", "12");
    await page.getByRole("button", { name: "Autenticação em duas etapas", exact: true }).click();
    const code = page.getByLabel("Código do autenticador", { exact: true });
    await expect(code).toBeVisible(); await expect(code).toHaveAttribute("inputmode", "numeric"); await expect(code).toHaveAttribute("autocomplete", "one-time-code");
    await expect(page.getByAltText("QR privado para cadastrar seu autenticador", { exact: true })).toHaveCount(0);
    await code.fill("000012"); const valid = await code.evaluate((element: HTMLInputElement) => ({ length: element.value.length === 6, zeros: element.value.startsWith("0000"), valid: element.checkValidity() }));
    await code.fill("12"); const rejected = await code.evaluate((element: HTMLInputElement) => element.validity.patternMismatch); await code.fill("");
    expect(valid).toEqual({ length: true, zeros: true, valid: true }); expect(rejected).toBe(true);
    const stored = await page.evaluate(() => [...Array(localStorage.length).keys()].map(index => localStorage.key(index)!).filter(key => /draft/i.test(key)));
    expect(stored).toEqual([]);
    await code.fill("000012"); await page.reload();
    await page.getByRole("button", { name: "Autenticação em duas etapas", exact: true }).click();
    await expect(page.getByLabel("Código do autenticador", { exact: true })).toHaveValue("");
  } finally { expect((await client.auth.mfa.unenroll({ factorId: factor })).error).toBeNull(); }
});
