import { z } from "zod";
import { scheduleResourceWorkspaceSchema } from "@/lib/schedules/resource-preparations";
import type { ScheduleWorkspace } from "@/types/schedules";

export const schedulePeriod = z.object({ from: z.iso.date(), until: z.iso.date() }).refine(value =>
  value.until >= value.from && Date.parse(value.until) - Date.parse(value.from) <= 42 * 86_400_000,
);
const response = z.object({ careRecipientId: z.uuid(), period: schedulePeriod, data: scheduleResourceWorkspaceSchema });
export type ScheduleListScope = { careRecipientId: string; from: string; until: string };

export function parseScheduleListRead(value: unknown, expected: ScheduleListScope): { data: ScheduleWorkspace } {
  const parsed = response.safeParse(value);
  if (!parsed.success || parsed.data.careRecipientId !== expected.careRecipientId
    || parsed.data.period.from !== expected.from || parsed.data.period.until !== expected.until)
    throw new Error("A resposta da agenda não corresponde ao período consultado. Atualize a escala.");
  const data = parsed.data.data;
  if (Object.values(data).some(rows => new Set(rows.map(row => row.id)).size !== rows.length
    || rows.some(row => "care_recipient_id" in row && row.care_recipient_id !== expected.careRecipientId))
    || data.series.some(series => new Set(series.occurrences.map(row => row.id)).size !== series.occurrences.length
      || series.occurrences.some(row => row.series_id !== series.id)))
    throw new Error("Os registros da agenda não puderam ser conferidos. Atualize a escala.");
  try {
    const formatters = new Map<string, Intl.DateTimeFormat>();
    for (const shift of data.shifts) {
      let formatter = formatters.get(shift.timezone);
      if (!formatter) {
        formatter = new Intl.DateTimeFormat("sv-SE", { timeZone: shift.timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
        formatters.set(shift.timezone, formatter);
      }
      const localStart = formatter.format(new Date(shift.starts_at)), localEnd = formatter.format(new Date(shift.ends_at));
      const boundary = expected.from + " 00:00:00";
      const fractionalEnd = /\.[0-9]*[1-9]/.test(shift.ends_at);
      if (localStart.slice(0, 10) > expected.until || localEnd < boundary || (localEnd === boundary && !fractionalEnd))
        throw new Error("outside period");
    }
  } catch {
    throw new Error("Os horários recebidos não correspondem ao período da agenda. Atualize a escala.");
  }
  return { data };
}
