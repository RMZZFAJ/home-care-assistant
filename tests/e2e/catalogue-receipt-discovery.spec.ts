import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { actor, fixtures, rpc, setup } from "../integration/v4-fixtures.mjs";
import { catalogueAttemptStorageKey } from "../../src/lib/client/catalogue-attempt-storage";
import type { CatalogueAttempt } from "../../src/lib/validation/catalogue-preparation";
import { selectContext } from "./auth-context";
import { auditFromTop } from "./accessibility-audit";

async function login(page: Page, patient: string | null, role: "adminA" | "global" = "adminA") {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(fixtures[role].email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible();
  await selectContext(page, patient);
}

async function priorCatalogueReceipt(client: Awaited<ReturnType<typeof actor>>, patient: string, name: string, mode: "patient" | "global") {
  const scope = { p_patient: patient, p_mode: mode, p_purpose: "create", p_target: null };
  const { reference } = await rpc(client, "catalogue_preparation_read", scope);
  const attempt: CatalogueAttempt = {
    patientId: patient, mode, purpose: "create", targetId: null, action: "commit", id: null, revision: 0,
    key: randomUUID(), referenceHash: reference.hash,
    fields: { name, unit: "unidade", category: "higiene", description: "", aliases: "", sortOrder: "0", isActive: true },
  };
  await rpc(client, "catalogue_preparation_command", {
    ...scope, p_action: attempt.action, p_key: attempt.key, p_id: attempt.id, p_revision: attempt.revision,
    p_fields: attempt.fields, p_reference_hash: attempt.referenceHash,
  });
  return attempt;
}

test("prior catalogue receipt remains discoverable after losing write access and opening another session", async ({ page, browser }) => {
  test.setTimeout(180_000);
  const f = await setup();
  const item = "Material confirmado " + randomUUID().slice(0, 8);
  const count = () => sql(`select count(*) from public.care_recipient_products where care_recipient_id=${q(f.patient)} and name=${q(item)};`);
  const attempt = await priorCatalogueReceipt(f.admin, f.patient, item, "patient");
  await login(page, f.patient);
  await page.goto(`/admin?careRecipientId=${f.patient}&section=catalog`);
  await page.evaluate(({ key, value }) => sessionStorage.setItem(key, JSON.stringify(value)),
    { key: catalogueAttemptStorageKey(fixtures.adminA.id, attempt), value: attempt });
  expect(count()).toBe("1");
  sql(`insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${q(f.patient)},${q(fixtures.adminA.id)},'catalog.manage',false);`);

  await page.goto("/mais");
  const actions = page.getByRole("navigation", { name: "Rotina e funções autorizadas" });
  await expect(actions.getByRole("link", { name: /^Unidades e apresentações/ })).toHaveCount(0);
  await actions.getByRole("link", { name: /^Comprovantes do catálogo/ }).click();
  const confirmed = page.getByRole("region", { name: "Comprovantes confirmados", exact: true });
  await expect(confirmed.getByText(item, { exact: true })).toBeVisible();
  const pending = page.getByRole("region", { name: "Tentativas aguardando confirmação" });
  const consult = pending.getByRole("button", { name: /^Consultar tentativa de Novo item/ });
  await page.route("**/api/admin/catalogue-preparations?**", async route => {
    const key = new URL(route.request().url()).searchParams.get("key");
    if (!key) return route.continue();
    const response = await route.fetch();
    const { receipt } = await response.json();
    await route.fulfill({ response, json: { receipt: { ...receipt, key: randomUUID() } } });
  });
  await consult.click();
  await expect(pending.getByText("O comprovante recebido não corresponde a esta tentativa.")).toBeVisible();
  await page.unroute("**/api/admin/catalogue-preparations?**");
  await consult.click();
  await expect(pending).toHaveCount(0);
  await expect(confirmed.getByText(item, { exact: true })).toBeVisible();

  const freshContext = await browser.newContext();
  try {
    const freshPage = await freshContext.newPage();
    await login(freshPage, f.patient);
    await freshPage.goto("/comprovantes-catalogo");
    await expect(freshPage.getByRole("region", { name: "Comprovantes confirmados", exact: true })
      .getByText(item, { exact: true })).toBeVisible();
    await expect(freshPage.getByRole("region", { name: "Tentativas aguardando confirmação" })).toHaveCount(0);
    const response = await freshPage.request.get(`/api/admin/catalogue-preparations/receipts?mode=patient&patientId=${f.patient}`);
    expect(response.headers()["cache-control"]).toContain("no-store");
    expect((await response.json()).entries).toHaveLength(1);
  } finally {
    await freshContext.close();
  }
  expect(count()).toBe("1");
  if (test.info().project.name === "chromium") {
    for (const width of [320, 390, 768, 1150, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await auditFromTop(page, "catalogue-receipts-" + width);
    }
  }
});

test("prior global catalogue proposal is found in its patient history, separately from global units", async ({ page }) => {
  test.setTimeout(120_000);
  const f = await setup();
  await login(page, null, "global");
  await page.goto(`/admin?careRecipientId=${f.patient}&section=catalog`);
  await priorCatalogueReceipt(await actor("global"), f.patient, "Proposta fictícia para histórico", "global");
  await page.getByRole("link", { name: "Comprovantes do catálogo", exact: true })
    .filter({ hasNot: page.locator("nav") }).and(page.locator('a[href*="paciente="]')).click();
  const confirmed = page.getByRole("region", { name: "Comprovantes confirmados", exact: true });
  await expect(confirmed.getByText("Proposta registrada para aprovação local.", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Comprovantes de unidades globais", exact: true }).click();
  await expect(confirmed.getByText(/Unidades globais/).first()).toBeVisible();
  await expect(confirmed.getByText("Proposta registrada para aprovação local.", { exact: true })).toHaveCount(0);
});
