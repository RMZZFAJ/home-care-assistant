"use client";
import { ActionButton, DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeading, DataTableRow, Pill, SelectField, TextInput } from "@/components/ui/controls";
import { TableFrame } from "@/components/ui/table-frame";
import { useCallback, useRef, useState } from "react";
import { useScopedRead } from "@/lib/use-scoped-read";
import { useLiveRevision } from "@/lib/use-live-revision";
import { parseCatalogueCollectionRead } from "@/lib/validation/catalogue-list";
import { formatBrazilDate } from "@/lib/receipt";
import { Notice } from "@/components/workspace";

import { EmptyState, Icon } from "@/components/ui/primitives";
import { CataloguePreparationEditor } from "./catalogue-preparation-editor";
import { text, bool, type Row } from "./admin-fields";
import { CatalogueIdentityManagement } from "@/components/catalog/catalogue-identity-management";

export function CatalogueManagement({
  writable,
  userId,
  globalMode,
  patientId,
  onIdentitySaved,
}: {
  writable: boolean;
  userId: string;
  globalMode: boolean;
  patientId: string;
  onIdentitySaved: (message: string) => Promise<void>;
}) {
  const revision = useLiveRevision();
  const decode = useCallback((value: unknown) => parseCatalogueCollectionRead(value, patientId), [patientId]);
  const read = useScopedRead("/api/admin?" + new URLSearchParams({ section: "catalog", careRecipientId: patientId }), String(revision), decode);
  const rows = read.data?.data ?? [], loading = read.loading;
  const unavailable = loading || Boolean(read.error) || !read.data;
  // Retained, authorized data may be revalidated while an action has focus.
  // Keep that focus, but never accept the action before the read finishes.
  const editAvailability = {
    disabled: !read.data || Boolean(read.error),
    "aria-disabled": unavailable || undefined,
  };
  async function saved(message: string) { await onIdentitySaved(message); read.refresh(); }
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("active");
  const [page, setPage] = useState(1);
  const [identity, setIdentity] = useState<{
    id: string;
    opener: HTMLElement;
  } | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  type Editor = {
    row: Row | null;
    mode: "product" | "model";
    opener: HTMLElement;
  };
  const [editor, setEditor] = useState<Editor | null>(null);
  const active = (row: Row) =>
    bool(row, "is_active", bool(row, "active", true));
  const filtered = rows.filter(
    (row) =>
      (!status || (status === "active") === active(row)) &&
      [
        row.name,
        row.category,
        row.unit,
        ...(Array.isArray(row.aliases) ? row.aliases : []),
      ]
        .join(" ")
        .toLocaleLowerCase("pt-BR")
        .includes(search.toLocaleLowerCase("pt-BR")),
  );
  const selectedPage = Math.min(page, Math.max(1, Math.ceil(filtered.length / 15)));
  return (
    <section>
      <div className="hca-section-heading">
        <div>
          <h2 ref={headingRef} tabIndex={-1}>
            Catálogo do paciente
          </h2>
          <p>
            {read.data ? `${rows.length} produtos cadastrados` : "Total de produtos ainda não confirmado"} · aquisição e controle da família
          </p>
        </div>
        {writable ? (
          <div className="hca-toolbar">
            <ActionButton
              {...editAvailability}

              variant="primary"
              onClick={(event) => {
                if (unavailable) return;
                setEditor({
                  row: null,
                  mode: "product",
                  opener: event.currentTarget,
                });
              }}
            >{<Icon name="plus" />}
              Novo item
            </ActionButton>
            <ActionButton
              {...editAvailability}
              onClick={(event) => {
                if (unavailable) return;
                setEditor({
                  row: null,
                  mode: "model",
                  opener: event.currentTarget,
                });
              }}
            >
              Adotar modelo
            </ActionButton>
          </div>
        ) : null}
      </div>
      {identity ? (
        <CatalogueIdentityManagement
          userId={userId}
          writable={writable}
          patientId={patientId}
          productId={identity.id}
          products={rows.map((row) => ({
            id: text(row, "id"),
            name: text(row, "name"),
            unit: text(row, "unit"),
          }))}
          opener={identity.opener}
          onClose={() => setIdentity(null)}
          onSaved={saved}
          restoreFocusFallbackRef={headingRef}
        />
      ) : null}
      {read.error ? <Notice error>{read.error} <ActionButton onClick={read.refresh}>Consultar catálogo novamente</ActionButton></Notice> : null}
      {loading ? <Notice>Consultando catálogo…</Notice> : null}
      {read.queriedAt ? <p className="hca-muted">{loading || read.error ? "Última consulta preservada; alterações aguardam atualização." : "Catálogo consultado:"} {formatBrazilDate(read.queriedAt)}.</p> : null}
      {writable ? (
        <>
          <div className="hca-toolbar">
            <TextInput
              type="search"
              aria-label="Pesquisar catálogo"
              placeholder="Nome, categoria ou unidade"
              leading={<Icon name="search" />}
              value={search}
              onChange={controlEvent => { const controlValue = controlEvent.currentTarget.value;
                setSearch(controlValue);
                setPage(1);
               }}
            />
            <SelectField
              aria-label="Situação dos produtos"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
            >
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
              <option value="">Todos</option>
            </SelectField>
            <span className="hca-result-count" role="status">
              {read.data ? `${filtered.length} resultados` : "Resultados ainda não confirmados"}
            </span>
          </div>
          <TableFrame label="Produtos do catálogo">
            <DataTable className="hca-table hca-mobile-records" aria-label="Produtos do catálogo">
              <DataTableHead>
                <DataTableRow>
                  <DataTableHeading>Produto</DataTableHeading>
                  <DataTableHeading scope="col">Categoria</DataTableHeading>
                  <DataTableHeading scope="col">Unidade</DataTableHeading>
                  <DataTableHeading>Situação</DataTableHeading>
                  <DataTableHeading>
                    <span className="sr-only">Ações</span>
                  </DataTableHeading>
                </DataTableRow>
              </DataTableHead>
              <DataTableBody>
                {filtered.slice((selectedPage - 1) * 15, selectedPage * 15).map((row) => (
                  <DataTableRow key={text(row, "id")} data-product-id={text(row, "id")}>
                    <DataTableCell>
                      <strong>{text(row, "name")}</strong>
                      <small>{Array.isArray(row.aliases) && row.aliases.length ? row.aliases.join(", ") : "Sem nomes alternativos"}</small>
                    </DataTableCell>
                    <DataTableCell data-label="Categoria">{text(row,"category")}</DataTableCell>
                    <DataTableCell data-label="Unidade"><span>{text(row,"unit")}</span><small>Precisão {String(row.quantity_decimals)} casa(s)</small></DataTableCell>
                    <DataTableCell data-label="Situação">
                      <Pill

                        tone={active(row) ? "success" : "neutral"}
                      >
                        {active(row) ? "Ativo" : "Inativo"}
                      </Pill>
                    </DataTableCell>
                    <DataTableCell data-label="Ações">
                      <ActionButton
                        {...editAvailability}
                        variant="quiet"
                        aria-label={"Editar " + text(row, "name")}
                        onClick={(event) => {
                          if (unavailable) return;
                          setEditor({
                            row,
                            mode: "product",
                            opener: event.currentTarget,
                          });
                        }}
                      >
                        Editar
                      </ActionButton>
                      <ActionButton
                        {...editAvailability}
                        variant="quiet"
                        aria-label={"Situação e sucessor: " + text(row, "name")}
                        onClick={(event) => {
                          if (unavailable) return;
                          setIdentity({
                            id: text(row, "id"),
                            opener: event.currentTarget,
                          });
                        }}
                      >
                        Situação e sucessor
                      </ActionButton>
                    </DataTableCell>
                  </DataTableRow>
                ))}
              </DataTableBody>
            </DataTable>
            {read.data && !loading && !read.error && !filtered.length ? (
              <EmptyState title="Nenhum produto nesta seleção">
                Ajuste os filtros ou adicione um item ao catálogo.
              </EmptyState>
            ) : null}
          </TableFrame>
          {filtered.length > 15 ? (
            <nav className="hca-pagination" aria-label="Páginas do catálogo">
              <ActionButton
                disabled={selectedPage <= 1 || unavailable}
                onClick={() => setPage(selectedPage - 1)}
              >
                Anterior
              </ActionButton>
              <span>
                Página {selectedPage} de {Math.ceil(filtered.length / 15)}
              </span>
              <ActionButton
                disabled={selectedPage * 15 >= filtered.length || unavailable}
                onClick={() => setPage(selectedPage + 1)}
              >
                Próxima
              </ActionButton>
            </nav>
          ) : null}
          {editor ? (
            <CataloguePreparationEditor
              key={JSON.stringify([userId, patientId, globalMode, editor.mode, editor.row?.id])}
              patientId={patientId}
              userId={userId}
              mode={globalMode ? "global" : "patient"}
              purpose={editor.mode === "model" ? "adopt" : editor.row ? "edit" : "create"}
              targetId={editor.row ? text(editor.row, "id") : null}
              opener={editor.opener}
              headingRef={headingRef}
              onClose={() => setEditor(null)}
              onSaved={saved}
            />
          ) : null}
        </>
      ) : null}
    </section>
  );
}
