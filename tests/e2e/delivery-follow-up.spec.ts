import { isDocumentAccessReport } from "./display-access-report";
import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { actor, delivery, fixtures, issue, rpc, setup } from "../integration/v4-fixtures.mjs";
import { entOperationFixture, entSend } from "../integration/ent-operation-fixtures.mjs";
import { unavailableDelivery } from "../integration/delivery-regularization-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";
import { selectDocumentSection } from "./document-sections";
import { auditFromTop } from "./accessibility-audit";
import type { SupplyDocument } from "../../src/types/documents";

test.setTimeout(150_000);
test.afterEach(async ({ page }) => page.unrouteAll({ behavior: "wait" }));
async function login(page: Page, patient: string, role: "family" | "adminA" = "family") {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(fixtures[role].email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible();
  await selectContext(page, patient);
}
const panel = (page: Page) => page.getByRole("tabpanel");
const milestone = (page: Page, label: string) => page.getByRole("list", { name: "Marcos da ficha", exact: true })
  .getByRole("listitem").filter({ has: page.getByText(label, { exact: true }) });
async function open(page: Page, id: string, heading: string) {
  await page.goto(`/documentos/${id}`);
  await expect(panel(page)).toContainText(heading);
}
const facts = (patient: string) => sql(`select jsonb_build_object(
  'documents',(select jsonb_agg(to_jsonb(d) order by id) from public.operational_documents d where care_recipient_id=${q(patient)}),
  'lines',(select jsonb_agg(to_jsonb(l) order by id) from public.document_lines l where care_recipient_id=${q(patient)}),
  'events',(select jsonb_agg(to_jsonb(e) order by id) from public.document_events e where care_recipient_id=${q(patient)}),
  'regularizations',(select jsonb_agg(to_jsonb(r) order by id) from public.delivery_regularizations r where care_recipient_id=${q(patient)}),
  'stock',(select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${q(patient)}))::text;`);
const ledger = (patient: string) => sql(`select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${q(patient)};`);
function trackWrites(page: Page) {
  const writes: string[] = [];
  page.on("request", request => {
    if (new URL(request.url()).pathname.startsWith("/api/") && request.method() !== "GET" && !isDocumentAccessReport(request)) writes.push(request.url());
  });
  return writes;
}
async function workflow(page: Page) {
  const next = panel(page).getByRole("button", { name: "Abrir Atendimento e decisões", exact: true });
  await next.focus(); await next.press("Enter");
  await expect(page.getByRole("tab", { name: "Materiais", exact: true })).toBeFocused();
}

test("ENT follow-up distinguishes returned quantities from full receipt and preserves linked REQ fulfillment", async ({ page }, info) => {
  const f = await setup(), req = await issue(f.patient, f.products);
  const family = await actor("family", f.patient), pro = await actor("professional", f.patient);
  let doc: SupplyDocument = await delivery(f.patient, req, f.products, { quantity: "3" });
  await login(page, f.patient);
  const writes = trackWrites(page);
  let before = facts(f.patient);
  await open(page, doc.id, "Conferir o recebimento da entrega");
  await workflow(page);
  await expect(panel(page).locator(`a[href="/historico/${req.id}"]`)).toHaveCount(1);
  expect(facts(f.patient)).toBe(before);
  expect((await rpc(family, "requisition_fulfillment", { p_requisition: req.id })).fulfilled).toBe(0);

  doc = await entSend(pro, doc, "receive", { divergences: [{ lineId: doc.lines[0].id, acceptedQuantity: "1", problem: "shortage", notes: "Duas unidades ainda não foram recebidas" }] });
  expect(doc.status).toBe("disputed");
  const accepted = doc.workflow_data.acceptedBy;
  // A REQ has no requested quantity. Each positively accepted linked material
  // already fulfills its item; returning the unreceived remainder cannot undo it.
  expect((await rpc(family, "requisition_fulfillment", { p_requisition: req.id })).fulfilled).toBe(2);
  before = facts(f.patient);
  await open(page, doc.id, "Conciliar a divergência da entrega");
  await expect(milestone(page, "Recebimento")).toHaveAttribute("data-state", "pending");
  expect(facts(f.patient)).toBe(before);
  doc = await entSend(f.admin, doc, "resolve", { lineId: doc.lines[0].id, quantity: "2", resolution: "returned", reason: "Duas unidades não recebidas retornaram à origem" });
  expect(doc.status).toBe("confirmed");
  expect(doc.workflow_data.acceptedBy).toBe(accepted);
  expect(Number(doc.lines[0].accepted_quantity)).toBe(1);
  expect(Number(doc.lines[0].reconciled_quantity)).toBe(2);
  expect((await rpc(family, "requisition_fulfillment", { p_requisition: req.id })).fulfilled).toBe(2);
  before = facts(f.patient);
  await open(page, doc.id, "Consultar a conferência com diferenças");
  await expect(page.locator(".hca-document-tags")).toContainText("Conferência concluída com diferenças");
  await expect(milestone(page, "Recebimento")).toHaveAttribute("data-state", "closed");
  await expect(milestone(page, "Conclusão")).toContainText("Conferência e conciliação concluídas");
  await page.setViewportSize({ width: 320, height: 900 });
  await auditFromTop(page, "ENT reconciled differences320");
  mkdirSync("output/playwright/phase-d", { recursive: true });
  await page.locator(".hca-document-header").screenshot({ path: `output/playwright/phase-d/delivery-follow-up-differences-${info.project.name}.png` });
  await workflow(page);
  await expect(panel(page).locator(`a[href="/historico/${req.id}"]`)).toHaveCount(1);
  expect(facts(f.patient)).toBe(before);
  expect(writes).toEqual([]);
});

test("ENT follow-up preserves pending cancellation and transit; read recovery cannot consent or return material", async ({ page }) => {
  const f = await entOperationFixture("disputed");
  let doc: SupplyDocument = await entSend(f.admin, f.document, "cancel", { reason: "Pedido fictício mantém o aceite anterior" });
  expect(doc.status).toBe("cancellation_pending");
  await login(page, f.patient, "adminA");
  const writes = trackWrites(page);
  let before = facts(f.patient), physical = ledger(f.patient);
  await open(page, doc.id, "Conciliar o material ainda em trânsito");
  await workflow(page);
  await expect(page.getByRole("button", { name: "Consentir e reconciliar cancelamento", exact: true })).toHaveCount(0);
  expect(facts(f.patient)).toBe(before);
  await selectDocumentSection(page, "overview");
  await page.route(`**/api/documents/${doc.id}`, route => route.fulfill({ status: 503, json: { code: "DATABASE_UNAVAILABLE", error: "A consulta fictícia da entrega não está disponível", retryable: true } }));
  await page.getByRole("button", { name: "Atualizar ficha", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "A consulta fictícia da entrega não está disponível" })).toBeVisible();
  await expect(panel(page)).toContainText("O acompanhamento atual não foi confirmado");
  await expect(panel(page).getByRole("button", { name: "Abrir Atendimento e decisões", exact: true })).toHaveCount(0);
  expect(ledger(f.patient)).toBe(physical);
  await page.unroute(`**/api/documents/${doc.id}`);
  await page.getByRole("button", { name: "Atualizar ficha", exact: true }).click();
  await expect(panel(page)).toContainText("Conciliar o material ainda em trânsito");
  expect(facts(f.patient)).toBe(before);

  for (const line of doc.lines) doc = await entSend(f.admin, doc, "resolve", { lineId: line.id, quantity: "2", resolution: "returned", reason: "Parcela em trânsito retornou à origem" });
  expect(Number(doc.deliveryCancellation?.unresolvedTransit)).toBe(0);
  before = facts(f.patient);
  await open(page, doc.id, "Conferir o pedido de cancelamento");
  expect(facts(f.patient)).toBe(before);
  doc = await entSend(f.pro, doc, "consent_cancel", { requestId: doc.deliveryCancellation?.request.id, referenceHash: doc.deliveryCancellation?.referenceHash, reason: "Decisão própria devolve somente o material recebido", lines: doc.lines.map(line => ({ lineId: line.id, returnQuantity: "1" })) });
  expect(doc.status).toBe("cancelled");
  before = facts(f.patient); physical = ledger(f.patient);
  await open(page, doc.id, "Consultar o encerramento da entrega");
  await expect(milestone(page, "Conclusão")).toHaveAttribute("data-state", "closed");
  await workflow(page);
  await expect(panel(page)).toContainText("Consentido e conciliado");
  expect(facts(f.patient)).toBe(before);
  expect(ledger(f.patient)).toBe(physical);
  expect(writes).toEqual([]);
});

test("ENT follow-up keeps independent regularization and unknown physical transit separate from personal receipt", async ({ page }) => {
  const f = await unavailableDelivery(), family = await actor("family", f.patient);
  let doc: SupplyDocument = f.document;
  const accepted = doc.workflow_data.acceptedBy;
  await login(page, f.patient);
  const writes = trackWrites(page);
  let before = facts(f.patient);
  await open(page, doc.id, "Consultar a regularização da entrega");
  expect(facts(f.patient)).toBe(before);
  doc = await entSend(f.admin, doc, "propose_regularization", { reason: "Recebedor sem vínculo para novo aceite pessoal", basis: "A parcela física desconhecida permanece em trânsito", reviewerId: fixtures.family.id, followUpOwnerId: fixtures.adminA.id, lines: doc.lines.map(line => ({ lineId: line.id, receivedQuantity: "0", returnedQuantity: "0", missingQuantity: "0" })) });
  before = facts(f.patient);
  const physical = ledger(f.patient);
  await open(page, doc.id, "Conferir a proposta de regularização");
  await workflow(page);
  await expect(panel(page).getByRole("heading", { name: "Aguardando conferência independente", exact: true })).toBeVisible();
  expect(facts(f.patient)).toBe(before);
  doc = await entSend(family, doc, "review_regularization", { caseId: doc.deliveryRegularization?.currentId, accept: true, reason: "Conferência independente preserva a parcela desconhecida" });
  expect(doc.status).toBe("administratively_closed");
  expect(doc.workflow_data.acceptedBy).toBe(accepted);
  expect(Number(doc.lines[0].accepted_quantity)).toBe(2);
  expect(ledger(f.patient)).toBe(physical);
  before = facts(f.patient);
  await open(page, doc.id, "Acompanhar o material ainda em trânsito");
  await expect(milestone(page, "Recebimento")).toHaveAttribute("data-state", "unknown");
  await expect(milestone(page, "Conclusão")).toHaveAttribute("data-state", "closed");
  await workflow(page);
  await expect(panel(page)).toContainText("Parcela desconhecida permanece em trânsito");
  await expect(page.getByRole("button", { name: "Confirmar recebimento", exact: true })).toHaveCount(0);
  expect(facts(f.patient)).toBe(before);
  expect(writes).toEqual([]);
});
