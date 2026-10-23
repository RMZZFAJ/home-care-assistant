import type { DocumentSnapshot } from "@/lib/server/operational-pdf";
const material = [
  ["Fralda geriátrica G", "unidade", "20"], ["Lenço umedecido", "pacote", "4"], ["Memantina 10 mg", "comprimido", "30"],
  ["Gaze estéril", "pacote", "3"], ["Equipo para dieta", "unidade", "10"], ["Soro fisiológico 0,9%", "frasco", "6"],
];
const actors = { issuer: { name: "Renato - Responsável familiar" }, recipient: { name: "Juliana - Técnica de Enfermagem" }, patient: { name: "Paciente Exemplo" } };
const base = { demo: true, createdAt: "2026-10-22T10:42:00.000Z", actors, payload: { source: "FAMILY", destination: "CARE_TEAM" }, history: [{ action: "ent.issued", actorName: actors.issuer.name, createdAt: "2026-10-22T10:42:00.000Z", version: 1 }] };
export const demoDocuments: Record<string, DocumentSnapshot> = Object.fromEntries([
  ["REQ", 1, false], ["REQ", 2, true], ["ENT", 3, false], ["ENT", 4, true], ["COM", 5, false], ["BAL", 6, true],
].map(([type, index, complete]) => {
  const id = "00000000-0000-4000-8000-00000000d00" + index;
  const kind = type as DocumentSnapshot["type"];
  const snapshot: DocumentSnapshot = {
    ...base, id, type: kind, code: kind === "ENT" ? "ENT-0012" : kind === "COM" ? "COM-0003" : kind === "BAL" ? "BAL-0004" : "REQ-0007", protocol: `HCA-${kind}-EXEMPLO`, version: complete ? 2 : 1,
    status: kind === "REQ" ? "submitted" : kind === "ENT" ? complete ? "confirmed" : "pending_receipt" : "approved",
    actors: kind === "REQ" ? { ...actors, issuer: { name: "Juliana - Técnica de Enfermagem", registration: "000.000 - Exemplo", state: "SP" } } : actors,
    lines: material.map(([name, unit, amount], row) => ({ id: "demo-line-" + row, name_snapshot: name, product_name_snapshot: name, unit_snapshot: unit, urgent: row === 2 || row === 4, current_stock: "0", quantity: amount, approved_quantity: amount, purchased_quantity: kind === "COM" ? "0" : amount, accepted_quantity: complete ? amount : "0", reconciled_quantity: "0", fully_checked: kind === "ENT" && complete, metadata: { expectedQuantity: "0" } })),
    sciencePolicy: kind === "REQ" ? { science_satisfied_at: complete ? "2026-10-22T11:00:00.000Z" : undefined } : undefined,
    scienceEvents: kind === "REQ" && complete ? [{ actor_name: "Adriana - Familiar", mode: "express", created_at: "2026-10-22T11:00:00.000Z" }] : [],
    workflow: kind === "ENT" && complete ? { acceptedAt: "2026-10-22T12:18:00.000Z" } : {},
    history: [{ action: kind.toLowerCase() + ".issued", actorName: kind === "REQ" ? "Juliana" : "Renato", createdAt: base.createdAt, version: 1 }, ...(complete ? [{ action: kind === "REQ" ? "req.science_satisfied" : kind === "ENT" ? "ent.receive" : "bal.approve", actorName: kind === "ENT" ? "Juliana" : "Adriana", createdAt: kind === "REQ" ? "2026-10-22T11:00:00.000Z" : "2026-10-22T12:18:00.000Z", version: 2 }] : [])],
  };
  return [id, snapshot];
}));
