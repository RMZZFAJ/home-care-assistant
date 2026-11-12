import { expect, it } from "vitest";
import { PDF } from "@libpdf/core";
import { readPdfPresentation, originalAuthorDetail, type PdfPresentationFacts } from "@/lib/documents/pdf-presentation";
import { composeIssuance } from "@/lib/server/pdf-content";
import { fidelitySourceFacts, fidelityEmission, legacyFidelitySnapshots } from "./support/pdf-fidelity-fixtures";

const id = (n: number) => "93000000-0000-4000-8000-" + String(n).padStart(12, "0");
function source() {
  const snapshot = structuredClone(legacyFidelitySnapshots.find(row => row.type === "REQ")!);
  snapshot.id = id(1); snapshot.version = 3; snapshot.status = "submitted";
  snapshot.sourceFacts = { ...fidelitySourceFacts };
  snapshot.documentFacts = { schemaVersion: 1, deliveryResolutions: [], purchaseReceiptEvents: [] };
  snapshot.lifecycleFacts = { schemaVersion: 1, documentId: snapshot.id, version: 3, cancellation: { state: "not_cancelled", act: null, acknowledgements: [] }, complements: [] };
  snapshot.presentationFacts = { schemaVersion: 1, documentId: snapshot.id, version: 3, asOf: "2026-11-08T08:00:00Z", author: { state: "known", actorId: fidelitySourceFacts.issuerId!, name: fidelitySourceFacts.issuerName!, careRole: "family", category: "Enfermagem no cadastro global", registration: "REGISTRO QUE NÃO DEFINE O PAPEL FAMILIAR", registrationState: "SP" }, references: [] } satisfies PdfPresentationFacts;
  return snapshot;
}
it("original patient role keeps family separate from global professional credentials and supervision never invents nursing education", () => {
  const snapshot = source(); expect(originalAuthorDetail(snapshot)).toBe("Familiar");
  const facts = snapshot.presentationFacts as PdfPresentationFacts;
  if (facts.author.state !== "known") throw Error("Known fixture required");
  facts.author.careRole = "supervisor"; facts.author.category = null; facts.author.registration = null; facts.author.registrationState = null;
  expect(originalAuthorDetail(snapshot)).toBe("Supervisão");
  facts.author.careRole = "professional"; facts.author.category = "Técnica de enfermagem"; facts.author.registration = "COREN 123"; facts.author.registrationState = "SP";
  expect(originalAuthorDetail(snapshot)).toBe("Técnica de enfermagem · COREN 123/SP");
});
it("presentation refuses a foreign cut, false author, importer-as-original and payload behind a restricted reference", () => {
  for (const kind of ["document", "version", "author", "historical", "restricted"] as const) {
    const snapshot = source(), facts = snapshot.presentationFacts as PdfPresentationFacts;
    if (kind === "document") facts.documentId = id(99);
    if (kind === "version") facts.version++;
    if (kind === "author" && facts.author.state === "known") facts.author.actorId = id(99);
    if (kind === "historical") snapshot.sourceFacts = { ...fidelitySourceFacts, historical: true };
    if (kind === "restricted") facts.references = [{ kind: "requisition", accessible: false, code: "NÃO DEVE SER TRANSPORTADO" } as unknown as PdfPresentationFacts["references"][number]];
    expect(() => readPdfPresentation(snapshot)).toThrow();
  }
});
it("approved REQ does not leak the raw source-requisition code when current native reference access is restricted", async () => {
  const snapshot = source(), facts = snapshot.presentationFacts as PdfPresentationFacts;
  snapshot.payload = { sourceRequisition: { requisitionId: id(2), code: "REQ-SEGREDO-PRIVADO", reason: "Motivo próprio da nova requisição preservado." } };
  facts.references = [{ kind: "source_requisition", accessible: false }];
  const plan = await composeIssuance(snapshot, "a".repeat(64), { ...fidelityEmission, rendererRevision: 16 });
  const text = (await PDF.load(plan.bytes)).extractText().flatMap(page => page.lines.map(line => line.spans.flatMap(span => span.chars.map(char => char.char)).join(""))).join(" ");
  expect(text).toContain("Acesso restrito"); expect(text).toContain("Motivo próprio"); expect(text).not.toContain("REQ-SEGREDO-PRIVADO");
  expect(plan.semanticFacts?.["identity/issuerRole"]).toBe("Familiar");
}, 30000);
