"use client";
import { ScheduleCreationPreparation } from "./schedule-creation-preparation";
import { ScheduleResourcePreparation } from "./schedule-resource-preparation";
import { ScheduleResourcePreparationsList } from "./schedule-resource-list";
import type { ScheduleResourcePurpose } from "@/lib/schedules/resource-preparations";
import type { ScheduleCreationPurpose } from "@/lib/schedules/creation";
import {
  ActionButton,
  FormField,
  LoadingIndicator,
  Pill,
  SelectField,
  TextInput,
} from "@/components/ui/controls";
import { useCallback, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useNotificationReference } from "@/lib/notifications/use-notification-reference";
import { NotificationReference } from "@/components/notifications/notification-reference";

import {
  can,
  Notice,
  Workspace,
  type WorkspaceContext,
} from "@/components/workspace";
import { useLiveRevision } from "@/lib/use-live-revision";
import { useScopedRead } from "@/lib/use-scoped-read";
import { parseScheduleListRead } from "@/lib/validation/schedule-list";
import { formatBrazilDate } from "@/lib/receipt";
import { adjacentPeriod, calendarPeriod, scheduleDisplayDay } from "@/lib/schedules/calendar";
import type { ScheduleEditor } from "./schedule-forms";
import { scheduleStamp as stamp } from "./schedule-review";
import type { ScheduledShift } from "@/types/schedules";
import {
  useScheduleConfirmation,
  type ScheduleRecovery,
} from "./use-schedule-confirmation";
import { ScheduleConfirmationPanel } from "./schedule-confirmation-panel";

const today = () =>
  new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" }).format(
    new Date(),
  );
const stateLabels: Record<string, string> = {
  published: "Publicado",
  proposed: "Proposta",
  cancelled: "Cancelado",
  rejected: "Recusado",
  obsolete: "Obsoleto",
};
import { scheduleEventLabel } from "@/lib/schedules/presentation";
export function ScheduleConsole() {
  return (
    <Workspace title="Escalas e plantões">
      {(context) =>
        context.patient ? (
          <PatientSchedule
            key={context.userId + ":" + context.patient.id}
            context={context}
          />
        ) : (
          <Notice error>
            Selecione um vínculo com permissão para consultar escalas.
          </Notice>
        )
      }
    </Workspace>
  );
}
function PatientSchedule({ context }: { context: WorkspaceContext }) {
  const [creationMessage, setCreationMessage] = useState("");
  const [privateRefresh, setPrivateRefresh] = useState(0);
  const ownSummaryRef = useRef<HTMLElement>(null);
  const recovery = useScheduleConfirmation(context.userId, context.patient!.id);
  const [preparation, setPreparation] = useState<{
    purpose: ScheduleCreationPurpose;
    day: string;
    opener: HTMLElement;
  } | null>(null);
  const [resource, setResource] = useState<{
    purpose: ScheduleResourcePurpose;
    target: string;
    day: string;
    opener: HTMLElement;
  } | null>(null);
  const openResource = (
    purpose: ScheduleResourcePurpose,
    target: string,
    day: string,
    opener: HTMLElement,
  ) => {
    if (!recovery.ready || recovery.busy || recovery.pending || preparation)
      return;
    setResource({ purpose, target, day, opener });
  };
  const create = (
    purpose: ScheduleCreationPurpose,
    day: string,
    opener: HTMLElement,
  ) => {
    if (!recovery.ready || recovery.busy || recovery.pending || resource)
      return;
    setPreparation({ purpose, day, opener });
  };
  return (
    <>
      {creationMessage ? <Notice>{creationMessage}</Notice> : null}
      {can(context, "schedule.read.team") ||
      can(context, "schedule.read.own") ? (
        <Agenda
          context={context}
          recovery={recovery}
          onCreate={create}
          onResource={openResource}
        />
      ) : (
        <>
          <ScheduleConfirmationPanel recovery={recovery} />
          <Notice error>
            Seu vínculo não permite consultar a agenda. A recuperação consulta
            somente suas tentativas e preenchimentos próprios; não publica nova
            programação.
          </Notice>
        </>
      )}
      <details className="ui-card">
        <summary ref={ownSummaryRef}>
          Meus preenchimentos privados da agenda
        </summary>
        <p>
          Consulte, retome, descarte ou reconheça somente seus preenchimentos.
          Uma nova confirmação depende da permissão atual.
        </p>
        <div className="hca-toolbar">
          <ActionButton
            disabled={
              !recovery.ready || recovery.busy || Boolean(recovery.pending)
            }
            onClick={(e) =>
              create("shift_type_create", today(), e.currentTarget)
            }
          >
            Retomar meu tipo de plantão
          </ActionButton>
          <ActionButton
            disabled={
              !recovery.ready || recovery.busy || Boolean(recovery.pending)
            }
            onClick={(e) =>
              create("schedule_series_create", today(), e.currentTarget)
            }
          >
            Retomar minha programação
          </ActionButton>
        </div>
        <ScheduleResourcePreparationsList
          context={context}
          refreshToken={privateRefresh}
          disabled={
            !recovery.ready ||
            recovery.busy ||
            Boolean(recovery.pending) ||
            Boolean(preparation)
          }
          onOpen={openResource}
        />
      </details>
      {preparation ? (
        <ScheduleCreationPreparation
          key={preparation.purpose}
          context={context}
          purpose={preparation.purpose}
          today={preparation.day}
          opener={preparation.opener}
          fallbackFocus={ownSummaryRef}
          onClose={() => setPreparation(null)}
          onCommitted={(receipt) => {
            setCreationMessage(
              receipt.nativeResult.status === "proposed"
                ? "Programação enviada como proposta; aguarda aprovação."
                : preparation.purpose === "shift_type_create"
                  ? "Tipo de plantão registrado."
                  : "Programação de plantões registrada.",
            );
            window.dispatchEvent(new Event("hca:data-changed"));
          }}
        />
      ) : null}
      {resource ? (
        <ScheduleResourcePreparation
          key={resource.purpose + ":" + resource.target}
          context={context}
          purpose={resource.purpose}
          targetResourceId={resource.target}
          today={resource.day}
          opener={resource.opener}
          fallbackFocus={ownSummaryRef}
          onClose={() => {
            setResource(null);
            setPrivateRefresh((value) => value + 1);
          }}
          onCommitted={(receipt) => {
            setCreationMessage(
              receipt.nativeResult.status === "obsolete"
                ? "Proposta encerrada como obsoleta; nenhuma aprovação foi realizada."
                : receipt.nativeResult.status === "pending"
                  ? "Proposta de alteração enviada; aguarda decisão autorizada."
                  : "Operação da agenda registrada e conferida.",
            );
            window.dispatchEvent(new Event("hca:data-changed"));
          }}
        />
      ) : null}
    </>
  );
}
function Agenda({
  context,
  recovery,
  onCreate,
  onResource,
}: {
  context: WorkspaceContext;
  recovery: ScheduleRecovery;
  onCreate: (
    purpose: ScheduleCreationPurpose,
    day: string,
    opener: HTMLElement,
  ) => void;
  onResource: (
    purpose: ScheduleResourcePurpose,
    target: string,
    day: string,
    opener: HTMLElement,
  ) => void;
}) {
  const patient = context.patient!,
    team = can(context, "schedule.manage.team"),
    publishOwn = can(context, "schedule.manage.own");
  const params = useSearchParams(),
    reference = params.get("ref"),
    notice = useNotificationReference(
      patient.id,
      "schedule",
      reference,
      params.get("refKind") ?? "auto",
    );
  const [fallbackDay] = useState(today),
    [chosenDay, setChosenDay] = useState<{
      reference: string | null;
      day: string;
    } | null>(null);
  const day =
    chosenDay?.reference === reference
      ? chosenDay.day
      : notice.data?.kind === "schedule"
        ? notice.data.referenceDay
        : fallbackDay;
  const setDay = (value: string) => setChosenDay({ reference, day: value });
  const [mode, setMode] = useState<"week" | "month">("week");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [person, setPerson] = useState(""),
    [status, setStatus] = useState(""),
    [attempt, setAttempt] = useState(0);
  const [message, setMessage] = useState("");
  const live = useLiveRevision(), period = useMemo(() => calendarPeriod(day, mode), [day, mode]);
  const decode = useCallback((value: unknown) => parseScheduleListRead(value, {
    careRecipientId: patient.id, from: period.from, until: period.until,
  }), [patient.id, period.from, period.until]);
  const read = useScopedRead("/api/schedules?" + new URLSearchParams({
    careRecipientId: patient.id, from: period.from, until: period.until,
  }), String(live) + ":" + attempt, decode);
  const data = read.data?.data ?? null, currentData = data, loading = read.loading;
  const busy = recovery.busy || !recovery.ready || loading || Boolean(read.error),
    uncertain = recovery.pending !== null;
  function open(value: ScheduleEditor, target: HTMLElement) {
    if (busy || uncertain) return;
    if (value.kind === "series" || (value.kind === "type" && !value.type)) {
      onCreate(
        value.kind === "series"
          ? "schedule_series_create"
          : "shift_type_create",
        day,
        target,
      );
      return;
    }
    if (value.kind === "type" && value.type)
      onResource("shift_type_edit", value.type.id, day, target);
    else if (value.kind === "shift")
      onResource("schedule_shift_edit", value.shift.id, day, target);
    else if (
      value.kind === "end" ||
      value.kind === "reject" ||
      value.kind === "reject_change"
    )
      onResource(
        value.kind === "end"
          ? "schedule_series_end"
          : value.kind === "reject"
            ? "schedule_series_reject"
            : "schedule_change_reject",
        value.id,
        day,
        target,
      );
  }
  function confirmed() {
    setMessage(
      "Resultado da escala conferido. As responsabilidades documentais anteriores foram preservadas.",
    );
    setAttempt((value) => value + 1);
  }
  const selectedPerson = can(context, "schedule.read.team") ? person : "";
  const visible = useMemo(() => currentData?.shifts.filter(
    shift => (!selectedPerson || shift.professional_id === selectedPerson) && (!status || shift.status === status),
  ) ?? [], [currentData, selectedPerson, status]);
  const byDay = useMemo(() => {
    const result = new Map(period.dates.map(date => [date, [] as ScheduledShift[]]));
    for (const shift of visible) result.get(scheduleDisplayDay(shift.starts_at, shift.timezone, period.from))?.push(shift);
    return result;
  }, [visible, period]);
  const renderShift = (shift: ScheduledShift) => (
    <article
      key={shift.id}
      data-shift-id={shift.id}
      className="hca-shift-card"
      aria-label={`${shift.type_name} · ${shift.professional_name}`}
    >
      <div className="hca-toolbar">
        <strong>{shift.type_name}</strong>
        <Pill tone={shift.status === "published" ? "accent" : "neutral"}>
          {stateLabels[shift.status]}
        </Pill>
      </div>
      <p>{shift.professional_name}</p>
      {new Intl.DateTimeFormat("sv-SE", { timeZone: shift.timezone }).format(new Date(shift.starts_at)) < period.from ? <p className="text-sm text-(--muted)">Iniciado no período anterior.</p> : null}
      <p>
        {stamp(shift.starts_at, shift.timezone)} →{" "}
        {stamp(shift.ends_at, shift.timezone)}
      </p>
      {shift.is_exception ? <small>Exceção autorizada</small> : null}
      {shift.notes ? (
        <p className="whitespace-pre-wrap">{shift.notes}</p>
      ) : null}
      {shift.status === "published" &&
      (team ||
        (shift.professional_id === context.userId &&
          (can(context, "schedule.propose") || publishOwn))) ? (
        <ActionButton
          disabled={busy || uncertain}
          onClick={(event) =>
            open({ kind: "shift", shift }, event.currentTarget)
          }
        >
          {team || publishOwn ? "Alterar plantão" : "Propor alteração"}
        </ActionButton>
      ) : null}
    </article>
  );
  const renderDay = (date: string) => {
    const shifts = byDay.get(date) ?? [];
    return (
      <section key={date} className="hca-agenda-day">
        <h2>
          {new Intl.DateTimeFormat("pt-BR", {
            timeZone: "UTC",
            weekday: "short",
            day: "2-digit",
            month: "2-digit",
          }).format(new Date(date + "T12:00:00Z"))}
        </h2>
        {shifts.map(renderShift)}
        {!shifts.length ? (
          <p className="hca-muted">Sem programação no dia.</p>
        ) : null}
      </section>
    );
  };
  return recovery.readDenied ? (
    <ScheduleConfirmationPanel recovery={recovery} onConfirmed={confirmed} />
  ) : (
    <div className="hca-form-stack hca-schedule-agenda">
      <NotificationReference
        key={patient.id + ":" + reference}
        read={notice}
        context={context}
      />
      <div className="hca-command-bar">
        {team || publishOwn || can(context, "schedule.propose") ? (
          <ActionButton
            variant="primary"
            disabled={
              loading ||
              busy ||
              uncertain ||
              !data?.types.some((type) => type.is_active)
            }
            onClick={(event) => open({ kind: "series" }, event.currentTarget)}
          >
            Nova programação
          </ActionButton>
        ) : null}
        {can(context, "schedule.types.manage") ? (
          <ActionButton
            disabled={loading || busy || uncertain || !data}
            onClick={(event) => open({ kind: "type" }, event.currentTarget)}
          >
            Novo tipo de plantão
          </ActionButton>
        ) : null}
      </div>
      {uncertain ? (
        <Notice>
          A confirmação não foi recebida. A mesma intenção está preservada;
          recupere o resultado antes de preparar outra ação.
        </Notice>
      ) : null}
      <ScheduleConfirmationPanel recovery={recovery} onConfirmed={confirmed} />
      {message ? <Notice>{message}</Notice> : null}
      <div className="hca-toolbar">
        <FormField label="Data de referência">
          <TextInput
            type="date"
            value={day}
            onChange={(event) => {
              if (/^\d{4}-\d{2}-\d{2}$/.test(event.target.value))
                setDay(event.target.value);
            }}
          />
        </FormField>
        <FormField label="Visualização">
          <SelectField
            value={mode}
            onChange={(event) =>
              setMode(event.target.value as "week" | "month")
            }
          >
            <option value="week">Semana</option>
            <option value="month">Mês</option>
          </SelectField>
        </FormField>
        {can(context, "schedule.read.team") ? (
          <FormField label="Profissional">
            <SelectField
              value={person}
              onChange={(event) => setPerson(event.target.value)}
            >
              <option value="">Toda a equipe</option>
              {data?.professionals.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </SelectField>
          </FormField>
        ) : null}
        <FormField label="Situação">
          <SelectField
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">Todas</option>
            {Object.entries(stateLabels)
              .filter(([key]) => key !== "obsolete")
              .map(([key, value]) => (
                <option key={key} value={key}>
                  {value}
                </option>
              ))}
          </SelectField>
        </FormField>
      </div>
      <div className="hca-toolbar" role="group" aria-label="Período da escala">
        <ActionButton onClick={() => setDay(adjacentPeriod(day, mode, -1))}>
          {mode === "month" ? "Mês anterior" : "Semana anterior"}
        </ActionButton>
        <strong>
          {period.from.split("-").reverse().join("/")} a{" "}
          {period.until.split("-").reverse().join("/")}
        </strong>
        <ActionButton onClick={() => setDay(adjacentPeriod(day, mode, 1))}>
          {mode === "month" ? "Próximo mês" : "Próxima semana"}
        </ActionButton>
      </div>
      <ActionButton
        aria-disabled={loading}
        onClick={() => {
          if (!loading) setAttempt((value) => value + 1);
        }}
      >
        Atualizar escala
      </ActionButton>
      {loading ? <LoadingIndicator label="Carregando escala" /> : null}
      {read.error ? <Notice error>{read.error} Atualize a escala para repetir a consulta.</Notice> : null}
      {read.queriedAt ? <p className="hca-muted">{loading || read.error ? "Última consulta preservada; ações aguardam atualização." : "Escala consultada:"} {formatBrazilDate(read.queriedAt)}.</p> : null}
      {currentData ? (
        <>
          <p className="hca-muted">
            Programação prevista, sem registro de presença. O mesmo período
            aparece em computador e celular.
          </p>
          <div className="hca-agenda-desktop">
            {period.dates.map(renderDay)}
          </div>
          <div className="hca-agenda-mobile">{period.dates.map(renderDay)}</div>
          {team ? (
            <section className="ui-card">
              <h2>Propostas pendentes</h2>
              {currentData.series
                .filter(
                  (series) => series.status === "proposed" && !series.ended_on,
                )
                .map((series) => (
                  <article className="hca-record" key={series.id}>
                    <span>
                      {series.professional_name} · {series.type_name} ·{" "}
                      {series.anchor_date} a {series.valid_until}
                    </span>
                    <ActionButton
                      disabled={busy || uncertain}
                      onClick={(event) =>
                        onResource(
                          "schedule_series_approve",
                          series.id,
                          day,
                          event.currentTarget,
                        )
                      }
                    >
                      Aprovar programação
                    </ActionButton>
                    <ActionButton
                      disabled={busy || uncertain}
                      onClick={(event) =>
                        open(
                          {
                            kind: "reject",
                            id: series.id,
                            version: series.version,
                          },
                          event.currentTarget,
                        )
                      }
                    >
                      Rejeitar programação
                    </ActionButton>
                  </article>
                ))}
              {currentData.changes.map((change) => (
                <article key={change.id} className="hca-record">
                  <div>
                    <strong>
                      {change.source_snapshot?.professional_name ||
                        change.current_professional_name}{" "}
                      →{" "}
                      {change.proposed_snapshot?.professional_name ||
                        change.current_proposed_professional_name}
                    </strong>
                    <p>{change.reason}</p>
                    {change.is_stale ? <p>Proposta desatualizada</p> : null}
                  </div>
                  <ActionButton
                    disabled={busy || uncertain}
                    onClick={(event) =>
                      onResource(
                        change.is_stale
                          ? "schedule_change_close"
                          : "schedule_change_approve",
                        change.id,
                        day,
                        event.currentTarget,
                      )
                    }
                  >
                    {change.is_stale
                      ? "Revisar proposta desatualizada"
                      : "Aprovar alteração"}
                  </ActionButton>
                  <ActionButton
                    disabled={busy || uncertain}
                    onClick={(event) =>
                      open(
                        {
                          kind: "reject_change",
                          id: change.id,
                          version: change.version,
                        },
                        event.currentTarget,
                      )
                    }
                  >
                    Rejeitar alteração
                  </ActionButton>
                </article>
              ))}
              {!currentData.changes.length &&
              !currentData.series.some(
                (series) => series.status === "proposed" && !series.ended_on,
              ) ? (
                <p>Não há propostas pendentes.</p>
              ) : null}
            </section>
          ) : null}
          <details className="ui-card" open={detailsOpen}>
            <summary
              onClick={(event) => {
                event.preventDefault();
                setDetailsOpen((current) => !current);
              }}
            >
              Tipos e programações
            </summary>
            {currentData.types.map((type) => (
              <div className="hca-record" key={type.id}>
                <strong>
                  {type.name} · {type.starts_local.slice(0, 5)} ·{" "}
                  {type.duration_minutes / 60}h
                </strong>
                {can(context, "schedule.types.manage") ? (
                  <ActionButton
                    disabled={busy || uncertain}
                    onClick={(event) =>
                      open({ kind: "type", type }, event.currentTarget)
                    }
                  >
                    Editar tipo
                  </ActionButton>
                ) : null}
              </div>
            ))}
            {currentData.series
              .filter(
                (series) => series.status === "published" && !series.ended_on,
              )
              .map((series) => (
                <div className="hca-record" key={series.id}>
                  <span>
                    {series.professional_name} · {series.anchor_date} a{" "}
                    {series.valid_until}
                  </span>
                  {team ||
                  (publishOwn && series.professional_id === context.userId) ? (
                    <ActionButton
                      disabled={busy || uncertain}
                      onClick={(event) =>
                        open(
                          {
                            kind: "end",
                            id: series.id,
                            version: series.version,
                          },
                          event.currentTarget,
                        )
                      }
                    >
                      Encerrar série
                    </ActionButton>
                  ) : null}
                </div>
              ))}
          </details>
          <details className="ui-card">
            <summary>Histórico de mudanças</summary>
            {currentData.events.map((event) => (
              <p key={event.id}>
                {stamp(event.created_at, "America/Sao_Paulo")} ·{" "}
                {scheduleEventLabel(event.action)} ·{" "}
                {event.actor_name_snapshot ??
                  "Nome do autor não preservado no evento antigo"}{" "}
                · {event.reason || "Sem motivo adicional"}
              </p>
            ))}
          </details>
        </>
      ) : null}
    </div>
  );
}
