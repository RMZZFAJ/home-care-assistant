import { ActionButton, Pill } from "@/components/ui/controls";
import { Icon } from "@/components/ui/primitives";
import { scheduleStamp } from "./schedule-review";
import type { ScheduledShift } from "@/types/schedules";

export function ScheduleShift({ shift, stateLabel, earlier, action, disabled, onEdit }: {
  shift: ScheduledShift; stateLabel: string; earlier: boolean; action?: string;
  disabled: boolean; onEdit: (target: HTMLButtonElement) => void;
}) {
  return <article data-shift-id={shift.id} className="hca-shift-card" aria-label={`${shift.type_name} · ${shift.professional_name}`}>
    <span className="hca-shift-icon"><Icon name="calendar" /></span>
    <div className="hca-shift-main">
      <strong>{shift.professional_name}</strong>
      <small>{shift.type_name}</small>
      <small>{scheduleStamp(shift.starts_at, shift.timezone)} → {scheduleStamp(shift.ends_at, shift.timezone)}</small>
      <small>Fuso: {shift.timezone}</small>
      {earlier ? <small>Iniciado no período anterior.</small> : null}
      {shift.is_exception ? <small>Exceção autorizada</small> : null}
      {shift.notes ? <p className="whitespace-pre-wrap wrap-break-word">{shift.notes}</p> : null}
    </div>
    <div className="hca-shift-end">
      <Pill tone={shift.status === "published" ? "accent" : "neutral"}>{stateLabel}</Pill>
      {action ? <ActionButton disabled={disabled} onClick={event => onEdit(event.currentTarget)}>{action}</ActionButton> : null}
    </div>
  </article>;
}
