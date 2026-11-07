import { describe, it, expect } from "vitest";
import { PDFDocument, PDFName, PDFHexString } from "pdf-lib";
import {
  composeIssuance,
  validateIssuanceContent,
} from "@/lib/server/pdf-content";
import type {
  DocumentSnapshot,
  PdfEmissionContext,
} from "@/lib/server/operational-pdf";
import { demoDocuments } from "@/lib/demo-documents";
const snapshot: DocumentSnapshot = {
  id: "60000000-0000-4000-8000-000000000001",
  type: "COM",
  code: "COM-2026-001",
  protocol: "COM-2026-001",
  version: 1,
  status: "issued",
  createdAt: "2026-11-07T10:00:00Z",
  actors: {
    patient: { name: "Paciente Fictício" },
    issuer: { name: "Pessoa Fictícia" },
  },
  payload: { origin: "purchase" },
  lines: [
    {
      product_id: "60000000-0000-4000-8000-000000000002",
      name_snapshot: "Material Fictício",
      unit_snapshot: "un",
      quantity: "3",
    },
  ],
};
const emission: PdfEmissionContext = {
  id: "70000000-0000-4000-8000-000000000001",
  verificationCode: "1234567890ABCDEF1234567890ABCDEF",
  requestedAt: "2026-11-07T10:30:00Z",
  requestedName: "Solicitante Fictício",
  representation: "operational",
  verificationOrigin: "http://localhost:3000",
};
describe("independent issuance text and geometry gate", () => {
  it("confirms all four document kinds, multi-page notes and oversized material cells", async () => {
    for (const original of Object.values(demoDocuments)) {
      const source = { ...original, demo: false };
      const plan = await composeIssuance(source, "b".repeat(64), emission);
      expect((await validateIssuanceContent(plan.bytes, plan)).passed).toBe(
        true,
      );
    }
    const source = {
      ...snapshot,
      payload: {
        ...snapshot.payload,
        notes: "Observação longa fictícia com acentuação. ".repeat(350),
      },
      lines: [
        {
          ...snapshot.lines[0],
          name_snapshot: "Material excepcional fictício ".repeat(100),
        },
      ],
    };
    const plan = await composeIssuance(source, "b".repeat(64), emission);
    expect(
      (await validateIssuanceContent(plan.bytes, plan)).pages,
    ).toBeGreaterThan(3);
  }, 30000);
  it("compares each expected run and preserves the emission identity", async () => {
    const plan = await composeIssuance(snapshot, "a".repeat(64), emission);
    expect(await validateIssuanceContent(plan.bytes, plan)).toMatchObject({
      passed: true,
    });
  }, 30000);
  it("rejects swapped identity and missing visible facts before signing", async () => {
    const plan = await composeIssuance(snapshot, "a".repeat(64), emission),
      pdf = await PDFDocument.load(plan.bytes);
    pdf.catalog.set(PDFName.of("HCAIssuance"), PDFHexString.fromText("{}"));
    await expect(
      validateIssuanceContent(await pdf.save(), plan),
    ).rejects.toMatchObject({ code: "CONTENT_INVALID" });
    await expect(
      validateIssuanceContent(plan.bytes, {
        ...plan,
        runs: [
          ...plan.runs,
          {
            page: 0,
            text: "A fact that was never painted",
            x: 44,
            baseline: 600,
            width: 100,
            size: 9,
          },
        ],
      }),
    ).rejects.toMatchObject({ code: "CONTENT_INVALID" });
  }, 30000);
});
