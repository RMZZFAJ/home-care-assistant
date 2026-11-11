import { z } from "zod";

export const catalogueScope = z.strictObject({
  patientId: z.uuid().nullable(),
  mode: z.enum(["patient", "global"]),
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

export function catalogueCommitFor(...purposes: CatalogueScope["purpose"][]) {
  return z.strictObject({
    cataloguePreparation: catalogueAttempt.refine(attempt =>
      attempt.action === "commit" && purposes.includes(attempt.purpose)),
  });
}
