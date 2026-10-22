import { z } from "zod";
import { quantity } from "@/lib/quantity";

const identifier = z.string().uuid();
export const exactQuantity = z
  .union([
    z.string().regex(/^\d+(?:[.,]\d{1,6})?$/),
    z.number().finite().min(0).max(1_000_000_000),
  ])
  .transform((value) => quantity(value).toFixed())
  .refine(
    (value) => quantity(value).gte(0) && quantity(value).lte(1_000_000_000),
    "Quantidade inválida.",
  );
const line = z
  .object({
    productId: z.string().min(1).max(120),
    quantity: exactQuantity,
    requisitionItemIds: z.array(identifier).max(100).optional(),
    metadata: z.record(z.string(), z.string().max(500)).optional(),
  })
  .strict();
export const supplyPayload = z
  .object({
    lines: z.array(line).min(1).max(1000),
    notes: z.string().trim().max(2000).optional(),
    origin: z.enum(["purchase", "donation"]).optional(),
    source: z.enum(["FAMILY", "CARE_TEAM"]).optional(),
    destination: z.enum(["FAMILY", "CARE_TEAM"]).optional(),
    recipientId: identifier.optional(),
  })
  .strict();
export const createSupplySchema = z
  .object({
    careRecipientId: identifier,
    type: z.enum(["COM", "ENT", "BAL"]),
    payload: supplyPayload,
    idempotencyKey: identifier,
    draft: z.boolean().default(false),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (
      new Set(value.payload.lines.map((item) => item.productId)).size !==
      value.payload.lines.length
    )
      ctx.addIssue({
        code: "custom",
        path: ["payload", "lines"],
        message: "Não repita produtos.",
      });
    if (value.type !== "BAL")
      value.payload.lines.forEach((item, index) => {
        if (quantity(item.quantity).lte(0))
          ctx.addIssue({
            code: "custom",
            path: ["payload", "lines", index, "quantity"],
            message: "Informe uma quantidade positiva.",
          });
      });
    if (
      value.type === "ENT" &&
      (!value.payload.source ||
        !value.payload.destination ||
        value.payload.source === value.payload.destination ||
        !value.payload.recipientId)
    )
      ctx.addIssue({
        code: "custom",
        path: ["payload", "recipientId"],
        message: "Informe origem, destino e destinatário válidos.",
      });
  });
const commandLines = z
  .array(z.object({ lineId: identifier, quantity: exactQuantity }).strict())
  .min(1)
  .max(1000);
const reason = z.string().trim().min(3).max(1000);
export const supplyCommandSchema = z
  .object({
    action: z.enum([
      "submit",
      "approve",
      "purchase",
      "receive",
      "validate_receipt",
      "reject_receipt",
      "reassign",
      "resolve",
      "cancel",
      "consent_cancel",
    ]),
    idempotencyKey: identifier,
    expectedVersion: z.number().int().positive(),
    body: z.unknown(),
  })
  .strict()
  .transform((value, ctx) => {
    const schemas: Record<string, z.ZodType> = {
      submit: z.object({}).strict(),
      approve: z.union([
        z.object({ lines: commandLines, reason: reason.optional() }).strict(),
        z.object({ group: z.enum(["family", "supervisor"]) }).strict(),
      ]),
      purchase: z
        .object({ lines: commandLines, notes: z.string().max(1000).optional() })
        .strict(),
      receive: z.union([
        z.object({ lines: commandLines }).strict(),
        z
          .object({
            divergences: z
              .array(
                z
                  .object({
                    lineId: identifier,
                    acceptedQuantity: exactQuantity,
                    problem: z.string().max(500).optional(),
                    notes: z.string().max(1000).optional(),
                  })
                  .strict(),
              )
              .max(1000),
          })
          .strict(),
      ]),
      validate_receipt: z.object({ receiptId: identifier }).strict(),
      reject_receipt: z.object({ receiptId: identifier, reason }).strict(),
      reassign: z.object({ recipientId: identifier, reason }).strict(),
      resolve: z
        .object({
          lineId: identifier,
          quantity: exactQuantity,
          resolution: z.enum(["received", "missing", "returned"]),
          reason,
        })
        .strict(),
      cancel: z.object({ reason }).strict(),
      consent_cancel: z
        .object({
          reason,
          lines: z
            .array(
              z
                .object({
                  lineId: identifier,
                  returnQuantity: exactQuantity,
                  consumedQuantity: exactQuantity,
                })
                .strict(),
            )
            .min(1)
            .max(1000),
        })
        .strict(),
    };
    const parsed = schemas[value.action].safeParse(value.body);
    if (!parsed.success) {
      parsed.error.issues.forEach((issue) =>
        ctx.addIssue({
          code: "custom",
          path: ["body", ...issue.path],
          message: issue.message,
        }),
      );
      return z.NEVER;
    }
    return { ...value, body: parsed.data };
  });
