import { z } from "zod";
import { balanceApplicationBody } from "./balance-application";
import { balanceReviewItems } from "./balance-review-items";
import { quantity } from "@/lib/quantity";
import { exactQuantity } from "./exact-quantity";
export { exactQuantity } from "./exact-quantity";
import { draftCommitSchema } from "./creation-drafts";
import { supplySourceLinks } from "./supply-sources";
import { purchaseCommandBody } from "./purchase-command";
import { purchaseArrivalBody } from "./purchase-arrival";
import { issuedObservations } from "./issuance-observations";
import { pendingPurchaseExtras } from "./pending-purchase-extras";
import { issuedBalanceExtras } from "./balance-count-extras";
import { countedDeliveryReceiptBody, deliveryResolutionBody, requestDeliveryNeedBody, supplyCancellationBody } from "./delivery-receipt";

const identifier = z.string().uuid();
const line = z
  .object({
    productId: z.string().min(1).max(120),
    quantity: exactQuantity,
    requisitionItemIds: z.array(identifier).max(100).optional(),
    requestFulfillment: z.enum(["partial", "complete"]).optional(),
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
    lines: z.array(line).max(1000),
    pendingExtras: pendingPurchaseExtras.optional(),
    balanceExtras: issuedBalanceExtras.optional(),
    notes: z.string().trim().max(2000).optional(),
    observations: issuedObservations.optional(),
    origin: z.enum(["purchase", "donation"]).optional(),
    acquisitionMode: z.literal("planned").optional(),
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
        admissionId: identifier.optional(),
      })
      .strict()
      .optional(),
    balanceReferenceRevision: z.string().regex(/^\d+$/).max(20).optional(),
    sources: supplySourceLinks.optional(),
  })
  .strict()
  .refine(value => value.lines.length > 0 || Boolean(value.pendingExtras?.length), {
    path: ["lines"], message: "Selecione ou informe ao menos um item.",
  })
  .refine(value => !(value.origin && value.acquisitionMode), {
    path: ["acquisitionMode"], message: "Use o planejamento ou uma modalidade histórica de aquisição.",
  });
export const reviseSupplySchema = z
  .object({
    payload: supplyPayload,
    idempotencyKey: identifier,
    submissionKey: identifier,
    expectedVersion: z.number().int().positive(),
    recount: z.boolean(),
    submit: z.boolean(),
    draftCommit: draftCommitSchema.optional(),
    draftKind: z.enum(["COM", "ENT", "BAL"]).default("BAL"),
  })
  .strict()
  .refine(value => value.draftKind === "COM" || value.payload.pendingExtras === undefined, {
    path: ["payload", "pendingExtras"], message: "A identificação pendente pertence ao planejamento da COM.",
  })
  .refine(value => value.draftKind === "COM" || value.payload.acquisitionMode === undefined, {
    path: ["payload", "acquisitionMode"], message: "O planejamento da aquisição pertence à COM.",
  })
  .refine(value => value.draftKind === "BAL" || value.payload.balanceExtras === undefined, {
    path: ["payload", "balanceExtras"], message: "As contagens de itens extras pertencem ao BAL.",
  });
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
    if (value.type !== "BAL" && value.payload.balanceExtras !== undefined)
      ctx.addIssue({ code: "custom", path: ["payload", "balanceExtras"], message: "As contagens de itens extras pertencem ao BAL." });
    if (value.type !== "COM" && value.payload.pendingExtras !== undefined)
      ctx.addIssue({
        code: "custom", path: ["payload", "pendingExtras"],
        message: "A identificação pendente pertence ao planejamento da COM.",
      });
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
    if (value.draftCommit && value.draft)
      ctx.addIssue({
        code: "custom",
        path: ["draftCommit"],
        message:
          "Salvar preenchimento usa o fluxo privado; a confirmação emite a ficha.",
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
    if (value.type !== "COM" && value.payload.acquisitionMode)
      ctx.addIssue({
        code: "custom", path: ["payload", "acquisitionMode"],
        message: "O planejamento da aquisição pertence à COM.",
      });
    if (value.type === "COM" && !value.draft && !value.payload.origin && !value.payload.acquisitionMode)
      ctx.addIssue({
        code: "custom",
        path: ["payload", "acquisitionMode"],
        message: "Informe que esta ficha registra um planejamento de aquisição.",
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
export const purchaseApprovalBody = z.object({ lines: commandLines, reason: reason.optional() }).strict();
export const supplyCommandSchema = z
  .object({
    action: z.enum([
      "submit",
      "approve",
      "apply_balance",
      "purchase",
      "receive",
      "validate_receipt",
      "reject_receipt",
      "close_expectation",
      "resolve_purchase_extra",
      "reassign",
      "resolve",
      "request_fulfillment_review",
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
    draftCommit: draftCommitSchema.optional(),
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
      apply_balance: balanceApplicationBody,
      approve: z.union([
        purchaseApprovalBody,
        z
          .object({
            group: z.enum(["family", "supervisor"]),
            // Match textarea maxlength and the database's UTF-16 limit; Zod max counts code points.
            comment: z
              .string()
              .refine(
                (value) => value.length <= 2000,
                "A revisão permite até 2.000 caracteres.",
              )
              .optional(),
            reviewReference: z
              .string()
              .regex(/^[0-9a-f]{64}$/)
              .optional(),
            items: balanceReviewItems.optional(),
          })
          .strict(),
      ]),
      purchase: purchaseCommandBody,
      receive: z.union([
        purchaseArrivalBody,
        countedDeliveryReceiptBody,
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
      resolve_purchase_extra: z.strictObject({ extraId: identifier, productId: z.string().min(1).max(120) }),
      reassign: z.object({ recipientId: identifier, reason }).strict(),
      resolve: deliveryResolutionBody,
      request_fulfillment_review: requestDeliveryNeedBody,
      cancel: supplyCancellationBody,
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
