"use client";

import { useCallback, useRef, useState } from "react";
import { DocumentOperationFailureDialog, operationRecoveryLimit } from "@/components/documents/document-operation-failure-dialog";
import { ActionButton, ActionLink, DefinitionGrid, FormField, Pill, SelectField } from "@/components/ui/controls";
import { Icon, type IconName } from "@/components/ui/icon";
import { Dialog } from "@/components/ui/overlays";
import { useOperationActivity } from "@/components/ui/operation-activity";
import { Notice } from "@/components/workspace";
import { environmentLabels, incidentLabels, operationLabels, operationsDiagnostics, type Incident, type OperationComponent, type OperationEnvironment, type OperationsCommand } from "@/lib/operations/contracts";
import { formatBrazilDate } from "@/lib/receipt";
import { useScopedRead } from "@/lib/use-scoped-read";
import { RecoveryRunbook } from "./recovery-runbook";
import { stateLabels } from "./technical-history";
import { TechnicalEvents } from "./technical-events";
import { TechnicalIncident } from "./technical-incident";
import { TechnicalNotifications } from "./technical-notifications";
import { TechnicalPolicy } from "./technical-policy";
import { TechnicalTabs } from "./technical-tabs";
import { readTechnicalAttempt, useTechnicalCommand } from "./use-technical-command";
import "../guides/guides.css";
import "./operations.css";

const componentIcons: Record<OperationComponent, IconName> = {
  application: "home", database: "box", worker: "clock", outbox: "bell", push: "phone", signature: "file",
  integrity: "shield", backup: "archive", recovery: "history", security: "lock", legacy: "calendar",
};
const componentOrder: OperationComponent[] = [
  "application", "database", "outbox", "signature", "backup", "recovery", "worker", "push", "integrity", "security", "legacy",
];
const observationLabels = { attention: "Requer atenção", unobserved: "Sem observação", observed: "Atividade observada" };
const operationTitles = { acknowledge: "Acompanhamento registrado", resolve: "Incidente encerrado", configure: "Política técnica atualizada" };
const operationDescriptions = {
  acknowledge: "O acompanhamento ficou registrado no histórico do incidente.",
  resolve: "O motivo e o responsável ficaram registrados no histórico técnico.",
  configure: "A nova versão ficou registrada no histórico das políticas deste ambiente.",
};
class TechnicalResponseError extends Error {}

export function OperationsConsole({ actorId }: { actorId: string }) {
  const [environment, setEnvironment] = useState<OperationEnvironment>(() => readTechnicalAttempt(actorId)?.environment ?? "shared_database");
  const [state, setState] = useState("active");
  const [page, setPage] = useState(1);
  const [editor, setEditor] = useState<{ opener: HTMLElement; incident?: Incident } | null>(null);
  const [conflict, setConflict] = useState<OperationsCommand | null>(null);
  const [readAttempts, setReadAttempts] = useState(0);
  const [dismissedRead, setDismissedRead] = useState<unknown>(null);
  const refreshRef = useRef<HTMLButtonElement>(null);
  const decode = useCallback((value: unknown) => {
    const response = operationsDiagnostics.safeParse((value as { data?: unknown } | null)?.data);
    if (!response.success || response.data.environment !== environment || response.data.page !== page)
      throw new TechnicalResponseError("Resposta técnica sem confirmação reconhecível para este ambiente e página.");
    return response.data;
  }, [environment, page]);
  const query = new URLSearchParams({ environment, page: String(page), state });
  const read = useScopedRead("/api/operations?" + query, "", decode);
  const command = useTechnicalCommand(actorId, read.refresh, packet => { setConflict(packet); read.refresh(); });
  const { busy, pending, result, failure } = command;
  const data = read.errorCause instanceof TechnicalResponseError ? null : read.data;
  const unavailable = read.loading || Boolean(read.error);
  const locked = busy || Boolean(pending);
  useOperationActivity(read.loading && !result && !failure && !editor, { title: "Consultando observações técnicas" });

  function refresh() {
    if (busy || read.loading) return;
    setReadAttempts(0);
    read.refresh();
  }
  function selectEnvironment(next: OperationEnvironment) {
    setEnvironment(next);
    setPage(1);
    setReadAttempts(0);
  }
  function closeEditor() {
    setEditor(null);
    setConflict(null);
  }
  function closeResult() {
    if (result?.confirmed) closeEditor();
    command.closeResult();
    requestAnimationFrame(() => refreshRef.current?.focus());
  }

  return <section aria-label="Central técnica" className="hca-operations hca-form">
    <section className="ui-card hca-technical-scope hca-form">
      <FormField label="Ambiente técnico"><SelectField value={environment} disabled={locked || Boolean(editor)} onChange={event => selectEnvironment(event.target.value as OperationEnvironment)}>
        {Object.entries(environmentLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </SelectField></FormField>
      <p className="hca-technical-scope-hint hca-field-hint"><Icon name="shield" width={15} />Dados técnicos do ambiente. Dados do paciente exigem vínculo local autorizado.</p>
    </section>
    {pending && !editor && <section className="ui-card hca-technical-scope hca-form">
      <h3>Há uma decisão técnica a conferir</h3>
      <p>Consulte a tentativa em {environmentLabels[pending.environment]} antes de registrar outra decisão.</p>
      <ActionButton onClick={() => void command.recover()} disabled={busy}><Icon name="search" />Conferir decisão</ActionButton>
    </section>}
    {read.error && <Notice error>{data
      ? "A última consulta deste ambiente continua disponível. Atualize o painel para decidir com a situação atual."
      : read.error}</Notice>}
    {data && <TechnicalTabs>{{
      overview: <>
        <section className="ui-card hca-technical-list" aria-label="Observações recentes">
          <header className="hca-technical-cardhead"><h3>Observações recentes</h3></header>
          <ul className="hca-observation-grid" aria-label="Componentes observados">
            {componentOrder.flatMap(key => {
              const component = data.components.find(row => row.component === key);
              return component ? [<li className="hca-observation-card" key={key} data-state={component.state}>
                <span className="hca-guide-row-icon"><Icon name={componentIcons[key]} width={17} /></span>
                <h4>{operationLabels[key]}</h4>
                <strong>{observationLabels[component.state]}</strong>
                <small>{component.observedAt ? formatBrazilDate(component.observedAt) : "Sem registro recente"}</small>
              </li>] : [];
            })}
          </ul>
          <p className="hca-technical-card-hint">Atividade observada indica uma ocorrência registrada. Consulta em {formatBrazilDate(data.consultedAt)}.</p>
        </section>
        <section className="ui-card hca-technical-list" aria-label="Incidentes técnicos">
          <header className="hca-technical-cardhead"><h3>Incidentes · {data.total}</h3>
            <FormField label="Incidentes"><SelectField value={state} disabled={locked} onChange={event => { setState(event.target.value); setPage(1); }}>
              <option value="active">Ativos</option><option value="resolved">Encerrados</option><option value="all">Todos</option>
            </SelectField></FormField>
          </header>
          {!data.data.length && <p className="hca-technical-card-hint">Nenhum incidente encontrado neste filtro.</p>}
          {data.data.map(incident => <article key={incident.id} aria-label={incidentLabels[incident.code]} data-technical-incident={incident.id}>
            <button type="button" className="hca-guide-row" aria-label={"Investigar incidente — " + incidentLabels[incident.code]}
              disabled={locked || unavailable} onClick={event => setEditor({ opener: event.currentTarget, incident })}>
              <span className="hca-guide-row-icon"><Icon name="alert" /></span>
              <span className="hca-guide-row-label"><strong>{incidentLabels[incident.code]}</strong>
                <small>{operationLabels[incident.component]} · {incident.occurrences} {incident.occurrences === 1 ? "ocorrência" : "ocorrências"}</small>
              </span>
              <Pill tone={incident.state === "resolved" ? "success" : incident.severity === "critical" ? "danger" : "warning"}>{stateLabels[incident.state]}</Pill>
              <Icon name="chevron" width={16} />
            </button>
          </article>)}
          {data.total > data.pageSize && <div className="hca-toolbar hca-technical-pagination">
            <ActionButton compact disabled={page === 1 || unavailable || locked} onClick={() => setPage(value => value - 1)}>Incidentes anteriores</ActionButton>
            <span>Página {page}</span>
            <ActionButton compact disabled={page * data.pageSize >= data.total || unavailable || locked} onClick={() => setPage(value => value + 1)}>Próximos incidentes</ActionButton>
          </div>}
        </section>
        <section className="ui-card hca-technical-list" aria-label="Administração técnica">
          <header className="hca-technical-cardhead"><h3>Administração técnica</h3></header>
          <button type="button" className="hca-guide-row" disabled={locked || unavailable} onClick={event => setEditor({ opener: event.currentTarget })}>
            <span className="hca-guide-row-icon"><Icon name="settings" /></span>
            <span className="hca-guide-row-label"><strong>Limites e severidades</strong><small>Regras de observação deste ambiente</small></span>
            <Icon name="chevron" width={16} />
          </button>
          <ActionLink href="/preparar-residencia" className="hca-guide-row hca-technical-route">
            <span className="hca-guide-row-icon"><Icon name="home" /></span>
            <span className="hca-guide-row-label"><strong>Criar nova residência</strong><small>Dados essenciais e revisão antes de criar</small></span>
            <Icon name="chevron" width={16} />
          </ActionLink>
          <ActionLink href="/admin?section=profiles" className="hca-guide-row hca-technical-route">
            <span className="hca-guide-row-icon"><Icon name="users" /></span>
            <span className="hca-guide-row-label"><strong>Consultar contas globais</strong><small>Identidades e administração global</small></span>
            <Icon name="chevron" width={16} />
          </ActionLink>
        </section>
      </>,
      continuity: !unavailable ? <RecoveryRunbook key={environment} data={data} /> : <p>Consulte novamente para ver as evidências deste ambiente.</p>,
      events: <>
        {environment === "shared_database" ? <TechnicalNotifications /> :
          <section className="ui-card hca-operations-card hca-form">
            <h3>Tentativas de comunicação</h3>
            <div className="hca-guide-reading"><span><Icon name="bell" /></span><div>
              <strong>Esta fonte está no banco compartilhado</strong>
              <p>Os registros de envio pertencem ao banco. A origem na aplicação fica indeterminada quando o registro não a informa.</p>
            </div></div>
            <ActionButton variant="primary" disabled={locked || Boolean(editor)} onClick={() => selectEnvironment("shared_database")}>
              Consultar banco compartilhado<Icon name="arrow" />
            </ActionButton>
          </section>}
        {!unavailable && <TechnicalEvents key={environment} data={data} />}
      </>,
    }}</TechnicalTabs>}
    <footer className="hca-technical-footer">
      <ActionButton ref={refreshRef} aria-disabled={read.loading || busy} onClick={refresh}><Icon name="refresh" />Atualizar monitoramento</ActionButton>
    </footer>
    {editor?.incident && <TechnicalIncident initial={editor.incident} environment={environment}
      busy={busy} pending={Boolean(pending)} conflictKey={conflict?.incidentId === editor.incident.id ? conflict.idempotencyKey : ""}
      onAdopt={() => setConflict(null)} send={command.send} recover={() => void command.recover()} close={closeEditor}
      opener={editor.opener} fallback={refreshRef} />}
    {editor && !editor.incident && data && <TechnicalPolicy current={data.policy} environment={environment}
      busy={busy} pending={Boolean(pending)} refreshing={unavailable} conflict={conflict?.action === "configure"}
      reload={refresh} onAdopt={() => setConflict(null)} send={command.send} recover={() => void command.recover()} close={closeEditor}
      opener={editor.opener} fallback={refreshRef} />}
    {failure && !busy && <DocumentOperationFailureDialog {...failure}
      title={failure.outcome === "uncertain" ? "Resultado da decisão técnica a conferir" : "Não foi possível registrar a decisão técnica"}
      operation="Registrar decisão técnica" fallbackCode="OPERACAO_TECNICA" attempts={pending?.attempts ?? 0}
      attemptReference={pending?.idempotencyKey} onClose={command.closeFailure} closeLabel="Voltar"
      guidance={pending ? "Confira o comprovante da mesma tentativa antes de decidir novamente." : "Confira os dados da operação e a orientação do suporte."}
      action={pending && pending.attempts < operationRecoveryLimit ? { label: "Conferir resultado", onClick: () => void command.recover() } : undefined}
      exhaustedMessage={pending && pending.attempts >= operationRecoveryLimit ? "Copie os detalhes e avise o responsável pelo sistema." : undefined} />}
    {result && <Dialog open success={result.confirmed} headingIcon={result.confirmed ? undefined : "info"}
      title={result.confirmed ? (result.noop ? "Situação técnica confirmada" : operationTitles[result.attempt.action]) : "Tentativa encerrada sem execução"}
      subtitle={result.recovered && result.confirmed ? "O comprovante da mesma decisão foi localizado." : undefined}
      onClose={closeResult} footer={<ActionButton variant="primary" onClick={closeResult}>Voltar à central técnica</ActionButton>}>
      <div className="hca-form">
        <p>{result.confirmed ? (result.noop ? "O incidente já estava nessa situação." : operationDescriptions[result.attempt.action])
          : "A decisão ficou sem registro. O sistema encerrou esta chave para impedir execução tardia."}</p>
        <DefinitionGrid items={[
          { label: "Ambiente", value: environmentLabels[result.attempt.environment] },
          { label: "Referência", value: result.attempt.incidentId ?? result.attempt.idempotencyKey, wide: true },
        ]} />
      </div>
    </Dialog>}
    {!editor && !result && !failure && !busy && read.error && read.errorCause !== dismissedRead && !read.loading &&
      <DocumentOperationFailureDialog outcome="rejected" title="Não foi possível consultar o ambiente técnico"
        description={read.error} cause={read.errorCause} operation="Consultar central técnica" fallbackCode="CENTRAL_TECNICA_CONSULTA"
        attempts={readAttempts} closeLabel="Voltar" finalFocus={refreshRef} onClose={() => setDismissedRead(read.errorCause)}
        action={readAttempts < operationRecoveryLimit ? { label: "Consultar novamente", onClick: () => { setReadAttempts(value => value + 1); read.refresh(); } } : undefined}
        exhaustedMessage={readAttempts >= operationRecoveryLimit ? "Copie os detalhes e avise o responsável pelo sistema." : undefined} />}
  </section>;
}
