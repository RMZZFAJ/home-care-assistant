"use client";
import { useEffect, useRef, useState } from "react";
import { Badge, Button, Field, Input, Select, Spinner } from "@fluentui/react-components";
import { api, ApiError, can, Notice, Workspace, type WorkspaceContext } from "@/components/workspace";
import { RecordDrawer } from "@/components/forms/record-drawer";
import { Dialog } from "@/components/ui/primitives";
import { useLiveRevision } from "@/lib/use-live-revision";
import { addDays, ScheduleForm, type ScheduleEditor } from "./schedule-forms";
import type { ScheduleCommand } from "@/lib/validation/schedules";
import type { ScheduleWorkspace, ScheduledShift } from "@/types/schedules";

const today = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" }).format(new Date());
const stamp = (date: string, timezone: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: timezone, dateStyle: "short", timeStyle: "short" }).format(new Date(date));
const stateLabels: Record<string, string> = { published: "Publicado", proposed: "Proposta", cancelled: "Cancelado", rejected: "Recusado" };
export function ScheduleConsole() {
  return <Workspace title="Escalas e plantões">{context => context.patient && (can(context, "schedule.read.team") || can(context, "schedule.read.own")) ? <Agenda key={context.patient.id} context={context} /> : <Notice error>Selecione um vínculo com permissão para consultar escalas.</Notice>}</Workspace>;
}
function Agenda({ context }: { context: WorkspaceContext }) {
  const patient = context.patient!, team = can(context, "schedule.manage.team"), publishOwn = can(context, "schedule.manage.own");
  const [day, setDay] = useState(today), [mode, setMode] = useState("week"), [person, setPerson] = useState(""), [status, setStatus] = useState(""), [attempt, setAttempt] = useState(0);
  const [data, setData] = useState<ScheduleWorkspace | null>(null), [error, setError] = useState(""), [message, setMessage] = useState(""), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [uncertain, setUncertain] = useState(false);
  const [editor, setEditor] = useState<ScheduleEditor | null>(null), [review, setReview] = useState<{ command: ScheduleCommand; version?: number } | null>(null);
  const [opener, setOpener] = useState<HTMLElement | null>(null);
  const pendingRef = useRef<object | null>(null);
  const live = useLiveRevision();
  const rangeStart = mode === "month" ? day.slice(0, 8) + "01" : addDays(day, -((new Date(day + "T12:00:00Z").getUTCDay() + 6) % 7));
  const rangeEnd = addDays(rangeStart, mode === "month" ? 41 : 6);
  useEffect(() => {
    const controller = new AbortController();
    api<{ data: ScheduleWorkspace }>("/api/schedules?" + new URLSearchParams({ careRecipientId: patient.id, from: rangeStart, until: rangeEnd }), undefined, controller.signal)
      .then(result => { if (!controller.signal.aborted) { setData(result.data); setError(""); } })
      .catch(reason => { if (!controller.signal.aborted) setError(reason.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [patient.id, rangeStart, rangeEnd, live, attempt]);
  function open(value: ScheduleEditor, target: HTMLElement) { setOpener(target); setEditor(value); setError(""); }
  async function send() {
    if (!pendingRef.current && review) pendingRef.current = { careRecipientId: patient.id, command: review.command, expectedVersion: review.version ?? null, idempotencyKey: crypto.randomUUID() };
    if (!pendingRef.current) return false;
    setBusy(true); setError("");
    try { await api("/api/schedules", pendingRef.current); pendingRef.current = null; setUncertain(false); setReview(null); setEditor(null); setMessage("Escala gravada. As responsabilidades documentais anteriores foram preservadas."); setAttempt(v => v + 1); return true; }
    catch (reason) { if (reason instanceof ApiError && [400, 403, 404, 409, 422].includes(reason.status)) { pendingRef.current = null; setUncertain(false); } else setUncertain(true); setError(reason instanceof Error ? reason.message : "Não foi possível gravar."); return false; }
    finally { setBusy(false); }
  }
  const visible = data?.shifts.filter(s => (!person || s.professional_id === person) && (!status || s.status === status)) ?? [];
  const renderShift = (s: ScheduledShift) => <article key={s.id} className="hca-shift-card" aria-label={`${s.type_name} · ${s.professional_name}`}><div className="hca-toolbar"><strong>{s.type_name}</strong><Badge appearance="tint" color={s.status === "published" ? "brand" : "informative"}>{stateLabels[s.status]}</Badge></div><p>{s.professional_name}</p><p>{stamp(s.starts_at, s.timezone)} → {stamp(s.ends_at, s.timezone)}</p>{s.is_exception ? <small>Exceção autorizada</small> : null}{s.notes ? <p>{s.notes}</p> : null}
    {s.status === "published" && (team || s.professional_id === context.userId && (can(context, "schedule.propose") || publishOwn)) ? <Button onClick={e => open({ kind: "shift", shift: s }, e.currentTarget)}>{team || publishOwn ? "Alterar plantão" : "Propor alteração"}</Button> : null}</article>;
  const errors = <>{error ? <Notice error>{error}</Notice> : null}{uncertain ? <Button disabled={busy} onClick={() => void send()}>Recuperar a mesma tentativa</Button> : null}</>;
  return <div className="hca-form-stack">
    <div className="hca-command-bar">{team || publishOwn || can(context, "schedule.propose") ? <Button appearance="primary" disabled={!data?.types.some(t => t.is_active)} onClick={e => open({ kind: "series" }, e.currentTarget)}>Nova programação</Button> : null}
      {can(context, "schedule.types.manage") ? <Button onClick={e => open({ kind: "type" }, e.currentTarget)}>Novo tipo de plantão</Button> : null}</div>
    {!editor && !review ? errors : null}{message ? <Notice>{message}</Notice> : null}
    <div className="hca-toolbar"><Field label="Data de referência"><Input type="date" value={day} onChange={e => { if (e.target.value) setDay(e.target.value); }} /></Field>
      <Field label="Visualização"><Select value={mode} onChange={e => setMode(e.target.value)}><option value="week">Semana</option><option value="month">Mês</option></Select></Field>
      {can(context, "schedule.read.team") ? <Field label="Profissional"><Select value={person} onChange={e => setPerson(e.target.value)}><option value="">Toda a equipe</option>{data?.professionals.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field> : null}
      <Field label="Situação"><Select value={status} onChange={e => setStatus(e.target.value)}><option value="">Todas</option>{Object.entries(stateLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field></div>
    {loading ? <Spinner label="Carregando escala" /> : null}
    {data ? <><p className="hca-muted">Programação prevista, sem registro de presença. Períodos adjacentes são permitidos; sobreposições do mesmo profissional são recusadas.</p>
      <div className="hca-agenda-desktop">{Array.from({ length: mode === "month" ? 42 : 7 }, (_, i) => addDays(rangeStart, i)).map(date => <section key={date} className="hca-agenda-day"><h2>{new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", weekday: "short", day: "2-digit", month: "2-digit" }).format(new Date(date + "T12:00:00Z"))}</h2>{visible.filter(s => new Intl.DateTimeFormat("sv-SE", { timeZone: s.timezone }).format(new Date(s.starts_at)) === date).map(renderShift)}{!visible.some(s => s.status === "published" && new Intl.DateTimeFormat("sv-SE", { timeZone: s.timezone }).format(new Date(s.starts_at)) === date) ? <p className="hca-muted">Sem programação publicada</p> : null}</section>)}</div>
      <div className="hca-agenda-mobile"><div className="hca-toolbar"><Button onClick={() => setDay(addDays(day, -1))}>Dia anterior</Button><strong>{day.split("-").reverse().join("/")}</strong><Button onClick={() => setDay(addDays(day, 1))}>Próximo dia</Button></div>{visible.filter(s => new Intl.DateTimeFormat("sv-SE", { timeZone: s.timezone }).format(new Date(s.starts_at)) === day).map(renderShift)}{!visible.some(s => new Intl.DateTimeFormat("sv-SE", { timeZone: s.timezone }).format(new Date(s.starts_at)) === day) ? <Notice>Nenhum plantão programado neste dia.</Notice> : null}</div>
      {team ? <section className="ui-card"><h2>Propostas pendentes</h2>{data.series.filter(s => s.status === "proposed").map(s => <article className="hca-record" key={s.id}><span>{data.professionals.find(p => p.id === s.professional_id)?.name} · {s.anchor_date} a {s.valid_until}</span><Button onClick={() => setReview({ command: { action: "approve", body: { id: s.id } }, version: s.version })}>Aprovar programação</Button><Button onClick={e => open({ kind: "reject", id: s.id, version: s.version }, e.currentTarget)}>Rejeitar programação</Button></article>)}{data.changes.map(c => <article key={c.id} className="hca-record"><span>Alteração solicitada · {c.reason}</span><Button onClick={() => setReview({ command: { action: "decide_change", body: { id: c.id, approve: true, reason: "Proposta revisada e aprovada" } } })}>Aprovar alteração</Button><Button onClick={e => open({ kind: "reject_change", id: c.id }, e.currentTarget)}>Rejeitar alteração</Button></article>)}{!data.changes.length && !data.series.some(s => s.status === "proposed") ? <p>Não há propostas pendentes.</p> : null}</section> : null}
      <details className="ui-card"><summary>Tipos e programações</summary>{data.types.map(t => <div className="hca-record" key={t.id}><strong>{t.name} · {t.starts_local.slice(0, 5)} · {t.duration_minutes / 60}h</strong>{can(context, "schedule.types.manage") ? <Button onClick={e => open({ kind: "type", type: t }, e.currentTarget)}>Editar tipo</Button> : null}</div>)}{data.series.filter(s => s.status === "published" && !s.ended_on).map(s => <div className="hca-record" key={s.id}><span>{data.professionals.find(p => p.id === s.professional_id)?.name} · {s.anchor_date} a {s.valid_until}</span>{team || publishOwn && s.professional_id === context.userId ? <Button onClick={e => open({ kind: "end", id: s.id, version: s.version }, e.currentTarget)}>Encerrar série</Button> : null}</div>)}</details>
      <details className="ui-card"><summary>Histórico de mudanças</summary>{data.events.map(event => <p key={event.id}>{stamp(event.created_at, "America/Sao_Paulo")} · {event.action} · {event.reason}</p>)}</details>
    </> : null}
    {editor && data ? <RecordDrawer title={editor.kind === "type" ? "Tipo de plantão" : editor.kind === "series" ? "Programação de plantões" : editor.kind === "end" ? "Encerrar programação" : "Alteração pontual"} onClose={() => setEditor(null)} busy={busy} preventClose={uncertain} restoreFocusTo={opener}>{!review ? errors : null}<ScheduleForm editor={editor} data={data} ownId={context.userId} team={team} publishOwn={publishOwn} today={day} onReview={(command, version) => setReview({ command, version })} /></RecordDrawer> : null}
    {review ? <Dialog open title="Revisar escala" onClose={() => { if (!busy && !uncertain) setReview(null); }}><p>Confirme os dados da programação. A gravação é transacional e registra o responsável e a justificativa.</p><p>{review.command.action === "series" ? `${review.command.body.anchorDate} a ${review.command.body.validUntil} · ${review.command.body.recurrence}` : "Revise o período, o profissional e o efeito da alteração."}</p>{errors}<div className="hca-toolbar"><Button disabled={busy || uncertain} onClick={() => setReview(null)}>Voltar</Button><Button appearance="primary" disabled={busy} onClick={() => void send()}>{uncertain ? "Recuperar confirmação" : "Confirmar gravação"}</Button></div></Dialog> : null}
  </div>;
}
