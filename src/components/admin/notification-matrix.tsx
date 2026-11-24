"use client";

import { useEffect, useId, useState, type FormEvent, type ReactNode } from "react";
import { RecordDrawer } from "@/components/forms/record-drawer";
import { ActionButton, CheckboxField, FormField, LoadingIndicator, Pill, SelectField, TextInput } from "@/components/ui/controls";
import { FeedbackBanner } from "@/components/ui/feedback";
import { Icon } from "@/components/ui/primitives";
import { api } from "@/lib/client/api";
import { documentEventLabel } from "@/lib/notifications/event-labels";
import { useLiveRevision } from "@/lib/use-live-revision";
import { roles } from "./admin-fields";

type Rule = {
  event: string; subject_role: string; channels: string[]; include_pdf: boolean;
  cooldown_minutes: number; quiet_start: number | null; quiet_end: number | null; mode: string;
};
type Data = { rules: Rule[]; channels: { code: string; label: string }[]; events: string[]; eventChannels?: Record<string, string[]> };
type Editor = { event: string; role: string; opener: HTMLElement; data: Data; version: number };
const defaultChannels = [{ code: "internal", label: "Aplicativo" }, { code: "email", label: "E-mail" }, { code: "whatsapp", label: "WhatsApp" }];

function availableChannels(data: Data, event: string) {
  return data.channels.filter(channel => !data.eventChannels || data.eventChannels[event]?.includes(channel.code));
}

export function NotificationMatrix({ patientId, version, formRevision, busy, locked, configure, configurationError, recovery, globalMode }: {
  patientId: string; version: number; formRevision: number; busy: boolean; locked: boolean; globalMode: boolean;
  configure: (change: Record<string, unknown>, expectedVersion: number) => Promise<void>;
  configurationError?: string; recovery?: ReactNode;
}) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [editing, setEditing] = useState<(Editor & { formRevision: number }) | null>(null);
  const editor = editing?.formRevision === formRevision ? editing : null;
  const [snapshot, setSnapshot] = useState<{ data: Data; version: number } | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const revision = useLiveRevision();
  const url = `/api/notification-rules?careRecipientId=${patientId}`;
  useEffect(() => {
    const controller = new AbortController();
    void api<Data>(url, undefined, controller.signal).then(data => {
      if (!controller.signal.aborted) { setSnapshot({ data, version }); setError(""); }
    }).catch(reason => {
      if (!controller.signal.aborted) { setSnapshot(null); setError(reason instanceof Error ? reason.message : "Não foi possível carregar as regras de avisos."); }
    });
    return () => controller.abort();
  }, [url, version, formRevision, attempt, revision]);
  const data = snapshot?.data;
  const searchText = search.trim().toLocaleLowerCase("pt-BR");
  const events = data?.events.filter(event => documentEventLabel(event).toLocaleLowerCase("pt-BR").includes(searchText)) ?? [];
  return <>
    <section aria-label="Regras de avisos" className="hca-residence-admin-section hca-residence-rules">
      <header><h2>Regras de avisos</h2></header>
      {error ? <FeedbackBanner tone="error">{error} <ActionButton onClick={() => { setError(""); setAttempt(n => n + 1); }}>Consultar regras de avisos novamente</ActionButton></FeedbackBanner>
        : !snapshot || !data ? <p role="status" className="hca-residence-rules-empty"><LoadingIndicator compact /> Carregando regras de avisos…</p> : <>
          <div className="hca-toolbar hca-notice-rules-filter">
            <TextInput type="search" aria-label="Pesquisar eventos de notificação" placeholder="Buscar evento" leading={<Icon name="search" />} value={search} onChange={event => setSearch(event.currentTarget.value)} />
            <SelectField aria-label="Função nas notificações" value={roleFilter} onChange={event => setRoleFilter(event.currentTarget.value)}>
              <option value="">Todas as funções</option>{Object.entries(roles).map(([role, label]) => <option key={role} value={role}>{label}</option>)}
            </SelectField>
          </div>
          <div>{events.length ? events.map(event => {
            const eventRules = data.rules.filter(rule => rule.event === event && (!roleFilter || rule.subject_role === roleFilter));
            const roleNames = [...new Set(eventRules.map(rule => roles[rule.subject_role as keyof typeof roles]))];
            const channels = availableChannels(data, event).filter(channel => eventRules.length ? eventRules.some(rule => rule.channels.includes(channel.code)) : channel.code === "internal");
            const summary = [roleFilter ? roles[roleFilter as keyof typeof roles] : roleNames.join(", ") || "Configuração padrão", ...channels.map(channel => channel.label)].join(" · ");
            return <button key={event} type="button" className="hca-guide-row" aria-disabled={locked || snapshot.version !== version}
              onClick={action => {
                if (locked || snapshot.version !== version) return;
                setEditing({ event, role: roleFilter || eventRules[0]?.subject_role || "family", opener: action.currentTarget, data, version: snapshot.version, formRevision });
              }}>
              <span className="hca-guide-row-icon"><Icon name={event === "stock.alert" ? "box" : "bell"} /></span>
              <span className="hca-guide-row-label"><strong>{documentEventLabel(event)}</strong><small>{summary}</small></span><Icon name="chevron" width={15} height={15} />
            </button>;
          }) : <p className="hca-residence-rules-empty">Nenhum evento corresponde à busca.</p>}</div>
        </>}
    </section>
    {editor ? <NoticeRuleEditor editor={editor} setRole={role => setEditing({ ...editor, role })} globalMode={globalMode}
      stale={snapshot?.version !== editor.version || version !== editor.version} reload={snapshot?.version === version
        ? () => setEditing({ ...editor, data: snapshot.data, version: snapshot.version }) : undefined}
      busy={busy} locked={locked} configurationError={configurationError} recovery={recovery} onClose={() => setEditing(null)}
      onSave={change => configure(change, editor.version)} /> : null}
  </>;
}

function NoticeRuleEditor({ editor, setRole, globalMode, busy, locked, stale, reload, configurationError, recovery, onClose, onSave }: {
  editor: Editor; setRole: (value: string) => void; globalMode: boolean; busy: boolean; locked: boolean;
  stale: boolean; reload?: () => void;
  configurationError?: string; recovery?: ReactNode; onClose: () => void; onSave: (change: Record<string, unknown>) => Promise<void>;
}) {
  const { event, role, data } = editor;
  const formId = useId();
  const current = data.rules.find(rule => rule.event === event && rule.subject_role === role);
  const available = availableChannels(data, event);
  const visibleChannels = defaultChannels.map(channel => available.find(candidate => candidate.code === channel.code) ?? channel)
    .concat(available.filter(channel => !defaultChannels.some(candidate => candidate.code === channel.code)));
  const selected = current?.channels ?? ["internal"];
  const supportsPdf = event !== "req.registered_author";
  async function submit(eventSubmit: FormEvent<HTMLFormElement>) {
    eventSubmit.preventDefault();
    if (locked || stale) return;
    const form = new FormData(eventSubmit.currentTarget);
    const hour = (name: string) => form.get(name) === "" ? null : Number(form.get(name));
    const channels = [...selected.filter(code => !available.some(channel => channel.code === code)), ...form.getAll("channel")];
    await onSave({ event, role, channels, includePdf: supportsPdf && form.has("includePdf"),
      cooldownMinutes: Number(form.get("cooldown")), quietStart: hour("quietStart"), quietEnd: hour("quietEnd"), mode: form.get("mode") });
  }
  return <RecordDrawer title={documentEventLabel(event)} subtitle={`Regra para a função ${roles[role as keyof typeof roles]}`}
    kicker="Organização da residência" popupClassName="hca-preference-sheet hca-residence-settings-sheet"
    headingIcon="bell" restoreFocusTo={editor.opener} busy={busy} onClose={onClose} keyboardScrollable exitDialog
    footer={close => <><ActionButton onClick={close}>Voltar</ActionButton><ActionButton variant="primary" type="submit" form={formId} disabled={locked || stale}>
      <Icon name="check" />{globalMode ? "Propor regra" : "Salvar regra"}</ActionButton></>}>
    {configurationError ? <FeedbackBanner tone="error">{configurationError}</FeedbackBanner> : null}{recovery}
    {stale ? <FeedbackBanner tone="warning">A configuração mudou durante a edição. {reload ? <ActionButton onClick={reload}>Abrir versão atual</ActionButton> : null}</FeedbackBanner> : null}
    <FormField label="Função"><SelectField value={role} disabled={locked} onChange={value => setRole(value.currentTarget.value)}>
      {Object.entries(roles).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
    </SelectField></FormField>
    <form key={`${role}:${editor.version}`} id={formId} className="hca-form" onSubmit={submit}>
      <fieldset disabled={locked || stale} className="hca-form min-w-0">
      <FormField label="Comportamento no aplicativo"><SelectField name="mode" defaultValue={current?.mode ?? "optional"}>
        <option value="optional">Conforme preferência pessoal</option><option value="required">Obrigatório no aplicativo</option><option value="silent">Silencioso no aplicativo</option>
      </SelectField></FormField>
      {visibleChannels.map(channel => available.some(candidate => candidate.code === channel.code)
        ? <CheckboxField key={channel.code} className="hca-setting-switch" role="switch" name="channel" value={channel.code} label={channel.label} defaultChecked={selected.includes(channel.code)} />
        : <div key={channel.code} className="hca-notice-channel-disabled"><span>{channel.label}<small>Canal indisponível para este evento no contexto atual</small></span><Pill tone="neutral">Indisponível</Pill></div>)}
      <CheckboxField className="hca-setting-switch" role="switch" name="includePdf" label="Incluir o arquivo quando disponível" disabled={!supportsPdf} defaultChecked={supportsPdf && (current?.include_pdf ?? true)} />
      <FormField label="Intervalo mínimo entre avisos (minutos)"><TextInput name="cooldown" type="number" min={0} max={10080} required defaultValue={current?.cooldown_minutes ?? 0} /></FormField>
      <fieldset className="hca-form"><legend>Silêncio externo (hora de Brasília)</legend>
        {([ ["quietStart", "Início", current?.quiet_start], ["quietEnd", "Fim", current?.quiet_end] ] as const).map(([name, label, value]) =>
          <FormField key={name} label={label}><SelectField name={name} defaultValue={value ?? ""}>
            <option value="">Não configurado</option>{Array.from({ length: 24 }, (_, hour) => <option key={hour} value={hour}>{hour}:00</option>)}
          </SelectField></FormField>)}
      </fieldset>
      <p className="hca-field-hint">Uma regra obrigatória no aplicativo não dispensa consentimento para um canal externo.</p>
      </fieldset>
    </form>
  </RecordDrawer>;
}
