import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { setup, actor, rpc, fixtures } from "../integration/v4-fixtures.mjs";
import { loginDecision, noPrivateWrites, privateFormCount, confirmedOutcome } from "./l1-decision-policy";
import { selectDocumentSection } from "./document-sections";
import { audit } from "./accessibility-audit";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
test.setTimeout(150_000);
test("COM aprovação, aquisição e chegada são atos separados sem rascunhos e cada resposta perdida é conferida uma vez", async ({ page }) => {
 const f = await setup(), family = await actor("family", f.patient), writes = noPrivateWrites(page);
 let doc = await rpc(family, "create_supply_document", { p_patient: f.patient, p_type: "COM", p_payload: { origin: "purchase", lines: [{ productId: f.products[0], quantity: "2" }] }, p_key: randomUUID(), p_draft: false });
 await loginDecision(page, fixtures.adminA.email, f.patient);
 for (const label of ["Aprovar itens", "Registrar aquisição", "Informar nova chegada"]) {
  await page.goto("/fichas/" + doc.id); await selectDocumentSection(page, "workflow"); await page.getByRole("button", { name: label, exact: true }).click();
  await page.locator(`input[name="${doc.lines[0].id}"]`).fill(label === "Aprovar itens" ? "2" : "1");
  await expect(page.getByRole("button", { name: "Salvar preenchimento privado", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Revisar operação", exact: true }).click(); await audit(page, "L1 COM ato sem rascunho");
  await confirmedOutcome(page, doc.id, "Confirmar operação"); await page.unroute(`**/api/documents/${doc.id}/decisions`);
  doc = await rpc(f.admin, "operational_document", { p_id: doc.id });
 }
 expect(privateFormCount(f.patient)).toBe("0"); expect(writes).toEqual([]);
 expect(sql(`select purchased_quantity=1 from public.document_lines where id=${q(doc.lines[0].id)}`)).toBe("t");
});
