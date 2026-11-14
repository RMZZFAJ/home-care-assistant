import { z } from "zod";
import { draftStageIds } from "../forms/draft-navigation";
export const draftNavigationSchema = z.object({ version: z.literal(1), stage: z.enum(draftStageIds) }).strict();
