import { isDocumentAccessReport } from "./display-access-report";
import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { actor, fixtures, rpc, setup } from "../integration/v4-fixtures.mjs";
import { send } from "../integration/com-decision-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";
import { selectDocumentSection } from "./document-sections";
import { audit } from "./accessibility-audit";
import type { SupplyDocument } from "../../src/types/documents";

test.setTimeout(180_000);
test.afterEach(async ({ page }) => page.unrouteAll({ behavior: "wait" }));
async function login(page: Page, patient: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(fixtures.family.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible();
  await selectContext(page, patient);
}
async function open(page: Page, id: string, heading: string) {
  await page.goto(`/documentos/${id}`);
  await expect(page.getByRole("tabpanel")).toContainText(heading);
}
const panel = (page: Page) => page.getByRole("tabpanel");
const conclusion = (page: Page) => page.getByRole("list", { name: "Marcos da ficha", exact: true })
  .getByRole("listitem").filter({ hasText: "Conclusão" });
const facts = (patient: string) => sql(`select jsonb_build_object(
  'documents',(select jsonb_agg(to_jsonb(d) order by id) from public.operational_documents d where care_recipient_id=${q(patient)}),
  'lines',(select jsonb_agg(to_jsonb(l) order by id) from public.document_lines l where care_recipient_id=${q(patient)}),
  'events',(select jsonb_agg(to_jsonb(e) order by id) from public.document_events e where care_recipient_id=${q(patient)}),
  'receipts',(select jsonb_agg(to_jsonb(r) order by r.id) from public.purchase_receipts r
    join public.operational_documents d on d.id=r.document_id where d.care_recipient_id=${q(patient)}),
  'stock',(select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${q(patient)}))::text;`);
const ledger = (patient: string) => sql(`select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${q(patient)};`);
async function create(f: Awaited<ReturnType<typeof setup>>, origin = "purchase", draft = false, amount = "10") {
  return await rpc(f.admin, "create_supply_document", {
    p_patient: f.patient, p_type: "COM", p_key: randomUUID(), p_draft: draft,
    p_payload: { origin, lines: [{ productId: f.products[0], quantity: amount }] },
  }) as SupplyDocument;
}
function trackWrites(page: Page) {
  const writes: string[] = [];
  page.on("request", request => {
    if (new URL(request.url()).pathname.startsWith("/api/") && request.method() !== "GET" && !isDocumentAccessReport(request)) writes.push(request.url());
  });
  return writes;
}

test("COM follow-up never completes draft or pending approval and does not depend on the people directory", async ({ page }) => {
  const f = await setup();
  let doc = await create(f, "purchase", true);
  await login(page, f.patient);
  const writes = trackWrites(page);
  let directoryReads = 0;
  await page.route(url => url.pathname === "/api/patient-settings", route => {
    directoryReads++;
    return route.fulfill({ status: 403, json: { code: "FORBIDDEN", error: "Diretório fictício não autorizado" } });
  });
  let before = facts(f.patient);
  await open(page, doc.id, "Conferir a preparação antes de emitir");
  await expect(conclusion(page)).toHaveAttribute("data-state", "pending");
  const next = panel(page).getByRole("button", { name: "Abrir Aquisição e chegadas", exact: true });
  await next.focus();
  await next.press("Enter");
  await expect(page.getByRole("tab", { name: "Materiais", exact: true })).toBeFocused();
  expect(facts(f.patient)).toBe(before);

  sql(`insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled)
    values(${q(f.patient)},${q(fixtures.adminA.id)},'com.approve',false);`);
  doc = await send(f.admin, doc, "submit", {});
  expect(doc.status).toBe("pending_approval");
  before = facts(f.patient);
  await open(page, doc.id, "Conferir a aprovação da aquisição");
  await expect(conclusion(page)).toHaveAttribute("data-state", "pending");
  await expect(page.getByRole("button", { name: "Aprovar itens", exact: true })).toHaveCount(0);
  expect(facts(f.patient)).toBe(before);
  expect(directoryReads).toBe(0);

  sql(`update public.capability_overrides set enabled=true where care_recipient_id=${q(f.patient)}
    and subject_user=${q(fixtures.adminA.id)} and capability='com.approve';`);
  doc = await send(f.admin, doc, "cancel", { reason: "Cancelamento fictício da proposta sem fatos físicos" });
  before = facts(f.patient);
  await open(page, doc.id, "Consultar o encerramento da aquisição");
  await expect(conclusion(page)).toHaveAttribute("data-state", "closed");
  await panel(page).getByRole("button", { name: "Abrir Versões e integridade", exact: true }).click();
  await expect(page.getByRole("tab", {name:"Identificação e registros preservados",exact:true})).toBeFocused();
  expect(facts(f.patient)).toBe(before);
  expect(writes).toEqual([]);
});

test("COM follow-up preserves arrival rejection and P14 closure until a real parcel is validated", async ({ page }) => {
  const f = await setup(), family = await actor("family", f.patient);
  let doc = await create(f);
  const lineId = doc.lines[0].id;
  doc = await send(family, doc, "purchase", { lines: [{ lineId, quantity: "4" }] });
  const physical = ledger(f.patient);
  await login(page, f.patient);
  const writes = trackWrites(page);
  await open(page, doc.id, "Informar a chegada da aquisição");
  let before = facts(f.patient);
  await panel(page).getByRole("button", { name: "Abrir Aquisição e chegadas", exact: true }).click();
  await expect(page.getByRole("tab", { name: "Materiais", exact: true })).toBeFocused();
  expect(facts(f.patient)).toBe(before);

  doc = await send(family, doc, "receive", { lines: [{ lineId, quantity: "2" }] });
  const rejected = doc.receipts.find(receipt => receipt.state === "pending");
  if (!rejected) throw new Error("Synthetic arrival did not produce its expected pending parcel");
  expect(rejected.lines).toEqual([{ lineId, quantity: "2" }]);
  doc = await send(f.admin, doc, "close_expectation", { reason: "Encerrar somente a aquisição restante", confirmed: true });
  expect(doc.purchaseProgress?.state).toBe("closed_pending_validation");
  before = facts(f.patient);
  await open(page, doc.id, "Conferir as parcelas de chegada");
  await expect(panel(page)).toContainText("aquisição restante foi encerrada");
  await expect(conclusion(page)).toHaveAttribute("data-state", "pending");
  await panel(page).getByRole("button", { name: "Abrir Aquisição e chegadas", exact: true }).click();
  await expect(panel(page).getByRole("heading", { name: "Parcela 1 · Aguardando conferência", exact: true })).toBeVisible();
  expect(facts(f.patient)).toBe(before);
  expect(ledger(f.patient)).toBe(physical);

  doc = await send(f.admin, doc, "reject_receipt", { receiptId: rejected.id, reason: "Parcela fictícia não corresponde à chegada efetiva" });
  expect(doc.purchaseProgress?.state).toBe("closed_pending_arrival");
  before = facts(f.patient);
  await open(page, doc.id, "Informar a chegada da aquisição");
  await expect(conclusion(page)).toHaveAttribute("data-state", "pending");
  await panel(page).getByRole("button", { name: "Abrir Aquisição e chegadas", exact: true }).click();
  await expect(panel(page).getByRole("heading", { name: "Parcela 1 · Rejeitada", exact: true })).toBeVisible();
  expect(facts(f.patient)).toBe(before);
  expect(ledger(f.patient)).toBe(physical);

  doc = await send(family, doc, "receive", { lines: [{ lineId, quantity: "4" }] });
  const valid = doc.receipts.find(receipt => receipt.state === "pending");
  if (!valid) throw new Error("Synthetic replacement arrival did not produce its expected pending parcel");
  doc = await send(f.admin, doc, "validate_receipt", { receiptId: valid.id });
  expect(doc.purchaseProgress?.state).toBe("closed_below_quantity");
  expect(doc.receipts.find(receipt => receipt.id === rejected.id)?.lines).toEqual(rejected.lines);
  before = facts(f.patient);
  await open(page, doc.id, "Consultar a aquisição restante encerrada");
  await expect(conclusion(page)).toHaveAttribute("data-state", "done");
  await panel(page).getByRole("button", { name: "Abrir Aquisição e chegadas", exact: true }).click();
  await expect(panel(page)).toContainText("Parcela 1 · Rejeitada");
  await expect(panel(page)).toContainText("Parcela 2 · Validada");
  expect(facts(f.patient)).toBe(before);
  expect(sql(`select sum(quantity)::text from public.stock_movements where care_recipient_id=${q(f.patient)} and reference_type='purchase_receipt';`)).toBe("4.000000");
  expect(sql(`select count(*) from public.stock_movements where care_recipient_id=${q(f.patient)} and reference_type='purchase_receipt';`)).toBe("1");
  expect(writes).toEqual([]);
});

test("COM donation follow-up keeps its origin and freshness; revoked read access removes its facts", async ({ page }) => {
  const f = await setup(), family = await actor("family", f.patient);
  let doc = await create(f, "donation", false, "4");
  doc = await send(family, doc, "purchase", { lines: [{ lineId: doc.lines[0].id, quantity: "2" }] });
  await login(page, f.patient);
  const writes = trackWrites(page), before = facts(f.patient);
  await open(page, doc.id, "Informar a chegada da doação");
  await expect(page.locator(".hca-document-name p")).toHaveText("Doação de insumos");
  await expect(page.locator(".hca-document-tags")).toContainText("Doação em andamento");
  await expect(page.locator(".hca-document-tags")).not.toContainText("Compra em andamento");
  await page.setViewportSize({ width: 320, height: 900 });
  await audit(page, "COM donation follow-up");
  await page.route(`**/api/documents/${doc.id}`, route => route.fulfill({
    status: 503, json: { code: "DATABASE_UNAVAILABLE", error: "Consulta atual da doação fictícia indisponível", retryable: true },
  }));
  await page.getByRole("button", { name: "Atualizar ficha", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Consulta atual da doação fictícia indisponível" })).toBeVisible();
  await expect(panel(page)).toContainText("O acompanhamento atual não foi confirmado");
  await expect(panel(page).getByRole("button", { name: "Abrir Aquisição e chegadas", exact: true })).toHaveCount(0);
  await page.unroute(`**/api/documents/${doc.id}`);
  await page.getByRole("button", { name: "Atualizar ficha", exact: true }).click();
  await expect(panel(page)).toContainText("Informar a chegada da doação");
  await selectDocumentSection(page, "materials");
  await expect(panel(page)).toContainText("Adquirido");
  await expect(panel(page).getByRole("textbox")).toHaveCount(0);
  expect(facts(f.patient)).toBe(before);

  sql(`insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled)
    values(${q(f.patient)},${q(fixtures.family.id)},'com.read',false);`);
  const denied = page.waitForResponse(response => new URL(response.url()).pathname === `/api/documents/${doc.id}`
    && response.request().method() === "GET" && response.status() === 403);
  await page.getByRole("button", { name: "Atualizar ficha", exact: true }).click();
  await denied;
  await expect(page.locator(".hca-document-header")).toHaveCount(0);
  await expect(page.getByText("Doação em andamento", { exact: true })).toHaveCount(0);
  expect(facts(f.patient)).toBe(before);
  expect(writes).toEqual([]);
});
