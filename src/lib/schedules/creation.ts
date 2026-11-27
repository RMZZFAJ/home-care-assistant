import { z } from "zod";
import { scheduleBody, shiftTypeCycle } from "@/lib/validation/schedules";
import type { ScheduleWorkspace, ShiftType } from "@/types/schedules";
import { residenceHours, shiftDayPeriod, shiftLocalTime, type ResidenceHours } from "./residence-hours";
import { civilInstant } from "./time";

const text = (max: number) =>
  z.string().refine((v) => v.length <= max, `Use até ${max} caracteres.`);
const selection = z.union([z.literal(""), z.uuid()]);
const civilDate = z.union([z.literal(""), z.iso.date()]);
export const scheduleCreationPurpose = z.enum([
  "shift_type_create",
  "schedule_series_create",
]);
export const scheduleTypeFields = z
  .object({
    form: z.literal("type"),
    name: text(100),
    start: text(8).refine((v) =>
      /^(?:(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?)?$/.test(v),
    ),
    duration: text(32).refine((v) =>
      /^(?:-?(?:\d+(?:\.\d+)?|\.\d+)(?:[eE][+-]?\d+)?)?$/.test(v),
    ),
    active: z.boolean(),
    restHours: text(5).refine((value) => /^\d{0,5}$/.test(value) && Number(value) <= 32767).optional(),
  })
  .strict();
export const scheduleCreationFields = z.discriminatedUnion("form", [
  scheduleTypeFields,
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
      typeCycle: shiftTypeCycle.optional(),
      from: civilDate,
      until: civilDate,
      timezone: text(80),
      notes: text(2000),
      reason: text(1000),
      residence: residenceHours.extend({
        period: shiftDayPeriod,
        special: z.boolean(),
        specialStart: shiftLocalTime.or(z.literal("")),
        specialEnd: shiftLocalTime.or(z.literal("")),
      }).strict().optional(),
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
export function initialScheduleType(
  type?: ShiftType,
): Extract<ScheduleCreationFields, { form: "type" }> {
  const structured = !type || type.rest_hours != null;
  return {
    form: "type",
    name: type?.name ?? "",
    start: structured ? "" : type.starts_local.replace(/^(\d{2}:\d{2}):00$/, "$1"),
    duration: String(type?.duration_minutes ?? 720),
    active: type?.is_active ?? true,
    ...(structured ? { restHours: type?.rest_hours?.toString() ?? "" } : {}),
  };
}
export function scheduleTypeSelection(type?: ShiftType) {
  return {
    shiftTypeId: type?.id ?? "",
    shiftTypeVersion: type?.version ?? null,
    typeCycle: type?.rest_hours == null ? undefined : {
      workHours: type.duration_minutes / 60,
      restHours: type.rest_hours,
    },
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
    ...scheduleTypeSelection(type),
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
    const durationMinutes = Number(fields.duration);
    const structured = fields.restHours !== undefined;
    if (!fields.duration || !Number.isInteger(durationMinutes) || structured && durationMinutes % 60 !== 0)
      throw new Error(structured ? "Informe horas inteiras de trabalho." : "Informe uma duração inteira em minutos.");
    if (fields.restHours === "") throw new Error("Informe as horas de descanso.");
    return scheduleBody.parse({
      action: "type",
      body: {
        name: fields.name,
        ...(structured ? { restHours: Number(fields.restHours) } : { startsLocal: fields.start }),
        durationMinutes,
        active: fields.active,
      },
    });
  }
  if (fields.recurrence === "weekly" && !fields.weekdays.length)
    throw new Error("Selecione ao menos um dia da semana.");
  const timingIssue = scheduleSpecialHoursIssue(fields);
  if (timingIssue) throw new Error(timingIssue);
  const residence = fields.residence;
  if (fields.typeCycle && !residence)
    throw new Error("Configure os horários da residência antes de programar com este tipo.");
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
        ? fields.typeCycle ?? {
            workHours: Number(fields.cycle.split("x")[0]),
            restHours: Number(fields.cycle.split("x")[1]),
          }
        : {}),
      anchorDate: fields.from,
      validUntil: fields.recurrence === "once" ? fields.from
        : residence && fields.recurrence !== "dates" ? fields.until || null : fields.until,
      notes: fields.notes,
      ...(fields.reason ? { reason: fields.reason } : {}),
      ...(residence ? {
        shiftTypeVersion: fields.shiftTypeVersion,
        residenceHours: {
          version: residence.version,
          period: residence.period,
          startsLocal: residence.special ? residence.specialStart : residence.period === "day" ? residence.dayStart : residence.nightStart,
          endsLocal: residence.special ? residence.specialEnd : null,
        },
      } : {}),
    },
  });
}

export function scheduleSpecialHoursIssue(fields: ScheduleCreationFields) {
  if (fields.form !== "series" || !fields.residence?.special) return null;
  const { specialStart, specialEnd } = fields.residence;
  if (!specialStart || !specialEnd) return "Informe o início e o término do horário especial.";
  if (!fields.from) return null;
  let occurrence = fields.from;
  if (fields.recurrence === "weekly") {
    if (!fields.weekdays.length) return null;
    const date = new Date(occurrence + "T12:00:00Z");
    const offset = Math.min(...fields.weekdays.map(day => (day - date.getUTCDay() + 7) % 7));
    date.setUTCDate(date.getUTCDate() + offset);
    occurrence = date.toISOString().slice(0, 10);
  } else if (fields.recurrence === "dates") {
    const first = [...fields.dates].sort((a, b) => a.localeCompare(b)).find(date => date >= fields.from);
    if (!first) return null;
    occurrence = first;
  }
  if (fields.recurrence !== "once" && fields.until && occurrence > fields.until)
    return "O período escolhido não tem uma ocorrência de plantão.";
  const day = new Date(occurrence + "T12:00:00Z");
  if (specialEnd <= specialStart) day.setUTCDate(day.getUTCDate() + 1);
  try {
    const start = civilInstant(`${occurrence}T${specialStart}`, fields.timezone);
    const end = civilInstant(`${day.toISOString().slice(0, 10)}T${specialEnd}`, fields.timezone);
    const minutes = (Date.parse(end) - Date.parse(start)) / 60000;
    if (fields.recurrence === "cycle" && minutes !== (fields.typeCycle?.workHours ?? Number(fields.cycle.split("x")[0])) * 60)
      return "O horário especial precisa manter as horas de trabalho da escala escolhida.";
    if (minutes < 15 || minutes > 1440) return "Use um intervalo entre 15 minutos e 24 horas.";
  } catch {
    return "Confira se o início e o término existem no fuso da residência nessa data.";
  }
  return null;
}

export function adoptResidenceHours(fields: Extract<ScheduleCreationFields, { form: "series" }>, hours: ResidenceHours) {
  const current = fields.residence;
  return {
    ...fields,
    timezone: hours.timezone,
    residence: {
      ...hours,
      period: current?.period ?? "day",
      special: current?.special ?? false,
      specialStart: current?.specialStart ?? "",
      specialEnd: current?.specialEnd ?? "",
    },
  } as const;
}
