"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { BalanceRecountAssignment, recountHref } from "./balance-recount-assignment";
import { useEffect, useRef, useState } from "react";
import { Badge, Button, Spinner } from "@fluentui/react-components";
import { api, ApiError, can, Notice, Workspace, type WorkspaceContext } from "@/components/workspace";
import { RecordDrawer } from "@/components/forms/record-drawer";
import { formatZonedDate } from "@/lib/schedules/time";
import { documentEventLabel } from "@/lib/notifications/event-labels";
import { BalanceForm, weekDays, type BalanceEditor } from "./balance-forms";
import { BalanceConfigurationFacts } from "./balance-configuration-facts";
import type { BalanceWorkspace } from "@/types/balances";
import { DeferralFacts } from "./balance-deferral-facts";
import { useBalanceWorkspace } from "./use-balance-workspace";
import type { BalanceCommand } from "@/lib/validation/balances";
import type { DocumentSummary } from "@/types/documents";
import {BalanceNotice} from "@/components/notifications/balance-notice";

export function BalanceConsole() {
  return <Workspace title="Balanços e plantões">{context => context.patient && can(context, "bal.read") ? <><BalanceNotice key={"reference:"+context.patient.id} context={context}/><FollowUp key={"followup:"+context.patient.id} context={context} /></> : <Notice error>Selecione um paciente com permissão para consultar balanços.</Notice>}</Workspace>;
}
function FollowUp({ context }: { context: WorkspaceContext }) {
  const router = useRouter(), params = useSearchParams(), recountDocumentId = params.get("recountDocumentId");
  const patient = context.patient!, { data, error: loadError, reload } = useBalanceWorkspace(patient.id);
  const [editor, setEditor] = useState<BalanceEditor | null>(null), [opener, setOpener] = useState<HTMLElement | null>(null), [review, setReview] = useState<{ command: BalanceCommand; version?: number; reference?: BalanceWorkspace } | null>(null);
  const [error, setError] = useState(""), [message, setMessage] = useState(""), [busy, setBusy] = useState(false), [uncertain, setUncertain] = useState(false), [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const pendingRef = useRef<object | null>(null);
  const resultRef = useRef<HTMLHeadingElement>(null), focusAfterSuccessRef = useRef(false);
  const [settledDeferralId,setSettledDeferralId]=useState<string|null>(null);
  const [focusReasonRevision,setFocusReasonRevision]=useState(0);
  useEffect(()=>{if(!editor&&!review&&focusAfterSuccessRef.current){focusAfterSuccessRef.current=false;resultRef.current?.focus();}},[editor,review]);
  const reviewHeadingRef = useRef<HTMLHeadingElement>(null), editorFormRef = useRef<HTMLDivElement>(null), wasReviewRef = useRef(false);
  useEffect(() => {
    if (review) { wasReviewRef.current = true; reviewHeadingRef.current?.focus(); }
    else if (wasReviewRef.current) {
      wasReviewRef.current = false;
      const target = editor?.kind === "decide" && focusReasonRevision > 0 ? 'textarea[name="reason"]' : 'button[type="submit"]';
      editorFormRef.current?.querySelector<HTMLElement>(target)?.focus();
    }
  }, [review, editor?.kind, focusReasonRevision]);
  const [now] = useState(() => Date.now());
  const formatBrazilDate=(value:string|null)=>formatZonedDate(value,data?.regime?.timezone);
  const family = ["family", "admin"].includes(patient.role), approve = family && can(context, "bal.defer.approve"), configure = family && can(context, "bal.schedule.manage");
  useEffect(() => {
    const controller = new AbortController();
    api<{ data: DocumentSummary[] }>("/api/documents?" + new URLSearchParams({ careRecipientId: patient.id, type: "BAL", status: "submitted", pageSize: "20" }), undefined, controller.signal).then(result => { if (!controller.signal.aborted) setDocuments(result.data); }).catch(reason => { if (!controller.signal.aborted) setError(reason.message); });
    return () => controller.abort();
  }, [patient.id, data?.events.length]);
  const open = (value: BalanceEditor, target: HTMLElement) => { setEditor(value); setOpener(target); setError("");setFocusReasonRevision(0); };
  async function send() {
    if (!pendingRef.current && review) pendingRef.current = { careRecipientId: patient.id, command: review.command, expectedVersion: review.version ?? null, idempotencyKey: crypto.randomUUID() };
    if (!pendingRef.current) return;
    setBusy(true);setError("");const recovering=uncertain;
    try { await api("/api/balances", pendingRef.current); pendingRef.current = null; setUncertain(false); setReview(null); setEditor(null); if(review?.command.action==="decide_deferral"){setSettledDeferralId(review.command.body.id);focusAfterSuccessRef.current=true;}setMessage(review?.command.action === "request_deferral" ? "Solicitação registrada. O prazo atual continua válido até uma decisão familiar." : "Decisão registrada. Consulte a atribuição e o histórico atualizados."); reload(); }
    catch (reason) { const inaccessibleRecovery=recovering&&reason instanceof ApiError&&[403,404].includes(reason.status);if (reason instanceof ApiError && [400,403,404,409,422].includes(reason.status)&&!inaccessibleRecovery) { pendingRef.current = null; setUncertain(false); if(reason.code==="VERSION_CONFLICT"){setReview(null);if(review?.command.action!=="decide_deferral")setEditor(null);else setFocusReasonRevision(value=>value+1);reload();} } else setUncertain(true); setError(reason instanceof Error ? reason.message : "Não foi possível concluir."); }
    finally { setBusy(false); }
  }
  const feedback = <>{error ? <Notice error>{error}</Notice> : null}{uncertain ? <Button disabled={busy} onClick={() => void send()}>Recuperar a mesma tentativa</Button> : null}</>;
  if (!data) return loadError ? <Notice error>{loadError}<Button onClick={reload}>Tentar novamente</Button></Notice> : <Spinner label="Carregando balanços" />;
  const a = data.eligibility.assignment, current = data.assignments.find(s => s.id === a?.id), cycle = data.obligations.find(o => o.state === "pending")?.cycle_id;
  const canRequest = can(context, "bal.defer.request") && (a?.professional_id === context.userId || patient.role === "supervisor");
  return <div className="hca-form-stack">
    {loadError ? <Notice error>{loadError}</Notice> : null}{!editor && !review ? feedback : null}{message ? <Notice>{message}</Notice> : null}
    <section className="ui-card"><div className="hca-section-heading"><h2 ref={resultRef} tabIndex={-1}>Programação do balanço</h2><Badge appearance="tint" color={data.enabled ? "brand" : "informative"}>{data.enabled ? "Ativa neste paciente" : "Processamento desativado"}</Badge></div>
      {data.regime ? <p>{weekDays[data.regime.weekday]} · {data.types.find(t => t.id === data.regime?.shift_type_id)?.name ?? "Plantão configurado"} · {data.regime.timezone}</p> : <p>O novo regime ainda não foi ativado neste paciente.</p>}
      <div className="hca-toolbar">{configure ? <Button onClick={e => open({ kind: "configure" }, e.currentTarget)} disabled={!data.types.some(t => t.is_active)}>Configurar dia e plantão</Button> : null}{!data.regime?.activated_at && !data.eligibility.assignment && can(context,"bal.count") ? <Link href="/fichas/bal" className="ui-button ui-button-primary" prefetch={false}>Nova contagem</Link> : null}{can(context, "schedule.read.own") || can(context, "schedule.read.team") ? <Link href="/escalas" className="ui-button ui-button-secondary" prefetch={false}>Consultar escala</Link> : null}<Link href="/historico?type=BAL" className="ui-button ui-button-secondary" prefetch={false}>Histórico de fichas BAL</Link></div>
      {configure && !data.types.length ? <p>Cadastre os tipos de plantão na escala antes da ativação.</p> : null}</section>
    <section className="ui-card"><h2>Responsabilidade atual</h2>{a ? <><strong>{current?.professional_name ?? "Profissional designado"}</strong><p>{current?.type_name} · {formatBrazilDate(a.starts_at)} → {formatBrazilDate(a.ends_at)}</p>
      <p>{data.eligibility.available ? "Contagem disponível para você durante este plantão." : new Date(a.starts_at).getTime() > now ? "Contagem agendada; aguarde o início do plantão." : a.professional_id !== context.userId ? "A contagem é exclusiva da pessoa designada." : "O prazo ou a atribuição mudou. Aguarde a atualização formal."}</p>
      <div className="hca-toolbar">{data.eligibility.available ? <Link href={"/fichas/bal" + (data.eligibility.documentId ? "?documentId=" + data.eligibility.documentId + (a.kind === "recount" ? "&recount=true" : "") : "")} className="ui-button ui-button-primary" prefetch={false}>Fazer balanço</Link> : null}{approve || canRequest ? <Button onClick={e => open({ kind: "defer", family: approve }, e.currentTarget)}>{approve ? "Adiar com decisão familiar" : "Solicitar adiamento"}</Button> : null}</div></> : cycle ? <><Notice error>Pendência sem plantão único elegível. Nenhuma pessoa foi escolhida automaticamente.</Notice>{configure ? <Button onClick={e => open({ kind: "assign", cycleId: cycle,allowDeferral:approve }, e.currentTarget)}>Resolver atribuição</Button> : null}</> : data.recountRecovery.total > 0 ? <Notice>Há reconto aguardando nova designação autorizada. Consulte as pendências abaixo.</Notice> : <p>{data.regime?.enabled ? "Não há contagem pendente neste momento. A próxima obrigação será disponibilizada no plantão programado." : "Não há contagem pendente neste momento. O regime semanal não está ativo; as contagens anteriores permanecem no histórico."}</p>}</section>
    {data.recountRecovery.total > 0 ? <section className="ui-card space-y-3" aria-label="Recontos aguardando designação"><h2>Recontos aguardando designação</h2><p>{data.recountRecovery.total} pendência(s) registrada(s). Exibindo as {data.recountRecovery.items.length} mais antigas. O histórico paginado permite consultar outros balanços e abrir a designação pelo detalhe.</p>{data.recountRecovery.items.map(row => <article key={row.documentId} className="hca-record hca-recount-recovery-row"><div className="hca-record-main"><strong>{row.code}</strong><p>Contagem {row.countVersion ?? "não identificada"} por {row.counter.name ?? "Autoria não disponível"}.</p></div><div className="hca-toolbar"><Link href={"/documentos/"+row.documentId} prefetch={false}>Consultar contagem</Link>{row.canAssign ? <Link className="ui-button ui-button-primary" href={recountHref(patient.id,row.documentId)} prefetch={false}>Designar novo reconto</Link> : <p>A família ou supervisão habilitada precisa designar a responsabilidade.</p>}</div></article>)}</section> : null}
    {data.deferrals.length ? <section className="ui-card"><h2>Adiamentos</h2>{data.deferrals.map(d => <article key={d.id} className="hca-record" aria-label="Pedido de adiamento"><div className="hca-record-main"><strong>{d.status === "pending" ? "Aguardando decisão familiar" : d.status === "approved" ? "Adiamento autorizado" : d.status === "rejected" ? "Solicitação rejeitada" : "Solicitação superada pela atualização da atribuição"}</strong><small>{formatBrazilDate(d.created_at)}</small><DeferralFacts deferral={d} timezone={data.regime?.timezone}/>{d.status === "pending" ? <p>O prazo original permanece vigente até a aprovação.</p> : null}</div>{d.status === "pending" && approve ? <div className="hca-toolbar"><Button disabled={settledDeferralId===d.id||!d.decisionContext?.canApprove} onClick={e => open({ kind: "decide", deferral: d, approve: true }, e.currentTarget)}>Aprovar adiamento</Button><Button disabled={settledDeferralId===d.id||!d.decisionContext?.canReject} onClick={e => open({ kind: "decide", deferral: d, approve: false }, e.currentTarget)}>Rejeitar adiamento</Button></div> : null}</article>)}</section> : null}
    <section className="hca-records"><div className="hca-dashboard-section-heading"><h2>Obrigações por semana</h2></div>{data.obligations.length ? data.obligations.map(o => <article key={o.id} className="hca-record"><div className="hca-record-main"><strong>Semana de {o.week_start.split("-").reverse().join("/")}</strong><p>{o.state === "regularized" ? "Regularizada por contagem atual posterior" : o.state === "counted" ? "Contagem física registrada" : "Pendente"}</p><small>Prazo original: {formatBrazilDate(o.original_due)}</small>{o.effective_due!==o.original_due?<p>Prazo após decisão familiar: {formatBrazilDate(o.effective_due)}</p>:null}{o.missed_at ? <p>Prazo não cumprido em {formatBrazilDate(o.missed_at)}. O atraso permanece no histórico.</p> : null}{o.actual_count_at ? <p>Contagem efetiva: {formatBrazilDate(o.actual_count_at)}</p> : null}</div>{o.count_document_id || o.regularized_by ? <Link href={"/documentos/" + (o.count_document_id ?? o.regularized_by)} prefetch={false}>Abrir BAL</Link> : null}</article>) : <p className="p-5 hca-muted">Nenhuma obrigação criada pelo novo regime.</p>}</section>
    {documents.length ? <section className="ui-card"><h2>Contagens em revisão</h2>{documents.map(d => <div key={d.id} className="hca-record"><Link href={"/documentos/" + d.id} prefetch={false}>{d.code} · consultar revisão</Link>{data.obligations.some(o => o.count_document_id === d.id || o.regularized_by === d.id) && !a && (can(context, "bal.approve.family") || can(context, "bal.approve.supervisor")) ? <Link href={recountHref(patient.id,d.id)} className="ui-button ui-button-secondary" prefetch={false}>Designar reconto</Link> : null}</div>)}</section> : null}
    <details className="ui-card"><summary>Atribuições e atrasos históricos</summary>{data.assignments.map(s => <p key={s.id}>{s.professional_name} · {formatBrazilDate(s.starts_at)} → {formatBrazilDate(s.ends_at)} · {s.status === "missed" ? "Não realizado no prazo" : s.status === "deferred" ? "Adiado por decisão familiar" : s.status === "invalidated" ? "Escala alterada; atribuição preservada no histórico" : s.status === "counted" ? "Contagem registrada" : "Designado"}</p>)}</details>
    <details className="ui-card"><summary>Eventos auditáveis</summary>{data.events.map(event => <p key={event.id}>{formatBrazilDate(event.created_at)} · {documentEventLabel(event.action)} · {event.reason}</p>)}</details>
    {recountDocumentId ? <BalanceRecountAssignment key={patient.id+":"+recountDocumentId} patientId={patient.id} documentId={recountDocumentId} onCommitted={reload} restoreFocusFallbackRef={resultRef} onClose={() => router.replace("/balancos?"+new URLSearchParams({careRecipientId:patient.id}),{scroll:false})}/> : null}
    {editor ? <RecordDrawer
      title={review ? "Revisar decisão do balanço" : editor.kind === "configure" ? "Programação do BAL" : editor.kind === "decide" ? "Decisão familiar" : editor.kind === "assign" ? "Resolver atribuição" : "Adiamento do BAL"}
      onClose={() => { if (!review && !uncertain) setEditor(null); }} busy={busy}
      preventClose={uncertain || Boolean(review)} restoreFocusTo={opener} restoreFocusFallbackRef={resultRef}>
      {feedback}
      {loadError ? <Notice error>{loadError}<Button onClick={reload}>Consultar novamente</Button></Notice> : null}
      <div ref={editorFormRef} hidden={Boolean(review)}>
        <BalanceForm editor={editor} data={data} onReview={(command, version, reference) => setReview({ command, version, reference })} onReload={reload} focusReasonRevision={focusReasonRevision}/>
      </div>
      {review ? <section className="space-y-4" aria-label="Conferência da decisão">
        <h3 ref={reviewHeadingRef} tabIndex={-1}>Confira a decisão do balanço</h3>
        <p>{review.command.action === "configure" ? `Processamento ${review.command.body.enabled ? "ativado" : "pausado"} somente para ${patient.display_name}, a partir de ${review.command.body.startsOn}.` : review.command.action === "request_deferral" ? "A solicitação será encaminhada à família. O prazo atual continua válido." : review.command.action === "decide_deferral" ? review.command.body.approve ? "Aprovar somente o destino congelado, se ainda elegível. A alteração do prazo será explícita e auditável." : "Rejeitar este pedido com motivo próprio, sem alterar atribuição, prazo ou estoque." : "A decisão será registrada com seu responsável e justificativa."}</p>
        {review.command.action === "configure" ? <BalanceConfigurationFacts command={review.command} data={review.reference ?? data}/> : null}
        {review.command.action === "decide_deferral" && editor.kind === "decide" ? <DeferralFacts deferral={editor.deferral} timezone={data.regime?.timezone}/> : null}
        {"reason" in review.command.body ? <div><h3 className="font-semibold">Sua justificativa</h3><p className="whitespace-pre-wrap wrap-break-word">{review.command.body.reason}</p></div> : null}
        <div className="hca-toolbar">
          <Button disabled={busy || uncertain} onClick={() => setReview(null)}>Voltar</Button>
          <Button appearance="primary" disabled={busy} onClick={() => void send()}>{uncertain ? "Recuperar confirmação" : "Confirmar decisão"}</Button>
        </div>
      </section> : null}
    </RecordDrawer> : null}
  </div>;
}
