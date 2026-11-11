"use client";
import { ActionButton, FormField, SelectField, TextInput } from "@/components/ui/controls";

import { useCallback, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Notice } from "@/components/workspace";
import { auditActionLabel, auditEntityLabel } from "@/lib/audit-presentation";
import { parseAuditListRead, type AuditFilters } from "@/lib/validation/audit";
import { formatBrazilDate } from "@/lib/receipt";
import { useLiveRevision } from "@/lib/use-live-revision";
import { useScopedRead } from "@/lib/use-scoped-read";

const filters = { query: "Busca", reference: "Referência", action: "Evento", entityType: "Tipo de recurso", from: "Data inicial", to: "Data final" };
const queryNames = { query: "auditQuery", reference: "auditReference", action: "auditAction", entityType: "auditEntityType", from: "auditFrom", to: "auditTo" };
export function AuditHistory({ patientId }: { patientId: string }) {
  const params = useSearchParams(), router = useRouter(), revision = useLiveRevision();
  const values = Object.fromEntries(Object.entries(queryNames).map(([key, param]) => [key, (params.get(param) ?? "").trim()])) as AuditFilters;
  const filterKey = JSON.stringify(values), page = Number(params.get("auditPage") ?? "1");
  const [draft, setDraft] = useState({ filterKey, values });
  if (draft.filterKey !== filterKey) setDraft({ filterKey, values });
  const formRef = useRef<HTMLFormElement>(null);
  const query = new URLSearchParams({ section: "audit", careRecipientId: patientId, page: String(page), pageSize: "20" });
  for (const [name, value] of Object.entries(values)) if (value) query.set(name, value);
  const url = "/api/admin?" + query;
  const { query: queryText, reference, action, entityType, from, to } = values;
  const decode = useCallback((value: unknown) => parseAuditListRead(value, { careRecipientId: patientId, page, pageSize: 20, query: queryText, reference, action, entityType, from, to }), [patientId, page, queryText, reference, action, entityType, from, to]);
  const read = useScopedRead(url, String(revision), decode);
  const { data, error, loading } = read, fresh = Boolean(data && !error && !loading);
  const focus = (name: string) => { const input = formRef.current?.elements.namedItem(name); if (input instanceof HTMLElement) input.focus(); };
  const setField = (name: keyof AuditFilters, value: string) => setDraft({ filterKey, values: { ...draft.values, [name]: value } });
  function navigate(nextValues: Partial<Record<keyof typeof filters, string>>, nextPage = "1") {
    const next = new URLSearchParams(params.toString());
    next.set("auditPage", nextPage);
    for (const [name, value] of Object.entries(nextValues)) { const param = queryNames[name as keyof typeof filters]; if (value) next.set(param, value); else next.delete(param); }
    if (JSON.stringify({ ...values, ...nextValues }) === filterKey && Number(nextPage) === page) read.refresh();
    if (next.toString() !== params.toString()) router.push("/admin?" + next, { scroll: false });
  }
  return <section className="ui-card hca-audit-history space-y-4" aria-label="Histórico de auditoria" aria-busy={loading}>
    <h2 className="font-semibold">Eventos de auditoria deste contexto</h2>
    <p>Consulte o período, o recurso ou a referência de um evento. A consulta preserva os registros e as decisões.</p>
    <form ref={formRef} className="hca-form" onSubmit={event => {
      event.preventDefault(); const form = new FormData(event.currentTarget);
      navigate(Object.fromEntries(Object.keys(filters).map(name => [name, String(form.get(name) ?? "").trim()])));
    }}>
      <div className="hca-compact-grid">
        <FormField label="Buscar código de evento ou nome da pessoa"><TextInput name="query" type="search" maxLength={160} value={draft.values.query} onChange={event => setField("query", event.currentTarget.value)} /></FormField>
        <FormField label="Referência do evento ou recurso"><TextInput name="reference" maxLength={36} value={draft.values.reference} onChange={event => setField("reference", event.currentTarget.value)} /></FormField>
        <FormField label="Evento de auditoria"><SelectField name="action" value={draft.values.action} onChange={event => setField("action", event.currentTarget.value)}><option value="">Todos os eventos</option>{[...new Set([...(data?.actions ?? []), ...(draft.values.action ? [draft.values.action] : [])])].map(action => <option key={action} value={action}>{auditActionLabel(action)} · {action}</option>)}</SelectField></FormField>
        <FormField label="Tipo de recurso"><SelectField name="entityType" value={draft.values.entityType} onChange={event => setField("entityType", event.currentTarget.value)}><option value="">Todos os tipos</option>{[...new Set([...(data?.entityTypes ?? []), ...(draft.values.entityType ? [draft.values.entityType] : [])])].map(type => <option key={type} value={type}>{auditEntityLabel(type)} · {type}</option>)}</SelectField></FormField>
        <FormField label="Data inicial do histórico"><TextInput name="from" type="date" value={draft.values.from} onChange={event => setField("from", event.currentTarget.value)} /></FormField>
        <FormField label="Data final do histórico"><TextInput name="to" type="date" value={draft.values.to} onChange={event => setField("to", event.currentTarget.value)} /></FormField>
      </div>
      <div className="hca-toolbar"><ActionButton name="submitAudit" type="submit" variant="primary">Consultar histórico</ActionButton><ActionButton type="button" onClick={() => { focus("query"); navigate(Object.fromEntries(Object.keys(filters).map(name => [name, ""]))); }}>Limpar filtros do histórico</ActionButton><ActionButton type="button" disabled={loading} onClick={read.refresh}>Atualizar histórico</ActionButton></div>
    </form>
    {Object.values(values).some(Boolean) ? <div className="hca-toolbar" role="group" aria-label="Filtros ativos do histórico">{Object.entries(values).filter(([, value]) => value).map(([name, value]) => <ActionButton key={name} compact onClick={() => { focus(name); navigate({ [name]: "" }); }}>Remover {filters[name as keyof typeof filters]}: {value}</ActionButton>)}</div> : null}
    {loading ? <Notice>Consultando histórico…</Notice> : null}
    {error ? <Notice error>Última consulta destes filtros: {error} <ActionButton onClick={() => { focus("query"); read.refresh(); }}>Consultar histórico novamente</ActionButton></Notice> : null}
    {data && !fresh ? <p className="text-sm text-(--muted)">Última consulta confirmada{read.queriedAt ? " em " + formatBrazilDate(read.queriedAt) : ""}; aguardando atualização.</p> : null}
    {data ? <>
      <p role="status">{data.total} {data.total === 1 ? "evento encontrado" : "eventos encontrados"} · página {data.page} de {Math.max(1, Math.ceil(data.total / data.pageSize))}</p>
      {fresh && !data.data.length ? <p>Nenhum evento corresponde aos filtros consultados.</p> : null}
      <ol className="hca-records">{data.data.map(event => <li key={event.id} data-audit-id={event.id} className="hca-audit-event rounded border border-(--line) p-3 space-y-2" aria-label={"Evento " + event.id.slice(0, 8)}>
        <h3 className="font-semibold">{auditActionLabel(event.action)}</h3>
        <p>{formatBrazilDate(event.created_at)} · {auditEntityLabel(event.entity_type)}</p>
        <p>{event.actor_id ? "Pessoa (nome do cadastro atual): " + (event.actor_name_current || "Nome não disponível") : "Sistema ou autoria histórica não identificada"}</p>
        <p>Referência do evento: <span className="break-all">{event.id}</span></p>
        {event.entity_id ? <p>Referência do recurso: <span className="break-all">{event.entity_id}</span></p> : null}
        <details><summary>Códigos registrados para rastreio</summary><p>Evento: {event.action}. Tipo: {event.entity_type}.</p></details>
      </li>)}</ol>
      <nav className="hca-toolbar" aria-label="Páginas do histórico"><ActionButton disabled={!fresh || data.page === 1} onClick={() => navigate({}, String(data.page - 1))}>Histórico anterior</ActionButton><ActionButton disabled={!fresh || data.page * data.pageSize >= data.total} onClick={() => navigate({}, String(data.page + 1))}>Próxima página do histórico</ActionButton></nav>
    </> : null}
  </section>;
}
