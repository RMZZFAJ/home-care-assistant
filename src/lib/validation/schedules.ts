import { z } from "zod";
const id = z.uuid();
const date = z.iso.date();
const instant = z.iso.datetime({ offset: true });
const reason = z.string().trim().min(3).max(1000);
const person = { professionalId: id.optional(), startsAt: instant.optional(), endsAt: instant.optional() };
export const scheduleBody = z.discriminatedUnion("action", [
  z.object({ action: z.literal("type"), body: z.object({ id: id.optional(), name: z.string().trim().min(2).max(100), startsLocal: z.string().regex(/^\d{2}:\d{2}(?::\d{2})?$/), durationMinutes: z.number().int().min(15).max(1440), active: z.boolean().optional() }).strict() }).strict(),
  z.object({ action: z.literal("series"), body: z.object({ professionalId: id, shiftTypeId: id, timezone: z.string().min(1).max(80), recurrence: z.enum(["once", "weekly", "cycle"]), weekdays: z.array(z.number().int().min(0).max(6)).max(7), workHours: z.union([z.literal(12), z.literal(24)]).optional(), restHours: z.union([z.literal(24), z.literal(36), z.literal(48)]).optional(), anchorDate: date, validUntil: date, notes: z.string().max(2000), reason: reason.optional(), replacesId: id.optional() }).strict() }).strict(),
  z.object({ action: z.enum(["approve", "reject"]), body: z.object({ id, reason: reason.optional() }).strict() }).strict(),
  z.object({ action: z.literal("end_series"), body: z.object({ id, fromDate: date, reason }).strict() }).strict(),
  z.object({ action: z.enum(["change", "propose_change"]), body: z.object({ id, ...person, reason, notes: z.string().max(2000).optional() }).strict() }).strict(),
  z.object({ action: z.literal("cancel"), body: z.object({ id, reason }).strict() }).strict(),
  z.object({ action: z.literal("decide_change"), body: z.object({ id, approve: z.boolean(), reason }).strict() }).strict(),
]);
export const scheduleCommandSchema = z.object({ careRecipientId: id, command: scheduleBody, idempotencyKey: id, expectedVersion: z.number().int().positive().nullable().default(null) }).strict();
export type ScheduleCommand = z.infer<typeof scheduleBody>;
