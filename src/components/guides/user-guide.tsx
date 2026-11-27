"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { api, ApiError, can, Notice, Workspace, type WorkspaceContext } from "@/components/workspace";
import { useWorkspaceState, roleLabel } from "@/components/layout/workspace-context";
import { useCommandIntent } from "@/lib/client/use-command-intent";
import { guideProgressConfirmed, guideConfigurationConfirmed, parseGuide, type GuideCommand, type GuideContext } from "@/lib/validation/guides";
import { guideTopicsFor, type GuideTopic } from "@/lib/guide-content";
import { mayPrepareLocally } from "@/lib/validation/local-preparation";
import { ActionButton, DefinitionGrid, Pill } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { Dialog } from "@/components/ui/overlays";
import { useOperationActivity } from "@/components/ui/operation-activity";
import { DocumentOperationFailureDialog, operationRecoveryLimit } from "@/components/documents/document-operation-failure-dialog";
import { GuideTopicPanel } from "./guide-topic-panel";
import "./guides.css";

function guideScope(context: WorkspaceContext | null | undefined) {
  return JSON.stringify([context?.userId, context?.activeContext?.mode, context?.patient?.id, context?.patient?.role]);
}

function useGuide(context: WorkspaceContext | null | undefined, active: boolean) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ key: number; data: GuideContext } | null>(null);
  const [failure, setFailure] = useState<{ key: number; reason: unknown } | null>(null);
  const ready = active && Boolean(context);
  const role = context?.activeContext?.mode === "global" ? "global" : context?.patient?.role ?? "general";
  const patientId = context?.activeContext?.mode === "global" ? null : context?.patient?.id ?? null;

  useEffect(() => {
    if (!ready) return;
    const controller = new AbortController();
    void api<{ data: unknown }>("/api/guides", undefined, controller.signal)
      .then(result => parseGuide(result.data, { role, patientId }))
      .then(data => {
        if (!controller.signal.aborted) setResult({ key: attempt, data });
      })
      .catch(reason => {
        if (!controller.signal.aborted) setFailure({ key: attempt, reason });
      });
    return () => controller.abort();
  }, [attempt, ready, role, patientId]);

  const error = failure?.key === attempt ? failure.reason : null;
  const data = result?.key === attempt && !error ? result.data : null;
  return {
    context, key: attempt, data, error, loading: ready && !data && !error,
    refresh: () => setAttempt(value => value + 1),
    adopt: (next: GuideContext) => { setResult({ key: attempt, data: next }); setFailure(null); },
  };
}

export function GuideOnboarding() {
  const { value } = useWorkspaceState();
  return <GuideReader key={guideScope(value)} context={value} onboarding />;
}

function GuideReader({ context, onboarding, standalone, active = true }: {
  context: WorkspaceContext | null | undefined; onboarding?: boolean; standalone?: boolean; active?: boolean;
}) {
  const guide = useGuide(context, active);
  if (!onboarding) return <GuideHome guide={guide} standalone={standalone} active={active} />;
  if (!guide.data || !guide.data.showOnFirstAccess || guide.data.progress.status !== null) return null;
  return <OnboardingOffer data={guide.data} patientName={context?.patient?.display_name} />;
}

function OnboardingOffer({ data, patientName }: { data: GuideContext; patientName?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [failure, setFailure] = useState<unknown>(null);
  const [showFailure, setShowFailure] = useState(false);
  const [retries, setRetries] = useState(0);
  const command = useCommandIntent<GuideCommand, { data: GuideContext }>((result, intent) =>
    confirmedGuideProgress(result, intent, data));
  useOperationActivity(command.busy, { title: "Registrando a escolha de orientação" });

  async function choose(status?: "started" | "skipped") {
    setShowFailure(false);
    try {
      let saved: { data: GuideContext };
      if (!status) {
        setRetries(count => count + 1);
        saved = await command.recover();
      } else {
        saved = await command.send("/api/guides", {
          action: "progress", expectedScope: data.scope, expectedRevision: data.progress.revision,
          step: 0, status, idempotencyKey: crypto.randomUUID(),
        });
      }
      setDismissed(true);
      if (saved.data.progress.status === "started") router.push("/guias");
    } catch (reason) { setFailure(reason); setShowFailure(true); }
  }

  if (dismissed) return null;
  return <div className="workspace-content hca-guide-onboarding">
    <section className="hca-guide-introduction" aria-label="Apresentação opcional">
      <h2 className="font-semibold">Conheça seu guia de tarefas</h2>
      <p>Encontre as orientações da sua função e consulte novamente quando precisar.</p>
      <div className="hca-toolbar">
        <ActionButton variant="primary" disabled={command.busy} onClick={() => command.uncertain ? setShowFailure(true) : setOpen(true)}>
          Conhecer o guia
        </ActionButton>
        <ActionButton disabled={command.busy} onClick={() => setDismissed(true)}>Fechar por agora</ActionButton>
      </div>
    </section>
    {open && !showFailure && !command.busy ? <GuidePresentation
      data={data} patientName={patientName} onClose={() => setOpen(false)}
      onSkip={() => void choose("skipped")} start={<ActionButton variant="primary" onClick={() => void choose("started")}>Conhecer o guia</ActionButton>} /> : null}
    {showFailure ? <GuideChangeFailure cause={failure} uncertain={command.uncertain}
      retries={retries} onRecover={() => void choose()} onClose={() => { setShowFailure(false); setOpen(false); }} /> : null}
  </div>;
}

export function GuidesPage() {
  return <Workspace title="Guias e ajuda" heading={context => <div className="page-heading">
    <div>
      <p className="eyebrow">Sua rotina</p>
      <h1>Guias e ajuda</h1>
      <p className="hca-guide-context">{context.patient?.display_name}</p>
    </div>
  </div>}>{() => <UserGuide standalone />}</Workspace>;
}

export function UserGuide({ standalone, active = true }: { standalone?: boolean; active?: boolean }) {
  const { value } = useWorkspaceState();
  return <GuideReader key={guideScope(value)} context={value} standalone={standalone} active={active} />;
}

type Task = ReturnType<typeof guideTopicsFor>[number];
type Progress = Extract<GuideCommand, { action: "progress" }>;

function GuideHome({ guide, standalone, active }: { guide: ReturnType<typeof useGuide>; standalone?: boolean; active: boolean }) {
  const { data, context } = guide;
  const queryTriggerRef = useRef<HTMLButtonElement>(null);
  const topicTriggerRef = useRef<HTMLButtonElement>(null);
  const pendingTaskRef = useRef<Task | null>(null);
  const focusAfterReadRef = useRef(false);
  const summaryRef = useRef<HTMLHeadingElement>(null);
  const [topic, setTopic] = useState<Task | null>(null);
  const [presentation, setPresentation] = useState(false);
  const [outcome, setOutcome] = useState<"completed" | "configured" | null>(null);
  const [failure, setFailure] = useState<unknown>(null);
  const [showFailure, setShowFailure] = useState(false);
  const [retries, setRetries] = useState(0);
  const [readRetries, setReadRetries] = useState(0);
  const [dismissedRead, setDismissedRead] = useState<number>();
  const command = useCommandIntent<GuideCommand, { data: unknown }>((result, intent) =>
    intent.action === "progress" ? confirmedGuideProgress(result, intent, data) : guideConfigurationConfirmed(result, intent));
  useOperationActivity(active && (command.busy || guide.loading), { title: command.busy ? "Confirmando a orientação" : "Consultando seu guia" });
  useEffect(() => {
    if (active && data && focusAfterReadRef.current) {
      focusAfterReadRef.current = false;
      summaryRef.current?.focus();
    }
  }, [active, data]);

  async function change(intent?: GuideCommand) {
    if (!data) return;
    setShowFailure(false);
    if (intent) setRetries(0);
    else setRetries(count => count + 1);
    try {
      const saved = await (intent ? command.send("/api/guides", intent) : command.recover());
      if ("progress" in (saved.data as object)) {
        const next = parseGuide(saved.data, data);
        guide.adopt(next);
        if (next.progress.status === "completed" && !pendingTaskRef.current) setOutcome("completed");
        setTopic(pendingTaskRef.current);
      } else {
        setOutcome("configured");
        guide.refresh();
      }
      pendingTaskRef.current = null;
      setPresentation(false);
    } catch (reason) {
      setFailure(reason);
      setShowFailure(true);
      if (reason instanceof ApiError && reason.status === 409 && intent) guide.refresh();
    }
  }

  function progress(status: Progress["status"], step: number, task: Task | null = null) {
    if (!data || command.busy || command.uncertain) return;
    pendingTaskRef.current = task;
    void change({
      action: "progress", expectedScope: data.scope, expectedRevision: data.progress.revision,
      step, status, idempotencyKey: crypto.randomUUID(),
    });
  }

  function openTask(task: Task, opener: HTMLButtonElement) {
    if (!data) return;
    topicTriggerRef.current = opener;
    if (data.progress.status === "completed" || data.progress.status === "started" && data.progress.step === task.index) {
      setTopic(task);
    } else {
      progress("started", task.index, task);
    }
  }

  function consult() {
    if (guide.loading || (guide.error && (readRetries >= operationRecoveryLimit || !isRecoverableRead(guide.error)))) return;
    setReadRetries(guide.error ? readRetries + 1 : 0);
    focusAfterReadRef.current = true;
    guide.refresh();
  }

  const global = data?.role === "global";
  const team = data?.role === "professional" || data?.role === "supervisor";
  const patientId = context?.patient?.id;
  const completed = data?.progress.status === "completed";
  const blocked = command.busy || command.uncertain;
  const tasks = data ? guideTopicsFor(data.role) : [];
  const taskLabel = global ? "Organização e suporte" : "O que você quer fazer?";
  const role = guideRoleLabel(data?.role);
  const scopePatient = data?.patientId && patientId === data.patientId ? context?.patient : null;
  const mayConsult = !guide.loading && Boolean(guide.error) && readRetries < operationRecoveryLimit && isRecoverableRead(guide.error);

  const taskDestination = topic?.topic.destination;
  const taskHref = taskDestination && (!taskDestination.anyCapability ||
    context && taskDestination.anyCapability.some(capability => can(context, capability)))
    ? guideTaskHref(taskDestination.href, data?.patientId ?? null) : undefined;

  if (!active) return null;
  return <section aria-label="Guia do seu perfil" className={standalone ? "hca-guide-home hca-guide-page" : "hca-guide-home"}>
    {!data ? <section className="ui-card">
      <h2>{guide.error ? "Guia indisponível" : "Guia por tarefa"}</h2>
      {guide.loading ? <p role="status">Consultando seu guia…</p> : mayConsult ? <p>Consulte novamente para carregar as orientações do perfil atual.</p> : <p>Confira seu vínculo ou informe o responsável pelo sistema.</p>}
      <ActionButton ref={queryTriggerRef} aria-disabled={!mayConsult} onClick={consult}>Consultar guia novamente</ActionButton>
    </section> : <>
      {!global ? <section className="ui-card hca-guide-summary">
        <div className="hca-guide-reading">
          <span><Icon name="help" /></span>
          <div><h2 ref={summaryRef} tabIndex={-1}>{team ? "Orientação para a equipe" : "Orientação para sua rotina"}</h2>
            <p>Abra o assunto que precisa e retorne à tarefa sem perder o ponto em que estava.</p></div>
        </div>
        <div className="hca-guide-meta">
          <Pill tone="info" className="hca-guide-role">{role}</Pill>
          <Pill tone={completed ? "success" : "neutral"}>{completed ? "Guia consultado" : "Consulta opcional"}</Pill>
        </div>
      </section> : <h2 ref={summaryRef} tabIndex={-1}>Administração global</h2>}
      <section className="ui-card hca-guide-card" aria-label={taskLabel}>
        <h2>{taskLabel}</h2>
        <nav aria-label="Assuntos do guia">
          {tasks.slice(0, 4).map(task => <TopicRow key={task.id} task={task} disabled={blocked} current={data.progress.status === "started" && data.progress.step === task.index} onOpen={openTask} />)}
        </nav>
        {tasks.length > 4 ? <details className="hca-guide-more">
          <summary>Outros assuntos</summary>
          {tasks.slice(4).map(task => <TopicRow key={task.id} task={task} disabled={blocked} current={data.progress.status === "started" && data.progress.step === task.index} onOpen={openTask} />)}
        </details> : null}
      </section>
      {context && scopePatient && (mayPrepareLocally(context) || can(context, "contingency.read")) ? <section className="ui-card hca-guide-card">
        <h2>Preparação e continuidade</h2>
        {mayPrepareLocally(context) ? <Link className="hca-guide-row" href={guideTaskHref("/preparacao-local", scopePatient.id)}>
          <RowContents icon="home" title="Preparação da residência" subtitle="Pessoas, materiais, estoque e rotina" />
        </Link> : null}
        {can(context, "contingency.read") ? <Link className="hca-guide-row" href={guideTaskHref("/contingencias", scopePatient.id)}>
          <RowContents icon="note" title="Contingência física" subtitle="Preservar e conferir um fato ocorrido fora do sistema" />
        </Link> : null}
      </section> : null}
      {global ? <p className="hca-operation-guidance"><Icon name="shield" />Para consultar dados de um paciente, selecione um vínculo local autorizado.</p> : null}
      {context && scopePatient && can(context, "access.manage") ? <section className="ui-card hca-guide-card">
        <h2>Guia no primeiro acesso</h2>
        <p>Apresentação inicial {data.showOnFirstAccess ? "habilitada" : "desabilitada"} neste paciente.</p>
        <ActionButton disabled={blocked} onClick={() => void change({
          action: "configure", careRecipientId: scopePatient.id,
          expectedRevision: data.configurationRevision, showOnFirstAccess: !data.showOnFirstAccess,
          idempotencyKey: crypto.randomUUID(),
        })}>{data.showOnFirstAccess ? "Desabilitar apresentação inicial" : "Habilitar apresentação inicial"}</ActionButton>
      </section> : null}
      <div className="hca-guide-actions">
        <ActionButton disabled={blocked} onClick={() => setPresentation(true)}><Icon name="help" />Rever apresentação</ActionButton>
        {!completed ? <ActionButton variant="primary" disabled={blocked} onClick={() => progress("completed", 5)}>
          <Icon name="check" />Concluir orientação
        </ActionButton> : null}
        {command.uncertain ? <ActionButton disabled={command.busy} onClick={() => setShowFailure(true)}>
          Consultar tentativa pendente
        </ActionButton> : null}
      </div>
    </>}
    {data && topic && !showFailure ? <GuideTopicPanel
      topic={topic.topic} href={taskHref} finalFocus={topicTriggerRef} onClose={() => setTopic(null)} /> : null}
    {data && presentation && !showFailure && !command.busy ? <GuidePresentation
      data={data} patientName={scopePatient?.display_name} onClose={() => setPresentation(false)}
      onSkip={() => completed ? setPresentation(false) : progress("skipped", data.progress.step)}
      start={<ActionButton variant="primary" onClick={() => data.progress.status ? setPresentation(false) : progress("started", 0)}>Conhecer o guia</ActionButton>} /> : null}
    {outcome ? <Dialog open success
      title={outcome === "completed" ? "Orientação concluída" : "Apresentação atualizada"}
      subtitle={outcome === "completed" ? "Você pode consultar estes assuntos novamente sempre que precisar." : "A preferência de apresentação foi registrada."}
      onClose={() => setOutcome(null)}
      footer={<ActionButton variant="primary" onClick={() => setOutcome(null)}>Concluir</ActionButton>}>
      {outcome === "completed" ? <p>O progresso do guia pertence à sua conta. Ciência, recebimentos e autorizações seguem seus próprios fluxos.</p> : null}
    </Dialog> : null}
    {showFailure ? <GuideChangeFailure cause={failure} uncertain={command.uncertain} retries={retries}
      onRecover={() => void change()} onClose={() => { setShowFailure(false); setPresentation(false); }} /> : null}
    {guide.error && dismissedRead !== guide.key && !showFailure && !outcome ? <DocumentOperationFailureDialog
      outcome="rejected" title="Não foi possível consultar o guia" description={guideMessage(guide.error)}
      cause={guide.error} operation="Consultar guia" fallbackCode="GUIA_CONSULTA_INDISPONIVEL" attempts={readRetries}
      action={mayConsult ? { label: "Consultar guia novamente", onClick: consult } : undefined}
      exhaustedMessage={readRetries >= operationRecoveryLimit ? "Copie os detalhes e avise o responsável pelo sistema." : undefined}
      onClose={() => setDismissedRead(guide.key)} closeLabel="Voltar ao guia" finalFocus={queryTriggerRef} /> : null}
  </section>;
}

function TopicRow({ task, disabled, current, onOpen }: {
  task: Task; disabled: boolean; current: boolean; onOpen: (task: Task, opener: HTMLButtonElement) => void;
}) {
  return <button type="button" className="hca-guide-row" disabled={disabled} aria-current={current ? "step" : undefined} onClick={event => onOpen(task, event.currentTarget)}>
    <RowContents {...task.topic} />
  </button>;
}

function RowContents({ title, subtitle, icon }: Pick<GuideTopic, "title" | "subtitle" | "icon">) {
  return <>
    <span className="hca-guide-row-icon"><Icon name={icon} width={18} height={18} /></span>
    <span className="hca-guide-row-label"><strong>{title}</strong><small>{subtitle}</small></span>
    <Icon name="chevron" width={16} height={16} />
  </>;
}

function GuidePresentation({ data, patientName, onClose, onSkip, start }: {
  data: GuideContext; patientName?: string; onClose: () => void; onSkip: () => void; start: ReactNode;
}) {
  return <Dialog open title="Conheça sua rotina no sistema" kicker="Boas-vindas" headingIcon="help" onClose={onClose}
    footer={<><ActionButton onClick={onSkip}>Pular apresentação</ActionButton>{start}</>}>
    <p>Um guia curto para encontrar as tarefas da sua função e entender como continuar se algo não sair como esperado.</p>
    <DefinitionGrid items={[
      ...(patientName ? [{ label: "Paciente", value: patientName }] : []),
      { label: "Função", value: guideRoleLabel(data.role) },
    ]} />
    <Notice>A apresentação é opcional. Você pode voltar a ela em Guias e ajuda.</Notice>
  </Dialog>;
}

function GuideChangeFailure({ cause, uncertain, retries, onClose, onRecover }: {
  cause: unknown; uncertain: boolean; retries: number; onClose: () => void; onRecover: () => void;
}) {
  return <DocumentOperationFailureDialog
    outcome={uncertain ? "uncertain" : "rejected"}
    title={uncertain ? "Orientação ainda sem confirmação" : "Não foi possível registrar a orientação"}
    description={uncertain ? "A resposta não confirmou o progresso ou a preferência." : guideMessage(cause)}
    cause={cause} operation="Registrar orientação" fallbackCode="GUIA_RESULTADO_INDISPONIVEL" attempts={retries}
    guidance={uncertain && retries < operationRecoveryLimit ? "Consulte o resultado da mesma tentativa." : undefined}
    exhaustedMessage={uncertain && retries >= operationRecoveryLimit ? "Copie os detalhes e avise o responsável pelo sistema." : undefined}
    action={uncertain && retries < operationRecoveryLimit ? { label: "Consultar resultado", onClick: onRecover } : undefined}
    onClose={onClose} closeLabel="Voltar ao guia" />;
}

const guideMessage = (reason: unknown) => reason instanceof Error ? reason.message : "A orientação está temporariamente indisponível.";
const isRecoverableRead = (reason: unknown) => !(reason instanceof ApiError) || reason.status === 0 || reason.status >= 500;
const guideRoleLabel = (role?: string) => role === "global" ? "Administração global" : !role || role === "general" ? "Orientações gerais" : roleLabel(role);

function confirmedGuideProgress(result: unknown, intent: GuideCommand, expected: GuideContext | null) {
  if (!expected || !guideProgressConfirmed(result, intent)) return false;
  const { data } = result as { data: GuideContext };
  return data.role === expected.role && data.patientId === expected.patientId;
}

function guideTaskHref(path: string, patient: string | null) {
  if (!patient) return path;
  const [pathname, query = ""] = path.split("?");
  const params = new URLSearchParams(query);
  params.set("careRecipientId", patient);
  return pathname + "?" + params;
}
