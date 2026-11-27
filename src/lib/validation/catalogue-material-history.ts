import { z } from "zod";

const productId = z.string().min(1).max(120);
export const catalogueMaterialHistoryQuery = z.strictObject({
  careRecipientId: z.uuid(),
  productId,
  page: z.coerce.number().int().min(1).max(10_000).default(1),
});

const materialFields = z.object({ name: z.string(), category: z.string(), unit: z.string() });
const registration = materialFields.extend({
  decimals: z.number().int(),
  aliases: z.array(z.string()),
  description: z.string().nullable(),
  order: z.number().int(),
}).strict();
const identity = z.strictObject({ active: z.boolean(), successorId: productId.nullable() });
const presentation = z.strictObject({
  name: z.string(),
  code: z.string(),
  quantity: z.string(),
  unit: z.string(),
  active: z.boolean(),
});
const event = z.object({
  reference: z.string().min(1).max(80),
  actorName: z.string().nullable(),
  recordedAt: z.iso.datetime({ offset: true }),
});

export const catalogueMaterialHistory = z.strictObject({
  patientId: z.uuid(),
  material: materialFields.extend({ id: productId, active: z.boolean() }).strict(),
  page: z.number().int().positive(),
  hasMore: z.boolean(),
  data: z.array(z.discriminatedUnion("kind", [
    event.extend({ kind: z.literal("registration"), before: registration.nullable(), after: registration }).strict(),
    event.extend({
      kind: z.literal("identity"), action: z.enum(["retire", "reactivate", "clear_successor"]),
      reason: z.string(), before: identity, after: identity,
    }).strict(),
    event.extend({ kind: z.literal("presentation"), version: z.number().int().positive(), before: presentation.nullable(), after: presentation }).strict(),
  ])).max(20),
});

export type CatalogueMaterialHistory = z.infer<typeof catalogueMaterialHistory>;
export type CatalogueMaterialEvent = CatalogueMaterialHistory["data"][number];
