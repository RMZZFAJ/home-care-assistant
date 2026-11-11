import { z } from "zod";

export const catalogueScope = z.strictObject({
  patientId: z.uuid(),
  mode: z.enum(["patient", "global"]),
  purpose: z.enum(["create", "edit", "adopt"]),
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

export const catalogueAttempt = catalogueScope.extend({
  action: z.enum(["save", "commit", "discard", "acknowledge"]),
  key: z.uuid(),
  id: z.uuid().nullable(),
  revision: z.number().int().min(0).max(2_147_483_646),
  fields: z.union([catalogueProductFields, modelFields]).nullable(),
  referenceHash: z.string().regex(/^[a-f0-9]{64}$/).nullable(),
}).superRefine((input, ctx) => {
  const writing = input.action === "save" || input.action === "commit";
  if ((input.targetId !== null) !== (input.purpose === "edit")
    || (input.id === null) !== (input.revision === 0)
    || (input.fields !== null) !== writing || (input.referenceHash !== null) !== writing
    || (!writing && !input.id)
    || (input.fields && ("modelId" in input.fields) !== (input.purpose === "adopt"))) {
    ctx.addIssue({ code: "custom", message: "Confira a ação e a revisão deste preenchimento." });
  }
});

export type CatalogueScope = z.infer<typeof catalogueScope>;
export type CatalogueAttempt = z.infer<typeof catalogueAttempt>;
export type CatalogueFields = z.infer<typeof catalogueProductFields>;
export type CatalogueOutcome = { productId: string } | { proposalId: string };

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
export type CatalogueSnapshot = { draft: CatalogueDraft | null; reference: CatalogueReference };

export const catalogueReceipt = catalogueScope.extend({
  key: z.uuid(),
  ownerId: z.uuid(),
  action: catalogueAttempt.shape.action,
  id: z.uuid(),
  revision: z.number().int().positive(),
  state: z.enum(["active", "consumed", "discarded", "acknowledged"]),
  outcome: z.union([
    z.strictObject({ productId: z.string().min(1).max(120) }),
    z.strictObject({ proposalId: z.uuid() }),
  ]).nullable(),
});

export type CatalogueReceipt = z.infer<typeof catalogueReceipt>;
