import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { setup, rpc } from "../integration/v4-fixtures.mjs";
import {
  fixtureFile,
  sql,
  sqlLiteral,
} from "../../scripts/test-environment.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";
import { audit } from "./accessibility-audit";
import type { SupplyDocument } from "../../src/types/documents";
test.setTimeout(100_000);
async function open(page: Page, patient: string, path = "/fichas/com") {
  const f = JSON.parse(readFileSync(fixtureFile, "utf8"));
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(f.adminA.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Visão geral", exact: true }),
  ).toBeVisible();
  await selectContext(page, patient);
  await page.goto(path);
}
const next = (page: Page) =>
  page.getByRole("button", { name: /^(Avançar|Revisar)$/ }).click();
const stock = (patient: string) =>
  sql(
    `select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${sqlLiteral(patient)};`,
  );
async function finish(page: Page, revise = false) {
  const pending = page.waitForResponse(
    (r) =>
      r.request().method() === "POST" &&
      (revise
        ? /\/revise$/.test(new URL(r.url()).pathname)
        : new URL(r.url()).pathname === "/api/documents"),
  );
  await page
    .getByRole("button", { name: "Confirmar e concluir", exact: true })
    .click();
  const response = await pending;
  expect(response.ok(), await response.text()).toBe(true);
  return (await response.json()).data as SupplyDocument;
}
test("COM começa sem compra presumida e emite doação explícita sem creditar estoque", async ({
  page,
}, info) => {
  const f = await setup(),
    before = stock(f.patient);
  await open(page, f.patient);
  const origin = page.getByLabel("Forma de aquisição", { exact: false });
  await expect(origin).toHaveValue("");
  await next(page);
  await expect(origin).toBeFocused();
  await expect(origin).toHaveAttribute("aria-invalid", "true");
  expect(stock(f.patient)).toBe(before);
  await origin.selectOption("donation");
  await next(page);
  await next(page);
  await page.getByRole("checkbox", { name: /^Material fictício V4 0/ }).check();
  await page
    .getByLabel("Quantidade — Material fictício V4 0", { exact: true })
    .fill("2");
  await next(page);
  await next(page);
  await next(page);
  await expect(
    page.getByText("Forma de aquisição: Doação", { exact: true }),
  ).toBeVisible();
  expect(stock(f.patient)).toBe(before);
  const document = await finish(page);
  expect(document.payload.origin).toBe("donation");
  expect(Number(document.lines[0].quantity)).toBe(2);
  expect(stock(f.patient)).toBe(before);
  await expect(
    page.getByText(
      "Doação registrada. Acompanhe as parcelas e a validação da chegada.",
      { exact: true },
    ),
  ).toBeVisible();
  await page.getByRole("link", { name: /Acompanhar ficha/ }).click();
  await expect(page.locator(".hca-document-header .eyebrow")).toHaveText(
    "Doação de insumos",
  );
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await audit(page, "COM explicit origin " + width);
  }
  await page.screenshot({
    path: `output/playwright/phase-d/purchase-origin-${info.project.name}.png`,
    fullPage: true,
    animations: "disabled",
  });
});
test("COM recupera rascunho sem origem em branco e exige escolha antes de emitir sem alterar o evento anterior", async ({
  page,
}) => {
  const f = await setup(),
    body = { lines: [{ productId: f.products[0], quantity: "2" }] },
    draft = (await rpc(f.admin, "create_supply_document", {
      p_patient: f.patient,
      p_type: "COM",
      p_payload: body,
      p_key: randomUUID(),
      p_draft: true,
    })) as SupplyDocument,
    before = stock(f.patient);
  await open(page, f.patient, "/fichas/com?documentId=" + draft.id);
  const origin = page.getByLabel("Forma de aquisição", { exact: false });
  await expect(origin).toHaveValue("");
  await next(page);
  await expect(origin).toHaveAttribute("aria-invalid", "true");
  await origin.selectOption("purchase");
  await next(page);
  await next(page);
  await expect(
    page.getByLabel("Quantidade — Material fictício V4 0", { exact: true }),
  ).toHaveValue("2");
  await next(page);
  await next(page);
  await next(page);
  await expect(
    page.getByText("Forma de aquisição: Compra pela família", { exact: true }),
  ).toBeVisible();
  const emitted = await finish(page, true);
  expect(emitted.id).toBe(draft.id);
  expect(emitted.payload.origin).toBe("purchase");
  expect(stock(f.patient)).toBe(before);
  expect(
    sql(
      `select coalesce(body->'payload'->>'origin','unknown') from public.document_events where document_id=${sqlLiteral(draft.id)} and version=1;`,
    ),
  ).toBe("unknown");
});
