import { z } from "zod";
import type { SupplyDocument } from "@/types/documents";
const instant = z.iso.datetime({ offset: true });
const actor = z.object({ id: z.uuid(), name: z.string() });
const custody = z.enum(["FAMILY", "CARE_TEAM"]);
const amount = z.union([
  z.string().regex(/^\d+(?:\.\d+)?$/),
  z.number().finite().nonnegative(),
]);
const packet = z.object({
  data: z
    .object({
      id: z.uuid(),
      care_recipient_id: z.uuid(),
      type: z.literal("ENT"),
      version: z.number().int().positive(),
      status: z.string(),
      payload: z.record(z.string(), z.unknown()),
      events: z.array(z.unknown()),
      lines: z
        .array(
          z
            .object({
              id: z.uuid(),
              product_id: z.string().min(1).max(120),
              name_snapshot: z.string(),
              unit_snapshot: z.string(),
              quantity: amount,
            })
            .passthrough(),
        )
        .min(1)
        .max(1000),
      transfer: z.object({
        state: z.enum([
          "pending",
          "agreed",
          "declined",
          "withdrawn",
          "dispatched",
        ]),
        declaration: z.object({
          actor,
          mode: z.literal("direct").optional(),
          counterparty: actor.optional(),
          recipient: actor,
          source: custody,
          destination: custody,
          reason: z.string(),
          recordedAt: instant,
          referenceHash: z.string().regex(/^[a-f0-9]{64}$/),
        }),
        agreement: z
          .object({
            actor,
            reason: z.string(),
            decision: z.enum(["agree", "decline"]),
            recordedAt: instant,
            documentVersion: z.number().int().positive(),
          })
          .nullable(),
        withdrawal: z
          .object({
            actor,
            reason: z.string(),
            recordedAt: instant,
            kind: z.enum(["initiator_withdrawal", "administrative_close"]),
          })
          .nullable(),
        originDocumentId: z.uuid().nullable(),
        dispatchedAt: instant.nullable(),
        canAgree: z.boolean(),
        canDispatch: z.boolean(),
        canWithdraw: z.boolean(),
      }),
    })
    .passthrough(),
});
/** Validate fresh Auth reads before displaying or adopting operational facts. */
export function parseTransferReference(
  value: unknown,
  expected: { id: string; patientId: string; minimumVersion: number },
): SupplyDocument {
  const parsed = packet.safeParse(value);
  if (!parsed.success)
    throw new Error(
      "A resposta da transferência não pôde ser conferida. Consulte novamente.",
    );
  const row = parsed.data.data,
    facts = row.transfer;
  const direct = facts.declaration.mode === "direct";
  const beforeDispatch = facts.state === "pending" || facts.state === "agreed";
  if (
    row.id !== expected.id ||
    row.care_recipient_id !== expected.patientId ||
    row.version < expected.minimumVersion ||
    new Set(row.lines.map((line) => line.id)).size !== row.lines.length ||
    facts.declaration.source === facts.declaration.destination ||
    (facts.canAgree && facts.state !== "pending") ||
    (facts.canDispatch && !beforeDispatch) ||
    (facts.canWithdraw && !beforeDispatch) ||
    direct === !!facts.declaration.counterparty ||
    (direct && (facts.state !== "dispatched" || facts.agreement !== null)) ||
    (facts.state === "pending" && (facts.agreement !== null || facts.withdrawal !== null)) ||
    (facts.agreement !== null &&
      facts.agreement.actor.id !== facts.declaration.counterparty?.id) ||
    (facts.state === "dispatched") !== (facts.dispatchedAt !== null) ||
    (facts.state === "declined" && facts.agreement?.decision !== "decline") ||
    (facts.state === "agreed" && facts.agreement?.decision !== "agree") ||
    (facts.state === "dispatched" && facts.agreement !== null && facts.agreement.decision !== "agree") ||
    (facts.state === "withdrawn") !== (facts.withdrawal !== null)
  )
    throw new Error(
      "A referência não corresponde à ficha consultada. Seu preenchimento foi preservado.",
    );
  return row as SupplyDocument;
}
