import { expect, test, type Page } from "@playwright/test";
import { readFileSync, mkdirSync } from "node:fs";
import { setup, fixtures } from "../integration/v4-fixtures.mjs";
import { unavailableDelivery } from "../integration/delivery-regularization-fixtures.mjs";
import {
  fixtureFile,
  sql,
  sqlLiteral,
} from "../../scripts/test-environment.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";
import { audit } from "./accessibility-audit";
async function open(page: Page, patient: string) {
  const ids = JSON.parse(readFileSync(fixtureFile, "utf8"));
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(ids.adminA.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Visão geral", exact: true }),
  ).toBeVisible();
  await selectContext(page, patient);
  await page.goto(`/admin?section=memberships&careRecipientId=${patient}`);
  await expect(
    page.getByRole("heading", { name: "Pessoas e vínculos", exact: true }),
  ).toBeVisible();
}
const member = (patient: string, user: string) =>
  sql(
    `select to_jsonb(m) from public.care_recipient_memberships m where care_recipient_id=${sqlLiteral(patient)} and user_id=${sqlLiteral(user)};`,
  );
const person = (user: string) =>
  sql(`select full_name from public.profiles where id=${sqlLiteral(user)};`);

test("C030 editar função fixa a mesma pessoa e conserva o vínculo de outra conta", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const f = await setup(),
    other = member(f.patient, fixtures.reader.id);
  sql(
    `update public.care_recipient_memberships set can_count_stock=true where care_recipient_id=${sqlLiteral(f.patient)} and user_id=${sqlLiteral(fixtures.professional.id)};`,
  );
  await open(page, f.patient);
  await page
    .getByLabel("Editar vínculo de " + person(fixtures.professional.id), {
      exact: true,
    })
    .click();
  const editor = page.getByRole("dialog", {
    name: "Editar vínculo",
    exact: true,
  });
  await expect(editor).toBeVisible();
  expect(
    await editor
      .getByRole("combobox", { name: "Conta vinculada", exact: true })
      .count(),
  ).toBe(0);
  await expect(
    editor.getByText(person(fixtures.professional.id), { exact: true }),
  ).toBeVisible();
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await audit(page, "vinculo-mesma-pessoa-" + width);
  }
  await editor
    .getByRole("combobox", { name: "Função neste paciente", exact: true })
    .selectOption("supervisor");
  const response = page.waitForResponse(
    (r) =>
      new URL(r.url()).pathname === "/api/admin" &&
      r.request().method() === "POST" &&
      r.request().postDataJSON().action === "membership",
  );
  await editor
    .getByRole("button", { name: "Salvar vínculo", exact: true })
    .click();
  const saved = await response;
  expect(saved.ok(), await saved.text()).toBe(true);
  expect(saved.request().postDataJSON().administrativePreparation.fields.userId).toBe(fixtures.professional.id);
  await expect(editor).toHaveCount(0);
  expect(member(f.patient, fixtures.reader.id)).toBe(other);
  const changed = JSON.parse(member(f.patient, fixtures.professional.id));
  expect(changed.role).toBe("supervisor");
  expect(changed.can_count_stock).toBe(true);
  expect(changed.status).toBe("active");
  await page
    .getByRole("button", { name: "Vincular conta", exact: true })
    .click();
  await expect(
    page
      .getByRole("dialog", { name: "Vincular conta existente", exact: true })
      .getByRole("combobox", { name: "Conta vinculada", exact: true }),
  ).toBeEnabled();
});

test("desligamento mostra ENT parcial e preserva a revogação urgente quando a consulta de pendências falha", async ({
  page,
}, info) => {
  // Fixture, Auth, four axe/layout audits and final read-back share this budget.
  // Keep the runner's 15s action/expect limits; WebKit exceeded only the old total.
  test.setTimeout(60_000);
  const f = await unavailableDelivery({ revoke: false }),
    before = sql(
      `select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${sqlLiteral(f.patient)};`,
    );
  await open(page, f.patient);
  const row = page.getByRole("article").filter({
    has: page.getByText(person(fixtures.professional.id), { exact: true }),
  });
  await row.getByRole("button", { name: "Revogar", exact: true }).click();
  const dialog = page.getByRole("dialog", {
    name: "Revogar vínculo",
    exact: true,
  });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("heading", {
      name: "Pendências antes do desligamento",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    dialog.getByRole("link", { name: new RegExp(f.document.code) }),
  ).toBeVisible();
  await expect(dialog).toContainText("Aceite pessoal preservado: 2 unidade");
  await expect(dialog).toContainText("Em trânsito: 1 unidade");
  await page.route("**/api/admin/membership-impact?**", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        code: "NOT_CONFIGURED",
        error: "Consulta de pendências indisponível nesta tentativa",
      }),
    }),
  );
  await dialog
    .getByRole("button", { name: "Atualizar pendências", exact: true })
    .click();
  await expect(
    dialog.getByText("Consulta de pendências indisponível nesta tentativa", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Revogar agora", exact: true }),
  ).toBeEnabled();
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(
      dialog.getByRole("button", { name: "Atualizar pendências", exact: true }),
    ).toBeFocused();
    await audit(page, "desligamento-urgente-sem-consulta-" + width);
  }
  mkdirSync("output/playwright/phase-d", { recursive: true });
  await dialog.screenshot({
    path: `output/playwright/phase-d/membership-urgent-${f.patient}-${info.project.name}.png`,
  });
  const response = page.waitForResponse(
    (r) =>
      new URL(r.url()).pathname === "/api/admin" &&
      r.request().method() === "POST" &&
      r.request().postDataJSON().action === "membershipStatus",
  );
  await dialog
    .getByRole("button", { name: "Revogar agora", exact: true })
    .click();
  expect((await response).ok()).toBe(true);
  await expect(dialog).toHaveCount(0);
  expect(JSON.parse(member(f.patient, fixtures.professional.id)).status).toBe(
    "revoked",
  );
  expect(
    sql(
      `select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${sqlLiteral(f.patient)};`,
    ),
  ).toBe(before);
  const document = await page.request.get("/api/documents/" + f.document.id),
    data = (await document.json()).data;
  expect(data.workflow_data.acceptedBy).toBe(fixtures.professional.id);
  expect(Number(data.lines[0].accepted_quantity)).toBe(2);
  expect(data.deliveryRegularization.canPropose).toBe(true);
});
