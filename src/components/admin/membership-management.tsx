"use client";
import { ActionButton, Pill, TextInput } from "@/components/ui/controls";
import {roleLabel} from "@/lib/role-labels";
import { useState } from "react";

import { CredentialReview } from "./credential-review";
import { EmptyState, Icon } from "@/components/ui/primitives";
import { text, type Row } from "./admin-fields";

import { AdministrativePreparationEditor } from "./administrative-preparation-editor";
import type { AdministrativeOutcome } from "@/lib/validation/administrative-preparation";

export function MembershipManagement({
  rows,
  directory,
  userId, globalMode, onConfirmed,
  confirmationRevision = 0,
  patientId,
  credentialReviewAllowed = false,
}: {
  rows: Row[];
  directory: Row[];
  userId: string; globalMode: boolean;
  onConfirmed: (outcome: AdministrativeOutcome) => void;
  confirmationRevision?: number;
  patientId: string;
  credentialReviewAllowed?: boolean;
}) {
  const [search, setSearch] = useState("");
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
    <section>
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
      <div className="hca-records">
        {filtered.map((row) => (
          <article
            key={text(row, "id") || text(row, "user_id")}
            className="hca-record"
          >
            <span className="hca-task-icon">
              <Icon name="user" />
            </span>
            <div className="hca-record-main">
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
            <div className="hca-record-actions">
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
        userId={userId} people={rows} onClose={() => setChange(null)} onConfirmed={onConfirmed}
      /> : null}
    </section>
  );
}
