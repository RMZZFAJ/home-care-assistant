import { z } from "zod";

const amount = z
  .string()
  .max(40)
  .regex(/^\d+(?:\.\d{1,6})?$/);
const request = z.object({
  id: z.uuid(),
  source: z.enum(["server_record", "legacy_event"]),
  requestedBy: z.uuid().nullable(),
  requestedName: z.string().nullable(),
  requestedAt: z.iso.datetime({ offset: true }),
  requestedVersion: z.number().int().positive(),
  previousStatus: z.string().nullable(),
  reason: z.string(),
  status: z.enum(["pending", "consented", "refused", "withdrawn"]),
});
const line = z.object({
  lineId: z.uuid(),
  productId: z.string().min(1).max(120),
  name: z.string(),
  unit: z.string(),
  acceptedQuantity: amount,
  availableConsumedQuantity: amount.optional(),
  minimumReturnQuantity: amount.optional(),
  quantityDecimals: z.number().int().min(0).max(6).optional(),
  consumptionReferences: z.array(
    z.object({
      movementId: z.uuid(),
      reportId: z.uuid(),
      recordedAt: z.iso.datetime({ offset: true }),
      quantity: amount,
    }),
  ),
});
const packet = z.object({
  data: z.object({
    id: z.uuid(),
    care_recipient_id: z.uuid(),
    type: z.literal("ENT"),
    version: z.number().int().positive(),
    deliveryCancellation: z.object({
      request,
      lines: z.array(line).max(1000),
      sourceReady: z.boolean(),
      sourceAccess: z.boolean().optional(),
      unresolvedTransit: amount.optional(),
      referenceHash: z
        .string()
        .regex(/^[a-f0-9]{64}$/)
        .nullable(),
    }),
  }),
});
export type ConsentReference = z.infer<
  typeof packet
>["data"]["deliveryCancellation"];
export type ConsentReferenceExpectation = {
  id: string;
  patientId: string;
  version: number;
  requestId: string | undefined;
  referenceHash: string | null | undefined;
  lineIds: readonly string[];
};

/** A fresh source read must describe exactly the candidate the user is comparing. */
export function parseConsentReference(
  value: unknown,
  expected: ConsentReferenceExpectation,
): ConsentReference {
  const parsed = packet.safeParse(value);
  if (!parsed.success)
    throw new Error(
      "A resposta das referências não pôde ser conferida. Consulte novamente.",
    );
  const row = parsed.data.data,
    reference = row.deliveryCancellation;
  if (
    row.id !== expected.id ||
    row.care_recipient_id !== expected.patientId ||
    row.version !== expected.version ||
    reference.request.id !== expected.requestId ||
    reference.referenceHash !== expected.referenceHash ||
    new Set(reference.lines.map((item) => item.lineId)).size !==
      reference.lines.length ||
    (reference.sourceReady &&
      reference.sourceAccess !== false &&
      (reference.unresolvedTransit === undefined ||
        reference.lines.length !== expected.lineIds.length ||
        reference.lines.some(
          (item) =>
            !expected.lineIds.includes(item.lineId) ||
            item.availableConsumedQuantity === undefined ||
            item.minimumReturnQuantity === undefined ||
            item.quantityDecimals === undefined,
        )))
  )
    throw new Error(
      "A ficha ou as fontes mudaram. Salve seu preenchimento e consulte o pedido e as referências atuais novamente.",
    );
  return reference;
}
