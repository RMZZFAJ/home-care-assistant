"use client";
import Link from "next/link";
import { useCallback, useState } from "react";
import { can, Notice, type WorkspaceContext } from "@/components/workspace";
import { ModelSectionHead } from "@/components/ui/model-section";
import { ActionButton } from "@/components/ui/controls";
import { useScopedRead } from "@/lib/use-scoped-read";
import { useLiveRevision } from "@/lib/use-live-revision";
import { parseScheduleListRead } from "@/lib/validation/schedule-list";
import { calendarPeriod, scheduleDisplayDay } from "@/lib/schedules/calendar";
import { localMinute } from "@/lib/schedules/time";

export function WeekSchedule({ context }: { context: WorkspaceContext }) {
  const allowed = can(context, "schedule.read.team") || can(context, "schedule.read.own");
  return allowed ? <AuthorizedWeek key={context.patient!.id} patientId={context.patient!.id} /> : null;
}
function AuthorizedWeek({ patientId }: { patientId: string }) {
  const [today] = useState(() => localMinute(new Date().toISOString(), "America/Sao_Paulo").slice(0, 10));
  const period = calendarPeriod(today, "week"), revision = useLiveRevision();
  const decode = useCallback((value: unknown) => parseScheduleListRead(value, { careRecipientId: patientId, from: period.from, until: period.until }), [patientId, period.from, period.until]);
  const read = useScopedRead("/api/schedules?" + new URLSearchParams({ careRecipientId: patientId, from: period.from, until: period.until }), String(revision), decode);
  const stamp = (day: string, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", ...options }).format(new Date(day + "T12:00:00Z"));
  return <section className="card week-card"><ModelSectionHead title="Escala da semana" icon="calendar" action={<Link className="btn btn-ghost" href="/escalas" prefetch={false}>Ver escala</Link>} /><div className="week-body">
    {read.loading ? <p role="status">Consultando a escala…</p> : read.error ? <Notice error>{read.error}<ActionButton onClick={read.refresh}>Tentar novamente</ActionButton></Notice> : read.data ? <><div className="week-caption"><strong>{stamp(period.from, { day: "numeric" })} a {stamp(period.until, { day: "numeric", month: "long" })}</strong><span>{period.until.slice(0, 4)}</span></div><div className="week-grid">{period.dates.map(day => {
      const shifts = read.data!.data.shifts.filter(shift => shift.status !== "cancelled" && scheduleDisplayDay(shift.starts_at, shift.timezone, period.from) === day);
      return <Link key={day} className={`week-day${day === today ? " is-today" : ""}`} href={"/escalas?day=" + day} aria-label={stamp(day, { dateStyle: "full" }) + ": " + (shifts.length ? shifts.map(shift => shift.professional_name).join(", ") : "sem plantões nesta consulta")} prefetch={false}><span>{stamp(day, { weekday: "short" }).replace(".", "")}</span><strong>{stamp(day, { day: "numeric" })}</strong>{shifts.map(shift => <span className="shift-mark" key={shift.id}>{shift.professional_name.split(" ")[0]}<small>{localMinute(shift.starts_at, shift.timezone).slice(11, 16)}–{localMinute(shift.ends_at, shift.timezone).slice(11, 16)}</small></span>)}</Link>;
    })}</div>{!read.data.data.shifts.length ? <p className="hca-field-help">Nenhum plantão nesta semana.</p> : null}</> : null}
  </div></section>;
}
