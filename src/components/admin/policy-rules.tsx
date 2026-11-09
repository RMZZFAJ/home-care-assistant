"use client";
import { ActionButton, CheckboxField, FormField, SelectField, TextInput } from "@/components/ui/controls";
import { useState, type FormEvent, type ReactNode } from "react";

import { RecordDrawer } from "@/components/forms/record-drawer";
import { Notice } from "@/components/workspace";
import { ReminderSettings } from "./reminder-settings";
import { roles } from "./admin-fields";
import type { ShortNameMode } from "@/lib/validation/governance";

type Settings = Record<string, unknown>;
const groups = [
  { code: "bal", title: "Balanço e revisão" },
  { code: "science", title: "Ciência da requisição" },
  { code: "messages", title: "Comunicação e lembretes" },
  { code: "archive", title: "Encerramento e histórico" },
];
const days = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
export function PolicyRules({ settings, directory, busy, locked, recovery, revision, error, message, versionKey, onStartEditing, save }: {
  settings: Settings; directory: { id: string; name: string; role: string }[]; busy: boolean; error: string; message: string; versionKey: string;
  locked: boolean; recovery: ReactNode; revision: number;
  onStartEditing: () => void; save: (event: FormEvent<HTMLFormElement>) => Promise<boolean>;
}) {
  type Editor = { group: string; baseline: Settings; opener: HTMLElement };
  const [editorState, setEditorState] = useState<(Editor & { revision: number }) | null>(null);
  const [shortNameMode, setShortNameMode] = useState<ShortNameMode>("keep"), [shortName, setShortName] = useState("");
  const editor = editorState?.revision === revision ? editorState : null;
  const setEditor = (value: Editor | null) => setEditorState(value ? { ...value, revision } : null);
  const values = editor?.baseline ?? settings;
  const selected = (key: string, value: string) => Array.isArray(values[key]) && values[key].includes(value);
  const summary = (group: string) => group === "bal" ? `${settings.balDay == null ? "Dia não configurado" : days[Number(settings.balDay)]} · revisão ${settings.balReview === "required" ? "obrigatória" : "opcional"}` : group === "science" ? `${settings.scienceRequired === true ? "Ciência exigida" : "Ciência opcional"} · uma pessoa habilitada · expedição familiar sempre registra ciência` : group === "messages" ? `Primeiro lembrete: ${settings.reminderHours} h · repetição: ${settings.reminderRepeatHours} h` : `Arquivamento após ${settings.archiveDays} dias da conclusão`;
  return <section aria-label="Política do paciente"><div className="hca-section-heading"><div><h2>Política do paciente</h2><p>Documentos existentes preservam a política de emissão. Alterações são versionadas.</p></div></div><div className="hca-records">{groups.map((group) => <article key={group.code} className="hca-record"><div className="hca-record-main"><h3>{group.title}</h3><small>{summary(group.code)}</small></div><ActionButton disabled={locked} aria-label={"Editar " + group.title} onClick={(event) => { onStartEditing(); setShortNameMode("keep"); setShortName(String(settings.patientShortName ?? "")); setEditor({ group: group.code, baseline: settings, opener: event.currentTarget }); }}>Editar</ActionButton></article>)}</div>
    {editor ? <RecordDrawer title={groups.find((group) => group.code === editor.group)?.title ?? "Editar política"} busy={busy} restoreFocusTo={editor.opener} onClose={() => setEditor(null)}>{error ? <Notice error>{error}</Notice> : null}{message ? <Notice>{message}</Notice> : null}
      {recovery}
      <form key={versionKey} className="hca-form hca-policy-rules-form" onSubmit={async (event) => { if (await save(event)) setEditorState(current => current === editor ? null : current); }}>
        <fieldset disabled={locked} className="hca-form min-w-0">
        <div hidden={editor.group !== "bal"} className="hca-form">
          <FormField label="Dia do BAL"><SelectField name="balDay" defaultValue={String(values.balDay ?? "")}><option value="">Não configurado</option>{days.map((day, index) => <option key={day} value={index}>{day}</option>)}</SelectField></FormField>
          <FormField label="Revisão do BAL"><SelectField name="balReview" defaultValue={String(values.balReview)}><option value="optional">Opcional</option><option value="required">Obrigatória</option></SelectField></FormField>
          <fieldset><legend>Grupos revisores BAL</legend>{["family", "supervisor"].map((role) => <CheckboxField key={role} name="balApprovers" value={role} label={roles[role as keyof typeof roles]} defaultChecked={selected("balApprovers", role)} />)}</fieldset>
          <FormField label="Critério de aprovação BAL"><SelectField name="balRequirement" defaultValue={String(values.balRequirement)}><option value="any">Qualquer grupo</option><option value="all">Todos · pessoas distintas</option></SelectField></FormField>
        </div>
        <div hidden={editor.group !== "science"} className="hca-form">
          <CheckboxField name="scienceRequired" label="Exigir ciência familiar da REQ" defaultChecked={values.scienceRequired === true} />
          <CheckboxField name="scienceDialog" label="Permitir ciência mediante diálogo antes de abrir" defaultChecked={values.scienceDialog === true} />
          <CheckboxField name="scienceTacit" label="Permitir ciência tácita por preferência pessoal anterior à emissão" defaultChecked={values.scienceTacit === true} />
          <p className="text-sm">Uma ciência válida de qualquer pessoa habilitada satisfaz a obrigação familiar. A expedição de ENT vinculada sempre registra a ciência de quem efetivamente expede e está autorizado a representar a família.</p>
          <fieldset><legend>Funções responsáveis pela ciência</legend>{["admin", "family", "supervisor", "professional"].map((role) => <CheckboxField key={role} name="scienceRoles" value={role} label={roles[role as keyof typeof roles]} defaultChecked={selected("scienceRoles", role)} />)}</fieldset>
          <p className="text-sm">As funções selecionadas também precisam da permissão de registrar ciência nas capacidades do paciente.</p>
        </div>
        <div hidden={editor.group !== "messages"} className="hca-form">
          <CheckboxField name="whatsappSimpleAcceptance" label="Aceite ENT simplificado pelo WhatsApp verificado" defaultChecked={values.whatsappSimpleAcceptance === true} />
          <FormField label="O que fazer com o nome curto"><SelectField name="patientShortNameAction" value={shortNameMode} onChange={event => setShortNameMode(event.target.value as ShortNameMode)}><option value="keep">Manter o nome atual</option><option value="change">Alterar o nome curto</option><option value="remove">Remover e usar o nome do cadastro</option></SelectField></FormField>
          <FormField label="Nome curto nas mensagens"  error={shortNameMode === "change" && error.startsWith("Informe um nome curto") ? error : undefined}><TextInput name="patientShortName" maxLength={60} value={shortName} disabled={shortNameMode !== "change"} onChange={controlEvent => { const controlValue = controlEvent.currentTarget.value; return setShortName(controlValue); }} /></FormField>
          <p className="hca-field-hint">Manter não altera esse campo. Remover volta a usar o nome do cadastro; apagar ou digitar espaços ao alterar exige corrigir o valor ou escolher remover.</p>
          {[["reminderHours", "Primeiro lembrete (horas)", 1, 720], ["reminderRepeatHours", "Repetir lembrete (horas)", 1, 720], ["shareWaitSeconds", "Acompanhamento inicial (segundos)", 0, 10]].map(([key, label, min, max]) => <FormField key={String(key)} label={String(label)}><TextInput name={String(key)} type="number" min={Number(min)} max={Number(max)} required defaultValue={String(values[String(key)])} /></FormField>)}
          <ReminderSettings settings={values} directory={directory} />
        </div>
        <div hidden={editor.group !== "archive"} className="hca-form"><FormField label="Arquivar após conclusão (dias)"><TextInput name="archiveDays" type="number" required min={1} max={365} defaultValue={String(values.archiveDays)} /></FormField></div>
        <ActionButton variant="primary" disabled={busy} type="submit">Registrar política</ActionButton>
        </fieldset>
      </form>
    </RecordDrawer> : null}
  </section>;
}
