import { currentPdfFixture } from "./support/current-pdf-fixture";
import { mkdir, writeFile } from "node:fs/promises";
import { expect, it } from "vitest";
import { PDFArray, PDFDict, PDFDocument, PDFName, PDFNumber } from "pdf-lib";
import { composeIssuance, validateIssuanceContent } from "@/lib/server/pdf-content";
import { validatePdfStructure } from "@/lib/server/pdf-structure-validation";
import { fidelityEmission, legacyFidelitySnapshots } from "./support/pdf-fidelity-fixtures";
import { testSigningIdentity } from "./support/test-signing-identity.mjs";
import { signTechnicalPdf } from "@/lib/server/pdf-signing/sign";
import { InternalTimestampAuthority } from "@/lib/server/pdf-signing/internal-tsa";

const snapshots = legacyFidelitySnapshots.map(original => ({ ...structuredClone(original), documentFacts: { schemaVersion: 1 as const, deliveryResolutions: [], purchaseReceiptEvents: [] } }));
const plan = (index = 0, revision = 16) => composeIssuance(currentPdfFixture(snapshots[index]), "c".repeat(64), { ...fidelityEmission, rendererRevision: revision });
const key = PDFName.of;
// Reviewed content from the synthetic fixture, independent of the renderer.
// Keep these literals when layout code changes: a missing row must fail here.
const materialBaseline = ["Fralda geriátrica G", "Lenço umedecido", "Memantina 10 mg", "Gaze estéril", "Equipo para dieta", "Soro fisiológico 0,9%"];
const materialUnits = ["unidade", "pacote", "comprimido", "pacote", "unidade", "frasco"];
for (const [index, source] of snapshots.entries()) {
  it(`preserves the independent material baseline and logical structure for ${source.type}-${index}`, async () => {
    const current = await plan(index);
    const materialNames = Object.entries(current.semanticFacts ?? {}).filter(([key]) => /^material\/\d+\/name$/.test(key)).map(([,value]) => value);
    expect(materialNames).toEqual(materialBaseline.map((name,index) => ["COM","BAL"].includes(source.type) ? name + " " + materialUnits[index] : name));
    const painted = current.runs.map(run => run.text).join(" ").replaceAll(/\s+/g, " ");
    for (const material of materialBaseline) expect(painted).toContain(material);
    await expect(validateIssuanceContent(current.bytes, current)).resolves.toMatchObject({ passed: true });
    const pdf = await PDFDocument.load(current.bytes, { updateMetadata: false });
    const facts = validatePdfStructure(pdf);
    expect(facts.roles).toMatchObject({ H1: 1, Figure: 1, Document: 1 });
    expect(facts.roles.TH).toBeGreaterThan(0); expect(facts.roles.TD).toBeGreaterThan(0);
    await mkdir("output/pdf/structure-v10/current", { recursive: true });
    await writeFile(`output/pdf/structure-v10/current/${source.type}-${index}.pdf`, current.bytes);
  }, 30_000);
}

it("the content baseline detects a deleted material even when the new renderer is internally consistent", async () => {
  const source = currentPdfFixture(snapshots[0]);
  source.lines = source.lines.slice(1);
  const current = await composeIssuance(source, "c".repeat(64), { ...fidelityEmission, rendererRevision: 16 });
  const materialNames = Object.entries(current.semanticFacts ?? {}).filter(([key]) => /^material\/\d+\/name$/.test(key)).map(([,value]) => value);
  expect(materialNames).not.toEqual(materialBaseline);
  expect(materialNames).not.toContain(materialBaseline[0]);
});

it("rejects missing tags, broken parents, absent scopes, unmatched content and untagged painted content", async () => {
  const current = await plan();
  const mutations = [
    (pdf: PDFDocument) => pdf.catalog.delete(key("StructTreeRoot")),
    (pdf: PDFDocument) => pdf.catalog.delete(key("MarkInfo")),
    (pdf: PDFDocument) => pdf.getPages()[0].node.set(key("StructParents"), PDFNumber.of(99)),
    (pdf: PDFDocument) => pdf.catalog.lookup(key("StructTreeRoot"), PDFDict).lookup(key("ParentTree"), PDFDict).set(key("Nums"), pdf.context.obj([])),
    (pdf: PDFDocument) => {
      const elem = pdf.context.enumerateIndirectObjects().find(([, value]) => value instanceof PDFDict && value.get(key("S"))?.toString() === "/H1")![1] as PDFDict;
      elem.set(key("P"), pdf.getPages()[0].ref);
    },
    (pdf: PDFDocument) => {
      const elem = pdf.context.enumerateIndirectObjects().find(([, value]) => value instanceof PDFDict && value.get(key("S"))?.toString() === "/TH")![1] as PDFDict;
      elem.delete(key("A"));
    },
    (pdf: PDFDocument) => {
      const elem = pdf.context.enumerateIndirectObjects().find(([, value]) => value instanceof PDFDict && value.get(key("S"))?.toString() === "/P")![1] as PDFDict;
      elem.lookup(key("K"), PDFArray).lookup(0, PDFDict).set(key("MCID"), PDFNumber.of(99999));
    },
    (pdf: PDFDocument) => {
      pdf.getPages()[0].node.addContentStream(pdf.context.register(pdf.context.stream("BT /F1 10 Tf 10 10 Td <0041> Tj ET\n")));
    },
    (pdf: PDFDocument) => pdf.getPages()[0].node.set(key("Contents"), pdf.context.obj([])),
  ];
  for (const [index, mutate] of mutations.entries()) {
    const pdf = await PDFDocument.load(current.bytes, { updateMetadata: false }); mutate(pdf);
    await expect(validateIssuanceContent(await pdf.save(), current), `structure mutation ${index}`).rejects.toMatchObject({ code: "CONTENT_INVALID" });
  }
}, 60_000);

it("retains logical cells across oversized fragments and repeated visual headings", async () => {
  const snapshot = structuredClone(snapshots.find(source => source.type === "ENT")!);
  snapshot.sourceFacts.patientName = "Paciente fictício com identificação preservada. ".repeat(100);
  snapshot.lines[0].name_snapshot = "Material fictício de descrição excepcionalmente extensa. ".repeat(140);
  const current = await composeIssuance(currentPdfFixture(snapshot), "c".repeat(64), { ...fidelityEmission, rendererRevision: 16 });
  const pdf = await PDFDocument.load(current.bytes, { updateMetadata: false });
  const facts = validatePdfStructure(pdf);
  expect(facts.pages).toBeGreaterThan(6);
  const cells = pdf.context.enumerateIndirectObjects().flatMap(([, obj]) => obj instanceof PDFDict && obj.get(key("S"))?.toString() === "/TD" ? [obj] : []);
  expect(cells.some(cell => new Set(cell.lookup(key("K"), PDFArray).asArray().map(mcr => (mcr as PDFDict).get(key("Pg"))?.toString())).size > 1)).toBe(true);
  await writeFile("output/pdf/structure-v10/current/oversized.pdf", current.bytes);
}, 30_000);

it("preserves tags and content through real internal PAdES-B-T signing of every fixture", async () => {
  const identity = await testSigningIdentity();
  try {
    const directory = "output/pdf/structure-v10/signed";
    await mkdir(directory, { recursive: true });
    await writeFile(`${directory}/root-public.pem`, identity.root);
    for (const [index, source] of snapshots.entries()) {
      const current = await plan(index);
      const signed = await signTechnicalPdf(current.bytes, { signer: identity.signer, timestampAuthority: new InternalTimestampAuthority(identity.tsa), trust: { roots: [{ pem: identity.root, trust: "internal" }] } });
      expect(signed.verification).toMatchObject({ accepted: true, wholeFile: true, profile: "PAdES-B-T", signerTrust: "internal", timestampTrust: "internal", externalTimeIndependence: false });
      await expect(validateIssuanceContent(signed.bytes, current)).resolves.toMatchObject({ passed: true });
      await writeFile(`${directory}/${source.type}-${index}.pdf`, signed.bytes);
    }
  } finally { await identity.dispose(); }
}, 60_000);
