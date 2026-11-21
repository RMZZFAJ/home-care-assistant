import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { reqContent, balContent, savePacket, officialState } from "../integration/private-draft-fixtures.mjs";
import { setup, fixtures, rpc } from "../integration/v4-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { shiftWorker } from "../integration/shift-fixtures.mjs";
import { loginDecision } from "./l1-decision-policy";
import { audit } from "./accessibility-audit";

test.setTimeout(150_000);
let fixture: Awaited<ReturnType<typeof setup>>;
test.beforeAll(async () => { fixture = await setup(); });

for (const kind of ["REQ", "COM"] as const) test(`${kind}: uma cópia local antiga pede confirmação antes de entrar no formulário`, async ({ page }) => {
  const f = fixture;
  const user = await shiftWorker(f.patient, kind === "REQ" ? "professional" : "family");
  const key = kind === "REQ" ? `hca:v2:requisition:${user.id}:${f.patient}` : `hca:v2:draft:COM:${user.id}:${f.patient}:new:standalone:edit`;
  const form = kind === "REQ" ? reqContent(f) : {
    quantities: { [f.products[0]]: "3" }, notes: "", origin: "", source: "FAMILY", recipientId: "",
  };
  await loginDecision(page, user.email, f.patient);
  await page.evaluate(({ key, form }) => sessionStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), form })), { key, form });
  const url = `/fichas/${kind.toLowerCase()}?careRecipientId=${f.patient}`;
  await page.goto(url);
  const choice = page.getByRole("dialog", { name: "Continuar seu rascunho?", exact: true });
  await expect(choice).toContainText("Material fictício V4 0");
  await expect(choice).toContainText("Etapa não registrada");
  await choice.getByRole("button", { name: "Continuar rascunho", exact: true }).click();
  await expect(choice).toHaveCount(0);
  await expect(page.getByText("Último rascunho salvo.", { exact: true })).toBeVisible();
  expect(await page.evaluate(key => sessionStorage.getItem(key), key)).toBeNull();
  await page.reload();
  await expect(choice).toContainText("Material fictício V4 0");
  await expect(choice).not.toContainText("Etapa não registrada");
  await choice.getByRole("button", { name: "Descartar e começar novamente", exact: true }).click();
  await expect(choice).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Selecionar materiais", exact: true })).toBeEnabled();
  expect(await page.evaluate(key => sessionStorage.getItem(key), key)).toBeNull();
});

for (const kind of ["REQ", "COM", "ENT", "BAL"] as const) test(`${kind}: somente o último rascunho guarda campos parciais sem bloquear digitação; retomada oferece continuar ou descartar`, async ({ page }) => {
  const f = fixture, professional = kind === "REQ" || kind === "BAL";
  // A fresh real Auth identity keeps this draft test independent of the retained
  // fixture accounts' patient chooser and of unrelated prior test memberships.
  const user = await shiftWorker(f.patient, professional ? "professional" : "family"), client = user.client;
  if (kind === "REQ") {
    const p = savePacket(f, kind, reqContent(f));
    await rpc(client, "creation_draft_command", { ...p, p_body: { ...p.p_body, navigation: { version: 1, stage: "notes" } } });
  } else if (kind === "BAL") {
    const c = balContent(f); c.context.referenceRevision = (await rpc(client, "balance_count_reference", { p_patient: f.patient })).revision;
    const p = savePacket(f, kind, c);
    await rpc(client, "creation_draft_command", { ...p, p_body: { ...p.p_body, navigation: { version: 1, stage: "higiene" } } });
  } else await rpc(client, "supply_draft_command", {
    p_patient: f.patient, p_kind: kind, p_purpose: "create", p_target: null, p_id: null, p_expected: null, p_key: randomUUID(),
    p_body: { action: "save", navigation: { version: 1, stage: "higiene" }, content: {
      form: { quantities: { [f.products[0]]: "1," }, notes: "Último preenchimento longo", origin: kind === "COM" ? "donation" : "", source: "FAMILY", recipientId: kind === "ENT" ? fixtures.professional.id : "", recipientReason: "Pessoa indicada para entrega fictícia." },
      links: {}, materials: f.products.map((id: string, i: number) => ({ id, name: `Material fictício V4 ${i}`, unit: "unidade", quantityDecimals: 0 })),
      context: { documentId: null, documentVersion: null, requisitionId: null, recipientName: kind === "ENT" ? "Teste professional" : "" },
    } },
  });
  const before = officialState(f), url = `/fichas/${kind.toLowerCase()}?careRecipientId=${f.patient}`;
  await loginDecision(page, user.email, f.patient); await page.goto(url);
  const choice = page.getByRole("dialog", { name: "Continuar seu rascunho?", exact: true });
  await expect(choice).toBeVisible(); await choice.getByRole("button", { name: "Continuar rascunho", exact: true }).click();
  const input = kind === "REQ" ? page.getByLabel("Observação 1", { exact: true }) : page.getByLabel("Quantidade — Material fictício V4 0", { exact: true });
  const value = kind === "REQ" ? "Último texto salvo discretamente, sem emitir ficha." : "3,";
  await expect(input).toBeEnabled(); await input.fill(value);
  const content = () => JSON.parse(sql(`select content from private.creation_drafts where owner_id=${q(user.id)} and care_recipient_id=${q(f.patient)} and kind=${q(kind)} and state='active'`));
  await expect.poll(() => kind === "REQ" ? content().observations[0] : kind === "BAL" ? content().counts[f.products[0]] : content().form.quantities[f.products[0]]).toBe(value);
  if (kind !== "BAL") expect(await page.evaluate(({ kind, userId, patient }) => sessionStorage.getItem(
    kind === "REQ" ? `hca:v2:requisition:${userId}:${patient}` : `hca:v2:draft:${kind}:${userId}:${patient}:new:standalone:edit`,
  ), { kind, userId: user.id, patient: f.patient })).toBeNull();
  await expect(input).toBeEnabled(); expect(officialState(f)).toBe(before);
  await page.reload(); await expect(choice).toBeVisible(); await choice.getByRole("button", { name: "Continuar rascunho", exact: true }).click();
  await expect(input).toHaveValue(value); await audit(page, "L1 último rascunho " + kind);
  await page.reload(); await choice.getByRole("button", { name: "Descartar e começar novamente", exact: true }).click();
  await expect(choice).toHaveCount(0);
  // A discard must not be followed by saving the newly empty form.
  await page.waitForTimeout(1200);
  expect(sql(`select count(*) from private.creation_drafts where owner_id=${q(user.id)} and care_recipient_id=${q(f.patient)} and kind=${q(kind)} and state='active'`)).toBe("0");
  expect(officialState(f)).toBe(before);
});
