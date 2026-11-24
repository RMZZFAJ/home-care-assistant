import { expect, test, type Browser, type TestInfo } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { mkdirSync } from "node:fs";
import { rpc, setup } from "../integration/v4-fixtures.mjs";
import { shiftWorker } from "../integration/shift-fixtures.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { selectContext } from "./auth-context";
import { openProfileIdentity, profileIdentityEditor, selectProfileSection } from "./profile-sections";
import { auditFromTop } from "./accessibility-audit";

async function captureProfileReference(browser: Browser, info: TestInfo) {
  const reference = await browser.newContext();
  try {
    const model = await reference.newPage(), styles = [];
    await model.route(/^https?:/, route => route.abort());
    await model.goto(pathToFileURL(resolve("Home_Care_Assistant_Modelo_Integral.html")).href + "#perfil/identidade");
    for (const width of [320, 390, 768, 1024, 1440]) {
      await model.setViewportSize({ width, height: 900 });
      // WebKit can expose fallback custom-property styles until this reference
      // is painted. Capture its real rendering before measuring the card.
      const referenceCapture = await model.screenshot();
      if (width === 320) await info.attach("profile-model-320", { contentType: "image/png", body: referenceCapture });
      const modelCard = model.locator(".card.pad").first();
      await expect(modelCard).toBeVisible();
      await expect(modelCard).toHaveCSS("border-top-style", "solid");
      // Sample one connected rendering; no fallback colors or tolerances.
      const referenceStyle = await modelCard.evaluate(original => {
        const card = document.querySelector(".card.pad"), heading = card?.querySelector("h2"), field = card?.querySelector(".field");
        if (!(card instanceof HTMLElement) || !card.isConnected || !heading || !field) throw new Error("Connected profile reference required");
        const sample = (node: Element, properties: string[]) => Object.fromEntries(properties.map(property => [property, getComputedStyle(node).getPropertyValue(property)]));
        return {
          originalConnected: original.isConnected, sameNode: original === card,
          card: sample(card, ["border-top-color", "border-right-color", "border-bottom-color", "border-left-color", "border-radius", "padding-left", "padding-top"]),
          heading: sample(heading, ["font-size", "font-weight"]),
          field: sample(field, ["font-size", "font-weight"]),
        };
      });
      await info.attach("profile-reference-style-" + width, { contentType: "application/json", body: JSON.stringify(referenceStyle) });
      styles.push({ width, referenceStyle });
    }
    return styles;
  } finally { await reference.close(); }
}

test.setTimeout(180_000);
test("L4 canais descartam edição concorrente e conferem uma tentativa no máximo duas vezes", async ({ page, browser }, info) => {
  const f = await setup(), account = await shiftWorker(f.patient, "family");
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(account.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible();
  await selectContext(page, f.patient);
  await page.goto("/perfil?profileTab=notices");
  const edit = page.getByRole("button", { name: "Editar canais de comunicação", exact: true });
  await edit.click();
  const editor = page.getByRole("dialog", { name: "Canais de comunicação", exact: true });
  const reference = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  try {
    const model = await reference.newPage();
    await model.route(/^https?:/, route => route.abort());
    await model.goto(pathToFileURL(resolve("hca-laboratorio-04-v2-aprovado.html")).href + "#E11-05/channels");
    const frame = model.locator("#device-frame");
    for (const width of [360, 412]) {
      await model.getByRole("combobox", { name: "Visualização", exact: true }).selectOption(String(width));
      await expect(frame.getByRole("heading", { name: "Canais de comunicação", exact: true })).toBeVisible();
      await info.attach(`L4-canais-${width}`, { body: await frame.screenshot(), contentType: "image/png" });
      await page.setViewportSize({ width, height: 900 });
      await auditFromTop(page, `E11-05 canais ${width}`);
      await info.attach(`canais-${width}`, { body: await page.screenshot(), contentType: "image/png" });
    }
  } finally { await reference.close(); await page.bringToFront(); }
  await editor.getByRole("switch", { name: "No sistema", exact: true }).uncheck();
  const baseline = await rpc(account.client, "my_notice_preferences");
  const outside = await rpc(account.client, "set_my_notice_preferences", {
    p_internal: true, p_email: true, p_whatsapp: false, p_version: baseline.version, p_key: randomUUID(),
  });
  await page.evaluate(() => window.dispatchEvent(new Event("hca:data-changed")));
  const conflict = page.getByRole("dialog", { name: "Preferência alterada em outra sessão", exact: true });
  await conflict.getByRole("button", { name: "Conferir versão atual", exact: true }).click();
  await expect(editor.getByRole("switch", { name: "No sistema", exact: true })).toBeChecked();
  await expect(editor.getByRole("switch", { name: "E-mail", exact: true })).toBeChecked();
  await editor.getByRole("switch", { name: "WhatsApp", exact: true }).check();
  await editor.getByRole("button", { name: "Salvar preferências", exact: true }).click();
  const saved = page.getByRole("dialog", { name: "Preferências salvas", exact: true });
  const conclude = saved.getByRole("button", { name: "Concluir", exact: true });
  await conclude.focus(); await conclude.press("Enter"); await expect(saved).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Canais de comunicação", exact: true })).toContainText("WhatsApp");
  await edit.click();
  await editor.getByRole("switch", { name: "WhatsApp", exact: true }).uncheck();
  const attempts: string[] = [], checks: string[] = [];
  await page.route(/\/api\/profile\/notices(?:\?.*)?$/, async route => {
    if (route.request().method() === "POST") {
      attempts.push(route.request().postDataJSON().idempotencyKey);
      await route.abort("failed");
    } else {
      const attempt = new URL(route.request().url()).searchParams.get("attempt");
      if (attempt) checks.push(attempt);
      await route.continue();
    }
  });
  await editor.getByRole("button", { name: "Salvar preferências", exact: true }).click();
  const uncertain = page.getByRole("dialog", { name: "Gravação ainda sem confirmação", exact: true });
  await uncertain.getByRole("button", { name: "Conferir resultado", exact: true }).click();
  await uncertain.getByRole("button", { name: "Conferir resultado", exact: true }).click();
  await expect(uncertain.getByRole("button", { name: "Conferir resultado", exact: true })).toHaveCount(0);
  await expect(uncertain.getByText("Copie os detalhes e avise o responsável pelo sistema.", { exact: true })).toBeVisible();
  expect(attempts).toHaveLength(1);
  expect(checks).toEqual([attempts[0], attempts[0]]);
  expect(await rpc(account.client, "my_notice_preferences")).toMatchObject({ version: outside.version + 1, whatsapp: true });
  await uncertain.getByRole("button", { name: "Voltar às preferências", exact: true }).click();
  await expect(page.getByRole("button", { name: "Conferir tentativa", exact: true })).toBeVisible();
  await selectProfileSection(page, "identity");
  await page.getByRole("button", { name: /^Apresentação do início/ }).click();
  const presentation = page.getByRole("dialog", { name: "Apresentação do início", exact: true });
  await presentation.getByRole("radio", { name: /^Simples/ }).check();
  await presentation.getByRole("button", { name: "Aplicar apresentação", exact: true }).click();
  await page.getByRole("dialog", { name: "Apresentação aplicada", exact: true }).getByRole("button", { name: "Concluir", exact: true }).click();
  await expect(page.getByRole("region", { name: "Apresentação do início", exact: true })).toContainText("Simples neste aparelho");
  await page.goto("/");
  const complement = page.locator("details").filter({ has: page.getByText("Movimentações do paciente", { exact: true }) });
  const recent = page.getByRole("heading", { name: "Movimentações recentes", exact: true });
  await expect(complement).toBeVisible();
  await expect(recent).not.toBeVisible();
  await complement.locator("summary").click();
  await expect(recent).toBeVisible();
});

test("15 ID02 NOT02 NOT04 profile tabs follow the model and retain unsaved fields through every account destination", async ({ page, browser }, info) => {
  // Close the reference context before running the product's focus and axe checks.
  const styles = await captureProfileReference(browser, info);
  const f = await setup(), viewer = await shiftWorker(f.patient, "family");

  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(viewer.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible();
  await selectContext(page, f.patient);
  const guideReads: string[] = [];
  page.on("request", request => {
    if (request.method() === "GET" && new URL(request.url()).pathname === "/api/guides") guideReads.push(request.url());
  });
  await page.goto("/perfil?careRecipientId=" + f.patient);
  await selectProfileSection(page, "security");
  await selectProfileSection(page, "identity");
  const marker = "Nome em edição sem confirmação " + randomUUID().slice(0, 8);
  const name = page.getByRole("textbox", { name: "Nome completo", exact: true });
  const before = sql(`select jsonb_build_object('profile',(select to_jsonb(p) from public.profiles p where id=${q(viewer.id)}),'stock',(select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${q(f.patient)}),'documents',(select count(*) from public.operational_documents where care_recipient_id=${q(f.patient)}));`);
  const writes: string[] = [];
  page.on("request", request => { if (request.method() !== "GET" && ["/api/profile", "/api/profile/science", "/api/push/devices"].includes(new URL(request.url()).pathname)) writes.push(request.url()); });
  for (const { width, referenceStyle } of styles) {
    await page.setViewportSize({ width, height: 900 });
    const actual = page.getByRole("region", { name: "Seus vínculos com pacientes", exact: true });
    for (const [property, expected] of Object.entries(referenceStyle.card)) await expect(actual).toHaveCSS(property, expected);
    for (const [property, expected] of Object.entries(referenceStyle.heading)) await expect(actual.getByRole("heading")).toHaveCSS(property, expected);
    await auditFromTop(page, "profile identity " + width);
  }
  await openProfileIdentity(page);
  await name.fill(marker);
  await page.setViewportSize({ width: 360, height: 900 });
  await info.attach("perfil-edicao-360", { body: await page.screenshot(), contentType: "image/png" });
  await page.goBack();
  await expect(page.getByRole("region", { name: "Sessões autenticadas", exact: true })).toBeVisible();
  await expect(page.getByLabel("Senha atual", { exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Contatos e métodos de login", exact: true })).toBeVisible();
  await expect(name).not.toBeVisible();
  await page.goForward(); await expect(name).toHaveValue(marker); await expect(name).toBeVisible();
  await page.goBack(); await expect(page.getByRole("tab", { name: "Segurança", exact: true })).toHaveAttribute("aria-selected", "true");
  await selectProfileSection(page, "notices");
  await expect(page.getByRole("region", { name: "Aplicativo neste aparelho", exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Avisos neste aparelho", exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Ciência de requisições", exact: true })).toBeVisible();
  await selectProfileSection(page, "devices");
  await expect(page.getByRole("region", { name: "Aparelhos com avisos", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Atualizar dispositivos", exact: true })).toBeVisible();
  expect(guideReads).toEqual([]);
  await selectProfileSection(page, "help");
  await expect(page.getByRole("region", { name: "Guias e ajuda", exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Guia do seu perfil", exact: true })).toBeVisible();
  expect(guideReads.length).toBeGreaterThan(0);
  const selected = page.getByRole("tab", { name: "Ajuda", exact: true });
  await selected.focus(); await page.keyboard.press("Home");
  await expect(page.getByRole("tab", { name: "Meu perfil", exact: true })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(name).toBeVisible(); await expect(name).toHaveValue(marker);
  await page.setViewportSize({ width: 320, height: 900 }); await auditFromTop(page, "profile retained field320");
  await profileIdentityEditor(page).getByRole("button", { name: "Cancelar", exact: true }).click();
  await openProfileIdentity(page);
  await expect(name).not.toHaveValue(marker);
  await profileIdentityEditor(page).getByRole("button", { name: "Cancelar", exact: true }).click();
  mkdirSync("output/playwright/phase-d", { recursive: true });
  await page.screenshot({ path: `output/playwright/phase-d/profile-${info.project.name}.png` });
  expect(await page.evaluate(() => JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }))).not.toContain(marker);
  expect(writes).toEqual([]);
  const after = sql(`select jsonb_build_object('profile',(select to_jsonb(p) from public.profiles p where id=${q(viewer.id)}),'stock',(select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${q(f.patient)}),'documents',(select count(*) from public.operational_documents where care_recipient_id=${q(f.patient)}));`);
  expect(after).toBe(before);
});
