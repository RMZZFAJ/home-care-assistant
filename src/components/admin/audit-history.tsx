"use client";
import { ActionButton, FormField, SelectField, TextInput } from "@/components/ui/controls";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { api, Notice } from "@/components/workspace";
import { auditActionLabel, auditEntityLabel } from "@/lib/audit-presentation";
import { parseAuditPage, type AuditPage } from "@/lib/validation/audit";
import { formatBrazilDate } from "@/lib/receipt";
import { useLiveRevision } from "@/lib/use-live-revision";

const filters = { query: "Busca", reference: "Referência", action: "Evento", entityType: "Tipo de recurso", from: "Data inicial", to: "Data final" };
const queryNames = { query: "auditQuery", reference: "auditReference", action: "auditAction", entityType: "auditEntityType", from: "auditFrom", to: "auditTo" };
export function AuditHistory({ patientId }: { patientId: string }) {
  const params = useSearchParams(), router = useRouter(), revision = useLiveRevision();
  const values = Object.fromEntries(Object.entries(queryNames).map(([key, param]) => [key, params.get(param) ?? ""])) as Record<keyof typeof filters, string>;
  const filterKey = JSON.stringify(values), page = params.get("auditPage") ?? "1";
  const [attempt, setAttempt] = useState(0);
  const selectionKey = JSON.stringify([patientId, filterKey, page]);
  const key = JSON.stringify([selectionKey, attempt, revision]);
  const [result, setResult] = useState<{ key: string; data: AuditPage } | null>(null);
  const [failure, setFailure] = useState<{ key: string; selectionKey: string; message: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null), focusRef = useRef<string | null>(null);
  const query = new URLSearchParams({ section: "audit", careRecipientId: patientId, page, pageSize: "20" });
  for (const [name, value] of Object.entries(values)) if (value) query.set(name, value);
  const url = "/api/admin?" + query;
  useEffect(() => {
    const controller = new AbortController();
    void api<unknown>(url, undefined, controller.signal).then(parseAuditPage).then(data => {
      if (!controller.signal.aborted) { setResult({ key, data }); setFailure(null); }
    }).catch(reason => { if (!controller.signal.aborted) setFailure({ key, selectionKey, message: reason instanceof Error ? reason.message : "Não foi possível consultar o histórico." }); });
    return () => controller.abort();
  }, [key, url, selectionKey]);
  useEffect(() => {
    if (focusRef.current) { const control = formRef.current?.elements.namedItem(focusRef.current); if (control instanceof HTMLElement) control.focus(); focusRef.current = null; }
  }, [filterKey]);
  function navigate(nextValues: Partial<Record<keyof typeof filters, string>>, nextPage = "1") {
    const next = new URLSearchParams(params.toString());
    next.set("auditPage", nextPage);
    for (const [name, value] of Object.entries(nextValues)) { const param = queryNames[name as keyof typeof filters]; if (value) next.set(param, value); else next.delete(param); }
    router.replace("/admin?" + next, { scroll: false }); setAttempt(value => value + 1);
  }
  const data = result?.key === key ? result.data : null, error = failure?.selectionKey === selectionKey ? failure.message : "";
  const loading = result?.key !== key && failure?.key !== key;
  return <section className="ui-card hca-audit-history space-y-4" aria-label="Histórico de auditoria" aria-busy={loading}>
    <h2 className="font-semibold">Eventos de auditoria deste contexto</h2>
    <p>Consulte o período, o recurso ou a referência de um evento. A consulta preserva os registros e as decisões.</p>
    <form ref={formRef} key={filterKey} className="hca-form" onSubmit={event => {
      event.preventDefault(); const form = new FormData(event.currentTarget);
      focusRef.current = document.activeElement?.getAttribute("name") ?? "query";
      navigate(Object.fromEntries(Object.keys(filters).map(name => [name, String(form.get(name) ?? "").trim()])));
    }}>
      <div className="hca-compact-grid">
        <FormField label="Buscar código de evento ou nome da pessoa"><TextInput name="query" type="search" maxLength={160} defaultValue={values.query} /></FormField>
        <FormField label="Referência do evento ou recurso"><TextInput name="reference" maxLength={36} defaultValue={values.reference} /></FormField>
        <FormField label="Evento de auditoria"><SelectField name="action" defaultValue={values.action}><option value="">Todos os eventos</option>{[...new Set([...(data?.actions ?? result?.data.actions ?? []), ...(values.action ? [values.action] : [])])].map(action => <option key={action} value={action}>{auditActionLabel(action)} · {action}</option>)}</SelectField></FormField>
        <FormField label="Tipo de recurso"><SelectField name="entityType" defaultValue={values.entityType}><option value="">Todos os tipos</option>{[...new Set([...(data?.entityTypes ?? result?.data.entityTypes ?? []), ...(values.entityType ? [values.entityType] : [])])].map(type => <option key={type} value={type}>{auditEntityLabel(type)} · {type}</option>)}</SelectField></FormField>
        <FormField label="Data inicial do histórico"><TextInput name="from" type="date" defaultValue={values.from} /></FormField>
        <FormField label="Data final do histórico"><TextInput name="to" type="date" defaultValue={values.to} /></FormField>
      </div>
      <div className="hca-toolbar"><ActionButton name="submitAudit" type="submit" variant="primary">Consultar histórico</ActionButton><ActionButton type="button" onClick={() => { focusRef.current = "query"; navigate(Object.fromEntries(Object.keys(filters).map(name => [name, ""]))); }}>Limpar filtros do histórico</ActionButton></div>
    </form>
    {Object.values(values).some(Boolean) ? <div className="hca-toolbar" role="group" aria-label="Filtros ativos do histórico">{Object.entries(values).filter(([, value]) => value).map(([name, value]) => <ActionButton key={name} compact onClick={() => { focusRef.current = name; navigate({ [name]: "" }); }}>Remover {filters[name as keyof typeof filters]}: {value}</ActionButton>)}</div> : null}
    {loading ? <Notice>Consultando histórico…</Notice> : null}
    {error ? <Notice error>Última consulta destes filtros: {error} <ActionButton onClick={() => { const input = formRef.current?.elements.namedItem("query"); if (input instanceof HTMLElement) input.focus(); setAttempt(value => value + 1); }}>Consultar histórico novamente</ActionButton></Notice> : null}
    {data ? <>
      <p role="status">{data.total} {data.total === 1 ? "evento encontrado" : "eventos encontrados"} · página {data.page} de {Math.max(1, Math.ceil(data.total / data.pageSize))}</p>
      {!data.data.length ? <p>Nenhum evento corresponde aos filtros consultados.</p> : null}
      <ol className="hca-records">{data.data.map(event => <li key={event.id} className="hca-audit-event rounded border border-(--line) p-3 space-y-2" aria-label={"Evento " + event.id.slice(0, 8)}>
        <h3 className="font-semibold">{auditActionLabel(event.action)}</h3>
        <p>{formatBrazilDate(event.created_at)} · {auditEntityLabel(event.entity_type)}</p>
        <p>{event.actor_id ? "Pessoa (nome do cadastro atual): " + (event.actor_name_current || "Nome não disponível") : "Sistema ou autoria histórica não identificada"}</p>
        <p>Referência do evento: <span className="break-all">{event.id}</span></p>
        {event.entity_id ? <p>Referência do recurso: <span className="break-all">{event.entity_id}</span></p> : null}
        <details><summary>Códigos registrados para rastreio</summary><p>Evento: {event.action}. Tipo: {event.entity_type}.</p></details>
      </li>)}</ol>
      <nav className="hca-toolbar" aria-label="Páginas do histórico"><ActionButton disabled={data.page === 1} onClick={() => navigate({}, String(data.page - 1))}>Histórico anterior</ActionButton><ActionButton disabled={data.page * data.pageSize >= data.total} onClick={() => navigate({}, String(data.page + 1))}>Próxima página do histórico</ActionButton></nav>
    </> : null}
  </section>;
}
