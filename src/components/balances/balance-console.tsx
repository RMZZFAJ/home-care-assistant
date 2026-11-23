"use client";
import { ActionButton, LoadingIndicator, Pill, type PillTone } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BalanceRecountAssignment,
  recountHref,
} from "./balance-recount-assignment";
import { useEffect, useRef, useState } from "react";

import {
  api,
  can,
  Notice,
  type WorkspaceContext,
} from "@/components/workspace";
import {
  BalanceWorkspacePreparation,
  type BalancePreparationSelection,
} from "./balance-workspace-preparation";
import { formatZonedDate } from "@/lib/schedules/time";
import { documentEventLabel } from "@/lib/notifications/event-labels";
import { weekDays, type BalanceEditor } from "./balance-forms";
import { DeferralFacts } from "./balance-deferral-facts";
import { BalanceCountPermissionAction, BalanceCountPermissionHistory } from "./balance-count-permissions";
import { useBalanceWorkspace } from "./use-balance-workspace";
import { balanceRegimeSettingsHref } from "@/lib/schedules/routes";
import { balanceCountHref } from "@/lib/balances/routes";
import type { DocumentSummary } from "@/types/documents";
import { BalancePreviewCard } from "./balance-preview-card";
import { BalanceHistoryRow } from "./balance-history";
import { canManageBalanceRegime } from "./balance-regime-settings";

function balanceDateTitle(instant: string, timeZone?: string) {
  return "Balanço de " + new Intl.DateTimeFormat("pt-BR", {
    timeZone: timeZone ?? "America/Sao_Paulo", day: "numeric", month: "long",
  }).format(new Date(instant));
}

export function BalanceFollowUp({ context }: { context: WorkspaceContext; }) {
  const router = useRouter(),
    params = useSearchParams(),
    recountDocumentId = params.get("recountDocumentId");
  const patient = context.patient!,
    { data, checkedAt, error: loadError, reload } = useBalanceWorkspace(patient.id);
  const [editor, setEditor] = useState<BalancePreparationSelection | null>(
    null,
  ),
    [opener, setOpener] = useState<HTMLElement | null>(null);
  const [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [settledDeferralId, setSettledDeferralId] = useState<string | null>(
    null,
  );
  const resultRef = useRef<HTMLHeadingElement>(null);
  const formatBrazilDate = (value: string | null) =>
    formatZonedDate(value, data?.regime?.timezone);
  const family = ["family", "admin"].includes(patient.role),
    approve = family && can(context, "bal.defer.approve"),
    configure = canManageBalanceRegime(context);
  const requestedDeferral = params.get("purpose") === "request_deferral";
  useEffect(() => {
    if (!requestedDeferral || !data) return;
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      const assignment = data.eligibility.assignment;
      if (assignment && can(context, "bal.defer.request") && (assignment.professional_id === context.userId || patient.role === "supervisor")) {
        setEditor({ purpose: "request_deferral", targetResourceId: assignment.id });
        setOpener(resultRef.current);
      } else setError("Não há uma atribuição elegível para solicitar adiamento neste contexto. Consulte a programação atual.");
      const url = new URL(window.location.href); url.searchParams.delete("purpose");
      window.history.replaceState(null, "", url.pathname + url.search + url.hash);
    });
    return () => { active = false; };
  }, [requestedDeferral, data, context, patient.role]);
  useEffect(() => {
    const controller = new AbortController();
    api<{ data: DocumentSummary[]; }>(
      "/api/documents?" +
      new URLSearchParams({
        careRecipientId: patient.id,
        type: "BAL",
        status: "submitted",
        pageSize: "20",
      }),
      undefined,
      controller.signal,
    )
      .then((result) => {
        if (!controller.signal.aborted) setDocuments(result.data);
      })
      .catch((reason) => {
        if (!controller.signal.aborted) setError(reason.message);
      });
    return () => controller.abort();
  }, [patient.id, data?.events.length]);
  const open = (value: BalanceEditor, target: HTMLElement) => {
    const purpose =
      value.kind === "assign"
          ? "assign"
          : value.kind === "decide"
            ? value.approve
              ? "approve_deferral"
              : "reject_deferral"
            : value.family
              ? "defer"
              : "request_deferral";
    const targetResourceId =
      value.kind === "assign"
          ? value.cycleId
          : value.kind === "decide"
            ? value.deferral.id
            : data?.eligibility.assignment?.id;
    if (!targetResourceId) return;
    setEditor({ purpose, targetResourceId });
    setOpener(target);
    setError("");
  };
  if (!data)
    return loadError ? (
      <Notice error>
        {loadError}
        <ActionButton onClick={reload}>Tentar novamente</ActionButton>
      </Notice>
    ) : (
      <LoadingIndicator label="Carregando balanços" />
    );
  const { assignment: a, admission, available, documentId, dueAt } = data.eligibility;
  const current = data.assignments.find((row) => row.id === a?.id);
  const pending = data.obligations.find((row) => row.state === "pending");
  const timezone = data.regime?.timezone;
  const request = data.countPermissions?.request;
  const deferral = a && data.deferrals.find(row => row.assignment_id === a.id && row.status === "pending" && row.decisionContext?.sourceCurrent);
  const assignmentEvent = pending && data.events.find(event => event.cycle_id === pending.cycle_id
    && ["bal.cycle.unassigned", "bal.cycle.assigned", "bal.cycle.invalidated", "bal.cycle.missed"].includes(event.action));
  const requiresChoice = assignmentEvent?.action === "bal.cycle.unassigned" && assignmentEvent.details.ambiguous === true;
  const scheduledType = data.types.find(type => type.id === data.regime?.shift_type_id);
  const optionalCount = !data.regime?.activated_at && !a && !pending && can(context, "bal.count");
  let state = "Responsável definido", tone: PillTone = "neutral", note: string | undefined;
  if (admission) {
    state = "Contagem em andamento";
    tone = "success";
    note = "A contagem iniciada no plantão pode ser concluída no mesmo preenchimento.";
  } else if (request?.alreadyPending) {
    state = "Autorização solicitada";
    tone = "warning";
    note = "Aguarde a decisão da administração para fazer a contagem.";
  } else if (deferral) {
    state = "Adiamento solicitado";
    tone = "warning";
    note = "O prazo atual permanece vigente até a aprovação do pedido.";
  } else if (available) {
    state = "Disponível para contar";
    tone = "success";
  } else if (a && Date.parse(a.ends_at) <= checkedAt) {
    state = "Prazo encerrado";
    tone = "danger";
  } else if (a?.kind === "deferred") {
    state = "Adiado";
    tone = "info";
  } else if (a && Date.parse(a.starts_at) > checkedAt) {
    state = "Programado";
    note = "O responsável pode iniciar a contagem quando a janela do plantão abrir.";
  } else if (a && a.professional_id !== context.userId) {
    state = "Outro responsável";
  }
  if (a?.kind === "recount" && !note) note = "A recontagem mantém a ficha e as contagens já registradas.";
  const canRequest =
    can(context, "bal.defer.request") &&
    (a?.professional_id === context.userId || patient.role === "supervisor");
  const countAction = a && (available || admission) ? (
    <Link href={balanceCountHref(patient.id, documentId, a)} className="ui-button ui-button-primary" prefetch={false}>
      <Icon name="checklist" width={17} height={17} />{admission ? "Continuar contagem" : "Fazer balanço"}
    </Link>
  ) : request ? (
    <>
      {request.alreadyPending ? <a className="ui-button ui-button-secondary" href="#balance-count-permission-history">Ver pedido de autorização</a> : null}
      <BalanceCountPermissionAction key={request.assignmentId} entry={{ request }} context={context} timezone={timezone} onChanged={reload} />
    </>
  ) : null;
  return (
    <div className="hca-form-stack hca-balance-console">
      {loadError ? <Notice error>{loadError}</Notice> : null}
      {error ? <Notice error>{error}</Notice> : null}
      {message ? <Notice>{message}</Notice> : null}
      <section className="hca-balance-previews" id="responsabilidade-balanco" aria-labelledby="balance-forecasts-heading">
        <div className="hca-balance-list-heading">
          <h2 id="balance-forecasts-heading" ref={resultRef} tabIndex={-1}>Previstos</h2>
          {configure ? (
            <Link className="ui-button ui-button-secondary hca-balance-settings-link" href={balanceRegimeSettingsHref(patient.id)}
              aria-label="Programação dos balanços" title="Programação dos balanços" prefetch={false}>
              <Icon name="settings" width={18} height={18} />
            </Link>
          ) : null}
        </div>
        {a ? (
          <BalancePreviewCard key={a.id} title={balanceDateTitle(a.starts_at, timezone)} patientName={patient.display_name}
            state={state} tone={tone} note={note} responsible={current?.professional_name ?? "Profissional designado"}
            shiftType={current?.type_name} startsAt={a.starts_at} endsAt={a.ends_at} dueAt={dueAt ?? a.ends_at} timezone={timezone}
            primary={countAction}>
            {deferral ? (
              <a className="ui-button ui-button-secondary" href={"#adiamento-" + deferral.id}>Ver pedido de adiamento</a>
            ) : approve || canRequest ? (
              <ActionButton onClick={event => open({ kind: "defer", family: approve }, event.currentTarget)}>
                {approve ? "Adiar com decisão familiar" : "Solicitar adiamento"}
              </ActionButton>
            ) : null}
          </BalancePreviewCard>
        ) : pending ? (
          <BalancePreviewCard key={pending.cycle_id} title={balanceDateTitle(pending.original_start, timezone)} patientName={patient.display_name}
            state={requiresChoice ? "Escolha necessária" : "Sem responsável"} tone="warning"
            responsible={requiresChoice ? "Mais de um profissional elegível" : "Responsável a definir"}
            dueAt={pending.effective_due} timezone={timezone}
            note="Nenhuma pessoa foi escolhida automaticamente. Uma decisão autorizada é necessária."
            primary={configure ? (
              <ActionButton onClick={event => open({ kind: "assign", cycleId: pending.cycle_id, allowDeferral: approve }, event.currentTarget)}>
                Resolver atribuição
              </ActionButton>
            ) : null} />
        ) : optionalCount ? (
          <BalancePreviewCard title="Balanço de estoque" patientName={patient.display_name} state="Facultativo" tone="info"
            responsible="Sem programação semanal" note="A ficha registra o responsável quando a contagem é emitida."
            primary={<Link href="/fichas/bal" className="ui-button ui-button-primary" prefetch={false}>Nova contagem</Link>} />
        ) : data.recountRecovery.total > 0 ? (
          <Notice>Há reconto aguardando nova designação autorizada. Consulte as pendências abaixo.</Notice>
        ) : (
          <p className="hca-balance-empty">Não há contagem pendente neste momento.</p>
        )}
        {data.regime?.enabled && scheduledType ? (
          <div className="hca-balance-next">
            <Icon name="calendar" width={20} height={20} />
            <div>
              <strong>Programação semanal</strong>
              <small>{weekDays[data.regime.weekday]} · {scheduledType.name}</small>
            </div>
            <Pill>Ativa</Pill>
          </div>
        ) : null}
      </section>
      <BalanceCountPermissionHistory rows={data.countPermissions?.history ?? []} context={context} timezone={data.regime?.timezone} onChanged={reload} />
      {data.recountRecovery.total > 0 ? (
        <section
          className="ui-card space-y-3"
          aria-label="Recontos aguardando designação"
        >
          <h2>Recontos aguardando designação</h2>
          <p>
            {data.recountRecovery.total} pendência(s) registrada(s). Exibindo as{" "}
            {data.recountRecovery.items.length} mais antigas. O histórico
            paginado permite consultar outros balanços e abrir a designação pelo
            detalhe.
          </p>
          {data.recountRecovery.items.map((row) => (
            <article
              key={row.documentId}
              className="hca-record hca-recount-recovery-row"
            >
              <div className="hca-record-main">
                <strong>{row.code}</strong>
                <p>
                  Contagem {row.countVersion ?? "não identificada"} por{" "}
                  {row.counter.name ?? "Autoria não disponível"}.
                </p>
              </div>
              <div className="hca-toolbar">
                <Link href={"/documentos/" + row.documentId} prefetch={false}>
                  Consultar contagem
                </Link>
                {row.canAssign ? (
                  <Link
                    className="ui-button ui-button-primary"
                    href={recountHref(patient.id, row.documentId)}
                    prefetch={false}
                  >
                    Designar novo reconto
                  </Link>
                ) : (
                  <p>
                    A família ou supervisão habilitada precisa designar a
                    responsabilidade.
                  </p>
                )}
              </div>
            </article>
          ))}
        </section>
      ) : null}
      {data.deferrals.length ? (
        <section className="ui-card">
          <h2>Adiamentos</h2>
          {data.deferrals.map((d) => (
            <article
              key={d.id}
              className="hca-record"
              id={"adiamento-" + d.id}
              aria-label="Pedido de adiamento"
            >
              <div className="hca-record-main">
                <strong>
                  {d.status === "pending"
                    ? "Aguardando decisão familiar"
                    : d.status === "approved"
                      ? "Adiamento autorizado"
                      : d.status === "rejected"
                        ? "Solicitação rejeitada"
                        : "Solicitação superada pela atualização da atribuição"}
                </strong>
                <small>{formatBrazilDate(d.created_at)}</small>
                <DeferralFacts deferral={d} timezone={data.regime?.timezone} />
                {d.status === "pending" ? (
                  <p>O prazo original permanece vigente até a aprovação.</p>
                ) : null}
              </div>
              {d.status === "pending" && approve ? (
                <div className="hca-toolbar">
                  <ActionButton
                    disabled={
                      settledDeferralId === d.id ||
                      !d.decisionContext?.canApprove
                    }
                    onClick={(e) =>
                      open(
                        { kind: "decide", deferral: d, approve: true },
                        e.currentTarget,
                      )
                    }
                  >
                    Aprovar adiamento
                  </ActionButton>
                  <ActionButton
                    disabled={
                      settledDeferralId === d.id ||
                      !d.decisionContext?.canReject
                    }
                    onClick={(e) =>
                      open(
                        { kind: "decide", deferral: d, approve: false },
                        e.currentTarget,
                      )
                    }
                  >
                    Rejeitar adiamento
                  </ActionButton>
                </div>
              ) : null}
            </article>
          ))}
        </section>
      ) : null}
      {documents.length ? (
        <section className="hca-balance-previews" aria-label="Contagens em revisão">
          <div className="hca-balance-list-heading"><h2>Em acompanhamento</h2></div>
          {documents.map((d) => (
            <div key={d.id} className="hca-balance-review">
              <BalanceHistoryRow row={d} href={"/documentos/" + d.id} />
              {data.obligations.some(
                (o) =>
                  o.count_document_id === d.id || o.regularized_by === d.id,
              ) &&
                !a &&
                (can(context, "bal.approve.family") ||
                  can(context, "bal.approve.supervisor")) ? (
                <Link
                  href={recountHref(patient.id, d.id)}
                  className="ui-button ui-button-secondary"
                  prefetch={false}
                >
                  Designar reconto
                </Link>
              ) : null}
            </div>
          ))}
        </section>
      ) : null}
      <section className="hca-records">
        <div className="hca-dashboard-section-heading">
          <h2>Obrigações por semana</h2>
        </div>
        {data.obligations.length ? (
          data.obligations.map((o) => (
            <article key={o.id} className="hca-record">
              <div className="hca-record-main">
                <strong>
                  Semana de {o.week_start.split("-").reverse().join("/")}
                </strong>
                <p>
                  {o.state === "regularized"
                    ? "Regularizada por contagem atual posterior"
                    : o.state === "counted"
                      ? "Contagem física registrada"
                      : "Pendente"}
                </p>
                <small>
                  Prazo original: {formatBrazilDate(o.original_due)}
                </small>
                {o.effective_due !== o.original_due ? (
                  <p>
                    Prazo após decisão familiar:{" "}
                    {formatBrazilDate(o.effective_due)}
                  </p>
                ) : null}
                {o.missed_at ? (
                  <p>
                    Prazo não cumprido em {formatBrazilDate(o.missed_at)}. O
                    atraso permanece no histórico.
                  </p>
                ) : null}
                {o.actual_count_at ? (
                  <p>Contagem efetiva: {formatBrazilDate(o.actual_count_at)}</p>
                ) : null}
              </div>
              {o.count_document_id || o.regularized_by ? (
                <Link
                  href={
                    "/documentos/" + (o.count_document_id ?? o.regularized_by)
                  }
                  prefetch={false}
                >
                  Abrir BAL
                </Link>
              ) : null}
            </article>
          ))
        ) : (
          <p className="p-5 hca-muted">
            Nenhuma obrigação criada pelo novo regime.
          </p>
        )}
      </section>
      {recountDocumentId ? (
        <BalanceRecountAssignment
          context={context}
          key={patient.id + ":" + recountDocumentId}
          patientId={patient.id}
          documentId={recountDocumentId}
          onCommitted={reload}
          restoreFocusFallbackRef={resultRef}
          onClose={() =>
            router.replace(
              "/balancos?" +
              new URLSearchParams({ careRecipientId: patient.id }),
              { scroll: false },
            )
          }
        />
      ) : null}
      {editor ? (
        <BalanceWorkspacePreparation
          key={
            patient.id + ":" + editor.purpose + ":" + editor.targetResourceId
          }
          context={context}
          selection={editor}
          initialData={data}
          onConsulted={reload}
          restoreFocusTo={opener}
          restoreFocusFallbackRef={resultRef}
          onClose={() => {
            setEditor(null);
          }}
          onCommitted={() => {
            setEditor(null);
            if (
              editor.purpose === "approve_deferral" ||
              editor.purpose === "reject_deferral"
            )
              setSettledDeferralId(editor.targetResourceId);
            setMessage(
              editor.purpose === "request_deferral"
                ? "Solicitação registrada. O prazo atual continua válido até uma decisão familiar."
                : "Decisão registrada. Consulte a atribuição e o histórico atualizados.",
            );
            reload();
          }}
        />
      ) : null}
    </div>
  );
}

const assignmentStatus: Record<string, string> = {
  missed: "Não realizado no prazo",
  deferred: "Adiado por decisão familiar",
  invalidated: "Escala alterada; atribuição preservada no histórico",
  counted: "Contagem registrada",
  active: "Designado",
};

export function BalanceAssignmentHistory({ patientId }: { patientId: string }) {
  const { data, error, reload } = useBalanceWorkspace(patientId);
  const format = (value: string) => formatZonedDate(value, data?.regime?.timezone);
  if (error) return <Notice error>{error} <ActionButton onClick={reload}>Tentar novamente</ActionButton></Notice>;
  if (!data) return <LoadingIndicator label="Consultando atribuições de balanço" />;
  return <>
    <details className="ui-card">
      <summary>Atribuições e atrasos históricos</summary>
      {data.assignments.length ? data.assignments.map(assignment => <p key={assignment.id}>
        {assignment.professional_name} · {format(assignment.starts_at)} → {format(assignment.ends_at)} · {assignmentStatus[assignment.status] ?? "Atribuição registrada"}
      </p>) : <p>Nenhuma atribuição registrada.</p>}
    </details>
    <details className="ui-card">
      <summary>Eventos auditáveis</summary>
      {data.events.length ? data.events.map(event => <p key={event.id}>
        {format(event.created_at)} · {documentEventLabel(event.action)} · {event.reason}
      </p>) : <p>Nenhum evento registrado.</p>}
    </details>
  </>;
}
