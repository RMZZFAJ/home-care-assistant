import { selectDocumentSection } from "./document-sections";
import { expect, test, type Page } from "@playwright/test";
import { randomUUID, createHash } from "node:crypto";
import { actor, fixtures, rpc, setup } from "../integration/v4-fixtures.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { pauseLocalAutomationForTests, sql, sqlLiteral } from "../../scripts/test-environment.mjs";
import { selectContext } from "./auth-context";

test.setTimeout(120000);
let automation: { id: number; name: string; active: boolean }[] = [];
const owned = new Set<string>();
test.beforeAll(() => {
  automation = JSON.parse(sql("select coalesce(jsonb_agg(jsonb_build_object('id',jobid,'name',jobname,'active',active)),'[]') from cron.job where jobname in ('hca-operational-lifecycle','hca-notification-worker');"));
  pauseLocalAutomationForTests();
});
test.afterAll(() => { for (const job of automation) sql(`select cron.alter_job(jobid,active=>${job.active}) from cron.job where jobid=${job.id} and jobname=${sqlLiteral(job.name)};`); });
test.afterEach(async ({ page }) => {
  await page.unrouteAll({ behavior: "wait" });
  if (owned.size) sql(`update public.care_recipients set is_active=false where id=any(array[${[...owned].map(sqlLiteral).join(",")}]::uuid[]);`);
  owned.clear();
});
async function fixture(page: Page, seconds: number) {
  const f = await setup(); owned.add(f.patient); const owner = await actor("family", f.patient);
  sql(`insert into public.patient_settings(care_recipient_id,settings) values(${sqlLiteral(f.patient)},jsonb_build_object('shareWaitSeconds',${seconds})) on conflict(care_recipient_id) do update set settings=public.patient_settings.settings||excluded.settings;`);
  const doc = await rpc(owner, "create_supply_document", { p_patient: f.patient, p_type: "COM", p_payload: { origin: "purchase", lines: [{ productId: f.products[0], quantity: "1" }] }, p_key: randomUUID(), p_draft: false });
  await page.goto("/login"); await page.getByLabel("E-mail", { exact: true }).fill(fixtures.family.email); await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click(); await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible();
  await selectContext(page, f.patient); await page.clock.install();
  return { ...f, doc };
}
const tracking = (page: Page) => page.locator("[data-notice-tracking]");
const facts = (id: string) => sql(`select jsonb_build_object('document',(select to_jsonb(d) from public.operational_documents d where id=${sqlLiteral(id)}),'events',(select jsonb_agg(to_jsonb(e) order by version) from public.document_events e where document_id=${sqlLiteral(id)}),'science',(select count(*) from public.requisition_science_events where requisition_id=${sqlLiteral(id)}),'stock',(select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=(select care_recipient_id from public.operational_documents where id=${sqlLiteral(id)})));`);

test("acompanhamento0 respeita configuração real e não continua polling nem confirma entrega", async ({ page }) => {
  const f = await fixture(page, 0); let requests = 0;
  page.on("request", request => { if (new URL(request.url()).pathname === `/api/documents/${f.doc.id}/notifications`) requests++; });
  await page.goto(`/historico/${f.doc.id}`);
  await selectDocumentSection(page, "communications"); await expect(tracking(page)).toHaveAttribute("data-notice-tracking", "manual");
  await expect(tracking(page)).toContainText("Acompanhamento automático desativado");
  const count = requests, before = facts(f.doc.id); await page.clock.fastForward(30000);
  await expect(tracking(page)).toHaveAttribute("data-notice-tracking", "manual"); expect(requests).toBe(count); expect(facts(f.doc.id)).toBe(before);
});

test("prazo5 encerra só o acompanhamento e preserva PDF lento com bytes confirmados", async ({ page }) => {
  const f = await fixture(page, 5), endpoint = `/api/documents/${f.doc.id}/issuances`;
  let release!: () => void, entered!: () => void; const gate = new Promise<void>(resolve => { release = resolve; }), first = new Promise<void>(resolve => { entered = resolve; });
  let issuance: { id: string; sha256: string } | undefined; const failed: string[] = [];
  page.on("requestfailed", request => { if (new URL(request.url()).pathname === endpoint && request.method() === "POST") failed.push("issuance-aborted"); });
  await page.route("**" + endpoint, async route => {
    if (route.request().method() !== "POST") return route.continue();
    const response = await route.fetch(); expect(response.status()).toBe(200); issuance = await response.json(); entered(); await gate; return route.fulfill({ response });
  });
  try {
    await page.goto(`/historico/${f.doc.id}`);
  await selectDocumentSection(page, "communications"); await expect(tracking(page)).toHaveAttribute("data-notice-tracking", "pending");
    const before = facts(f.doc.id), files = page.getByRole("region", { name: "Arquivos gerados", exact: true });
    await selectDocumentSection(page, "files");
    await files.getByRole("button", { name: "Gerar PDF", exact: true }).click(); await first;
    await page.clock.fastForward(5000); await expect(tracking(page)).toHaveAttribute("data-notice-tracking", "elapsed");
    await expect(files.getByRole("button", { name: "Gerando PDF…", exact: true })).toBeDisabled(); expect(failed).toEqual([]);
    release(); await expect(files.getByRole("link", { name: "Baixar PDF", exact: true })).toHaveCount(1); expect(issuance).toBeTruthy();
    const response = await page.request.get(`/api/documents/${f.doc.id}/pdf?issuance=${issuance!.id}`); expect(response.status()).toBe(200);
    expect(createHash("sha256").update(await response.body()).digest("hex")).toBe(issuance!.sha256);
    expect(facts(f.doc.id)).toBe(before); await page.clock.fastForward(15000); await expect(tracking(page)).toHaveAttribute("data-notice-tracking", "elapsed");
  } finally { release(); }
});

test("resultado terminal antes do prazo10 não regride depois do deadline", async ({ page }) => {
  const f = await fixture(page, 10); await page.goto(`/historico/${f.doc.id}`);
  await selectDocumentSection(page, "communications"); await expect(tracking(page)).toHaveAttribute("data-notice-tracking", "pending");
  // Controlled local transport outcome, never a real provider acknowledgement.
  sql(`update public.requisition_notifications set state='sent' where document_id=${sqlLiteral(f.doc.id)};`);
  const before = facts(f.doc.id); await page.clock.fastForward(1800); await expect(tracking(page)).toHaveAttribute("data-notice-tracking", "settled");
  await page.clock.fastForward(20000); await expect(tracking(page)).toHaveAttribute("data-notice-tracking", "settled");
  await expect(tracking(page)).toContainText("Consulte os estados individuais"); expect(facts(f.doc.id)).toBe(before);
});
