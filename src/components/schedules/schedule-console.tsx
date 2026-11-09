"use client";
import { ActionButton, FormField, LoadingIndicator, Pill, SelectField, TextAreaField, TextInput } from "@/components/ui/controls";
import { useEffect, useRef, useState } from "react";
import {useSearchParams} from "next/navigation";
import {useNotificationReference} from "@/lib/notifications/use-notification-reference";
import {NotificationReference} from "@/components/notifications/notification-reference";

import {
  api,
  ApiError,
  can,
  Notice,
  Workspace,
  type WorkspaceContext,
} from "@/components/workspace";
import { RecordDrawer } from "@/components/forms/record-drawer";
import { Dialog } from "@/components/ui/primitives";
import { useLiveRevision } from "@/lib/use-live-revision";
import { adjacentPeriod, calendarPeriod } from "@/lib/schedules/calendar";
import { ScheduleForm, type ScheduleEditor } from "./schedule-forms";
import {
  ScheduleReviewDetails,
  scheduleStamp as stamp,
  type ScheduleReview,
} from "./schedule-review";
import type { ScheduleCommand } from "@/lib/validation/schedules";
import type { ScheduleWorkspace, ScheduledShift } from "@/types/schedules";

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
import {scheduleEventLabel} from "@/lib/schedules/presentation";
export function ScheduleConsole() {
  return (
    <Workspace title="Escalas e plantões">
      {(context) =>
        context.patient &&
        (can(context, "schedule.read.team") ||
          can(context, "schedule.read.own")) ? (
          <Agenda key={context.patient.id} context={context} />
        ) : (
          <Notice error>
            Selecione um vínculo com permissão para consultar escalas.
          </Notice>
        )
      }
    </Workspace>
  );
}
function Agenda({ context }: { context: WorkspaceContext }) {
  const patient = context.patient!,
    team = can(context, "schedule.manage.team"),
    publishOwn = can(context, "schedule.manage.own");
  const params=useSearchParams(),reference=params.get("ref"),notice=useNotificationReference(patient.id,"schedule",reference,params.get("refKind")??"auto");
  const [fallbackDay]=useState(today),[chosenDay,setChosenDay]=useState<{reference:string|null;day:string}|null>(null);
  const day=chosenDay?.reference===reference?chosenDay.day:notice.data?.kind==="schedule"?notice.data.referenceDay:fallbackDay;
  const setDay=(value:string)=>setChosenDay({reference,day:value});
  const [mode, setMode] = useState<"week" | "month">("week");
  const [detailsOpen,setDetailsOpen]=useState(false);
  const [person, setPerson] = useState(""),
    [status, setStatus] = useState(""),
    [attempt, setAttempt] = useState(0);
  const [query, setQuery] = useState<{
    key: string;
    range: string;
    data: ScheduleWorkspace | null;
    error: string;
  }>({ key: "", range: "", data: null, error: "" });
  const [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false),
    [uncertain, setUncertain] = useState(false),
    [conflict, setConflict] = useState(false);
  const [editor, setEditor] = useState<ScheduleEditor | null>(null),
    [review, setReview] = useState<ScheduleReview | null>(null);
  const [editorWorkspace, setEditorWorkspace] =
    useState<ScheduleWorkspace | null>(null);
  const [opener, setOpener] = useState<HTMLElement | null>(null);
  const pendingRef = useRef<object | null>(null);
  const reviewHeadingRef = useRef<HTMLHeadingElement>(null);
  const reviewOpen = Boolean(review);
  useEffect(() => {
    if (!reviewOpen) return;
    const frame = requestAnimationFrame(() =>
      reviewHeadingRef.current?.focus(),
    );
    return () => cancelAnimationFrame(frame);
  }, [reviewOpen]);
  const live = useLiveRevision(),
    period = calendarPeriod(day, mode);
  const rangeKey = patient.id + ":" + period.from + ":" + period.until;
  const queryKey = rangeKey + ":" + live + ":" + attempt;
  const data = query.data,
    loading = query.key !== queryKey;
  const currentData = query.range === rangeKey ? data : null;
  useEffect(() => {
    const controller = new AbortController();
    api<{ data: ScheduleWorkspace }>(
      "/api/schedules?" +
        new URLSearchParams({
          careRecipientId: patient.id,
          from: period.from,
          until: period.until,
        }),
      undefined,
      controller.signal,
    )
      .then((result) => {
        if (!controller.signal.aborted)
          setQuery({
            key: queryKey,
            range: rangeKey,
            data: result.data,
            error: "",
          });
      })
      .catch((reason) => {
        if (!controller.signal.aborted)
          setQuery((previous) => ({
            ...previous,
            key: queryKey,
            error:
              reason instanceof Error
                ? reason.message
                : "Não foi possível consultar a escala.",
          }));
      });
    return () => controller.abort();
  }, [patient.id, period.from, period.until, queryKey, rangeKey]);
  function open(value: ScheduleEditor, target: HTMLElement) {
    setDay(day);
    setOpener(target);
    setEditorWorkspace(data);
    setEditor(value);
    setError("");
    setConflict(false);
  }
  function openReview(
    command: ScheduleCommand,
    version?: number,
    target?: HTMLElement,
  ) {
    const workspace = target ? data : (editorWorkspace ?? data);
    if (!workspace) return;
    if (target) setOpener(target);
    setError("");
    setConflict(false);
    // Hold the exact displayed object while live queries receive newer data.
    setReview({ command, version, workspace });
  }
  async function send() {
    if (!pendingRef.current && review)
      pendingRef.current = {
        careRecipientId: patient.id,
        command: review.command,
        expectedVersion: review.version ?? null,
        idempotencyKey: crypto.randomUUID(),
      };
    if (!pendingRef.current) return;
    setBusy(true);
    setError("");
    try {
      await api("/api/schedules", pendingRef.current);
      pendingRef.current = null;
      setUncertain(false);
      setConflict(false);
      setReview(null);
      setEditor(null);
      setMessage(
        review?.command.action === "close_obsolete"
          ? "Proposta encerrada como obsoleta. A programação atual foi preservada."
          : review?.command.action === "propose_change" ||
              (review?.command.action === "series" && !team && !publishOwn)
            ? "Proposta registrada. A programação publicada será alterada somente após aprovação."
            : "Escala gravada. As responsabilidades documentais anteriores foram preservadas.",
      );
      setAttempt((value) => value + 1);
    } catch (reason) {
      if (
        reason instanceof ApiError &&
        [400, 401, 403, 404, 409, 422].includes(reason.status)
      ) {
        pendingRef.current = null;
        setUncertain(false);
        if (reason.status === 409 && reason.code !== "SCHEDULE_OVERLAP")
          setConflict(true);
      } else setUncertain(true);
      setError(
        reason instanceof Error ? reason.message : "Não foi possível gravar.",
      );
    } finally {
      setBusy(false);
    }
  }
  const visible =
    currentData?.shifts.filter(
      (shift) =>
        (!person || shift.professional_id === person) &&
        (!status || shift.status === status),
    ) ?? [];
  const renderShift = (shift: ScheduledShift) => (
    <article
      key={shift.id}
      className="hca-shift-card"
      aria-label={`${shift.type_name} · ${shift.professional_name}`}
    >
      <div className="hca-toolbar">
        <strong>{shift.type_name}</strong>
        <Pill

          tone={shift.status === "published" ? "accent" : "neutral"}
        >
          {stateLabels[shift.status]}
        </Pill>
      </div>
      <p>{shift.professional_name}</p>
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
    const shifts = visible.filter(
      (shift) =>
        new Intl.DateTimeFormat("sv-SE", { timeZone: shift.timezone }).format(
          new Date(shift.starts_at),
        ) === date,
    );
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
  const errors = (
    <>
      {error ? <Notice error>{error}</Notice> : null}
      {uncertain ? (
        <Notice>
          A confirmação não foi recebida. A mesma intenção está preservada;
          recupere o resultado antes de preparar outra ação.
        </Notice>
      ) : null}
    </>
  );
  const reviewId =
    review && "id" in review.command.body ? review.command.body.id : undefined;
  const proposal =
    review &&
    (review.command.action === "decide_change" ||
      review.command.action === "close_obsolete")
      ? review.workspace.changes.find((change) => change.id === reviewId)
      : undefined;
  const decision =
    review?.command.action === "decide_change" ||
    review?.command.action === "close_obsolete";
  const decisionReason =
    review && decision && "reason" in review.command.body
      ? (review.command.body.reason ?? "")
      : "";
  const reasonRequired =
    review?.command.action === "close_obsolete" ||
    (review?.command.action === "decide_change" &&
      !review.command.body.approve);
  const invalidReason =
    decision &&
    (reasonRequired
      ? decisionReason.trim().length < 3
      : decisionReason.length > 0 && decisionReason.trim().length < 3);
  const blockedApproval =
    review?.command.action === "decide_change" &&
    review.command.body.approve &&
    (!proposal?.source_snapshot ||
      !proposal.proposed_snapshot ||
      proposal.is_stale ||
      proposal.bal_impact.requires_family_decision);
  const blockedSeries =
    review?.command.action === "approve" &&
    review.workspace.series.find((series) => series.id === reviewId)
      ?.publication_blocked;
  const commandOwner =
    review?.workspace.series.find((series) => series.id === reviewId)
      ?.professional_id ??
    review?.workspace.shifts.find((shift) => shift.id === reviewId)
      ?.professional_id;
  const canConfirm = !review
    ? false
    : decision
      ? team
      : review.command.action === "type"
        ? can(context, "schedule.types.manage")
        : review.command.action === "series"
          ? team ||
            (review.command.body.professionalId === context.userId &&
              (publishOwn || can(context, "schedule.propose")))
          : review.command.action === "propose_change"
            ? can(context, "schedule.propose")
            : team || (commandOwner === context.userId && publishOwn);
  const confirmLabel =
    review?.command.action === "close_obsolete"
      ? "Encerrar proposta obsoleta"
      : review?.command.action === "decide_change"
        ? review.command.body.approve
          ? "Aprovar proposta"
          : "Confirmar rejeição"
        : review?.command.action === "approve"
          ? "Aprovar proposta"
          : review?.command.action === "reject"
            ? "Confirmar rejeição"
            : "Confirmar gravação";
  const reviewContents = review ? (
    <div className="hca-schedule-review min-w-0 space-y-3">
      <h3 tabIndex={-1} ref={reviewHeadingRef}>
        Conferência da escala
      </h3>
      <ScheduleReviewDetails review={review} />
      {blockedSeries ? (
        <Notice error>
          O profissional não está apto para esta publicação ou a série já foi
          encerrada. Recuse a proposta com motivo ou prepare uma programação
          válida.
        </Notice>
      ) : null}
      {decision ? (
        <FormField label="Motivo desta decisão" required={reasonRequired}>
          <TextAreaField
            value={decisionReason}
            minLength={3}
            maxLength={1000}
            disabled={busy || uncertain || conflict}
            onChange={(event) => {
              const value = event.target.value;
              setReview((previous) => {
                if (previous?.command.action === "close_obsolete")
                  return {
                    ...previous,
                    command: {
                      ...previous.command,
                      body: { ...previous.command.body, reason: value },
                    },
                  };
                if (previous?.command.action === "decide_change")
                  return {
                    ...previous,
                    command: {
                      ...previous.command,
                      body: {
                        ...previous.command.body,
                        reason: value || undefined,
                      },
                    },
                  };
                return previous;
              });
            }}
          />
          <small>
            O motivo de quem propôs e as notas acima são preservados.
          </small>
        </FormField>
      ) : null}
      {errors}
      {conflict ? (
        <Notice error>
          A versão ou uma condição necessária mudou. A revisão exibida foi
          preservada e não será aprovada automaticamente com dados novos.
          <ActionButton
            disabled={busy}
            onClick={() => {
              setReview(null);
              setEditor(null);
              setConflict(false);
              setError("");
              setAttempt((value) => value + 1);
            }}
          >
            Fechar revisão e atualizar
          </ActionButton>
        </Notice>
      ) : null}
      {!canConfirm ? (
        <Notice error>
          Seu vínculo não permite mais esta decisão. Nenhuma aprovação pode ser
          realizada por este perfil.
        </Notice>
      ) : null}
      <div className="hca-toolbar hca-schedule-decision-actions">
        <ActionButton
          disabled={busy || uncertain}
          onClick={() => {
            setReview(null);
            requestAnimationFrame(() =>
              document.getElementById("schedule-review-button")?.focus(),
            );
          }}
        >
          Voltar
        </ActionButton>
        <ActionButton
          variant="primary"
          disabled={
            busy ||
            conflict ||
            invalidReason ||
            blockedApproval ||
            blockedSeries ||
            !canConfirm
          }
          onClick={() => void send()}
        >
          {uncertain ? "Recuperar confirmação" : confirmLabel}
        </ActionButton>
      </div>
    </div>
  ) : null;
  return (
    <div className="hca-form-stack hca-schedule-agenda">
      <NotificationReference key={patient.id+":"+reference} read={notice} context={context}/>
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
      {!editor && !review ? errors : null}
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
      <ActionButton aria-disabled={loading} onClick={() => { if (!loading) setAttempt(value => value + 1); }}>Atualizar escala</ActionButton>
      {loading ? <LoadingIndicator label="Carregando escala" /> : null}
      {!loading && query.error ? (
        <Notice error>
          {query.error}
        </Notice>
      ) : null}
      {!loading && currentData && !query.error ? (
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
                      onClick={(event) =>
                        openReview(
                          { action: "approve", body: { id: series.id } },
                          series.version,
                          event.currentTarget,
                        )
                      }
                    >
                      Aprovar programação
                    </ActionButton>
                    <ActionButton
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
                    onClick={(event) =>
                      openReview(
                        change.is_stale
                          ? {
                              action: "close_obsolete",
                              body: { id: change.id, reason: "" },
                            }
                          : {
                              action: "decide_change",
                              body: { id: change.id, approve: true },
                            },
                        change.version,
                        event.currentTarget,
                      )
                    }
                  >
                    {change.is_stale
                      ? "Revisar proposta desatualizada"
                      : "Aprovar alteração"}
                  </ActionButton>
                  <ActionButton
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
              <summary onClick={event=>{event.preventDefault();setDetailsOpen(current=>!current);}}>Tipos e programações</summary>
            {currentData.types.map((type) => (
              <div className="hca-record" key={type.id}>
                <strong>
                  {type.name} · {type.starts_local.slice(0, 5)} ·{" "}
                  {type.duration_minutes / 60}h
                </strong>
                {can(context, "schedule.types.manage") ? (
                  <ActionButton
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
      {editor && editorWorkspace ? (
        <RecordDrawer
          title={
            review
              ? "Revisar escala"
              : editor.kind === "type"
                ? "Tipo de plantão"
                : editor.kind === "series"
                  ? "Programação de plantões"
                  : editor.kind === "end"
                    ? "Encerrar programação"
                    : "Alteração pontual"
          }
          onClose={() => {
            setEditor(null);
            setReview(null);
          }}
          busy={busy}
          preventClose={uncertain}
          restoreFocusTo={opener}
        >
          <div hidden={Boolean(review)} inert={Boolean(review)}>
            <fieldset className="min-w-0" disabled={Boolean(review)}>
              {!review ? errors : null}
              <ScheduleForm
                editor={editor}
                data={editorWorkspace}
                ownId={context.userId}
                team={team}
                publishOwn={publishOwn}
                today={day}
                onReview={openReview}
              />
            </fieldset>
          </div>
          {review ? reviewContents : null}
        </RecordDrawer>
      ) : null}
      {review && !editor ? (
        <Dialog
          open
          title="Revisar escala"
          onClose={() => {
            if (!busy && !uncertain) setReview(null);
          }}
        >
          {reviewContents}
        </Dialog>
      ) : null}
    </div>
  );
}
