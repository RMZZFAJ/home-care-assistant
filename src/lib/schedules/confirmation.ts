import { z } from "zod";
import { scheduleCommandSchema } from "@/lib/validation/schedules";

export type SchedulePacket = z.infer<typeof scheduleCommandSchema>;
const envelope = z
  .object({
    version: z.literal(1),
    userId: z.uuid(),
    packet: scheduleCommandSchema,
  })
  .strict();
const scope = {
  careRecipientId: z.uuid(),
  userId: z.uuid(),
  idempotencyKey: z.uuid(),
};
const response = z.discriminatedUnion("found", [
  z.object({ ...scope, found: z.literal(false) }).strict(),
  z
    .object({
      ...scope,
      found: z.literal(true),
      command: scheduleCommandSchema.shape.command,
      expectedVersion: z.number().int().positive().nullable(),
      recordedAt: z.iso.datetime({ offset: true }),
      result: z
        .object({
          id: z.uuid(),
          status: z
            .enum([
              "published",
              "proposed",
              "cancelled",
              "rejected",
              "pending",
              "approved",
              "obsolete",
            ])
            .nullable(),
          version: z.number().int().positive(),
        })
        .strict(),
    })
    .strict(),
]);
export type ScheduleConfirmation = Extract<
  z.infer<typeof response>,
  { found: true }
>;
export const schedulePendingKey = (userId: string, patientId: string) =>
  `hca:schedule-confirmation:${userId}:${patientId}`;
export function sameSchedulePacket(a: SchedulePacket, b: SchedulePacket) {
  // Parsing fixes the object field order;arrays remain significant.
  return (
    JSON.stringify(scheduleCommandSchema.parse(a)) ===
    JSON.stringify(scheduleCommandSchema.parse(b))
  );
}
export function parseSchedulePending(
  raw: string | null,
  userId: string,
  patientId: string,
) {
  if (raw === null) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error(
      "A referência local de escala não pôde ser lida. Nenhuma ação foi enviada.",
    );
  }
  const parsed = envelope.safeParse(value);
  if (
    !parsed.success ||
    parsed.data.userId !== userId ||
    parsed.data.packet.careRecipientId !== patientId
  )
    throw new Error(
      "A referência de confirmação não corresponde à sua conta e ao paciente. Nenhuma ação foi enviada.",
    );
  return parsed.data.packet;
}
export function saveSchedulePending(
  storage: Pick<Storage, "getItem" | "setItem">,
  userId: string,
  packet: SchedulePacket,
) {
  const key = schedulePendingKey(userId, packet.careRecipientId);
  const old = parseSchedulePending(
    storage.getItem(key),
    userId,
    packet.careRecipientId,
  );
  if (old && !sameSchedulePacket(old, packet))
    throw new Error(
      "Há outra tentativa de escala neste aparelho. Recupere-a antes de preparar uma nova ação.",
    );
  if (old) return;
  storage.setItem(key, JSON.stringify({ version: 1, userId, packet }));
}
export function clearSchedulePending(
  storage: Pick<Storage, "getItem" | "removeItem">,
  userId: string,
  packet: SchedulePacket,
) {
  const key = schedulePendingKey(userId, packet.careRecipientId);
  const old = parseSchedulePending(
    storage.getItem(key),
    userId,
    packet.careRecipientId,
  );
  if (old && !sameSchedulePacket(old, packet))
    throw new Error(
      "A referência local mudou. O resultado foi preservado; confira a outra tentativa antes de continuar.",
    );
  storage.removeItem(key);
}
export function parseScheduleConfirmation(
  value: unknown,
  userId: string,
  packet: SchedulePacket,
) {
  const parsed = response.safeParse(value);
  if (
    !parsed.success ||
    parsed.data.userId !== userId ||
    parsed.data.careRecipientId !== packet.careRecipientId ||
    parsed.data.idempotencyKey !== packet.idempotencyKey
  )
    throw new Error(
      "Não foi possível conferir a confirmação desta escala. A mesma tentativa foi preservada.",
    );
  const result = parsed.data;
  if (result.found) {
    const confirmed = {
      careRecipientId: result.careRecipientId,
      idempotencyKey: result.idempotencyKey,
      command: result.command,
      expectedVersion: result.expectedVersion,
    };
    if (
      !sameSchedulePacket(confirmed, packet) ||
      (packet.command.action !== "propose_change" &&
        "id" in packet.command.body &&
        packet.command.body.id &&
        result.result.id !== packet.command.body.id) ||
      (packet.command.action === "type") !== (result.result.status === null)
    )
      throw new Error(
        "A confirmação recebida pertence a outra decisão. A tentativa original foi preservada.",
      );
  }
  return result;
}
