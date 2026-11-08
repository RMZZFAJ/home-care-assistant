"use client";

import { useState, type FormEvent } from "react";
import { buttonClass, inputClass, Notice, primaryClass } from "@/components/workspace";
import { useScopedRead } from "@/lib/use-scoped-read";
import { useCommandIntent } from "@/lib/client/use-command-intent";
import { formatBrazilDate } from "@/lib/receipt";
import { environmentLabels, incidentLabels, operationLabels, operationPolicy, operationsConfirmed, operationsDiagnostics, operationsHistory, type Diagnostics, type Incident, type OperationEnvironment, type OperationsCommand, type OperationsReceipt } from "@/lib/operations/contracts";
import type { z } from "zod";

const stateLabels = { open: "Aberto", acknowledged: "Em acompanhamento", resolved: "Encerrado" };
const actionLabels = { opened: "Aberto", observed: "Observação atualizada", acknowledged: "Acompanhamento iniciado", resolved: "Encerrado pelo suporte", recovered: "Condição deixou de ser detectada", configured: "Política configurada", escalated: "Severidade alterada" };
type History = z.infer<typeof operationsHistory>;

export function OperationsConsole() {
  const [environment, setEnvironment] = useState<OperationEnvironment>("shared_database");
  const [locked, setLocked] = useState(false);
  return <section aria-label="Monitoramento e suporte" className="space-y-5">
    <h2 className="font-semibold">Monitoramento e suporte</h2>
    <p>Observações internas e incidentes técnicos. Este painel não comprova disponibilidade externa e não autoriza operação real. Backup externo e monitor externo permanecem sem ativação.</p>
    <label className="block">Ambiente técnico<select className={inputClass} value={environment} disabled={locked} onChange={event => setEnvironment(event.target.value as OperationEnvironment)}>{Object.entries(environmentLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    <EnvironmentConsole key={environment} environment={environment} setLocked={setLocked} />
  </section>;
}

function EnvironmentConsole({ environment, setLocked }: { environment: OperationEnvironment; setLocked: (value: boolean) => void }) {
  const [page, setPage] = useState(1), [state, setState] = useState("active"), [history, setHistory] = useState<string | null>(null);
  const read = useScopedRead<{ data: Diagnostics }>(`/api/operations?environment=${environment}&page=${page}&state=${state}`);
  const command = useCommandIntent<OperationsCommand, OperationsReceipt>(operationsConfirmed);
  const [error, setError] = useState(""), [message, setMessage] = useState("");
  const parsed = read.data ? operationsDiagnostics.safeParse(read.data.data) : null;
  const busy = command.busy || command.uncertain, data = parsed?.success ? parsed.data : null;
  const readFailure = read.error || (parsed && !parsed.success ? "Resposta técnica sem confirmação reconhecível. Consulte novamente." : "");
  async function send(packet: OperationsCommand) {
    setError(""); setMessage(""); setLocked(true);
    try {
      await command.send("/api/operations", packet);
      setMessage("Alteração técnica confirmada. Nenhuma ciência ou operação do paciente foi registrada."); read.refresh(); setLocked(false);
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível confirmar a alteração.");
      // A server response below 500 is a definite refusal; a missing/5xx reply
      // keeps this environment bound until the same command is recovered.
      if (reason instanceof Error && "status" in reason && typeof reason.status === "number" && reason.status > 0 && reason.status < 500) { setLocked(false); read.refresh(); }
      return false;
    }
  }
  async function recover() {
    setError("");
    try { await command.recover(); setLocked(false); setMessage("Confirmação da mesma alteração recuperada."); read.refresh(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Confirmação ainda indisponível."); }
  }
  return <>
    <div className="hca-toolbar"><label>Incidentes<select className={inputClass} value={state} disabled={busy} onChange={event => { setState(event.target.value); setPage(1); }}><option value="active">Ativos</option><option value="resolved">Encerrados</option><option value="all">Todos</option></select></label><button type="button" className={buttonClass} disabled={read.loading || command.busy} onClick={read.refresh}>Atualizar monitoramento</button></div>
    {read.loading ? <p role="status">Consultando observações técnicas…</p> : null}
    {readFailure ? <Notice error>{readFailure}</Notice> : null}
    {read.error && data ? <p>Última consulta confirmada preservada. As alterações aguardam uma nova consulta válida.</p> : null}
    {error ? <Notice error>{error}</Notice> : null}{message ? <Notice>{message}</Notice> : null}
    {command.uncertain ? <Notice error>Resultado incerto. Preserve este ambiente e recupere a mesma tentativa antes de alterar outra condição. <button type="button" className={buttonClass} disabled={command.busy} onClick={() => void recover()}>Recuperar alteração técnica</button></Notice> : null}
    {data ? <>
      <p className="text-sm">Consulta: {formatBrazilDate(data.consultedAt)}. “Observado” indica atividade registrada; não comprova funcionamento contínuo. Componentes sem observação precisam de verificação.</p>
      <ul className="hca-compact-grid" aria-label="Componentes observados">{data.components.map(component => <li className="ui-card" key={component.component}><strong>{operationLabels[component.component]}</strong><p>{component.state === "attention" ? "Requer atenção" : component.state === "unobserved" ? "Sem observação" : "Atividade observada"}</p><p className="text-sm">{component.observedAt ? formatBrazilDate(component.observedAt) : "Nenhum registro de atividade"}</p></li>)}</ul>
      <section aria-label="Incidentes técnicos" className="space-y-3"><h3 className="font-semibold">Incidentes técnicos · {data.total}</h3>{!data.data.length ? <p>Nenhum incidente corresponde a este filtro.</p> : null}{data.data.map(incident => <IncidentCard key={incident.id} incident={incident} environment={environment} busy={busy || read.loading || Boolean(readFailure)} send={send} openHistory={() => setHistory(incident.id)} />)}
        <div className="hca-toolbar"><button type="button" className={buttonClass} disabled={page === 1 || read.loading || busy} onClick={() => setPage(value => value - 1)}>Incidentes anteriores</button><span>Página {page}</span><button type="button" className={buttonClass} disabled={page * data.pageSize >= data.total || read.loading || busy} onClick={() => setPage(value => value + 1)}>Próximos incidentes</button></div>
      </section>
      <details><summary>Limites e severidades por ambiente</summary><PolicyForm policy={data.policy} environment={environment} busy={busy || read.loading || Boolean(readFailure)} send={send} /><button type="button" className={buttonClass} onClick={() => setHistory("policy")}>Consultar histórico completo de políticas</button></details>
      <details><summary>Eventos técnicos recentes</summary><ul className="space-y-3">{data.events.map(event => <li key={event.id}>{formatBrazilDate(event.at)} · {operationLabels[event.component]} · {incidentLabels[event.code]}<p className="text-sm break-all">Correlação: {event.correlationId}</p></li>)}</ul>{!data.events.length ? <p>Nenhum evento persistido neste ambiente.</p> : null}</details>
    </> : null}
    {history ? <HistoryPanel key={history} environment={environment} incidentId={history === "policy" ? null : history} close={() => setHistory(null)} /> : null}
  </>;
}

function IncidentCard({ incident, environment, busy, send, openHistory }: { incident: Incident; environment: OperationEnvironment; busy: boolean; send: (packet: OperationsCommand) => Promise<boolean>; openHistory: () => void }) {
  const [ackReason, setAckReason] = useState<"investigating" | "waiting_dependency" | "contained">("investigating");
  const [resolveReason, setResolveReason] = useState<"corrected" | "reviewed_history" | "false_alarm">("corrected");
  const base = { environment, incidentId: incident.id, expectedVersion: incident.version };
  return <article className="ui-card space-y-3" aria-label={incidentLabels[incident.code]}><h4 className="font-semibold">{incidentLabels[incident.code]}</h4><p>{operationLabels[incident.component]} · {incident.severity === "critical" ? "Crítico" : "Atenção"} · {stateLabels[incident.state]} · versão {incident.version}</p><p>Primeira observação: {formatBrazilDate(incident.firstObservedAt)}. Última: {formatBrazilDate(incident.lastObservedAt)}. Ocorrências: {incident.occurrences}. Contagem: {incident.metricCount}.</p><p className="text-sm break-all">Referência técnica: {incident.id}{incident.correlationId ? ` · Correlação: ${incident.correlationId}` : ""}</p>
    {incident.state !== "resolved" ? <fieldset disabled={busy} className="space-y-3"><legend className="font-semibold">Acompanhamento técnico</legend>
      {incident.state === "open" ? <div className="hca-toolbar"><label>Motivo do acompanhamento<select className={inputClass} value={ackReason} onChange={event => setAckReason(event.target.value as typeof ackReason)}><option value="investigating">Em investigação</option><option value="waiting_dependency">Aguardando dependência</option><option value="contained">Condição contida</option></select></label><button type="button" className={buttonClass} onClick={() => void send({ ...base, action: "acknowledge", reason: ackReason, idempotencyKey: crypto.randomUUID() })}>Iniciar acompanhamento</button></div> : null}
      <div className="hca-toolbar"><label>Motivo do encerramento<select className={inputClass} value={resolveReason} onChange={event => setResolveReason(event.target.value as typeof resolveReason)}><option value="corrected">Correção conferida</option><option value="reviewed_history">Lacuna histórica revisada</option><option value="false_alarm">Alarme indevido conferido</option></select></label><button type="button" className={buttonClass} onClick={() => void send({ ...base, action: "resolve", reason: resolveReason, idempotencyKey: crypto.randomUUID() })}>Encerrar incidente técnico</button></div><p className="text-sm">Encerrar registra a revisão do suporte. Não reprocessa envios, recupera períodos nem comprova recuperação operacional.</p>
    </fieldset> : null}
    <button type="button" className={buttonClass} onClick={openHistory}>Histórico completo deste incidente</button>
  </article>;
}

const thresholdLabels = { heartbeatWarningSeconds: "Atividade: aviso (segundos)", heartbeatCriticalSeconds: "Atividade: crítico (segundos)", jobWarningSeconds: "Fila: aviso (segundos)", jobCriticalSeconds: "Fila: crítico (segundos)", pdfWarningSeconds: "PDF: aviso (segundos)", pdfCriticalSeconds: "PDF: crítico (segundos)", backupWarningSeconds: "Backup: aviso (segundos)", backupCriticalSeconds: "Backup: crítico (segundos)", securityWindowSeconds: "Segurança: janela (segundos)", securityWarningCount: "Segurança: recusas para aviso", securityCriticalCount: "Segurança: recusas para crítico" } as const;
function PolicyForm({ policy, environment, busy, send }: { policy: Diagnostics["policy"]; environment: OperationEnvironment; busy: boolean; send: (packet: OperationsCommand) => Promise<boolean> }) {
  const [values, setValues] = useState(policy.values), [error, setError] = useState("");
  const [referenceVersion, setReferenceVersion] = useState(policy.version);
  const conflict = referenceVersion !== policy.version;
  function submit(event: FormEvent) {
    event.preventDefault(); const parsed = operationPolicy.safeParse(values);
    if (!parsed.success) { setError("Preencha limites inteiros entre 1 e 2592000."); return; }
    if (conflict) { setError("Revise a política vigente antes de reenviar sua proposta preservada."); return; }
    setError(""); void send({ action: "configure", environment, incidentId: null, expectedVersion: referenceVersion, policy: parsed.data, idempotencyKey: crypto.randomUUID() }).then(confirmed => { if (confirmed) setReferenceVersion(referenceVersion + 1); });
  }
  return <form onSubmit={submit} className="my-4"><fieldset disabled={busy} className="space-y-4"><legend>Política técnica · referência {referenceVersion}</legend>{conflict ? <div className="ui-notice"><p>A política vigente mudou para a versão {policy.version}. Sua proposta foi preservada.</p><dl>{Object.entries(thresholdLabels).map(([key, label]) => <div key={key}><dt>{label} · vigente</dt><dd>{policy.values[key as keyof typeof thresholdLabels]}</dd></div>)}{Object.entries(operationLabels).map(([key, label]) => <div key={key}><dt>{label} · severidade vigente</dt><dd>{policy.values.severity[key as keyof typeof operationLabels] === "critical" ? "Crítico" : "Atenção"}</dd></div>)}</dl><button type="button" className={buttonClass} onClick={() => { setReferenceVersion(policy.version); setError(""); }}>Usar versão vigente como referência</button></div> : null}<div className="hca-compact-grid">{Object.entries(thresholdLabels).map(([key, label]) => <label key={key}>{label}<input className={inputClass} type="number" required min={1} max={2592000} step={1} value={Number.isFinite(values[key as keyof typeof thresholdLabels]) ? values[key as keyof typeof thresholdLabels] : ""} onChange={event => setValues(current => ({ ...current, [key]: event.target.valueAsNumber }))} /></label>)}</div><div className="hca-compact-grid">{Object.entries(operationLabels).map(([key, label]) => <label key={key}>Severidade padrão: {label}<select className={inputClass} value={values.severity[key as keyof typeof operationLabels]} onChange={event => setValues(current => ({ ...current, severity: { ...current.severity, [key]: event.target.value } }))}><option value="warning">Atenção</option><option value="critical">Crítico</option></select></label>)}</div><p>O limite crítico deve ser maior ou igual ao aviso. Uma nova política preserva a versão anterior e não comprova SLA.</p>{error ? <p role="alert">{error}</p> : null}<button type="submit" className={primaryClass} disabled={conflict}>Guardar política técnica</button></fieldset></form>;
}

function HistoryPanel({ environment, incidentId, close }: { environment: OperationEnvironment; incidentId: string | null; close: () => void }) {
  const [page, setPage] = useState(1);
  const read = useScopedRead<{ data: History }>(`/api/operations?environment=${environment}&history=${incidentId ? "incident&incident=" + incidentId : "policy"}&page=${page}`);
  const parsed = read.data ? operationsHistory.safeParse(read.data.data) : null, data = parsed?.success ? parsed.data : null;
  const failure = read.error || (parsed && !parsed.success ? "Histórico sem confirmação reconhecível. Consulte novamente." : "");
  return <section className="ui-card space-y-3" aria-label="Histórico técnico completo"><h3 className="font-semibold">{incidentId ? "Histórico do incidente" : "Histórico das políticas"}</h3><button type="button" className={buttonClass} onClick={close}>Fechar histórico técnico</button>{read.loading ? <p role="status">Consultando histórico…</p> : null}{failure ? <Notice error>{failure}<button type="button" className={buttonClass} onClick={read.refresh}>Consultar histórico novamente</button></Notice> : null}{data ? <><p>{data.total} registros · página {data.page}</p><ol className="space-y-3">{data.data.map(line => <li key={line.id}>{formatBrazilDate(line.at)} · {actionLabels[line.action]} · {line.operator === "system" ? "Sistema" : "Administrador global"}{line.version ? ` · versão ${line.version}` : ""}{line.reason ? ` · ${({ investigating: "Investigação", waiting_dependency: "Dependência pendente", contained: "Contido", corrected: "Correção conferida", reviewed_history: "Lacuna revisada", false_alarm: "Alarme indevido" })[line.reason]}` : ""}{line.policy ? <details><summary>Política preservada · versão {line.policyVersion}</summary><dl>{Object.entries(thresholdLabels).map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{line.policy![key as keyof typeof thresholdLabels]}</dd></div>)}{Object.entries(operationLabels).map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{line.policy!.severity[key as keyof typeof operationLabels] === "critical" ? "Crítico" : "Atenção"}</dd></div>)}</dl></details> : null}</li>)}</ol><div className="hca-toolbar"><button type="button" className={buttonClass} disabled={page === 1 || read.loading} onClick={() => setPage(value => value - 1)}>Histórico anterior</button><button type="button" className={buttonClass} disabled={page * data.pageSize >= data.total || read.loading} onClick={() => setPage(value => value + 1)}>Próximo histórico</button></div></> : null}</section>;
}
