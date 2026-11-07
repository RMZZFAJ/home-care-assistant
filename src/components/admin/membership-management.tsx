"use client";
import {roleLabel} from "@/lib/role-labels";
import { useState, type ReactNode } from "react";
import {
  Badge,
  Button,
  Field as FluentField,
  Input,
  Select,
} from "@fluentui/react-components";
import { RecordDrawer } from "@/components/forms/record-drawer";
import { MembershipImpact } from "./membership-impact";
import { Dialog, EmptyState, Icon } from "@/components/ui/primitives";
import { Notice } from "@/components/workspace";
import { RoleSelect, text, bool, type Row } from "./admin-fields";

export function MembershipManagement({
  rows,
  directory,
  save,
  busy,
  error,
  recovery,
  confirmationRevision = 0,
  patientId,
}: {
  rows: Row[];
  directory: Row[];
  save: (payload: Row, message: string, refresh?: boolean) => Promise<unknown>;
  busy: boolean;
  error: string;
  recovery?: ReactNode;
  confirmationRevision?: number;
  patientId?: string;
}) {
  const [search, setSearch] = useState("");
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
        <Button
          appearance="primary"
          icon={<Icon name="plus" />}
          onClick={(event) =>
            setEditor({ row: null, opener: event.currentTarget })
          }
        >
          Vincular conta
        </Button>
      </div>
      <div className="hca-toolbar">
        <Input
          type="search"
          aria-label="Pesquisar pessoas"
          placeholder="Nome ou função"
          contentBefore={<Icon name="search" />}
          value={search}
          onChange={(_, data) => setSearch(data.value)}
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
              <Badge
                appearance="tint"
                color={row.status === "revoked" ? "informative" : "success"}
              >
                {row.status === "revoked" ? "Revogado" : "Ativo"}
              </Badge>
            </div>
            <div className="hca-record-actions">
              <Button
                aria-label={"Editar vínculo de " + name(row)}
                disabled={row.status === "revoked"}
                onClick={(event) =>
                  setEditor({ row, opener: event.currentTarget })
                }
              >
                Editar
              </Button>
              <Button appearance="subtle" onClick={() => setChange(row)}>
                {row.status === "revoked" ? "Reativar" : "Revogar"}
              </Button>
            </div>
          </article>
        ))}
        {!filtered.length ? (
          <EmptyState title="Nenhum vínculo nesta seleção">
            Busque outra pessoa ou crie um convite.
          </EmptyState>
        ) : null}
      </div>
      {editor ? (
        <RecordDrawer
          title={editor.row ? "Editar vínculo" : "Vincular conta existente"}
          busy={busy}
          recovery={recovery}
          restoreFocusTo={editor.opener}
          onClose={() => setEditor(null)}
        >
          {error ? <Notice error>{error}</Notice> : null}
          <form
            className="hca-form"
            onSubmit={async (event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              const role = form.get("role");
              const result = await save(
                {
                  action: "membership",
                  userId: editor.row
                    ? text(editor.row, "user_id")
                    : form.get("userId"),
                  role,
                  canManageStock: editor.row
                    ? bool(editor.row, "can_manage_stock")
                    : role === "admin",
                  canCountStock: editor.row
                    ? bool(editor.row, "can_count_stock")
                    : false,
                },
                "Vínculo salvo e auditado.",
                true,
              );
              if (result) setEditorState(current => current === editor ? null : current);
            }}
          >
            {editor.row ? (
              <div>
                <p className="text-sm font-semibold">Conta vinculada</p>
                <p className="break-words">{name(editor.row)}</p>
                <p className="hca-field-hint">
                  A edição mantém esta pessoa. Para outra conta, use o fluxo de
                  vínculo ou convite.
                </p>
              </div>
            ) : (
              <FluentField label="Conta vinculada">
                <Select
                  name="userId"
                  defaultValue={editor.row ? text(editor.row, "user_id") : ""}
                  required
                >
                  <option value="">Selecione uma conta</option>
                  {directory.map((person) => (
                    <option
                      key={text(person, "user_id") || text(person, "id")}
                      value={text(person, "user_id") || text(person, "id")}
                    >
                      {text(person, "full_name")}
                    </option>
                  ))}
                </Select>
              </FluentField>
            )}
            <RoleSelect
              value={editor.row ? text(editor.row, "role") : "professional"}
            />
            <p className="hca-field-hint">
              Permissões específicas ficam na matriz. Uma conta nova deve ser
              convidada pelo e-mail e aceitar o convite.
            </p>
            <Button appearance="primary" disabled={busy} type="submit">
              Salvar vínculo
            </Button>
          </form>
        </RecordDrawer>
      ) : null}
      <Dialog
        open={Boolean(change)}
        title={
          change?.status === "revoked" ? "Reativar vínculo" : "Revogar vínculo"
        }
        closeDisabled={busy}
        onClose={() => {
          if (!busy) setChange(null);
        }}
      >
        <p>
          Confirmar a alteração do vínculo de{" "}
          <strong>{change ? name(change) : ""}</strong> neste paciente?
        </p>
        <p className="hca-field-hint">
          A mudança será auditada e as permissões serão reavaliadas nas próximas
          operações.
        </p>
        {error ? <Notice error>{error}</Notice> : null}
        {recovery}
        <div className="hca-toolbar">
          <Button disabled={busy} onClick={() => setChange(null)}>
            Voltar
          </Button>
          <Button
            appearance="primary"
            disabled={busy}
            onClick={async () => {
              if (!change) return;
              const result = await save(
                {
                  action: "membershipStatus",
                  userId: change.user_id,
                  status: change.status === "revoked" ? "active" : "revoked",
                },
                "Estado do vínculo atualizado.",
                true,
              );
              if (result) setChangeState(current => current === changeState ? null : current);
            }}
          >
            {change?.status === "revoked"
              ? "Confirmar alteração"
              : "Revogar agora"}
          </Button>
        </div>
        {change && change.status !== "revoked" && patientId ? (
          <MembershipImpact
            key={patientId + ":" + text(change, "user_id")}
            patientId={patientId}
            userId={text(change, "user_id")}
          />
        ) : null}
      </Dialog>
    </section>
  );
}
