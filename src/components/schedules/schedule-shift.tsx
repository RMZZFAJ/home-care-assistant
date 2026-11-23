import { useRef } from "react";
import { Menu } from "@base-ui/react/menu";
import { ActionButton, Pill } from "@/components/ui/controls";
import { MenuPopup } from "@/components/ui/floating";
import { Icon } from "@/components/ui/primitives";
import { localMinute } from "@/lib/schedules/time";
import { scheduleStamp } from "./schedule-review";
import type { ScheduledShift } from "@/types/schedules";

export function ScheduleShift({ shift, stateLabel, earlier, action, disabled, onEdit, daily, recurrence, onEnd }: {
  shift: ScheduledShift; stateLabel: string; earlier: boolean; action?: string;
  disabled: boolean; onEdit: (target: HTMLButtonElement) => void;
  daily?: boolean; recurrence?: string; onEnd?: (target: HTMLButtonElement) => void;
}) {
  const openerRef = useRef<HTMLButtonElement>(null);
  const label = `${shift.type_name} · ${shift.professional_name}`;
  const facts = <>
    <small>{scheduleStamp(shift.starts_at, shift.timezone)} → {scheduleStamp(shift.ends_at, shift.timezone)}</small>
    <small>Fuso: {shift.timezone}</small>
    {earlier ? <small>{daily ? "Iniciado antes do dia exibido." : "Iniciado no período anterior."}</small> : null}
    {shift.notes ? <p className="whitespace-pre-wrap wrap-break-word">{shift.notes}</p> : null}
  </>;
  const state = <Pill tone={shift.status === "published" ? "accent" : "neutral"}>{stateLabel}</Pill>;
  if (daily) {
    const start = localMinute(shift.starts_at, shift.timezone);
    const end = localMinute(shift.ends_at, shift.timezone);
    return <article data-shift-id={shift.id} className="hca-shift-card hca-shift-card--daily" aria-label={label}>
      <div className="hca-agenda-shift-times">
        <strong><time dateTime={shift.starts_at} aria-label={"Início às " + start.slice(11)}>{start.slice(11)}</time></strong>
        <small><time dateTime={shift.ends_at} aria-label={"Fim às " + end.slice(11)}>{end.slice(11)}</time>
          {end.slice(0, 10) !== start.slice(0, 10) ? <span>dia seguinte</span> : null}
        </small>
      </div>
      <div className="hca-agenda-shift-person">
        <details>
          <summary aria-label={`Detalhes do plantão de ${shift.professional_name}`}>{shift.professional_name}</summary>
          <div className="hca-agenda-shift-details">{facts}{shift.status === "published" ? state : null}</div>
        </details>
        <small>{shift.type_name}{recurrence ? " · " + recurrence : ""}</small>
        {shift.is_exception ? <small>Exceção autorizada</small> : null}
        {shift.status !== "published" ? state : null}
      </div>
      {action || onEnd ? <Menu.Root>
        <Menu.Trigger disabled={disabled} render={<ActionButton ref={openerRef} variant="quiet" compact
          className="hca-agenda-icon" aria-label={`Ações do plantão de ${shift.professional_name}`} />}>
          <Icon name="more" />
        </Menu.Trigger>
        <MenuPopup>
          {action ? <Menu.Item className="hca-menu-item" onClick={() => { if (openerRef.current) onEdit(openerRef.current); }}>{action}</Menu.Item> : null}
          {onEnd ? <Menu.Item className="hca-menu-item" onClick={() => { if (openerRef.current) onEnd(openerRef.current); }}>Encerrar série</Menu.Item> : null}
        </MenuPopup>
      </Menu.Root> : null}
    </article>;
  }
  return <article data-shift-id={shift.id} className="hca-shift-card" aria-label={label}>
    <span className="hca-shift-icon"><Icon name="calendar" /></span>
    <div className="hca-shift-main">
      <strong>{shift.professional_name}</strong>
      <small>{shift.type_name}</small>
      {shift.is_exception ? <small>Exceção autorizada</small> : null}
      {facts}
    </div>
    <div className="hca-shift-end">
      {state}
      {action ? <ActionButton disabled={disabled} onClick={event => onEdit(event.currentTarget)}>{action}</ActionButton> : null}
    </div>
  </article>;
}
