"use client";

import { useCallback, useState, type RefObject } from "react";
import { RecordDrawer } from "@/components/forms/record-drawer";
import { ActionButton, DefinitionGrid, FormField, Pill, SelectField } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { Dialog } from "@/components/ui/overlays";
import { Notice } from "@/components/workspace";
import { formatBrazilDate } from "@/lib/receipt";
import { environmentLabels, incidentLabels, operationIncident, operationLabels, type Incident, type OperationEnvironment, type OperationsCommand } from "@/lib/operations/contracts";
import { useScopedRead } from "@/lib/use-scoped-read";
import { reasonLabels, stateLabels, TechnicalHistory } from "./technical-history";

type Ack = Extract<OperationsCommand, { action: "acknowledge" }>["reason"];
type Resolve = Extract<OperationsCommand, { action: "resolve" }>["reason"];

export function TechnicalIncident({ initial, environment, busy, pending, conflictKey, onAdopt, send, recover, close, opener, fallback }: {
  initial: Incident; environment: OperationEnvironment; busy: boolean; pending: boolean; conflictKey: string;
  onAdopt: () => void; send: (packet: OperationsCommand) => Promise<boolean>; recover: () => void; close: () => void;
  opener: HTMLElement | null; fallback: RefObject<HTMLElement | null>;
}) {
  const [reviewed, setReviewed] = useState(initial);
  const [ack, setAck] = useState<Ack>("investigating");
  const [resolution, setResolution] = useState<Resolve>("corrected");
  const [open, setOpen] = useState<"history" | "compare" | "confirm" | null>(null);
  const decode = useCallback((value: unknown) => {
    const read = operationIncident.parse((value as { data: unknown }).data);
    if (read.environment !== environment || read.incident.id !== initial.id)
      throw new Error("A consulta retornou outro incidente ou ambiente.");
    return read.incident;
  }, [initial.id, environment]);
  const detail = useScopedRead("/api/operations?" + new URLSearchParams({ environment, incident: initial.id }), conflictKey, decode);
  const current = !detail.loading && !detail.error ? detail.data : null;
  const stale = Boolean(conflictKey || current && current.version !== reviewed.version);
  const disabled = busy || pending || !current || stale || reviewed.state === "resolved";
  const mayAcknowledge = reviewed.state === "open";
  const title = incidentLabels[reviewed.code];
  async function apply(action: "acknowledge" | "resolve") {
    if (disabled) return;
    setOpen(null);
    const base = { environment, incidentId: reviewed.id, expectedVersion: reviewed.version, idempotencyKey: crypto.randomUUID() };
    const confirmed = await send(action === "acknowledge"
      ? { ...base, action, reason: ack } : { ...base, action, reason: resolution });
    if (confirmed) close();
  }

  return <RecordDrawer title={title} kicker={"Incidente técnico · " + environmentLabels[environment]} headingIcon="alert"
    popupClassName="hca-technical-sheet hca-guide-topic-sheet" busy={busy} uncertainOutcome={pending}
    restoreFocusTo={opener} restoreFocusFallbackRef={fallback} onClose={close} exitDialog
    hasUnsavedChanges={ack !== "investigating" || resolution !== "corrected"}
    footer={requestClose => <>
      <ActionButton onClick={requestClose} disabled={busy}><Icon name="back" />Voltar</ActionButton>
      {pending ? <ActionButton variant="primary" onClick={recover} disabled={busy}><Icon name="search" />Conferir decisão</ActionButton> :
        stale ? <ActionButton variant="primary" disabled={!current || busy} onClick={() => setOpen("compare")}><Icon name="history" />Conferir atualização</ActionButton> :
        reviewed.state !== "resolved" && <ActionButton variant="primary" disabled={disabled} onClick={() => {
          if (mayAcknowledge) void apply("acknowledge");
          else setOpen("confirm");
        }}><Icon name="check" />{mayAcknowledge ? "Iniciar acompanhamento" : "Encerrar incidente técnico"}</ActionButton>}
    </>}>
    <div className="hca-form">
      <div className="hca-technical-sheet-state">
        <Pill tone={reviewed.state === "resolved" ? "success" : "warning"}>{stateLabels[reviewed.state]}</Pill>
        <span>Versão {reviewed.version}</span>
      </div>
      {detail.loading && <p role="status">Consultando o incidente…</p>}
      {detail.error && <Notice error>{detail.error}<ActionButton compact onClick={detail.refresh}>Consultar incidente novamente</ActionButton></Notice>}
      {stale && <button type="button" className="hca-guide-row" disabled={!current || pending} onClick={() => setOpen("compare")}>
        <span className="hca-guide-row-icon"><Icon name="history" /></span>
        <span className="hca-guide-row-label"><strong>Situação atualizada</strong><small>Compare antes de registrar outra decisão</small></span>
        <Icon name="chevron" width={16} />
      </button>}
      <DefinitionGrid items={[
        { label: "Componente", value: operationLabels[reviewed.component] },
        { label: "Severidade", value: reviewed.severity === "critical" ? "Crítico" : "Atenção" },
        { label: "Primeira observação", value: formatBrazilDate(reviewed.firstObservedAt) },
        { label: "Última observação", value: formatBrazilDate(reviewed.lastObservedAt) },
        { label: "Ocorrências", value: reviewed.occurrences },
        { label: "Contagem observada", value: reviewed.metricCount },
        { label: "Política de referência", value: reviewed.policyVersion },
        { label: "Referência técnica", value: reviewed.id, wide: true },
        ...(reviewed.correlationId ? [{ label: "Correlação", value: reviewed.correlationId, wide: true }] : []),
      ]} />
      <button type="button" className="hca-guide-row" onClick={() => setOpen("history")} disabled={busy || pending}>
        <span className="hca-guide-row-icon"><Icon name="history" /></span>
        <span className="hca-guide-row-label"><strong>Histórico do incidente</strong><small>Observações e decisões preservadas</small></span>
        <Icon name="chevron" width={16} />
      </button>
      {mayAcknowledge && <FormField label="Motivo do acompanhamento">
        <SelectField value={ack} disabled={disabled} onChange={event => setAck(event.target.value as Ack)}>
          <option value="investigating">{reasonLabels.investigating}</option>
          <option value="waiting_dependency">{reasonLabels.waiting_dependency}</option>
          <option value="contained">{reasonLabels.contained}</option>
        </SelectField>
      </FormField>}
      {reviewed.state === "acknowledged" && <ResolutionField value={resolution} disabled={disabled} onChange={setResolution} />}
      {mayAcknowledge && <details className="hca-technical-disclosure">
        <summary>Encerramento direto</summary>
        <div className="hca-form">
          <ResolutionField value={resolution} disabled={disabled} onChange={setResolution} />
          <ActionButton disabled={disabled} onClick={() => setOpen("confirm")}>Encerrar incidente técnico</ActionButton>
        </div>
      </details>}
      <p className="hca-field-hint">A decisão registra a revisão do suporte. A retomada da operação e eventuais novos envios seguem seus processos próprios.</p>
    </div>
    {open === "history" && <TechnicalHistory environment={environment} incidentId={reviewed.id} close={() => setOpen(null)} />}
    {open === "compare" && current && <Dialog open title="Situação atual do incidente" headingIcon="history"
      onClose={() => setOpen(null)} footer={<>
        <ActionButton onClick={() => setOpen(null)}>Voltar</ActionButton>
        <ActionButton variant="primary" onClick={() => { setReviewed(current); onAdopt(); setOpen(null); }}>Usar situação atual</ActionButton>
      </>}>
      <DefinitionGrid items={[
        { label: "Situação conferida", value: stateLabels[reviewed.state] }, { label: "Situação atual", value: stateLabels[current.state] },
        { label: "Versão conferida", value: reviewed.version }, { label: "Versão vigente", value: current.version },
        { label: "Ocorrências conferidas", value: reviewed.occurrences }, { label: "Ocorrências atuais", value: current.occurrences },
        { label: "Última observação atual", value: formatBrazilDate(current.lastObservedAt), wide: true },
      ]} />
      <p className="hca-field-hint">Confira o motivo escolhido antes de registrar a nova decisão.</p>
    </Dialog>}
    {open === "confirm" && !disabled && <Dialog open title="Encerrar este incidente?" headingIcon="alert" onClose={() => setOpen(null)}
      footer={<>
        <ActionButton onClick={() => setOpen(null)}>Voltar</ActionButton>
        <ActionButton variant="primary" onClick={() => void apply("resolve")}>Encerrar incidente</ActionButton>
      </>}>
      <DefinitionGrid items={[{ label: "Incidente", value: title }, { label: "Motivo", value: reasonLabels[resolution] }]} />
      <p className="hca-field-hint">O motivo e o responsável ficarão no histórico técnico.</p>
    </Dialog>}
  </RecordDrawer>;
}

function ResolutionField({ value, disabled, onChange }: { value: Resolve; disabled: boolean; onChange: (value: Resolve) => void }) {
  return <FormField label="Motivo do encerramento">
    <SelectField value={value} disabled={disabled} onChange={event => onChange(event.target.value as Resolve)}>
      <option value="corrected">{reasonLabels.corrected}</option>
      <option value="reviewed_history">{reasonLabels.reviewed_history}</option>
      <option value="false_alarm">{reasonLabels.false_alarm}</option>
    </SelectField>
  </FormField>;
}
