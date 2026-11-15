import { z } from "zod";
const flowPreparationPurposes = ["flow_review"] as const;
import { flowPreparationCommandSchema } from "@/lib/validation/flow-preparations";
import { createPrivatePreparationRoutes } from "@/lib/server/private-preparation-routes";
const scope = z
  .object({
    careRecipientId: z.uuid(),
    purpose: z.enum(flowPreparationPurposes),
    targetResourceId: z.uuid(),
  })
  .strict();
export const { GET, POST } = createPrivatePreparationRoutes({
  operation: "flow.preparation", rpcPrefix: "flow_preparation", scope, command: flowPreparationCommandSchema,
});
