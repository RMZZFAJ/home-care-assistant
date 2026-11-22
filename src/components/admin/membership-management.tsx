"use client";
import { ActionButton, Pill, TextInput } from "@/components/ui/controls";
import {roleLabel} from "@/lib/role-labels";
import { useState } from "react";

import { CredentialReview } from "./credential-review";
import { EmptyState, Icon } from "@/components/ui/primitives";
import { text, type Row } from "./admin-fields";

import { AdministrativePreparationEditor } from "./administrative-preparation-editor";
import type { AdministrativeOutcome } from "@/lib/validation/administrative-preparation";
import { ProfileAvatar } from "@/components/ui/avatar";
import { Dialog } from "@/components/ui/overlays";
import { MembershipImpact } from "./membership-impact";
import "./identity.css";

export function MembershipManagement({
  rows,
  directory,
  userId, globalMode, onConfirmed,
  confirmationRevision = 0,
  patientId,
  credentialReviewAllowed = false,
  mayRegularize = false,
}: {
  rows: Row[];
  directory: Row[];
  userId: string; globalMode: boolean;
  onConfirmed: (outcome: AdministrativeOutcome) => void;
  confirmationRevision?: number;
  patientId: string;
  credentialReviewAllowed?: boolean;
  mayRegularize?: boolean;
}) {
  const [search, setSearch] = useState("");
  type MemberReference = { patientId: string; userId: string };
  const [impact, setImpact] = useState<MemberReference | null>(null);
  const [revocation, setRevocation] = useState<MemberReference | null>(null);
  const impactSubject = impact?.patientId === patientId ? impact.userId : null;
  const revokedSubject = revocation?.patientId === patientId ? revocation : null;
  const [credential, setCredential] = useState<{ subjectId: string; opener: HTMLElement } | null>(null);
  type Editor = {
    row: Row | null;
    opener: HTMLElement;
  };
  const [editorState, setEditorState] = useState<(Editor & { revision: number }) | null>(null);
  const editor = editorState?.revision === confirmationRevision ? editorState : null;
  const setEditor = (value: Editor | null) => setEditorState(value ? { ...value, revision: confirmationRevision } : null);
  const [changeState, setChangeState] = useState<{ row: Row; revision: number } | null>(null);
  const change = changeState?.revision === confirmationRevision ? changeState.row : null;
  const setChange = (row: Row | null) => setChangeState(row ? { row, revision: confirmationRevision } : null);
  const name = (row: Row) =>
    (row.profiles as { full_name?: string } | null)?.full_name ||
    text(row, "full_name") ||
    text(row, "user_id");
  const filtered = rows.filter((row) =>
    (
      name(row) +
      " " +
      (roleLabel(text(row, "role")))
    )
      .toLocaleLowerCase("pt-BR")
      .includes(search.toLocaleLowerCase("pt-BR")),
  );
  return (
    <section className="hca-identity-management" aria-label="Pessoas e vínculos">
      <div className="hca-section-heading">
        <div>
          <h2>Pessoas e vínculos</h2>
          <p>A função e as permissões se aplicam somente a este paciente.</p>
        </div>
        <ActionButton
          variant="primary"

          onClick={(event) =>
            setEditor({ row: null, opener: event.currentTarget })
          }
        >{<Icon name="plus" />}
          Vincular conta
        </ActionButton>
      </div>
      {revokedSubject && !globalMode ? <div className="hca-attention">
        <p>Consulte as entregas e outras pendências da pessoa desligada.</p>
        <ActionButton onClick={() => setImpact(revokedSubject)}>Acompanhar pendências do vínculo</ActionButton>
      </div> : null}
      <div className="hca-toolbar">
        <TextInput
          type="search"
          aria-label="Pesquisar pessoas"
          placeholder="Nome ou função"
          leading={<Icon name="search" />}
          value={search}
          onChange={controlEvent => { const controlValue = controlEvent.currentTarget.value; return setSearch(controlValue); }}
        />
        <span role="status" className="hca-result-count">
          {filtered.length} vínculos
        </span>
      </div>
      <div className="ui-card hca-identity-list">
        {filtered.map((row) => (
          <article
            key={text(row, "id") || text(row, "user_id")}
            className="hca-identity-row"
          >
            <ProfileAvatar name={name(row)} />
            <div className="hca-identity-main">
              <h3>{name(row)}</h3>
              <small>
                {roleLabel(text(row, "role"))}
              </small>
              <Pill

                tone={row.status === "revoked" ? "neutral" : "success"}
              >
                {row.status === "revoked" ? "Revogado" : "Ativo"}
              </Pill>
            </div>
            <div className="hca-identity-actions">
              <ActionButton
                aria-label={"Editar vínculo de " + name(row)}
                disabled={row.status === "revoked"}
                onClick={(event) =>
                  setEditor({ row, opener: event.currentTarget })
                }
              >
                Editar
              </ActionButton>
              <ActionButton variant="quiet" onClick={() => setChange(row)}>
                {row.status === "revoked" ? "Reativar" : "Revogar"}
              </ActionButton>
              {row.status === "revoked" && !globalMode ? <ActionButton onClick={() => setImpact({ patientId, userId: text(row, "user_id") })}>
                Acompanhar pendências
              </ActionButton> : null}
              {patientId ? <ActionButton disabled={!credentialReviewAllowed} title={!credentialReviewAllowed ? "Selecione seu vínculo local para conferir uma credencial." : undefined} onClick={event => setCredential({ subjectId: text(row, "user_id"), opener: event.currentTarget })}>Conferir credencial</ActionButton> : null}
            </div>
          </article>
        ))}
        {!filtered.length ? (
          <EmptyState title="Nenhum vínculo nesta seleção">
            Busque outra pessoa ou crie um convite.
          </EmptyState>
        ) : null}
      </div>
      {credential && patientId ? <CredentialReview patientId={patientId} subjectId={credential.subjectId} opener={credential.opener} onClose={() => setCredential(null)}/> : null}
      {editor ? <AdministrativePreparationEditor
        key={text(editor.row ?? {}, "user_id") || "new"}
        scope={{patientId,mode:globalMode ? "global" : "patient",purpose:"membership",targetId:editor.row ? text(editor.row,"user_id") : null}}
        userId={userId} people={directory} opener={editor.opener}
        onClose={() => setEditor(null)} onConfirmed={onConfirmed}
      /> : null}
      {change ? <AdministrativePreparationEditor
        key={text(change,"user_id")}
        scope={{patientId,mode:globalMode ? "global" : "patient",purpose:"membershipStatus",targetId:text(change,"user_id")}}
        userId={userId} people={rows} onClose={() => setChange(null)} onConfirmed={outcome => {
          if (outcome.kind === "local" && outcome.action === "membershipStatus" && outcome.userId)
            setRevocation(outcome.status === "revoked" ? { patientId, userId: outcome.userId } : null);
          onConfirmed(outcome);
        }}
      /> : null}
      {impactSubject && !globalMode ? <Dialog open title="Acompanhar pendências do vínculo"
        onClose={() => setImpact(null)} footer={<ActionButton onClick={() => setImpact(null)}>Voltar</ActionButton>}>
        <MembershipImpact patientId={patientId} userId={impactSubject} afterRevocation mayRegularize={mayRegularize} />
      </Dialog> : null}
    </section>
  );
}
