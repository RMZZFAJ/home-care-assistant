import {
  stockPreparationSaveSchema,
  stockPreparationMutationSchema,
} from "./stock-preparations";
import { z } from "zod";
import {
  balancePreparationSaveSchema,
  balancePreparationMutationSchema,
} from "./balance-preparations";
import { isBalancePreparationPurpose } from "../forms/balance-preparation-purposes";
import { draftNavigationSchema } from "./draft-navigation";
import {
  balanceDocumentPurpose,
  balanceDocumentDraftContent,
} from "./supply-drafts";
import { navigationAllowed } from "../forms/draft-navigation";
import {
  requisitionOperationPurpose,
  requisitionOperationDraftContent,
  draftPurpose,
  entDeclarationPurposes,
  entDeclarationDraftPurpose,
  transferDeclarationDraftContent,
  newSupplyDraftPurposes,
  declarationSourceForPurpose,
  comOperationDraftPurpose,
  comOperationPurposes,
  entDraftPurpose,
  entDraftPurposes,
  receiptDraftContent,
  supplyDraftContent,
} from "./supply-drafts";
const id = z.uuid(),
  revision = z.number().int().positive().max(2147483647);
const text = (max: number) =>
  z
    .string()
    .refine(
      (value) => value.length <= max,
      `Este campo permite até ${max} caracteres.`,
    );
const observation = {
  currentStock: z
    .union([text(64), z.number().finite()])
    .nullable()
    .default(null),
  stockObservation: z
    .enum(["observed", "unknown", "unfilled", "legacy_unclassified"])
    .optional(),
  stockObservationAt: z.iso
    .datetime({ offset: true })
    .max(40)
    .nullable()
    .optional(),
};
export const requisitionDraftContent = z
  .object({
    lines: z
      .array(
        z
          .object({
            productId: text(120).min(1),
            productName: text(200),
            category: z.enum(["medicamentos", "higiene", "dieta"]),
            unit: text(80).optional(),
            ...observation,
            urgent: z.boolean(),
            repeatReason: text(1000).optional(),
          })
          .strict(),
      )
      .max(1000),
    extraItems: z
      .array(
        z
          .object({
            id: text(120).min(1),
            name: text(200),
            ...observation,
            urgent: z.boolean(),
          })
          .strict(),
      )
      .max(20),
    observations: z.array(text(1000)).max(50),
    remainingNeed: z
      .object({ requisitionId: id, version: revision, reason: text(1000) })
      .strict()
      .optional(),
  })
  .strict();
export const balanceDraftContent = z
  .object({
    counts: z
      .record(text(120).min(1), text(64))
      .refine((value) => Object.keys(value).length <= 1000),
    observationTimes: z
      .record(
        text(120).min(1),
        z.iso.datetime({ offset: true }).max(40).nullable(),
      )
      .refine((value) => Object.keys(value).length <= 1000),
    notes: text(3000),
    materials: z
      .array(
        z
          .object({
            id: text(120).min(1),
            name: text(200),
            unit: text(80),
            quantityDecimals: z.number().int().min(0).max(6),
          })
          .strict(),
      )
      .max(1000),
    context: z
      .object({
        mode: z.enum(["legacy", "scheduled"]),
        documentId: id.nullable(),
        documentVersion: revision.nullable(),
        assignmentId: id.nullable(),
        assignmentVersion: revision.nullable(),
        referenceRevision: z.string().regex(/^\d+$/).max(20).nullable(),
      })
      .strict(),
  })
  .strict();
const scope = {
  careRecipientId: id,
  targetDocumentId: id.nullable(),
  id: id.nullable(),
  expectedRevision: revision.nullable(),
  idempotencyKey: id,
};
const navigation = { navigation: draftNavigationSchema.optional() };
export const creationDraftCommandSchema = z
  .union([
    stockPreparationSaveSchema,
    stockPreparationMutationSchema,
    balancePreparationSaveSchema.strict(),
    balancePreparationMutationSchema,
    z
      .object({
        ...scope,
        ...navigation,
        kind: z.literal("BAL"),
        purpose: balanceDocumentPurpose,
        action: z.literal("save"),
        content: balanceDocumentDraftContent,
      })
      .strict(),
    z
      .object({
        ...scope,
        kind: z.literal("BAL"),
        purpose: balanceDocumentPurpose,
        action: z.enum(["discard", "acknowledge"]),
      })
      .strict(),
    z
      .object({
        ...scope,
        ...navigation,
        kind: z.literal("REQ"),
        purpose: requisitionOperationPurpose,
        action: z.literal("save"),
        content: requisitionOperationDraftContent,
      })
      .strict(),
    z
      .object({
        ...scope,
        kind: z.literal("REQ"),
        purpose: requisitionOperationPurpose,
        action: z.enum(["discard", "acknowledge"]),
      })
      .strict(),
    z
      .object({
        ...scope,
        ...navigation,
        kind: z.enum(["COM", "ENT"]),
        purpose: z.enum(["create", "revise"]),
        action: z.literal("save"),
        content: supplyDraftContent,
      })
      .strict(),
    z
      .object({
        ...scope,
        ...navigation,
        kind: z.literal("ENT"),
        purpose: entDraftPurpose.exclude(entDeclarationPurposes),
        action: z.literal("save"),
        content: receiptDraftContent,
      })
      .strict(),
    z
      .object({
        ...scope,
        ...navigation,
        kind: z.literal("ENT"),
        purpose: entDeclarationDraftPurpose,
        action: z.literal("save"),
        content: transferDeclarationDraftContent,
      })
      .strict(),
    z
      .object({
        ...scope,
        ...navigation,
        kind: z.literal("COM"),
        purpose: comOperationDraftPurpose,
        action: z.literal("save"),
        content: receiptDraftContent,
      })
      .strict(),
    z
      .object({
        ...scope,
        kind: z.enum(["COM", "ENT"]),
        purpose: draftPurpose,
        action: z.enum(["discard", "acknowledge"]),
      })
      .strict(),
    z
      .object({
        ...scope,
        kind: z.literal("REQ"),
        ...navigation,
        action: z.literal("save"),
        content: requisitionDraftContent,
      })
      .strict(),
    z
      .object({
        ...scope,
        kind: z.literal("BAL"),
        ...navigation,
        action: z.literal("save"),
        content: balanceDraftContent,
      })
      .strict(),
    z
      .object({
        ...scope,
        kind: z.enum(["REQ", "BAL"]),
        action: z.enum(["discard", "acknowledge"]),
      })
      .strict(),
  ])
  .superRefine((value, ctx) => {
    if (
      value.kind === "STOCK" &&
      value.targetResourceId !== value.careRecipientId
    )
      ctx.addIssue({
        code: "custom",
        path: ["targetResourceId"],
        message: "O preenchimento pertence ao paciente selecionado.",
      });
    if (
      value.kind === "BAL" &&
      "purpose" in value &&
      isBalancePreparationPurpose(value.purpose) &&
      "targetResourceId" in value &&
      value.purpose === "configure" &&
      value.targetResourceId !== value.careRecipientId
    )
      ctx.addIssue({
        code: "custom",
        path: ["targetResourceId"],
        message: "A programação pertence ao paciente selecionado.",
      });
    if (
      value.action === "save" &&
      !navigationAllowed(
        value.kind,
        "purpose" in value ? value.purpose : "create",
        value.navigation,
        value.content,
      )
    )
      ctx.addIssue({
        code: "custom",
        path: ["navigation"],
        message:
          "A etapa salva não corresponde ao formulário de origem. Consulte o rascunho novamente.",
      });
    if (
      (value.kind === "COM" || value.kind === "ENT") &&
      (newSupplyDraftPurposes.includes(value.purpose) !==
        (value.targetDocumentId === null) ||
        (value.kind === "COM" &&
          !["create", "revise", ...comOperationPurposes].includes(
            value.purpose,
          )) ||
        (value.kind === "ENT" &&
          !["create", "revise", ...entDraftPurposes].includes(value.purpose)))
    )
      ctx.addIssue({
        code: "custom",
        path: ["targetDocumentId"],
        message: "Confira a intenção e o alvo deste preenchimento.",
      });
    if (
      value.kind === "ENT" &&
      value.action === "save" &&
      declarationSourceForPurpose(value.purpose) &&
      (!("fields" in value.content) ||
        value.content.fields.source !==
          declarationSourceForPurpose(value.purpose) ||
        value.content.documentVersion !== null ||
        value.content.divergentIds.length)
    )
      ctx.addIssue({
        code: "custom",
        path: ["content"],
        message:
          "Confira a custódia e as referências desta declaração privada.",
      });
    if (
      (value.kind === "COM" || value.kind === "ENT") &&
      value.action === "save" &&
      "form" in value.content &&
      value.content.context.documentId !== value.targetDocumentId
    )
      ctx.addIssue({
        code: "custom",
        path: ["content", "context"],
        message: "A ficha de referência precisa corresponder ao preenchimento.",
      });
    if (
      (value.id === null) !== (value.expectedRevision === null) ||
      (value.action !== "save" && value.id === null) ||
      (value.kind === "REQ" &&
        ("purpose" in value
          ? value.targetDocumentId === null
          : value.targetDocumentId !== null)) ||
      (value.kind === "BAL" &&
        "purpose" in value &&
        !isBalancePreparationPurpose(value.purpose) &&
        value.targetDocumentId === null)
    )
      ctx.addIssue({
        code: "custom",
        message: "Confira a identidade e a revisão do seu rascunho.",
      });
    if (
      value.kind === "BAL" &&
      !("purpose" in value) &&
      value.action === "save" &&
      value.content.context.documentId !== value.targetDocumentId
    )
      ctx.addIssue({
        code: "custom",
        path: ["content", "context"],
        message: "O balanço do preenchimento precisa corresponder ao rascunho.",
      });
  });
export const draftCommitSchema = z.object({ id, revision }).strict();
export type RequisitionDraftContent = z.infer<typeof requisitionDraftContent>;
export type BalanceDraftContent = z.infer<typeof balanceDraftContent>;
