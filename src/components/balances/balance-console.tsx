"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Badge, Button, Spinner } from "@fluentui/react-components";
import { api, ApiError, can, Notice, Workspace, type WorkspaceContext } from "@/components/workspace";
import { Dialog } from "@/components/ui/primitives";
import { RecordDrawer } from "@/components/forms/record-drawer";
import { formatZonedDate } from "@/lib/schedules/time";
import { documentEventLabel } from "@/lib/notifications/event-labels";
import { BalanceForm, weekDays, type BalanceEditor } from "./balance-forms";
import { useBalanceWorkspace } from "./use-balance-workspace";
import type { BalanceCommand } from "@/lib/validation/balances";
import type { DocumentSummary } from "@/types/documents";

export function BalanceConsole() {
  return <Workspace title="Balanços e plantões">{context => context.patient && can(context, "bal.read") ? <FollowUp key={context.patient.id} context={context} /> : <Notice error>Selecione um paciente com permissão para consultar balanços.</Notice>}</Workspace>;
}
function FollowUp({ context }: { context: WorkspaceContext }) {
  const patient = context.patient!, { data, error: loadError, reload } = useBalanceWorkspace(patient.id);
  const [editor, setEditor] = useState<BalanceEditor | null>(null), [opener, setOpener] = useState<HTMLElement | null>(null), [review, setReview] = useState<{ command: BalanceCommand; version?: number } | null>(null);
  const [error, setError] = useState(""), [message, setMessage] = useState(""), [busy, setBusy] = useState(false), [uncertain, setUncertain] = useState(false), [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const pendingRef = useRef<object | null>(null);
  const [now] = useState(() => Date.now());
  const formatBrazilDate=(value:string|null)=>formatZonedDate(value,data?.regime?.timezone);
  const family = ["family", "admin"].includes(patient.role), approve = family && can(context, "bal.defer.approve"), configure = family && can(context, "bal.schedule.manage");
  useEffect(() => {
    const controller = new AbortController();
    api<{ data: DocumentSummary[] }>("/api/documents?" + new URLSearchParams({ careRecipientId: patient.id, type: "BAL", status: "submitted", pageSize: "20" }), undefined, controller.signal).then(result => { if (!controller.signal.aborted) setDocuments(result.data); }).catch(reason => { if (!controller.signal.aborted) setError(reason.message); });
    return () => controller.abort();
  }, [patient.id, data?.events.length]);
  const open = (value: BalanceEditor, target: HTMLElement) => { setEditor(value); setOpener(target); setError(""); };
  async function send() {
    if (!pendingRef.current && review) pendingRef.current = { careRecipientId: patient.id, command: review.command, expectedVersion: review.version ?? null, idempotencyKey: crypto.randomUUID() };
    if (!pendingRef.current) return;
    setBusy(true);setError("");
    try { await api("/api/balances", pendingRef.current); pendingRef.current = null; setUncertain(false); setReview(null); setEditor(null); setMessage(review?.command.action === "request_deferral" ? "Solicitação registrada. O prazo atual continua válido até uma decisão familiar." : "Decisão registrada. Consulte a atribuição e o histórico atualizados."); reload(); }
    catch (reason) { if (reason instanceof ApiError && [400,403,404,409,422].includes(reason.status)) { pendingRef.current = null; setUncertain(false); if(reason.code==="VERSION_CONFLICT"){setReview(null);setEditor(null);reload();} } else setUncertain(true); setError(reason instanceof Error ? reason.message : "Não foi possível concluir."); }
    finally { setBusy(false); }
  }
  const feedback = <>{error ? <Notice error>{error}</Notice> : null}{uncertain ? <Button disabled={busy} onClick={() => void send()}>Recuperar a mesma tentativa</Button> : null}</>;
  if (!data) return loadError ? <Notice error>{loadError}<Button onClick={reload}>Tentar novamente</Button></Notice> : <Spinner label="Carregando balanços" />;
  const a = data.eligibility.assignment, current = data.assignments.find(s => s.id === a?.id), cycle = data.obligations.find(o => o.state === "pending")?.cycle_id;
  const canRequest = can(context, "bal.defer.request") && (a?.professional_id === context.userId || patient.role === "supervisor");
  return <div className="hca-form-stack">
    {loadError ? <Notice error>{loadError}</Notice> : null}{!editor && !review ? feedback : null}{message ? <Notice>{message}</Notice> : null}
    <section className="ui-card"><div className="hca-section-heading"><h2>Programação do balanço</h2><Badge appearance="tint" color={data.enabled ? "brand" : "informative"}>{data.enabled ? "Ativa neste paciente" : "Processamento desativado"}</Badge></div>
      {data.regime ? <p>{weekDays[data.regime.weekday]} · {data.types.find(t => t.id === data.regime?.shift_type_id)?.name ?? "Plantão configurado"} · {data.regime.timezone}</p> : <p>O novo regime ainda não foi ativado neste paciente.</p>}
      <div className="hca-toolbar">{configure ? <Button onClick={e => open({ kind: "configure" }, e.currentTarget)} disabled={!data.types.some(t => t.is_active)}>Configurar dia e plantão</Button> : null}{!data.regime?.activated_at && can(context,"bal.count") ? <Link href="/fichas/bal" className="ui-button ui-button-primary" prefetch={false}>Nova contagem</Link> : null}{can(context, "schedule.read.own") || can(context, "schedule.read.team") ? <Link href="/escalas" className="ui-button ui-button-secondary" prefetch={false}>Consultar escala</Link> : null}<Link href="/historico?type=BAL" className="ui-button ui-button-secondary" prefetch={false}>Histórico de fichas BAL</Link></div>
      {configure && !data.types.length ? <p>Cadastre os tipos de plantão na escala antes da ativação.</p> : null}</section>
    <section className="ui-card"><h2>Responsabilidade atual</h2>{a ? <><strong>{current?.professional_name ?? "Profissional designado"}</strong><p>{current?.type_name} · {formatBrazilDate(a.starts_at)} → {formatBrazilDate(a.ends_at)}</p>
      <p>{data.eligibility.available ? "Contagem disponível para você durante este plantão." : new Date(a.starts_at).getTime() > now ? "Contagem agendada; aguarde o início do plantão." : a.professional_id !== context.userId ? "A contagem é exclusiva da pessoa designada." : "O prazo ou a atribuição mudou. Aguarde a atualização formal."}</p>
      <div className="hca-toolbar">{data.eligibility.available ? <Link href={"/fichas/bal" + (data.eligibility.documentId ? "?documentId=" + data.eligibility.documentId + (a.kind === "recount" ? "&recount=true" : "") : "")} className="ui-button ui-button-primary" prefetch={false}>Fazer balanço</Link> : null}{approve || canRequest ? <Button onClick={e => open({ kind: "defer", family: approve }, e.currentTarget)}>{approve ? "Adiar com decisão familiar" : "Solicitar adiamento"}</Button> : null}</div></> : cycle ? <><Notice error>Pendência sem plantão único elegível. Nenhuma pessoa foi escolhida automaticamente.</Notice>{configure ? <Button onClick={e => open({ kind: "assign", cycleId: cycle,allowDeferral:approve }, e.currentTarget)}>Resolver atribuição</Button> : null}</> : <p>Não há contagem pendente neste momento. A próxima obrigação será disponibilizada no plantão programado.</p>}</section>
    {data.deferrals.length ? <section className="ui-card"><h2>Adiamentos</h2>{data.deferrals.map(d => <article key={d.id} className="hca-record"><div className="hca-record-main"><strong>{d.status === "pending" ? "Aguardando decisão familiar" : d.status === "approved" ? "Adiamento autorizado" : d.status === "rejected" ? "Solicitação rejeitada" : "Solicitação superada pela atualização da atribuição"}</strong><p>{d.reason}</p><small>{formatBrazilDate(d.created_at)}</small>{d.status === "pending" ? <p>O prazo original permanece vigente até a aprovação.</p> : null}</div>{d.status === "pending" && approve ? <div className="hca-toolbar"><Button onClick={e => open({ kind: "decide", deferral: d, approve: true }, e.currentTarget)}>Aprovar adiamento</Button><Button onClick={e => open({ kind: "decide", deferral: d, approve: false }, e.currentTarget)}>Rejeitar adiamento</Button></div> : null}</article>)}</section> : null}
    <section className="hca-records"><div className="hca-dashboard-section-heading"><h2>Obrigações por semana</h2></div>{data.obligations.length ? data.obligations.map(o => <article key={o.id} className="hca-record"><div className="hca-record-main"><strong>Semana de {o.week_start.split("-").reverse().join("/")}</strong><p>{o.state === "regularized" ? "Regularizada por contagem atual posterior" : o.state === "counted" ? "Contagem física registrada" : "Pendente"}</p><small>Prazo original: {formatBrazilDate(o.original_due)}</small>{o.effective_due!==o.original_due?<p>Prazo após decisão familiar: {formatBrazilDate(o.effective_due)}</p>:null}{o.missed_at ? <p>Prazo não cumprido em {formatBrazilDate(o.missed_at)}. O atraso permanece no histórico.</p> : null}{o.actual_count_at ? <p>Contagem efetiva: {formatBrazilDate(o.actual_count_at)}</p> : null}</div>{o.count_document_id || o.regularized_by ? <Link href={"/documentos/" + (o.count_document_id ?? o.regularized_by)} prefetch={false}>Abrir BAL</Link> : null}</article>) : <p className="p-5 hca-muted">Nenhuma obrigação criada pelo novo regime.</p>}</section>
    {documents.length ? <section className="ui-card"><h2>Contagens em revisão</h2>{documents.map(d => <div key={d.id} className="hca-record"><Link href={"/documentos/" + d.id} prefetch={false}>{d.code} · consultar revisão</Link>{data.obligations.some(o => o.count_document_id === d.id || o.regularized_by === d.id) && !a && (can(context, "bal.approve.family") || can(context, "bal.approve.supervisor")) ? <Button onClick={e => open({ kind: "recount", documentId: d.id, version: d.version, code: d.code ?? "BAL" }, e.currentTarget)}>Designar reconto</Button> : null}</div>)}</section> : null}
    <details className="ui-card"><summary>Atribuições e atrasos históricos</summary>{data.assignments.map(s => <p key={s.id}>{s.professional_name} · {formatBrazilDate(s.starts_at)} → {formatBrazilDate(s.ends_at)} · {s.status === "missed" ? "Não realizado no prazo" : s.status === "deferred" ? "Adiado por decisão familiar" : s.status === "invalidated" ? "Escala alterada; atribuição preservada no histórico" : s.status === "counted" ? "Contagem registrada" : "Designado"}</p>)}</details>
    <details className="ui-card"><summary>Eventos auditáveis</summary>{data.events.map(event => <p key={event.id}>{formatBrazilDate(event.created_at)} · {documentEventLabel(event.action)} · {event.reason}</p>)}</details>
    {editor ? <RecordDrawer title={editor.kind === "configure" ? "Programação do BAL" : editor.kind === "decide" ? "Decisão familiar" : editor.kind === "recount" ? "Designar reconto" : editor.kind === "assign" ? "Resolver atribuição" : "Adiamento do BAL"} onClose={() => setEditor(null)} busy={busy} preventClose={uncertain} restoreFocusTo={opener}>{!review ? feedback : null}<BalanceForm editor={editor} data={data} onReview={(command, version) => setReview({ command, version })} /></RecordDrawer> : null}
    {review ? <Dialog open title="Revisar decisão do balanço" onClose={() => { if (!busy && !uncertain) setReview(null); }}><p>{review.command.action === "configure" ? `Processamento ${review.command.body.enabled ? "ativado" : "pausado"} somente para ${patient.display_name}, a partir de ${review.command.body.startsOn}.` : review.command.action === "request_deferral" ? "A solicitação será encaminhada à família. O prazo atual continua válido." : "A decisão será registrada com seu responsável e justificativa."}</p>{"reason" in review.command.body ? <p>{review.command.body.reason}</p> : null}{feedback}<div className="hca-toolbar"><Button disabled={busy || uncertain} onClick={() => setReview(null)}>Voltar</Button><Button appearance="primary" disabled={busy} onClick={() => void send()}>{uncertain ? "Recuperar confirmação" : "Confirmar decisão"}</Button></div></Dialog> : null}
  </div>;
}
