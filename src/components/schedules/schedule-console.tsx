"use client";
import { ScheduleCreationPreparation } from "./schedule-creation-preparation";
import { ScheduleResourcePreparation } from "./schedule-resource-preparation";
import { ScheduleResourcePreparationsList } from "./schedule-resource-list";
import type { ScheduleResourceEntry, ScheduleResourcePurpose } from "@/lib/schedules/resource-preparations";
import type { ScheduleCreationPurpose } from "@/lib/schedules/creation";
import {
  ActionButton,
  CheckboxField,
  FormField,
  LoadingIndicator,
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
  type WorkspaceContext,
} from "@/components/workspace";
import { useLiveRevision } from "@/lib/use-live-revision";
import { useScopedRead } from "@/lib/use-scoped-read";
import { parseScheduleListRead } from "@/lib/validation/schedule-list";
import { parseBalanceAgendaRead } from "@/lib/validation/balances";
import { formatBrazilDate } from "@/lib/receipt";
import { adjacentPeriod, calendarPeriod, scheduleDisplayDay } from "@/lib/schedules/calendar";
import { localMinute } from "@/lib/schedules/time";
import type { ScheduleEditor } from "./schedule-forms";
import type { ScheduledShift } from "@/types/schedules";
import {
  useScheduleConfirmation,
  type ScheduleRecovery,
} from "./use-schedule-confirmation";
import { ScheduleConfirmationPanel } from "./schedule-confirmation-panel";
import { useScrollableRegion } from "@/components/ui/use-scrollable-region";
import { useResidenceHours } from "./use-residence-hours";
import { canConfigureResidenceHours, ScheduleResidenceRequirement } from "./schedule-residence-requirement";
import { ScheduleTypeSettings } from "./schedule-type-settings";
import { Menu } from "@base-ui/react/menu";
import { MenuPopup } from "@/components/ui/floating";
import { Icon } from "@/components/ui/icon";
import Link from "next/link";
import { scheduleResidenceSettingsHref, scheduleSettingsHref } from "@/lib/schedules/routes";
import { ScheduleDayCalendar } from "./schedule-day-calendar";
import { ScheduleShift } from "./schedule-shift";
import { ScheduleBalancePreview, scheduleBalanceMatches } from "./schedule-balance-preview";

const today = (timeZone?: string) =>
  new Intl.DateTimeFormat("sv-SE", { timeZone }).format(
    new Date(),
  );
const stateLabels: Record<string, string> = {
  published: "Publicado",
  proposed: "Proposta",
  cancelled: "Cancelado",
  rejected: "Recusado",
  obsolete: "Obsoleto",
};
const recurrenceLabels: Record<string, string> = {
  once: "Plantão único",
  weekly: "Semanal",
  dates: "Datas específicas",
  cycle: "Ciclo de trabalho e descanso",
};
export function PatientSchedule({ context, settings = false }: {
  context: WorkspaceContext;
  settings?: boolean;
}) {
  const patientId = context.patient!.id;
  const mayRead = can(context, "schedule.read.team") || can(context, "schedule.read.own");
  const [creationMessage, setCreationMessage] = useState("");
  const [privateRefresh, setPrivateRefresh] = useState(0);
  const ownSummaryRef = useRef<HTMLElement>(null);
  const recovery = useScheduleConfirmation(context.userId, patientId);
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
    entry?: ScheduleResourceEntry;
  } | null>(null);
  const openResource = (
    purpose: ScheduleResourcePurpose,
    target: string,
    day: string,
    opener: HTMLElement,
    entry?: ScheduleResourceEntry,
  ) => {
    if (!recovery.ready || recovery.busy || recovery.pending || preparation)
      return;
    setResource({ purpose, target, day, opener, entry });
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
      {settings ? (
        <ScheduleTypeSettings
          context={context}
          today={today()}
          recovery={recovery}
          onCreate={opener => create("shift_type_create", today(), opener)}
          onEdit={(id, opener) => openResource("shift_type_edit", id, today(), opener)}
        />
      ) : mayRead ? (
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
          {settings ? "Meus preenchimentos de tipos de plantão" : "Meus preenchimentos privados da agenda"}
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
              create(settings ? "shift_type_create" : "schedule_series_create", today(), e.currentTarget)
            }
          >
            {settings ? "Retomar meu tipo de plantão" : "Retomar minha programação"}
          </ActionButton>
          {!settings && (!mayRead || !can(context, "schedule.types.manage")) ? (
            <Link href={scheduleSettingsHref(patientId)} prefetch={false}>Consultar meus preenchimentos de tipos</Link>
          ) : null}
        </div>
        <ScheduleResourcePreparationsList
          context={context}
          typeSettings={settings}
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
          entry={resource.entry}
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
    entry?: ScheduleResourceEntry,
  ) => void;
}) {
  const scrollRegion = useScrollableRegion<HTMLDivElement>();
  const patient = context.patient!,
    team = can(context, "schedule.manage.team"),
    publishOwn = can(context, "schedule.manage.own");
  const mayCreate = team || publishOwn || can(context, "schedule.propose");
  const residence = useResidenceHours(patient.id, true);
  const params = useSearchParams(),
    reference = params.get("ref"),
    notice = useNotificationReference(
      patient.id,
      "schedule",
      reference,
      params.get("refKind") ?? "auto",
    );
  const requested = params.get("day");
  const fallbackDay = requested && /^\d{4}-\d{2}-\d{2}$/.test(requested)
    && !Number.isNaN(Date.parse(requested)) && new Date(requested).toISOString().slice(0, 10) === requested
    ? requested : today(residence.data?.hours?.timezone);
  const [chosenDay, setChosenDay] = useState<{
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
  const [mode, setMode] = useState<"day" | "week" | "month">("day");
  const [onlyMine, setOnlyMine] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [person, setPerson] = useState(""),
    [status, setStatus] = useState(""),
    [attempt, setAttempt] = useState(0);
  const [message, setMessage] = useState("");
  const rosterRef = useRef<HTMLHeadingElement>(null);
  const [balanceSelection, setBalanceSelection] = useState<{ shift: ScheduledShift; opener: HTMLButtonElement } | null>(null);
  const periodMode = mode === "month" ? "month" : "week";
  const live = useLiveRevision(), period = useMemo(() => calendarPeriod(day, periodMode), [day, periodMode]);
  const decode = useCallback((value: unknown) => parseScheduleListRead(value, {
    careRecipientId: patient.id, from: period.from, until: period.until,
  }), [patient.id, period.from, period.until]);
  const read = useScopedRead("/api/schedules?" + new URLSearchParams({
    careRecipientId: patient.id, from: period.from, until: period.until,
  }), String(live) + ":" + attempt, decode);
  const decodeBalance = useCallback((value: unknown) => parseBalanceAgendaRead(value, patient.id), [patient.id]);
  const balanceRead = useScopedRead(mode === "day" && !recovery.readDenied && can(context, "bal.read")
    ? "/api/balances?" + new URLSearchParams({ careRecipientId: patient.id, view: "agenda" }) : null,
  String(live) + ":" + attempt, decodeBalance);
  const data = read.data?.data ?? null, currentData = data, loading = read.loading;
  const eligibility = !read.error && !balanceRead.error ? balanceRead.data?.data.eligibility ?? null : null;
  const busy = recovery.busy || !recovery.ready || loading || Boolean(read.error),
    uncertain = recovery.pending !== null;
  function open(value: ScheduleEditor, target: HTMLElement, entry?: ScheduleResourceEntry) {
    if (busy || uncertain) return;
    if (value.kind === "series")
      onCreate("schedule_series_create", day, target);
    else if (value.kind === "shift")
      onResource("schedule_shift_edit", value.shift.id, day, target, entry);
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
  const readTeam = can(context, "schedule.read.team");
  const selectedPerson = readTeam ? onlyMine ? context.userId : person : "";
  const visible = useMemo(() => currentData?.shifts.filter(
    shift => (!selectedPerson || shift.professional_id === selectedPerson) && (!status || shift.status === status),
  ) ?? [], [currentData, selectedPerson, status]);
  const byDay = useMemo(() => {
    const result = new Map(period.dates.map(date => [date, [] as ScheduledShift[]]));
    for (const shift of visible) {
      if (mode === "day") {
        const from = localMinute(shift.starts_at, shift.timezone).slice(0, 10);
        const until = localMinute(shift.ends_at, shift.timezone);
        const endAtMidnight = until.endsWith("T00:00") && Date.parse(shift.ends_at) % 60_000 === 0;
        const lastDay = until.slice(0, 10);
        for (const [date, rows] of result) {
          if (date >= from && (date < lastDay || (date === lastDay && !endAtMidnight))) rows.push(shift);
        }
      } else {
        result.get(scheduleDisplayDay(shift.starts_at, shift.timezone, period.from))?.push(shift);
      }
    }
    return result;
  }, [visible, period, mode]);
  const seriesById = useMemo(() => new Map(currentData?.series.map(series => [series.id, series])), [currentData]);
  const renderShift = (shift: ScheduledShift) => {
    const daily = mode === "day", series = seriesById.get(shift.series_id);
    const ownsShift = shift.professional_id === context.userId;
    const published = shift.status === "published";
    const canEdit = published && (team || (ownsShift && publishOwn));
    const canRequest = published && can(context, "schedule.propose") && (ownsShift || readTeam);
    const mayEnd = daily && shift.status === "published" && series?.status === "published" && !series.ended_on
      && series.recurrence !== "once" && (series.open_ended || series.valid_until >= today(series.timezone))
      && (team || (publishOwn && series.professional_id === context.userId));
    const entries: ScheduleResourceEntry[] = [];
    if (canEdit) {
      if (team) entries.push("replace");
      entries.push("time", "cancel");
    }
    if (mayEnd) entries.push("end");
    if (canRequest) entries.push("request");
    const linked = daily && scheduleBalanceMatches(eligibility, shift);
    return <ScheduleShift key={shift.id} shift={shift} daily={daily}
      recurrence={series ? recurrenceLabels[series.recurrence] : undefined}
      stateLabel={stateLabels[shift.status]}
      earlier={localMinute(shift.starts_at, shift.timezone).slice(0, 10) < (daily ? day : period.from)}
      action={canEdit ? "Alterar plantão" : canRequest ? "Propor alteração" : undefined}
      entries={entries} disabled={busy || uncertain} onEdit={(target, entry) => {
        if (entry === "end" && mayEnd && !busy && !uncertain) {
          const localToday = today(series.timezone);
          onResource("schedule_series_end", series.id, day < localToday ? localToday : day, target, entry);
        } else if (entry !== "end") {
          open({ kind: "shift", shift }, target, entry ?? (!canEdit && canRequest ? "request" : undefined));
        }
      }}
      onOpenBalance={linked ? opener => {
        setBalanceSelection({ shift, opener });
        balanceRead.refresh();
      } : undefined} />;
  };
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
  const createUnavailable = uncertain || Boolean(read.error || residence.error)
    || !residence.data?.hours || !data?.types.some(type => type.is_active);
  // An existing action stays focusable during revalidation. Submission still waits for both reads.
  const checkingCreation = !createUnavailable && (busy || residence.loading);
  const occupied = new Set(period.dates.filter(date => byDay.get(date)?.length));
  const dailyShifts = byDay.get(day) ?? [];
  const selectedShift = balanceSelection && dailyShifts.find(shift => shift.id === balanceSelection.shift.id);
  return recovery.readDenied ? (
    <ScheduleConfirmationPanel recovery={recovery} onConfirmed={confirmed} />
  ) : (
    <div className="hca-form-stack hca-schedule-agenda">
      <NotificationReference
        key={patient.id + ":" + reference}
        read={notice}
        context={context}
      />
      <div className="hca-command-bar hca-agenda-commands">
        {can(context, "schedule.types.manage") ? (
          <Menu.Root>
            <Menu.Trigger render={<ActionButton variant="quiet" compact aria-label="Ações da agenda" />}>
              <Icon name="more" />
            </Menu.Trigger>
            <MenuPopup>
              <Menu.LinkItem className="hca-menu-item" href={scheduleSettingsHref(patient.id, day)}>
                <Icon name="settings" /> Tipos de plantão · configurações
              </Menu.LinkItem>
              {canConfigureResidenceHours(context) ? (
                <Menu.LinkItem className="hca-menu-item" href={scheduleResidenceSettingsHref(patient.id, day)}>
                  <Icon name="clock" /> Horários da residência
                </Menu.LinkItem>
              ) : null}
            </MenuPopup>
          </Menu.Root>
        ) : null}
      </div>
      {mayCreate && residence.error && !residence.loading ? (
        <Notice error>
          <p>Não foi possível consultar os horários da residência.</p>
          <ActionButton onClick={residence.refresh}>Consultar horários novamente</ActionButton>
        </Notice>
      ) : null}
      {mayCreate && !residence.loading && !residence.error && residence.data?.hours === null ? (
        <ScheduleResidenceRequirement context={context} day={day} />
      ) : null}
      {uncertain ? (
        <Notice>
          A confirmação não foi recebida. A mesma intenção está preservada;
          recupere o resultado antes de preparar outra ação.
        </Notice>
      ) : null}
      <ScheduleConfirmationPanel recovery={recovery} onConfirmed={confirmed} />
      {message ? <Notice>{message}</Notice> : null}
      {mode === "day" ? <ScheduleDayCalendar selected={day} days={period.dates} occupied={occupied} onSelect={setDay} /> : null}
      <div className="hca-agenda-roster-heading">
        <h2 ref={rosterRef} tabIndex={-1}>{mode === "day" ? "Plantões do dia" : mode === "week" ? "Plantões da semana" : "Plantões do mês"}</h2>
        {mayCreate ? <ActionButton compact aria-label="Nova programação" disabled={createUnavailable}
          aria-disabled={checkingCreation || undefined} onClick={event => {
            if (!createUnavailable && !checkingCreation) open({ kind: "series" }, event.currentTarget);
          }}><Icon name="plus" /></ActionButton> : null}
      </div>
      {readTeam ? <CheckboxField className="hca-agenda-only-mine" role="switch" label="Só meus plantões" checked={onlyMine}
        onChange={event => setOnlyMine(event.target.checked)} /> : null}
      {loading ? <LoadingIndicator label="Carregando escala" /> : null}
      {read.error ? <Notice error>{read.error} Atualize a escala para repetir a consulta.</Notice> : null}
      {mode === "day" && balanceRead.error && !balanceSelection ? <Notice error>
        Não foi possível conferir o balanço vinculado à agenda. <ActionButton onClick={balanceRead.refresh}>Consultar balanço novamente</ActionButton>
      </Notice> : null}
      {currentData && mode === "day" ? (
        dailyShifts.length ? <div className="hca-agenda-roster">{dailyShifts.map(renderShift)}</div> :
          <div className="hca-agenda-empty">
            <Icon name="calendar" /><strong>Nenhum plantão neste dia</strong>
            <p className="hca-muted">{selectedPerson || status ? "Ajuste os filtros ou consulte outra data." : "Consulte outra data."}</p>
          </div>
      ) : null}
      {balanceSelection ? <ScheduleBalancePreview patientId={patient.id} patientName={patient.display_name}
        shift={selectedShift ?? balanceSelection.shift}
        eligibility={selectedShift && scheduleBalanceMatches(eligibility, selectedShift) ? eligibility : null}
        checkedAt={Date.parse(balanceRead.queriedAt ?? "")}
        loading={loading || balanceRead.loading}
        error={Boolean(read.error || balanceRead.error)}
        onRetry={() => read.error ? read.refresh() : balanceRead.refresh()}
        onClose={() => setBalanceSelection(null)}
        finalFocus={() => balanceSelection.opener.isConnected ? balanceSelection.opener : rosterRef.current ?? false} /> : null}
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
            onChange={event => setMode(event.target.value as typeof mode)}
          >
            <option value="day">Dia</option>
            <option value="week">Semana</option>
            <option value="month">Mês</option>
          </SelectField>
        </FormField>
        {readTeam ? (
          <FormField label="Profissional">
            <SelectField
              value={onlyMine ? context.userId : person}
              disabled={onlyMine}
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
      {mode !== "day" ? <div className="hca-toolbar" role="group" aria-label="Período da escala">
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
      </div> : null}
      <ActionButton
        aria-disabled={loading}
        onClick={() => {
          if (!loading) setAttempt((value) => value + 1);
        }}
      >
        Atualizar escala
      </ActionButton>
      {read.queriedAt ? <p className="hca-muted">{loading || read.error ? "Última consulta preservada; ações aguardam atualização." : "Escala consultada:"} {formatBrazilDate(read.queriedAt)}.</p> : null}
      {currentData ? (
        <>
          <p className="hca-muted">
            Programação prevista, sem registro de presença.
          </p>
          {mode !== "day" ? <>
            <div className="hca-agenda-desktop" {...scrollRegion} role="region" aria-label="Calendário de plantões; rolagem horizontal quando necessária">
              {period.dates.map(renderDay)}
            </div>
            <div className="hca-agenda-mobile">{period.dates.map(renderDay)}</div>
          </> : null}
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
                      {series.anchor_date}{series.open_ended ? " · sem data de término" : " a " + series.valid_until}
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
              Séries publicadas
            </summary>
            {currentData.series
              .filter(
                (series) => series.status === "published" && !series.ended_on
                  && (series.recurrence !== "once" || !series.residence_version),
              )
              .map((series) => (
                <div className="hca-record" key={series.id}>
                  <span>
                    {series.professional_name} · {series.anchor_date}
                    {series.open_ended ? " · sem data de término" : " a " + series.valid_until}
                    {series.continuation_blocked ? " · próximos plantões aguardam revisão" : ""}
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
        </>
      ) : null}
    </div>
  );
}
