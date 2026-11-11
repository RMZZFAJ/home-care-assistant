"use client";
import { FormField, TextAreaField, TextInput } from "@/components/ui/controls";

import type { CatalogProduct } from "@/types/documents";
import { BalanceMaterials } from "./balance-materials";
export function BalanceCountFields({ products, counts, errors, notes, onCount, onNotes }: { products: CatalogProduct[]; counts: Record<string,string>; errors: Record<string,string>; notes: string; onCount: (id: string, value: string) => void; onNotes: (value: string) => void }) {
  return <div className="hca-form-stack">{products.map(p => <div className="hca-count-row" key={p.id} data-product={p.id}><FormField label={`${p.name} · ${p.unit}`}  error={errors[p.id]}><TextInput value={counts[p.id] ?? ""} inputMode={(p.quantity_decimals ?? 0) > 0 ? "decimal" : "numeric"} autoComplete="off" aria-required maxLength={24} placeholder="Quantidade física" onChange={e => onCount(p.id, e.target.value)} /></FormField></div>)}<FormField label="Observações da contagem"><TextAreaField value={notes} onChange={e => onNotes(e.target.value)} maxLength={2000} /></FormField></div>;
}
export function BalanceReviewRows({ products, counts, reference }: { products: CatalogProduct[]; counts: Record<string,string>; reference: Record<string,string> }) {
  return <BalanceMaterials rows={products.map(p => ({ id: p.id, name: p.name, unit: p.unit, counted: counts[p.id], reference: reference[p.id] }))} />;
}
