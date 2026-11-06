import { z } from "zod";
import { quantity } from "@/lib/quantity";
import { draftCommitSchema } from "./creation-drafts";

const identifier = z.string().uuid();
export const exactQuantity = z
  .union([
    z
      .string()
      .max(64)
      .regex(/^\d+(?:[.,]\d+)?$/),
    z.number().finite().min(0).max(1_000_000_000),
  ])
  .transform((value) => quantity(value).toFixed())
  .refine(
    (value) =>
      quantity(value).gte(0) &&
      quantity(value).lte(1_000_000_000) &&
      quantity(value).decimalPlaces() <= 6,
    "Informe uma quantidade válida com até seis casas decimais.",
  );
const line = z
  .object({
    productId: z.string().min(1).max(120),
    quantity: exactQuantity,
    requisitionItemIds: z.array(identifier).max(100).optional(),
    metadata: z.record(z.string(), z.string().max(500)).optional(),
    manualQuantity: exactQuantity.optional(),
    presentations: z
      .array(
        z
          .object({
            id: identifier,
            version: z.number().int().positive(),
            packages: z.string().regex(/^[1-9][0-9]{0,8}$/),
          })
          .strict(),
      )
      .min(1)
      .max(100)
      .optional(),
  })
  .strict()
  .refine(
    (value) => !value.manualQuantity || Boolean(value.presentations?.length),
    "A quantidade adicional precisa de uma apresentação.",
  )
  .refine(
    (value) =>
      !value.presentations ||
      new Set(value.presentations.map((row) => row.id)).size ===
        value.presentations.length,
    "Selecione cada apresentação uma única vez.",
  );
export const supplyPayload = z
  .object({
    lines: z.array(line).min(1).max(1000),
    notes: z.string().trim().max(2000).optional(),
    origin: z.enum(["purchase", "donation"]).optional(),
    source: z.enum(["FAMILY", "CARE_TEAM"]).optional(),
    destination: z.enum(["FAMILY", "CARE_TEAM"]).optional(),
    recipientId: identifier.optional(),
    recipientReason: z
      .string()
      .trim()
      .max(1000)
      .refine((value) => !value || value.length >= 3)
      .optional(),
    recipientReference: z
      .string()
      .regex(/^[0-9a-f]{64}$/)
      .optional(),
    balanceAssignment: z
      .object({
        id: identifier,
        version: z.number().int().positive(),
        referenceRevision: z.string().regex(/^\d+$/).max(20),
      })
      .strict()
      .optional(),
    balanceReferenceRevision: z.string().regex(/^\d+$/).max(20).optional(),
  })
  .strict();
export const createSupplySchema = z
  .object({
    careRecipientId: identifier,
    type: z.enum(["COM", "ENT", "BAL"]),
    payload: supplyPayload,
    idempotencyKey: identifier,
    draft: z.boolean().default(false),
    draftCommit: draftCommitSchema.optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (
      value.payload.balanceReferenceRevision !== undefined &&
      (value.type !== "BAL" || value.payload.balanceAssignment)
    )
      ctx.addIssue({
        code: "custom",
        path: ["payload", "balanceReferenceRevision"],
        message:
          "A referência sem plantão pertence somente à contagem BAL sem atribuição.",
      });
    if (value.draftCommit && (value.type !== "BAL" || value.draft))
      ctx.addIssue({
        code: "custom",
        path: ["draftCommit"],
        message:
          "Este rascunho confirma somente o balanço; salvar preenchimento usa o fluxo privado.",
      });
    if (
      value.type === "BAL" &&
      value.payload.lines.some(
        (line) => line.presentations || line.manualQuantity !== undefined,
      )
    )
      ctx.addIssue({
        code: "custom",
        path: ["payload", "lines"],
        message: "O balanço registra a contagem física na unidade base.",
      });
    if (value.type === "COM" && !value.draft && !value.payload.origin)
      ctx.addIssue({
        code: "custom",
        path: ["payload", "origin"],
        message: "Escolha compra ou doação antes de emitir a ficha.",
      });
    if (value.type !== "BAL" && value.payload.balanceAssignment)
      ctx.addIssue({
        code: "custom",
        path: ["payload", "balanceAssignment"],
        message: "A atribuição de contagem pertence somente ao BAL.",
      });
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
      "close_expectation",
      "reassign",
      "resolve",
      "cancel",
      "consent_cancel",
      "refuse_cancellation",
      "withdraw_cancellation",
      "propose_regularization",
      "review_regularization",
      "withdraw_regularization",
      "record_regularization_finding",
    ]),
    idempotencyKey: identifier,
    expectedVersion: z.number().int().positive(),
    body: z.unknown(),
  })
  .strict()
  .transform((value, ctx) => {
    const schemas: Record<string, z.ZodType> = {
      propose_regularization: z
        .object({
          reason,
          basis: z.string().trim().min(3).max(2000),
          reviewerId: identifier,
          followUpOwnerId: identifier.optional(),
          lines: z
            .array(
              z
                .object({
                  lineId: identifier,
                  receivedQuantity: exactQuantity,
                  returnedQuantity: exactQuantity,
                  missingQuantity: exactQuantity,
                })
                .strict(),
            )
            .min(1)
            .max(1000),
        })
        .strict(),
      review_regularization: z
        .object({ caseId: identifier, accept: z.boolean(), reason })
        .strict(),
      withdraw_regularization: z
        .object({ caseId: identifier, reason })
        .strict(),
      record_regularization_finding: z
        .object({
          caseId: identifier,
          text: z.string().trim().min(3).max(2000),
        })
        .strict(),
      submit: z.object({}).strict(),
      approve: z.union([
        z.object({ lines: commandLines, reason: reason.optional() }).strict(),
        z
          .object({
            group: z.enum(["family", "supervisor"]),
            // Match textarea maxlength and the database's UTF-16 limit; Zod max counts code points.
            comment: z
              .string()
              .refine(
                (value) => value.length <= 2000,
                "O parecer permite até 2.000 caracteres.",
              )
              .optional(),
            reviewReference: z
              .string()
              .regex(/^[0-9a-f]{64}$/)
              .optional(),
          })
          .strict(),
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
      close_expectation: z
        .object({ reason, confirmed: z.literal(true) })
        .strict(),
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
      refuse_cancellation: z.object({ reason, requestId: identifier }).strict(),
      withdraw_cancellation: z
        .object({ reason, requestId: identifier })
        .strict(),
      consent_cancel: z
        .object({
          reason,
          requestId: identifier,
          referenceHash: z.string().regex(/^[0-9a-f]{64}$/),
          lines: z
            .array(
              z
                .object({
                  lineId: identifier,
                  returnQuantity: exactQuantity,
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
