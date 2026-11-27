"use client";

import { Tabs } from "@base-ui/react/tabs";
import { useCallback, useId, useState } from "react";
import { RelatedDocumentBody } from "@/components/documents/related-document";
import { RecordDrawer } from "@/components/forms/record-drawer";
import { ActionButton, ActionLink, DefinitionGrid, FormField, TextAreaField, TextInput } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { Dialog } from "@/components/ui/overlays";
import { Notice, type WorkspaceContext } from "@/components/workspace";
import { can } from "@/lib/client/capabilities";
import { formatBrazilDate } from "@/lib/receipt";
import { useScopedRead } from "@/lib/use-scoped-read";
import { consumptionStateLabels } from "@/lib/consumption/follow-up";
import { formatQuantity } from "@/lib/quantity";
import { contingencyProcesses, parseContingencyReferences, storedContingencyContent, type ContingencyCommand, type ContingencyDossier, type ContingencyReference } from "@/lib/validation/contingency";
import type { ConsumptionReport } from "@/types/consumption";
import { ContingencyAttribution, ContingencyFacts } from "./contingency-facts";

type Mode = "link" | "clarify";
type Panel = "picker" | "record" | "comparison" | "current" | "workflow";
export type DecisionConflict = "dossier" | "reference" | "evidence" | "incompatible";
export type ContingencyDecisionInput =
  | Pick<Extract<ContingencyCommand, { action: "link_existing" }>, "action" | "reason" | "targetId" | "targetVersion">
  | Pick<Extract<ContingencyCommand, { action: "needs_clarification" }>, "action" | "reason" | "targetId">;

const workflows = {
  REQ: { path: "/fichas/req", capability: "req.create", label: "requisição" },
  COM: { path: "/fichas/com", capability: "com.create", label: "compra da família" },
  ENT: { path: "/fichas/ent", capability: "ent.create", label: "entrega de materiais" },
  RETURN: { path: "/fichas/devolucao", capability: "ent.create", label: "devolução de materiais" },
  BAL: { path: "/fichas/bal", capability: "bal.read", label: "balanço" },
  CONSUMPTION_FAMILY: { path: "/consumo", capability: "consumption.report", label: "consumo" },
  CONSUMPTION_TEAM: { path: "/consumo", capability: "consumption.report", label: "consumo" },
} satisfies Record<ContingencyDossier["process"], { path: string; capability: string; label: string }>;

export function ContingencyDecision({
  context, dossier, current, currentError, currentLoading, conflict, opener, busy, pending,
  onClose, onRecover, onReload, onAdopt, onResolveConflict, onConfirm,
}: {
  context: WorkspaceContext;
  dossier: ContingencyDossier;
  current: ContingencyDossier;
  currentError: string;
  currentLoading: boolean;
  conflict: DecisionConflict | null;
  opener: HTMLElement;
  busy: boolean;
  pending: boolean;
  onClose: () => void;
  onRecover: () => void;
  onReload: () => void;
  onAdopt: (dossier: ContingencyDossier) => void;
  onResolveConflict: () => void;
  onConfirm: (decision: ContingencyDecisionInput) => Promise<void>;
}) {
  const [mode, setMode] = useState<Mode>("link");
  const [reason, setReason] = useState({ link: "", clarify: "" });
  const [target, setTarget] = useState<ContingencyReference | null>(null);
  const [panel, setPanel] = useState<Panel | null>(null);
  const formId = useId();
  const independent = current.canReview;
  const stale = current.revision !== dossier.revision;
  const evidence = current.pendingEvidence || conflict === "evidence";
  const referenceChanged = conflict === "reference" || conflict === "incompatible";
  const linked = current.state === "linked";
  const refreshing = currentLoading || Boolean(currentError);
  const locked = busy || pending || refreshing || !independent || linked || stale || conflict === "dossier";
  const workflow = workflows[dossier.process];
  const mayOpenWorkflow = can(context, workflow.capability);
  const queryHref = workflow.path + "?" + new URLSearchParams({ careRecipientId: dossier.patientId });
  const openPanel = !busy && !pending && panel;
  const confirmationTarget = openPanel === "comparison" && !referenceChanged && !evidence && !stale && conflict !== "dossier"
    ? target : null;

  function confirm() {
    if (locked || reason[mode].trim().length < 3) return;
    if (mode === "clarify") {
      void onConfirm({ action: "needs_clarification", targetId: null, reason: reason.clarify });
    } else if (target && !referenceChanged && !evidence) {
      setPanel(null);
      void onConfirm({ action: "link_existing", targetId: target.id, targetVersion: target.version, reason: reason.link });
    }
  }

  return <RecordDrawer title="Conferir os fatos" kicker="Contingência física" headingIcon="checklist"
    popupClassName={confirmationTarget ? "hca-guide-topic-sheet hca-contingency-editor hca-contingency-editor-under-confirmation" : "hca-guide-topic-sheet hca-contingency-editor"}
    restoreFocusTo={opener} onClose={onClose}
    busy={busy} uncertainOutcome={pending} exitDialog hasUnsavedChanges={Boolean(reason.link || reason.clarify || target)}
    footer={requestClose => <>
      <ActionButton onClick={requestClose} disabled={busy}>Voltar</ActionButton>
      {pending ? <ActionButton variant="primary" onClick={onRecover} disabled={busy}><Icon name="search" />Conferir resultado</ActionButton> :
        <ActionButton variant="primary" type="submit" form={formId} disabled={locked || (mode === "link" && (!target || evidence || referenceChanged))}>
          <Icon name={mode === "link" ? "link" : "comment"} />
          {mode === "link" ? "Revisar vinculação" : "Solicitar esclarecimento"}
        </ActionButton>}
    </>}>
    <div className="hca-form">
      <DefinitionGrid className="hca-contingency-summary" items={[
        { label: "Declaração", value: dossier.content.knownReference ?? dossier.id },
        { label: "Quem declarou", value: dossier.actorName },
        { label: "Quem confere", value: context.fullName },
        { label: "Revisão", value: dossier.revision },
      ]} />
      <div className="hca-contingency-lead">
        <span className="hca-guide-row-icon"><Icon name="note" /></span>
        <div><h3>Fato a conferir</h3><p className="whitespace-pre-wrap wrap-break-word">{dossier.content.fact}</p></div>
      </div>
      {!independent && !linked && <Notice>A conferência exige outra pessoa autorizada. Quem declarou ou complementou este fato pode consultar o dossiê.</Notice>}
      {linked && <Notice>O dossiê já está vinculado. Consulte o registro oficial e o histórico.</Notice>}
      {currentError && <Notice error>{currentError}<ActionButton compact onClick={onReload}>Consultar dossiê novamente</ActionButton></Notice>}
      {(stale || conflict === "dossier") && independent && !linked && <button type="button" className="hca-guide-row" disabled={refreshing || pending || !stale} onClick={() => setPanel("current")}>
        <span className="hca-guide-row-icon"><Icon name="history" /></span>
        <span className="hca-guide-row-label"><strong>Dossiê atualizado</strong><small>Confira os atos acrescentados antes de decidir</small></span>
        <Icon name="chevron" width={16} />
      </button>}
      {independent && !linked && <form id={formId} className="hca-form" onSubmit={event => {
        event.preventDefault();
        if (locked || reason[mode].trim().length < 3) return;
        if (mode === "clarify") confirm();
        else if (target && !evidence && !referenceChanged) setPanel("comparison");
      }}>
        <Tabs.Root value={mode} onValueChange={value => { setMode(value as Mode); setPanel(null); }}>
          <Tabs.List aria-label="Decisão de conferência" className="hca-document-tab-list">
            <Tabs.Tab value="link" className="hca-document-tab" disabled={pending}>Vincular registro</Tabs.Tab>
            <Tabs.Tab value="clarify" className="hca-document-tab" disabled={pending}>Pedir esclarecimento</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="link" className="hca-form">
            {evidence && <Notice>
              <strong>Evidência aguardando confirmação</strong>
              <p>Quem enviou a evidência pode conferir o envio no dossiê. Atualize a situação depois da confirmação.</p>
              <ActionButton compact disabled={refreshing || pending} onClick={onReload}>Atualizar evidências</ActionButton>
            </Notice>}
            {referenceChanged && <Notice error>{conflict === "reference"
              ? "A revisão do registro digital mudou. Escolha novamente após conferir."
              : "A referência selecionada não está disponível para este paciente e processo."}</Notice>}
            <button type="button" className="hca-guide-row" disabled={pending || refreshing} onClick={() => setPanel("picker")}>
              <span className="hca-guide-row-icon"><Icon name="link" /></span>
              <span className="hca-guide-row-label">
                <strong>{target?.label ?? "Selecionar referência digital"}</strong>
                <small>{target ? "Revisão " + target.version : "Buscar no mesmo paciente e processo"}</small>
              </span>
              <Icon name="chevron" width={16} />
            </button>
            {target && !referenceChanged && <ActionButton compact disabled={pending || refreshing} onClick={() => setPanel("record")}><Icon name="eye" />Consultar o registro</ActionButton>}
            <FormField label="Justificativa da vinculação" required helpText="Registre o que foi confrontado para associar os fatos.">
              <TextAreaField required minLength={3} maxLength={2000} disabled={pending} value={reason.link} onChange={event => setReason({ ...reason, link: event.target.value })} />
            </FormField>
            <p className="hca-contingency-hint"><Icon name="info" width={16} />A associação preserva estoque, recebimento e ciência nos fluxos próprios.</p>
          </Tabs.Panel>
          <Tabs.Panel value="clarify" className="hca-form">
            <FormField label="O que precisa ser esclarecido?" required helpText="O pedido fica no histórico do dossiê.">
              <TextAreaField required minLength={3} maxLength={2000} disabled={pending} value={reason.clarify} onChange={event => setReason({ ...reason, clarify: event.target.value })} />
            </FormField>
          </Tabs.Panel>
        </Tabs.Root>
      </form>}
    </div>
    {openPanel === "picker" && <ReferencePicker dossier={dossier} previous={referenceChanged ? target : null}
      onClose={() => setPanel(null)} onPick={row => { setTarget(row); onResolveConflict(); setPanel(null); }}
      onWorkflow={mayOpenWorkflow ? () => setPanel("workflow") : undefined} />}
    {openPanel === "workflow" && <Dialog open title={"Consultar fluxo de " + workflow.label} kicker={contingencyProcesses[dossier.process]} headingIcon="file"
      onClose={() => setPanel("picker")} footer={<>
        <ActionButton onClick={() => setPanel("picker")}>Voltar à conferência</ActionButton>
        <ActionLink variant="primary" href={queryHref} target="_blank" rel="noreferrer">Abrir fluxo em outra aba<Icon name="external" /></ActionLink>
      </>}>
      <p>Use a tela do processo para registrar o ato, se necessário. Volte a esta aba e escolha o registro concluído.</p>
    </Dialog>}
    {openPanel === "current" && <Dialog open title="Confira a revisão atual do dossiê" headingIcon="history" onClose={() => setPanel(null)}
      footer={<>
        <ActionButton onClick={() => setPanel(null)}>Voltar</ActionButton>
        <ActionButton variant="primary" disabled={refreshing || !independent || linked || !stale} onClick={() => {
          onAdopt(current); setTarget(null); setPanel(null);
        }}>Usar revisão atual</ActionButton>
      </>}>
      <div className="hca-form">
        <DefinitionGrid items={[{ label: "Revisão conferida", value: dossier.revision }, { label: "Revisão atual", value: current.revision }]} />
        {current.events.filter(event => event.sequence >= dossier.revision).map(event => <article className="hca-contingency-editor-card hca-form" key={event.id}>
          <ContingencyAttribution name={event.actorName} role={event.actorRole} at={event.recordedAt} />
          {event.action === "supplement" ? <ContingencyFacts value={storedContingencyContent.parse(event.body)} scope={event.id} /> :
            <p className="whitespace-pre-wrap wrap-break-word">{String(event.body.reason ?? "")}</p>}
        </article>)}
        <p className="hca-contingency-hint">Confira a justificativa e escolha novamente o registro digital com base nos fatos atuais.</p>
      </div>
    </Dialog>}
    {confirmationTarget && <Dialog open title="Vincular esta referência?" headingIcon="info" showNestedBackdrop
      popupClassName="hca-contingency-link-confirmation" onClose={() => setPanel(null)}
      footer={<>
        <ActionButton onClick={() => setPanel(null)}>Voltar</ActionButton>
        <ActionButton variant="primary" disabled={locked} onClick={confirm}><Icon name="check" />Confirmar vínculo</ActionButton>
      </>}>
      <DefinitionGrid items={[
        { label: "Declaração", value: dossier.content.knownReference ?? dossier.id },
        { label: "Registro digital", value: confirmationTarget.label },
        { label: "Quem confere", value: context.fullName },
        { label: "Revisão do registro", value: confirmationTarget.version },
        { label: "Justificativa", value: reason.link, wide: true },
      ]} />
      <p className="hca-contingency-hint"><Icon name="info" width={16} />O vínculo preserva os dois registros, sem repetir estoque, recebimento ou ciência.</p>
    </Dialog>}
    {openPanel === "record" && target && <Dialog open title={target.label} kicker="Registro digital" headingIcon="file" onClose={() => setPanel(null)}
      footer={<ActionButton onClick={() => setPanel(null)}><Icon name="back" />Voltar à conferência</ActionButton>}>
      {target.kind === "consumption" ? <ConsumptionReference target={target} dossier={dossier} /> :
        <RelatedDocumentBody id={target.id} type={dossier.process === "RETURN" ? "ENT" : dossier.process as "REQ" | "COM" | "ENT" | "BAL"}
          patientId={dossier.patientId} title={target.label} onClose={() => setPanel(null)} />}
    </Dialog>}
  </RecordDrawer>;
}

function ReferencePicker({ dossier, previous, onClose, onPick, onWorkflow }: {
  dossier: ContingencyDossier;
  previous: ContingencyReference | null;
  onClose: () => void;
  onPick: (row: ContingencyReference) => void;
  onWorkflow?: () => void;
}) {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const { patientId, process } = dossier;
  const decode = useCallback((value: unknown) => parseContingencyReferences((value as { data: unknown }).data, patientId, process, page), [patientId, process, page]);
  const refs = useScopedRead("/api/contingencies?" + new URLSearchParams({ careRecipientId: patientId, process, view: "references", query, page: String(page) }), "", decode);
  const data = !refs.loading && !refs.error ? refs.data : null;
  return <Dialog open title="Selecionar referência digital" headingIcon="search" onClose={onClose}
    footer={<>
      <ActionButton onClick={onClose}>Voltar</ActionButton>
      {onWorkflow && <ActionButton onClick={onWorkflow}>Consultar fluxo próprio</ActionButton>}
    </>}>
    <div className="hca-form">
      <form className="hca-contingency-search" onSubmit={event => {
        event.preventDefault();
        if (input.trim() === query && page === 0) refs.refresh();
        else { setQuery(input.trim()); setPage(0); }
      }}>
        <TextInput aria-label="Buscar por código ou descrição" placeholder="Buscar por código ou descrição" maxLength={200} value={input} onChange={event => setInput(event.target.value)} />
        <ActionButton type="submit" aria-label="Buscar registros existentes"><Icon name="search" /></ActionButton>
      </form>
      {previous && <Notice>Referência conferida antes da atualização. {previous.label} · revisão {previous.version}.</Notice>}
      {refs.loading && <p role="status">Consultando registros digitais…</p>}
      {refs.error && !refs.loading && <Notice error>{refs.error}<ActionButton compact onClick={refs.refresh}>Tentar novamente</ActionButton></Notice>}
      {data?.data.map(row => <button key={row.id} type="button" className="hca-guide-row" onClick={() => onPick(row)}>
        <span className="hca-guide-row-icon"><Icon name="file" /></span>
        <span className="hca-guide-row-label"><strong>{row.label}</strong><small>{formatBrazilDate(row.recordedAt)} · revisão {row.version}</small></span>
        <Icon name="chevron" width={16} />
      </button>)}
      {data?.total === 0 && <div className="hca-contingency-empty"><Icon name="search" />
        <h3>Registro digital não encontrado</h3>
        <p>{query ? "Ajuste a busca para conferir as referências deste paciente." : "Se o ato ainda precisa ser registrado, use o fluxo do processo e depois volte ao dossiê."}</p>
      </div>}
      {data && data.total > 25 && <div className="hca-toolbar hca-contingency-pages">
        <ActionButton compact disabled={page === 0} onClick={() => setPage(value => value - 1)}>Referências anteriores</ActionButton>
        <span>Página {page + 1}</span>
        <ActionButton compact disabled={(page + 1) * 25 >= data.total} onClick={() => setPage(value => value + 1)}>Próximas referências</ActionButton>
      </div>}
    </div>
  </Dialog>;
}

function ConsumptionReference({ target, dossier }: { target: ContingencyReference; dossier: ContingencyDossier }) {
  const { patientId, process } = dossier;
  const location = process === "CONSUMPTION_FAMILY" ? "FAMILY" : "CARE_TEAM";
  const decode = useCallback((value: unknown) => {
    const { data } = value as { data: ConsumptionReport };
    if (data.id !== target.id || data.care_recipient_id !== patientId || data.location !== location)
      throw new Error("O registro consultado não pertence a este paciente e processo.");
    return data;
  }, [target.id, patientId, location]);
  const read = useScopedRead("/api/consumption/" + target.id, patientId, decode);
  const data = !read.loading && !read.error ? read.data : null;
  if (!data) return read.loading ? <p role="status">Consultando registro…</p> : <Notice error>{read.error}</Notice>;
  return <div className="hca-form">
    <DefinitionGrid items={[
      { label: "Situação", value: consumptionStateLabels[data.status] },
      { label: "Revisão atual", value: data.version },
      { label: "Quem registrou", value: data.reported_name ?? "Nome não informado" },
      { label: "Data do registro", value: formatBrazilDate(data.created_at) },
    ]} />
    <p className="whitespace-pre-wrap wrap-break-word">{data.body}</p>
    {data.current_lines.map(line => <p key={line.productId}>{line.name ?? line.productId} · {line.quantity === null ? "Quantidade desconhecida" : formatQuantity(line.quantity, line.unit)}</p>)}
  </div>;
}
