import { z } from "zod";
import { consumptionPreparationPurposes } from "@/lib/forms/consumption-preparation-purposes";
import { consumptionPreparationCommandSchema } from "@/lib/validation/consumption-preparations";
import { createPrivatePreparationRoutes } from "@/lib/server/private-preparation-routes";
const scope = z
  .object({
    careRecipientId: z.uuid(),
    purpose: z.enum(consumptionPreparationPurposes),
    targetResourceId: z.uuid(),
  })
  .strict();
export const { GET, POST } = createPrivatePreparationRoutes({
  operation: "consumption.preparation", rpcPrefix: "consumption_preparation", scope, command: consumptionPreparationCommandSchema,
});
