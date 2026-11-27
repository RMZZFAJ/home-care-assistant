"use client";

import { ActionButton, CheckboxField, DefinitionGrid, FormField, Pill, SelectField, TextAreaField } from "@/components/ui/controls";
import { FeedbackBanner } from "@/components/ui/feedback";
import { Icon } from "@/components/ui/icon";
import type { FormEvent } from "react";
import { formatBrazilDate } from "@/lib/receipt";
import type { ProfessionalCredential } from "@/lib/validation/professional-credential";
import "./residence-administration.css";
import "./credential-review.css";

type Declaration = ProfessionalCredential["declaration"];
type Review = NonNullable<ProfessionalCredential["latestReview"]>;
export type CredentialEditor = {
  declaration: Declaration;
  outcome: string;
  note: string;
  acknowledged: boolean;
  conflict: boolean;
};

const labels = {
  informed: { text: "Informado pelo titular", tone: "neutral" },
  needs_review: { text: "Nova conferência necessária", tone: "warning" },
  family_checked: { text: "Conferido pela família", tone: "success" },
  not_confirmed: { text: "Conferência não confirmada", tone: "warning" },
} as const;

function DeclarationValues({ values, version }: { values: Declaration["values"]; version?: string }) {
  return <DefinitionGrid items={[
    { label: "Nome informado", value: values.fullName || "Não informado" },
    { label: "Categoria informada", value: values.category || "Não informada" },
    { label: "Registro informado", value: values.registration || "Sem registro informado" },
    { label: "UF informada", value: values.state || "Não informada" },
    ...(version ? [{ label: "Versão consultada", value: version }] : []),
  ]} />;
}

export function CredentialComparison({ prior, current }: { prior: Declaration; current: Declaration }) {
  return <div className="hca-credential-comparison-content">
    <div className="hca-credential-version">
      <span>Declaração conferida</span>
      <s>Versão {prior.revision}</s>
      <Icon name="chevron" width={14} height={14} />
      <strong>Versão {current.revision}</strong>
    </div>
    <DefinitionGrid items={[
      { label: "Profissional", value: current.values.fullName || "Nome não informado" },
      { label: "Registro atual", value: current.values.registration || "Sem registro informado" },
    ]} />
    <p className="hca-credential-comparison-hint"><Icon name="history" width={16} height={16} />
      Confira a versão atual antes de registrar a decisão da família. A conferência anterior permanece no histórico.
    </p>
    <details className="hca-credential-comparison-details">
      <summary>Comparar todos os dados</summary>
      <div>
        <section aria-label="Declaração consultada"><h3>Declaração consultada</h3><DeclarationValues values={prior.values} version={prior.revision} /></section>
        <section aria-label="Declaração atualizada"><h3>Declaração atualizada</h3><DeclarationValues values={current.values} version={current.revision} /></section>
      </div>
    </details>
  </div>;
}

export function CredentialSections({ read, subjectRole, openHistory }: {
  read: ProfessionalCredential;
  subjectRole: string;
  openHistory: (opener: HTMLButtonElement) => void;
}) {
  const { declaration, state, latestReview } = read;
  return <div className="hca-residence-admin">
    <section className="hca-residence-admin-hero" aria-label="Pessoa da equipe">
      <span className="hca-guide-row-icon"><Icon name="user" width={24} height={24} /></span>
      <span className="hca-guide-row-label"><strong>{declaration.values.fullName || "Nome não informado"}</strong><small>{subjectRole}</small></span>
    </section>
    {state === "needs_review" ? <FeedbackBanner tone="warning" heading="Declaração atualizada">
      A versão {declaration.revision} aguarda nova conferência. A decisão anterior permanece no histórico.
    </FeedbackBanner> : null}
    <section className="hca-residence-admin-section" aria-label="Declaração atual">
      <header><h2>Declaração atual</h2></header>
      <div className="hca-form-stack">
        <div className="hca-guide-row">
          <span className="hca-guide-row-icon"><Icon name="checklist" /></span>
          <span className="hca-guide-row-label"><strong>{declaration.values.category || "Categoria não informada"}</strong><small>Informado em {formatBrazilDate(declaration.changedAt)} · versão {declaration.revision}</small></span>
          <Pill tone={labels[state].tone}>{labels[state].text}</Pill>
        </div>
        <DefinitionGrid items={[
          { label: "Registro informado", value: declaration.values.registration || "Sem registro informado" },
          { label: "UF", value: declaration.values.state || "Não informada" },
        ]} />
        <FeedbackBanner>São dados informados pela própria pessoa. Nenhuma verificação externa foi registrada.</FeedbackBanner>
      </div>
    </section>
    <section className="hca-residence-admin-section" aria-label="Conferência da família">
      <header><h2>Conferência da família</h2></header>
      <div className="hca-form-stack">
        {latestReview ? <button type="button" className="hca-guide-row" onClick={event => openHistory(event.currentTarget)}>
          <span className="hca-guide-row-icon"><Icon name="history" /></span>
          <span className="hca-guide-row-label">
            <strong>{latestReview.outcome === "checked" ? "Conferência registrada" : "Registro não confirmado"}</strong>
            <small>{latestReview.author.name} · {formatBrazilDate(latestReview.recordedAt)} · versão {latestReview.credentialRevision}</small>
          </span>
          <Pill tone={state === "not_confirmed" ? "warning" : "neutral"}>{state === "not_confirmed" ? "Pendente" : "Histórico"}</Pill>
        </button> : <div className="hca-guide-row">
          <span className="hca-guide-row-icon"><Icon name="checklist" /></span>
          <span className="hca-guide-row-label"><strong>Ainda não conferida</strong><small>A família pode registrar o que conferiu, sem substituir a validação de uma fonte externa.</small></span>
        </div>}
      </div>
    </section>
  </div>;
}

export function CredentialReviewEntry({ item }: { item: Review }) {
  return <article className="hca-residence-admin-section" aria-label="Registro de conferência">
    <header><h3>{formatBrazilDate(item.recordedAt)}</h3></header>
    <div className="hca-form-stack">
      <div className="hca-guide-row">
        <span className="hca-guide-row-icon"><Icon name="history" /></span>
        <span className="hca-guide-row-label">
          <strong>{item.outcome === "checked" ? "Conferido pela família" : "Não confirmado pela família"}</strong>
          <small>{item.author.name} · {item.author.role === "admin" ? "Administrador local" : "Familiar"} · declaração versão {item.credentialRevision}</small>
        </span>
        <Pill tone="neutral">Preservado</Pill>
      </div>
      <DeclarationValues values={item.declaration} />
      {item.note ? <DefinitionGrid items={[{ label: "Observação da família", value: item.note, wide: true }]} /> : null}
    </div>
  </article>;
}

export function CredentialReviewFields({ editor, onChange, onSubmit, onCompare, formId, error }: {
  editor: CredentialEditor;
  onChange: (fields: Partial<CredentialEditor>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCompare: () => void;
  formId: string;
  error: string;
}) {
  return <form id={formId} onSubmit={onSubmit} className="hca-form-stack">
    {editor.conflict ? <FeedbackBanner heading="Confira a versão atual" tone="warning">
      A declaração foi alterada enquanto você fazia a conferência. <ActionButton onClick={onCompare}>Comparar versões</ActionButton>
    </FeedbackBanner> : null}
    <DeclarationValues values={editor.declaration.values} version={editor.declaration.revision} />
    <FormField label="Resultado da conferência" required>
      <SelectField value={editor.outcome} required onChange={event => onChange({ outcome: event.currentTarget.value })}>
        <option value="">Selecione</option>
        <option value="checked">Conferido pela família</option>
        <option value="not_confirmed">Não confirmado pela família</option>
      </SelectField>
    </FormField>
    <FormField label="Observação da família" helpText="Obrigatória quando não for possível confirmar." error={error}>
      <TextAreaField value={editor.note} required={editor.outcome === "not_confirmed"} minLength={editor.outcome === "not_confirmed" ? 6 : undefined}
        maxLength={600} onChange={event => onChange({ note: event.currentTarget.value })} />
    </FormField>
    <CheckboxField label="Conferi os dados desta declaração" checked={editor.acknowledged} required disabled={editor.conflict}
      onChange={event => onChange({ acknowledged: event.currentTarget.checked })} />
    <p className="hca-residence-admin-note"><Icon name="info" />Este registro é uma conferência familiar. A consulta a um conselho profissional é uma verificação separada.</p>
  </form>;
}
