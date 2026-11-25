"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { ActionButton, Pill, SelectField, TextInput } from "@/components/ui/controls";
import { Dialog } from "@/components/ui/overlays";
import { Icon } from "@/components/ui/icon";
import { api, ApiError } from "@/lib/client/api";
import { formatBrazilDate } from "@/lib/receipt";
import { deliveryLabels } from "@/lib/notifications/presentation";
import { documentEventLabel } from "@/lib/notifications/event-labels";
import { inboxKind, inboxSearchLimit, type InboxKind, type InboxNotification } from "@/lib/notifications/inbox";
import { inboxKinds, inboxNoticeIcon } from "@/lib/notifications/inbox-presentation";
import { useInbox } from "@/lib/notifications/use-inbox";
import { Notice, Workspace } from "../workspace";
import { PushArrival } from "./push-arrival";
import { DeliveryImpact } from "./delivery-impact";
import { InboxNoticeDetails } from "./inbox-notice-details";
import "./notification-center.css";

export function NotificationCenter() {
  return <Workspace title="Avisos" eyebrow="Central de atualizações" heading={context => <div className="page-heading">
    <div>
      <p className="eyebrow">Central de atualizações</p>
      <h1>Avisos</h1>
      <p className="hca-inbox-patient">{context.patient?.display_name}</p>
    </div>
  </div>}>
    {context => <>
      <PushArrival />
      <Center key={[context.userId, context.activeContext?.mode, context.patient?.id].join(":")}
        patientId={context.activeContext?.mode === "patient" ? context.patient?.id : undefined}
        patientName={context.patient?.display_name}
      />
      {context.activeContext?.mode === "patient" && context.patient ? <div className="mt-5">
        <DeliveryImpact key={context.patient.id} patientId={context.patient.id} />
      </div> : null}
    </>}
  </Workspace>;
}

type NoticeFilter = "all" | "unread" | "tasks";

function updateInboxUrl(updates: Record<string, string | null>, replace = false) {
  const address = new URL(window.location.href);
  for (const [key, value] of Object.entries(updates)) {
    if (value === null) address.searchParams.delete(key);
    else address.searchParams.set(key, value);
  }
  const path = address.pathname + address.search + address.hash;
  if (path !== window.location.pathname + window.location.search + window.location.hash) {
    if (replace) window.history.replaceState(null, "", path);
    else window.history.pushState(null, "", path);
  }
}

function Center({ patientId, patientName }: { patientId?: string; patientName?: string }) {
  const params = useSearchParams();
  const page = Math.max(1, Math.min(100_000, Number.parseInt(params.get("page") ?? "1", 10) || 1));
  const search = (params.get("q") ?? "").trim().slice(0, inboxSearchLimit);
  const kind = inboxKind.safeParse(params.get("kind")).data ?? null;
  const filter: NoticeFilter = params.get("tasks") === "true" ? "tasks" : params.get("unread") === "true" ? "unread" : "all";
  const [input, setInput] = useState({ search, text: search });
  if (input.search !== search) setInput({ search, text: search });
  const searchText = input.search === search ? input.text : search;
  useEffect(() => {
    if (searchText.trim() === search) return;
    const timer = window.setTimeout(() => updateInboxUrl({ page: "1", q: searchText.trim() || null }, true), 250);
    return () => window.clearTimeout(timer);
  }, [search, searchText]);

  const [writeError, setWriteError] = useState("");
  const [noticeId, setNoticeId] = useState<string | null>(null);
  const noticeTriggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [proposedKind, setProposedKind] = useState<InboxKind | "" | null>(null);
  const [dismissedError, setDismissedError] = useState<string | null>(null);
  const inbox = useInbox({ patientId, page, kind, search, unread: filter === "unread", tasks: filter === "tasks" });
  const rows = inbox.data?.data ?? [], total = inbox.data?.total ?? 0;
  const activeError = inbox.errorKey && inbox.errorKey !== dismissedError && !noticeId && proposedKind === null;
  const changeFilter = (next: NoticeFilter) => updateInboxUrl({ page: "1", unread: String(next === "unread"), tasks: next === "tasks" ? "true" : null });
  const navigatePage = (next: number) => updateInboxUrl({ page: String(next), unread: String(filter === "unread") });
  const markSeen = async (id: string) => {
    setWriteError("");
    try {
      await api("/api/notifications", { id });
      inbox.invalidate();
    } catch (reason) {
      if (reason instanceof ApiError && [401, 403, 404, 409].includes(reason.status)) inbox.invalidate();
      setWriteError(reason instanceof Error ? reason.message : "Não foi possível confirmar a marcação como vista. Consulte novamente para conferir.");
    }
  };

  return <section className="hca-inbox" aria-label="Acompanhamento pessoal">
    {inbox.scopeRequired ? <Notice>Selecione um vínculo com paciente em Mudar perfil para consultar suas notificações.</Notice> : <>
      <div className="hca-inbox-summary">
        <span><strong>{inbox.fresh ? inbox.data?.unreadCount : "–"}</strong><small>não vistos</small></span>
        <span><strong>{inbox.fresh ? inbox.data?.actionCount : "–"}</strong><small>com ação pendente</small></span>
      </div>
      <div className="hca-inbox-search">
        <TextInput ref={searchRef} type="search" leading={<Icon name="search" width={17} height={17} />} placeholder="Buscar aviso ou ficha"
          aria-label="Buscar aviso ou ficha" maxLength={inboxSearchLimit} value={searchText}
          onChange={event => setInput({ search, text: event.currentTarget.value })} />
        <ActionButton aria-label="Filtrar avisos" onClick={() => setProposedKind(kind ?? "")}><Icon name="filter" /></ActionButton>
      </div>
      <div className="hca-inbox-filters" role="group" aria-label="Estado dos avisos">
        <button type="button" aria-pressed={filter === "unread"} onClick={() => changeFilter("unread")}>
          Não vistos{inbox.fresh && inbox.data ? <span aria-hidden="true">{inbox.data.unreadCount}</span> : null}
        </button>
        <button type="button" aria-pressed={filter === "all"} onClick={() => changeFilter("all")}>Todos</button>
        <button type="button" aria-pressed={filter === "tasks"} onClick={() => changeFilter("tasks")}>Com ação</button>
      </div>
      {kind ? <div className="hca-inbox-applied">
        <Pill tone="info">{inboxKinds[kind]}</Pill>
        <ActionButton compact variant="quiet" onClick={() => updateInboxUrl({ page: "1", kind: null })}>Limpar filtro</ActionButton>
      </div> : null}
      <div className="hca-inbox-query">
        {inbox.receivedAt ? <span><Icon name={inbox.fresh ? "check-circle" : "clock"} width={15} height={15} />
          {inbox.fresh ? "Atualizado em" : "Última consulta confirmada em"} {formatBrazilDate(inbox.receivedAt)}</span> : <span />}
        <ActionButton compact disabled={inbox.loading} onClick={inbox.refresh}><Icon name="refresh" width={16} height={16} />Atualizar</ActionButton>
      </div>
    </>}
    {inbox.error && !activeError && !inbox.loading ? <Notice error>{inbox.error} <ActionButton compact onClick={inbox.refresh}>Consultar notificações novamente</ActionButton></Notice> : null}
    {writeError ? <Notice error>{writeError}</Notice> : null}
    {inbox.loading ? <p className="my-3 text-sm" role="status">Consultando notificações…</p> : null}
    <ul className="hca-inbox-list" aria-label="Avisos consultados">
      {rows.map(row => <InboxRow key={row.id} row={row} fresh={inbox.fresh} onOpen={opener => {
        noticeTriggerRef.current = opener;
        setNoticeId(row.id);
      }} onSeen={() => { void markSeen(row.id); }} />)}
    </ul>
    {inbox.fresh && !rows.length ? <div className="hca-inbox-empty">
      <p>{search || kind ? "Nenhum aviso encontrado" : "Nenhuma notificação neste filtro."}</p>
      {search || kind ? <ActionButton compact onClick={() => { setInput({ search, text: "" }); updateInboxUrl({ page: "1", q: null, kind: null }); }}>Limpar filtros</ActionButton> : null}
    </div> : null}
    {total > 20 ? <nav className="mt-5 flex items-center justify-between gap-3" aria-label="Páginas das notificações">
      <ActionButton disabled={page === 1 || !inbox.fresh} onClick={() => navigatePage(page - 1)}>Anterior</ActionButton>
      <span className="text-sm">{page} / {Math.ceil(total / 20)}</span>
      <ActionButton disabled={page * 20 >= total || !inbox.fresh} onClick={() => navigatePage(page + 1)}>Próxima</ActionButton>
    </nav> : null}
    {!inbox.scopeRequired ? <p className="hca-inbox-note"><Icon name="eye" width={16} height={16} />Visto organiza sua leitura. A tarefa continua na ficha.</p> : null}
    {patientId && noticeId ? <InboxNoticeDetails key={noticeId} patientId={patientId} patientName={patientName} noticeId={noticeId}
      onClose={() => setNoticeId(null)} onUnavailable={inbox.invalidate}
      finalFocus={() => noticeTriggerRef.current?.isConnected ? noticeTriggerRef.current : searchRef.current} /> : null}
    {proposedKind !== null ? <Dialog open title="Filtrar avisos" kicker="Central de avisos" headingIcon="filter" onClose={() => setProposedKind(null)}
      footer={<><ActionButton onClick={() => setProposedKind(null)}>Cancelar</ActionButton><ActionButton variant="primary" onClick={() => {
        updateInboxUrl({ page: "1", kind: proposedKind || null }); setProposedKind(null);
      }}><Icon name="check" />Aplicar filtro</ActionButton></>}>
      <label className="grid gap-2 text-sm">Tipo de ficha
        <SelectField value={proposedKind} onChange={event => setProposedKind(inboxKind.safeParse(event.currentTarget.value).data ?? "")}>
          <option value="">Todos os tipos</option>
          {Object.entries(inboxKinds).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
        </SelectField>
      </label>
    </Dialog> : null}
    {activeError ? <Dialog open failure="rejected" title="Não foi possível consultar os avisos"
      onClose={() => setDismissedError(inbox.errorKey)}
      footer={<>
        <ActionButton onClick={() => setDismissedError(inbox.errorKey)}>Voltar aos avisos</ActionButton>
        <ActionButton variant="primary" onClick={inbox.refresh}><Icon name="refresh" />Consultar notificações novamente</ActionButton>
      </>}>
      <p role="alert">{inbox.error}</p>
      {inbox.receivedAt ? <p className="mt-2">Última consulta confirmada em {formatBrazilDate(inbox.receivedAt)}.</p> : null}
    </Dialog> : null}
  </section>;
}

function InboxRow({ row, fresh, onOpen, onSeen }: { row: InboxNotification; fresh: boolean; onOpen: (opener: HTMLButtonElement) => void; onSeen: () => void }) {
  const title = documentEventLabel(row.event_key ?? row.document_events?.action);
  const titleId = useId();
  return <li data-notification-id={row.id} className={"hca-inbox-row" + (row.seen_at ? "" : " hca-inbox-unread")}>
    <button type="button" className="hca-inbox-open" onClick={event => onOpen(event.currentTarget)} aria-label={"Ver aviso de " + (row.reference_code ?? title)} aria-describedby={titleId}>
      <span className="hca-inbox-icon"><Icon name={inboxNoticeIcon(row)} width={19} height={19} /></span>
      <span className="hca-inbox-content">
        <span className="hca-inbox-meta"><strong>{row.reference_code ?? "Atualização operacional"}</strong><time dateTime={row.created_at}>{formatBrazilDate(row.created_at)}</time></span>
        <span id={titleId} className="hca-inbox-title">{title}</span>
        {row.document_events?.actorName ? <span>{row.document_events.actorName}</span> : null}
        {row.channel !== "internal" ? <small>{row.channel === "whatsapp" ? "WhatsApp" : "E-mail"} · {deliveryLabels[row.state] ?? "Aguardando atualização"}</small> : null}
      </span>
      {row.seen_at ? <Icon name="chevron" width={16} height={16} /> : <span className="hca-inbox-unseen" aria-label="Não vista" />}
    </button>
    <div className="hca-inbox-actions">
      {row.task && fresh ? <Pill tone="warning">Ação pendente</Pill> : <span />}
      {row.seen_at ? <Pill tone="neutral">Vista no aplicativo</Pill> : <ActionButton compact disabled={!fresh} onClick={onSeen}><Icon name="eye" width={16} height={16} />Marcar como vista</ActionButton>}
    </div>
  </li>;
}
