import { z } from "zod";
import type { DocumentSnapshot } from "@/lib/server/operational-pdf";
import { pdfSourceFactsSchema } from "./pdf-source-facts";
import { formatBrazilDate } from "@/lib/receipt";

const role = z.enum(["admin", "family", "supervisor", "professional", "reader"]);
const kind = z.enum(["requisition", "source_requisition", "transfer_origin", "remaining_need", "related_document"]);
const author = z.discriminatedUnion("state", [
  z.object({ state: z.literal("unavailable") }).strict(),
  z.object({ state: z.literal("known"), actorId: z.uuid(), name: z.string(), careRole: role.nullable(), category: z.string().nullable(), registration: z.string().nullable(), registrationState: z.string().nullable() }).strict(),
]);
const reference = z.discriminatedUnion("accessible", [
  z.object({ kind, accessible: z.literal(false) }).strict(),
  z.object({ kind, accessible: z.literal(true), id: z.uuid(), type: z.enum(["REQ", "COM", "ENT", "BAL"]), code: z.string().min(1) }).strict(),
]);
export const pdfPresentationSchema = z.object({ schemaVersion: z.literal(1), documentId: z.uuid(), version: z.number().int().positive(), asOf: z.iso.datetime({ offset: true }), author, references: z.array(reference) }).strict();
export type PdfPresentationFacts = z.infer<typeof pdfPresentationSchema>;
export function readPdfPresentation(snapshot: DocumentSnapshot) {
  if (snapshot.presentationFacts === undefined) return null;
  const value = pdfPresentationSchema.parse(snapshot.presentationFacts), source = pdfSourceFactsSchema.parse(snapshot.sourceFacts);
  if (value.documentId !== snapshot.id || value.version !== snapshot.version || value.references.some(ref => ref.accessible && ref.id === snapshot.id)
    || value.author.state === "known" && (source.historical || value.author.actorId !== source.issuerId || value.author.name !== source.issuerName || !value.author.careRole && !value.author.category)) throw new Error("Presentation source mismatch");
  return value;
}
const roles = { admin: "Administrador do paciente", family: "Familiar", supervisor: "Supervisão", professional: "Profissional", reader: "Leitor" };
export function originalAuthorDetail(snapshot: DocumentSnapshot) {
  const frozen = readPdfPresentation(snapshot), source = pdfSourceFactsSchema.parse(snapshot.sourceFacts);
  if (frozen) {
    const person = frozen.author;
    if (person.state === "unavailable") return "Função na assistência não preservada no ato";
    if (person.careRole === "family") return "Familiar";
    const description = person.category ? person.category + (person.careRole && person.careRole !== "professional" ? " · " + roles[person.careRole] : "") : person.careRole ? roles[person.careRole] : "Função não preservada";
    return description + (person.registration ? " · " + person.registration + (person.registrationState ? "/" + person.registrationState : "") : "");
  }
  const person = snapshot.actors?.issuer;
  return !source.historical && person?.name === source.issuerName && person.category ? person.category + (person.registration ? " · " + person.registration + (person.state ? "/" + person.state : "") : "") : "Função na assistência não preservada no ato";
}
export function documentCutLabel(snapshot: DocumentSnapshot) {
  const frozen = readPdfPresentation(snapshot);
  const instant = frozen?.asOf ?? snapshot.history?.find(event => event.version === snapshot.version)?.createdAt;
  return instant ? formatBrazilDate(instant) : "Data do corte não preservada";
}
