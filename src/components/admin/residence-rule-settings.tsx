"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { RecordDrawer } from "@/components/forms/record-drawer";
import { ActionButton, CheckboxField, DefinitionGrid, FormField, LoadingIndicator, Pill, SelectField, TextInput } from "@/components/ui/controls";
import { FeedbackBanner } from "@/components/ui/feedback";
import { Icon, type IconName } from "@/components/ui/icon";
import { api } from "@/lib/client/api";
import { formatQuantity, quantity, validQuantity } from "@/lib/quantity";
import { useLiveRevision } from "@/lib/use-live-revision";
import { residenceRecipients, residenceThresholds, residenceRuleReference, type ResidenceRuleCommand, type ResidenceRuleReference, type ResidenceRuleScope, type ResidenceRecipients, type ResidenceThresholds } from "@/lib/validation/reviewed-residence-rule";
import { ResidenceRuleFeedback, residenceRuleEndpoint, useResidenceRuleOperation } from "./residence-rule-operation";
import "../guides/guides.css";
import "./residence-administration.css";

const custodies = { CARE_TEAM: "Equipe", FAMILY: "Família" } as const;
const channels = { internal: "Aplicativo", email: "E-mail", whatsapp: "WhatsApp" } as const;
const groups = { family: "Família", supervision: "Supervisão", care_team: "Equipe de cuidado", other: "Outro" } as const;
type Picked = { selection: string; option: string };
type Fields = NonNullable<ResidenceRuleCommand["intent"]>["fields"];
type ThresholdData = { kind: "alertRule"; data: ResidenceThresholds };
type RecipientData = { kind: "notificationRecipient"; data: ResidenceRecipients };
type Read = ThresholdData | RecipientData;
type Editor = { picked: Picked; existing: boolean; opener: HTMLElement; verified?: boolean };

function settingUrl(scope: ResidenceRuleScope, picked?: Picked) {
  return `${residenceRuleEndpoint}?${new URLSearchParams({ ...scope, ...(picked ? picked : {}) })}`;
}

function SettingsRow({ title, detail, icon, status, disabled, onOpen }: {
  title: string; detail: string; icon: IconName; status: ReactNode;
  disabled: boolean; onOpen: (event: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  return <button type="button" className="hca-guide-row" disabled={disabled} onClick={onOpen}>
    <span className="hca-guide-row-icon"><Icon name={icon} /></span>
    <span className="hca-guide-row-label"><strong>{title}</strong><small>{detail}</small></span>
    {status}<Icon name="chevron" width={15} height={15} />
  </button>;
}

function RuleRows({ snapshot, blocked, onOpen }: { snapshot: Read; blocked: boolean; onOpen: (editor: Editor) => void }) {
  if (snapshot.kind === "alertRule") {
    const { rules, choices } = snapshot.data;
    const materials = new Map(choices.map(item => [item.id, item]));
    return rules.map(rule => {
      const material = materials.get(rule.productId);
      const detail = `${custodies[rule.location]} · baixo: ${formatQuantity(rule.lowThreshold, material?.unit)} · crítico: ${formatQuantity(rule.criticalThreshold, material?.unit)}`;
      return <SettingsRow key={rule.id} title={material?.name ?? rule.productId} detail={detail} icon={rule.location === "FAMILY" ? "home" : "box"}
        status={<Pill tone={rule.isEnabled ? "success" : "neutral"}>{rule.isEnabled ? "Ativo" : "Desativado"}</Pill>}
        disabled={blocked || !material?.active} onOpen={event => onOpen({ opener: event.currentTarget, existing: true,
          picked: { selection: rule.productId, option: rule.location } })} />;
    });
  }
  return snapshot.data.rules.map(rule => {
    const state = !rule.memberActive ? "Vínculo inativo" : !rule.isEnabled ? "Desativado" : rule.destinationVerified ? "Ativo" : "Confirmar destino";
    return <SettingsRow key={rule.id} title={rule.name} detail={`${groups[rule.recipientGroup]} · ${channels[rule.channel]}`} icon="user"
      status={<Pill tone={state === "Confirmar destino" ? "warning" : state === "Ativo" ? "success" : "neutral"}>{state}</Pill>}
      disabled={blocked || !rule.memberActive} onOpen={event => onOpen({ opener: event.currentTarget, existing: true,
        picked: { selection: rule.recipientUserId, option: rule.channel }, verified: rule.destinationVerified })} />;
  });
}

function toFields(snapshot: Read, picked: Picked, reference: ResidenceRuleReference, form: FormData): Fields {
  if (snapshot.kind === "alertRule") {
    const lowThreshold = String(form.get("low") ?? "").trim(), criticalThreshold = String(form.get("critical") ?? "").trim();
    const decimals = reference.subject?.decimals ?? 0;
    if (!validQuantity(lowThreshold, decimals, true) || !validQuantity(criticalThreshold, decimals, true)) {
      throw new Error(`Informe quantidades válidas para ${reference.subject?.unit ?? "este material"}, com até ${decimals} casas decimais.`);
    }
    if (quantity(criticalThreshold).gt(quantity(lowThreshold))) throw new Error("O limite crítico deve ser menor ou igual ao limite baixo.");
    return { productId: picked.selection, location: picked.option as keyof typeof custodies, lowThreshold, criticalThreshold, isEnabled: form.has("enabled") };
  }
  const channel = picked.option as keyof typeof channels;
  const recipientGroup = form.get("group") as keyof typeof groups;
  const destination = channel === "internal" ? "" : String(form.get("destination") ?? "").trim();
  if (channel === "whatsapp" && !/^\+[1-9][0-9]{7,14}$/.test(destination)) throw new Error("Informe o número do WhatsApp com código do país e DDD.");
  return { recipientUserId: picked.selection, recipientGroup, channel, destination,
    isEnabled: form.has("enabled"), includeTeamAlerts: recipientGroup === "family" && form.has("teamAlerts") };
}

function RuleEditor({ snapshot, editor, scope, operation, onClose, focusFallback }: {
  snapshot: Read; editor: Editor; scope: ResidenceRuleScope; operation: ReturnType<typeof useResidenceRuleOperation>;
  onClose: () => void; focusFallback: React.RefObject<HTMLElement | null>;
}) {
  const threshold = scope.purpose === "alertRule";
  const [picked, setPicked] = useState(editor.picked);
  const formId = useId();
  const [read, setRead] = useState<{ url: string; reference?: ResidenceRuleReference; error?: string } | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const url = picked.selection && picked.option ? settingUrl(scope, picked) : null;
  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();
    void api(url, undefined, controller.signal).then(value => residenceRuleReference.parse(value))
      .then(reference => { if (!controller.signal.aborted) setRead({ url, reference }); })
      .catch(reason => { if (!controller.signal.aborted) setRead({ url, error: reason instanceof Error ? reason.message : "Não foi possível consultar esta configuração." }); });
    return () => controller.abort();
  }, [url, attempt]);
  const current = read?.url === url ? read : null;
  const reference = current?.reference;
  const saved = reference?.current;
  const name = reference?.subject?.name;
  const versionConflict = Boolean(reference && reference.hash === operation.conflictingReference);
  function select(key: keyof Picked, value: string) {
    setError("");
    setRead(null);
    setPicked(previous => ({ ...previous, [key]: value }));
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reference?.eligible || operation.blocked || versionConflict) return;
    try {
      const fields = toFields(snapshot, picked, reference, new FormData(event.currentTarget));
      setError("");
      await operation.submit({ fields, referenceHash: reference.hash });
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Confira os valores da configuração."); }
  }
  const title = threshold ? "Limite de estoque" : editor.existing ? "Destinatário de avisos" : "Adicionar destinatário";
  const action = threshold ? "limite" : "destinatário";
  return <RecordDrawer title={title} subtitle={threshold ? undefined : "Canais autorizados para esta residência"}
    kicker={threshold ? undefined : "Organização da residência"}
    popupClassName={threshold ? undefined : "hca-preference-sheet hca-residence-settings-sheet"}
    headingIcon={threshold ? "box" : "bell"} modal={threshold} onClose={onClose} busy={operation.busy}
    restoreFocusTo={editor.opener} restoreFocusFallbackRef={focusFallback} keyboardScrollable exitDialog
    footer={close => <><ActionButton onClick={close}>Voltar</ActionButton><ActionButton variant="primary" type="submit" form={formId}
      disabled={!reference?.eligible || operation.blocked || versionConflict}><Icon name="check" />{scope.mode === "global" ? "Propor " : "Salvar "}{action}</ActionButton></>}>
    <form className="hca-form" id={formId} onSubmit={submit}>
      {editor.existing && editor.verified === false ? <FeedbackBanner tone="warning" className="hca-residence-contact-warning" heading={`${channels[picked.option as keyof typeof channels]} aguardando confirmação`}>
        O cadastro pode ser salvo. O envio depende da confirmação do destino e da autorização do canal.
      </FeedbackBanner> : null}
      {snapshot.kind === "alertRule" ? !editor.existing ? <>
        <FormField label="Material" required><SelectField value={picked.selection} onChange={event => select("selection", event.currentTarget.value)}>
          <option value="">Escolha um material</option>{snapshot.data.choices.filter(item => item.active).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        </SelectField></FormField>
        <FormField label="Estoque" required><SelectField value={picked.option} onChange={event => select("option", event.currentTarget.value)}>
          <option value="">Escolha a custódia</option>{snapshot.data.custodies.map(location => <option key={location} value={location}>{custodies[location]}</option>)}
        </SelectField></FormField>
      </> : null : <>
        <FormField label="Pessoa vinculada" required><SelectField value={picked.selection} disabled={editor.existing} onChange={event => select("selection", event.currentTarget.value)}>
          <option value="">Escolha uma pessoa</option>{snapshot.data.choices.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}
        </SelectField></FormField>
        <FormField label="Grupo"><SelectField key={reference?.hash ?? "initial"} name="group" disabled={!reference?.eligible || versionConflict} defaultValue={String(saved?.recipientGroup ?? "family")}>
          {Object.entries(groups).map(([group, label]) => <option key={group} value={group}>{label}</option>)}
        </SelectField></FormField>
        <FormField label="Canal" required><SelectField value={picked.option} disabled={editor.existing} onChange={event => select("option", event.currentTarget.value)}>
          <option value="">Escolha um canal</option>{Object.entries(channels).map(([channel, label]) => <option key={channel} value={channel}>{label}</option>)}
        </SelectField></FormField>
      </>}
      {url && !current ? <p role="status"><LoadingIndicator compact /> Consultando configuração atual…</p> : null}
      {current?.error || versionConflict ? <FeedbackBanner tone="error">
        {current?.error ?? "A configuração mudou. Consulte os valores atuais para preparar outra alteração."}{" "}
        <ActionButton onClick={() => { setRead(null); setError(""); operation.closeFailure(); setAttempt(value => value + 1); }}>Consultar configuração atual</ActionButton>
      </FeedbackBanner> : null}
      {reference && !reference.eligible ? <FeedbackBanner tone="warning">O material ou vínculo selecionado já não pode receber esta configuração.</FeedbackBanner> : null}
      {reference?.eligible && !versionConflict ? <div key={reference.hash} className="hca-form">
        {threshold ? <>
          <DefinitionGrid items={[{ label: "Material", value: name }, { label: "Estoque", value: custodies[picked.option as keyof typeof custodies] }, { label: "Unidade", value: reference.subject?.unit }]} />
          <FormField label="Avisar estoque baixo a partir de" required><TextInput name="low" inputMode="decimal" maxLength={64} defaultValue={String(saved?.lowThreshold ?? "0").replace(".", ",")} /></FormField>
          <FormField label="Avisar estoque crítico a partir de" required><TextInput name="critical" inputMode="decimal" maxLength={64} defaultValue={String(saved?.criticalThreshold ?? "0").replace(".", ",")} /></FormField>
        </> : <>
          {picked.option === "internal" ? <p className="hca-field-hint">O aviso aparece na conta selecionada.</p>
            : <FormField label="Destino" required><TextInput name="destination" maxLength={254} type={picked.option === "email" ? "email" : "tel"} defaultValue={String(saved?.destination ?? "")} /></FormField>}
        </>}
        <CheckboxField className="hca-setting-switch" role="switch" name="enabled" label={threshold ? "Regra habilitada" : "Destinatário ativo"} defaultChecked={saved?.isEnabled !== false} />
        {!threshold ? <>
          <CheckboxField className="hca-setting-switch" role="switch" name="teamAlerts" label="Receber alertas da equipe" defaultChecked={saved?.includeTeamAlerts === true} />
          <p className="hca-field-hint">A opção de alertas da equipe se aplica ao grupo Família. Adicionar a pessoa não concede vínculo nem acesso a conteúdo restrito.</p>
        </> : null}
      </div> : null}
      {error ? <FeedbackBanner tone="error">{error}</FeedbackBanner> : null}
    </form>
  </RecordDrawer>;
}

export function ResidenceRuleSettings({ scope, userId }: { scope: ResidenceRuleScope; userId: string }) {
  const liveRevision = useLiveRevision();
  const [snapshot, setSnapshot] = useState<Read | null>(null);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [editor, setEditor] = useState<Editor | null>(null);
  const addRef = useRef<HTMLButtonElement>(null);
  const operation = useResidenceRuleOperation(userId, scope);
  const threshold = scope.purpose === "alertRule";
  const url = settingUrl(scope);
  useEffect(() => {
    const controller = new AbortController();
    void api(url, undefined, controller.signal).then(value => {
      if (controller.signal.aborted) return;
      setSnapshot(threshold ? { kind: "alertRule", data: residenceThresholds.parse(value) }
        : { kind: "notificationRecipient", data: residenceRecipients.parse(value) });
      setError("");
    }).catch(reason => {
      if (controller.signal.aborted) return;
      setSnapshot(null);
      setEditor(null);
      setError(reason instanceof Error ? reason.message : "Não foi possível consultar esta configuração.");
    });
    return () => controller.abort();
  }, [liveRevision, revision, threshold, url]);
  const disabled = operation.blocked || !snapshot || snapshot.data.choices.length === 0
    || (snapshot.kind === "alertRule" && snapshot.data.custodies.length === 0);
  const title = threshold ? "Alertas por estoque" : "Destinatários";
  return <>
    <section className="hca-residence-admin-section hca-residence-rules" aria-label={title}>
      <header><h2>{title}</h2><ActionButton ref={addRef} compact disabled={disabled}
        onClick={event => setEditor({ opener: event.currentTarget, existing: false, picked: { selection: "", option: "" } })}>
        <Icon name="plus" />{threshold ? "Adicionar limite" : "Adicionar"}
      </ActionButton></header>
      {snapshot ? <div>{snapshot.data.rules.length > 0 ? <RuleRows snapshot={snapshot} blocked={operation.blocked} onOpen={setEditor} />
        : <p className="hca-residence-rules-empty">{threshold ? "Nenhum limite configurado nas custódias disponíveis." : "Nenhum destinatário configurado."}</p>}</div>
        : error ? <FeedbackBanner tone="error">{error} <ActionButton onClick={() => { setError(""); setRevision(value => value + 1); }}>Consultar novamente</ActionButton></FeedbackBanner>
          : <p role="status" className="hca-residence-rules-empty"><LoadingIndicator compact /> Carregando {threshold ? "limites" : "destinatários"}…</p>}
    </section>
    {threshold ? <FeedbackBanner>Os limites acompanham o saldo da custódia selecionada. Salvar uma regra não movimenta estoque.</FeedbackBanner> : null}
    {snapshot && editor ? <RuleEditor snapshot={snapshot} editor={editor} scope={scope} operation={operation} onClose={() => setEditor(null)} focusFallback={addRef} /> : null}
    <ResidenceRuleFeedback operation={operation} threshold={threshold} focus={addRef}
      onFinish={() => { setEditor(null); setRevision(value => value + 1); }} />
  </>;
}
