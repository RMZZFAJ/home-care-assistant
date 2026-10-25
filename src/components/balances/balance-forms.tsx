"use client";
import { useState, type FormEvent } from "react";
import { Button, Checkbox, Field, Input, Select, Textarea } from "@fluentui/react-components";
import type { BalanceCommand } from "@/lib/validation/balances";
import type { BalanceDeferral, BalanceWorkspace } from "@/types/balances";
import { formatZonedDate } from "@/lib/schedules/time";
export const weekDays = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
export type BalanceEditor = { kind: "configure" } | { kind: "defer"; family: boolean } | { kind: "decide"; deferral: BalanceDeferral; approve: boolean } | { kind: "assign"; cycleId: string; allowDeferral: boolean } | { kind: "recount"; documentId: string; version: number; code: string };
export function BalanceForm({ editor, data: liveData, onReview }: { editor: BalanceEditor; data: BalanceWorkspace; onReview: (command: BalanceCommand, version?: number) => void }) {
  const [data] = useState(liveData);
  const a = data.eligibility.assignment, regime = data.regime;
  const formatBrazilDate=(value:string|null)=>formatZonedDate(value,regime?.timezone);
  const [today] = useState(() => new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" }).format(new Date()));
  const [now] = useState(()=>Date.now());
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();const form = new FormData(event.currentTarget), value = (key: string) => String(form.get(key) ?? "");
    if (editor.kind === "configure") onReview({ action: "configure", body: { enabled: form.get("enabled") === "on", timezone: value("zone"), weekday: Number(value("day")), shiftTypeId: value("type"), professionalId: value("person") || null, startsOn: value("from"), reason: value("reason") } }, regime?.version);
    if (editor.kind === "defer" && a) onReview({ action: editor.family ? "defer" : "request_deferral", body: { assignmentId: a.id, targetShiftId: value("target"), reason: value("reason") } }, a.version);
    if (editor.kind === "decide") onReview({ action: "decide_deferral", body: { id: editor.deferral.id, approve: editor.approve, reason: value("reason") } });
    if (editor.kind === "assign") onReview({ action: "assign", body: { cycleId: editor.cycleId, targetShiftId: value("target"), reason: value("reason") } });
    if (editor.kind === "recount") onReview({ action: "assign_recount", body: { documentId: editor.documentId, targetShiftId: value("target"), reason: value("reason") } }, editor.version);
  }
  const currentDeadline=editor.kind==="assign"?Math.min(...data.obligations.filter(o=>o.cycle_id===editor.cycleId&&o.state==="pending"&&Date.parse(o.effective_due)>now).map(o=>Date.parse(o.effective_due))):Infinity;
  const targets = data.targets.filter(s => (editor.kind !== "defer" || !a || new Date(s.starts_at) >= new Date(a.ends_at)) && (editor.kind!=="assign"||editor.allowDeferral||Date.parse(s.ends_at)<=currentDeadline));
  return <form onSubmit={submit} className="hca-form-stack">
    {editor.kind === "configure" ? <><Checkbox name="enabled" label="Processamento automático neste paciente" defaultChecked={regime?.enabled ?? false} />
      <p>A ativação gera obrigações a partir da data escolhida. Pausar não apaga pendências ou atrasos existentes.</p>
      <Field label="Dia do balanço"><Select name="day" defaultValue={String(regime?.weekday ?? 1)}>{weekDays.map((d, i) => <option key={d} value={i}>{d}</option>)}</Select></Field>
      <Field label="Plantão responsável"><Select name="type" defaultValue={regime?.shift_type_id} required>{data.types.filter(t => t.is_active).map(t => <option key={t.id} value={t.id}>{t.name} · {t.starts_local.slice(0, 5)} · {t.duration_minutes / 60}h</option>)}</Select></Field>
      <Field label="Profissional designado"><Select name="person" defaultValue={regime?.designated_professional_id ?? ""}><option value="">Derivar da escala real</option>{data.professionals.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</Select><small>Se houver mais de uma pessoa no mesmo plantão, designe uma ou resolva a atribuição formalmente.</small></Field>
      <Field label="Fuso do paciente"><Select name="zone" defaultValue={regime?.timezone ?? "America/Sao_Paulo"}>{["America/Sao_Paulo", "America/Manaus", "America/Belem", "America/Fortaleza", "America/Cuiaba", "America/Rio_Branco", "America/Noronha", "UTC"].map(z => <option key={z}>{z}</option>)}</Select></Field>
      <Field label="Vigente a partir de"><Input name="from" type="date" defaultValue={regime?.starts_on ?? today} required /></Field></> : null}
    {editor.kind === "defer" ? <><p>Plantão atual: {formatBrazilDate(a?.starts_at ?? null)} até {formatBrazilDate(a?.ends_at ?? null)}.</p>{!editor.family ? <p className="ui-notice">O adiamento depende de aprovação familiar. A pendência e o prazo originais continuam válidos até a decisão.</p> : <p>A decisão familiar registra um adiamento autorizado, separado de atraso.</p>}</> : null}
    {editor.kind === "decide" ? <><p>Solicitação: {editor.deferral.reason}</p><p>Plantão proposto: {editor.deferral.target_snapshot.professional_name} · {formatBrazilDate(editor.deferral.target_snapshot.starts_at)} → {formatBrazilDate(editor.deferral.target_snapshot.ends_at)}</p><p>{editor.approve ? "A aprovação substitui a atribuição atual e preserva seu histórico." : "A rejeição mantém a atribuição e o prazo atuais."}</p></> : null}
    {editor.kind === "recount" ? <p>Nova contagem da {editor.code}. A versão anterior e as revisões anteriores serão preservadas.</p> : null}
    {editor.kind === "assign" ? <><p>Escolha explicitamente um plantão elegível para resolver a pendência sem responsável.</p>{editor.allowDeferral?<p>Escolher um período além do prazo vigente registra também sua decisão familiar de adiamento, preservando os atrasos já ocorridos.</p>:<p>Sua permissão permite atribuir dentro do prazo vigente; adiamento exige capacidade familiar própria.</p>}</> : null}
    {["defer", "assign", "recount"].includes(editor.kind) ? <Field label="Plantão de destino"><Select name="target" required disabled={!targets.length}>{targets.map(s => <option key={s.id} value={s.id}>{s.professional_name} · {s.type_name} · {formatBrazilDate(s.starts_at)} → {formatBrazilDate(s.ends_at)}</option>)}</Select>{!targets.length ? <small>Cadastre um próximo plantão elegível na escala.</small> : null}</Field> : null}
    <Field label="Justificativa"><Textarea name="reason" required minLength={3} maxLength={1000} /></Field>
    <Button appearance="primary" type="submit" disabled={["defer", "assign", "recount"].includes(editor.kind) && !targets.length}>Revisar decisão</Button>
  </form>;
}
