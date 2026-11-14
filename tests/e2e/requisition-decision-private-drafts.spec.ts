import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { reqDecisionFixture, reqDecisionFacts } from "../integration/requisition-decision-draft-fixtures.mjs";
import { fixtures } from "../integration/v4-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { selectDocumentSection, openDocumentMore } from "./document-sections";
import { loginDecision, noPrivateWrites, privateFormCount, discardDecision, confirmedOutcome } from "./l1-decision-policy";
import { audit } from "./accessibility-audit";
test.setTimeout(150_000);
for (const purpose of ["cancel", "archive", "resolve_extra"] as const) test(`REQ ${purpose}: saída descarta campos e resposta perdida confere um único ato sem rascunho`, async ({ page }) => {
  const f = await reqDecisionFixture(purpose), writes = noPrivateWrites(page), count = privateFormCount(f.patient);
  await loginDecision(page, fixtures.adminA.email, f.patient);
  async function open() {
    await page.goto("/fichas/" + f.req.id);
    if (purpose === "resolve_extra") { await selectDocumentSection(page, "materials"); await page.getByRole("button", { name: "Identificar item extra", exact: true }).click(); }
    else { await openDocumentMore(page); await page.getByRole("menuitem", { name: purpose === "cancel" ? "Cancelar requisição" : "Revisar arquivamento manual", exact: true }).click(); }
  }
  const label = purpose === "resolve_extra" ? "Justificativa da associação" : "Justificativa";
  await open(); const before = reqDecisionFacts(f);
  await discardDecision(page, label, "Texto descartado sem confirmar ato.");
  expect(reqDecisionFacts(f)).toBe(before); expect(privateFormCount(f.patient)).toBe(count);
  await open(); await expect(page.getByRole("textbox", { name: label, exact: true })).toHaveValue("");
  if (purpose === "resolve_extra") {
    await page.getByRole("combobox", { name: "Item extra", exact: true }).selectOption(f.content.fields.itemId);
    await page.getByRole("combobox", { name: "Produto correspondente", exact: true }).selectOption(f.content.fields.productId);
  }
  await page.getByRole("textbox", { name: label, exact: true }).fill("Justificativa confirmada sem rascunho.");
  await page.getByRole("button", { name: purpose === "resolve_extra" ? "Revisar associação" : "Revisar decisão", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Conferir decisão antes de confirmar", exact: true })).toBeFocused();
  await audit(page, "L1 decisão REQ sem rascunho");
  await confirmedOutcome(page, f.req.id, purpose === "resolve_extra" ? "Confirmar associação" : purpose === "cancel" ? "Confirmar cancelamento" : "Confirmar arquivamento");
  expect(reqDecisionFacts(f)).not.toBe(before); expect(privateFormCount(f.patient)).toBe(count); expect(writes).toEqual([]);
});
test("REQ falha antes do ato confirma ausência, conserva texto e permite nova chave; tentativa atrasada não aplica", async ({ page }) => {
  const f = await reqDecisionFixture("cancel"); await loginDecision(page, fixtures.adminA.email, f.patient);
  await page.goto("/fichas/" + f.req.id); await openDocumentMore(page); await page.getByRole("menuitem", { name: "Cancelar requisição", exact: true }).click();
  const reason = "Motivo preservado para nova tentativa conferida."; await page.getByRole("textbox", { name: "Justificativa", exact: true }).fill(reason);
  await page.getByRole("button", { name: "Revisar decisão", exact: true }).click();
  let original: { key: string; intention: unknown } | undefined;
  await page.route(`**/api/documents/${f.req.id}/decisions`, async route => { original = route.request().postDataJSON(); await route.fulfill({ status: 503, json: { code: "UNAVAILABLE", error: "Falha fictícia antes de aplicar", correlationId: randomUUID() } }); });
  await page.getByRole("button", { name: "Confirmar cancelamento", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Justificativa", exact: true })).toHaveValue(reason);
  await expect(page.getByText(/conferência confirmou que nada foi alterado/).first()).toBeVisible();
  expect((await f.client.rpc("execute_document_decision", { p_document: f.req.id, p_key: original!.key, p_intention: original!.intention })).error?.code).toBe("PT409");
  expect(sql(`select count(*) from private.document_decision_results where document_id=${q(f.req.id)} and state='applied'`)).toBe("0");
  await page.unroute(`**/api/documents/${f.req.id}/decisions`); await page.getByRole("button", { name: "Revisar decisão", exact: true }).click();
  await confirmedOutcome(page, f.req.id, "Confirmar cancelamento"); expect(privateFormCount(f.patient)).toBe("0");
});

test("REQ resultado impossível de consultar permite fechar, preserva só a chave técnica e não anuncia ausência falsa", async ({ page }) => {
 const f = await reqDecisionFixture("cancel"), before = reqDecisionFacts(f), reason = "Este motivo não pode virar um rascunho persistido.";
 await loginDecision(page, fixtures.adminA.email, f.patient);
 async function open() { await page.goto("/fichas/" + f.req.id); await openDocumentMore(page); await page.getByRole("menuitem", { name: "Cancelar requisição", exact: true }).click(); }
 await open(); await page.getByRole("textbox", { name: "Justificativa", exact: true }).fill(reason); await page.getByRole("button", { name: "Revisar decisão", exact: true }).click();
 const endpoint = `/api/documents/${f.req.id}/decisions`;
 const fault = { status: 503, json: { code: "UNAVAILABLE", error: "Serviço indisponível neste caso fictício", correlationId: randomUUID() } };
 await page.route("**" + endpoint, route => route.fulfill(fault)); await page.route("**" + endpoint + "/reconcile", route => route.fulfill(fault));
 await page.getByRole("button", { name: "Confirmar cancelamento", exact: true }).click();
 await expect(page.getByText(/resultado continua sem confirmação/).first()).toBeVisible(); await expect(page.getByText(/nada foi alterado/i)).toHaveCount(0);
 await page.getByRole("button", { name: "Fechar edição", exact: true }).click();
 const close = page.getByRole("dialog", { name: "Fechar sem resultado confirmado?", exact: true }); await close.getByRole("button", { name: "Fechar e procurar supervisão", exact: true }).click();
 const retained = await page.evaluate(() => Object.entries(sessionStorage).filter(([key]) => key.startsWith("hca:official-decision:")));
 expect(retained).toHaveLength(1); expect(retained[0][1]).toMatch(/^[a-f0-9-]{36}$/); expect(JSON.stringify(retained)).not.toContain(reason);
 expect(privateFormCount(f.patient)).toBe("0"); expect(reqDecisionFacts(f)).toBe(before);
 await page.unroute("**" + endpoint); await page.unroute("**" + endpoint + "/reconcile"); await open();
 await expect(page.getByText(/tentativa anterior não alterou nada/)).toBeVisible(); await expect(page.getByRole("textbox", { name: "Justificativa", exact: true })).toHaveValue(""); expect(reqDecisionFacts(f)).toBe(before);
});
