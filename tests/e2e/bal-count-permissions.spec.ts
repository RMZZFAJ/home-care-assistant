import { expect, test } from "@playwright/test";
import { countPermissionFixture, countPermissionWorkspace, publishReplacementShift } from "../integration/bal-count-permission-fixture.mjs";
import { fixtures } from "../integration/v4-fixtures.mjs";
import { audit } from "./accessibility-audit";
import { confirmedOutcome, loginDecision, noPrivateWrites } from "./l1-decision-policy";

test.setTimeout(150_000);

test("outro profissional pede autorização e assume a contagem após decisão da administração", async ({ page, browser }) => {
  const f = await countPermissionFixture();
  await publishReplacementShift(f);
  const { assignment } = (await countPermissionWorkspace(f.admin, f.patient)).eligibility;
  const reason = "Posso assumir a contagem deste plantão.";
  await loginDecision(page, f.substitute.email, f.patient);
  await page.goto("/balancos");
  const writes = noPrivateWrites(page);
  await expect(page.getByRole("link", { name: "Fazer balanço", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Pedir autorização", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Pedir autorização para contar", exact: true });
  await dialog.getByRole("textbox", { name: "Por que você precisa fazer este balanço?", exact: true }).fill(reason);
  await page.setViewportSize({ width: 360, height: 880 });
  await audit(page, "pedido de autorização para contar o BAL");
  await confirmedOutcome(page, assignment.id, "Enviar pedido", `/api/balances/decisions/${assignment.id}?careRecipientId=${f.patient}`);
  await expect(page.getByRole("dialog", { name: "Autorização solicitada", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Voltar aos balanços", exact: true }).click();
  await expect(page.getByRole("region", { name: "Autorizações de contagem" })).toContainText("Aguardando autorização");
  await expect(page.getByRole("link", { name: "Fazer balanço", exact: true })).toHaveCount(0);

  const adminContext = await browser.newContext({ baseURL: new URL(page.url()).origin, viewport: { width: 360, height: 880 } });
  try {
    const admin = await adminContext.newPage();
    await loginDecision(admin, fixtures.adminA.email, f.patient);
    await admin.goto("/balancos");
    const requests = admin.getByRole("region", { name: "Autorizações de contagem" });
    await requests.getByRole("button", { name: "Decidir pedido", exact: true }).click();
    const confirmation = admin.getByRole("dialog", { name: "Autorizar este profissional?", exact: true });
    await expect(confirmation).toContainText(reason);
    await expect(confirmation).toContainText(f.substituteName);
    await confirmation.getByRole("textbox", { name: "Observação da decisão", exact: true }).fill("Contagem autorizada para este plantão.");
    await audit(admin, "decisão sobre autorização para contar o BAL");
    await confirmation.getByRole("button", { name: "Autorizar", exact: true }).click();
    await expect(admin.getByRole("dialog", { name: "Profissional autorizado", exact: true })).toBeVisible();
  } finally { await adminContext.close(); }
  await page.reload();
  await expect(page.getByRole("region", { name: "Autorizações de contagem" })).toContainText("Profissional autorizado");
  await page.getByRole("link", { name: "Fazer balanço", exact: true }).click();
  await expect(page.getByRole("button", { name: "Iniciar contagem", exact: true })).toBeVisible();
  expect(writes).toEqual([]);
});
