import { useRef, useState } from "react";
import { ActionButton, Pill } from "@/components/ui/controls";
import { Dialog } from "@/components/ui/overlays";
import { Icon, type IconName } from "@/components/ui/icon";
import { scheduleResourceEntryLabels, type ScheduleResourceEntry } from "@/lib/schedules/resource-preparations";
import { localMinute } from "@/lib/schedules/time";
import { scheduleStamp } from "./schedule-review";
import type { ScheduledShift } from "@/types/schedules";

const entryIcons: Record<ScheduleResourceEntry, IconName> = {
  replace: "user", time: "clock", cancel: "close", request: "comment", end: "calendar",
};

export function ScheduleShift({ shift, stateLabel, earlier, action, disabled, onEdit, daily, recurrence, entries, onOpenBalance }: {
  shift: ScheduledShift; stateLabel: string; earlier: boolean; action?: string;
  disabled: boolean; onEdit: (target: HTMLButtonElement, entry?: ScheduleResourceEntry) => void;
  daily?: boolean; recurrence?: string; entries: ScheduleResourceEntry[];
  onOpenBalance?: (target: HTMLButtonElement) => void;
}) {
  const openerRef = useRef<HTMLButtonElement>(null);
  const openingEditorRef = useRef(false);
  const [actionsOpen, setActionsOpen] = useState(false);
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
        {onOpenBalance ? <button type="button" className="hca-agenda-balance-link" aria-haspopup="dialog"
          onClick={event => onOpenBalance(event.currentTarget)}>
          <Icon name="note" width={15} height={15} /> Balanço neste plantão
        </button> : null}
      </div>
      {entries.length ? <>
        <ActionButton ref={openerRef} variant="quiet" compact disabled={disabled} aria-haspopup="dialog"
          className="hca-agenda-icon" aria-label={`Ações do plantão de ${shift.professional_name}`}
          onClick={() => { openingEditorRef.current = false; setActionsOpen(true); }}>
          <Icon name="more" />
        </ActionButton>
        {actionsOpen ? <Dialog open
          kicker="Plantões e balanços" headingIcon="calendar"
          title={"Plantão de " + new Intl.DateTimeFormat("pt-BR", {
            timeZone: shift.timezone, day: "numeric", month: "long",
          }).format(new Date(shift.starts_at))}
          subtitle={`${shift.professional_name} · ${start.slice(11)}–${end.slice(11)}${start.slice(0, 10) === end.slice(0, 10) ? "" : " do dia seguinte"}`}
          closeLabel="Fechar ações do plantão" popupClassName="hca-shift-action-picker"
          onClose={() => setActionsOpen(false)}
          finalFocus={() => openingEditorRef.current ? false : openerRef.current ?? false}>
          <div className="hca-shift-action-list">
            {entries.map(entry => <ActionButton key={entry} variant="quiet" disabled={disabled}
              onClick={() => {
                if (!openerRef.current) return;
                openingEditorRef.current = true;
                setActionsOpen(false);
                onEdit(openerRef.current, entry);
              }}>
              <Icon name={entryIcons[entry]} />
              <span>{scheduleResourceEntryLabels[entry]}</span>
              <Icon name="chevron" width={15} height={15} />
            </ActionButton>)}
          </div>
        </Dialog> : null}
      </> : null}
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
