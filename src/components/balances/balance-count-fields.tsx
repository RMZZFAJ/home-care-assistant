"use client";
import { Field, Input, Textarea } from "@fluentui/react-components";
import type { CatalogProduct } from "@/types/documents";
import { formatQuantity, quantity } from "@/lib/quantity";
export function BalanceCountFields({ products, counts, errors, notes, onCount, onNotes }: { products: CatalogProduct[]; counts: Record<string,string>; errors: Record<string,string>; notes: string; onCount: (id: string, value: string) => void; onNotes: (value: string) => void }) {
  return <div className="hca-form-stack">{products.map(p => <div className="hca-count-row" key={p.id} data-product={p.id}><Field label={`${p.name} · ${p.unit}`} validationState={errors[p.id] ? "error" : "none"} validationMessage={errors[p.id]}><Input value={counts[p.id] ?? ""} inputMode={(p.quantity_decimals ?? 0) > 0 ? "decimal" : "numeric"} autoComplete="off" aria-required maxLength={24} placeholder="Quantidade física" onChange={e => onCount(p.id, e.target.value)} /></Field></div>)}<Field label="Observações da contagem"><Textarea value={notes} onChange={e => onNotes(e.target.value)} maxLength={2000} /></Field></div>;
}
export function BalanceReviewRows({ products, counts, reference }: { products: CatalogProduct[]; counts: Record<string,string>; reference: Record<string,string> }) {
  return <div className="hca-records">{products.map(p => { const delta = quantity(counts[p.id] ?? "0").minus(reference[p.id] ?? "0"); return <article className="hca-record" key={p.id}><div className="hca-record-main"><strong>{p.name}</strong><p>Quantidade física: {formatQuantity(counts[p.id], p.unit)}</p><small>Referência: {formatQuantity(reference[p.id] ?? "0", p.unit)}</small><p>{delta.isZero() ? "Sem diferença" : "Diferença: " + formatQuantity(delta.toFixed(), p.unit)}</p></div></article>; })}</div>;
}
