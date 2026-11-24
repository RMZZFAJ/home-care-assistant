"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { z } from "zod";
import { ApiError, api, can, type WorkspaceContext } from "@/components/workspace";
import { ActionButton, ActionLink, LoadingIndicator, Pill } from "@/components/ui/controls";
import { FeedbackBanner } from "@/components/ui/feedback";
import { Icon, type IconName } from "@/components/ui/icon";
import { Dialog } from "@/components/ui/overlays";
import { useOperationActivity } from "@/components/ui/operation-activity";
import { DocumentOperationFailureDialog, operationRecoveryLimit } from "@/components/documents/document-operation-failure-dialog";
import { useLiveRevision } from "@/lib/use-live-revision";
import {
  residenceAdministrationSnapshot, residenceIdentificationResult,
  type ResidenceAdministrationSnapshot, type ResidenceIdentificationResult, type ResidenceIdentity,
} from "@/lib/validation/residence-administration";
import { administrationAreas } from "./administration-navigation";
import { ResidenceIdentification } from "./residence-identification";
import "../guides/guides.css";
import "./residence-administration.css";

const endpoint = "/api/admin/residence";
const pendingSchema = z.strictObject({ key: z.uuid(), retries: z.number().int().min(0).max(operationRecoveryLimit) });
type Pending = z.infer<typeof pendingSchema>;
type Editor = { source: ResidenceAdministrationSnapshot; identity: ResidenceIdentity; review: boolean };
type Failure = { reason: unknown; uncertain: boolean; reference: string };

function readPending(storage: string) {
  try { return pendingSchema.safeParse(JSON.parse(sessionStorage.getItem(storage) ?? "null")).data ?? null; }
  catch { return null; }
}

function storePending(storage: string, pending: Pending | null) {
  try {
    if (pending) sessionStorage.setItem(storage, JSON.stringify(pending));
    else sessionStorage.removeItem(storage);
  } catch { /* The current session can still consult the attempt in memory. */ }
}

function ResidenceSection({ title, children }: { title: string; children: ReactNode }) {
  return <section className="hca-residence-admin-section"><header><h2>{title}</h2></header><div>{children}</div></section>;
}

function ResidenceRow({ icon, title, details, badge }: { icon: IconName; title: string; details: string; badge?: string }) {
  return <>
    <span className="hca-guide-row-icon"><Icon name={icon} width={21} height={21} /></span>
    <span className="hca-guide-row-label"><strong>{title}</strong><small>{details}</small>
      {badge ? <Pill tone="warning">{badge}</Pill> : null}
    </span>
    <Icon name="chevron" width={15} height={15} />
  </>;
}

export function ResidenceAdministrationUnavailable() {
  return <section className="hca-residence-admin-denied" aria-labelledby="residence-admin-denied">
    <span className="hca-residence-admin-lock"><Icon name="lock" width={29} height={29} /></span>
    <div><p className="eyebrow">Administração</p><h2 id="residence-admin-denied">Administração indisponível</h2></div>
    <p>Seu vínculo atual não permite administrar esta residência.</p>
    <p className="hca-residence-admin-note"><Icon name="shield" />As informações da residência permanecem protegidas.</p>
    <ActionLink href="/" variant="primary">Ver acesso disponível</ActionLink>
  </section>;
}

export function ResidenceAdministration({ context, initialEdit }: { context: WorkspaceContext; initialEdit: boolean }) {
  const globalMode = context.activeContext?.mode === "global" && context.globalAdministrationAllowed === true;
  const patient = context.patient;
  const patientId = patient?.id;
  const manages = globalMode || can(context, "access.manage");
  const path = patientId ? "&careRecipientId=" + patientId : "";
  const newResidence = "/preparar-residencia?from=administration" + (patientId ? "&returnPatient=" + patientId : "");
  const storage = `hca:residence-identification:${context.userId}:${globalMode ? "global" : "patient"}:${patientId}`;
  const [snapshot, setSnapshot] = useState<ResidenceAdministrationSnapshot | null>(null);
  const [readError, setReadError] = useState(false);
  const [revision, setRevision] = useState(0);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [outcome, setOutcome] = useState<ResidenceIdentificationResult | null>(null);
  const restoredRef = useRef(false);
  const runningRef = useRef(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const live = useLiveRevision();
  useOperationActivity(busy, { title: "Conferindo a identificação da residência" });

  useEffect(() => {
    if (!manages || !patientId) return;
    const controller = new AbortController();
    void api<unknown>(endpoint + "?patientId=" + patientId, undefined, controller.signal).then(value => {
      if (controller.signal.aborted) return;
      const result = residenceAdministrationSnapshot.parse(value);
      if (result.patientId !== patientId) throw new Error("A consulta mudou de residência.");
      setSnapshot(result);
      setReadError(false);
      if (!restoredRef.current) {
        const saved = readPending(storage);
        restoredRef.current = true;
        setPending(saved);
        if (initialEdit && !saved) setEditor({ source: result, identity: result.identity, review: false });
      }
    }).catch(reason => {
      if (controller.signal.aborted) return;
      setSnapshot(null);
      setReadError(true);
      if (reason instanceof ApiError && [401, 403, 404].includes(reason.status)) setEditor(null);
    });
    return () => controller.abort();
  }, [manages, patientId, storage, revision, live, initialEdit]);

  function reload() { setRevision(value => value + 1); }

  async function submit(recover: boolean) {
    if (!patientId || runningRef.current) return;
    const reference = recover ? readPending(storage) ?? pending : null;
    if (recover ? !reference || reference.retries >= operationRecoveryLimit : !editor?.review || pending || readPending(storage)) return;
    const attempt = reference ? { ...reference, retries: reference.retries + 1 } : { key: crypto.randomUUID(), retries: 0 };
    const packet = { patientId, key: attempt.key };
    const command = recover || !editor ? { ...packet, action: "recover" } : {
      ...packet, action: "save", version: editor.source.version, before: editor.source.identity, identity: editor.identity,
    };
    runningRef.current = true;
    setBusy(true);
    setFailure(null);
    storePending(storage, attempt);
    setPending(attempt);
    try {
      const result = residenceIdentificationResult.parse(await api<unknown>(endpoint, command));
      storePending(storage, null);
      setPending(null);
      setEditor(null);
      setOutcome(result);
      reload();
      if (result.state === "applied") void context.refresh();
    } catch (reason) {
      const uncertain = recover || !(reason instanceof ApiError) || reason.status === 0 || reason.status === 408 || reason.status >= 500;
      if (!uncertain) {
        storePending(storage, null);
        setPending(null);
        if (reason.status === 409) { setEditor(null); reload(); }
        else setEditor(current => current && { ...current, review: false });
      } else setEditor(null);
      setFailure({ reason, uncertain, reference: attempt.key });
    } finally {
      runningRef.current = false;
      setBusy(false);
    }
  }

  const name = snapshot?.identity.displayName ?? patient?.display_name;
  const active = snapshot?.identity.active ?? patient?.is_active !== false;
  const summary = snapshot ? `${snapshot.activeMembers} ${snapshot.activeMembers === 1 ? "vínculo ativo" : "vínculos ativos"} · ${snapshot.pendingInvitations} ${snapshot.pendingInvitations === 1 ? "convite pendente" : "convites pendentes"}` : "Acompanhe a equipe e os convites";
  const areas = administrationAreas(context);
  const organization = manages || areas.some(area => area.section === "catalog");
  const other = areas.filter(area => ["audit", "import", "notifications"].includes(area.section));
  const row = (href: string, details: Parameters<typeof ResidenceRow>[0]) =>
    <Link key={href} className="hca-guide-row" href={href} prefetch={false}><ResidenceRow {...details} /></Link>;
  const areaLink = (section: string, details: Parameters<typeof ResidenceRow>[0]) =>
    areas.some(area => area.section === section) ? row(`/admin?section=${section}${path}`, details) : null;

  return <div className="hca-residence-admin">
    {globalMode && patient ? <div className="hca-residence-admin-scope"><Icon name="shield" />
      <span><strong>Administração global</strong><small>Residência selecionada · sem atuação local nesta sessão</small></span>
    </div> : null}
    {patient ? <section className="hca-residence-admin-hero" aria-label="Residência selecionada">
      <span className="hca-guide-row-icon"><Icon name="home" width={25} height={25} /></span>
      <span className="hca-guide-row-label"><strong>{name}</strong><small>Paciente · residência {active ? "ativa" : "inativa"}</small></span>
      <Pill tone={active ? "success" : "neutral"}>{active ? "Ativa" : "Inativa"}</Pill>
    </section> : null}
    {readError ? <FeedbackBanner tone="error">Não foi possível consultar a identificação e os totais da residência. <ActionButton onClick={reload}>Atualizar consulta</ActionButton></FeedbackBanner> : null}
    {pending ? <FeedbackBanner tone="warning">
      A última alteração de identificação ainda precisa de confirmação.
      <ActionButton disabled={busy} onClick={() => setFailure({ reason: null, uncertain: true, reference: pending.key })}>Conferir resultado</ActionButton>
    </FeedbackBanner> : null}
    <nav aria-label="Áreas administrativas" className="hca-residence-admin">
      {patient && organization ? <ResidenceSection title="Organização">
        {manages ? <button type="button" className="hca-guide-row" ref={triggerRef} disabled={!snapshot || busy || Boolean(pending)}
          onClick={() => snapshot && setEditor({ source: snapshot, identity: snapshot.identity, review: false })}>
          <ResidenceRow icon="home" title="Identificação da residência" details="Nome e situação do cadastro" />
        </button> : null}
        {areaLink("memberships", { icon: "users", title: "Pessoas e convites", details: summary, badge: snapshot?.pendingInvitations ? `${snapshot.pendingInvitations} ${snapshot.pendingInvitations === 1 ? "pendente" : "pendentes"}` : undefined })}
        {areaLink("catalog", { icon: "stock", title: "Catálogo de materiais", details: "Nomes, unidades e apresentações" })}
        {manages && !snapshot && !readError ? <LoadingIndicator label="Consultando a administração da residência" /> : null}
      </ResidenceSection> : null}
      {patient && manages ? <ResidenceSection title="Regras e controle">
        {row(`/configuracoes?area=permissions${path}`, { icon: "shield", title: "Permissões", details: "Funções e exceções de cada pessoa" })}
        {row(`/configuracoes?area=rules${path}`, { icon: "bell", title: "Regras e destinatários", details: "Ciência, lembretes, avisos e alertas" })}
        {row(`/configuracoes?area=people${path}#propostas`, { icon: "checklist", title: "Propostas para conferir", details: snapshot === null ? "Acompanhe as alterações e suas decisões" : snapshot.pendingProposals === 1 ? "1 alteração aguardando decisão local" : `${snapshot.pendingProposals} alterações aguardando decisão local`, badge: snapshot?.pendingProposals ? String(snapshot.pendingProposals) : undefined })}
      </ResidenceSection> : null}
      {globalMode ? <ResidenceSection title="Organização global">
        {areaLink("profiles", { icon: "users", title: "Contas globais", details: "Privilégios da conta, separados dos vínculos locais" })}
        {row(newResidence, { icon: "plus", title: "Preparar nova residência", details: "Cadastrar a identificação e a estrutura inicial" })}
        {areaLink("operations", { icon: "history", title: "Central técnica", details: "Incidentes, observações e políticas por ambiente" })}
      </ResidenceSection> : null}
      {other.length ? <ResidenceSection title="Outros controles">{other.map(area =>
        row(`/admin?section=${area.section}${path}`, { icon: area.icon, title: area.title, details: area.description }))}</ResidenceSection> : null}
    </nav>
    <p className="hca-residence-admin-note"><Icon name="info" />Os registros de cuidado e as movimentações ficam nos seus próprios acompanhamentos.</p>
    {editor && !busy && !failure && !pending ? <ResidenceIdentification identity={editor.identity} initial={editor.source.identity}
      review={editor.review} globalMode={globalMode} returnFocus={triggerRef}
      onChange={identity => setEditor({ ...editor, identity })} onReview={identity => setEditor({ ...editor, identity, review: true })}
      onBack={() => setEditor({ ...editor, review: false })} onClose={() => setEditor(null)} onConfirm={() => void submit(false)} /> : null}
    {failure ? <DocumentOperationFailureDialog title={failure.uncertain ? "Não foi possível confirmar o resultado" : "Não foi possível salvar a identificação"}
      outcome={failure.uncertain ? "uncertain" : "rejected"} cause={failure.reason}
      description={failure.uncertain ? "Confira a mesma tentativa antes de alterar a identificação novamente." :
        failure.reason instanceof ApiError && failure.reason.status === 409 ? "A identificação ou as regras da residência mudaram. Abra a versão atual para revisar novamente." :
          "A alteração não foi gravada. Confira os dados e o acesso à residência."}
      operation="Salvar identificação da residência" fallbackCode="RESIDENCIA_IDENTIFICACAO_NAO_CONFIRMADA"
      attempts={pending?.retries ?? 0} attemptReference={failure.reference}
      guidance="A referência identifica a tentativa que você confirmou."
      exhaustedMessage={pending?.retries === operationRecoveryLimit ? "Copie os detalhes e avise o responsável pelo sistema." : undefined}
      onClose={() => setFailure(null)} closeLabel={editor ? "Voltar ao preenchimento" : "Voltar"} finalFocus={triggerRef}
      action={failure.uncertain && pending && pending.retries < operationRecoveryLimit ? { label: "Conferir resultado", onClick: () => void submit(true) } : undefined} /> : null}
    {outcome ? <Dialog open success={outcome.state === "applied" || outcome.state === "pending"} headingIcon="info"
      title={{ applied: "Identificação atualizada", pending: "Proposta registrada", rejected: "Proposta recusada", closed: "Tentativa encerrada sem alteração" }[outcome.state]}
      subtitle={{ applied: "As novas consultas exibem a identificação confirmada.", pending: "A identificação aguarda a decisão de outro administrador da residência.", rejected: "A decisão local foi registrada. Esta proposta não alterou o cadastro.", closed: "A consulta confirmou que esta tentativa não alterou a identificação." }[outcome.state]}
      onClose={() => setOutcome(null)} finalFocus={triggerRef} footer={<ActionButton variant="primary" onClick={() => setOutcome(null)}>Concluir</ActionButton>}>
      {outcome.state === "pending" ? <ActionLink href={`/configuracoes?area=people${path}#propostas`}>Acompanhar propostas</ActionLink> : null}
    </Dialog> : null}
  </div>;
}
