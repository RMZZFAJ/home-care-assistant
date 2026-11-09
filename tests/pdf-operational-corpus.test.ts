import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import { PDF } from "@libpdf/core";
import { composeIssuance, validateIssuanceContent } from "@/lib/server/pdf-content";
import type { DocumentSnapshot } from "@/lib/server/operational-pdf";
import { fidelityEmission, legacyFidelitySnapshots } from "./support/pdf-fidelity-fixtures";
import { testSigningIdentity } from "./support/test-signing-identity.mjs";
import { signTechnicalPdf } from "@/lib/server/pdf-signing/sign";
import { InternalTimestampAuthority } from "@/lib/server/pdf-signing/internal-tsa";

const directory = "output/pdf/operational-corpus-v10";
const compact = (text: string) => text.normalize("NFKC").replace(/\s+/g, "").toLocaleLowerCase("pt-BR");
function document(type: DocumentSnapshot["type"]) {
  return { ...structuredClone(legacyFidelitySnapshots.find(source => source.type === type)!), documentFacts: { schemaVersion: 1, deliveryResolutions: [], purchaseReceiptEvents: [] } };
}
type Case = { label: string; source: DocumentSnapshot; present: string[]; absent: string[]; long?: boolean };
function cases(): Case[] {
  const values: Case[] = [];
  for (const type of ["REQ", "COM", "ENT"] as const) {
    const source = document(type); source.status = "cancelled"; source.workflow = {}; source.sciencePolicy = {}; source.scienceEvents = [];
    values.push({ label: type + "-cancelled", source, present: ["Cancelado"], absent: ["EM ANDAMENTO", "Pendente nesta versão", "A pessoa designada deve conferir", "Providenciar ENT e conferir recebimento"] });
  }
  const historical = document("REQ"); historical.isHistorical = true;
  historical.sourceFacts = { ...historical.sourceFacts, historical: true, sourceCreatedAt: null, issuedAt: null, issuerName: null, patientName: null };
  values.push({ label: "REQ-historical-unknown", source: historical, present: ["Ciência original", "Não comprovada", "Consulta histórica; sem pendência operacional", "Preservar o registro histórico"], absent: ["Pendente nesta versão", "Ciência e atendimento pendentes", "Providenciar ENT e conferir recebimento"] });
  const req = document("REQ"); req.fulfillmentLines = req.lines.map((line, index) => ({ id: String(line.id), attended: index < 2 }));
  values.push({ label: "REQ-partial", source: req, present: ["Linhas atendidas", "Linhas pendentes", "2 de 6"], absent: ["Quantidade solicitada"] });
  const ent = document("ENT"); ent.workflow = { acceptedAt: "2026-11-02T12:00:00Z" };
  ent.lines = [{ id: "30000000-0000-4000-8000-000000000001", name_snapshot: "PARCIAL_ENT_MATERIAL", unit_snapshot: "unidade", quantity: "3", accepted_quantity: "1", reconciled_quantity: "0", metadata: { issueOpen: true } }];
  values.push({ label: "ENT-partial", source: ent, present: ["PARCIAL_ENT_MATERIAL", "Os aceites positivos são preservados independentemente das divergências.", "Divergência aberta"], absent: ["A pessoa designada deve conferir", "Integralmente conferido"] });
  for (const type of ["REQ", "COM", "ENT", "BAL"] as const) {
    const source = document(type), tail = "\nFIM_NOME_160", patient = "N".repeat(160 - tail.length) + tail;
    expect(patient.length).toBe(160);
    source.sourceFacts = { ...source.sourceFacts, patientName: patient };
    source.actors = { ...source.actors, patient: { name: patient } };
    source.lines = Array.from({ length: 120 }, (_, index) => ({ ...source.lines[index % source.lines.length], id: "30000000-0000-4000-8000-" + String(index + 1).padStart(12, "0"), name_snapshot: index === 119 ? "FIM_B6_MATERIAIS_" + type : "Material comum fictício " + String(index + 1).padStart(3, "0") }));
    source.payload.notes = "Texto técnico íntegro com posição preservada. ".repeat(400) + "\nhttps://exemplo.invalid/" + "x".repeat(300) + "\nFIM_B6_NOTAS_" + type;
    source.attachments = [{ filename: "ANEXO_" + "A".repeat(140) + "\nFIM_B6_ANEXO", sha256: "d".repeat(64) }];
    values.push({ label: type + "-long", source, present: ["FIM_NOME_160", "FIM_B6_MATERIAIS_" + type, "FIM_B6_NOTAS_" + type, "x".repeat(300), "FIM_B6_ANEXO"], absent: [], long: true });
  }
  return values;
}

it("checks V10 cancelled, historical, partial and long ordinary documents with real internal signatures", async () => {
  const identity = await testSigningIdentity();
  try {
    await mkdir(directory, { recursive: true }); await writeFile(directory + "/root-public.pem", identity.root);
    const corpus = [];
    for (const entry of cases()) {
      const plan = await composeIssuance(entry.source, "c".repeat(64), { ...fidelityEmission, rendererRevision: 10, representation: "operational" });
      const signed = await signTechnicalPdf(plan.bytes, { signer: identity.signer, timestampAuthority: new InternalTimestampAuthority(identity.tsa), trust: { roots: [{ pem: identity.root, trust: "internal" }] } });
      const checked = await validateIssuanceContent(signed.bytes, plan);
      const parsed = await PDF.load(signed.bytes), text = compact(parsed.extractText().flatMap(page => page.lines.map(line => line.spans.flatMap(span => span.chars.map(char => char.char)).join(""))).join(" "));
      for (const expected of entry.present) expect(text.includes(compact(expected)), entry.label + ": " + expected.slice(0, 80)).toBe(true);
      for (const forbidden of entry.absent) expect(text.includes(compact(forbidden)), entry.label + ": forbidden " + forbidden).toBe(false);
      if (entry.long) expect(checked.pages).toBeGreaterThan(3);
      expect(signed.verification).toMatchObject({ accepted: true, wholeFile: true, profile: "PAdES-B-T", signerTrust: "internal", timestampTrust: "internal", externalTimeIndependence: false });
      const file = entry.label + ".pdf"; await writeFile(directory + "/" + file, signed.bytes);
      corpus.push({ label: entry.label, file, sha256: createHash("sha256").update(signed.bytes).digest("hex"), type: entry.source.type, code: entry.source.code, version: entry.source.version, status: entry.source.status, expected: entry.present, forbidden: entry.absent, long: Boolean(entry.long), source: entry.source, publicRoot: "root-public.pem", pages: checked.pages, controlledRendererProbe: true, actualApplicationIssuance: false });
    }
    await writeFile(directory + "/CORPUS.json", JSON.stringify(corpus, null, 2) + "\n");
    expect(corpus).toHaveLength(10);
  } finally { await identity.dispose(); }
}, 120_000);

it("refuses unrepresentable V10 content explicitly instead of silently omitting it", async () => {
  const source = document("COM"); source.payload.notes = "RESSALVA_IMPORTANTE 漢 FIM_B6";
  await expect(composeIssuance(source, "c".repeat(64), { ...fidelityEmission, rendererRevision: 10 })).rejects.toMatchObject({ code: "CONTENT_INVALID", retryable: false, message: expect.stringContaining("caracteres ainda não suportados") });
});
