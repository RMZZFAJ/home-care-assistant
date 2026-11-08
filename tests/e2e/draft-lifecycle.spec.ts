import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { privateDraftFixture, reqContent, savePacket, officialState, draftDevice, draftContext, fixtures, rpc } from "../integration/private-draft-fixtures.mjs";
import { setup } from "../integration/v4-fixtures.mjs";
import { balanceSetup } from "../integration/shift-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";

test.setTimeout(180_000);
const panel = (page: Page) => page.getByRole("region", { name: "Rascunho privado", exact: true });
async function login(page: Page, patient: string, role: "professional" | "family" = "professional", email = fixtures[role].email) {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible();
  await selectContext(page, patient);
}
async function open(page: Page) {
  await page.goto("/fichas/req");
  await expect(panel(page)).toBeVisible();
  await expect(panel(page).getByText("Consultando seu rascunho no servidor…", { exact: true })).toHaveCount(0);
}

test("REQ conserva tentativa real já confirmada em buffer local de mais de24h e outra aba não herda a cópia", async ({ page }) => {
  const f = await privateDraftFixture(), form = reqContent(f), key = randomUUID();
  await login(page, f.patient);
  const command = { ...form, careRecipientId: f.patient, idempotencyKey: key };
  const issued = await page.request.post("/api/requisitions", { data: command });
  expect(issued.ok()).toBe(true);
  const original = (await issued.json()).receipt;
  expect(original.requisitionId).toBeTruthy();
  const before = officialState(f), storageKey = `hca:v2:requisition:${fixtures.professional.id}:${f.patient}`;
  await page.evaluate(({ storageKey, form, command }) => {
    sessionStorage.setItem(storageKey, JSON.stringify({ savedAt: Date.now() - 26 * 60 * 60 * 1000, form, intent: command }));
  }, { storageKey, form, command });
  await open(page);
  const recover = page.getByRole("button", { name: "Recuperar esta tentativa", exact: true });
  await expect(recover).toBeEnabled();
  expect(await page.evaluate(key => JSON.parse(sessionStorage.getItem(key)!).intent.idempotencyKey, storageKey)).toBe(key);
  const second = await page.context().newPage();
  try {
    await open(second);
    expect(await second.evaluate(key => sessionStorage.getItem(key), storageKey)).toBeNull();
    await expect(second.getByRole("button", { name: "Recuperar esta tentativa", exact: true })).toHaveCount(0);
  } finally { await second.close(); }
  const replay = page.waitForResponse(r => new URL(r.url()).pathname === "/api/requisitions" && r.request().method() === "POST");
  await recover.click();
  const response = await replay;
  expect(response.request().postDataJSON()).toEqual(command);
  expect(response.ok()).toBe(true);
  expect((await response.json()).receipt).toEqual(original);
  await expect(page.getByText(original.protocol, { exact: false }).first()).toBeVisible();
  expect(await page.evaluate(key => sessionStorage.getItem(key), storageKey)).toBeNull();
  expect(officialState(f)).toBe(before);
});

test("REQ salva sem TTL retoma entre sessões sem misturar paciente ou outro titular e logout limpa só a cópia local", async ({ page, browser }) => {
  const f = await privateDraftFixture(), other = await setup(), content = reqContent(f);
  const note = "Titular original " + randomUUID(), familyNote = "Outro titular " + randomUUID();
  content.observations = [note];
  const packet = savePacket(f, "REQ", content);
  const saved = await rpc(f.pro, "creation_draft_command", { ...packet, p_body: { ...packet.p_body, navigation: { version: 1, stage: "notes" } } });
  const frozen = await draftContext(f);
  // Only this new private fictional row's metadata is aged. No event or official
  // clock changes; this is not an elapsed-day or physical-device claim.
  sql(`update private.creation_drafts set created_at=now()-interval '26 hours',saved_at=now()-interval '26 hours' where id=${sqlLiteral(saved.id)} and owner_id=${sqlLiteral(fixtures.professional.id)};`);
  expect(sql(`select created_at<now()-interval '25 hours' and saved_at<now()-interval '25 hours' from private.creation_drafts where id=${sqlLiteral(saved.id)};`)).toBe("t");
  sql(`insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${sqlLiteral(f.patient)},${sqlLiteral(fixtures.family.id)},'req.create',true);`);
  const family = await draftDevice(f.patient, "family"), familyContent = reqContent(f);
  familyContent.observations = [familyNote];
  const familySaved = await rpc(family, "creation_draft_command", savePacket(f, "REQ", familyContent));
  const before = officialState(f), otherBefore = officialState(other);
  await login(page, f.patient);
  await open(page);
  await expect(panel(page)).toContainText(note);
  await panel(page).getByRole("button", { name: "Continuar rascunho", exact: true }).click();
  await expect(page.getByLabel("Observação 1", { exact: true })).toHaveValue(note);
  await selectContext(page, other.patient);
  await open(page);
  await expect(panel(page)).not.toContainText(note);
  await expect(panel(page).getByRole("button", { name: "Continuar rascunho", exact: true })).toHaveCount(0);
  await selectContext(page, f.patient);
  await open(page);
  await expect(panel(page)).toContainText(note);
  await page.getByLabel("Menu do usuário", { exact: true }).click();
  await page.getByRole("menuitem", { name: "Sair", exact: true }).click();
  await expect(page.getByLabel("E-mail", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => Object.keys(sessionStorage).filter(key => key.startsWith("hca:")))).toEqual([]);
  await login(page, f.patient, "family");
  await open(page);
  await expect(panel(page)).toContainText(familyNote);
  await expect(panel(page)).not.toContainText(note);
  const familyRead = await page.request.get(`/api/drafts?careRecipientId=${f.patient}&kind=REQ`);
  expect((await familyRead.json()).data.id).toBe(familySaved.id);
  const fresh = await browser.newContext();
  try {
    const restored = await fresh.newPage();
    await login(restored, f.patient);
    await open(restored);
    await expect(panel(restored)).toContainText(note);
    await expect(panel(restored)).not.toContainText(familyNote);
    const read = await restored.request.get(`/api/drafts?careRecipientId=${f.patient}&kind=REQ`), row = (await read.json()).data;
    expect(row).toMatchObject({ id: saved.id, revision: saved.revision, content: { observations: [note] }, navigation: { version: 1, stage: "notes" } });
    expect(row.contentHash).toBe(frozen.contentHash);
    await panel(restored).getByRole("button", { name: "Continuar rascunho", exact: true }).click();
    await expect(restored.getByLabel("Observação 1", { exact: true })).toHaveValue(note);
  } finally { await fresh.close(); }
  expect(officialState(f)).toBe(before);
  expect(officialState(other)).toBe(otherBefore);
});

test("BAL agendada conserva envelope de mais de24h e recupera o mesmo documento após concluir a obrigação", async ({ page }) => {
  const f = await balanceSetup();
  await login(page, f.patient, "professional", f.pro.email);
  const balanceRead = await page.request.get(`/api/balances?careRecipientId=${f.patient}`), balance = (await balanceRead.json()).data;
  expect(balance.eligibility.available).toBe(true);
  const assignment = balance.eligibility.assignment;
  const command = { careRecipientId: f.patient, type: "BAL", idempotencyKey: randomUUID(), draft: false, payload: {
    lines: f.products.map((productId: string) => ({ productId, quantity: "1" })), notes: "Tentativa BAL preservada",
    balanceAssignment: { id: assignment.id, version: assignment.version, referenceRevision: balance.referenceRevision },
  } };
  const issued = await page.request.post("/api/documents", { data: command });
  expect(issued.ok()).toBe(true);
  const original = (await issued.json()).data;
  // balanceSetup uses the optional review policy: the real command applies
  // reconciliation immediately. The retry must preserve those actual moves.
  expect(original.status).toBe("approved");
  expect(Number(sql(`select count(*) from public.stock_movements where reference_type='bal' and reference_id=${sqlLiteral(original.id)};`))).toBeGreaterThan(0);
  const before = officialState(f), storageKey = `hca:v2:bal-count:${f.pro.id}:${f.patient}:new`;
  await page.evaluate(({ storageKey, command, assignmentId, referenceRevision }) => {
    sessionStorage.setItem(storageKey, JSON.stringify({ savedAt: Date.now() - 26 * 60 * 60 * 1000,
      assignmentId, referenceRevision, counts: Object.fromEntries(command.payload.lines.map(line => [line.productId, line.quantity])),
      notes: command.payload.notes, pending: { url: "/api/documents", body: command, draft: false },
    }));
  }, { storageKey, command, assignmentId: assignment.id, referenceRevision: balance.referenceRevision });
  await page.goto("/fichas/bal");
  const recover = page.getByRole("button", { name: "Recuperar a mesma tentativa", exact: true });
  await expect(recover).toBeEnabled();
  const replay = page.waitForResponse(r => new URL(r.url()).pathname === "/api/documents" && r.request().method() === "POST");
  await recover.click();
  const response = await replay;
  expect(response.request().postDataJSON()).toEqual(command);
  expect(response.ok()).toBe(true);
  expect((await response.json()).data).toMatchObject({ id: original.id, version: original.version });
  await expect(page.getByRole("link", { name: "Abrir ficha BAL", exact: true })).toHaveAttribute("href", `/documentos/${original.id}`);
  expect(await page.evaluate(key => sessionStorage.getItem(key), storageKey)).toBeNull();
  expect(officialState(f)).toBe(before);
});
