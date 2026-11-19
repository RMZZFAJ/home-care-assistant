import { expandDocumentMilestones } from "./document-sections";
import { isDocumentAccessReport } from "./display-access-report";
import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { transferFixture, declareTransfer, transferCommand, rpc } from "../integration/transfer-fixtures.mjs";
import { fixtures } from "../integration/v4-fixtures.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { selectContext } from "./auth-context";
import { auditFromTop } from "./accessibility-audit";
import { generatedPdf } from "./generated-pdf";
import type { SupplyDocument } from "../../src/types/documents";

test.setTimeout(180_000);
type Fixture = Awaited<ReturnType<typeof transferFixture>>;
type Custody = "FAMILY" | "CARE_TEAM";
const milestone = (page: Page, label: string) => page.getByRole("list", { name: "Marcos da ficha", exact: true })
  .getByRole("listitem").filter({ has: page.getByText(label, { exact: true }) });
const ledger = (patient: string) => sql(`select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${q(patient)};`);
const facts = (patient: string) => sql(`select jsonb_build_object(
  'documents',(select jsonb_agg(to_jsonb(d) order by id) from public.operational_documents d where care_recipient_id=${q(patient)}),
  'lines',(select jsonb_agg(to_jsonb(l) order by id) from public.document_lines l where care_recipient_id=${q(patient)}),
  'transfers',(select jsonb_agg(to_jsonb(t) order by document_id) from public.ent_transfers t where care_recipient_id=${q(patient)}),
  'events',(select jsonb_agg(to_jsonb(e) order by id) from public.document_events e where care_recipient_id=${q(patient)}),
  'stock',(select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${q(patient)}))::text;`);
const original = (f: Fixture) => sql(`select jsonb_build_object(
  'document',(select to_jsonb(d) from public.operational_documents d where id=${q(f.origin.id)}),
  'lines',(select jsonb_agg(to_jsonb(l) order by id) from public.document_lines l where document_id=${q(f.origin.id)}),
  'events',(select jsonb_agg(to_jsonb(e) order by id) from public.document_events e where document_id=${q(f.origin.id)}));`);
async function login(page: Page, email: string, patient: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible();
  await selectContext(page, patient);
}
async function open(page: Page, id: string, heading: string) {
  await page.goto(`/documentos/${id}`);
  await expect(page.getByRole("region", { name: "Próximo passo sugerido", exact: true })).toContainText(heading);
  await expandDocumentMilestones(page);
}
function officialWrites(page: Page) {
  const writes: string[] = [];
  page.on("request", request => {
    const path = new URL(request.url()).pathname;
    if (request.method() !== "GET" && !isDocumentAccessReport(request) && (/^\/api\/documents\//.test(path) || path.startsWith("/api/transfers"))) writes.push(path);
  });
  return writes;
}
async function command(client: Fixture["admin"], doc: SupplyDocument, action: string) {
  const result = await transferCommand(client, doc.id, action, doc.version, action === "dispatch" ? {} : { reason: "Decisão própria fictícia preserva os fatos físicos" });
  expect(result.error).toBeNull();
  return result.data as SupplyDocument;
}
async function declareInUi(page: Page, f: Fixture, source: Custody, info: TestInfo) {
  const label = source === "CARE_TEAM" ? "devolução" : "entrega";
  await page.goto(source === "CARE_TEAM" ? "/fichas/devolucao" : "/transferencias");
  if (source === "FAMILY") await page.getByRole("combobox", { name: /^Custódia de origem/ }).selectOption(source);
  await page.getByRole("button", { name: source === "CARE_TEAM" ? "Preparar devolução" : "Preparar declaração", exact: true }).click();
  const drawer = page.getByRole("region", { name: `Nova ${label}`, exact: true });
  await expect(drawer.getByRole("combobox", { name: /^Contraparte para concordância/ })).toHaveCount(0);
  await drawer.getByRole("combobox", { name: /^Recebedor físico designado/ }).selectOption(source === "CARE_TEAM" ? f.recipient.id : f.initiator.id);
  await drawer.getByRole("button", { name: "Selecionar materiais", exact: true }).click();
  const material = drawer.getByRole("combobox", { name: /^Adicionar material da origem/ });
  await material.click(); await material.fill("Material fictício V4 0"); await material.press("ArrowDown");
  await page.getByRole("option", { name: /Material fictício V4 0/ }).click();
  await drawer.getByRole("textbox", { name: /^Quantidade de Material fictício V4 0/ }).fill("2");
  await drawer.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(drawer.getByRole("heading", { name: "Itens extras", exact: true })).toBeVisible();
  await drawer.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(drawer.getByRole("combobox", { name: /^ENT documental de origem/ })).toHaveValue("");
  await drawer.getByRole("textbox", { name: /^Sua justificativa para a (entrega|devolução) de materiais/ }).fill("Processo autônomo fictício sem entrega de origem vinculada");
  await drawer.getByRole("button", { name: "Revisar ficha", exact: true }).click();
  await expect(drawer.getByRole("heading", { name: /Revise antes de expedir/ })).toBeVisible();
  const ship = drawer.getByRole("button", { name: `Expedir ${label}`, exact: true });
  if (info.project.use.hasTouch) {
    await expect(ship).toBeInViewport({ ratio: 1 });
    const bottomNav = page.locator(".hca-bottom-navigation");
    expect((await ship.boundingBox())!.y + (await ship.boundingBox())!.height)
      .toBeLessThanOrEqual((await bottomNav.boundingBox())!.y);
  }
  if (info.project.use.hasTouch) await info.attach("Revisão da expedição", {
    body: await page.screenshot({ animations: "disabled", scale: "css" }), contentType: "image/png",
  });
  const pending = page.waitForResponse(response => new URL(response.url()).pathname === "/api/transfers" && response.request().method() === "POST");
  await ship.click();
  const response = await pending;
  expect(response.ok(), await response.text()).toBe(true);
  const doc = (await response.json()).data as SupplyDocument;
  const result = page.getByRole("dialog", { name: label === "entrega" ? "Entrega expedida" : "Devolução expedida", exact: true });
  await expect(result.getByRole("link", { name: "Baixar PDF", exact: true })).toBeVisible();
  await result.getByRole("button", { name: "Acompanhar ficha", exact: true }).click();
  return doc;
}

for (const source of ["FAMILY", "CARE_TEAM"] as const) test(`Transfer follow-up ${source} ships directly without an origin and waits for personal receipt`, async ({ page }, info) => {
  const f = await transferFixture();
  const returned = source === "CARE_TEAM", noun = returned ? "devolução" : "entrega";
  const recipient = returned ? f.recipient : f.initiator;
  const physical = ledger(f.patient), prior = original(f);
  await login(page, returned ? f.initiator.email : fixtures.adminA.email, f.patient);
  let doc = await declareInUi(page, f, source, info);
  expect(doc.transfer?.originDocumentId).toBeNull();
  expect(doc.protocol).toBeTruthy();
  expect(doc.code).toMatch(returned ? /^DEV-/ : /^ENT-/);
  expect(doc.transfer?.agreement).toBeNull();
  expect(doc.transfer?.declaration.counterparty).toBeUndefined();
  expect(JSON.parse(ledger(f.patient))).toHaveLength(JSON.parse(physical).length + 1);
  expect(Number(sql(`select private.stock_quantity(${q(f.patient)},${q(f.products[0])},'TRANSIT');`))).toBe(2);
  let before = facts(f.patient);
  const writes = officialWrites(page);
  await open(page, doc.id, `Conferir o recebimento da ${noun}`);
  await expect(milestone(page, "Emissão")).toHaveAttribute("data-state", "done");
  await expect(milestone(page, "Recebimento")).toHaveAttribute("data-state", "pending");
  await page.setViewportSize({ width: 320, height: 900 });
  await auditFromTop(page, `Transfer ${source} shipped320`);
  mkdirSync("output/playwright/phase-d", { recursive: true });
  await page.locator(".hca-document-header").screenshot({ path: `output/playwright/phase-d/transfer-follow-up-${source}-${info.project.name}.png` });
  expect(facts(f.patient)).toBe(before);
  if (returned) {
    const blocked = await f.counterparty.client.rpc("supply_document_command", { p_id: doc.id, p_action: "receive", p_body: { divergences: [] }, p_key: crypto.randomUUID(), p_version: doc.version });
    expect(blocked.error?.code).toBe("42501");
    expect(facts(f.patient)).toBe(before);
  }
  doc = await rpc(recipient.client, "supply_document_command", { p_id: doc.id, p_action: "receive", p_body: { divergences: [] }, p_key: crypto.randomUUID(), p_version: doc.version });
  expect(doc.workflow_data.acceptedBy).toBe(recipient.id);
  before = facts(f.patient);
  await open(page, doc.id, "Consultar o recebimento confirmado");
  await expect(milestone(page, "Recebimento")).toHaveAttribute("data-state", "done");
  expect(facts(f.patient)).toBe(before);
  expect(original(f)).toBe(prior);
  expect(writes).toEqual([]);
  if (returned) {
    const pdf = await generatedPdf(page, `/api/documents/${doc.id}/pdf`);
    expect(pdf.ok(), await pdf.text()).toBe(true);
    await info.attach("DEV · PDF assinado", { body: await pdf.body(), contentType: "application/pdf" });
  }
});

test("Transfer follow-up preserves refusal and withdrawal without shipment or another receipt task", async ({ page }) => {
  const f = await transferFixture(), physical = ledger(f.patient);
  await login(page, f.initiator.email, f.patient);
  const writes = officialWrites(page);
  for (const action of ["decline", "withdraw"] as const) {
    const declared = await declareTransfer(f, { originDocumentId: null });
    expect(declared.response.error).toBeNull();
    let doc = declared.response.data as SupplyDocument;
    if (action === "withdraw") doc = await command(f.counterparty.client, doc, "agree");
    doc = await command(action === "decline" ? f.counterparty.client : f.initiator.client, doc, action);
    const before = facts(f.patient);
    await open(page, doc.id, action === "decline" ? "Consultar a recusa da devolução" : "Consultar o encerramento da devolução");
    await expect(milestone(page, "Expedição")).toHaveAttribute("data-state", "closed");
    await expect(milestone(page, "Recebimento")).toHaveAttribute("data-state", "closed");
    expect(facts(f.patient)).toBe(before);
    expect(ledger(f.patient)).toBe(physical);
  }
  expect(writes).toEqual([]);
});
