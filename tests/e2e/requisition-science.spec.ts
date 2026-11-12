import { selectDocumentSection } from "./document-sections";
import { generatedPdf } from "./generated-pdf";
import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { actor, rpc, setup, issue, fixtures } from "../integration/v4-fixtures.mjs";
import { fixtureFile, sql, sqlLiteral } from "../../scripts/test-environment.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";
import { audit } from "./accessibility-audit";

async function login(page: Page, patient: string) {
  const fixture = JSON.parse(readFileSync(fixtureFile, "utf8"));
  await page.goto("/login"); await page.getByLabel("E-mail", { exact: true }).fill(fixture.family.email); await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click(); await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible(); await selectContext(page, patient);
}
async function prefer(client: Awaited<ReturnType<typeof actor>>, mode: string) {
  const current = await rpc(client, "my_requisition_science_preference");
  return rpc(client, "set_requisition_science_preference", { p_mode: mode, p_consent: mode !== "manual", p_version: current.version, p_key: randomUUID() });
}
const count = (id: string) => Number(sql(`select count(*) from public.requisition_science_events where requisition_id=${sqlLiteral(id)};`));
const openings = (id: string) => Number(sql(`select count(*) from public.requisition_openings where requisition_id=${sqlLiteral(id)};`));

test("falha nos dados da ficha bloqueia comandos e a retomada conserva o rascunho confirmado", async ({ page }) => {
  const f = await setup(), family = await actor("family", f.patient);
  const draft = await rpc(family, "create_supply_document", { p_patient: f.patient, p_type: "ENT", p_key: randomUUID(), p_draft: true, p_payload: { recipientReason: "Escolha manual fictícia para este recebimento",  source: "FAMILY", destination: "CARE_TEAM", recipientId: fixtures.professional.id, lines: [{ productId: f.products[0], quantity: "7" }] } });
  const before = sql(`select to_jsonb(d) from public.operational_documents d where id=${sqlLiteral(draft.id)};`);
  const ledger = sql(`select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${sqlLiteral(f.patient)};`);
  expect(JSON.parse(ledger)).toHaveLength(2);
  await login(page, f.patient);
  let failed = false;
  await page.route("**/api/catalog?**", async route => { if (!failed) { failed = true; await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ code: "NOT_CONFIGURED", error: "Falha fictícia ao carregar catálogo", retryable: true }) }); } else await route.continue(); });
  await page.goto("/fichas/ent?documentId=" + draft.id);
  await expect(page.getByText("Falha fictícia ao carregar catálogo", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Avançar", exact: true })).toHaveCount(0); await expect(page.getByRole("button", { name: "Salvar rascunho", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Recarregar dados", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Identificação", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Avançar", exact: true }).click(); await page.getByRole("button", { name: "Avançar", exact: true }).click();
  await expect(page.getByLabel("Quantidade — Material fictício V4 0", { exact: true })).toHaveValue("7");
  expect(sql(`select to_jsonb(d) from public.operational_documents d where id=${sqlLiteral(draft.id)};`)).toBe(before);
  expect(sql(`select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${sqlLiteral(f.patient)};`)).toBe(ledger);
});

test("P02 diálogo antecede conteúdo, voltar é inerte e SCI confirmada sobrevive à falha de abertura sem duplicar", async ({ page }, info) => {
  test.setTimeout(150_000);
  const f = await setup(), family = await actor("family", f.patient);
  await rpc(f.admin, "configure_patient_access", { p_patient: f.patient, p_kind: "settings", p_change: { scienceDialog: true }, p_key: randomUUID(), p_version: 1 });
  await prefer(family, "dialog");
  try {
    const req = await issue(f.patient, [f.products[0]]);
    let reads = 0, scienceAttempts = 0, openingAttempts = 0;
    const openingPayloads: unknown[] = [];
    await page.route(`**/api/requisitions/${req.id}/openings`, async route => {
      if (route.request().method() !== "POST") { await route.continue(); return; }
      openingAttempts++; openingPayloads.push(route.request().postDataJSON());
      if (openingAttempts === 1) { await route.fetch(); await route.abort("failed"); } else await route.continue();
    });
    await page.route("**/api/requisitions/" + req.id, async route => {
      reads++;
      if (reads === 1) await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ code: "NOT_CONFIGURED", error: "Falha fictícia ao consultar conteúdo", retryable: true }) });
      else await route.continue();
    });
    await page.route(`**/api/requisitions/${req.id}/science`, async route => {
      scienceAttempts++;
      if (scienceAttempts === 1) { await route.fetch(); await route.abort("failed"); }
      else await route.continue();
    });
    await login(page, f.patient); await page.goto("/historico/" + req.id);
    const dialog = page.getByRole("dialog", { name: "Ciência antes de abrir a requisição", exact: true });
    await expect(dialog).toBeVisible(); expect(reads).toBe(0); expect(count(req.id)).toBe(0); expect(openings(req.id)).toBe(0);
    await expect(page.getByText("Material fictício V4 0", { exact: false })).toHaveCount(0);
    await audit(page, "P02 minimal opening dialogue");
    await dialog.getByRole("button", { name: "Voltar", exact: true }).click();
    await expect(dialog).toHaveCount(0); expect(count(req.id)).toBe(0); expect(reads).toBe(0); expect(openings(req.id)).toBe(0);
    await page.getByRole("button", { name: "Abrir novamente", exact: true }).click(); await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Confirmar ciência e abrir", exact: true }).click();
    await expect(dialog.getByText("Não foi possível confirmar a resposta.", { exact: false })).toBeVisible();
    expect(count(req.id)).toBe(1); expect(reads).toBe(0); expect(openings(req.id)).toBe(0);
    await dialog.getByRole("button", { name: "Confirmar ciência e abrir", exact: true }).click();
    await expect(page.getByText("Falha fictícia ao consultar conteúdo", { exact: true })).toBeVisible();
    expect(count(req.id)).toBe(1); expect(reads).toBe(1); expect(openings(req.id)).toBe(0);
    await expect(page.getByText("Sua ciência foi registrada pela confirmação do diálogo.", { exact: false })).toBeVisible();
    await page.getByRole("button", { name: "Tentar carregar requisição", exact: true }).click();
    await selectDocumentSection(page, "materials");
    await expect(page.getByText("Material fictício V4 0", { exact: false }).first()).toBeVisible();
    await selectDocumentSection(page, "overview");
    await expect(page.getByText("Família ciente", { exact: true })).toBeVisible();
    await selectDocumentSection(page, "workflow");
    await expect(page.getByText("Minha ciência: registrada.", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Recuperar registro desta abertura", exact: true })).toBeVisible();
    expect(openings(req.id)).toBe(1);
    await page.getByRole("button", { name: "Recuperar registro desta abertura", exact: true }).click();
    await expect(page.getByRole("button", { name: "Recuperar registro desta abertura", exact: true })).toHaveCount(0);
    expect(openings(req.id)).toBe(1); expect(openingPayloads).toHaveLength(2); expect(openingPayloads[0]).toEqual(openingPayloads[1]);
    expect(count(req.id)).toBe(1); expect(scienceAttempts).toBe(2);
    const state = await rpc(family, "requisition_progress", { p_id: req.id }); expect(state.science[0].mode).toBe("dialog");
    for (const width of [1440, 768, 390, 320]) { await page.setViewportSize({ width, height: 900 }); await audit(page, "P02 family and personal SCI " + width); }
    mkdirSync("output/playwright/phase-d", { recursive: true }); await page.screenshot({ path: `output/playwright/phase-d/p02-science-${info.project.name}.png`, fullPage: true, animations: "disabled" });
    const pdf = await generatedPdf(page, `/api/documents/${req.id}/pdf`); expect(pdf.ok()).toBe(true);
    expect((await rpc(family, "requisition_progress", { p_id: req.id })).materialIdentity).toBe(state.materialIdentity);
    expect(count(req.id)).toBe(1);
    expect(openings(req.id), "PDF delivery must not fabricate another application opening").toBe(1);
    if (info.project.name === "chromium") { mkdirSync("output/pdf/phase-d", { recursive: true }); const path = `output/pdf/phase-d/p02-dialog-${req.id}.pdf`; writeFileSync(path, await pdf.body(), { flag: "wx" }); await info.attach("P02 dialogue PDF", { path, contentType: "application/pdf" }); }
    await page.reload(); await selectDocumentSection(page, "overview"); await expect(page.getByText("Família ciente", { exact: true })).toBeVisible();
    await expect.poll(() => openings(req.id)).toBe(1); expect(count(req.id)).toBe(1);
  } finally { await prefer(family, "manual"); }
});

test("P02 abertura exige conteúdo e sinal de primeiro plano; trilha pagina fatos sem criar ciência", async ({ page }, info) => {
  test.setTimeout(120_000);
  const f = await setup(), family = await actor("family", f.patient);
  await prefer(family, "manual");
  sql("insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(" + [sqlLiteral(f.patient),sqlLiteral(fixtures.family.id),sqlLiteral("document.access.read"),"true"].join(",") + ");");
  const req = await issue(f.patient, [f.products[0]]);
  // Controlled document-visibility signal tests the guard, not a physical device.
  await page.addInitScript(() => {
    const state = window as unknown as { hcaVisibilityFixture?: boolean };
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => state.hcaVisibilityFixture ? "visible" : "hidden" });
  });
  await login(page, f.patient);
  const technical = await page.request.get(`/api/requisitions/${req.id}`); expect(technical.ok()).toBe(true);
  const reference = (await technical.json()).data.progress;
  const before = sql(`select jsonb_build_object('document',(select to_jsonb(d) from public.operational_documents d where id=${sqlLiteral(req.id)}),'ledger',(select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${sqlLiteral(f.patient)}));`);
  await page.goto("/historico/" + req.id);
  await selectDocumentSection(page, "materials");
  await expect(page.getByText("Material fictício V4 0", { exact: false }).first()).toBeVisible();
  await selectDocumentSection(page, "history");
  const trail = page.locator("details").filter({ has: page.locator("summary", { hasText: "Aberturas informadas pelo aplicativo" }) });
  await trail.locator("summary").click(); await expect(trail.getByText("Nenhuma abertura informada neste histórico.", { exact: true })).toBeVisible();
  expect(openings(req.id)).toBe(0); expect(count(req.id)).toBe(0);
  await page.evaluate(() => { (window as unknown as { hcaVisibilityFixture: boolean }).hcaVisibilityFixture = true; document.dispatchEvent(new Event("visibilitychange")); });
  await expect.poll(() => openings(req.id)).toBe(1);
  await expect(trail.getByRole("listitem")).toHaveCount(1);
  await page.evaluate(() => { document.dispatchEvent(new Event("visibilitychange")); document.dispatchEvent(new Event("visibilitychange")); });
  await page.request.get(`/api/requisitions/${req.id}/opening`); expect(openings(req.id)).toBe(1);
  // Controlled historical records exercise pagination; current repeated displays coalesce.
  sql("insert into public.requisition_openings(requisition_id,care_recipient_id,user_id,actor_name,material_identity,reference_version,opening_key,recorded_at) select "+[sqlLiteral(req.id),sqlLiteral(f.patient),sqlLiteral(fixtures.family.id),"'Nome histórico fictício '||n",sqlLiteral(reference.materialIdentity),reference.version,"gen_random_uuid()","clock_timestamp()-interval '1 day'-n*interval '21 minutes'"].join(",")+" from generate_series(1,21) n;");
  await trail.getByRole("button", { name: "Atualizar aberturas", exact: true }).click(); await expect(trail.getByRole("listitem")).toHaveCount(20);
  await trail.getByRole("button", { name: "Carregar aberturas anteriores", exact: true }).click(); await expect(trail.getByRole("listitem")).toHaveCount(22);
  await expect(trail.getByRole("button", { name: "Carregar aberturas anteriores", exact: true })).toHaveCount(0);
  const listed = await page.request.get(`/api/requisitions/${req.id}/openings`), first = await listed.json(); expect(first.data).toHaveLength(20);
  const next = new URLSearchParams({ beforeAt: first.next.at, beforeId: first.next.id });
  const second = await (await page.request.get(`/api/requisitions/${req.id}/openings?${next}`)).json();
  expect(new Set([...first.data, ...second.data].map((row: { id: string }) => row.id)).size).toBe(22); expect(second.next).toBeNull();
  expect(count(req.id)).toBe(0);
  expect(sql(`select jsonb_build_object('document',(select to_jsonb(d) from public.operational_documents d where id=${sqlLiteral(req.id)}),'ledger',(select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${sqlLiteral(f.patient)}));`)).toBe(before);
  await page.setViewportSize({ width: 320, height: 900 }); await audit(page, "P02 opening trail 320");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  mkdirSync("output/playwright/phase-d", { recursive: true }); await page.screenshot({ path: `output/playwright/phase-d/p02-openings-${info.project.name}.png`, fullPage: true, animations: "disabled" });
  await trail.locator("summary").focus(); await expect(trail.locator("summary")).toBeFocused();
  await page.screenshot({ path: `output/playwright/phase-d/p02-openings-viewport-${info.project.name}.png`, animations: "disabled" });
});

test("P02 preferência pessoal tem revisão em leitura e recupera a mesma escolha após perda de resposta", async ({ page }) => {
  test.setTimeout(120_000);
  const f = await setup(), family = await actor("family", f.patient), before = await prefer(family, "manual");
  try {
    await login(page, f.patient); await page.goto("/perfil");
    await page.getByRole("button", { name: "Ciência das requisições", exact: true }).click();
    const mode = page.getByRole("combobox", { name: "Modalidade pessoal", exact: true }); await expect(mode).toHaveValue("manual"); await mode.selectOption("tacit");
    await page.getByRole("checkbox", { name: "Confirmo expressamente esta preferência pessoal.", exact: true }).check();
    await page.getByRole("button", { name: "Revisar preferência", exact: true }).click();
    const review = page.getByRole("dialog", { name: "Revisar preferência de ciência", exact: true }); await expect(review).toBeVisible();
    expect((await rpc(family, "my_requisition_science_preference")).version).toBe(before.version);
    await expect(review.getByRole("combobox")).toHaveCount(0); await audit(page, "P02 preference readonly confirmation");
    const payloads: unknown[] = [];
    await page.route("**/api/profile/science", async route => {
      if (route.request().method() !== "POST") { await route.continue(); return; }
      payloads.push(route.request().postDataJSON());
      if (payloads.length === 1) { await route.fetch(); await route.abort("failed"); } else await route.continue();
    });
    await review.getByRole("button", { name: "Confirmar preferência", exact: true }).click();
    await expect(review.getByRole("button", { name: "Recuperar esta preferência", exact: true })).toBeVisible();
    await review.getByRole("button", { name: "Recuperar esta preferência", exact: true }).click();
    await expect(review).toHaveCount(0); await expect(mode).toHaveValue("tacit");
    const after = await rpc(family, "my_requisition_science_preference"); expect(after.version).toBe(before.version + 1); expect(after.mode).toBe("tacit");
    expect(payloads).toHaveLength(2); expect(payloads[0]).toEqual(payloads[1]);
    await expect(page.getByText("Preferência salva.", { exact: false })).toBeVisible();
    await page.unroute("**/api/profile/science");
    await mode.selectOption("manual"); await page.getByRole("button", { name: "Revisar preferência", exact: true }).click(); await review.getByRole("button", { name: "Confirmar preferência", exact: true }).click();
    await expect(review).toHaveCount(0); expect((await rpc(family, "my_requisition_science_preference")).mode).toBe("manual");
  } finally { await prefer(family, "manual"); }
});
