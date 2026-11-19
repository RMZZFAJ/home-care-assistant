import { z } from "zod";
import { extraMaterialCategories, extraMaterialUnits } from "@/lib/documents/extra-material-identity";

export const extraMaterialIdentity = z.object({
  category: z.enum(extraMaterialCategories),
  unit: z.enum(extraMaterialUnits),
  details: z.string().trim().max(400).optional(),
}).strict();
