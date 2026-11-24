"use client";

import { useId, useState, type RefObject } from "react";
import { RecordDrawer } from "@/components/forms/record-drawer";
import { ActionButton, DefinitionGrid, FormField, SelectField, TextInput } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { Dialog } from "@/components/ui/overlays";
import { Notice } from "@/components/workspace";
import { environmentLabels, operationLabels, operationPolicy, type Diagnostics, type OperationEnvironment, type OperationsCommand } from "@/lib/operations/contracts";
import { TechnicalHistory, thresholdLabels } from "./technical-history";

type Policy = Diagnostics["policy"];
type Threshold = keyof typeof thresholdLabels;
const thresholds = Object.entries(thresholdLabels) as [Threshold, string][];
const components = Object.entries(operationLabels) as [keyof typeof operationLabels, string][];
const linkedThresholds = [
  ["heartbeatWarningSeconds", "heartbeatCriticalSeconds"], ["jobWarningSeconds", "jobCriticalSeconds"],
  ["pdfWarningSeconds", "pdfCriticalSeconds"], ["backupWarningSeconds", "backupCriticalSeconds"],
  ["securityWarningCount", "securityCriticalCount"],
] as const;

export function TechnicalPolicy({ current, environment, busy, pending, refreshing, conflict, opener, fallback, reload, onAdopt, close, send, recover }: {
  current: Policy; environment: OperationEnvironment; busy: boolean; pending: boolean; refreshing: boolean; conflict: boolean;
  opener: HTMLElement | null; fallback: RefObject<HTMLElement | null>;
  reload: () => void; onAdopt: () => void; close: () => void; send: (packet: OperationsCommand) => Promise<boolean>; recover: () => void;
}) {
  const [reference, setReference] = useState(current);
  const [values, setValues] = useState(current.values);
  const [open, setOpen] = useState<"history" | "compare" | "confirm" | null>(null);
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const id = useId();
  const stale = conflict || current.version !== reference.version;
  const ready = !busy && !pending && !refreshing;
  const changedThresholds = thresholds.filter(([key]) => current.values[key] !== reference.values[key]);
  const changedSeverities = components.filter(([key]) => current.values.severity[key] !== reference.values.severity[key]);

  function validation() {
    const parsed = operationPolicy.safeParse(values);
    if (!parsed.success) return "Informe limites inteiros de 1 a 2.592.000.";
    if (linkedThresholds.some(([warning, critical]) => values[warning] > values[critical]))
      return "O limite crítico precisa ser maior ou igual ao limite de atenção correspondente.";
    return "";
  }
  async function confirm() {
    if (!ready || stale || validation()) return;
    setOpen(null);
    const confirmed = await send({
      action: "configure", environment, incidentId: null, expectedVersion: reference.version,
      policy: values, idempotencyKey: crypto.randomUUID(),
    });
    if (confirmed) close();
  }

  return <RecordDrawer title="Limites e severidades" kicker={"Política técnica · " + environmentLabels[environment]}
    headingIcon="settings" popupClassName="hca-technical-sheet hca-guide-topic-sheet" busy={busy}
    restoreFocusTo={opener} restoreFocusFallbackRef={fallback} exitDialog uncertainOutcome={pending}
    onClose={close} hasUnsavedChanges={dirty} footer={requestClose => <>
      <ActionButton onClick={requestClose} disabled={busy}>Voltar</ActionButton>
      {pending ? <ActionButton variant="primary" onClick={recover} disabled={busy}><Icon name="search" />Conferir decisão</ActionButton> :
        stale ? <ActionButton variant="primary" disabled={!ready || current.version === reference.version} onClick={() => setOpen("compare")}>
          <Icon name="history" />Conferir atualização
        </ActionButton> : <ActionButton form={id} type="submit" variant="primary" disabled={!ready}>Revisar política</ActionButton>}
    </>}>
    <form id={id} className="hca-form" onSubmit={event => {
      event.preventDefault();
      if (!ready || stale) return;
      const issue = validation();
      setError(issue);
      if (!issue) setOpen("confirm");
    }}>
      <DefinitionGrid items={[{ label: "Ambiente", value: environmentLabels[environment] }, { label: "Versão da política", value: reference.version }]} />
      <button type="button" className="hca-guide-row" disabled={pending || busy} onClick={() => setOpen("history")}>
        <span className="hca-guide-row-icon"><Icon name="history" /></span>
        <span className="hca-guide-row-label"><strong>Histórico das políticas</strong><small>Consultar as versões preservadas</small></span>
        <Icon name="chevron" width={16} />
      </button>
      {stale && <Notice>A política vigente mudou. Sua proposta está preservada nesta tela.
        {current.version === reference.version && <ActionButton compact disabled={pending || busy} onClick={reload}>Consultar política novamente</ActionButton>}
      </Notice>}
      <details className="hca-technical-disclosure" open>
        <summary>Prazos e quantidades<Icon name="down" width={16} /></summary>
        <fieldset className="hca-technical-policy-grid" disabled={!ready || stale}>
          <legend className="sr-only">Prazos e quantidades</legend>
          {thresholds.map(([key, label]) => <FormField key={key} label={label}>
            <TextInput type="number" inputMode="numeric" required min={1} max={2592000} step={1}
              value={Number.isFinite(values[key]) ? values[key] : ""}
              onInvalid={event => { const section = event.currentTarget.closest("details"); if (section) section.open = true; }}
              onChange={event => { const number = event.currentTarget.valueAsNumber; setValues(previous => ({ ...previous, [key]: number })); setDirty(true); }} />
          </FormField>)}
        </fieldset>
      </details>
      <details className="hca-technical-disclosure">
        <summary>Severidade por componente<Icon name="down" width={16} /></summary>
        <fieldset className="hca-technical-policy-grid" disabled={!ready || stale}>
          <legend className="sr-only">Severidade por componente</legend>
          {components.map(([key, label]) => <FormField key={key} label={"Severidade padrão: " + label}>
            <SelectField value={values.severity[key]} onChange={event => {
              const severity = event.target.value as "warning" | "critical";
              setValues(previous => ({ ...previous, severity: { ...previous.severity, [key]: severity } })); setDirty(true);
            }}>
              <option value="warning">Atenção</option><option value="critical">Crítico</option>
            </SelectField>
          </FormField>)}
        </fieldset>
      </details>
      <p className="hca-field-hint">Os limites de atividade, fila, emissão e cópia usam segundos. A política orienta a observação técnica.</p>
      {error && <Notice error>{error}</Notice>}
    </form>
    {open === "history" && <TechnicalHistory environment={environment} incidentId={null} close={() => setOpen(null)} />}
    {open === "compare" && <Dialog open title="Política técnica atualizada" headingIcon="history" onClose={() => setOpen(null)}
      footer={<>
        <ActionButton onClick={() => setOpen(null)}>Voltar</ActionButton>
        <ActionButton variant="primary" disabled={!ready} onClick={() => {
          setValues(previous => {
            const updated = { ...previous, severity: { ...previous.severity } };
            for (const [key] of changedThresholds) if (previous[key] === reference.values[key]) updated[key] = current.values[key];
            for (const [key] of changedSeverities) if (previous.severity[key] === reference.values.severity[key]) updated.severity[key] = current.values.severity[key];
            return updated;
          });
          setReference(current); onAdopt(); setOpen(null); setError("");
        }}>Usar versão vigente como referência</ActionButton>
      </>}>
      <div className="hca-form">
        <DefinitionGrid items={[{ label: "Versão conferida", value: reference.version }, { label: "Versão vigente", value: current.version }]} />
        {changedThresholds.map(([key, label]) => <PolicyDifference key={key} label={label} previous={reference.values[key]} current={current.values[key]} proposed={values[key]} />)}
        {changedSeverities.map(([key, label]) => <PolicyDifference key={key} label={label}
          previous={severityLabel(reference.values.severity[key])} current={severityLabel(current.values.severity[key])} proposed={severityLabel(values.severity[key])} />)}
        <p className="hca-field-hint">Os campos editados ficam na proposta. Os demais recebem os valores vigentes após a adoção.</p>
      </div>
    </Dialog>}
    {open === "confirm" && ready && !stale && <Dialog open title="Aplicar esta política técnica?" headingIcon="settings" onClose={() => setOpen(null)}
      footer={<><ActionButton onClick={() => setOpen(null)}>Voltar</ActionButton>
        <ActionButton variant="primary" onClick={() => void confirm()}>Confirmar política</ActionButton></>}>
      <DefinitionGrid items={[{ label: "Ambiente", value: environmentLabels[environment] }, { label: "Versão atual", value: reference.version }]} />
      <p className="hca-field-hint">A nova versão ficará disponível no histórico de políticas deste ambiente.</p>
    </Dialog>}
  </RecordDrawer>;
}

function severityLabel(value: "warning" | "critical") {
  return value === "critical" ? "Crítico" : "Atenção";
}

function PolicyDifference({ label, previous, current, proposed }: { label: string; previous: string | number; current: string | number; proposed: string | number }) {
  return <section className="hca-technical-comparison">
    <h3>{label}</h3>
    <DefinitionGrid items={[{ label: "Valor conferido", value: previous }, { label: "Valor vigente", value: current },
      { label: "Sua proposta", value: Number.isNaN(proposed) ? "Por preencher" : proposed, wide: true }]} />
  </section>;
}
