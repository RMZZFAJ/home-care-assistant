"use client";
import { ActionButton, DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeading, DataTableRow, Pill, SelectField, TextInput } from "@/components/ui/controls";
import { useRef, useState } from "react";

import { EmptyState, Icon } from "@/components/ui/primitives";
import { CataloguePreparationEditor } from "./catalogue-preparation-editor";
import { text, bool, type Row } from "./admin-fields";
import { CatalogueIdentityManagement } from "@/components/catalog/catalogue-identity-management";

export function CatalogueManagement({
  writable,
  rows,
  userId,
  globalMode,
  loading,
  patientId,
  onIdentitySaved,
}: {
  writable: boolean;
  rows: Row[];
  userId: string;
  globalMode: boolean;
  loading: boolean;
  patientId: string;
  onIdentitySaved: (message: string) => Promise<void>;
}) {
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
  return (
    <section>
      <div className="hca-section-heading">
        <div>
          <h2 ref={headingRef} tabIndex={-1}>
            Catálogo do paciente
          </h2>
          <p>
            {rows.length} produtos cadastrados · aquisição e controle da família
          </p>
        </div>
        {writable ? (
          <div className="hca-toolbar">
            <ActionButton

              variant="primary"
              onClick={(event) =>
                setEditor({
                  row: null,
                  mode: "product",
                  opener: event.currentTarget,
                })
              }
            >{<Icon name="plus" />}
              Novo item
            </ActionButton>
            <ActionButton
              onClick={(event) =>
                setEditor({
                  row: null,
                  mode: "model",
                  opener: event.currentTarget,
                })
              }
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
          onSaved={onIdentitySaved}
          restoreFocusFallbackRef={headingRef}
        />
      ) : null}
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
              {filtered.length} resultados
            </span>
          </div>
          <div className="hca-records hca-table-container">
            <DataTable className="hca-table" aria-label="Produtos do catálogo">
              <DataTableHead>
                <DataTableRow>
                  <DataTableHeading>Produto</DataTableHeading>
                  <DataTableHeading>Categoria / unidade</DataTableHeading>
                  <DataTableHeading>Situação</DataTableHeading>
                  <DataTableHeading>
                    <span className="sr-only">Ações</span>
                  </DataTableHeading>
                </DataTableRow>
              </DataTableHead>
              <DataTableBody>
                {filtered.slice((page - 1) * 15, page * 15).map((row) => (
                  <DataTableRow key={text(row, "id")}>
                    <DataTableCell>
                      <strong>{text(row, "name")}</strong>
                    </DataTableCell>
                    <DataTableCell>
                      {text(row, "category")}
                      <small className="hca-cell-secondary">
                        {text(row, "unit")}
                      </small>
                    </DataTableCell>
                    <DataTableCell>
                      <Pill

                        tone={active(row) ? "success" : "neutral"}
                      >
                        {active(row) ? "Ativo" : "Inativo"}
                      </Pill>
                    </DataTableCell>
                    <DataTableCell>
                      <ActionButton
                        variant="quiet"
                        aria-label={"Editar " + text(row, "name")}
                        onClick={(event) =>
                          setEditor({
                            row,
                            mode: "product",
                            opener: event.currentTarget,
                          })
                        }
                      >
                        Editar
                      </ActionButton>
                      <ActionButton
                        variant="quiet"
                        aria-label={"Situação e sucessor: " + text(row, "name")}
                        onClick={(event) =>
                          setIdentity({
                            id: text(row, "id"),
                            opener: event.currentTarget,
                          })
                        }
                      >
                        Situação e sucessor
                      </ActionButton>
                    </DataTableCell>
                  </DataTableRow>
                ))}
              </DataTableBody>
            </DataTable>
            {!loading && !filtered.length ? (
              <EmptyState title="Nenhum produto nesta seleção">
                Ajuste os filtros ou adicione um item ao catálogo.
              </EmptyState>
            ) : null}
          </div>
          {filtered.length > 15 ? (
            <nav className="hca-pagination" aria-label="Páginas do catálogo">
              <ActionButton
                disabled={page <= 1}
                onClick={() => setPage((value) => value - 1)}
              >
                Anterior
              </ActionButton>
              <span>
                Página {page} de {Math.ceil(filtered.length / 15)}
              </span>
              <ActionButton
                disabled={page * 15 >= filtered.length}
                onClick={() => setPage((value) => value + 1)}
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
              onSaved={onIdentitySaved}
            />
          ) : null}
        </>
      ) : null}
    </section>
  );
}
