"use client";
import { useState } from "react";
import { Badge, Button, Field as FluentField, Input, Select } from "@fluentui/react-components";
import { RecordDrawer } from "@/components/forms/record-drawer";
import { Dialog, EmptyState, Icon } from "@/components/ui/primitives";
import { Notice } from "@/components/workspace";
import { RoleSelect, roles, text, type Row } from "./admin-fields";

export function MembershipManagement({ rows, directory, save, busy, error }: {
  rows: Row[]; directory: Row[]; save: (payload: Row, message: string, refresh?: boolean) => Promise<unknown>; busy: boolean; error: string;
}) {
  const [search, setSearch] = useState("");
  const [editor, setEditor] = useState<{ row: Row | null; opener: HTMLElement } | null>(null);
  const [change, setChange] = useState<Row | null>(null);
  const name = (row: Row) => (row.profiles as { full_name?: string } | null)?.full_name || text(row, "full_name") || text(row, "user_id");
  const filtered = rows.filter((row) => (name(row) + " " + (roles[text(row, "role") as keyof typeof roles] ?? text(row, "role"))).toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR")));
  return <section>
    <div className="hca-section-heading"><div><h2>Pessoas e vínculos</h2><p>A função e as permissões se aplicam somente a este paciente.</p></div><Button appearance="primary" icon={<Icon name="plus" />} onClick={(event) => setEditor({ row: null, opener: event.currentTarget })}>Vincular conta</Button></div>
    <div className="hca-toolbar"><Input type="search" aria-label="Pesquisar pessoas" placeholder="Nome ou função" contentBefore={<Icon name="search" />} value={search} onChange={(_, data) => setSearch(data.value)} /><span role="status" className="hca-result-count">{filtered.length} vínculos</span></div>
    <div className="hca-records">{filtered.map((row) => <article key={text(row, "id") || text(row, "user_id")} className="hca-record"><span className="hca-task-icon"><Icon name="user" /></span><div className="hca-record-main"><h3>{name(row)}</h3><small>{roles[text(row, "role") as keyof typeof roles] ?? text(row, "role")}</small><Badge appearance="tint" color={row.status === "revoked" ? "informative" : "success"}>{row.status === "revoked" ? "Revogado" : "Ativo"}</Badge></div><div className="hca-record-actions"><Button aria-label={"Editar vínculo de " + name(row)} onClick={(event) => setEditor({ row, opener: event.currentTarget })}>Editar</Button><Button appearance="subtle" onClick={() => setChange(row)}>{row.status === "revoked" ? "Reativar" : "Revogar"}</Button></div></article>)}{!filtered.length ? <EmptyState title="Nenhum vínculo nesta seleção">Busque outra pessoa ou crie um convite.</EmptyState> : null}</div>
    {editor ? <RecordDrawer title={editor.row ? "Editar vínculo" : "Vincular conta existente"} busy={busy} restoreFocusTo={editor.opener} onClose={() => setEditor(null)}>{error ? <Notice error>{error}</Notice> : null}<form className="hca-form" onSubmit={async (event) => { event.preventDefault(); const form = new FormData(event.currentTarget); const role = form.get("role"); const result = await save({ action: "membership", userId: form.get("userId"), role, canManageStock: role === "admin", canCountStock: false }, "Vínculo salvo e auditado.", true); if (result) setEditor(null); }}>
      <FluentField label="Conta vinculada"><Select name="userId" defaultValue={editor.row ? text(editor.row, "user_id") : ""} required><option value="">Selecione uma conta</option>{directory.map((person) => <option key={text(person, "user_id") || text(person, "id")} value={text(person, "user_id") || text(person, "id")}>{text(person, "full_name")}</option>)}</Select></FluentField><RoleSelect value={editor.row ? text(editor.row, "role") : "professional"} /><p className="hca-field-hint">Permissões específicas ficam na matriz. Uma conta nova deve ser convidada pelo e-mail e aceitar o convite.</p><Button appearance="primary" disabled={busy} type="submit">Salvar vínculo</Button>
    </form></RecordDrawer> : null}
    <Dialog open={Boolean(change)} title={change?.status === "revoked" ? "Reativar vínculo" : "Revogar vínculo"} onClose={() => { if (!busy) setChange(null); }}><p>Confirmar a alteração do vínculo de <strong>{change ? name(change) : ""}</strong> neste paciente?</p><p className="hca-field-hint">A mudança será auditada e as permissões serão reavaliadas nas próximas operações.</p>{error ? <Notice error>{error}</Notice> : null}<div className="hca-toolbar"><Button disabled={busy} onClick={() => setChange(null)}>Voltar</Button><Button appearance="primary" disabled={busy} onClick={async () => { if (!change) return; const result = await save({ action: "membershipStatus", userId: change.user_id, status: change.status === "revoked" ? "active" : "revoked" }, "Estado do vínculo atualizado.", true); if (result) setChange(null); }}>Confirmar alteração</Button></div></Dialog>
  </section>;
}
