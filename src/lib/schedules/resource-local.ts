import { z } from "zod";
import {
  scheduleResourcePurposeSchema,
  scheduleResourceFieldsSchema,
  scheduleResourcePurpose,
  isScheduleResourcePurpose,
  type ScheduleResourcePurpose,
} from "./resource-preparations";
import {
  scheduleResourceCommitSchema,
  scheduleResourceFieldsMatchCommand,
} from "../validation/schedule-resource-preparations";
import { creationDraftCommandSchema } from "../validation/creation-drafts";
const identity = {
  userId: z.uuid(),
  patientId: z.uuid(),
  purpose: scheduleResourcePurposeSchema,
  targetResourceId: z.uuid(),
  fields: scheduleResourceFieldsSchema,
};
export const scheduleResourceStoredSchema = z.discriminatedUnion("mode", [
  z.object({ ...identity, mode: z.literal("carry") }).strict(),
  z
    .object({
      ...identity,
      mode: z.literal("pending"),
      packet: scheduleResourceCommitSchema,
      sourceTimezone: z.string().min(1).max(80).nullable(),
      resolutionKey: z.uuid().optional(),
    })
    .strict(),
]);
export type ScheduleResourceStored = z.infer<
  typeof scheduleResourceStoredSchema
>;
type Stored = ScheduleResourceStored;
/** Compare the validated intent, independently of JSON property insertion order. */
export function scheduleResourceLocalMatches(
  a: Stored | null,
  b: Stored | null,
) {
  if (a === null || b === null) return a === b;
  return (
    JSON.stringify(scheduleResourceStoredSchema.parse(a)) ===
    JSON.stringify(scheduleResourceStoredSchema.parse(b))
  );
}
export function loadScheduleResourceLocal(
  storage: Pick<Storage, "getItem">,
  key: string,
  userId: string,
  patientId: string,
  purpose: ScheduleResourcePurpose,
  target: string,
): { value: Stored | null; error: string } {
  try {
    const raw = storage.getItem(key);
    if (!raw) return { value: null, error: "" };
    const v = scheduleResourceStoredSchema.parse(JSON.parse(raw));
    if (
      v.userId !== userId ||
      v.patientId !== patientId ||
      v.purpose !== purpose ||
      v.targetResourceId !== target ||
      scheduleResourcePurpose(v.fields) !== purpose
    )
      throw Error("Wrong scope");
    if (
      v.mode === "pending" &&
      (v.packet.careRecipientId !== patientId ||
        v.packet.purpose !== purpose ||
        v.packet.targetResourceId !== target ||
        v.resolutionKey === v.packet.idempotencyKey ||
        !scheduleResourceFieldsMatchCommand(
          v.fields,
          v.packet.command,
          target,
          v.sourceTimezone,
        ))
    )
      throw Error("Wrong preserved intent");
    return { value: v, error: "" };
  } catch {
    return {
      value: null,
      error:
        "Não foi possível conferir a referência guardada neste aparelho. Ela foi preservada; nenhum envio foi realizado.",
    };
  }
}

export const scheduleResourceLocalKey = (
  user: string,
  patient: string,
  purpose: string,
  target: string,
) => `hca:schedule-resource:${user}:${patient}:${purpose}:${target}`;
export function localScheduleResourceScopes(
  storage: Pick<Storage, "length" | "key" | "getItem">,
  user: string,
  patient: string,
) {
  const found = new Map<
    string,
    { purpose: ScheduleResourcePurpose; target: string; damaged: boolean }
  >();
  const native = `hca:schedule-resource:${user}:${patient}:`,
    commands = `hca:private-draft-command:${user}:${patient}:SCHEDULE:new:`;
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (!key) continue;
    const prefix = key.startsWith(native)
      ? native
      : key.startsWith(commands)
        ? commands
        : null;
    if (!prefix) continue;
    const [purpose, target, ...rest] = key.slice(prefix.length).split(":");
    if (
      rest.length ||
      !isScheduleResourcePurpose(purpose) ||
      !z.uuid().safeParse(target).success
    )
      continue;
    if (prefix === native) {
      const read = loadScheduleResourceLocal(
        storage,
        key,
        user,
        patient,
        purpose,
        target,
      );
      found.set(purpose + ":" + target, {
        purpose,
        target,
        damaged: Boolean(read.error),
      });
    } else {
      try {
        const value = creationDraftCommandSchema.parse(
          JSON.parse(storage.getItem(key) ?? "null"),
        );
        if (
          value.kind !== "SCHEDULE" ||
          value.careRecipientId !== patient ||
          value.purpose !== purpose ||
          value.targetResourceId !== target ||
          value.targetDocumentId !== null
        )
          continue;
        found.set(purpose + ":" + target, { purpose, target, damaged: false });
      } catch {
        /* A malformed optional private-command copy cannot authorize navigation or a write. */
      }
    }
  }
  return [...found.values()];
}
