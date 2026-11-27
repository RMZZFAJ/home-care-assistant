"use client";
import { ActionButton, FormField, TextInput } from "@/components/ui/controls";
import { MaterialConsultButton } from "@/components/documents/catalogue-material-panel";
import { balanceCatalogueMatches } from "@/lib/balances/count-materials";
import { formatQuantity, quantity, validQuantity } from "@/lib/quantity";
import type { BalanceCountExtra } from "@/lib/validation/balance-count-extras";

import type { CatalogProduct } from "@/types/documents";
import type { WorkspaceContext } from "@/types/workspace";
import { BalanceMaterials } from "./balance-materials";
export function BalanceCountFields({ context, products, counts, errors, reference, onCount, onLink, linkedCount }: {
  context: WorkspaceContext;
  products: CatalogProduct[];
  counts: Record<string,string>;
  errors: Record<string,string>;
  reference: Record<string,string>;
  onCount: (id: string, value: string) => void;
  onLink: (material: CatalogProduct, returnFocus: () => HTMLButtonElement | null) => void;
  linkedCount: (id: string) => number;
}) {
  return <div className="hca-form-stack">
    {products.map(product => {
      const links = linkedCount(product.id);
      const expected = reference[product.id];
      const count = counts[product.id] ?? "";
      const delta = expected !== undefined && validQuantity(count, product.quantity_decimals ?? 0, true)
        ? quantity(count).minus(expected) : null;
      return <div className="hca-count-row" key={product.id} data-product={product.id}>
        <div className="flex items-start gap-2.5">
          <div className="min-w-0 flex-1">
            <FormField label={`${product.name} · ${product.unit}`} error={errors[product.id]}>
              <TextInput value={counts[product.id] ?? ""} inputMode={product.quantity_decimals ? "decimal" : "numeric"}
                autoComplete="off" aria-required maxLength={24} placeholder="Quantidade física"
                onChange={event => onCount(product.id, event.currentTarget.value)} />
            </FormField>
            <p className="hca-muted">Referência {expected === undefined ? "indisponível" : formatQuantity(expected, product.unit)}
              {delta ? ` · ${delta.isZero() ? "Sem diferença" : `Diferença ${formatQuantity(delta.toFixed(), product.unit)}`}` : ""}</p>
            {links ? <small>{links} {links === 1 ? "ficha vinculada" : "fichas vinculadas"}</small> : null}
          </div>
          <MaterialConsultButton context={context} material={product} menu onLink={returnFocus => onLink(product, returnFocus)} />
        </div>
      </div>;
    })}
  </div>;
}

export function BalanceExtraFields({ extras, catalogue, preservedIds, onChange, onUseCatalogue }: {
  extras: BalanceCountExtra[];
  catalogue: CatalogProduct[];
  preservedIds: ReadonlySet<string>;
  onChange: (extras: BalanceCountExtra[]) => void;
  onUseCatalogue: (extraId: string, product: CatalogProduct) => void;
}) {
  const update = (id: string, fields: Partial<BalanceCountExtra>) =>
    onChange(extras.map(extra => extra.id === id ? { ...extra, ...fields } : extra));
  return <section className="hca-form-stack" aria-label="Itens extras contados">
    <div className="hca-section-heading"><div><h2>Itens extras</h2>
      <p>Registre materiais encontrados com a equipe que ainda não fazem parte do catálogo.</p></div>
      <ActionButton disabled={extras.length >= 20} onClick={() => onChange([...extras, {
        id: crypto.randomUUID(), name: "", unit: "", quantity: "",
      }])}>Incluir item extra</ActionButton>
    </div>
    {!extras.length ? <p className="hca-muted">Nenhum item extra.</p> : null}
    {extras.map((extra, index) => {
      const matches = balanceCatalogueMatches(extra.name, catalogue);
      const preserved = preservedIds.has(extra.id);
      return <fieldset className="hca-count-row hca-form-stack" key={extra.id}>
        <legend>Item extra {index + 1}</legend>
        <FormField label="Nome do item extra" required>
          <TextInput maxLength={200} value={extra.name} readOnly={preserved} onChange={event => update(extra.id, { name: event.currentTarget.value })} />
        </FormField>
        <div className="hca-compact-grid">
          <FormField label="Unidade do item extra" required>
            <TextInput maxLength={80} value={extra.unit} readOnly={preserved} onChange={event => update(extra.id, { unit: event.currentTarget.value })} />
          </FormField>
          <FormField label="Quantidade contada" required>
            <TextInput maxLength={24} inputMode="decimal" value={extra.quantity} onChange={event => update(extra.id, { quantity: event.currentTarget.value })} />
          </FormField>
        </div>
        {matches.length ? <div className="hca-form-stack"><p>Este material consta no catálogo. Faça a contagem na categoria correspondente.</p>
          {matches.map(product => <ActionButton key={product.id} onClick={() => onUseCatalogue(extra.id, product)}>Contar {product.name} no catálogo</ActionButton>)}
        </div> : null}
        {!preserved ? <ActionButton variant="quiet" onClick={() => onChange(extras.filter(item => item.id !== extra.id))}>Remover item extra {index + 1}</ActionButton> : null}
      </fieldset>;
    })}
  </section>;
}
export function BalanceReviewRows({ products, counts, reference }: { products: CatalogProduct[]; counts: Record<string,string>; reference: Record<string,string> }) {
  return <BalanceMaterials rows={products.map(p => ({ id: p.id, name: p.name, unit: p.unit, counted: counts[p.id], reference: reference[p.id] }))} />;
}
