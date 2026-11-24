"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ActionButton, DefinitionGrid, FormField, LoadingIndicator, Pill, SelectField, TextInput } from "@/components/ui/controls";
import { FeedbackBanner } from "@/components/ui/feedback";
import { Icon } from "@/components/ui/icon";
import { Dialog, Drawer } from "@/components/ui/overlays";
import { can, type WorkspaceContext } from "@/components/workspace";
import { governanceComparison, governanceFilterLabels, governanceKindLabels, governanceStatusLabels } from "@/lib/governance-presentation";
import { formatBrazilDate } from "@/lib/receipt";
import { useScopedRead } from "@/lib/use-scoped-read";
import { parseGovernanceListRead, type GovernanceProposal } from "@/lib/validation/governance-list";
import type { ProposalDecision } from "@/lib/validation/governance-proposal";
import { GovernanceProposalFeedback, useGovernanceProposalOperation } from "./governance-proposal-operation";
import "./residence-administration.css";

type Directory = Parameters<typeof governanceComparison>[1];
type Comparison = ReturnType<typeof governanceComparison>;

const groups = [
  { name: "Para decidir", statuses: ["pending"] },
  { name: "Aguardando aceite", statuses: ["awaiting_acceptance"] },
  { name: "Decisões registradas", statuses: ["applied", "rejected"] },
] as const;

function statusLabel(status: string) {
  return Object.hasOwn(governanceStatusLabels, status) ? governanceStatusLabels[status] : "Situação não reconhecida";
}

function proposalTitle(change: GovernanceProposal, comparison: Comparison) {
  const capability = change.kind === "capability" && comparison.supported
    ? comparison.rows.find(row => row.key === "capability")?.proposed : null;
  const title = capability || comparison.title;
  return change.subjectName ? title + " · " + change.subjectName : title;
}

function ProposalComparison({ comparison, currentOnly = false }: { comparison: Comparison; currentOnly?: boolean }) {
  return <div className="hca-form-stack">
    {comparison.rows.map(row => <div className="hca-proposal-comparison-row" key={row.key}>
      <h3>{row.label}</h3>
      <DefinitionGrid items={[
        { label: "Vigente agora", value: row.current, wide: currentOnly },
        ...(!currentOnly ? [{ label: "Proposta registrada", value: row.proposed }] : []),
      ]} />
    </div>)}
    {!comparison.supported ? <FeedbackBanner tone="warning">
      Esta proposta contém um tipo ou campo que esta versão não reconhece. Consulte a origem antes de aprovar.
    </FeedbackBanner> : null}
  </div>;
}

function currentSettingsLink(change: GovernanceProposal) {
  const params = new URLSearchParams({ careRecipientId: change.care_recipient_id });
  if (change.kind === "capability") {
    params.set("area", "permissions");
    if (typeof change.proposed.subjectUser === "string") params.set("person", change.proposed.subjectUser);
  } else if (change.kind === "notification_rule") params.set("area", "notifications");
  else if (change.kind === "membership") return "/admin?section=memberships&" + params;
  else if (change.kind === "administration") {
    const sections: Record<string, string> = { recipient: "residence", product: "catalog", adoptProduct: "catalog",
      membershipStatus: "memberships", alertRule: "alerts", notificationRecipient: "notificationRecipients" };
    const name = change.proposed.operation;
    if (typeof name === "string" && Object.hasOwn(sections, name)) return "/admin?section=" + sections[name] + "&" + params;
  }
  return "/configuracoes?" + params;
}

function ProposalReview({ proposal, patientName, comparison, version, independent, disabled, onDecision, onClose, invitationHref, focus }: {
  proposal: GovernanceProposal;
  patientName: string;
  comparison: Comparison;
  version: number;
  independent: boolean;
  disabled: boolean;
  onDecision: (decision: ProposalDecision) => void;
  onClose: () => void;
  invitationHref?: string;
  focus: React.RefObject<HTMLElement | null>;
}) {
  const [current, setCurrent] = useState(false);
  const [currentOpen, setCurrentOpen] = useState(false);
  const pending = proposal.status === "pending";
  const awaiting = proposal.status === "awaiting_acceptance";
  const treated = ["applied", "rejected", "awaiting_acceptance"].includes(proposal.status);
  const stale = proposal.base_version !== version;
  const permission = proposal.resolution?.permission;
  return <Drawer open title={current ? "Configuração atual" : pending ? "Conferir proposta" : awaiting ? "Proposta aprovada" : "Decisão da proposta"}
    subtitle={proposalTitle(proposal, comparison)} kicker="ORGANIZAÇÃO DA RESIDÊNCIA" headingIcon="checklist" popupClassName="hca-governance-review"
    keyboardScrollable
    onClose={current ? () => setCurrent(false) : onClose} finalFocus={focus} footer={<>
      <ActionButton onClick={current ? () => setCurrent(false) : onClose}>Voltar</ActionButton>
      {current ? <Link className="hca-control hca-control--primary" href={currentSettingsLink(proposal)}>Abrir configuração</Link> : null}
      {!current && pending && independent ? <>
        <ActionButton variant="danger" disabled={disabled || !proposal.reviewReference} onClick={() => onDecision("reject")}>Rejeitar proposta</ActionButton>
        {stale ? <ActionButton variant="primary" disabled={disabled} onClick={() => setCurrentOpen(true)}><Icon name="edit" />Preparar nova proposta</ActionButton>
          : <ActionButton variant="primary" disabled={disabled || !comparison.supported || !proposal.reviewReference}
            onClick={() => onDecision("approve")}><Icon name="check" />Aprovar proposta</ActionButton>}
      </> : null}
      {!current && awaiting && invitationHref && !disabled ? <Link className="hca-control hca-control--primary"
        prefetch={false} href={invitationHref}><Icon name="link" />Reemitir convite</Link> : null}
    </>}>
    <div className="hca-form-stack">
      {pending && stale ? <FeedbackBanner tone="warning" heading="A configuração mudou">
        Confira o que já está vigente antes de propor uma nova alteração. A proposta original permanece registrada.
      </FeedbackBanner> : null}
      {pending && !independent ? <FeedbackBanner heading="Decisão de outro administrador">
        Você pode acompanhar a proposta. A decisão está reservada a um administrador local distinto do proponente.
      </FeedbackBanner> : null}
      {awaiting ? <FeedbackBanner tone="success" heading="Decisão local registrada">
        A aprovação da proposta foi registrada. O destinatário ainda precisa aceitar o convite para criar o vínculo.
      </FeedbackBanner> : null}
      <DefinitionGrid items={[
        { label: "Residência", value: patientName },
        { label: "Proponente", value: proposal.proposerName },
        { label: "Registro", value: formatBrazilDate(proposal.created_at) },
        { label: "Situação", value: statusLabel(proposal.status) },
        { label: "Versão de origem", value: proposal.base_version },
        { label: "Configuração vigente", value: version },
        ...(treated ? [{ label: "Quem decidiu", value: proposal.reviewerName ?? permission?.actorName ?? "Identidade histórica" },
          { label: "Decisão em", value: formatBrazilDate(proposal.decided_at) }] : []),
      ]} />
      {permission ? <FeedbackBanner>
        Permissão efetiva {permission.before ? "permitida" : "restrita"} → {permission.after ? "permitida" : "restrita"}.
        {permission.familyReportingBefore !== undefined && permission.familyReportingAfter !== undefined
          ? " Relatos da família " + (permission.familyReportingBefore ? "permitidos" : "restritos") + " → " +
            (permission.familyReportingAfter ? "permitidos" : "restritos") + "." : null}
      </FeedbackBanner> : null}
      <section className="hca-residence-admin-section" aria-label="Compare a alteração">
        <header><h2>{current ? "Valores vigentes" : "Compare a alteração"}</h2></header>
        <ProposalComparison comparison={comparison} currentOnly={current} />
      </section>
      <div className="hca-field-hint wrap-anywhere">Referência da proposta {proposal.id}</div>
    </div>
    {currentOpen ? <Dialog open title="Rever a configuração atual" headingIcon="history" onClose={() => setCurrentOpen(false)}
      footer={<><ActionButton onClick={() => setCurrentOpen(false)}>Voltar</ActionButton><ActionButton variant="primary" disabled={disabled}
        onClick={() => { setCurrentOpen(false); setCurrent(true); }}>Ver configuração atual</ActionButton></>}>
      <p>Confira os valores vigentes antes de preparar outra mudança. A proposta anterior continua disponível no histórico.</p>
    </Dialog> : null}
  </Drawer>;
}

export function GovernanceProposals({ context, directory, version, revision, busy, refreshConfiguration }: {
  context: WorkspaceContext;
  version: number;
  revision: number;
  busy: boolean;
  directory: Directory;
  refreshConfiguration: () => void;
}) {
  const params = useSearchParams(), router = useRouter();
  const status = params.get("proposalStatus") ?? "open", kind = params.get("proposalKind") ?? "";
  const query = (params.get("proposalQuery") ?? "").trim(), page = Number(params.get("proposalPage") ?? "1");
  const queryKey = JSON.stringify([status, kind, query]);
  const [filters, setFilters] = useState({ queryKey, status, kind, query });
  if (filters.queryKey !== queryKey) setFilters({ queryKey, status, kind, query });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [decision, setDecision] = useState<{ proposalId: string; reference: string; action: ProposalDecision } | null>(null);
  const focusRef = useRef<HTMLElement | null>(null);
  const listHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const patient = context.patient!;
  const operation = useGovernanceProposalOperation(context.userId, patient.id);
  const decode = useCallback((value: unknown) => parseGovernanceListRead(value, {
    careRecipientId: patient.id, status, kind, query, page, pageSize: 20,
  }), [patient.id, status, kind, query, page]);
  const search = new URLSearchParams({ careRecipientId: patient.id, changesOnly: "true", status, query, page: String(page), pageSize: "20", ...(kind ? { kind } : {}) });
  const read = useScopedRead("/api/patient-settings?" + search, String(revision), decode);
  const { data, error, loading } = read;
  const fresh = Boolean(data && !error && !loading);
  const proposal = data?.changes.find(row => row.id === selectedId);
  const comparison = proposal ? governanceComparison(proposal, directory) : null;
  const currentVersion = proposal?.currentVersion ?? version;
  const local = context.activeContext?.mode === "patient" && can(context, "access.manage");
  const independent = Boolean(local && proposal && proposal.proposed_by !== context.userId);
  const invitationHref = local && proposal?.resolution?.invitationId ? "/admin?" + new URLSearchParams({
    section: "invitations", careRecipientId: patient.id, invitationId: proposal.resolution.invitationId,
  }) : undefined;
  const unavailable = busy || !fresh || !operation.ready || operation.busy || Boolean(operation.pending || operation.result);
  const actionsAvailable = !unavailable && independent && proposal?.status === "pending";
  const confirming = decision && decision.proposalId === proposal?.id;
  const canConfirm = Boolean(confirming && actionsAvailable && decision.reference === proposal?.reviewReference &&
    (decision.action === "reject" || comparison?.supported && proposal?.base_version === currentVersion));

  function navigate(values: Record<string, string>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(values)) { if (value) next.set(key, value); else next.delete(key); }
    const sameSelection = (next.get("proposalStatus") ?? "open") === status &&
      (next.get("proposalKind") ?? "") === kind && (next.get("proposalQuery") ?? "").trim() === query &&
      Number(next.get("proposalPage") ?? "1") === page;
    if (sameSelection) read.refresh();
    if (next.toString() !== params.toString()) router.push("/configuracoes?" + next, { scroll: false });
  }

  function refresh() {
    read.refresh();
    refreshConfiguration();
  }

  function confirm() {
    if (!canConfirm || !decision) return;
    setSelectedId(null);
    setDecision(null);
    focusRef.current = listHeadingRef.current;
    void operation.submit(decision.proposalId, { reference: decision.reference, decision: decision.action });
  }

  const orderedGroups: { title: string; rows: GovernanceProposal[] }[] = [];
  for (const row of data?.changes ?? []) {
    const title = groups.find(group => (group.statuses as readonly string[]).includes(row.status))?.name ?? "Outras propostas";
    const last = orderedGroups.at(-1);
    if (last?.title === title) last.rows.push(row);
    else orderedGroups.push({ title, rows: [row] });
  }

  return <section id="propostas" className="hca-residence-admin hca-governance-proposals" aria-label="Propostas de configuração" aria-busy={loading}>
    <header>
      <h2 ref={listHeadingRef} tabIndex={-1}>Propostas</h2>
      <p className="hca-residence-admin-subtitle">Mudanças que aguardam decisão de um administrador local.</p>
    </header>
    <form className="hca-toolbar" aria-label="Filtros de propostas" onSubmit={event => {
      event.preventDefault();
      navigate({ proposalStatus: filters.status, proposalKind: filters.kind, proposalQuery: filters.query.trim(), proposalPage: "1" });
    }}>
      <FormField label="Situação da proposta"><SelectField value={filters.status} onChange={event => setFilters({ ...filters, status: event.currentTarget.value })}><option value="all">Todas</option>{Object.entries(governanceFilterLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</SelectField></FormField>
      <FormField label="Tipo de proposta"><SelectField value={filters.kind} onChange={event => setFilters({ ...filters, kind: event.currentTarget.value })}><option value="">Todos os tipos</option>{Object.entries(governanceKindLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</SelectField></FormField>
      <FormField label="Buscar proposta por referência ou conteúdo"><TextInput type="search" value={filters.query} onChange={event => setFilters({ ...filters, query: event.currentTarget.value })} maxLength={160} /></FormField>
      <ActionButton type="submit">Consultar propostas</ActionButton>
      <ActionButton onClick={() => navigate({ proposalStatus: "open", proposalKind: "", proposalQuery: "", proposalPage: "1" })}>Limpar filtros de propostas</ActionButton>
      <ActionButton disabled={loading} onClick={read.refresh}>Atualizar propostas</ActionButton>
    </form>
    <GovernanceProposalFeedback operation={operation} onRefresh={refresh} focus={focusRef} />
    {error ? <FeedbackBanner tone="error">{error} <ActionButton onClick={read.refresh}>Consultar propostas novamente</ActionButton></FeedbackBanner> : null}
    {loading ? <LoadingIndicator label="Consultando propostas" /> : null}
    {data && !fresh ? <p className="hca-field-hint">Última consulta confirmada{read.queriedAt ? " em " + formatBrazilDate(read.queriedAt) : ""}. Decisões suspensas até nova consulta válida.</p> : null}
    {data ? <>
      <p role="status">{data.total} {data.total === 1 ? "proposta encontrada" : "propostas encontradas"} · página {data.page} de {Math.max(1, Math.ceil(data.total / data.pageSize))}</p>
      {fresh && !data.changes.length ? <p>Nenhuma proposta corresponde aos filtros consultados.</p> : null}
      {orderedGroups.map(group => <section key={group.rows[0].id} className="hca-residence-admin-section">
        <header><h2>{group.title}</h2></header>
        <div>{group.rows.map(change => <article key={change.id} data-proposal-id={change.id} aria-label={"Proposta " + change.id.slice(0, 8)}>
          <button type="button" className="hca-guide-row" onClick={event => { focusRef.current = event.currentTarget; setSelectedId(change.id); }}>
            <span className="hca-guide-row-icon"><Icon name={change.kind === "membership" ? "users" : "shield"} /></span>
            <span className="hca-guide-row-label">
              <strong>{proposalTitle(change, governanceComparison(change, directory))}</strong>
              <small>Proposta de {change.proposerName} · {formatBrazilDate(change.created_at)}</small>
              <Pill tone={change.status === "applied" ? "success" : change.status === "pending" || change.status === "awaiting_acceptance" ? "warning" : "neutral"}>{statusLabel(change.status)}</Pill>
            </span>
            <Icon name="chevron" width={15} height={15} />
          </button>
        </article>)}</div>
      </section>)}
      <nav className="hca-toolbar" aria-label="Páginas de propostas"><ActionButton disabled={!fresh || data.page === 1} onClick={() => navigate({ proposalPage: String(data.page - 1) })}>Propostas anteriores</ActionButton><ActionButton disabled={!fresh || data.page * data.pageSize >= data.total} onClick={() => navigate({ proposalPage: String(data.page + 1) })}>Próxima página de propostas</ActionButton></nav>
    </> : null}
    <p className="hca-residence-admin-note"><Icon name="shield" />O autor da proposta não decide a própria mudança. A aprovação depende da configuração vigente.</p>
    {proposal && comparison ? <ProposalReview key={proposal.id} proposal={proposal} comparison={comparison} patientName={patient.display_name}
      version={currentVersion} independent={independent} disabled={unavailable} focus={focusRef}
      onClose={() => { setSelectedId(null); setDecision(null); }}
      invitationHref={invitationHref}
      onDecision={action => {
        if (actionsAvailable && proposal.reviewReference) setDecision({ action, proposalId: proposal.id, reference: proposal.reviewReference });
      }} /> : null}
    {confirming ? <Dialog open title={decision.action === "approve" ? "Aprovar esta proposta?" : "Rejeitar esta proposta?"} keyboardScrollable
      headingIcon={decision.action === "approve" ? "check" : "shield"} onClose={() => setDecision(null)}
      footer={<>
        <ActionButton onClick={() => setDecision(null)}>Voltar</ActionButton>
        <ActionButton variant={decision.action === "approve" ? "primary" : "danger"} disabled={!canConfirm} onClick={confirm}>
          {decision.action === "approve" ? "Aprovar proposta" : "Rejeitar proposta"}
        </ActionButton>
      </>}>
      {!canConfirm ? <FeedbackBanner tone="warning">A configuração consultada mudou. Volte à proposta para conferir os dados atuais.</FeedbackBanner>
        : <div className="hca-form-stack">
          <p>{decision.action === "approve" ? "A decisão ficará no histórico da residência. Quando necessário, o vínculo dependerá do aceite do destinatário."
            : "A configuração vigente será mantida. A proposta e sua decisão continuarão disponíveis no histórico."}</p>
          {decision.action === "approve" && comparison ? <ProposalComparison comparison={comparison} /> : null}
        </div>}
    </Dialog> : null}
  </section>;
}
