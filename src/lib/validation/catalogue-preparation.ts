import { z } from "zod";

export const catalogueReceiptScope = z.strictObject({
  patientId: z.uuid().nullable(),
  mode: z.enum(["patient", "global"]),
});

export const catalogueScope = catalogueReceiptScope.extend({
  purpose: z.enum(["create", "edit", "adopt", "unit_create", "unit_configure", "presentation_create", "presentation_edit", "identity"]),
  targetId: z.string().min(1).max(120).nullable(),
});

const catalogueProductFields = z.strictObject({
  name: z.string().max(160),
  category: z.enum(["medicamentos", "higiene", "dieta"]),
  unit: z.string().max(30),
  aliases: z.string().max(4900),
  description: z.string().max(2000),
  sortOrder: z.string().max(24),
  isActive: z.boolean(),
});
const modelFields = z.strictObject({ modelId: z.string().max(120) });
const unitFields = z.strictObject({
  code: z.string().max(30), name: z.string().max(80),
  dimension: z.enum(["count", "volume", "mass", "package"]), decimals: z.string().max(16),
});
const precisionFields = z.strictObject({ productId: z.string().max(120), unit: z.string().max(30), decimals: z.string().max(16) });
const presentationFields = z.strictObject({
  productId: z.string().max(120), name: z.string().max(160), barcode: z.string().max(14),
  factor: z.string().max(64), active: z.boolean(),
});
const identityFields = z.strictObject({
  identityAction: z.enum(["", "retire", "reactivate", "clear_successor"]), successorId: z.string().max(120), reason: z.string().max(1000),
});

const fieldsByPurpose = {
  create: catalogueProductFields, edit: catalogueProductFields, adopt: modelFields,
  unit_create: unitFields, unit_configure: precisionFields,
  presentation_create: presentationFields, presentation_edit: presentationFields, identity: identityFields,
};

export function validCatalogueScope(scope: z.infer<typeof catalogueScope>) {
  return (scope.targetId !== null) === ["edit", "presentation_edit", "identity"].includes(scope.purpose)
    && (scope.purpose !== "presentation_edit" || (z.uuid().safeParse(scope.targetId).success && scope.targetId === scope.targetId?.toLowerCase()))
    && (scope.patientId === null) === (scope.purpose === "unit_create" && scope.mode === "global")
    && (scope.mode === "patient" || ["create", "edit", "adopt", "unit_create"].includes(scope.purpose));
}

export const catalogueAttempt = catalogueScope.extend({
  action: z.enum(["save", "commit", "discard", "acknowledge"]),
  key: z.uuid(),
  id: z.uuid().nullable(),
  revision: z.number().int().min(0).max(2_147_483_646),
  fields: z.union([catalogueProductFields, modelFields, unitFields, precisionFields, presentationFields, identityFields]).nullable(),
  referenceHash: z.string().regex(/^[a-f0-9]{64}$/).nullable(),
}).superRefine((input, ctx) => {
  const writing = input.action === "save" || input.action === "commit";
  if (!validCatalogueScope(input)
    || (input.id === null) !== (input.revision === 0)
    || (input.fields !== null) !== writing || (input.referenceHash !== null) !== writing
    || (!writing && !input.id)
    || (input.fields && !fieldsByPurpose[input.purpose].safeParse(input.fields).success)) {
    ctx.addIssue({ code: "custom", message: "Confira a ação e a revisão deste preenchimento." });
  }
});

export type CatalogueScope = z.infer<typeof catalogueScope>;
export type CatalogueAttempt = z.infer<typeof catalogueAttempt>;
export type CatalogueFields = z.infer<typeof catalogueProductFields>;
export type CatalogueInput = NonNullable<CatalogueAttempt["fields"]>;
export type UnitFields = z.infer<typeof unitFields>;
export type PrecisionFields = z.infer<typeof precisionFields>;
export type PresentationFields = z.infer<typeof presentationFields>;
export type IdentityFields = z.infer<typeof identityFields>;

export type CatalogueDraft = {
  id: string;
  revision: number;
  savedAt: string;
} & (
  | { state: "active"; fields: NonNullable<CatalogueAttempt["fields"]>; referenceHash: string; outcome: null }
  | { state: "consumed"; fields: null; referenceHash: null; outcome: CatalogueOutcome }
);

export type CatalogueReference = { item: Record<string, unknown> | null; hash: string }
  | { models: { id: string; name: string; unit: string; category: CatalogueFields["category"]; aliases: string[]; hash: string }[] };
const catalogueProductId = z.string().min(1).max(120);
const outcome = z.union([
  z.strictObject({ productId: catalogueProductId }),
  z.strictObject({ proposalId: z.uuid() }),
  z.strictObject({ unitId: z.uuid() }),
  z.strictObject({ presentationId: z.uuid(), productId: catalogueProductId, version: z.number().int().positive() }),
  z.strictObject({ eventId: z.uuid(), productId: catalogueProductId, actorName: z.string(),
    identityAction: z.enum(["retire", "reactivate", "clear_successor"]) }),
]);
export type CatalogueOutcome = z.infer<typeof outcome>;

export const catalogueReceipt = catalogueScope.extend({
  key: z.uuid(),
  ownerId: z.uuid(),
  action: catalogueAttempt.shape.action,
  id: z.uuid(),
  revision: z.number().int().positive(),
  state: z.enum(["active", "consumed", "discarded", "acknowledged"]),
  outcome: outcome.nullable(),
});

export type CatalogueReceipt = z.infer<typeof catalogueReceipt>;

export const catalogueReceiptHistory = catalogueReceiptScope.extend({
  ownerId: z.uuid(),
  next: z.uuid().nullable(),
  entries: z.array(z.strictObject({
    id: z.uuid(),
    purpose: catalogueScope.shape.purpose,
    outcome,
    confirmedAt: z.iso.datetime({ offset: true }).nullable(),
    currentName: z.string().nullable(),
  })).max(15),
});

export type CatalogueReceiptScope = z.infer<typeof catalogueReceiptScope>;
export type CatalogueReceiptHistory = z.infer<typeof catalogueReceiptHistory>;

export function verifyCatalogueReceipt(userId: string, attempt: CatalogueAttempt, value: unknown) {
  const parsed = catalogueReceipt.safeParse(value);
  if (!parsed.success) throw new Error("Não foi possível conferir o comprovante desta tentativa.");
  const result = parsed.data;
  const stages = { save: "active", commit: "consumed", discard: "discarded", acknowledge: "acknowledged" } as const;
  if (result.ownerId !== userId || result.patientId !== attempt.patientId || result.mode !== attempt.mode
    || result.purpose !== attempt.purpose || result.targetId !== attempt.targetId || result.key !== attempt.key
    || result.action !== attempt.action || result.state !== stages[attempt.action]
    || (attempt.id !== null && attempt.id !== result.id) || result.revision !== attempt.revision + 1
    || ((attempt.action === "commit" || attempt.action === "acknowledge") !== (result.outcome !== null))
    || (result.outcome && !matchesCatalogueOutcome(attempt, result.outcome))) {
    throw new Error("O comprovante recebido não corresponde a esta tentativa.");
  }
  return result;
}

function matchesCatalogueOutcome(attempt: CatalogueAttempt, result: CatalogueOutcome) {
  const { fields, purpose, targetId, mode } = attempt;
  if (purpose === "unit_create") return "unitId" in result;
  if (mode === "global") return "proposalId" in result;
  if (!("productId" in result)) return false;
  if (purpose === "identity") return "eventId" in result && result.productId === targetId
    && (!fields || ("identityAction" in fields && result.identityAction === fields.identityAction));
  if (purpose === "presentation_create" || purpose === "presentation_edit")
    return "presentationId" in result && (purpose !== "presentation_edit" || result.presentationId === targetId)
      && (!fields || ("productId" in fields && result.productId === fields.productId));
  if ("eventId" in result || "presentationId" in result) return false;
  if (purpose === "edit") return result.productId === targetId;
  if (!fields) return true;
  if (purpose === "adopt") return "modelId" in fields && result.productId === fields.modelId;
  if (purpose === "unit_configure") return "productId" in fields && result.productId === fields.productId;
  return purpose === "create";
}

export function catalogueCommitFor(...purposes: CatalogueScope["purpose"][]) {
  return z.strictObject({
    cataloguePreparation: catalogueAttempt.refine(attempt =>
      attempt.action === "commit" && purposes.includes(attempt.purpose)),
  });
}
