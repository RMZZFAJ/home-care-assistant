"use client";
import { useState, type ReactNode } from "react";
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeading, DataTableRow } from "@/components/ui/controls";
import { ActionButton, TextInput } from "@/components/ui/controls";
import { Icon } from "@/components/ui/primitives";
import { normalizeCatalogText } from "@/lib/catalog-match";

export function DocumentMaterialsTable({ label, heading, columns, rows }: {
  label: string; heading: ReactNode; columns: readonly { id: string; label: string }[];
  rows: { id: string; searchText: string; cells: Record<string, ReactNode> }[];
}) {
  const [query, setQuery] = useState("");
  const visible = rows.filter(row => normalizeCatalogText(row.searchText).includes(normalizeCatalogText(query)));
  return <div className="hca-document-materials">
    <div className="hca-materials-toolbar"><div>{heading}</div><div className="hca-materials-search"><Icon name="search" /><TextInput type="search" aria-label="Pesquisar material" placeholder="Pesquisar material" value={query} maxLength={160} onChange={event => setQuery(event.currentTarget.value)} /></div></div>
    {query ? <div className="hca-toolbar"><p role="status">{visible.length} de {rows.length} materiais nesta busca.</p><ActionButton onClick={() => setQuery("")}>Limpar busca de materiais</ActionButton></div> : null}
    {!visible.length ? <p>Nenhum material nesta busca. Ajuste ou limpe a consulta.</p> : <div className="hca-document-materials-table" tabIndex={0} role="region" aria-label={label + "; rolagem horizontal quando necessária"}>
    <DataTable className="hca-table hca-mobile-records" aria-label={label}>
      <DataTableHead><DataTableRow>{columns.map(column => <DataTableHeading key={column.id} scope="col">{column.label}</DataTableHeading>)}</DataTableRow></DataTableHead>
      <DataTableBody>{visible.map(row => <DataTableRow key={row.id} data-material-line-id={row.id}>
        {columns.map(column => <DataTableCell key={column.id} data-label={column.id === columns[0]?.id ? undefined : column.label}>{row.cells[column.id]}</DataTableCell>)}
      </DataTableRow>)}</DataTableBody>
    </DataTable>
    </div>}
  </div>;
}
