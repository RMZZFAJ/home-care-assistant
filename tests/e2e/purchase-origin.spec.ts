import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { setup, rpc } from "../integration/v4-fixtures.mjs";
import { shiftWorker } from "../integration/shift-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
import { selectMaterialCategory } from "./material-category";
import { loginDecision } from "./l1-decision-policy";
import { audit } from "./accessibility-audit";
import type { SupplyDocument } from "../../src/types/documents";

test.setTimeout(135_000);

const next = (page: Page) =>
  page.getByRole("button", { name: /^(Selecionar materiais|Continuar|Revisar ficha)$/ }).click();
const stock = (patient: string) =>
  sql(`select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${sqlLiteral(patient)};`);

async function open(page: Page, patient: string, path = "/fichas/com") {
  const admin = await shiftWorker(patient, "admin");
  await loginDecision(page, admin.email, patient);
  await page.goto(path);
  await expect(page.getByRole("navigation", { name: "Etapas da COM" })).toBeVisible();
  await expect(page.getByLabel("Forma de aquisição", { exact: false })).toHaveCount(0);
}

async function finish(page: Page, revise = false) {
  const pending = page.waitForResponse(
    (r) => r.request().method() === "POST" && (revise
      ? /\/revise$/.test(new URL(r.url()).pathname)
      : new URL(r.url()).pathname === "/api/documents"),
  );
  await page.getByRole("button", { name: "Emitir compra", exact: true }).click();
  const response = await pending;
  expect(response.ok(), await response.text()).toBe(true);
  return (await response.json()).data as SupplyDocument;
}

test("COM emite um planejamento e mantém a origem para o ato de aquisição", async ({ page }, info) => {
  const f = await setup();
  const before = stock(f.patient);
  await open(page, f.patient);
  await next(page);
  await selectMaterialCategory(page);
  await page.getByRole("checkbox", { name: /^Material fictício V4 0/ }).check();
  await page.getByLabel("Quantidade — Material fictício V4 0", { exact: true }).fill("2");
  for (let stage = 0; stage < 3; stage++) await next(page);
  await expect(page.getByText("Forma de aquisição", { exact: true })).toHaveCount(0);
  const document = await finish(page);
  expect(document.payload.acquisitionMode).toBe("planned");
  expect(document.payload.origin).toBeUndefined();
  expect(Number(document.lines[0].quantity)).toBe(2);
  expect(stock(f.patient)).toBe(before);
  const emitted = page.getByRole("dialog", { name: "Compra emitida", exact: true });
  await expect(emitted).toBeVisible({ timeout: 65_000 });
  await emitted.getByRole("button", { name: "Acompanhar ficha", exact: true }).click();
  await expect(page.locator(".hca-document-name p")).toHaveText("Planejamento de aquisição");
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await audit(page, "COM planejamento " + width);
  }
  await info.attach("COM como planejamento", {
    body: await page.screenshot({ fullPage: true, animations: "disabled" }),
    contentType: "image/png",
  });
});

test("COM emite revisão de rascunho antigo preservando a origem desconhecida no evento anterior", async ({ page }) => {
  const f = await setup();
  const admin = await shiftWorker(f.patient, "admin");
  const body = { lines: [{ productId: f.products[0], quantity: "2" }] };
  const draft = (await rpc(admin.client, "create_supply_document", {
    p_patient: f.patient,
    p_type: "COM",
    p_payload: body,
    p_key: randomUUID(),
    p_draft: true,
  })) as SupplyDocument;
  const before = stock(f.patient);
  const event = sql(`select body::text from public.document_events where document_id=${sqlLiteral(draft.id)} and version=1;`);
  await loginDecision(page, admin.email, f.patient);
  await page.goto("/fichas/com?documentId=" + draft.id);
  await next(page);
  await selectMaterialCategory(page);
  await expect(page.getByLabel("Quantidade — Material fictício V4 0", { exact: true })).toHaveValue("2");
  for (let stage = 0; stage < 3; stage++) await next(page);
  const emitted = await finish(page, true);
  expect(emitted.id).toBe(draft.id);
  expect(emitted.payload.acquisitionMode).toBe("planned");
  expect(emitted.payload.origin).toBeUndefined();
  expect(stock(f.patient)).toBe(before);
  expect(sql(`select body::text from public.document_events where document_id=${sqlLiteral(draft.id)} and version=1;`)).toBe(event);
});
