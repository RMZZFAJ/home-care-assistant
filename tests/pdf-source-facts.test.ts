import { it, expect } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { PDF } from "@libpdf/core";
import {
  composeIssuance,
  validateIssuanceContent,
} from "@/lib/server/pdf-content";
import type {
  DocumentSnapshot,
  PdfEmissionContext,
} from "@/lib/server/operational-pdf";
import type { PdfSourceFacts } from "@/lib/documents/pdf-source-facts";
import { demoDocuments } from "@/lib/demo-documents";
const facts: PdfSourceFacts = {
  schemaVersion: 1,
  historical: false,
  sourceCreatedAt: null,
  importedAt: null,
  registeredAt: "2026-11-02T12:00:00Z",
  documentCreatedAt: "2026-11-01T12:00:00Z",
  draftCreatedAt: "2026-10-31T12:00:00Z",
  issuedAt: "2026-11-02T12:00:00Z",
  issuerId: "10000000-0000-4000-8000-000000000001",
  issuerName: "Autora preservada na origem",
  issuerSource: "origin_record",
  patientName: "Paciente preservado na origem",
  patientSource: "event_snapshot",
  historyActors: [],
};
const emission: PdfEmissionContext = {
  id: "20000000-0000-4000-8000-000000000001",
  verificationCode: "1234567890ABCDEF1234567890ABCDEF",
  requestedAt: "2026-11-07T12:00:00Z",
  requestedName: "Solicitante atual da geração",
  representation: "derived",
  verificationOrigin: "http://localhost:3000",
  rendererRevision: 6,
};
const base: DocumentSnapshot = {
  ...Object.values(demoDocuments).find((d) => d.type === "COM")!,
  demo: false,
  sourceFacts: facts,
  actors: {
    issuer: { name: "Nome atual incorreto para o ato antigo" },
    patient: { name: "Paciente atual incorreto para o ato antigo" },
  },
};
const compact = (text: string) => text.normalize("NFKC").replaceAll(/\s/g, "");
async function extracted(bytes: Uint8Array) {
  return compact(
    (await PDF.load(bytes))
      .extractText()
      .flatMap((p) =>
        p.lines.map((l) =>
          l.spans.flatMap((s) => s.chars.map((c) => c.char)).join(""),
        ),
      )
      .join(" "),
  );
}
async function fieldBelow(bytes: Uint8Array, label: string) {
  const wanted = compact(label);
  for (const page of (await PDF.load(bytes)).extractText())
    for (const line of page.lines) {
      const chars = line.spans
          .flatMap((s) => s.chars)
          .filter((c) => compact(c.char)),
        index = chars
          .map((c) => compact(c.char))
          .join("")
          .indexOf(wanted);
      if (index < 0) continue;
      const start = chars[index];
      return compact(
        page.lines
          .flatMap((l) => l.spans.flatMap((s) => s.chars))
          .filter(
            (c) =>
              c.baseline < start.baseline - 1 &&
              c.baseline >= start.baseline - 22 &&
              c.bbox.x >= start.bbox.x - 1 &&
              c.bbox.x < start.bbox.x + 230,
          )
          .sort((a, b) => b.baseline - a.baseline || a.bbox.x - b.bbox.x)
          .map((c) => c.char)
          .join(""),
      );
    }
  throw new Error("Expected field label missing");
}
it("V6 independently extracts creation, draft, operational issue and generation as separate facts", async () => {
  const plan = await composeIssuance(base, "a".repeat(64), emission),
    text = await extracted(plan.bytes);
  for (const expected of [
    "Primeiro rascunho privado salvo:31/10/2026,09:00",
    "Criação da ficha:01/11/2026,09:00",
    "Emissão operacional registrada:02/11/2026,09:00",
    "Responsável na origem:Autora preservada na origem",
    "Nome preservado no documento de origem",
    facts.issuerId!,
  ])
    expect(text).toContain(compact(expected));
  expect(await fieldBelow(plan.bytes, "SOLICITAÇÃO DE GERAÇÃO")).toBe(
    compact("07/11/2026, 09:00"),
  );
  expect(text).not.toContain(compact("Nome atual incorreto para o ato antigo"));
  expect(text).not.toContain(
    compact("Paciente atual incorreto para o ato antigo"),
  );
  expect(plan.identity.rendererRevision).toBe(6);
});
it("historical NULL dates stay unknown and import time has its own label", async () => {
  const source = {
    ...Object.values(demoDocuments).find((d) => d.type === "REQ")!,
    demo: false,
    isHistorical: true,
    createdAt: "2026-11-05T12:00:00Z",
    sourceFacts: {
      ...facts,
      historical: true,
      sourceCreatedAt: null,
      documentCreatedAt: null,
      draftCreatedAt: null,
      issuedAt: null,
      importedAt: "2026-11-05T12:00:00Z",
      issuerId: null,
      issuerName: "Nome literal do documento físico",
      issuerSource: "origin_record",
    },
  };
  const plan = await composeIssuance(source, "b".repeat(64), emission),
    text = await extracted(plan.bytes);
  for (const expected of [
    "Origem:Data desconhecida",
    "Data do documento de origem:Data desconhecida",
    "Importação no sistema:05/11/2026,09:00",
    "Nome literal do documento físico",
    "Identidade não preservada",
  ])
    expect(text).toContain(compact(expected));
  expect(text).not.toContain(compact("Ciência e atendimento pendentes"));
  expect(text).not.toContain(compact("Pendente nesta versão"));
  expect(text).toContain(compact("REQUISIÇÃO HISTÓRICA DE MATERIAIS"));
  expect(text).toContain(compact("NÃO COMPROVADA"));
});
it("V6 terminal records preserve facts without a current operational demand", async () => {
  for (const original of Object.values(demoDocuments).filter((d) =>
    ["REQ", "COM", "ENT"].includes(d.type),
  )) {
    const source = {
        ...original,
        demo: false,
        status: "cancelled",
        sourceFacts: facts,
      },
      plan = await composeIssuance(source, "9".repeat(64), emission),
      text = await extracted(plan.bytes);
    expect(text).toContain(compact("Cancelado"));
    expect(text).not.toContain(compact("EM ANDAMENTO"));
    expect(text).not.toContain(compact("Pendente nesta versão"));
  }
});
it("V6 semantic checks cannot borrow another field's value from elsewhere in the PDF", async () => {
  const plan = await composeIssuance(base, "c".repeat(64), emission);
  const mismatches: Record<string, string>[] = [
    { "source/issuer": facts.patientName! },
    { "source/issuedAt": "01/11/2026, 09:00" },
  ];
  for (const patch of mismatches)
    await expect(
      validateIssuanceContent(plan.bytes, {
        ...plan,
        semanticFacts: { ...plan.semanticFacts, ...patch },
      }),
    ).rejects.toMatchObject({ code: "CONTENT_INVALID" });
  await expect(
    composeIssuance(
      { ...base, sourceFacts: undefined },
      "c".repeat(64),
      emission,
    ),
  ).rejects.toMatchObject({ code: "CONTENT_INVALID" });
});
it("V6 preserves a final marker and geometry across long notes and all four document types", async () => {
  for (const original of Object.values(demoDocuments)) {
    const source = { ...original, demo: false, sourceFacts: facts },
      plan = await composeIssuance(source, "d".repeat(64), emission);
    expect((await validateIssuanceContent(plan.bytes, plan)).passed).toBe(true);
  }
  const marker = "MARCADOR_FINAL_D4_FATOS_62026",
    plan = await composeIssuance(
      {
        ...base,
        payload: {
          ...base.payload,
          notes: "Texto longo preservado e verificável. ".repeat(1600) + marker,
        },
      },
      "e".repeat(64),
      emission,
    );
  expect(
    (await validateIssuanceContent(plan.bytes, plan)).pages,
  ).toBeGreaterThan(5);
  expect(await extracted(plan.bytes)).toContain(marker);
  if (process.env.HCA_EXPORT_PDF_PROOFS === "true") {
    mkdirSync("output/pdf/phase-d/facts", { recursive: true });
    writeFileSync("output/pdf/phase-d/facts/long-note.UNSIGNED.pdf", plan.bytes);
  }
}, 30000);
it("V6 explicitly refuses unsupported glyphs before signing while V5 remains selectable", async () => {
  await expect(
    composeIssuance(
      {
        ...base,
        payload: {
          ...base.payload,
          notes: "Nota com caractere não representável 漢",
        },
      },
      "f".repeat(64),
      emission,
    ),
  ).rejects.toMatchObject({
    code: "CONTENT_INVALID",
    retryable: false,
    message: expect.stringContaining("caracteres ainda não suportados"),
  });
  const old = await composeIssuance(
    { ...base, sourceFacts: undefined },
    "f".repeat(64),
    { ...emission, rendererRevision: 5 },
  );
  expect(old.identity.rendererRevision).toBe(5);
  expect((await validateIssuanceContent(old.bytes, old)).passed).toBe(true);
});
