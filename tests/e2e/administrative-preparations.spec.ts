import { expect, test, type Page } from "@playwright/test";
import { fixtures, rpc, setup } from "../integration/v4-fixtures.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { selectContext } from "./auth-context";
import { auditFromTop } from "./accessibility-audit";

async function login(page: Page, patient: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(fixtures.adminA.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible();
  await selectContext(page, patient);
}

test("alert preparation resumes partial fields, compares a changed rule and recovers one native confirmation from the profile", async ({ page }) => {
  test.setTimeout(120_000);
  const f = await setup(), productId = f.products[0];
  await login(page,f.patient);
  await page.goto(`/admin?careRecipientId=${f.patient}&section=alerts`);
  await page.getByRole("combobox",{name:"Item do catálogo",exact:true}).selectOption(productId);
  await page.getByLabel("Limite baixo",{exact:true}).fill("7");
  await page.getByLabel("Limite crítico",{exact:true}).fill("");
  await page.getByRole("button",{name:"Salvar preenchimento privado",exact:true}).click();
  await expect(page.getByText(/Preenchimento privado salvo/)).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Limite crítico",{exact:true})).toHaveValue("");
  await expect(page.getByLabel("Limite baixo",{exact:true})).toHaveValue("7");
  await expect(page.getByRole("button",{name:"Salvar regra",exact:true})).toBeEnabled();
  await rpc(f.admin,"configure_stock_alert",{p_care_recipient_id:f.patient,p_product_id:productId,p_location:"CARE_TEAM",p_low_threshold:4,p_critical_threshold:1,p_is_enabled:true});
  await page.getByLabel("Limite crítico",{exact:true}).fill("2");
  await page.getByRole("checkbox",{name:"Regra habilitada",exact:true}).check();
  await page.getByRole("button",{name:"Salvar regra",exact:true}).click();
  await page.getByRole("button",{name:"Adotar referência atual e manter meus campos",exact:true}).click();
  await expect(page.getByLabel("Limite baixo",{exact:true})).toHaveValue("7");
  let sent=0;
  await page.route("**/api/admin",async route=>{
    if(route.request().method()!=="POST" || route.request().postDataJSON().action!=="alertRule") return route.continue();
    sent++;
    const response=await route.fetch();
    expect(response.ok(),await response.text()).toBe(true);
    await route.abort("failed");
  });
  await page.getByRole("button",{name:"Salvar regra",exact:true}).click();
  await page.getByRole("link",{name:"Abrir recuperação no meu perfil",exact:true}).click();
  const recovery=page.getByRole("region",{name:"Recuperar alterações administrativas",exact:true});
  await recovery.getByRole("button",{name:"Consultar confirmação administrativa",exact:true}).click();
  await expect(recovery.getByText("Alteração salva e auditada.",{exact:true})).toBeVisible();
  expect(sent).toBe(1);
  expect(sql(`select low_threshold::text from public.stock_alert_rules where care_recipient_id=${q(f.patient)} and product_id=${q(productId)};`)).toBe("7.000000");
  expect(sql(`select count(*) from public.audit_events where action='stock.alert.configured' and metadata->>'care_recipient_id'=${q(f.patient)};`)).toBe("2");
});

test("recipient draft keeps account, channel and family opt-in through reload and exact native save",async({page})=>{
  test.setTimeout(120_000);
  const f=await setup();
  await login(page,f.patient);
  await page.goto(`/admin?careRecipientId=${f.patient}&section=notificationRecipients`);
  await page.getByRole("combobox",{name:"Conta destinatária",exact:true}).selectOption(fixtures.professional.id);
  await page.getByRole("combobox",{name:"Grupo",exact:true}).selectOption("family");
  await page.getByRole("checkbox",{name:"Família: receber também alertas da equipe",exact:true}).check();
  await page.getByRole("button",{name:"Salvar preenchimento privado",exact:true}).click();
  await expect(page.getByText(/Preenchimento privado salvo/)).toBeVisible();
  await page.reload();
  await expect(page.getByRole("combobox",{name:"Conta destinatária",exact:true})).toHaveValue(fixtures.professional.id);
  await expect(page.getByRole("checkbox",{name:"Família: receber também alertas da equipe",exact:true})).toBeChecked();
  for (const width of [320,390,768,1150,1440]) {
    await page.setViewportSize({width,height:900});
    await auditFromTop(page,"administrative-recipient-"+width);
  }
  await page.getByRole("button",{name:"Salvar destinatário",exact:true}).click();
  await expect(page.getByRole("status").filter({hasText:"Destinatário de notificações salvo."})).toBeVisible();
  expect(JSON.parse(sql(`select jsonb_build_object('recipient',recipient_user_id,'include',include_team_alerts,'channel',channel) from public.recipient_notification_settings where care_recipient_id=${q(f.patient)};`)))
    .toEqual({recipient:fixtures.professional.id,include:true,channel:"internal"});
  await page.getByRole("button",{name:"Iniciar outro preenchimento",exact:true}).click();
  await expect(page.getByRole("combobox",{name:"Conta destinatária",exact:true})).toHaveValue("");
  await page.getByRole("combobox",{name:"Conta destinatária",exact:true}).selectOption(fixtures.professional.id);
  await page.getByRole("button",{name:"Salvar destinatário",exact:true}).click();
  await expect(page.getByRole("button",{name:"Iniciar outro preenchimento",exact:true})).toBeVisible();
  expect(sql(`select include_team_alerts from public.recipient_notification_settings where care_recipient_id=${q(f.patient)};`)).toBe("f");
  expect((await page.request.get("/api/admin?section=profiles&profilePage=1")).status()).toBe(403);
});

test("own revocation with a lost response remains recoverable on the profile in the original authenticated session",async({page})=>{
  test.setTimeout(120_000);
  const f=await setup();
  await login(page,f.patient);
  await page.goto(`/admin?careRecipientId=${f.patient}&section=memberships`);
  const own=page.getByRole("article").filter({has:page.getByText("Teste adminA",{exact:true})});
  await own.getByRole("button",{name:"Revogar",exact:true}).click();
  const dialog=page.getByRole("dialog",{name:"Revogar vínculo",exact:true});
  let sent=0;
  await page.route("**/api/admin",async route=>{
    if(route.request().method()!=="POST" || route.request().postDataJSON().action!=="membershipStatus") return route.continue();
    sent++;
    const response=await route.fetch();
    expect(response.ok(),await response.text()).toBe(true);
    await route.abort("failed");
  });
  await dialog.getByRole("button",{name:"Revogar agora",exact:true}).click();
  await page.goto("/perfil");
  const recovery=page.getByRole("region",{name:"Recuperar alterações administrativas",exact:true});
  await recovery.getByRole("button",{name:"Consultar confirmação administrativa",exact:true}).click();
  await expect(recovery.getByText("Estado do vínculo atualizado.",{exact:true})).toBeVisible();
  expect(sent).toBe(1);
  expect(sql(`select status from public.care_recipient_memberships where care_recipient_id=${q(f.patient)} and user_id=${q(fixtures.adminA.id)};`)).toBe("revoked");
});
