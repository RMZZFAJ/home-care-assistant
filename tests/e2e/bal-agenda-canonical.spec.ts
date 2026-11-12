import { isDocumentAccessReport } from "./display-access-report";
import { expect, test, type Browser, type Locator, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { setup, rpc, fixtures } from "../integration/v4-fixtures.mjs";
import { shiftCommand, shiftWorker } from "../integration/shift-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";
import { selectDocumentSection } from "./document-sections";
import { auditFromTop } from "./accessibility-audit";

test.setTimeout(180_000);
const widths = [320, 390, 768, 1024, 1440];
async function login(page: Page, patient: string) {
  await page.goto("/login"); await page.getByLabel("E-mail", { exact: true }).fill(fixtures.adminA.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword); await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible(); await selectContext(page, patient);
}
async function reference(browser: Browser, route: string) {
  const context = await browser.newContext(), page = await context.newPage();
  await page.route(/^https?:/, route => route.abort());
  await page.goto(pathToFileURL(resolve("Home_Care_Assistant_Modelo_Integral.html")).href + "#" + route);
  await page.locator("#roleSelect").selectOption("family"); return { context, page };
}
function writes(page: Page, allowAccess = false) {
  const sent: string[] = []; page.on("request", r => { if (new URL(r.url()).pathname.startsWith("/api/") && r.method() !== "GET" && !(allowAccess && isDocumentAccessReport(r))) sent.push(r.url()); }); return sent;
}
async function capture(node: Locator, name: string) {
  await node.evaluate(node => node.scrollIntoView({ block: "center", inline: "nearest", behavior: "instant" }));
  expect(await node.evaluate(node => { const r = node.getBoundingClientRect(), x = r.left + r.width / 2; return [r.top + 12, r.bottom - 12].every(y => y > 0 && y < innerHeight && node.contains(document.elementFromPoint(x, y))); })).toBe(true);
  mkdirSync("output/playwright/phase-d", { recursive: true }); await node.screenshot({ path: `output/playwright/phase-d/${name}.png`, animations: "disabled" });
}

test("06.3 BAL canonical readonly materials preserve physical zero,original reference and reversible search", async ({ page, browser }, info) => {
  const names = ["Material contado " + "com nome preservado ".repeat(6) + randomUUID().slice(0,8), "Outro material contado " + randomUUID().slice(0,8)];
  const f = await setup({ catalogue: names.map(name => ({ name, category: "higiene", unit: "unidade", aliases: [] })) });
  sql(`insert into public.patient_settings(care_recipient_id) values(${q(f.patient)}) on conflict do nothing; update public.patient_settings set settings=settings||'{"balReview":"optional"}'::jsonb where care_recipient_id=${q(f.patient)};`);
  const doc = await rpc(f.admin, "create_supply_document", { p_patient: f.patient, p_type: "BAL", p_key: randomUUID(), p_draft: false, p_payload: { notes: "Observação física original; o parecer permanece independente.", lines: f.products.map((productId: string, i: number) => ({ productId, quantity: String(i) })) } });
  await login(page, f.patient); await page.goto("/documentos/" + doc.id); await selectDocumentSection(page, "workflow");
  const before = sql(`select jsonb_build_object('document',(select to_jsonb(d) from public.operational_documents d where id=${q(doc.id)}),'stock',(select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${q(f.patient)}));`), sent = writes(page, true);
  const table = page.getByRole("table", { name: "Materiais da contagem", exact: true }), row = table.locator("tbody tr").first();
  await expect(row).toContainText(names[0]); await expect(row.locator('[data-label="Quantidade física"]')).toHaveText("0 unidade");
  await expect(row.locator('[data-label="Referência"]')).toHaveText("0 unidade"); await expect(row.locator('[data-label="Diferença"]')).toHaveText("Sem diferença");
  await expect(table.locator("tbody tr").last().locator('[data-label="Diferença"]')).toHaveText("1 unidade");
  const ref = await reference(browser, "ficha/BAL-0001/materiais");
  try {
    const model = ref.page.locator(".tablewrap.mobilecards").first(); await expect(model).toBeVisible();
    for (const width of widths) {
      await page.setViewportSize({ width, height: 1000 }); await ref.page.setViewportSize({ width, height: 1000 });
      for (const property of ["border-radius", "border-color", "background-color"] as const) await expect(table.locator("..")).toHaveCSS(property, await model.evaluate((n,p) => getComputedStyle(n).getPropertyValue(p), property));
      for (const property of ["display", "padding-left", "padding-top", "gap"] as const) await expect(row).toHaveCSS(property, await model.locator("tbody tr").first().evaluate((n,p) => getComputedStyle(n).getPropertyValue(p), property));
      await auditFromTop(page, "BAL canonical materials " + width);
      if (width === 320) await capture(row, "bal-count-material-" + info.project.name);
    }
    const search = page.getByRole("searchbox", { name: "Pesquisar material", exact: true }); await search.fill("OUTRO--MATERIAL"); await expect(table.locator("tbody tr")).toHaveCount(1);
    await search.fill("Ausente na contagem fictícia"); await expect(table).toHaveCount(0);
    const clear = page.getByRole("button", { name: "Limpar busca de materiais", exact: true }); await clear.focus(); await clear.press("Enter"); await expect(table.locator("tbody tr")).toHaveCount(2);
    await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" }); await auditFromTop(page, "BAL forced colors reduced motion");
    expect(sql(`select jsonb_build_object('document',(select to_jsonb(d) from public.operational_documents d where id=${q(doc.id)}),'stock',(select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${q(f.patient)}));`)).toBe(before); expect(sent).toEqual([]);
  } finally { await ref.context.close(); }
});

test("06.3 agenda canonical records retain overnight dates,timezone and native editing without operational writes", async ({ page, browser }, info) => {
  const f = await setup(), pro = await shiftWorker(f.patient), name = "Pessoa da programação " + "com nome extenso ".repeat(6);
  sql(`update public.profiles set full_name=${q(name.trim())} where id=${q(pro.id)};`);
  const type = await shiftCommand(f.admin, f.patient, "type", { name: "Plantão noturno da comparação canônica", startsLocal: "19:00", durationMinutes: 720 });
  await shiftCommand(f.admin, f.patient, "series", { professionalId: pro.id, shiftTypeId: type.id, timezone: "America/Sao_Paulo", recurrence: "once", weekdays: [], anchorDate: "2100-06-01", validUntil: "2100-06-01", notes: "Programação não comprova presença física." });
  const before = sql(`select jsonb_agg(to_jsonb(s) order by id) from public.scheduled_shifts s where care_recipient_id=${q(f.patient)};`);
  await login(page, f.patient); await page.goto("/escalas"); await page.getByLabel("Data de referência", { exact: true }).fill("2100-06-01");
  const sent = writes(page), row = page.getByRole("article", { name: type.name + " · " + name.trim(), exact: true }).filter({ visible: true });
  await expect(row).toContainText("01/06/2100, 19:00"); await expect(row).toContainText("02/06/2100, 07:00"); await expect(row).toContainText("America/Sao_Paulo");
  const ref = await reference(browser, "pessoas/horarios");
  try {
    const model = ref.page.locator(".record").last(); await expect(model).toBeVisible();
    for (const width of widths) {
      await page.setViewportSize({ width, height: 1000 }); await ref.page.setViewportSize({ width, height: 1000 });
      for (const property of ["gap", "padding-top", "padding-left", "border-bottom-color"] as const) await expect(row).toHaveCSS(property, await model.evaluate((n,p) => getComputedStyle(n).getPropertyValue(p), property));
      for (const property of ["width", "height", "border-radius", "background-color"] as const) await expect(row.locator(".hca-shift-icon")).toHaveCSS(property, await model.locator(".record-icon").evaluate((n,p) => getComputedStyle(n).getPropertyValue(p), property));
      if (width > 850) {
        const calendar = page.getByRole("region", { name: "Calendário de plantões; rolagem horizontal quando necessária", exact: true });
        await calendar.focus(); await calendar.press("ArrowRight");
        await expect.poll(() => calendar.evaluate(node => node.scrollLeft)).toBeGreaterThan(0);
      }
      await auditFromTop(page, "canonical agenda " + width);
      if (width === 320) await capture(row, "agenda-record-" + info.project.name);
    }
    await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" }); await auditFromTop(page, "agenda forced colors reduced motion");
    await page.emulateMedia({ forcedColors: "none", reducedMotion: "no-preference" });
    await row.getByRole("button", { name: "Alterar plantão", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Alteração pontual", exact: true }); await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel("Profissional de destino", { exact: true })).toHaveValue(pro.id);
    expect(sql(`select jsonb_agg(to_jsonb(s) order by id) from public.scheduled_shifts s where care_recipient_id=${q(f.patient)};`)).toBe(before); expect(sent).toEqual([]);
  } finally { await ref.context.close(); }
});
