import { z } from "zod";

export const issuanceReconciliationReceipt = z.discriminatedUnion("state", [
  z.object({ state: z.literal("applied"), documentId: z.uuid() }).strict(),
  z.object({ state: z.literal("not_applied"), draftSaved: z.boolean() }).strict(),
]);
