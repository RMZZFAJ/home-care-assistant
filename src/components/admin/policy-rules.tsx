"use client";
import { useState, type FormEvent } from "react";
import { Button, Checkbox, Field, Input, Select } from "@fluentui/react-components";
import { RecordDrawer } from "@/components/forms/record-drawer";
import { Notice } from "@/components/workspace";
import { ReminderSettings } from "./reminder-settings";
import { roles } from "./admin-fields";

type Settings = Record<string, unknown>;
const groups = [
  { code: "bal", title: "Balanço e revisão" },
  { code: "science", title: "Ciência da requisição" },
  { code: "messages", title: "Comunicação e lembretes" },
  { code: "archive", title: "Encerramento e histórico" },
];
const days = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
export function PolicyRules({ settings, directory, busy, error, message, versionKey, onStartEditing, save }: {
  settings: Settings; directory: { id: string; name: string; role: string }[]; busy: boolean; error: string; message: string; versionKey: string;
  onStartEditing: () => void; save: (event: FormEvent<HTMLFormElement>) => Promise<boolean>;
}) {
  const [editor, setEditor] = useState<{ group: string; baseline: Settings; opener: HTMLElement } | null>(null);
  const values = editor?.baseline ?? settings;
  const selected = (key: string, value: string) => Array.isArray(values[key]) && values[key].includes(value);
  const summary = (group: string) => group === "bal" ? `${settings.balDay == null ? "Dia não configurado" : days[Number(settings.balDay)]} · revisão ${settings.balReview === "required" ? "obrigatória" : "opcional"}` : group === "science" ? `${settings.scienceRequired === true ? "Ciência exigida" : "Ciência opcional"} · ${settings.scienceRequirement === "all" ? "todos os responsáveis" : "uma pessoa autorizada"}` : group === "messages" ? `Primeiro lembrete: ${settings.reminderHours} h · repetição: ${settings.reminderRepeatHours} h` : `Arquivamento após ${settings.archiveDays} dias da conclusão`;
  return <section aria-label="Política do paciente"><div className="hca-section-heading"><div><h2>Política do paciente</h2><p>Documentos existentes preservam a política de emissão. Alterações são versionadas.</p></div></div><div className="hca-records">{groups.map((group) => <article key={group.code} className="hca-record"><div className="hca-record-main"><h3>{group.title}</h3><small>{summary(group.code)}</small></div><Button aria-label={"Editar " + group.title} onClick={(event) => { onStartEditing(); setEditor({ group: group.code, baseline: settings, opener: event.currentTarget }); }}>Editar</Button></article>)}</div>
    {editor ? <RecordDrawer title={groups.find((group) => group.code === editor.group)?.title ?? "Editar política"} busy={busy} restoreFocusTo={editor.opener} onClose={() => setEditor(null)}>{error ? <Notice error>{error}</Notice> : null}{message ? <Notice>{message}</Notice> : null}
      <form key={versionKey} className="hca-form" onSubmit={async (event) => { if (await save(event)) setEditor(null); }}>
        <div hidden={editor.group !== "bal"} className="hca-form">
          <Field label="Dia do BAL"><Select name="balDay" defaultValue={String(values.balDay ?? "")}><option value="">Não configurado</option>{days.map((day, index) => <option key={day} value={index}>{day}</option>)}</Select></Field>
          <Field label="Revisão do BAL"><Select name="balReview" defaultValue={String(values.balReview)}><option value="optional">Opcional</option><option value="required">Obrigatória</option></Select></Field>
          <fieldset><legend>Grupos revisores BAL</legend>{["family", "supervisor"].map((role) => <Checkbox key={role} name="balApprovers" value={role} label={roles[role as keyof typeof roles]} defaultChecked={selected("balApprovers", role)} />)}</fieldset>
          <Field label="Critério de aprovação BAL"><Select name="balRequirement" defaultValue={String(values.balRequirement)}><option value="any">Qualquer grupo</option><option value="all">Todos · pessoas distintas</option></Select></Field>
        </div>
        <div hidden={editor.group !== "science"} className="hca-form">
          {[["scienceRequired", "Exigir ciência familiar da REQ"], ["scienceByDispatch", "Registrar ciência do entregador autorizado na expedição"], ["scienceAutomatic", "Permitir ciência automática com consentimento pessoal"], ["scienceWhatsApp", "Permitir ciência simplificada pelo WhatsApp com consentimento pessoal"]].map(([key, label]) => <Checkbox key={key} name={key} label={label} defaultChecked={values[key] === true} />)}
          <fieldset><legend>Funções responsáveis pela ciência</legend>{["admin", "family", "supervisor", "professional"].map((role) => <Checkbox key={role} name="scienceRoles" value={role} label={roles[role as keyof typeof roles]} defaultChecked={selected("scienceRoles", role)} />)}</fieldset>
          <Field label="Exigência de ciência"><Select name="scienceRequirement" defaultValue={String(values.scienceRequirement)}><option value="any">Uma pessoa autorizada</option><option value="all">Todas as pessoas responsáveis</option></Select></Field>
        </div>
        <div hidden={editor.group !== "messages"} className="hca-form">
          <Checkbox name="whatsappSimpleAcceptance" label="Aceite ENT simplificado pelo WhatsApp verificado" defaultChecked={values.whatsappSimpleAcceptance === true} />
          <Field label="Nome curto nas mensagens"><Input name="patientShortName" maxLength={60} defaultValue={String(values.patientShortName ?? "")} /></Field>
          {[["reminderHours", "Primeiro lembrete (horas)", 1, 720], ["reminderRepeatHours", "Repetir lembrete (horas)", 1, 720], ["shareWaitSeconds", "Acompanhamento inicial (segundos)", 0, 10]].map(([key, label, min, max]) => <Field key={String(key)} label={String(label)}><Input name={String(key)} type="number" min={Number(min)} max={Number(max)} required defaultValue={String(values[String(key)])} /></Field>)}
          <ReminderSettings settings={values} directory={directory} />
        </div>
        <div hidden={editor.group !== "archive"} className="hca-form"><Field label="Arquivar após conclusão (dias)"><Input name="archiveDays" type="number" required min={1} max={365} defaultValue={String(values.archiveDays)} /></Field></div>
        <Button appearance="primary" disabled={busy} type="submit">Registrar política</Button>
      </form>
    </RecordDrawer> : null}
  </section>;
}
