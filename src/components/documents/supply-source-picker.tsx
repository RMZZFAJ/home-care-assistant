"use client";

import { useCallback, useId, useState } from "react";
import { ActionButton, FormField, TextInput } from "@/components/ui/controls";
import { Dialog } from "@/components/ui/overlays";
import { Icon } from "@/components/ui/icon";
import { Notice } from "@/components/workspace";
import { useScopedRead } from "@/lib/use-scoped-read";
import { formatBrazilDate } from "@/lib/receipt";
import { documentStatuses } from "@/types/documents";
import { parseSupplySources, supplySourceFilter, type SupplySourceOption } from "@/lib/validation/supply-sources";
import { RelatedDocument } from "./related-document";

export type SupplySourceSelection = { option: SupplySourceOption; importMaterials: boolean };

export function SupplySourcePicker({ patientId, target, current, product, onClose, onApply }: {
  patientId: string;
  target: "COM" | "ENT";
  current: SupplySourceSelection[];
  product?: { id: string; name: string };
  onClose: () => void;
  onApply: (selection: SupplySourceSelection[]) => void;
}) {
  const importGroupId = useId();
  const [filter, setFilter] = useState<(typeof supplySourceFilter.options)[number]>("");
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(current);
  const params = new URLSearchParams({ careRecipientId: patientId, target, type: filter, search: term, page: String(page) });
  if (product) params.set("productId", product.id);
  const decode = useCallback((value: unknown) => parseSupplySources(value, patientId, target, page), [patientId, target, page]);
  const read = useScopedRead("/api/documents/sources?" + params, "", decode);
  const title = product ? "Vincular este material" : "Vincular fichas";
  const subtitle = product
    ? "Selecione as fichas relacionadas a este material."
    : "Marque as fichas de origem. Em cada uma, escolha se deseja trazer os materiais.";
  return <Dialog open title={title} kicker={product?.name ?? (target === "COM" ? "Compra" : "Entrega")} subtitle={subtitle}
    onClose={onClose} keyboardScrollable
    footer={<><ActionButton onClick={onClose}>Voltar</ActionButton>
      <ActionButton variant="primary" onClick={() => onApply(selected)}>
        <Icon name="check" />Aplicar vínculos
      </ActionButton></>}>
    <div className="hca-form-stack">
      <div className="hca-source-filters" role="group" aria-label="Filtrar por tipo de ficha">
        {supplySourceFilter.options.map((kind) => <ActionButton compact key={kind} aria-pressed={filter === kind}
          onClick={() => { setFilter(kind); setPage(1); }}>{kind || "Tudo"}</ActionButton>)}
      </div>
      {term || search || (read.data?.total ?? 0) > 20 ? <form className="hca-source-search" onSubmit={(event) => { event.preventDefault(); setTerm(search.trim()); setPage(1); }}>
        <FormField label="Buscar pelo código da ficha">
          <TextInput maxLength={100} value={search} onChange={(event) => setSearch(event.target.value)} />
        </FormField>
        <ActionButton type="submit"><Icon name="search" />Buscar</ActionButton>
      </form> : null}
      {read.loading ? <p role="status">Consultando fichas de origem…</p> : read.error ? (
        <Notice error>{read.error} <ActionButton onClick={read.refresh}>Tentar novamente</ActionButton></Notice>
      ) : !read.data?.data.length ? <p role="status">Nenhuma ficha disponível para este vínculo.</p> : (
        <div className="hca-source-results">
          {read.data.data.map((option) => {
            const chosen = selected.find((selection) => selection.option.id === option.id);
            const count = new Set(option.materials.map((material) => material.productId)).size;
            const importId = `${importGroupId}-${option.id}`;
            return <article className="hca-source-result" key={option.id}>
              <div>
                <input type="checkbox" aria-label={`Vincular ${option.code}`} checked={Boolean(chosen)} onChange={(event) => {
                  const checked = event.target.checked;
                  setSelected((list) => checked
                    ? [...list, { option, importMaterials: false }]
                    : list.filter((row) => row.option.id !== option.id));
                }} />
                <div>
                  <RelatedDocument compact id={option.id} type={option.type} label={option.code} />
                  <small>{documentStatuses[option.status] ?? option.status} · {formatBrazilDate(option.createdAt)}</small>
                </div>
              </div>
              {chosen && !product ? <label className="hca-source-import" htmlFor={importId}>
                <input id={importId} type="checkbox" aria-labelledby={`${importId}-label`} checked={chosen.importMaterials} disabled={!count} onChange={(event) => {
                  const importMaterials = event.target.checked;
                  setSelected((list) => list.map((row) => row.option.id === option.id
                    ? { option, importMaterials } : row));
                }} />
                <span id={`${importId}-label`}><strong>Importar materiais</strong>
                  <small>{count ? `${count} ${count === 1 ? "material elegível" : "materiais elegíveis"}` : "Nenhum material elegível agora."}</small>
                </span>
              </label> : null}
            </article>;
          })}
        </div>
      )}
      {!read.loading && read.data && read.data.total > 20 ? (
        <nav className="hca-toolbar" aria-label="Paginação de fichas de origem">
          <ActionButton disabled={page === 1} onClick={() => setPage(page - 1)}>Anterior</ActionButton>
          <span>Página {page}</span>
          <ActionButton disabled={page * 20 >= read.data.total} onClick={() => setPage(page + 1)}>Próxima</ActionButton>
        </nav>
      ) : null}
    </div>
  </Dialog>;
}
