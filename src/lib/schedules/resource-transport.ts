import { z } from "zod";
import { scheduleResourcePurposeSchema } from "./resource-preparations";
import type { ScheduleResourcePacket } from "../validation/schedule-resource-preparations";
export const scheduleResourceQuery = z
  .object({
    careRecipientId: z.uuid(),
    purpose: scheduleResourcePurposeSchema,
    targetResourceId: z.uuid(),
  })
  .strict();
export function scheduleResourceRpcPacket(v: ScheduleResourcePacket) {
  return {
    p_patient: v.careRecipientId,
    p_purpose: v.purpose,
    p_target: v.targetResourceId,
    p_id: v.draftCommit.id,
    p_expected: v.draftCommit.revision,
    p_key: v.idempotencyKey,
    p_body: {
      command: v.command,
      expectedVersion: v.expectedVersion,
      sourceVersion: v.sourceVersion,
      referenceHash: v.referenceHash,
    },
  };
}
