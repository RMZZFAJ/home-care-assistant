import { isDocumentAccessReport } from "./display-access-report";
import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { legacyBalance, receiveBalanceMaterials, balState } from "../integration/bal-review-fixtures.mjs";
import { fixtures } from "../integration/v4-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";
import { selectDocumentSection } from "./document-sections";
import { auditFromTop } from "./accessibility-audit";

test.setTimeout(120_000);
test.afterEach(async ({ page }) => page.unrouteAll({ behavior: "wait" }));
const panel = (page: Page) => page.getByRole("tabpanel");
const stock = (patient: string) => sql(`select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${q(patient)};`);
async function login(page: Page, patient: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(fixtures.family.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible();
  await selectContext(page, patient);
}

for (const policy of ["required", "optional"] as const) {
  test(`BAL follow-up ${policy}: reference, preserved effect, read failure and authorization`, async ({ page }, info) => {
    const f = await legacyBalance({ policy, quantity: policy === "optional" ? "1" : "0" });
    await login(page, f.patient);
    const writes: string[] = [];
    page.on("request", request => {
      if (new URL(request.url()).pathname.startsWith("/api/") && request.method() !== "GET" && !isDocumentAccessReport(request)) writes.push(request.url());
    });
    await page.goto(`/documentos/${f.document.id}`);
    const initial = policy === "required" ? "Acompanhar as revisões do balanço" : "Consultar a contagem conciliada";
    await expect(panel(page).getByText(initial, { exact: true })).toBeVisible();
    const before = balState(f.document.id);
    const next = panel(page).getByRole("button", { name: "Abrir Contagem e revisão", exact: true });
    await next.focus();
    await next.press("Enter");
    await expect(page.getByRole("tab", { name: "Materiais", exact: true })).toBeFocused();
    await expect(page.getByRole("heading", { name: "Contagem e revisão", exact: true })).toBeVisible();
    expect(balState(f.document.id)).toBe(before);

    await receiveBalanceMaterials(f);
    const preserved = balState(f.document.id), ledger = stock(f.patient);
    await selectDocumentSection(page, "overview");
    const latest = policy === "required" ? "Conferir a referência do balanço" : "Consultar a contagem conciliada";
    // Reload the real reference; subsequent movements cannot undo prior reconciliation.
    await page.getByRole("button", { name: "Atualizar ficha", exact: true }).click();
    await expect(panel(page).getByText(latest, { exact: true })).toBeVisible();
    const conclusion = page.getByRole("list", { name: "Marcos da ficha", exact: true }).getByRole("listitem").filter({ hasText: "Conclusão" });
    await expect(conclusion).toHaveAttribute("data-state", policy === "required" ? "unknown" : "done");
    await page.setViewportSize({ width: 320, height: 900 });
    await auditFromTop(page, `bal-follow-up-${policy}-320`);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    mkdirSync("output/playwright/phase-d", { recursive: true });
    await panel(page).locator(".hca-banner").filter({ hasText: latest }).screenshot({ path: `output/playwright/phase-d/balance-follow-up-${policy}-${info.project.name}.png` });

    const target = (url: URL) => url.pathname === `/api/documents/${f.document.id}`;
    let release!: () => void;
    const held = new Promise<void>(resolve => { release = resolve; });
    await page.route(target, async route => {
      await held;
      await route.fulfill({ status: 503, json: { code: "UNAVAILABLE", error: "Consulta de balanço temporariamente indisponível" } });
    });
    const failed = page.waitForResponse(response => target(new URL(response.url())) && response.status() === 503);
    try {
      await page.getByRole("button", { name: "Atualizar ficha", exact: true }).click();
      await expect(panel(page)).toContainText("Atualizando o acompanhamento da ficha");
      await expect(panel(page).getByRole("button", { name: "Abrir Contagem e revisão", exact: true })).toHaveCount(0);
    } finally { release(); }
    await failed;
    await expect(panel(page)).toContainText("O acompanhamento atual não foi confirmado");
    expect(balState(f.document.id)).toBe(preserved);
    expect(stock(f.patient)).toBe(ledger);
    await page.unroute(target);
    await page.getByRole("button", { name: "Atualizar ficha", exact: true }).click();
    await expect(panel(page).getByText(latest, { exact: true })).toBeVisible();

    const denied = page.waitForResponse(response => target(new URL(response.url())) && response.status() === 403);
    sql(`insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${q(f.patient)},${q(fixtures.family.id)},'bal.read',false);`);
    // A genuine Realtime invalidation may already remove the refresh button.
    // Observe before revoking and drive the read consumer's normal invalidation
    // signal; the HTTP request and its Auth/RLS denial remain real.
    await page.evaluate(() => window.dispatchEvent(new Event("hca:data-changed")));
    await denied;
    await expect(page.locator(".hca-document-header")).toHaveCount(0);
    await expect(page.getByText(latest, { exact: true })).toHaveCount(0);
    expect(balState(f.document.id)).toBe(preserved);
    expect(stock(f.patient)).toBe(ledger);
    expect(writes).toEqual([]);
  });
}
