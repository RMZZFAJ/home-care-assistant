import { z } from "zod";

export const shiftLocalTime = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export const shiftDayPeriod = z.enum(["day", "night"]);
const version = z.number().int().positive().max(2147483647);
const zone = z.string().trim().min(1).max(80).refine(value => {
  try { new Intl.DateTimeFormat("pt-BR", { timeZone: value }); return true; }
  catch { return false; }
}, "Informe um fuso horário válido.");
export const residenceHoursInput = z.object({
  timezone: zone, dayStart: shiftLocalTime, nightStart: shiftLocalTime,
}).strict();
export const residenceHours = residenceHoursInput.extend({ version });
export type ResidenceHours = z.infer<typeof residenceHours>;
export const residenceHoursChange = z.object({
  careRecipientId: z.uuid(),
  idempotencyKey: z.uuid(),
  expectedVersion: version.nullable(),
  hours: residenceHoursInput,
}).strict();
const response = z.object({ careRecipientId: z.uuid(), hours: residenceHours.nullable() }).strict();

export function parseResidenceHours(value: unknown, patientId: string) {
  const result = response.safeParse(value);
  if (!result.success || result.data.careRecipientId !== patientId)
    throw new Error("Não foi possível conferir os horários desta residência.");
  return result.data;
}

export function timeAfter(start: string, duration: number) {
  const [hours, minutes] = start.split(":").map(Number);
  const end = hours * 60 + minutes + duration;
  const clock = end % 1440;
  return {
    time: `${String(Math.floor(clock / 60)).padStart(2, "0")}:${String(clock % 60).padStart(2, "0")}`,
    nextDay: end >= 1440,
  };
}
