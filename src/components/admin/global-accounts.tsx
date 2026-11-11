"use client";
import { ActionButton, FormField, Pill, SelectField, TextInput } from "@/components/ui/controls";
import { useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useScopedRead } from "@/lib/use-scoped-read";
import { parseProfilesPage } from "@/lib/validation/catalogue-list";
import { formatBrazilDate } from "@/lib/receipt";

import { RecordDrawer } from "@/components/forms/record-drawer";
import { Dialog, Icon } from "@/components/ui/primitives";
import { Notice } from "@/components/workspace";
import { Field, Check, text, bool, type Row } from "./admin-fields";

const accountRoles: Record<string, string> = { admin: "Administração", supervisor: "Supervisão", professional: "Profissional", reader: "Leitura" };
const accountRoleLabel = (value: unknown) => typeof value === "string" && Object.hasOwn(accountRoles, value) ? accountRoles[value] : "Classificação não reconhecida";

export function GlobalAccounts({ save, busy, error }: {
  save: (payload: Row, message: string, refresh?: boolean) => Promise<unknown>; busy: boolean; error: string;
}) {
  const params = useSearchParams(), router = useRouter();
  const query = params.get("profileQuery") ?? "", page = Math.max(1, Number(params.get("profilePage")) || 1);
  const [search, setSearch] = useState(query), [previousQuery, setPreviousQuery] = useState(query);
  if (previousQuery !== query) { setPreviousQuery(query); setSearch(query); }
  const decode = useCallback((value: unknown) => parseProfilesPage(value, page, query), [page, query]);
  const read = useScopedRead("/api/admin?" + new URLSearchParams({ section: "profiles", profilePage: String(page), query }), "", decode);
  const rows = read.data?.data ?? [], unavailable = busy || read.loading || Boolean(read.error) || !read.data;
  function navigate(nextQuery: string, nextPage = 1) {
    if (nextQuery === query && nextPage === page) { read.refresh(); return; }
    const next = new URLSearchParams(params.toString());
    next.set("section", "profiles"); next.set("profilePage", String(nextPage));
    if (nextQuery) next.set("profileQuery", nextQuery); else next.delete("profileQuery");
    router.push("/admin?" + next, { scroll: false });
  }
  const [editor, setEditor] = useState<{ row: Row; opener: HTMLElement } | null>(null);
  const [review, setReview] = useState<Row | null>(null);
  return <section aria-label="Contas globais">
    <div className="hca-section-heading"><div><h2>Identidades globais</h2><p>Alterações atingem a conta inteira. Vínculos e competências locais são administrados separadamente.</p></div></div>
    <form className="hca-toolbar" onSubmit={event => { event.preventDefault(); navigate(search.trim()); }}>
      <TextInput type="search" aria-label="Pesquisar contas globais" value={search} onChange={event => setSearch(event.currentTarget.value)} leading={<Icon name="search" />} placeholder="Nome da conta" />
      <ActionButton type="submit">Buscar contas</ActionButton>
      <ActionButton type="button" onClick={() => { setSearch(""); navigate(""); }}>Limpar busca de contas</ActionButton>
      <ActionButton type="button" disabled={read.loading} onClick={read.refresh}>Atualizar contas</ActionButton>
    </form>
    {read.error ? <Notice error>{read.error} <ActionButton onClick={read.refresh}>Consultar contas novamente</ActionButton></Notice> : null}
    {read.loading ? <Notice>Consultando contas globais…</Notice> : null}
    {read.queriedAt ? <p className="hca-muted">{read.loading || read.error ? "Última consulta preservada; alterações aguardam atualização." : "Contas consultadas:"} {formatBrazilDate(read.queriedAt)}.</p> : null}
    <div className="hca-records">{rows.map(row => <article key={row.id} data-profile-id={row.id} className="hca-record"><div className="hca-record-main"><h3>{row.full_name}</h3><small>{row.global_scope ? "Privilégio global" : "Sem privilégio global"} · {accountRoleLabel(row.role)}</small></div><Pill tone={row.status === "active" ? "success" : "neutral"}>{row.status === "active" ? "Ativa" : "Revogada"}</Pill><ActionButton disabled={unavailable} aria-label={"Editar conta " + row.full_name} onClick={event => setEditor({ row, opener: event.currentTarget })}>Editar</ActionButton></article>)}</div>
    {read.data && !read.loading && !read.error && !rows.length ? <p>Nenhuma conta corresponde à busca.</p> : null}
    {read.data ? <nav className="hca-toolbar" aria-label="Páginas das contas globais">
      <ActionButton disabled={page <= 1 || unavailable} onClick={() => navigate(query, page - 1)}>Contas anteriores</ActionButton>
      <span>Página {page} · {read.data.total} contas</span>
      <ActionButton disabled={page * 30 >= read.data.total || unavailable} onClick={() => navigate(query, page + 1)}>Próxima página de contas</ActionButton>
    </nav> : null}
    {editor ? <RecordDrawer title="Editar conta global" onClose={() => setEditor(null)} busy={busy} restoreFocusTo={editor.opener}>{error ? <Notice error>{error}</Notice> : null}<form className="hca-form" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); setReview({ action: "profile", userId: editor.row.id, fullName: form.get("fullName"), role: form.get("role"), status: form.has("isActive") ? "active" : "revoked", globalScope: form.has("globalScope") }); }}><Field name="fullName" label="Nome da conta" value={text(editor.row, "full_name")} required /><FormField label="Papel global"><SelectField name="role" defaultValue={text(editor.row, "role")}>{!Object.hasOwn(accountRoles, text(editor.row, "role")) ? <option value={text(editor.row, "role")}>Classificação atual não reconhecida</option> : null}{Object.entries(accountRoles).map(([role, label]) => <option key={role} value={role}>{label}</option>)}</SelectField></FormField><Check name="isActive" label="Conta ativa" checked={editor.row.status === "active"} /><Check name="globalScope" label="Privilégio global" checked={bool(editor.row, "global_scope")} /><p className="hca-field-hint">O último administrador global ativo permanece protegido pelo banco.</p><ActionButton type="submit" variant="primary">Revisar alteração</ActionButton></form></RecordDrawer> : null}
    <Dialog open={Boolean(review)} title="Revisar conta global" onClose={() => { if (!busy) setReview(null); }}>{review ? <><p><strong>{String(review.fullName)}</strong></p><dl className="hca-change-summary"><dt>Papel global</dt><dd>{accountRoleLabel(review.role)}</dd><dt>Conta</dt><dd>{review.status === "active" ? "Ativa" : "Revogada"}</dd><dt>Privilégio global</dt><dd>{review.globalScope ? "Habilitado" : "Desabilitado"}</dd></dl>{error ? <Notice error>{error}</Notice> : null}<div className="hca-toolbar"><ActionButton disabled={busy} onClick={() => setReview(null)}>Voltar</ActionButton><ActionButton variant="primary" disabled={busy} onClick={async () => { if (await save(review, "Conta global atualizada.", true)) { setReview(null); setEditor(null); read.refresh(); } }}>Confirmar conta global</ActionButton></div></> : null}</Dialog>
  </section>;
}
