import { selectDocumentSection } from "./document-sections";
import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { remainingNeedFixture, physicalState, fixtures, rpc } from "../integration/remaining-need-fixtures.mjs";
import { setup } from "../integration/v4-fixtures.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";
import { audit } from "./accessibility-audit";

test.setTimeout(150_000);
async function login(page: Page, patient: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(fixtures.professional.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible();
  await selectContext(page, patient);
}

test("relação REQ para ENT abre fatos de expedição em leitura, recupera consulta e recusa outro paciente", async ({ page }, info) => {
  const f = await remainingNeedFixture(), other = await setup();
  const foreign = await rpc(other.admin, "create_supply_document", { p_patient: other.patient, p_type: "ENT", p_key: randomUUID(), p_draft: false, p_payload: { source: "FAMILY", destination: "CARE_TEAM", recipientId: fixtures.professional.id, recipientReason: "Recebedor de outro paciente fictício", lines: [{ productId: other.products[0], quantity: "1" }] } });
  await login(page, f.patient);
  // Opening the source REQ records its own post-render event. Finish that
  // authorized action before measuring whether the related ENT is read-only.
  const sourceOpening = page.waitForResponse(response => new URL(response.url()).pathname === `/api/requisitions/${f.source.id}/openings` && response.request().method() === "POST");
  await page.goto(`/historico/${f.source.id}`);
  await selectDocumentSection(page, "materials");
  expect((await sourceOpening).status()).toBe(200);
  await expect(page.locator(".hca-document-milestones > li").filter({has:page.getByText("Atendimento",{exact:true})}).locator(".hca-milestone-track > span")).toHaveAttribute("style", "width: 50%;");
  const open = page.getByRole("button", { name: f.ent.code, exact: true });
  await expect(open).toBeVisible();
  await expect(page.getByRole("cell").filter({ has: open })).toContainText("Quantidade aceita para este item: 2 unidade");
  const response = await page.request.get(`/api/documents/${f.ent.id}`); expect(response.status()).toBe(200);
  const body = await response.json();
  await info.attach("related-read-shape", { body: JSON.stringify({ type: body.data.type, lineTypes: Object.fromEntries(Object.entries(body.data.lines[0]).map(([name, value]) => [name, Array.isArray(value) ? "array" : value === null ? "null" : typeof value])) }), contentType: "application/json" });
  const before = physicalState(f);
  const openingHistory = async () => {
    const response = await page.request.get(`/api/requisitions/${f.source.id}/openings`);
    expect(response.status()).toBe(200); return response.json();
  };
  const beforeOpenings = await openingHistory();
  let writes = 0;
  page.on("request", request => { if (/^\/api\/(documents|requisitions|stock|balances)/.test(new URL(request.url()).pathname) && request.method() !== "GET") writes++; });
  await open.click(); const dialog = page.getByRole("dialog").filter({ visible: true }); await expect(dialog).toHaveCount(1);
  await expect(dialog.getByText("Expedido", { exact: true })).toBeVisible();
  await expect(dialog).toContainText("10 un"); await expect(dialog.getByText("Aceito", { exact: true })).toBeVisible();
  await expect(dialog.locator("input,textarea,select,[aria-invalid]")).toHaveCount(0);
  await expect(dialog.getByText("Expedido/proposto", { exact: false })).toHaveCount(0);
  await dialog.getByRole("button", { name: "Fechar diálogo", exact: true }).click(); await expect(open).toBeFocused();
  const url = `**/api/documents/${f.ent.id}`;
  await page.route(url, route => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "Consulta fictícia da relação indisponível", code: "READ_UNAVAILABLE" }) }), { times: 1 });
  await open.click(); await expect(dialog.getByRole("alert")).toContainText("Consulta fictícia da relação indisponível");
  const refresh = dialog.getByRole("button", { name: "Atualizar consulta", exact: true });
  await refresh.focus(); await refresh.press("Enter"); await expect(dialog.getByText("Expedido", { exact: true })).toBeVisible(); await expect(refresh).toBeFocused();
  await page.route(url, route => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { ...body.data, type: "BAL" } }) }), { times: 1 });
  await refresh.press("Enter"); await expect(dialog.getByRole("alert")).toContainText("A ficha consultada não corresponde à referência");
  await expect(dialog.locator("article,input,textarea,select,[aria-invalid]")).toHaveCount(0);
  await refresh.press("Enter"); await expect(dialog.getByText("Expedido", { exact: true })).toBeVisible();
  const denied = await page.request.get(`/api/documents/${foreign.id}`); expect(denied.status()).toBe(403); expect(await denied.text()).not.toContain(foreign.code);
  expect(physicalState(f)).toBe(before); expect(writes).toBe(0);
  expect(await openingHistory()).toEqual(beforeOpenings);
  for (const width of [320, 390, 768, 1440]) { await page.setViewportSize({ width, height: 900 }); await audit(page, "related delivery read " + width); }
});
