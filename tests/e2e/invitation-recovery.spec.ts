import { expect, test, type Page } from "@playwright/test";
import { createHash, randomBytes } from "node:crypto";
import { fixtures, rpc, setup } from "../integration/v4-fixtures.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";

test.setTimeout(120_000);
test.afterEach(async ({ page }) => page.unrouteAll({ behavior: "wait" }));
async function invitation() {
  const f = await setup(), token = randomBytes(32).toString("base64url");
  const row = await rpc(f.admin, "admin_create_invitation", { p_care_recipient_id: f.patient, p_email: fixtures.adminB.email, p_role: "professional", p_can_manage_stock: false, p_can_count_stock: true, p_token_hash: createHash("sha256").update(token).digest("hex"), p_expires_at: new Date(Date.now() + 3600_000).toISOString() });
  return { ...f, token, invitation: row };
}
type Invitation = Awaited<ReturnType<typeof invitation>>;
const members = (f: Invitation) => Number(sql(`select count(*) from public.care_recipient_memberships where care_recipient_id=${q(f.patient)} and user_id=${q(fixtures.adminB.id)};`));
const facts = (f: Invitation) => sql(`select jsonb_build_object(
 'invitation',(select to_jsonb(i) from public.care_recipient_invitations i where id=${q(f.invitation.id)}),
 'membership',(select to_jsonb(m) from public.care_recipient_memberships m where care_recipient_id=${q(f.patient)} and user_id=${q(fixtures.adminB.id)}),
 'events',(select jsonb_agg(to_jsonb(a) order by id) from public.audit_events a where entity_id=${q(f.invitation.id)}),
 'stock',(select jsonb_agg(to_jsonb(s) order by id) from public.stock_movements s where care_recipient_id=${q(f.patient)}));`);
async function open(page: Page, token: string) {
  await page.goto("/convites/aceitar#token=" + token);
  await page.getByRole("link", { name: "Entrar com minha conta", exact: true }).click();
  await page.getByLabel("E-mail", { exact: true }).fill(fixtures.adminB.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("button", { name: "Aceitar convite com minha conta", exact: true })).toBeEnabled();
}

test("invitation rejects a changed actor and never announces success from a fake200; reload recovers the same choice", async ({ page }) => {
  const f = await invitation(); expect(members(f)).toBe(0); await open(page, f.token);
  const before = facts(f);
  const wrong = await page.request.post("/api/invitations/accept", { data: { token: f.token, decision: "accept", expectedActor: fixtures.adminA.id } });
  expect(wrong.status()).toBe(409); expect(facts(f)).toBe(before);
  const packets: unknown[] = []; let fake = true;
  await page.route("**/api/invitations/accept", route => {
    packets.push(route.request().postDataJSON());
    return fake ? route.fulfill({ status: 200, json: {} }) : route.continue();
  });
  await page.getByRole("button", { name: "Aceitar convite com minha conta", exact: true }).click();
  const recovery = page.getByRole("button", { name: "Recuperar decisão do convite", exact: true });
  await expect(recovery).toBeEnabled();
  await expect(page.getByText("Convite aceito.", { exact: false })).toHaveCount(0);
  expect(facts(f)).toBe(before);
  await page.reload(); await expect(recovery).toBeEnabled();
  await expect(page.getByRole("button", { name: "Recusar convite", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Consultar resultado sem reenviar", exact: true }).click();
  await expect(recovery).toBeEnabled(); expect(packets).toHaveLength(1); expect(facts(f)).toBe(before);
  fake = false; await recovery.click();
  await expect(page.getByText("Convite aceito.", { exact: false })).toBeVisible();
  expect(packets).toHaveLength(2); expect(packets[1]).toEqual(packets[0]); expect(members(f)).toBe(1);
  expect(await page.evaluate(() => Object.keys(sessionStorage).filter(key => key.startsWith("hca:invitation-decision:")))).toEqual([]);
});

test("invitation decline with a lost response is recovered by its terminal read after reload without repeatingPOST", async ({ page }) => {
  const f = await invitation(); await open(page, f.token);
  let posts = 0, committed = "";
  await page.route("**/api/invitations/accept", async route => {
    posts++; const response = await route.fetch(); expect(response.ok()).toBe(true);
    committed = facts(f); await route.abort("failed");
  });
  await page.getByRole("button", { name: "Recusar convite", exact: true }).click();
  await expect(page.getByRole("button", { name: "Recuperar decisão do convite", exact: true })).toBeEnabled();
  expect(posts).toBe(1); expect(members(f)).toBe(0);
  await page.reload();
  await expect(page.getByText("Convite recusado. Nenhum vínculo foi concedido.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Recuperar decisão do convite", exact: true })).toHaveCount(0);
  expect(posts).toBe(1); expect(facts(f)).toBe(committed); expect(members(f)).toBe(0);
});

test("a late invitation result cannot replace another link or erase its current reference", async ({ page }) => {
  const first = await invitation(), second = await invitation(); await open(page, first.token);
  let release!: () => void, entered!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  const sent = new Promise<void>(resolve => { entered = resolve; });
  await page.route("**/api/invitations/accept", async route => {
    const response = await route.fetch(); expect(response.ok()).toBe(true); entered();
    await held; await route.fulfill({ response });
  });
  try {
    await page.getByRole("button", { name: "Aceitar convite com minha conta", exact: true }).click(); await sent;
    await page.evaluate(token => { location.hash = "token=" + token; }, second.token);
    const summary = page.getByRole("region", { name: "Resumo do vínculo convidado", exact: true });
    await expect(summary).toContainText(sql(`select display_name from public.care_recipients where id=${q(second.patient)};`));
    release();
    await expect(page.getByRole("button", { name: "Aceitar convite com minha conta", exact: true })).toBeEnabled();
    await expect(page.getByText("Convite aceito.", { exact: false })).toHaveCount(0);
    expect(await page.evaluate(() => sessionStorage.getItem("hca:invitation"))).toBe(second.token);
    expect(members(first)).toBe(1); expect(members(second)).toBe(0);
  } finally { release(); }
});
