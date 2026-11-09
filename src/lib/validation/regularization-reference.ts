import { z } from "zod";
import type { SupplyDocument } from "@/types/documents";
const amount = z
  .union([
    z
      .string()
      .max(40)
      .regex(/^\d+(?:\.\d{1,6})?$/),
    z.number().finite().nonnegative(),
  ])
  .transform(String);
const instant = z.iso.datetime({ offset: true });
const person = z.object({ id: z.uuid(), name: z.string(), role: z.string() });
const line = z
  .object({
    id: z.uuid(),
    product_id: z.string().min(1).max(120),
    name_snapshot: z.string(),
    unit_snapshot: z.string(),
    quantity: amount,
    accepted_quantity: amount,
    reconciled_quantity: amount,
  })
  .passthrough();
const physical = z.object({
  lineId: z.uuid(),
  productId: z.string(),
  name: z.string(),
  unit: z.string(),
  quantityDecimals: z.number().int().min(0).max(6),
  expeditedQuantity: amount,
  acceptedQuantity: amount,
  priorReconciledQuantity: amount,
  pendingQuantity: amount,
  receivedQuantity: amount,
  returnedQuantity: amount,
  missingQuantity: amount,
  unknownQuantity: amount,
  movementIds: z.array(z.uuid()).optional(),
});
const caseRead = z
  .object({
    id: z.uuid(),
    document_id: z.uuid(),
    care_recipient_id: z.uuid(),
    proposed_by: z.uuid(),
    reviewer_id: z.uuid(),
    follow_up_owner_id: z.uuid().nullable(),
    proposed_at: instant,
    reference_version: z.number().int().positive(),
    state: z.enum(["pending", "approved", "rejected", "withdrawn", "obsolete"]),
    before_snapshot: z
      .object({
        version: z.number().int().positive(),
        status: z.string(),
        recipientId: z.uuid().nullable(),
        acceptedBy: z.uuid().nullable(),
        acceptedAt: instant.nullable(),
        receiptName: z.string().nullable(),
        lines: z.array(line),
      })
      .passthrough(),
    proposal: z.object({
      reason: z.string(),
      basis: z.string(),
      lines: z.array(physical),
      unknownQuantity: amount,
      proposedName: z.string(),
      reviewerName: z.string(),
      followUpOwnerName: z.string().nullable(),
      personalReceipt: z.literal(false),
    }),
    decision: z
      .object({
        action: z.string(),
        actorId: z.uuid(),
        actorName: z.string(),
        recordedAt: instant,
        reason: z.string(),
        version: z.number().int().positive(),
        lines: z.array(physical),
      })
      .passthrough()
      .nullable(),
    findings: z.array(
      z
        .object({
          id: z.uuid(),
          actor_id: z.uuid(),
          actor_name: z.string(),
          recorded_at: instant,
          body: z.string(),
        })
        .passthrough(),
    ),
  })
  .passthrough();
const packet = z.object({
  data: z
    .object({
      id: z.uuid(),
      care_recipient_id: z.uuid(),
      type: z.literal("ENT"),
      version: z.number().int().positive(),
      status: z.string(),
      code: z.string().nullable(),
      payload: z.record(z.string(), z.unknown()),
      events: z.array(z.unknown()),
      receipts: z.array(z.unknown()),
      lines: z.array(line).min(1).max(1000),
      deliveryRegularization: z.object({
        recipientAvailable: z.boolean(),
        pendingTransit: amount,
        sourceReady: z.boolean(),
        sourceLines: z.array(
          z.object({
            lineId: z.uuid(),
            quantityDecimals: z.number().int().min(0).max(6).nullable(),
            sourceReady: z.boolean(),
          }),
        ),
        cases: z.array(caseRead),
        currentId: z.uuid().nullable(),
        canPropose: z.boolean(),
        canReview: z.boolean(),
        canApprove: z.boolean(),
        canRecordFinding: z.boolean(),
        canClose: z
          .boolean()
          .nullable()
          .transform((value) => value === true),
        reviewers: z.array(person),
        followUpPeople: z.array(person),
      }),
    })
    .passthrough(),
});
/** Never adopt facts from a malformed200 or a different patient/document. */
export function parseRegularizationReference(
  value: unknown,
  expected: { id: string; patientId: string; minimumVersion: number },
): SupplyDocument {
  const result = packet.safeParse(value);
  if (!result.success)
    throw new Error(
      "A resposta da regularização não pôde ser conferida. Consulte novamente.",
    );
  const row = result.data.data,
    details = row.deliveryRegularization;
  const ids = new Set(row.lines.map((item) => item.id));
  if (
    row.id !== expected.id ||
    row.care_recipient_id !== expected.patientId ||
    row.version < expected.minimumVersion ||
    ids.size !== row.lines.length ||
    new Set(details.cases.map((item) => item.id)).size !==
      details.cases.length ||
    (details.currentId !== null &&
      !details.cases.some((item) => item.id === details.currentId)) ||
    details.cases.some(
      (item) =>
        item.document_id !== row.id ||
        item.care_recipient_id !== row.care_recipient_id,
    ) ||
    details.sourceLines.some((item) => !ids.has(item.lineId)) ||
    (details.sourceReady &&
      (details.sourceLines.length !== ids.size ||
        new Set(details.sourceLines.map((item) => item.lineId)).size !==
          ids.size ||
        details.sourceLines.some(
          (item) => !item.sourceReady || item.quantityDecimals === null,
        )))
  )
    throw new Error(
      "A referência não corresponde à ficha consultada. O preenchimento não foi alterado.",
    );
  return row as SupplyDocument;
}
