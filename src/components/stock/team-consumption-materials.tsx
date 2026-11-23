"use client";

import { MaterialConsultButton } from "@/components/documents/catalogue-material-panel";
import { materialCategories, WizardMaterialCategories, type WizardMaterialCategory } from "@/components/forms/supply-wizard-stages";
import { WizardMaterialSearch, WizardMaterialToolbar, WizardQuantityInput } from "@/components/forms/wizard-material-tools";
import { ActionButton, CheckboxField, FormField } from "@/components/ui/controls";
import { Notice, type WorkspaceContext } from "@/components/workspace";
import { formatQuantity, quantity } from "@/lib/quantity";
import type { CatalogProduct } from "@/types/documents";

export const teamConsumptionStages = ["Confirmação", "Materiais", "Itens extras", "Observações", "Revisão"];
const categories = new Set<string>(materialCategories.map(entry => entry.id));

export type TeamConsumptionLine = { productId: string; name: string; unit: string; quantity: string };

export function TeamConsumptionMaterials({ context, products, balances, original, lines, extras, category, query,
  loading, error, retry, onCategory, onQuery, onChange }: {
  context: WorkspaceContext;
  products: CatalogProduct[];
  balances: ReadonlyMap<string, string>;
  original?: readonly TeamConsumptionLine[];
  lines: TeamConsumptionLine[];
  extras: boolean;
  category: WizardMaterialCategory;
  query: string;
  loading: boolean;
  error: string;
  retry: () => void;
  onCategory: (value: WizardMaterialCategory) => void;
  onQuery: (value: string) => void;
  onChange: (lines: TeamConsumptionLine[]) => void;
}) {
  const known = new Set([...(original ?? []), ...lines].map(line => line.productId));
  const needle = query.trim().toLocaleLowerCase("pt-BR");
  const choices = products.filter(product =>
    (extras ? !categories.has(product.category) : product.category === category)
    && (known.has(product.id) || quantity(balances.get(product.id) ?? 0).gt(0))
    && product.name.toLocaleLowerCase("pt-BR").includes(needle));
  return <div className="hca-form-stack">
    <h3>{extras ? "Itens extras" : "Materiais consumidos"}</h3>
    {extras ? <p>Selecione materiais identificados no estoque da equipe fora das categorias anteriores.</p>
      : <WizardMaterialCategories category={category} selected={products.filter(product => lines.some(line => line.productId === product.id))}
        onChange={value => { onCategory(value); onQuery(""); }} />}
    <WizardMaterialSearch value={query} onChange={onQuery} />
    <WizardMaterialToolbar count={lines.length} matches={choices.length} />
    {error ? <Notice error>{error} <ActionButton onClick={retry}>Atualizar materiais</ActionButton></Notice>
      : loading ? <p role="status">Consultando materiais e saldos…</p>
        : !choices.length ? <p>Nenhum material disponível nesta lista.</p> : null}
    {choices.map(product => {
      const line = lines.find(item => item.productId === product.id);
      const previous = original?.find(item => item.productId === product.id);
      return <article key={product.id} className="ui-card hca-form-stack">
        <div className="hca-wizard-material-head">
          <CheckboxField label={product.name} checked={Boolean(line)} onChange={event => {
            onChange(event.currentTarget.checked
              ? [...lines, previous ?? { productId: product.id, name: product.name, unit: product.unit, quantity: "" }]
              : lines.filter(item => item.productId !== product.id));
          }} />
          <MaterialConsultButton context={context} material={product} menu />
        </div>
        {line ? <>
          <small>Estoque da equipe · {balances.has(product.id) ? formatQuantity(balances.get(product.id), product.unit) : "Saldo não consultado"}</small>
          {previous ? <small>Quantidade registrada · {formatQuantity(previous.quantity, previous.unit)}</small> : null}
          <FormField label={"Quantidade consumida · " + product.name}>
            <WizardQuantityInput unit={line.unit} inputMode="decimal" maxLength={64} value={line.quantity} onChange={event => {
              const value = event.currentTarget.value;
              onChange(lines.map(item => item.productId === product.id ? { ...item, quantity: value } : item));
            }} />
          </FormField>
        </> : null}
      </article>;
    })}
  </div>;
}
