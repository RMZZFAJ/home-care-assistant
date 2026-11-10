import { z } from "zod";
import { exactQuantity } from "./exact-quantity";

export const familyStockMovementSchema = z
  .object({
    careRecipientId: z.string().uuid(),
    productId: z.string().trim().min(1).max(120),
    quantity: exactQuantity.refine(
      (value) => Number(value) > 0,
      "Informe uma quantidade positiva.",
    ),
    action: z.enum(["inbound", "outbound", "correction_in", "correction_out"]),
    reason: z.string().trim().min(3).max(1000),
    idempotencyKey: z.string().uuid(),
    referenceId: z.string().uuid().optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.action.startsWith("correction") !== Boolean(value.referenceId))
      ctx.addIssue({
        code: "custom",
        path: ["referenceId"],
        message:
          "Uma correção exige o movimento original; entradas e retiradas avulsas usam seu próprio motivo.",
      });
  });
