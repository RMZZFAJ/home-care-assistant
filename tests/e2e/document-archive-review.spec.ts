import { expect, test } from "@playwright/test";
import { PDF } from "@libpdf/core";
import { randomUUID } from "node:crypto";
import { entTerminalFixture, terminalLedger } from "../integration/ent-terminal-fixtures.mjs";
import { fixtures, rpc } from "../integration/v4-fixtures.mjs";
import { loginDecision } from "./l1-decision-policy";

test.setTimeout(120_000);

for (const decision of ["reverse", "confirm"] as const) {
  test(`arquivo de ENT aceita ${decision} preservando o mesmo PDF consolidado e o estoque`, async ({ page }) => {
    const fixture = await entTerminalFixture({ kind: "cancelled" });
    const { admin, doc, patient } = fixture;
    await loginDecision(page, fixtures.adminA.email, patient);
    const url = `/api/documents/${doc.id}/lifecycle/archive`;
    const pdf = `/api/documents/${doc.id}/pdf`;
    const stock = terminalLedger(patient);
    const reviewed = await (await page.request.get(url)).json();
    expect(reviewed).toMatchObject({ condition: "cancelled", canArchive: true });
    const reason = "Arquivo fictício após a devolução confirmada";
    const command = { action: "archive", mode: "other", reason, key: randomUUID(), version: reviewed.version, referenceHash: reviewed.referenceHash };
    const response = await page.request.post(url, { data: command });
    expect(response.status(), await response.text()).toBe(200);
    const completed = await response.json();
    expect(completed).toMatchObject({ documentId: doc.id, sourceVersion: reviewed.version, reason, decision: null });
    const replay = await page.request.post(url, { data: command });
    expect(await replay.json()).toEqual(completed);
    const archived = await (await page.request.get(url)).json();
    expect(archived).toMatchObject({ condition: "archived", canArchive: false, canDecide: true, archive: { issuanceId: completed.issuanceId } });

    const resource = `${pdf}?issuance=${completed.issuanceId}`;
    const downloaded = await page.request.get(resource);
    expect(downloaded.status()).toBe(200);
    const bytes = await downloaded.body();
    const signed = await rpc(admin, "pdf_issuance", { p_id: completed.issuanceId });
    expect(signed.validation).toMatchObject({ accepted: true, profile: "PAdES-B-T", wholeFile: true });
    const content = (await PDF.load(bytes)).extractText().flatMap(part => part.lines.map(line =>
      line.spans.flatMap(span => span.chars.map(character => character.char)).join(""))).join(" ");
    expect(content).toContain("Ficha arquivada");
    expect(content).toContain("Condição anterior");
    expect(content).toContain(reason);
    expect((await admin.rpc("reserve_pdf_issuance", { p_document: doc.id, p_key: randomUUID() })).error?.code).toBe("PT409");
    const note = { p_document: doc.id, p_key: randomUUID(), p_body: { text: "Andamento fictício", category: "record", stage: "completion", references: [] } };
    expect((await admin.rpc("document_progress_publish", note)).error?.code).toBe("PT409");

    const decisionCommand = { action: decision, version: archived.version, key: randomUUID(), referenceHash: archived.referenceHash,
      ...(decision === "reverse" ? { reason: "Restaurar acompanhamento anterior da entrega" } : {}) };
    const abandonedKey = randomUUID();
    const absent = await page.request.post(`${url}/reconcile`, { data: { action: decision, key: abandonedKey } });
    expect(absent.status(), await absent.text()).toBe(200);
    expect(await absent.json()).toEqual({ action: decision, key: abandonedKey, documentId: doc.id, state: "not_applied" });
    const late = await page.request.post(url, { data: { ...decisionCommand, key: abandonedKey } });
    expect(late.status()).toBe(409);
    expect(await late.json()).toMatchObject({ code: "VERSION_CONFLICT" });
    const actual = await page.request.post(url, { data: decisionCommand });
    expect(actual.status(), await actual.text()).toBe(200);
    expect(await actual.json()).toMatchObject({ decision, issuanceId: completed.issuanceId });
    const recovered = await page.request.post(`${url}/reconcile`, { data: { action: decision, key: decisionCommand.key } });
    expect(recovered.status(), await recovered.text()).toBe(200);
    expect(await recovered.json()).toMatchObject({ state: "applied", archive: { decision, issuanceId: completed.issuanceId } });
    const current = await (await page.request.get(url)).json();
    expect(current.condition).toBe(decision === "reverse" ? "cancelled" : "archived");
    expect(current.canDecide).toBe(false);
    const progress = await rpc(admin, "document_progress", { p_document: doc.id, p_filter: "automatic" });
    expect(progress.data.map((item: { action?: string }) => item.action)).toEqual(expect.arrayContaining([
      "ent.archived.manual", decision === "confirm" ? "ent.archive_confirmed" : "ent.archive_reverted",
    ]));
    const again = await page.request.get(resource);
    expect(again.status()).toBe(200);
    expect((await again.body()).equals(bytes)).toBe(true);
    if (decision === "reverse") {
      await rpc(admin, "document_progress_publish", note);
      expect(current.canArchive).toBe(true);
    } else {
      const forbidden = await page.request.post(url, { data: { action: "reverse", referenceHash: current.referenceHash, version: current.version, key: randomUUID(), reason: "Tentativa fictícia fora do prazo." } });
      expect(forbidden.status()).toBe(409);
      expect(await forbidden.json()).toMatchObject({ code: "VERSION_CONFLICT" });
    }
    expect(terminalLedger(patient)).toBe(stock);
  });
}
