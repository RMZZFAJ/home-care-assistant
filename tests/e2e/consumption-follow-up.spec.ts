import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { setup, actor, fixtures, rpc } from "../integration/v4-fixtures.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { selectContext } from "./auth-context";
import { auditFromTop } from "./accessibility-audit";
import type { ConsumptionReport } from "../../src/types/consumption";

test.setTimeout(180_000);
test.afterEach(async ({ page }) => page.unrouteAll({ behavior: "wait" }));
const detail = (page: Page) => page.locator('section[aria-label="Detalhe do relato"]');
const facts = (patient: string) => sql(`select jsonb_build_object(
  'reports',(select jsonb_agg(to_jsonb(r) order by id) from public.consumption_reports r where care_recipient_id=${q(patient)}),
  'revisions',(select jsonb_agg(to_jsonb(v) order by v.id) from public.consumption_report_revisions v join public.consumption_reports r on r.id=v.report_id where r.care_recipient_id=${q(patient)}),
  'decisions',(select jsonb_agg(to_jsonb(d) order by d.id) from public.consumption_report_decisions d join public.consumption_reports r on r.id=d.report_id where r.care_recipient_id=${q(patient)}),
  'stock',(select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${q(patient)}))::text;`);
const ledger = (patient: string) => sql(`select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${q(patient)};`);
const statement = (id: string) => sql(`select jsonb_build_object('body',body,'lines',lines,'actor',reported_by,'createdAt',created_at) from public.consumption_reports where id=${q(id)};`);
async function login(page: Page, patient: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(fixtures.adminA.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible();
  await selectContext(page, patient);
}
async function open(page: Page, patient: string, id: string, heading: string) {
  await page.goto(`/consumo?careRecipientId=${patient}&ref=${id}&refKind=report`);
  await expect(detail(page).getByRole("heading", { name: heading, exact: true })).toBeVisible();
}
function officialWrites(page: Page) {
  const writes: string[] = [];
  page.on("request", request => {
    if (request.method() !== "GET" && new URL(request.url()).pathname.startsWith("/api/consumption")) writes.push(request.url());
  });
  return writes;
}
async function refresh(page: Page, id: string, expectedStatus?: number) {
  const response = page.waitForResponse(r => new URL(r.url()).pathname === `/api/consumption/${id}` && r.request().method() === "GET" && (expectedStatus === undefined || r.status() === expectedStatus));
  await detail(page).getByRole("button", { name: "Atualizar relato", exact: true }).click();
  return response;
}
async function staleRead(page: Page, id: string, snapshot: ConsumptionReport) {
  let captured = false;
  await page.route(`**/api/consumption/${id}`, route => {
    captured = true;
    return route.fulfill({ status: 200, json: { data: snapshot } });
  });
  expect((await refresh(page, id)).ok()).toBe(true);
  await expect(detail(page).getByText("Última consulta confirmada; os dados preservados não representam uma nova atualização.", { exact: true })).toHaveCount(0);
  expect(captured).toBe(true);
  await page.unroute(`**/api/consumption/${id}`);
}

for (const location of ["FAMILY", "CARE_TEAM"] as const) test(`Consumption follow-up ${location} preserves supplements and decisions against stale reads and shows the actual debit source`, async ({ page }, info) => {
  const f = await setup(), pro = await actor("professional", f.patient);
  if (location === "CARE_TEAM") {
    const ent = await rpc(f.admin, "create_supply_document", { p_patient: f.patient, p_type: "ENT", p_key: randomUUID(), p_draft: false,
      p_payload: { source: "FAMILY", destination: "CARE_TEAM", recipientId: fixtures.professional.id, recipientReason: "Entrega fictícia para formar estoque de consumo da equipe", lines: [{ productId: f.products[0], quantity: "5" }] } });
    await rpc(pro, "supply_document_command", { p_id: ent.id, p_action: "receive", p_body: { divergences: [] }, p_key: randomUUID(), p_version: ent.version });
  }
  const id = await rpc(location === "CARE_TEAM" ? pro : f.admin, "report_extraordinary_consumption", { p_patient: f.patient, p_kind: "consumption", p_location: location, p_text: "Declaração original fictícia não pode ser reescrita", p_lines: [], p_key: randomUUID() });
  const original = await rpc(f.admin, "consumption_report", { p_id: id }) as ConsumptionReport;
  const beforeLedger = ledger(f.patient), originalStatement = statement(id);
  await login(page, f.patient);
  const writes = officialWrites(page);
  let before = facts(f.patient);
  await open(page, f.patient, id, "Completar os materiais do consumo");
  await expect(detail(page).getByRole("button", { name: "Conferir consumo", exact: true })).toBeDisabled();
  expect(facts(f.patient)).toBe(before);
  const supplemented = await rpc(f.admin, "supplement_consumption_report", { p_id: id, p_text: "Complemento próprio com duas unidades conferíveis", p_lines: [{ productId: f.products[0], quantity: "2" }], p_key: randomUUID(), p_version: original.version }) as ConsumptionReport;
  expect(ledger(f.patient)).toBe(beforeLedger);
  const pendingHeading = location === "FAMILY" ? "Conferir o consumo da família" : "Conferir o consumo da equipe";
  before = facts(f.patient);
  await open(page, f.patient, id, pendingHeading);
  await staleRead(page, id, original);
  await expect(detail(page).getByRole("heading", { name: pendingHeading, exact: true })).toBeVisible();
  await expect(detail(page).getByRole("heading", { name: "Complemento · versão 2", exact: true })).toBeVisible();
  expect(facts(f.patient)).toBe(before);
  const confirmed = await rpc(f.admin, "decide_consumption_report", { p_id: id, p_accept: true, p_reason: null, p_key: randomUUID(), p_version: supplemented.version }) as ConsumptionReport;
  expect(confirmed.version).toBe(supplemented.version);
  expect(confirmed.status).toBe("confirmed");
  expect(sql(`select count(*) from public.stock_movements where care_recipient_id=${q(f.patient)} and reference_type='consumption' and reference_id=${q(id)};`)).toBe("1");
  expect(sql(`select quantity::text||':'||source_location||':'||coalesce(destination_location,'none') from public.stock_movements where care_recipient_id=${q(f.patient)} and reference_type='consumption' and reference_id=${q(id)};`)).toBe(`2.000000:${location}:none`);
  before = facts(f.patient);
  await open(page, f.patient, id, "Consultar o consumo confirmado");
  await staleRead(page, id, supplemented);
  await expect(detail(page).getByRole("heading", { name: "Consultar o consumo confirmado", exact: true })).toBeVisible();
  await expect(detail(page).getByRole("button", { name: "Conferir consumo", exact: true })).toHaveCount(0);
  await expect(detail(page)).toContainText(location === "FAMILY" ? "saída de Família" : "saída de Equipe");
  await page.setViewportSize({ width: 320, height: 900 });
  await auditFromTop(page, `Consumption ${location} confirmed320`);
  mkdirSync("output/playwright/phase-d", { recursive: true });
  await detail(page).getByRole("region", { name: "Acompanhamento do relato", exact: true }).screenshot({ path: `output/playwright/phase-d/consumption-follow-up-${location}-${info.project.name}.png` });
  expect(facts(f.patient)).toBe(before);
  expect(statement(id)).toBe(originalStatement);
  expect(writes).toEqual([]);
});

test("Consumption follow-up suspends operations during refresh, retains identified data after failure and hides denied access", async ({ page }) => {
  const f = await setup();
  const create = (body: string) => rpc(f.admin, "report_extraordinary_consumption", { p_patient: f.patient, p_kind: "consumption", p_location: "FAMILY", p_text: body, p_lines: [{ productId: f.products[0], quantity: "1" }], p_key: randomUUID() });
  const id = await create("Relato selecionado fictício deve permanecer nesta referência");
  const otherId = await create("Outro relato fictício não pertence ao detalhe selecionado");
  const other = await rpc(f.admin, "consumption_report", { p_id: otherId });
  await login(page, f.patient);
  const writes = officialWrites(page), before = facts(f.patient);
  await open(page, f.patient, id, "Conferir o consumo da família");
  let release = () => {};
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route(`**/api/consumption/${id}`, async route => {
    await held;
    await route.fulfill({ status: 503, json: { code: "DATABASE_UNAVAILABLE", error: "Consulta fictícia do relato temporariamente indisponível", retryable: true } });
  });
  // An earlier real read can still finish after the fault route is installed.
  // Observe the injected failure, rather than accepting that preceding 200.
  const pending = refresh(page, id, 503);
  try {
    await expect(detail(page)).toContainText("Atualizando o acompanhamento do relato");
    await expect(detail(page).getByRole("button", { name: "Conferir consumo", exact: true })).toHaveCount(0);
    await expect(detail(page).getByRole("button", { name: "Adicionar complemento", exact: true })).toHaveCount(0);
  } finally { release(); }
  expect((await pending).status()).toBe(503);
  await expect(detail(page)).toContainText("O acompanhamento atual não foi confirmado");
  await expect(detail(page)).toContainText("Última consulta confirmada");
  await expect(detail(page)).toContainText("Relato selecionado fictício deve permanecer nesta referência");
  expect(facts(f.patient)).toBe(before);
  await page.unroute(`**/api/consumption/${id}`);
  expect((await refresh(page, id)).ok()).toBe(true);
  await expect(detail(page).getByRole("button", { name: "Conferir consumo", exact: true })).toBeEnabled();
  await page.route(`**/api/consumption/${id}`, route => route.fulfill({ status: 200, json: { data: other } }));
  await refresh(page, id);
  await expect(detail(page)).toContainText("A consulta não corresponde ao relato, paciente ou versão esperados");
  await expect(detail(page).getByText("Outro relato fictício não pertence ao detalhe selecionado", { exact: true })).toHaveCount(0);
  expect(facts(f.patient)).toBe(before);
  await page.unroute(`**/api/consumption/${id}`);
  await refresh(page, id);
  await expect(detail(page).getByRole("button", { name: "Conferir consumo", exact: true })).toBeEnabled();
  const denied = page.waitForResponse(r => new URL(r.url()).pathname === `/api/consumption/${id}` && r.request().method() === "GET" && r.status() === 403);
  sql(`insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${q(f.patient)},${q(fixtures.adminA.id)},'stock.family.read',false);`);
  // Realtime may already remove the control after revocation. Drive its normal
  // read invalidation; the HTTP request and the Auth/RLS denial remain real.
  await page.evaluate(() => window.dispatchEvent(new Event("hca:data-changed")));
  expect((await denied).status()).toBe(403);
  await expect(detail(page).getByRole("heading", { name: "Relato original · versão 1", exact: true })).toHaveCount(0);
  await expect(detail(page).getByRole("button", { name: "Conferir consumo", exact: true })).toHaveCount(0);
  expect(facts(f.patient)).toBe(before);
  expect(writes).toEqual([]);
});
