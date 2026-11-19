import { z } from "zod";
import { extraMaterialCategories, extraMaterialUnits } from "@/lib/documents/extra-material-identity";

const details = z.string().trim().max(400).optional();

export const extraMaterialIdentity = z.object({
  category: z.enum(extraMaterialCategories),
  unit: z.enum(extraMaterialUnits),
  details,
}).strict();

export const catalogueExtra = z.strictObject({ details });
