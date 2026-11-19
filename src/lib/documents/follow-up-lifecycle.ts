import { z } from "zod";
import { formatBrazilDate } from "@/lib/receipt";

const previousDecision = z.object({
  id: z.uuid(), action: z.string(), actorName: z.string().nullable(),
  recordedAt: z.iso.datetime({ offset: true }), version: z.number().int().positive(), reason: z.string().nullable(),
});
const lastAct = z.object({
  state: z.enum(["completed", "reopened"]),
  actorId: z.uuid(), actorName: z.string().nullable(), reason: z.string(),
  recordedAt: z.iso.datetime({ offset: true }),
  physicalStatus: z.string(), previousState: z.string(),
  previousDecision: previousDecision.nullable(),
});
export const followUpReference = z.object({
  documentId: z.uuid(), patientId: z.uuid(), version: z.number().int().positive(),
  kind: z.enum(["REQ", "COM", "ENT", "DEV"]),
  state: z.enum(["open", "reopened", "completed", "cancelled", "archived"]),
  physicalStatus: z.string(), lastAct: lastAct.nullable(), decision: previousDecision.nullable(),
  blockers: z.array(z.enum([
    "req_fulfillment", "req_delivery", "com_approval", "com_expectation", "com_arrival", "com_validation",
    "ent_receipt", "ent_difference", "ent_need",
  ])),
  canComplete: z.boolean(), canReopen: z.boolean(), referenceHash: z.string().regex(/^[a-f0-9]{64}$/),
});
export type FollowUpReference = z.infer<typeof followUpReference>;

export function supplyFollowUpState(physicalStatus: string, act: unknown) {
  const parsed = lastAct.safeParse(act);
  if (!parsed.success || physicalStatus === "cancelled" && parsed.data.physicalStatus !== physicalStatus) return null;
  return parsed.data.state;
}

export function frozenFollowUpFacts(act: unknown) {
  const read = lastAct.safeParse(act);
  if (!read.success) return [];
  const value = read.data;
  const previous = value.previousDecision;
  return [
    { key: "followUp/decision", text: (value.state === "reopened" ? "Acompanhamento reaberto" : "Conclusão registrada") +
      " · " + (value.actorName ?? "Nome não preservado") + " · " + formatBrazilDate(value.recordedAt) },
    ...(value.reason ? [{ key: "followUp/reason", text: value.reason }] : []),
    ...(previous ? [{
      key: "followUp/prior", text: (value.previousState === "cancelled" ? "Cancelamento anterior" : "Conclusão anterior") +
        " · " + (previous.actorName ?? "Sistema") + " · " + formatBrazilDate(previous.recordedAt),
    }] : []),
    ...(previous?.reason ? [{ key: "followUp/priorReason", text: previous.reason }] : []),
  ];
}
