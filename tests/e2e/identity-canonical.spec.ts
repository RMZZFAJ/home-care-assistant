import { expect, test, type Locator, type Page } from "@playwright/test";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { mkdirSync } from "node:fs";
import { fixtures, setup } from "../integration/v4-fixtures.mjs";
import { shiftWorker } from "../integration/shift-fixtures.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { selectContext } from "./auth-context";
import { auditFromTop } from "./accessibility-audit";
import { openMembershipDetails } from "./membership-panel";

test.setTimeout(180_000);
const widths = [320, 390, 768, 1024, 1440];
const referenceUrl = pathToFileURL(resolve("Home_Care_Assistant_Modelo_Integral.html")).href;
async function login(page: Page, role: "adminA" | "global", patient: string | null) {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(fixtures[role].email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible();
  await selectContext(page, patient);
}
async function compare(actual: Locator, model: Locator, properties: string[]) {
  const expected = await model.evaluate((node, keys) => Object.fromEntries(keys.map(key => [key, getComputedStyle(node).getPropertyValue(key)])), properties);
  for (const [property, value] of Object.entries(expected)) await expect(actual).toHaveCSS(property, value);
}
const facts = (patient: string) => sql(`select jsonb_build_object(
 'members',(select jsonb_agg(to_jsonb(m) order by user_id) from public.care_recipient_memberships m where care_recipient_id=${q(patient)}),
 'stock',(select jsonb_agg(to_jsonb(s) order by id) from public.stock_movements s where care_recipient_id=${q(patient)}));`);

test("15 ID01 ID03 public access, recovery and invitation preserve the canonical frame and private boundaries", async ({ page, browser }, info) => {
  const reference = await browser.newContext();
  try {
    const model = await reference.newPage(); await model.route(/^https?:/, route => route.abort());
    await model.goto(pathToFileURL(resolve("hca-laboratorio-01-v3-final.html")).href + "#/cenario/E01-01"); await page.goto("/login");
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 }); await model.setViewportSize({ width, height: 900 }); await model.screenshot();
      await model.locator("#product-app").evaluate((node, w) => { (node as HTMLElement).style.width = w + "px"; (node as HTMLElement).style.maxWidth = "none"; }, width);
      await compare(page.locator(".access-card"), model.locator("#product-app .access-card"), ["border-radius", "border-top-color", "max-width"]);
      await compare(page.locator(".auth-intro"), model.locator("#product-app .auth-intro"), ["padding-top", "padding-left"]);
      await compare(page.locator(".auth-intro > h1"), model.locator("#product-app .auth-intro > h1"), ["font-size", "font-weight"]);
      await auditFromTop(page, "public canonical login " + width);
    }
    await page.getByRole("button", { name: "Esqueci minha senha", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Recuperar seu acesso", exact: true })).toBeVisible();
    await expect(page.getByLabel("Senha", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Solicitar link de recuperação", exact: true })).toBeVisible();
    await auditFromTop(page, "public canonical recovery");
    await page.getByRole("link", { name: "Voltar ao login", exact: true }).click();
    await page.getByRole("link", { name: "Abrir convite", exact: true }).click();
    await expect(page.getByText("Este link não contém um convite válido.", { exact: false })).toBeVisible();
    await expect(page.getByRole("region", { name: "Resumo do vínculo convidado", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Aceitar convite", exact: true })).toHaveCount(0);
    await auditFromTop(page, "public canonical missing invitation");
    await page.goto("/recuperar-senha");
    await expect(page.getByRole("heading", { name: "Definir nova senha", exact: true })).toBeVisible();
    await page.getByLabel("Nova senha", { exact: true }).fill("SomenteTeste123!");
    await page.getByLabel("Confirmar nova senha", { exact: true }).fill("SomenteTeste123!");
    await page.getByRole("button", { name: "Salvar nova senha", exact: true }).click();
    await expect(page.getByText("O link expirou ou é inválido.", { exact: false })).toBeVisible();
    await auditFromTop(page, "public canonical expired recovery");
    mkdirSync("output/playwright/phase-d", { recursive: true });
    await page.screenshot({ path: `output/playwright/phase-d/access-canonical-${info.project.name}.png`, fullPage: true });
  } finally { await reference.close(); }
});

test("15 ID05 explicit context choices preserve patient, role and operational facts", async ({ page, browser }, info) => {
  const first = await setup(), second = await setup(); await login(page, "adminA", first.patient);
  const before = facts(first.patient), secondBefore = facts(second.patient), writes: string[] = [];
  page.on("request", r => { if (r.method() !== "GET" && new URL(r.url()).pathname.startsWith("/api/") && new URL(r.url()).pathname !== "/api/context") writes.push(r.url()); });
  await page.goto(`/estoque?careRecipientId=${second.patient}`);
  const chooser = page.getByRole("region", { name: "Mudar perfil", exact: true }); await expect(chooser).toBeVisible();
  const name = sql(`select display_name from public.care_recipients where id=${q(second.patient)};`);
  await chooser.getByRole("textbox", { name: "Buscar perfil autorizado", exact: true }).fill(name);
  const option = chooser.getByRole("button", { name: name + " · Administrador do paciente", exact: true });
  const reference = await browser.newContext();
  try {
    const model = await reference.newPage(); await model.route(/^https?:/, route => route.abort()); await model.goto(referenceUrl + "#pessoas/pessoas");
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 }); await model.setViewportSize({ width, height: 900 }); await model.screenshot();
      await compare(option, model.locator(".record").first(), ["column-gap", "padding-top", "padding-left"]);
      await auditFromTop(page, "identity canonical context " + width);
    }
    await option.click();
    await expect(page.locator(".hca-workspace")).toHaveAttribute("data-context-patient", second.patient);
    await expect(chooser).toHaveCount(0);
    expect(facts(first.patient)).toBe(before); expect(facts(second.patient)).toBe(secondBefore); expect(writes).toEqual([]);
    mkdirSync("output/playwright/phase-d", { recursive: true });
    await page.screenshot({ path: `output/playwright/phase-d/context-canonical-${info.project.name}.png` });
  } finally { await reference.close(); }
});

test("15 ID04 global identity rows share canonical appearance without local authority", async ({ page, browser }, info) => {
  await login(page, "global", null);
  const name = sql(`select full_name from public.profiles where id=${q(fixtures.global.id)};`);
  await page.goto("/admin?section=profiles&profileQuery=" + encodeURIComponent(name));
  const account = page.locator(`article[data-profile-id="${fixtures.global.id}"]`); await expect(account).toBeVisible();
  const writes: string[] = []; page.on("request", r => { if (r.method() !== "GET" && new URL(r.url()).pathname.startsWith("/api/")) writes.push(r.url()); });
  const reference = await browser.newContext();
  try {
    const model = await reference.newPage(); await model.route(/^https?:/, route => route.abort()); await model.goto(referenceUrl + "#pessoas/pessoas");
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 }); await model.setViewportSize({ width, height: 900 }); await model.screenshot();
      await compare(account, model.locator(".record").first(), ["display", "column-gap", "padding-top", "padding-left"]);
      const avatarProperties = ["display", "width", "height", "border-radius", "background-color", "color", "font-size", "font-weight", "border-top-width"];
      await compare(page.locator(".hca-profile-trigger > .hca-avatar"), model.locator(".topbar .avatar"), avatarProperties);
      await compare(account.locator(".hca-avatar"), model.locator(".record .avatar").first(), avatarProperties);
      await auditFromTop(page, "identity canonical global account " + width);
    }
    expect(writes).toEqual([]);
    mkdirSync("output/playwright/phase-d", { recursive: true });
    await page.screenshot({ path: `output/playwright/phase-d/accounts-canonical-${info.project.name}.png` });
  } finally { await reference.close(); }
});

test("15 ID04 membership rows preserve canonical presentation, search and credential focus", async ({ page, browser }, info) => {
  const first = await setup();
  const reviewer = await shiftWorker(first.patient, "admin");
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(reviewer.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible();
  await selectContext(page, first.patient); await page.goto(`/admin?section=memberships&careRecipientId=${first.patient}`);
  const people = page.getByRole("region", { name: "Pessoas e vínculos", exact: true }); await expect(people).toBeVisible();
  const before = facts(first.patient), writes: string[] = [];
  page.on("request", r => { if (r.method() !== "GET" && new URL(r.url()).pathname.startsWith("/api/") && new URL(r.url()).pathname !== "/api/context") writes.push(r.url()); });
  const reference = await browser.newContext({ viewport: { width: 1280, height: 1000 }, isMobile: false, hasTouch: false, deviceScaleFactor: 1 });
  try {
    const model = await reference.newPage();
    await model.route(/^https?:/, route => route.abort());
    await model.goto(pathToFileURL(resolve("hca-laboratorio-04-v2-aprovado.html")).href + "#E10-02/overview");
    const row = people.locator(".hca-member-list").getByRole("button").first();
    const modelRow = model.locator("#device-frame .l4-person-row").first();
    await expect(row).toBeVisible();
    await expect(people.getByRole("searchbox", { name: "Pesquisar pessoas", exact: true })).toHaveCSS("padding-left", "38px");
    for (const width of [320, 360, 390, 412, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const preset = width <= 375 ? "360" : "412";
      await model.getByRole("combobox", { name: "Visualização", exact: true }).selectOption(preset);
      await expect(model.locator("#device-frame")).toHaveCSS("width", preset + "px");
      const modelCard = model.locator("#device-frame .section").filter({ has: model.getByRole("heading", { name: "Pessoas vinculadas", exact: true }) });
      await compare(people.locator(".hca-people-card"), modelCard, ["border-radius", "border-top-color", "background-color"]);
      await compare(row, modelRow, ["display", "column-gap", "padding-top", "padding-left"]);
      await compare(row.locator(".hca-avatar"), modelRow.locator(".l4-person-avatar"), ["width", "height", "border-radius", "background-color", "color"]);
      await auditFromTop(page, "identity canonical people " + width);
      if (width === 360 || width === 412) {
        await info.attach(`L4-pessoas-${width}`, { body: await model.locator("#device-frame").screenshot(), contentType: "image/png" });
        await info.attach(`pessoas-${width}`, { body: await page.screenshot(), contentType: "image/png" });
      }
    }
    await people.getByRole("searchbox", { name: "Pesquisar pessoas", exact: true }).fill("Sem correspondência fictícia");
    await expect(people.getByText(/Nenhum vínculo nesta seleção/)).toBeVisible();
    await people.getByRole("searchbox", { name: "Pesquisar pessoas", exact: true }).fill("");
    await row.click();
    const opener = page.getByRole("dialog").getByRole("button", { name: /^Credencial profissional/ }); await opener.click();
    const drawer = page.getByRole("dialog", { name: "Credencial profissional", exact: true });
    await expect(drawer).toBeVisible(); await drawer.press("Escape"); await expect(drawer).toHaveCount(0); await expect(opener).toBeFocused();
    expect(facts(first.patient)).toBe(before); expect(writes).toEqual([]);
    await page.getByRole("dialog").getByRole("button", { name: "Voltar", exact: true }).click();
    await expect(row).toBeFocused();
    const details = await openMembershipDetails(page, "Teste professional");
    const edit = page.getByRole("dialog", { name: "Editar vínculo", exact: true });
    await details.getByRole("button", { name: /^Editar vínculo/ }).click();
    await edit.getByLabel("Função na residência", { exact: true }).selectOption("reader");
    await edit.getByRole("button", { name: "Voltar", exact: true }).click();
    await (await openMembershipDetails(page, "Teste professional")).getByRole("button", { name: /^Editar vínculo/ }).click();
    await expect(edit.getByLabel("Função na residência", { exact: true })).toHaveValue("professional");
    await edit.getByRole("button", { name: "Voltar", exact: true }).click();
    await (await openMembershipDetails(page, "Teste professional")).getByRole("link", { name: /^Ver permissões/ }).click();
    await expect(page.getByRole("combobox", { name: "Visualizar permissões", exact: true })).toHaveValue(fixtures.professional.id);
    expect(writes).toEqual([]);
    mkdirSync("output/playwright/phase-d", { recursive: true });
    await page.screenshot({ path: `output/playwright/phase-d/identity-canonical-${info.project.name}.png` });
  } finally { await reference.close(); }
});
