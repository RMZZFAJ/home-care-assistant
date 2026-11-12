import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { mkdirSync } from "node:fs";
import { setup, fixtures } from "../integration/v4-fixtures.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { selectContext } from "./auth-context";
import { selectProfileSection } from "./profile-sections";
import { auditFromTop } from "./accessibility-audit";

test.setTimeout(180_000);
test("15 ID02 NOT02 NOT04 profile tabs follow the model and retain unsaved fields through every account destination", async ({ page, browser }, info) => {
  const f = await setup();

  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(fixtures.family.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible();
  await selectContext(page, f.patient); await page.goto("/perfil?careRecipientId=" + f.patient);
  await selectProfileSection(page, "identity");
  const marker = "Nome em edição sem confirmação " + randomUUID().slice(0, 8);
  const name = page.getByRole("textbox", { name: "Nome", exact: true }); await name.fill(marker);
  const before = sql(`select jsonb_build_object('profile',(select to_jsonb(p) from public.profiles p where id=${q(fixtures.family.id)}),'stock',(select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${q(f.patient)}),'documents',(select count(*) from public.operational_documents where care_recipient_id=${q(f.patient)}));`);
  const writes: string[] = [];
  page.on("request", request => { if (request.method() !== "GET" && ["/api/profile", "/api/profile/science", "/api/push/devices"].includes(new URL(request.url()).pathname)) writes.push(request.url()); });
  const reference = await browser.newContext();
  try {
    const model = await reference.newPage(); await model.route(/^https?:/, route => route.abort());
    await model.goto(pathToFileURL(resolve("Home_Care_Assistant_Modelo_Integral.html")).href + "#perfil/identidade");
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 }); await model.setViewportSize({ width, height: 900 });
      // WebKit can expose fallback custom-property styles until this reference
      // is painted. Capture its real rendering before measuring the card.
      const referenceCapture = await model.screenshot();
      if (width === 320) await info.attach("profile-model-320", { contentType: "image/png", body: referenceCapture });
      const actual = page.getByRole("region", { name: "Identidade pessoal", exact: true });
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
      for (const [property, expected] of Object.entries(referenceStyle.card)) await expect(actual).toHaveCSS(property, expected);
      for (const [property, expected] of Object.entries(referenceStyle.field)) await expect(actual.locator("label").filter({ has: name }).first()).toHaveCSS(property, expected);
      for (const [property, expected] of Object.entries(referenceStyle.heading)) await expect(actual.getByRole("heading")).toHaveCSS(property, expected);
      await auditFromTop(page, "profile identity " + width);
    }
    await selectProfileSection(page, "security");
    await expect(page.getByRole("region", { name: "Sessões autenticadas", exact: true })).toBeVisible();
    await expect(page.getByLabel("Senha atual", { exact: true })).toBeVisible();
    await expect(page.getByRole("region", { name: "Contatos e métodos de login", exact: true })).toBeVisible();
    await expect(name).not.toBeVisible();
    await page.goBack(); await expect(name).toHaveValue(marker); await expect(name).toBeVisible();
    await page.goForward(); await expect(page.getByRole("tab", { name: "Segurança", exact: true })).toHaveAttribute("aria-selected", "true");
    await selectProfileSection(page, "notices");
    await expect(page.getByRole("region", { name: "Aplicativo neste aparelho", exact: true })).toBeVisible();
    await expect(page.getByRole("region", { name: "Avisos neste aparelho", exact: true })).toBeVisible();
    await expect(page.getByRole("region", { name: "Ciência das requisições", exact: true })).toBeVisible();
    await selectProfileSection(page, "devices");
    await expect(page.getByRole("region", { name: "Aparelhos com avisos", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Consultar aparelhos novamente", exact: true })).toBeVisible();
    await selectProfileSection(page, "help");
    await expect(page.getByRole("region", { name: "Guias e ajuda", exact: true })).toBeVisible();
    const selected = page.getByRole("tab", { name: "Ajuda", exact: true });
    await selected.focus(); await page.keyboard.press("Home");
    await expect(page.getByRole("tab", { name: "Meu perfil", exact: true })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(name).toBeVisible(); await expect(name).toHaveValue(marker);
    await page.setViewportSize({ width: 320, height: 900 }); await auditFromTop(page, "profile retained field320");
    mkdirSync("output/playwright/phase-d", { recursive: true });
    await page.screenshot({ path: `output/playwright/phase-d/profile-${info.project.name}.png` });
    expect(await page.evaluate(() => JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }))).not.toContain(marker);
    expect(writes).toEqual([]);
    const after = sql(`select jsonb_build_object('profile',(select to_jsonb(p) from public.profiles p where id=${q(fixtures.family.id)}),'stock',(select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${q(f.patient)}),'documents',(select count(*) from public.operational_documents where care_recipient_id=${q(f.patient)}));`);
    expect(after).toBe(before);
  } finally { await reference.close(); }
});
