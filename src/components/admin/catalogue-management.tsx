"use client";
import { useState } from "react";
import { Badge, Button, Field as FluentField, Input, Select, Table, TableBody, TableCell, TableHeader, TableHeaderCell, TableRow } from "@fluentui/react-components";
import { Notice } from "@/components/workspace";
import { EmptyState, Icon } from "@/components/ui/primitives";
import { RecordDrawer } from "@/components/forms/record-drawer";
import { Field, Check, text, bool, type Row } from "./admin-fields";

export function CatalogueManagement({ rows, templates, save, busy, error, loading }: {
  rows: Row[]; templates: Row[]; save: (payload: Row, message: string) => Promise<unknown>; busy: boolean; error: string; loading: boolean;
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("active");
  const [page, setPage] = useState(1);
  const [editor, setEditor] = useState<{ row: Row | null; mode: "product" | "model"; opener: HTMLElement } | null>(null);
  const active = (row: Row) => bool(row, "is_active", bool(row, "active", true));
  const filtered = rows.filter((row) => (!status || (status === "active") === active(row)) && [row.name, row.category, row.unit, ...(Array.isArray(row.aliases) ? row.aliases : [])].join(" ").toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR")));
  const editing = editor?.row;
  return <section>
    <div className="hca-section-heading"><div><h2>Catálogo do paciente</h2><p>{rows.length} produtos cadastrados · aquisição e controle da família</p></div><div className="hca-toolbar"><Button icon={<Icon name="plus" />} appearance="primary" onClick={(event) => setEditor({ row: null, mode: "product", opener: event.currentTarget })}>Novo item</Button><Button onClick={(event) => setEditor({ row: null, mode: "model", opener: event.currentTarget })}>Adotar modelo</Button></div></div>
    <div className="hca-toolbar"><Input type="search" aria-label="Pesquisar catálogo" placeholder="Nome, categoria ou unidade" contentBefore={<Icon name="search" />} value={search} onChange={(_, data) => { setSearch(data.value); setPage(1); }} /><Select aria-label="Situação dos produtos" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="active">Ativos</option><option value="inactive">Inativos</option><option value="">Todos</option></Select><span className="hca-result-count" role="status">{filtered.length} resultados</span></div>
    <div className="hca-records hca-table-container"><Table className="hca-table" aria-label="Produtos do catálogo"><TableHeader><TableRow><TableHeaderCell>Produto</TableHeaderCell><TableHeaderCell>Categoria / unidade</TableHeaderCell><TableHeaderCell>Situação</TableHeaderCell><TableHeaderCell><span className="sr-only">Ações</span></TableHeaderCell></TableRow></TableHeader><TableBody>{filtered.slice((page - 1) * 15, page * 15).map((row) => <TableRow key={text(row, "id")}><TableCell><strong>{text(row, "name")}</strong></TableCell><TableCell>{text(row, "category")}<small className="hca-cell-secondary">{text(row, "unit")}</small></TableCell><TableCell><Badge appearance="tint" color={active(row) ? "success" : "informative"}>{active(row) ? "Ativo" : "Inativo"}</Badge></TableCell><TableCell><Button appearance="subtle" aria-label={"Editar " + text(row, "name")} onClick={(event) => setEditor({ row, mode: "product", opener: event.currentTarget })}>Editar</Button></TableCell></TableRow>)}</TableBody></Table>{!loading && !filtered.length ? <EmptyState title="Nenhum produto nesta seleção">Ajuste os filtros ou adicione um item ao catálogo.</EmptyState> : null}</div>
    {filtered.length > 15 ? <nav className="hca-pagination" aria-label="Páginas do catálogo"><Button disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Anterior</Button><span>Página {page} de {Math.ceil(filtered.length / 15)}</span><Button disabled={page * 15 >= filtered.length} onClick={() => setPage((value) => value + 1)}>Próxima</Button></nav> : null}
    {editor ? <RecordDrawer title={editor.mode === "model" ? "Adotar modelo existente" : editing ? "Editar item" : "Adicionar item exclusivo deste paciente"} busy={busy} onClose={() => setEditor(null)} restoreFocusTo={editor.opener}>
      {error ? <Notice error>{error}</Notice> : null}
      {editor.mode === "model" ? <form className="hca-form" onSubmit={async (event) => { event.preventDefault(); const result = await save({ action: "adoptProduct", productId: new FormData(event.currentTarget).get("productId") }, "Modelo adicionado ao catálogo deste paciente."); if (result) setEditor(null); }}><p>A cópia será editável apenas neste paciente.</p><FluentField label="Produto modelo"><Select name="productId" required><option value="">Selecione</option>{templates.map((row) => <option key={text(row, "id")} value={text(row, "id")}>{text(row, "name")} · {text(row, "unit")}</option>)}</Select></FluentField><Button appearance="primary" disabled={busy} type="submit">Adotar modelo</Button></form> : <form className="hca-form" onSubmit={async (event) => { event.preventDefault(); const data = new FormData(event.currentTarget); const result = await save({ action: "product", id: editing ? text(editing, "id") : null, name: data.get("name"), category: data.get("category"), unit: data.get("unit"), description: data.get("description"), aliases: String(data.get("aliases") ?? "").split(",").map((alias) => alias.trim()).filter(Boolean), sortOrder: Number(data.get("sortOrder")), isActive: data.has("isActive") }, "Item salvo e auditado."); if (result) setEditor(null); }}>
        <Field name="name" label="Nome" value={editing ? text(editing, "name") : ""} required />
        <FluentField label="Categoria"><Select name="category" defaultValue={editing ? text(editing, "category") : "medicamentos"}><option value="medicamentos">Medicamentos</option><option value="higiene">Higiene</option><option value="dieta">Dieta</option></Select></FluentField>
        <Field name="unit" label="Unidade" value={editing ? text(editing, "unit") : "unidade"} required />
        <Field name="aliases" label="Nomes alternativos, separados por vírgula" value={editing && Array.isArray(editing.aliases) ? editing.aliases.join(", ") : ""} />
        <Field name="description" label="Descrição operacional" value={editing ? text(editing, "description") : ""} />
        <Field name="sortOrder" label="Ordem" type="number" value={editing ? Number(editing.sort_order ?? 0) : 0} />
        <Check name="isActive" label="Item ativo" checked={editing ? active(editing) : true} />
        <p className="hca-field-hint">A unidade de itens com histórico é preservada. Para outra unidade, cadastre um novo item.</p><Button type="submit" disabled={busy} appearance="primary">Salvar item</Button>
      </form>}
    </RecordDrawer> : null}
  </section>;
}
