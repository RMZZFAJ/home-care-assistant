import { z } from "zod";
import { extraMaterialIdentity } from "./extra-material-identity";
import { exactQuantity } from "./exact-quantity";

export const pendingPurchaseExtra = extraMaterialIdentity.extend({
  id: z.uuid(),
  name: z.string().trim().min(1, "Informe o nome do material.").max(200),
  quantity: exactQuantity.refine(value => value !== "0", "Informe uma quantidade acima de zero."),
});

export const pendingPurchaseExtras = z.array(pendingPurchaseExtra).max(20)
  .refine(items => new Set(items.map(item => item.id)).size === items.length,
    "Registre cada item extra uma única vez.");

export type PendingPurchaseExtra = z.infer<typeof pendingPurchaseExtra>;
