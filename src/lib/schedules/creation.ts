import { z } from "zod";
import { scheduleBody } from "@/lib/validation/schedules";
import type { ScheduleWorkspace, ShiftType } from "@/types/schedules";

const text = (max: number) =>
  z.string().refine((v) => v.length <= max, `Use até ${max} caracteres.`);
const selection = z.union([z.literal(""), z.uuid()]);
const civilDate = z.union([z.literal(""), z.iso.date()]);
export const scheduleCreationPurpose = z.enum([
  "shift_type_create",
  "schedule_series_create",
]);
export const scheduleCreationFields = z.discriminatedUnion("form", [
  z
    .object({
      form: z.literal("type"),
      name: text(100),
      start: text(8).refine((v) =>
        /^(?:|(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?)$/.test(v),
      ),
      duration: text(32).refine((v) =>
        /^(?:|-?(?:\d+(?:\.\d+)?|\.\d+)(?:[eE][+-]?\d+)?)$/.test(v),
      ),
      active: z.boolean(),
    })
    .strict(),
  z
    .object({
      form: z.literal("series"),
      professionalId: selection,
      shiftTypeId: selection,
      shiftTypeVersion: z.number().int().positive().max(2147483647).nullable(),
      recurrence: z.enum(["once", "weekly", "dates", "cycle"]),
      weekdays: z
        .array(z.number().int().min(0).max(6))
        .max(7)
        .refine((v) => new Set(v).size === v.length),
      dates: z
        .array(z.iso.date())
        .max(367)
        .refine((v) => new Set(v).size === v.length),
      cycle: z.enum(["12x36", "24x48", "24x24"]),
      from: civilDate,
      until: civilDate,
      timezone: text(80),
      notes: text(2000),
      reason: text(1000),
    })
    .strict()
    .refine((v) => Boolean(v.shiftTypeId) === (v.shiftTypeVersion !== null)),
]);
export type ScheduleCreationFields = z.infer<typeof scheduleCreationFields>;
export type ScheduleCreationPurpose = z.infer<typeof scheduleCreationPurpose>;
export const scheduleCreationContent = z
  .object({ schedule: scheduleCreationFields })
  .strict();
export type ScheduleCreationContent = z.infer<typeof scheduleCreationContent>;
export function schedulePurpose(
  fields: ScheduleCreationFields,
): ScheduleCreationPurpose {
  return fields.form === "type"
    ? "shift_type_create"
    : "schedule_series_create";
}
export function initialScheduleType(type?: ShiftType): ScheduleCreationFields {
  return {
    form: "type",
    name: type?.name ?? "",
    start: type?.starts_local.slice(0, 5) ?? "07:00",
    duration: String(type?.duration_minutes ?? 720),
    active: type?.is_active ?? true,
  };
}
export function initialScheduleSeries(
  data: ScheduleWorkspace,
  ownId: string,
  team: boolean,
  today: string,
): ScheduleCreationFields {
  const type = data.types.find((t) => t.is_active),
    until = new Date(today + "T12:00:00Z");
  until.setUTCDate(until.getUTCDate() + 28);
  return {
    form: "series",
    professionalId: (team ? data.professionals[0]?.id : ownId) ?? "",
    shiftTypeId: type?.id ?? "",
    shiftTypeVersion: type?.version ?? null,
    recurrence: "weekly",
    weekdays: [1],
    dates: [],
    cycle: "12x36",
    from: today,
    until: until.toISOString().slice(0, 10),
    timezone: "America/Sao_Paulo",
    notes: "",
    reason: "",
  };
}
export function scheduleCreationCommand(fields: ScheduleCreationFields) {
  if (fields.form === "type") {
    if (!fields.duration || !Number.isInteger(Number(fields.duration)))
      throw new Error("Informe uma duração inteira em minutos.");
    return scheduleBody.parse({
      action: "type",
      body: {
        name: fields.name,
        startsLocal: fields.start,
        durationMinutes: Number(fields.duration),
        active: fields.active,
      },
    });
  }
  if (fields.recurrence === "weekly" && !fields.weekdays.length)
    throw new Error("Selecione ao menos um dia da semana.");
  return scheduleBody.parse({
    action: "series",
    body: {
      professionalId: fields.professionalId,
      shiftTypeId: fields.shiftTypeId,
      timezone: fields.timezone,
      recurrence: fields.recurrence,
      weekdays: fields.recurrence === "weekly" ? fields.weekdays : [],
      ...(fields.recurrence === "dates"
        ? { dates: fields.dates, shiftTypeVersion: fields.shiftTypeVersion }
        : {}),
      ...(fields.recurrence === "cycle"
        ? {
            workHours: Number(fields.cycle.split("x")[0]),
            restHours: Number(fields.cycle.split("x")[1]),
          }
        : {}),
      anchorDate: fields.from,
      validUntil: fields.recurrence === "once" ? fields.from : fields.until,
      notes: fields.notes,
      ...(fields.reason ? { reason: fields.reason } : {}),
    },
  });
}
