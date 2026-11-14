import { demoDocuments } from "@/lib/demo-documents";
import type { PdfSourceFacts } from "@/lib/documents/pdf-source-facts";
import type { PdfEmissionContext } from "@/lib/server/operational-pdf";

export const fidelitySourceFacts: PdfSourceFacts = {
  schemaVersion: 1, historical: false, sourceCreatedAt: null, importedAt: null,
  registeredAt: "2026-11-01T12:00:00Z", documentCreatedAt: "2026-11-01T12:00:00Z",
  draftCreatedAt: null, issuedAt: "2026-11-01T12:00:00Z",
  issuerId: "10000000-0000-4000-8000-000000000001", issuerName: "Autora histórica fictícia",
  issuerSource: "event_snapshot", patientName: "Paciente fictício da fidelidade",
  patientSource: "event_snapshot", historyActors: [],
};
export const fidelityEmission: PdfEmissionContext = {
  id: "20000000-0000-4000-8000-000000000001",
  verificationCode: "1234567890ABCDEF1234567890ABCDEF",
  requestedAt: "2026-11-08T09:00:00Z", requestedName: "Solicitante fictícia da fidelidade",
  representation: "derived", verificationOrigin: "http://localhost:3000",
};
export const legacyFidelitySnapshots = Object.values(demoDocuments).map(snapshot => ({
  ...structuredClone(snapshot), demo: false, sourceFacts: fidelitySourceFacts,
}));
