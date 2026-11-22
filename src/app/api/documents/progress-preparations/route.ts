import { z } from "zod";
import { progressPreparationCommandSchema } from "@/lib/validation/progress-preparations";
import { createPrivatePreparationRoutes } from "@/lib/server/private-preparation-routes";
const scope = z
  .object({
    careRecipientId: z.uuid(),
    purpose: z.literal("progress_note"),
    targetResourceId: z.uuid(),
  })
  .strict();
export const { GET, POST } = createPrivatePreparationRoutes({
  operation: "progress.preparation", rpcPrefix: "progress_preparation", scope, command: progressPreparationCommandSchema, cacheControl: "private, no-store",
});
