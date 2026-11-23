"use client";

import { useCallback } from "react";
import { ActionButton, LoadingIndicator, Pill } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { can, Notice, type WorkspaceContext } from "@/components/workspace";
import { calendarPeriod } from "@/lib/schedules/calendar";
import { useLiveRevision } from "@/lib/use-live-revision";
import { useScopedRead } from "@/lib/use-scoped-read";
import { parseScheduleListRead } from "@/lib/validation/schedule-list";
import { ScheduleConfirmationPanel } from "./schedule-confirmation-panel";
import type { ScheduleRecovery } from "./use-schedule-confirmation";

export function ScheduleTypeSettings({
  context,
  today,
  recovery,
  onCreate,
  onEdit,
}: {
  context: WorkspaceContext;
  today: string;
  recovery: ScheduleRecovery;
  onCreate: (opener: HTMLElement) => void;
  onEdit: (typeId: string, opener: HTMLElement) => void;
}) {
  const patient = context.patient!;
  const manageable = can(context, "schedule.types.manage");
  const readable = can(context, "schedule.read.team") || can(context, "schedule.read.own");
  const enabled = manageable && readable && !recovery.readDenied;
  const { from, until } = calendarPeriod(today, "week");
  const revision = useLiveRevision();
  const scope = JSON.stringify([context.userId, patient.capabilities, patient.active, patient.is_active, revision]);
  const decode = useCallback((value: unknown) =>
    parseScheduleListRead(value, { careRecipientId: patient.id, from, until }),
  [patient.id, from, until]);
  const read = useScopedRead(enabled
    ? "/api/schedules?" + new URLSearchParams({ careRecipientId: patient.id, from, until })
    : null,
  scope, decode);
  const types = enabled && !read.error ? read.data?.data.types : undefined;
  const busy = !types || read.loading || !recovery.ready || recovery.busy || Boolean(recovery.pending)
    || patient.active === false || patient.is_active === false;

  return <>
    <ScheduleConfirmationPanel recovery={recovery} onConfirmed={read.refresh} />
    <section className="ui-card hca-form-stack" aria-labelledby="schedule-types-heading">
      <div className="hca-section-heading">
        <div>
          <h2 id="schedule-types-heading"><Icon name="calendar" /> Tipos de plantão</h2>
          <p>Consulte os tipos usados na programação da equipe.</p>
        </div>
        {manageable && readable && !recovery.readDenied ? (
          <ActionButton variant="primary" disabled={busy} onClick={event => onCreate(event.currentTarget)}>
            Novo tipo de plantão
          </ActionButton>
        ) : null}
      </div>
      {!enabled ? <Notice>Seu vínculo permite consultar e recuperar seus preenchimentos próprios nesta área.</Notice> : null}
      {enabled && read.loading ? <LoadingIndicator label="Consultando tipos de plantão" /> : null}
      {enabled && read.error ? <Notice error>{read.error} <ActionButton onClick={read.refresh}>Consultar tipos novamente</ActionButton></Notice> : null}
      {types?.length === 0 ? <p>Nenhum tipo cadastrado.</p> : null}
      {types?.map(type => (
        <article className="hca-record flex-wrap" key={type.id} aria-label={type.name}>
          <div className="hca-record-main wrap-anywhere">
            <strong>{type.name}</strong>
            <small>{type.duration_minutes} minutos · início registrado às {type.starts_local.slice(0, 5)}</small>
          </div>
          <div className="hca-record-actions flex-wrap">
            <Pill tone={type.is_active ? "success" : "neutral"}>{type.is_active ? "Disponível" : "Indisponível"}</Pill>
            <ActionButton disabled={busy} onClick={event => onEdit(type.id, event.currentTarget)}>
              Editar tipo
            </ActionButton>
          </div>
        </article>
      ))}
    </section>
  </>;
}
