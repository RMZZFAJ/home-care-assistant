"use client";
import { FormField, TextAreaField, TextInput } from "@/components/ui/controls";
import { MaterialConsultButton } from "@/components/documents/catalogue-material-panel";

import type { CatalogProduct } from "@/types/documents";
import type { WorkspaceContext } from "@/types/workspace";
import { BalanceMaterials } from "./balance-materials";
export function BalanceCountFields({ context, products, counts, errors, notes, onCount, onNotes, onLink, linkedCount }: {
  context: WorkspaceContext;
  products: CatalogProduct[];
  counts: Record<string,string>;
  errors: Record<string,string>;
  notes: string;
  onCount: (id: string, value: string) => void;
  onNotes: (value: string) => void;
  onLink: (material: CatalogProduct, returnFocus: () => HTMLButtonElement | null) => void;
  linkedCount: (id: string) => number;
}) {
  return <div className="hca-form-stack">
    {products.map(product => {
      const links = linkedCount(product.id);
      return <div className="hca-count-row" key={product.id} data-product={product.id}>
        <div className="flex items-start gap-2.5">
          <div className="min-w-0 flex-1">
            <FormField label={`${product.name} · ${product.unit}`} error={errors[product.id]}>
              <TextInput value={counts[product.id] ?? ""} inputMode={product.quantity_decimals ? "decimal" : "numeric"}
                autoComplete="off" aria-required maxLength={24} placeholder="Quantidade física"
                onChange={event => onCount(product.id, event.currentTarget.value)} />
            </FormField>
            {links ? <small>{links} {links === 1 ? "ficha vinculada" : "fichas vinculadas"}</small> : null}
          </div>
          <MaterialConsultButton context={context} material={product} menu onLink={returnFocus => onLink(product, returnFocus)} />
        </div>
      </div>;
    })}
    <FormField label="Observações da contagem">
      <TextAreaField value={notes} onChange={event => onNotes(event.currentTarget.value)} maxLength={2000} />
    </FormField>
  </div>;
}
export function BalanceReviewRows({ products, counts, reference }: { products: CatalogProduct[]; counts: Record<string,string>; reference: Record<string,string> }) {
  return <BalanceMaterials rows={products.map(p => ({ id: p.id, name: p.name, unit: p.unit, counted: counts[p.id], reference: reference[p.id] }))} />;
}
