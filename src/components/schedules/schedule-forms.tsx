"use client";
import { useState, type FormEvent } from "react";
import { Button, Checkbox, Field, Input, Select, Textarea } from "@fluentui/react-components";
import type { ScheduleCommand } from "@/lib/validation/schedules";
import type { ScheduleWorkspace, ScheduledShift, ShiftType } from "@/types/schedules";
import { civilInstant, localMinute } from "@/lib/schedules/time";
export type ScheduleEditor = { kind: "type"; type?: ShiftType } | { kind: "series" } | { kind: "shift"; shift: ScheduledShift } | { kind: "end" | "reject"; id: string; version: number } | { kind: "reject_change"; id: string };
export function ScheduleForm({ editor, data, ownId, team, publishOwn = false, today, onReview }: { editor: ScheduleEditor; data: ScheduleWorkspace; ownId: string; team: boolean; publishOwn?: boolean; today: string; onReview: (command: ScheduleCommand, version?: number) => void }) {
  const [recurrence, setRecurrence] = useState("weekly"), [cycle, setCycle] = useState("12x36");
  const [shiftAction, setShiftAction] = useState("change");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget), value = (key: string) => String(form.get(key) ?? "");
    if (editor.kind === "type") onReview({ action: "type", body: { ...(editor.type ? { id: editor.type.id } : {}), name: value("name"), startsLocal: value("start"), durationMinutes: Number(value("duration")), active: value("active") === "on" } }, editor.type?.version);
    if (editor.kind === "series") onReview({ action: "series", body: { professionalId: value("person"), shiftTypeId: value("type"), timezone: value("zone"), recurrence: recurrence as "once" | "weekly" | "cycle", weekdays: form.getAll("day").map(Number), ...(recurrence === "cycle" ? { workHours: Number(cycle.split("x")[0]) as 12 | 24, restHours: Number(cycle.split("x")[1]) as 24 | 36 | 48 } : {}), anchorDate: value("from"), validUntil: recurrence === "once" ? value("from") : value("until"), notes: value("notes"), ...(value("reason") ? { reason: value("reason") } : {}) } });
    if (editor.kind === "end") onReview({ action: "end_series", body: { id: editor.id, fromDate: value("from"), reason: value("reason") } }, editor.version);
    if (editor.kind === "reject") onReview({ action: "reject", body: { id: editor.id, reason: value("reason") } }, editor.version);
    if (editor.kind === "reject_change") onReview({ action: "decide_change", body: { id: editor.id, approve: false, reason: value("reason") } });
    if (editor.kind === "shift") {
      if (shiftAction === "cancel") onReview({ action: "cancel", body: { id: editor.shift.id, reason: value("reason") } }, editor.shift.version);
      else {
        let startsAt: string, endsAt: string;
        try { startsAt = civilInstant(value("start"), editor.shift.timezone); endsAt = civilInstant(value("end"), editor.shift.timezone); }
        catch (error) { const input = event.currentTarget.elements.namedItem("start") as HTMLInputElement; input.setCustomValidity((error as Error).message); input.reportValidity(); input.oninput = () => input.setCustomValidity(""); return; }
        onReview({ action: team || publishOwn ? "change" : "propose_change", body: { id: editor.shift.id, professionalId: value("person"), startsAt, endsAt, reason: value("reason"), notes: value("notes") } }, editor.shift.version);
      }
    }
  }
  return <form onSubmit={submit} className="hca-form-stack">
    {editor.kind === "type" ? <><Field label="Nome do plantão"><Input name="name" required minLength={2} maxLength={100} defaultValue={editor.type?.name} /></Field>
      <Field label="Início local"><Input name="start" type="time" required defaultValue={editor.type?.starts_local.slice(0, 5) ?? "07:00"} /></Field>
      <Field label="Duração em minutos"><Input name="duration" type="number" min={15} max={1440} step={1} defaultValue={String(editor.type?.duration_minutes ?? 720)} required /><small>720 minutos = 12 horas; 1440 minutos = 24 horas.</small></Field>
      <Checkbox name="active" label="Disponível para novas escalas" defaultChecked={editor.type?.is_active ?? true} />
      {editor.type ? <p className="hca-muted">Plantões já programados conservam seus intervalos originais.</p> : null}</> : null}
    {editor.kind === "series" ? <><Field label="Profissional"><Select name="person" defaultValue={team ? data.professionals[0]?.id : ownId} required>{data.professionals.filter(p => team || p.id === ownId).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
      <Field label="Tipo de plantão"><Select name="type" required>{data.types.filter(t => t.is_active).map(t => <option key={t.id} value={t.id}>{t.name} · {t.starts_local.slice(0, 5)} · {t.duration_minutes / 60}h</option>)}</Select></Field>
      <Field label="Repetição"><Select value={recurrence} onChange={e => setRecurrence(e.target.value)}><option value="weekly">Dias da semana</option><option value="once">Data específica</option><option value="cycle">Ciclo de trabalho e descanso</option></Select></Field>
      {recurrence === "weekly" ? <fieldset className="hca-weekdays"><legend>Dias da semana</legend>{["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d, n) => <Checkbox key={d} label={d} name="day" value={String(n)} defaultChecked={n === 1} />)}</fieldset> : null}
      {recurrence === "cycle" ? <Field label="Regime"><Select value={cycle} onChange={e => setCycle(e.target.value)}>{["12x36", "24x48", "24x24"].map(c => <option key={c}>{c}</option>)}</Select><small>Use um tipo com a mesma duração de trabalho. O ciclo mantém horas corridas a partir da data de início.</small></Field> : null}
      <Field label="Primeiro dia / âncora"><Input name="from" type="date" defaultValue={today} required /></Field>
      {recurrence !== "once" ? <Field label="Válida até"><Input name="until" type="date" defaultValue={addDays(today, 28)} required /><small>Até 366 dias após a âncora. Todas as ocorrências são verificadas antes da gravação.</small></Field> : null}
      <Field label="Fuso horário"><Select name="zone" defaultValue="America/Sao_Paulo">{["America/Sao_Paulo", "America/Manaus", "America/Belem", "America/Fortaleza", "America/Cuiaba", "America/Rio_Branco", "America/Noronha", "UTC"].map(z => <option key={z}>{z}</option>)}</Select></Field>
      <Field label="Observações"><Textarea name="notes" maxLength={2000} /></Field>
      <Field label="Motivo de registro retroativo, quando necessário"><Input name="reason" maxLength={1000} /></Field>
      {!team && !publishOwn ? <p className="hca-muted">Sua programação será proposta para aprovação.</p> : null}</> : null}
    {editor.kind === "end" ? <><p>As ocorrências a partir da data escolhida serão canceladas. O histórico e os documentos permanecem preservados.</p><Field label="Encerrar a partir de"><Input name="from" type="date" defaultValue={today} required /></Field><Field label="Justificativa"><Textarea name="reason" required minLength={3} maxLength={1000} /></Field></> : null}
    {editor.kind === "reject" || editor.kind === "reject_change" ? <Field label="Motivo da rejeição"><Textarea name="reason" minLength={3} maxLength={1000} required /></Field> : null}
    {editor.kind === "shift" ? <><p>{editor.shift.type_name} · {editor.shift.professional_name}</p>
      {team || publishOwn ? <Field label="Operação"><Select value={shiftAction} onChange={e => setShiftAction(e.target.value)}><option value="change">Alterar / substituir</option><option value="cancel">Cancelar por ausência</option></Select></Field> : null}
      {shiftAction !== "cancel" ? <><Field label="Profissional de destino"><Select name="person" defaultValue={editor.shift.professional_id}>{data.professionals.filter(p => team || !publishOwn || p.id === ownId).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
        <Field label="Início do plantão"><Input name="start" type="datetime-local" defaultValue={localMinute(editor.shift.starts_at, editor.shift.timezone)} required /></Field>
        <Field label="Fim do plantão"><Input name="end" type="datetime-local" defaultValue={localMinute(editor.shift.ends_at, editor.shift.timezone)} required /></Field>
        <p className="hca-muted">Horários em {editor.shift.timezone}.</p><Field label="Observações"><Textarea name="notes" defaultValue={editor.shift.notes} maxLength={2000} /></Field></> : null}
      <Field label="Justificativa"><Textarea name="reason" minLength={3} maxLength={1000} required /></Field>
      {!team && !publishOwn ? <p>A proposta depende de aprovação; o plantão atual permanece válido.</p> : null}</> : null}
    <Button appearance="primary" type="submit">Revisar alteração</Button>
  </form>;
}
export function addDays(value: string, days: number) { const date = new Date(value + "T12:00:00Z"); date.setUTCDate(date.getUTCDate() + days); return date.toISOString().slice(0, 10); }
