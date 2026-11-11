"use client";
import Link from "next/link";
import { ActionButton, DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeading, DataTableRow, TextInput } from "@/components/ui/controls";
import { useEffect, useState } from "react";
import {
  api,
  buttonClass,
  can,
  Notice,
  Workspace,
  type WorkspaceContext,
} from "../workspace";

import { Icon, EmptyState } from "@/components/ui/primitives";
import type { CatalogProduct } from "@/types/documents";
import { PresentationManagement } from "./presentation-management";
import type { MeasurementUnit } from "./catalogue-complementary-reference";
import { UnitPreparationEditor } from "./unit-preparation-editor";

export function UnitConsole() {
  return (
    <Workspace title="Unidades e apresentações">
      {(context) => (
        <Units key={JSON.stringify([context.userId, context.activeContext?.mode, context.patient?.id])} context={context} />
      )}
    </Workspace>
  );
}
function Units({ context }: { context: WorkspaceContext }) {
  const globalMode =
    context.activeContext?.mode === "global" &&
    context.globalAdministrationAllowed === true;
  const [search, setSearch] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [editor, setEditor] = useState<{
    mode: "unit" | "precision";
    opener: HTMLElement;
  } | null>(null);
  const [units, setUnits] = useState<MeasurementUnit[]>([]);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      api<{ data: MeasurementUnit[] }>("/api/units", undefined, controller.signal),
      context.patient && !globalMode
        ? api<{ data: CatalogProduct[] }>(
            "/api/catalog?careRecipientId=" + context.patient.id,
            undefined,
            controller.signal,
          )
        : Promise.resolve({ data: [] }),
    ])
      .then(([u, p]) => {
        if (controller.signal.aborted) return;
        setLoaded(true);
        setUnits(u.data);
        setProducts(p.data);
      })
      .catch((reason) => {
        if (!controller.signal.aborted) setError(reason.message);
      });
    return () => controller.abort();
  }, [context.patient, attempt, globalMode]);
  const writable = globalMode || can(context, "catalog.manage");
  const matches = units.filter(unit => (unit.name + " " + unit.code)
    .toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR")));
  return (
    <div className="space-y-5">
      {error ? <Notice error>{error}</Notice> : null}
      {message ? <Notice>{message}</Notice> : null}
      <section>
        <div className="hca-section-heading">
          <div>
            <h2>Unidades disponíveis</h2>
            <p className="hca-field-hint">
              Unidades base e precisão dos produtos.
            </p>
          </div>
          <div className="hca-toolbar">
            <Link className={buttonClass} href="/comprovantes-catalogo">Comprovantes do catálogo</Link>
            {globalMode || can(context, "catalog.manage") ? (
              <ActionButton
                variant="primary"

                onClick={(event) =>
                  setEditor({ mode: "unit", opener: event.currentTarget })
                }
              >{<Icon name="plus" />}
                Nova unidade
              </ActionButton>
            ) : null}
            {context.patient && can(context, "catalog.manage") ? (
              <ActionButton
                onClick={(event) =>
                  setEditor({
                    mode: "precision",
                    opener: event.currentTarget,
                  })
                }
              >
                Configurar unidade e precisão
              </ActionButton>
            ) : null}
          </div>
        </div>
        <div className="hca-toolbar">
          <TextInput
            type="search"
            leading={<Icon name="search" />}
            aria-label="Pesquisar unidades"
            value={search}
            onChange={controlEvent => { const controlValue = controlEvent.currentTarget.value; return setSearch(controlValue); }}
            placeholder="Nome ou código"
          />
        </div>
        {!loaded && !error ? <Notice>Carregando unidades…</Notice> : null}
        <div className="hca-records hca-table-container">
          <DataTable className="hca-table" aria-label="Unidades base">
            <DataTableHead>
              <DataTableRow>
                <DataTableHeading>Unidade</DataTableHeading>
                <DataTableHeading>Precisão</DataTableHeading>
                <DataTableHeading>Âmbito</DataTableHeading>
              </DataTableRow>
            </DataTableHead>
            <DataTableBody>
              {matches
                .map((unit) => (
                  <DataTableRow key={unit.id}>
                    <DataTableCell>
                      <strong>{unit.name}</strong>
                      <small className="hca-cell-secondary">{unit.code}</small>
                    </DataTableCell>
                    <DataTableCell>{unit.decimals} casa(s)</DataTableCell>
                    <DataTableCell>
                      {unit.care_recipient_id ? "Paciente" : "Global"}
                    </DataTableCell>
                  </DataTableRow>
                ))}
            </DataTableBody>
          </DataTable>
          {loaded && !matches.length ? (
            <EmptyState title={units.length ? "Nenhuma unidade encontrada" : "Nenhuma unidade disponível"} />
          ) : null}
        </div>
      </section>
      {editor ? <UnitPreparationEditor
        key={editor.mode}
        scope={{
          patientId: globalMode ? null : context.patient?.id ?? null,
          mode: globalMode ? "global" : "patient",
          purpose: editor.mode === "unit" ? "unit_create" : "unit_configure",
          targetId: null,
        }}
        userId={context.userId}
        opener={editor.opener}
        products={products}
        writable={writable}
        onClose={() => setEditor(null)}
        onSaved={result => { setMessage(result); setAttempt(value => value + 1); }}
      /> : null}
      {context.patient && !globalMode ? (
        <PresentationManagement
          userId={context.userId}
          patientId={context.patient.id}
          writable={can(context, "catalog.manage")}
        />
      ) : null}
    </div>
  );
}
