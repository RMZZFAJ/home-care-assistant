import { isDocumentAccessReport } from "./display-access-report";
import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { setup, actor, fixtures, rpc } from "../integration/v4-fixtures.mjs";
import { send } from "../integration/com-decision-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";
import { selectDocumentSection } from "./document-sections";
import { audit } from "./accessibility-audit";

test.setTimeout(180_000);
test.afterEach(async ({ page }) => page.unrouteAll({ behavior: "wait" }));
const parcel = (page: Page) => page.getByRole("region", { name: "Parcelas de chegada", exact: true });
const receiptIds = (page: Page) => parcel(page).locator("li[data-receipt-id]").evaluateAll(nodes => nodes.map(node => node.getAttribute("data-receipt-id")));
const facts = (patient: string) => sql(`select encode(sha256(convert_to(jsonb_build_object(
  'documents',(select jsonb_agg(to_jsonb(d) order by id) from public.operational_documents d where care_recipient_id=${q(patient)}),
  'lines',(select jsonb_agg(to_jsonb(l) order by id) from public.document_lines l where care_recipient_id=${q(patient)}),
  'events',(select jsonb_agg(to_jsonb(e) order by id) from public.document_events e where care_recipient_id=${q(patient)}),
  'receipts',(select jsonb_agg(to_jsonb(r) order by r.id) from public.purchase_receipts r join public.operational_documents d on d.id=r.document_id where d.care_recipient_id=${q(patient)}),
  'stock',(select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${q(patient)})
)::text,'UTF8')),'hex');`);
async function login(page: Page, patient: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(fixtures.adminA.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible();
  await selectContext(page, patient);
}
function trackWrites(page: Page, allowAccess = false) {
  const writes: string[] = [];
  page.on("request", request => {
    if (new URL(request.url()).pathname.startsWith("/api/") && request.method() !== "GET" && !(allowAccess && isDocumentAccessReport(request))) writes.push(request.url());
  });
  return writes;
}

test("COM list reaches more than100 acquisitions and the oldest purchase through native pages and code", async ({ page }) => {
  const f = await setup();
  for (let index = 0; index < 101; index++) await rpc(f.admin, "create_supply_document", {
    p_patient: f.patient, p_type: "COM", p_payload: { origin: index % 2 ? "donation" : "purchase", lines: [{ productId: f.products[0], quantity: "1" }] }, p_key: randomUUID(), p_draft: false,
  });
  const order: string[] = JSON.parse(sql(`select jsonb_agg(id::text order by created_at desc,id) from public.operational_documents where care_recipient_id=${q(f.patient)} and type='COM';`));
  const oldest = order.at(-1)!, code = sql(`select code from public.operational_documents where id=${q(oldest)};`), before = facts(f.patient);
  expect(order).toHaveLength(101);
  await login(page, f.patient);
  const writes = trackWrites(page);
  await page.goto(`/historico?careRecipientId=${f.patient}&type=COM`);
  const links = page.locator("a.av-record"), observed: string[] = [];
  const ids = () => links.evaluateAll(nodes => nodes.map(node => node.getAttribute("href")!.split("/").at(-1)));
  for (let offset = 0; offset < order.length; offset += 20) {
    await expect.poll(ids).toEqual(order.slice(offset, offset + 20));
    observed.push(...await ids() as string[]);
    const next = page.getByRole("navigation", { name: "Páginas do histórico", exact: true }).getByRole("button", { name: "Próxima", exact: true });
    if (offset + 20 < order.length) await next.click(); else await expect(next).toBeDisabled();
  }
  expect(observed).toEqual(order); expect(new Set(observed).size).toBe(101);
  await page.getByRole("searchbox", { name: "Buscar por código ou protocolo", exact: true }).fill(code);
  await page.getByRole("button", { name: "Aplicar filtros", exact: true }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get("search")).toBe(code);
  await expect(links).toHaveCount(1);
  await expect(links.first()).toHaveAttribute("href", `/documentos/${oldest}`);
  expect(new URL(page.url()).searchParams.get("type")).toBe("COM");
  expect(new URL(page.url()).searchParams.get("page")).toBeNull();
  expect(facts(f.patient)).toBe(before); expect(writes).toEqual([]);
});

test("COM parcels keep more than100 native declarations reachable and filter without renumbering or stock effects", async ({ page }, info) => {
  const f = await setup(), family = await actor("family", f.patient);
  let doc = await rpc(f.admin, "create_supply_document", { p_patient: f.patient, p_type: "COM", p_payload: { origin: "purchase", lines: [{ productId: f.products[0], quantity: "101" }] }, p_key: randomUUID(), p_draft: false });
  const lineId = doc.lines[0].id;
  doc = await send(family, doc, "purchase", { lines: [{ lineId, quantity: "101" }] });
  for (let index = 0; index < 101; index++) doc = await send(family, doc, "receive", { lines: [{ lineId, quantity: "1" }] });
  const order: string[] = JSON.parse(sql(`select jsonb_agg(id::text order by created_at,id) from public.purchase_receipts where document_id=${q(doc.id)};`));
  expect(order).toHaveLength(101);
  doc = await send(f.admin, doc, "validate_receipt", { receiptId: order[2] });
  doc = await send(f.admin, doc, "reject_receipt", { receiptId: order[1], reason: "Parcela fictícia rejeitada sem crédito de estoque" });
  expect(JSON.parse(sql(`select jsonb_object_agg(state,n) from (select state,count(*) n from public.purchase_receipts where document_id=${q(doc.id)} group by state) s;`))).toEqual({ pending: 99, approved: 1, rejected: 1 });
  expect(sql(`select sum(quantity)::text from public.stock_movements where care_recipient_id=${q(f.patient)} and reference_type='purchase_receipt';`)).toBe("1.000000");
  const before = facts(f.patient);
  await login(page, f.patient);
  const writes = trackWrites(page, true);
  await page.goto(`/documentos/${doc.id}`);
  await selectDocumentSection(page, "workflow");
  const panel = parcel(page), observed: string[] = [];
  for (let offset = 0; offset < order.length; offset += 20) {
    await expect.poll(() => receiptIds(page)).toEqual(order.slice(offset, offset + 20));
    observed.push(...await receiptIds(page) as string[]);
    const next = panel.getByRole("navigation", { name: "Páginas das parcelas", exact: true }).getByRole("button", { name: "Próxima", exact: true });
    if (offset + 20 < order.length) await next.click(); else await expect(next).toBeDisabled();
  }
  expect(observed).toEqual(order); expect(new Set(observed).size).toBe(101);
  const search = panel.getByRole("searchbox", { name: "Buscar parcela", exact: true }), state = panel.getByRole("combobox", { name: "Situação das parcelas", exact: true });
  await search.fill("1");
  await expect.poll(() => receiptIds(page)).toEqual([order[0]]);
  await state.selectOption("approved");
  await expect(panel.getByText("Nenhuma parcela nesta seleção.", { exact: false })).toBeVisible();
  await expect(panel.getByText("Nenhuma parcela de chegada informada.", { exact: true })).toHaveCount(0);
  await search.fill("");
  await expect.poll(() => receiptIds(page)).toEqual([order[2]]);
  await expect(panel.getByRole("heading", { name: "Parcela 3 · Validada", exact: true })).toBeVisible();
  await state.selectOption(""); await search.fill("101");
  await expect.poll(() => receiptIds(page)).toEqual([order[100]]);
  await expect(panel.getByRole("heading", { name: "Parcela 101 · Aguardando conferência", exact: true })).toBeVisible();
  await page.setViewportSize({ width: 320, height: 900 });
  await audit(page, "purchase parcels101 narrow");
  mkdirSync("output/playwright/phase-d", { recursive: true });
  await panel.screenshot({ path: `output/playwright/phase-d/purchase-parcels101-${info.project.name}.png` });
  await page.route(`**/api/documents/${doc.id}`, route => route.request().method() === "GET" ? route.fulfill({ status: 503, json: { code: "UNAVAILABLE", error: "Consulta das parcelas temporariamente indisponível" } }) : route.continue());
  await page.getByRole("button", { name: "Atualizar ficha", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Consulta das parcelas temporariamente indisponível" })).toBeVisible();
  await expect(search).toHaveValue("101");
  await expect.poll(() => receiptIds(page)).toEqual([order[100]]);
  await page.unroute(`**/api/documents/${doc.id}`);
  await page.getByRole("button", { name: "Atualizar ficha", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Consulta das parcelas temporariamente indisponível" })).toHaveCount(0);
  await panel.getByRole("button", { name: "Limpar consulta de parcelas", exact: true }).click();
  await expect.poll(() => receiptIds(page)).toEqual(order.slice(0, 20));
  expect(facts(f.patient)).toBe(before); expect(writes).toEqual([]);
});
