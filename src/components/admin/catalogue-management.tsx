"use client";
import { ActionButton, DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeading, DataTableRow, FormField, Pill, SelectField, TextInput } from "@/components/ui/controls";
import { useRef, useState, type ReactNode } from "react";

import { Notice } from "@/components/workspace";
import { EmptyState, Icon } from "@/components/ui/primitives";
import { RecordDrawer } from "@/components/forms/record-drawer";
import { Field, Check, text, bool, type Row } from "./admin-fields";
import { CatalogueIdentityManagement } from "@/components/catalog/catalogue-identity-management";

export function CatalogueManagement({
  writable,
  rows,
  templates,
  save,
  busy,
  error,
  recovery,
  confirmationRevision = 0,
  loading,
  patientId,
  onIdentitySaved,
}: {
  writable: boolean;
  rows: Row[];
  templates: Row[];
  save: (payload: Row, message: string) => Promise<unknown>;
  busy: boolean;
  error: string;
  recovery?: ReactNode;
  confirmationRevision?: number;
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
  const [editorState, setEditorState] = useState<(Editor & { revision: number }) | null>(null);
  const editor = editorState?.revision === confirmationRevision ? editorState : null;
  const setEditor = (value: Editor | null) => setEditorState(value ? { ...value, revision: confirmationRevision } : null);
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
  const editing = editor?.row;
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
            <RecordDrawer
              title={
                editor.mode === "model"
                  ? "Adotar modelo existente"
                  : editing
                    ? "Editar item"
                    : "Adicionar item exclusivo deste paciente"
              }
              busy={busy}
              recovery={recovery}
              onClose={() => setEditor(null)}
              restoreFocusTo={editor.opener}
              restoreFocusFallbackRef={headingRef}
            >
              {error ? <Notice error>{error}</Notice> : null}
              {editor.mode === "model" ? (
                <form
                  className="hca-form"
                  onSubmit={async (event) => {
                    event.preventDefault();
                    const result = await save(
                      {
                        action: "adoptProduct",
                        productId: new FormData(event.currentTarget).get(
                          "productId",
                        ),
                      },
                      "Modelo adicionado ao catálogo deste paciente.",
                    );
                    if (result) setEditorState(current => current === editor ? null : current);
                  }}
                >
                  <p>A cópia será editável apenas neste paciente.</p>
                  <FormField label="Produto modelo">
                    <SelectField name="productId" required>
                      <option value="">Selecione</option>
                      {templates.map((row) => (
                        <option key={text(row, "id")} value={text(row, "id")}>
                          {text(row, "name")} · {text(row, "unit")}
                        </option>
                      ))}
                    </SelectField>
                  </FormField>
                  <ActionButton variant="primary" disabled={busy} type="submit">
                    Adotar modelo
                  </ActionButton>
                </form>
              ) : (
                <form
                  className="hca-form"
                  onSubmit={async (event) => {
                    event.preventDefault();
                    const data = new FormData(event.currentTarget);
                    const result = await save(
                      {
                        action: "product",
                        id: editing ? text(editing, "id") : null,
                        name: data.get("name"),
                        category: data.get("category"),
                        unit: data.get("unit"),
                        description: data.get("description"),
                        aliases: String(data.get("aliases") ?? "")
                          .split(",")
                          .map((alias) => alias.trim())
                          .filter(Boolean),
                        sortOrder: Number(data.get("sortOrder")),
                        isActive: data.has("isActive"),
                      },
                      "Item salvo e auditado.",
                    );
                    if (result) setEditorState(current => current === editor ? null : current);
                  }}
                >
                  <Field
                    name="name"
                    label="Nome"
                    value={editing ? text(editing, "name") : ""}
                    required
                  />
                  <FormField label="Categoria">
                    <SelectField
                      name="category"
                      defaultValue={
                        editing ? text(editing, "category") : "medicamentos"
                      }
                    >
                      <option value="medicamentos">Medicamentos</option>
                      <option value="higiene">Higiene</option>
                      <option value="dieta">Dieta</option>
                    </SelectField>
                  </FormField>
                  <Field
                    name="unit"
                    label="Unidade"
                    value={editing ? text(editing, "unit") : "unidade"}
                    required
                  />
                  <Field
                    name="aliases"
                    label="Nomes alternativos, separados por vírgula"
                    value={
                      editing && Array.isArray(editing.aliases)
                        ? editing.aliases.join(", ")
                        : ""
                    }
                  />
                  <Field
                    name="description"
                    label="Descrição operacional"
                    value={editing ? text(editing, "description") : ""}
                  />
                  <Field
                    name="sortOrder"
                    label="Ordem"
                    type="number"
                    min={0}
                    max={1_000_000}
                    step={1}
                    required
                    value={editing ? Number(editing.sort_order ?? 0) : 0}
                  />
                  <Check
                    name="isActive"
                    label="Item ativo"
                    checked={editing ? active(editing) : true}
                  />
                  <p className="hca-field-hint">
                    A unidade de itens com histórico é preservada. Para outra
                    unidade, cadastre um novo item.
                  </p>
                  <ActionButton type="submit" disabled={busy} variant="primary">
                    Salvar item
                  </ActionButton>
                </form>
              )}
            </RecordDrawer>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
