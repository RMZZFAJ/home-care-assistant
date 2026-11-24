"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { ProfileAvatar } from "@/components/ui/avatar";
import { ActionButton, DefinitionGrid, Pill, TextInput } from "@/components/ui/controls";
import { FeedbackBanner } from "@/components/ui/feedback";
import { Drawer } from "@/components/ui/overlays";
import { Icon, type IconName } from "@/components/ui/icon";
import { roleLabel } from "@/lib/role-labels";
import type { AdministrativeOutcome } from "@/lib/validation/administrative-preparation";
import type { ReviewedMembershipCommand, ReviewedMembershipScope } from "@/lib/validation/reviewed-membership";
import { CredentialReview } from "./credential-review";
import { MembershipImpact } from "./membership-impact";
import { ReviewedMemberEditor, ReviewedMemberStatus } from "./reviewed-member-editor";
import { ReviewedMembershipFeedback, useReviewedMembershipOperation } from "./reviewed-membership-operation";
import { text, type Row } from "./admin-fields";
import "../guides/guides.css";
import "./people-administration.css";

function memberName(row: Row) {
  return (row.profiles as { full_name?: string } | null)?.full_name || text(row, "full_name") || text(row, "user_id");
}

function MemberActionLabel({ title, detail, icon }: { title: string; detail: string; icon: IconName }) {
  return <><span className="hca-guide-row-icon"><Icon name={icon} /></span>
    <span className="hca-guide-row-label"><strong>{title}</strong><small>{detail}</small></span>
    <Icon name="chevron" width={15} height={15} />
  </>;
}

function MemberAction({ title, detail, icon, onClick, danger }: {
  title: string; detail: string; icon: IconName; onClick: (opener: HTMLButtonElement) => void; danger?: boolean;
}) {
  return <button type="button" className="hca-guide-row" data-danger={danger || undefined} onClick={event => onClick(event.currentTarget)}>
    <MemberActionLabel title={title} detail={detail} icon={icon} />
  </button>;
}

type Panel = { kind: "new" } | { kind: "detail" | "edit" | "status" | "impact"; id: string };

export function MembershipManagement({ rows, directory, userId, globalMode, onConfirmed, patientId, patientName, credentialReviewAllowed, mayRegularize }: {
  rows: Row[];
  directory: Row[];
  userId: string;
  globalMode: boolean;
  onConfirmed: (outcome: AdministrativeOutcome) => void;
  patientId: string;
  patientName: string;
  credentialReviewAllowed: boolean;
  mayRegularize: boolean;
}) {
  const [search, setSearch] = useState("");
  const [panel, setPanel] = useState<Panel | null>(null);
  const [revokedMemberId, setRevokedMemberId] = useState<string | null>(null);
  const [credential, setCredential] = useState<{ subjectId: string; opener: HTMLButtonElement } | null>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const context = { patientId, mode: globalMode ? "global" : "patient" } as const;
  const operation = useReviewedMembershipOperation(userId, context);
  const id = panel && "id" in panel ? panel.id : null;
  const member = id ? rows.find(row => text(row, "user_id") === id) : null;
  const revoked = member?.status === "revoked";
  const role = member ? roleLabel(text(member, "role")) : "";
  const name = member ? memberName(member) : "";
  const query = search.trim().toLocaleLowerCase("pt-BR");
  const filtered = rows.filter(row => `${memberName(row)} ${roleLabel(text(row, "role"))}`.toLocaleLowerCase("pt-BR").includes(query));

  function closePanel() { setPanel(null); }
  function show(next: Panel, trigger: HTMLButtonElement) {
    openerRef.current = trigger;
    setPanel(next);
  }
  function submit(scope: ReviewedMembershipScope, intent: NonNullable<ReviewedMembershipCommand["intent"]>) {
    closePanel();
    void operation.submit(scope, intent);
  }

  return <section aria-label="Pessoas e vínculos">
    <ReviewedMembershipFeedback operation={operation} focus={openerRef} onConfirmed={outcome => {
      if (outcome.kind === "local" && outcome.action === "membershipStatus") setRevokedMemberId(outcome.status === "revoked" ? outcome.userId : null);
      onConfirmed(outcome);
    }} />
    {revokedMemberId && !globalMode ? <FeedbackBanner tone="info">
      Consulte as entregas e outras pendências da pessoa desligada.
      <ActionButton onClick={event => show({ kind: "impact", id: revokedMemberId }, event.currentTarget)}>Acompanhar pendências do vínculo</ActionButton>
    </FeedbackBanner> : null}
    <section className="hca-people-card hca-linked-people" aria-labelledby="linked-people">
      <header><h2 id="linked-people">Pessoas vinculadas</h2>
        <ActionButton disabled={operation.blocked} onClick={event => show({ kind: "new" }, event.currentTarget)}><Icon name="plus" />Vincular pessoa</ActionButton>
      </header>
      <div className="hca-people-body">
        <TextInput type="search" aria-label="Pesquisar pessoas" placeholder="Nome ou função" leading={<Icon name="search" />}
          value={search} onChange={event => setSearch(event.currentTarget.value)} />
        <p role="status" className="hca-field-hint mt-2">{filtered.length} vínculos</p>
        {filtered.length ? <ul className="hca-member-list" aria-label="Pessoas vinculadas">{filtered.map(row => {
          const memberId = text(row, "user_id");
          const label = memberName(row);
          return <li key={text(row, "id") || memberId}>
            <button type="button" className="hca-guide-row" disabled={operation.blocked} onClick={event => show({ kind: "detail", id: memberId }, event.currentTarget)}>
              <ProfileAvatar name={label} />
              <span className="hca-guide-row-label"><strong>{label}</strong><small>{roleLabel(text(row, "role"))}</small>
                <Pill tone={row.status === "revoked" ? "neutral" : "success"}>{row.status === "revoked" ? "Revogado" : "Ativo"}</Pill></span>
              <Icon name="chevron" width={15} height={15} />
            </button>
          </li>;
        })}</ul> : <p className="hca-field-hint">Nenhum vínculo nesta seleção. Busque outra pessoa ou crie um convite.</p>}
      </div>
    </section>
    <p className="hca-people-hint"><Icon name="shield" />Função e permissões são próprias desta residência. Desligamentos preservam o histórico.</p>
    <Link className="hca-control hca-control--secondary hca-member-policy-link" prefetch={false}
      href={`/configuracoes?area=people&careRecipientId=${patientId}`}>
      <Icon name="shield" />Permissões e alterações com dupla aprovação
    </Link>

    {member && id && panel?.kind === "detail" ? <Drawer open title={name} subtitle="Vínculo na residência" headingIcon="user"
      finalFocus={openerRef} onClose={closePanel} footer={<ActionButton onClick={closePanel}>Voltar</ActionButton>}>
      <div className="hca-member-panel">
        <div className="hca-member-hero"><ProfileAvatar name={name} /><div><strong>{name}</strong><p>{role}</p></div>
          {revoked ? null : <Pill tone="success">Vínculo ativo</Pill>}</div>
        <DefinitionGrid items={[{ label: "Residência", value: patientName }, { label: "Função", value: role }, { label: "Situação", value: revoked ? "Revogada" : "Ativa" }]} />
        <section className="hca-member-actions" aria-label="Acesso e responsabilidade">
          <h3>Acesso e responsabilidade</h3>
          {!revoked ? <>
            <MemberAction title="Editar vínculo" detail="Função e competências nesta residência" icon="edit" onClick={() => setPanel({ kind: "edit", id })} />
            <Link className="hca-guide-row" prefetch={false} href={"/configuracoes?" + new URLSearchParams({ area: "permissions", person: id, careRecipientId: patientId })}>
              <MemberActionLabel title="Ver permissões" detail="Padrão da função e exceções pessoais" icon="shield" />
            </Link>
          </> : null}
          {credentialReviewAllowed ? <MemberAction title="Credencial profissional" detail="Declaração e conferência da família" icon="note"
            onClick={trigger => setCredential({ subjectId: id, opener: trigger })} /> : null}
          <MemberAction title={revoked ? "Reativar vínculo" : "Revisar desligamento"}
            detail={revoked ? "Retomar o vínculo local com revisão explícita" : "Consultar tarefas e preservar o histórico"}
            icon={revoked ? "refresh" : "users"} danger={!revoked} onClick={() => setPanel({ kind: "status", id })} />
          {revoked && !globalMode ? <MemberAction title="Acompanhar pendências" detail="Consultar as tarefas desta pessoa" icon="checklist"
            onClick={() => setPanel({ kind: "impact", id })} /> : null}
        </section>
      </div>
      {credential && credentialReviewAllowed ? <CredentialReview patientId={patientId} subjectId={credential.subjectId}
        subjectRole={member.role === "professional" ? "Profissional da equipe" : role}
        opener={credential.opener} onClose={() => setCredential(null)} /> : null}
    </Drawer> : null}
    {panel?.kind === "new" || (panel?.kind === "edit" && member) ? <ReviewedMemberEditor
      key={id ?? "new"} scope={{ ...context, purpose: "membership", targetId: id }} people={directory}
      focus={openerRef} onClose={closePanel} onSubmit={submit} /> : null}
    {panel?.kind === "status" && id && member ? <ReviewedMemberStatus
      key={id} scope={{ ...context, purpose: "membershipStatus", targetId: id }} name={name} role={role} revoked={revoked}
      focus={openerRef} onClose={closePanel} onSubmit={submit} /> : null}
    {panel?.kind === "impact" && id && !globalMode ? <Drawer open title="Acompanhar pendências do vínculo" headingIcon="checklist"
      finalFocus={openerRef} onClose={closePanel} footer={<ActionButton onClick={closePanel}>Voltar</ActionButton>}>
      <MembershipImpact patientId={patientId} userId={id} afterRevocation mayRegularize={mayRegularize} />
    </Drawer> : null}
  </section>;
}
