"use client";
import { ActionButton, FormField, Pill, SelectField, TextInput } from "@/components/ui/controls";
import { useState } from "react";

import { RecordDrawer } from "@/components/forms/record-drawer";
import { Dialog, Icon } from "@/components/ui/primitives";
import { Notice } from "@/components/workspace";
import { Field, Check, text, bool, type Row } from "./admin-fields";

const accountRoles: Record<string, string> = { admin: "Administração", supervisor: "Supervisão", professional: "Profissional", reader: "Leitura" };
const accountRoleLabel = (value: unknown) => typeof value === "string" && Object.hasOwn(accountRoles, value) ? accountRoles[value] : "Classificação não reconhecida";

export function GlobalAccounts({ rows, save, busy, error }: {
  rows: Row[]; save: (payload: Row, message: string, refresh?: boolean) => Promise<unknown>; busy: boolean; error: string;
}) {
  const [search, setSearch] = useState("");
  const [editor, setEditor] = useState<{ row: Row; opener: HTMLElement } | null>(null);
  const [review, setReview] = useState<Row | null>(null);
  return <section><div className="hca-section-heading"><div><h2>Identidades globais</h2><p>Alterações atingem a conta inteira. Vínculos e competências locais são administrados separadamente.</p></div></div><div className="hca-toolbar"><TextInput type="search" aria-label="Pesquisar contas globais" value={search} onChange={controlEvent => { const controlValue = controlEvent.currentTarget.value; return setSearch(controlValue); }} leading={<Icon name="search" />} placeholder="Nome da conta" /></div><div className="hca-records">{rows.filter((row) => text(row, "full_name").toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR"))).map((row) => <article key={text(row, "id")} className="hca-record"><div className="hca-record-main"><h3>{text(row, "full_name")}</h3><small>{bool(row, "global_scope") ? "Privilégio global" : "Sem privilégio global"} · {accountRoleLabel(row.role)}</small></div><Pill  tone={row.status === "active" ? "success" : "neutral"}>{row.status === "active" ? "Ativa" : "Revogada"}</Pill><ActionButton aria-label={"Editar conta " + text(row, "full_name")} onClick={(event) => setEditor({ row, opener: event.currentTarget })}>Editar</ActionButton></article>)}</div>
    {editor ? <RecordDrawer title="Editar conta global" onClose={() => setEditor(null)} busy={busy} restoreFocusTo={editor.opener}>{error ? <Notice error>{error}</Notice> : null}<form className="hca-form" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); setReview({ action: "profile", userId: editor.row.id, fullName: form.get("fullName"), role: form.get("role"), status: form.has("isActive") ? "active" : "revoked", globalScope: form.has("globalScope") }); }}><Field name="fullName" label="Nome da conta" value={text(editor.row, "full_name")} required /><FormField label="Papel global"><SelectField name="role" defaultValue={text(editor.row, "role")}>{Object.entries(accountRoles).map(([role, label]) => <option key={role} value={role}>{label}</option>)}</SelectField></FormField><Check name="isActive" label="Conta ativa" checked={editor.row.status === "active"} /><Check name="globalScope" label="Privilégio global" checked={bool(editor.row, "global_scope")} /><p className="hca-field-hint">O último administrador global ativo permanece protegido pelo banco.</p><ActionButton type="submit" variant="primary">Revisar alteração</ActionButton></form></RecordDrawer> : null}
    <Dialog open={Boolean(review)} title="Revisar conta global" onClose={() => { if (!busy) setReview(null); }}>{review ? <><p><strong>{String(review.fullName)}</strong></p><dl className="hca-change-summary"><dt>Papel global</dt><dd>{accountRoleLabel(review.role)}</dd><dt>Conta</dt><dd>{review.status === "active" ? "Ativa" : "Revogada"}</dd><dt>Privilégio global</dt><dd>{review.globalScope ? "Habilitado" : "Desabilitado"}</dd></dl>{error ? <Notice error>{error}</Notice> : null}<div className="hca-toolbar"><ActionButton disabled={busy} onClick={() => setReview(null)}>Voltar</ActionButton><ActionButton variant="primary" disabled={busy} onClick={async () => { if (await save(review, "Conta global atualizada.", true)) { setReview(null); setEditor(null); } }}>Confirmar conta global</ActionButton></div></> : null}</Dialog>
  </section>;
}
