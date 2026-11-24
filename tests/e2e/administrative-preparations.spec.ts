import { expect, test, type Page } from "@playwright/test";
import { fixtures, rpc, setup } from "../integration/v4-fixtures.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { selectContext } from "./auth-context";
import { audit } from "./accessibility-audit";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { shiftWorker } from "../integration/shift-fixtures.mjs";
import { openMembershipDetails } from "./membership-panel";

async function login(page: Page, patient: string, email = fixtures.adminA.email) {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(email, { timeout: 30_000 });
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible();
  await selectContext(page, patient);
}

test("E10-06 revisa limite por custódia e recupera a resposta perdida sem rascunho", async ({ page }) => {
  test.setTimeout(160_000);
  const f = await setup(), product = f.products[0], account = await shiftWorker(f.patient, "admin");
  await login(page, f.patient, account.email);
  await page.goto(`/admin?careRecipientId=${f.patient}&section=alerts`);
  await expect(page.getByRole("heading", { name: "Regras e avisos", exact: true })).toBeVisible();
  const add = page.getByRole("button", { name: "Adicionar limite", exact: true });
  const dialog = page.getByRole("dialog", { name: "Limite de estoque", exact: true });
  const low = dialog.getByRole("textbox", { name: "Avisar estoque baixo a partir de", exact: true });
  const high = dialog.getByRole("textbox", { name: "Avisar estoque crítico a partir de", exact: true });
  const save = dialog.getByRole("button", { name: "Salvar limite", exact: true });
  await add.click();
  await dialog.getByRole("combobox", { name: "Material", exact: true }).selectOption(product);
  await dialog.getByRole("combobox", { name: "Estoque", exact: true }).selectOption("CARE_TEAM");
  await expect(low).toBeVisible();
  await low.fill("7"); await high.fill("2");
  await expect(dialog.getByRole("button", { name: /preenchimento privado/ })).toHaveCount(0);
  await rpc(f.admin, "configure_stock_alert", { p_care_recipient_id: f.patient, p_product_id: product,
    p_location: "CARE_TEAM", p_low_threshold: 4, p_critical_threshold: 1, p_is_enabled: true });
  await save.click();
  const rejected = page.getByRole("dialog", { name: "Não foi possível registrar a configuração", exact: true });
  await expect(rejected).toContainText("A configuração mudou durante a edição.");
  await rejected.getByRole("button", { name: "Voltar", exact: true }).click();
  await dialog.getByRole("button", { name: "Consultar configuração atual", exact: true }).click();
  await expect(low).toHaveValue(/^[4][,0]*$/);
  await low.fill("7"); await high.fill("2");
  let submissions = 0;
  await page.route("**/api/admin/residence-rules", async route => {
    if (route.request().method() !== "POST" || !route.request().postDataJSON().intent) return route.continue();
    submissions++;
    const response = await route.fetch();
    expect(response.ok(), await response.text()).toBe(true);
    await route.abort("failed");
  });
  await save.click();
  await expect(page.getByRole("dialog", { name: "A resposta da configuração não chegou", exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Conferir resultado", exact: true }).click();
  await page.getByRole("dialog", { name: "A resposta da configuração não chegou", exact: true })
    .getByRole("button", { name: "Conferir resultado", exact: true }).click();
  const confirmed = page.getByRole("dialog", { name: "Limite registrado", exact: true });
  await expect(confirmed).toContainText("O saldo foi preservado.");
  await confirmed.getByRole("button", { name: "Concluir", exact: true }).click();
  expect(submissions).toBe(1);
  expect(sql(`select low_threshold::text from public.stock_alert_rules where care_recipient_id=${q(f.patient)} and product_id=${q(product)};`)).toBe("7.000000");
  expect(sql(`select count(*) from public.audit_events where action='stock.alert.configured' and metadata->>'care_recipient_id'=${q(f.patient)};`)).toBe("2");
});

test("E10-06 cadastra destinatário pendente e descarta edição voluntária sem gravar", async ({ page, browser }, info) => {
  test.setTimeout(160_000);
  const f = await setup(), account = await shiftWorker(f.patient, "admin");
  await login(page, f.patient, account.email);
  await page.goto(`/admin?careRecipientId=${f.patient}&section=notificationRecipients`);
  const recipients = page.getByRole("region", { name: "Destinatários", exact: true });
  const add = recipients.getByRole("button", { name: "Adicionar", exact: true });
  const dialog = page.getByRole("dialog", { name: "Adicionar destinatário", exact: true });
  await add.click();
  await dialog.getByRole("combobox", { name: "Pessoa vinculada", exact: true }).selectOption(fixtures.professional.id);
  await dialog.getByRole("combobox", { name: "Canal", exact: true }).selectOption("email");
  await dialog.getByRole("textbox", { name: "Destino", exact: true }).fill("pendente@example.invalid");
  await dialog.getByRole("switch", { name: "Receber alertas da equipe", exact: true }).check();
  await dialog.getByRole("button", { name: "Salvar destinatário", exact: true }).click();
  const saved = page.getByRole("dialog", { name: "Destinatário registrado", exact: true });
  await expect(saved).toBeVisible();
  await saved.getByRole("button", { name: "Concluir", exact: true }).click();
  const row = recipients.getByRole("button", { name: /Teste professional.*Confirmar destino/ });
  await row.click();
  const editing = page.getByRole("dialog", { name: "Destinatário de avisos", exact: true });
  await expect(editing).toContainText("E-mail aguardando confirmação");
  expect(JSON.parse(sql(`select jsonb_build_object('recipient',recipient_user_id,'include',include_team_alerts,'channel',channel) from public.recipient_notification_settings where care_recipient_id=${q(f.patient)};`)))
    .toEqual({ recipient: fixtures.professional.id, include: true, channel: "email" });
  const reference = await browser.newContext();
  try {
    const lab = await reference.newPage();
    await lab.route(/^https?:/, route => route.abort());
    await lab.goto(pathToFileURL(resolve("hca-laboratorio-04-v2-aprovado.html")).href + "#E10-06/unverified");
    const frame = lab.locator("#device-frame");
    for (const width of [360, 412]) {
      await page.setViewportSize({ width, height: 900 });
      await lab.getByRole("combobox", { name: "Visualização", exact: true }).selectOption(String(width));
      await expect(frame.getByText("E-mail aguardando confirmação", { exact: true })).toBeVisible();
      await audit(page, "E10-06 destinatário " + width);
      await info.attach(`laboratório-destinatário-${width}`, { body: await frame.screenshot(), contentType: "image/png" });
      await info.attach(`produto-destinatário-${width}`, { body: await page.screenshot(), contentType: "image/png" });
    }
  } finally { await reference.close(); await page.bringToFront(); }
  await editing.getByRole("textbox", { name: "Destino", exact: true }).fill("alterado@example.invalid");
  await editing.getByRole("button", { name: "Voltar", exact: true }).click();
  await page.getByRole("dialog", { name: "Sair sem concluir?", exact: true }).getByRole("button", { name: "Sair e descartar", exact: true }).click();
  await expect(row).toBeFocused();
  await row.click();
  await expect(editing.getByRole("textbox", { name: "Destino", exact: true })).toHaveValue("pendente@example.invalid");
  expect((await page.request.get("/api/admin?section=profiles&profilePage=1")).status()).toBe(403);
});

test("own revocation with a lost response remains recoverable on the profile in the original authenticated session",async({page})=>{
  test.setTimeout(120_000);
  const f=await setup();
  await login(page,f.patient);
  await page.goto(`/admin?careRecipientId=${f.patient}&section=memberships`);
  const own = await openMembershipDetails(page, "Teste adminA");
  await own.getByRole("button", { name: /^Revisar desligamento/ }).click();
  await page.getByRole("dialog", { name: "Revisar desligamento", exact: true }).getByRole("button", { name: "Revogar vínculo", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Revogar vínculo?", exact: true });
  let sent=0;
  await page.route("**/api/admin/memberships",async route=>{
    if(route.request().method()!=="POST" || !route.request().postDataJSON().intent) return route.continue();
    sent++;
    const response=await route.fetch();
    expect(response.ok(),await response.text()).toBe(true);
    await route.abort("failed");
  });
  const dropped = page.waitForEvent("requestfailed", { predicate: request => request.url().endsWith("/api/admin/memberships") && request.method() === "POST" });
  await dialog.getByRole("button",{name:"Revogar agora",exact:true}).click();
  await dropped;
  await page.goto("/perfil");
  await page.getByRole("button", { name: "Conferir resultado", exact: true }).click();
  await page.getByRole("dialog", { name: "Não foi possível confirmar o vínculo", exact: true }).getByRole("button", { name: "Conferir resultado", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Vínculo revogado", exact: true })).toBeVisible();
  expect(sent).toBe(1);
  expect(sql(`select status from public.care_recipient_memberships where care_recipient_id=${q(f.patient)} and user_id=${q(fixtures.adminA.id)};`)).toBe("revoked");
});
