"use client";
import { useCallback, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ActionButton, FormField, SelectField, TextInput } from "@/components/ui/controls";
import { Notice } from "@/components/workspace";
import { useScopedRead } from "@/lib/use-scoped-read";
import { useLiveRevision } from "@/lib/use-live-revision";
import { formatBrazilDate } from "@/lib/receipt";
import { scheduleEventLabel, scheduleEventLabels } from "@/lib/schedules/presentation";
import { parseScheduleHistoryRead, type ScheduleHistoryFilters } from "@/lib/validation/schedule-history";

const names = { query: "scheduleHistoryQuery", action: "scheduleHistoryAction", reference: "scheduleHistoryReference", from: "scheduleHistoryFrom", to: "scheduleHistoryTo" };
export function ScheduleHistory({ patientId, readerId }: { patientId: string; readerId: string }) {
  const params = useSearchParams();
  const [open, setOpen] = useState(() => params.has("scheduleHistoryPage") || Object.values(names).some(name => params.has(name)));
  return <details className="ui-card" open={open} onToggle={event => setOpen(event.currentTarget.open)}>
    <summary>Histórico de mudanças</summary>
    {open ? <ScheduleHistoryContent patientId={patientId} readerId={readerId} /> : null}
  </details>;
}
function ScheduleHistoryContent({ patientId, readerId }: { patientId: string; readerId: string }) {
  const params = useSearchParams(), router = useRouter(), revision = useLiveRevision();
  const queryText = (params.get(names.query) ?? "").trim(), action = (params.get(names.action) ?? "").trim();
  const reference = (params.get(names.reference) ?? "").trim(), from = (params.get(names.from) ?? "").trim(), to = (params.get(names.to) ?? "").trim();
  const values: ScheduleHistoryFilters = { query: queryText, action, reference, from, to };
  const filterKey = JSON.stringify(values), page = Number(params.get("scheduleHistoryPage") ?? "1");
  const [draft, setDraft] = useState({ filterKey, values });
  if (draft.filterKey !== filterKey) setDraft({ filterKey, values });
  const search = new URLSearchParams({ careRecipientId: patientId, page: String(page), pageSize: "20" });
  for (const [name, value] of Object.entries(values)) if (value) search.set(name, value);
  const decode = useCallback((value: unknown) => parseScheduleHistoryRead(value, { careRecipientId: patientId, readerId, page, pageSize: 20, query: queryText, action, reference, from, to }), [patientId, readerId, page, queryText, action, reference, from, to]);
  const read = useScopedRead("/api/schedules/events?" + search, String(revision), decode);
  const { data, error, loading } = read, fresh = Boolean(data && !error && !loading);
  const setField = (field: keyof ScheduleHistoryFilters, value: string) => setDraft({ filterKey, values: { ...draft.values, [field]: value } });
  const navigate = (nextValues: Partial<ScheduleHistoryFilters>, nextPage = 1) => {
    const next = new URLSearchParams(params.toString()); next.set("scheduleHistoryPage", String(nextPage));
    for (const [key, value] of Object.entries(nextValues)) { if (value) next.set(names[key as keyof ScheduleHistoryFilters], value); else next.delete(names[key as keyof ScheduleHistoryFilters]); }
    if (JSON.stringify({ ...values, ...nextValues }) === filterKey && nextPage === page) read.refresh();
    if (next.toString() !== params.toString()) router.push("/escalas?" + next, { scroll: false });
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    navigate(Object.fromEntries(Object.keys(names).map(name => [name, String(form.get(name) ?? "").trim()])));
  };
  const actions = [...new Set([...Object.keys(scheduleEventLabels), ...(data?.data.map(row => row.action) ?? []), ...(draft.values.action ? [draft.values.action] : [])])];
  return <section className="mt-4 space-y-4" aria-label="Histórico da agenda" aria-busy={loading}>
    <h2 className="font-semibold">Mudanças registradas na agenda</h2>
    <p>Consulte alterações anteriores. A consulta não registra presença nem altera plantões.</p>
    <form className="hca-form" onSubmit={submit}>
      <div className="hca-compact-grid">
        <FormField label="Buscar motivo da alteração"><TextInput name="query" type="search" maxLength={160} value={draft.values.query} onChange={event => setField("query", event.currentTarget.value)} /></FormField>
        <FormField label="Tipo de alteração na agenda"><SelectField name="action" value={draft.values.action} onChange={event => setField("action", event.currentTarget.value)}><option value="">Todos os tipos</option>{actions.map(action => <option key={action} value={action}>{scheduleEventLabel(action)} · {action}</option>)}</SelectField></FormField>
        <FormField label="Referência do evento, plantão ou programação"><TextInput name="reference" maxLength={36} value={draft.values.reference} onChange={event => setField("reference", event.currentTarget.value)} /></FormField>
        <FormField label="Data inicial das alterações"><TextInput name="from" type="date" value={draft.values.from} onChange={event => setField("from", event.currentTarget.value)} /></FormField>
        <FormField label="Data final das alterações"><TextInput name="to" type="date" value={draft.values.to} onChange={event => setField("to", event.currentTarget.value)} /></FormField>
      </div>
      <div className="hca-toolbar">
        <ActionButton type="submit" variant="primary">Consultar mudanças</ActionButton>
        <ActionButton type="button" onClick={() => navigate({ query: "", action: "", reference: "", from: "", to: "" })}>Limpar filtros de mudanças</ActionButton>
        <ActionButton type="button" disabled={loading} onClick={read.refresh}>Atualizar mudanças</ActionButton>
      </div>
    </form>
    {loading ? <Notice>Consultando histórico da agenda…</Notice> : null}
    {error ? <Notice error>{error} <ActionButton onClick={read.refresh}>Consultar mudanças novamente</ActionButton></Notice> : null}
    {data && !fresh ? <p className="text-sm text-(--muted)">Última consulta confirmada{read.queriedAt ? " em " + formatBrazilDate(read.queriedAt) : ""}; aguardando atualização.</p> : null}
    {data ? <>
      <p role="status">{data.total} {data.total === 1 ? "alteração encontrada" : "alterações encontradas"} · página {data.page} de {Math.max(1, Math.ceil(data.total / data.pageSize))}</p>
      {fresh && !data.data.length ? <p>Nenhuma alteração corresponde aos filtros consultados.</p> : null}
      <ol className="hca-records">{data.data.map(event => <li key={event.id} data-schedule-event-id={event.id} className="rounded-lg border border-(--line) p-3 space-y-2">
        <h3 className="font-semibold">{scheduleEventLabel(event.action)}</h3>
        <p>{formatBrazilDate(event.created_at)} · {event.actor_name_snapshot ?? "Nome do autor não preservado no evento antigo"}</p>
        <p className="whitespace-pre-wrap wrap-break-word">{event.reason || "Sem motivo adicional"}</p>
        <p className="text-xs wrap-break-word">Referência do evento: {event.id}</p>
        {event.shift_id ? <p className="text-xs wrap-break-word">Referência do plantão: {event.shift_id}</p> : null}
        {event.series_id ? <p className="text-xs wrap-break-word">Referência da programação: {event.series_id}</p> : null}
      </li>)}</ol>
      <nav className="hca-toolbar" aria-label="Páginas das mudanças da agenda">
        <ActionButton disabled={!fresh || page === 1} onClick={() => navigate({}, page - 1)}>Mudanças anteriores</ActionButton>
        <ActionButton disabled={!fresh || page * 20 >= data.total} onClick={() => navigate({}, page + 1)}>Próxima página de mudanças</ActionButton>
      </nav>
    </> : null}
  </section>;
}
