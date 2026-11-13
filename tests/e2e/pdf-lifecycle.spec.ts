import { actor } from "../integration/v4-fixtures.mjs";
import { test, expect, type Page } from "@playwright/test";
import { randomUUID, createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { PDF } from "@libpdf/core";
import { cancellationFixture, awareness, awarenessFacts, rpc, fixtures } from "../integration/cancellation-awareness-fixtures.mjs";
import { createComplementCandidate, loadComplementDocument, complementPacket } from "../integration/document-complements-fixtures.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";
import { generatedPdf } from "./generated-pdf";
import type { PdfIssuance } from "@/lib/documents/pdf-issuance";
const compact = (value: string) => value.normalize("NFKC").replaceAll(/\s/g, "");
async function readText(bytes: Buffer) { return compact((await PDF.load(bytes)).extractText().flatMap(p => p.lines.map(l => l.spans.flatMap(s => s.chars.map(c => c.char)).join(""))).join(" ")); }
async function login(page: Page, email: string, patient: string) {
 await page.goto("/login"); await page.getByLabel("E-mail", { exact: true }).fill(email);
 await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
 await page.getByRole("button", { name: "Entrar", exact: true }).click();
 await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible(); await selectContext(page, patient);
}
test.setTimeout(180_000);
for (const type of ["REQ", "COM", "ENT", "BAL"]) test(type + " V15 generates signed lifecycle facts through the existing pipeline and preserves the chosen cutoff", async ({ page, browser }, info) => {
 const f = await cancellationFixture(type), id = f.document.id, childId = await createComplementCandidate(f, "COM"), child = await loadComplementDocument(f.admin, childId);
 const before = awarenessFacts(id), source = await awareness(f.family, id);
 const legacyPdf = (target: Page, url: string, client = f.admin) => generatedPdf(target, url, (key, version) => rpc(client, "reserve_pdf_issuance", { p_document: id, p_key: key, p_version: version }));
 await login(page, fixtures.adminA.email, f.patient);
 let historical: Buffer | null = null;
 const historicUrl = "/api/documents/" + id + "/pdf?version=" + f.beforeCancel.version;
 if (type === "REQ") {
  const old = await legacyPdf(page, historicUrl); expect(old.status()).toBe(200); historical = await old.body();
  const oldText = await readText(historical); expect(oldText).toContain(compact("Sem cancelamento nesta versão.")); expect(oldText).not.toContain(compact(child.protocol));
 }
 await rpc(f.family, "acknowledge_document_cancellation", { p_id: id, p_event: source.cancellation.id, p_key: randomUUID() });
 await rpc(f.admin, "link_document_complement", await complementPacket(f.admin, id, childId));
 await page.goto((type === "REQ" ? "/historico/" : "/fichas/") + id);
 const url = "/api/documents/" + id + "/pdf", response = await legacyPdf(page, url); expect(response.status()).toBe(200);
 const bytes = await response.body(), text = await readText(bytes);
 for (const value of [source.cancellation.reason, "Ciência própria do cancelamento", child.protocol, "Complemento formal preservando o documento original.", "As ciências anteriores da emissão"])
  expect(text).toContain(compact(value));
 const metadata = await rpc(f.admin, "pdf_issuances", { p_document: id }), current = (metadata.data as PdfIssuance[]).find(row => row.version !== f.beforeCancel.version)!;
 expect(current.rendererRevision).toBe(16); expect(current.state).toBe("ready");
 expect(current.validation?.profile).toBe("PAdES-B-T"); expect(current.validation?.accepted).toBe(true);
 expect(createHash("sha256").update(bytes).digest("hex")).toBe(current.sha256);
 expect(await (await legacyPdf(page, url)).body()).toEqual(bytes);
 if (historical) expect(await (await legacyPdf(page, historicUrl)).body()).toEqual(historical);
 expect(awarenessFacts(id)).toBe(before);
 mkdirSync("output/pdf/phase-d", { recursive: true }); writeFileSync("output/pdf/phase-d/lifecycle-" + type.toLowerCase() + "-" + info.project.name + ".pdf", bytes);
 if (historical) writeFileSync("output/pdf/phase-d/lifecycle-req-historical.pdf", historical);
 if (type === "REQ") {
  const clinical = await browser.newPage({ baseURL: new URL(page.url()).origin });
  try {
   await login(clinical, fixtures.professional.email, f.patient);
   expect((await clinical.request.get(url + "?issuance=" + current.id)).status()).toBe(403);
   const restricted = await legacyPdf(clinical, url, await actor("professional", f.patient)); expect(restricted.status()).toBe(200);
   const restrictedBytes = await restricted.body(), restrictedText = await readText(restrictedBytes);
   expect(restrictedText).toContain(compact("Acesso restrito")); expect(restrictedText).not.toContain(compact(child.protocol));
   expect(restrictedText).not.toContain(compact("Complemento formal preservando o documento original."));
   writeFileSync("output/pdf/phase-d/lifecycle-req-restricted.pdf", restrictedBytes);
  } finally { await clinical.close(); }
 }
});
