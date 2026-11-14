"use client";
import { useMemo } from "react";
import { DocumentMaterialsTable } from "./document-materials-table";
import { formatQuantity } from "@/lib/quantity";
import { formatBrazilDate } from "@/lib/receipt";
import { FeedbackBanner } from "@/components/ui/feedback";
import { requirePurchaseEntryBalances, type PurchaseEntryBalance } from "@/lib/validation/purchase-entry-balances";
import { readPresentationConversions, presentationCaption } from "@/lib/presentation-conversion";
import type { SupplyDocument } from "@/types/documents";

const core = [{ id: "material", label: "Material" }, { id: "proposed", label: "Proposto" }, { id: "approved", label: "Aprovado" }, { id: "purchased", label: "Adquirido" }, { id: "validated", label: "Validado" }];
const expectation = [{ id: "pending", label: "Em conferência" }, { id: "unarrived", label: "Aquisição sem chegada válida" }, { id: "waived", label: "Não será adquirido" }, { id: "remaining", label: "Por adquirir" }];
const afterEntry = { id: "entryBalance", label: "Saldo após última entrada" };
function EntryBalance({ fact, unit, receipts }: { fact?: PurchaseEntryBalance; unit: string; receipts: SupplyDocument["receipts"] }) {
  if (!fact) return <>Não disponível no registro</>;
  if (fact.state === "not_validated") return <>Sem entrada validada</>;
  const entry = fact.entry;
  const ordinal = entry ? receipts.findIndex(receipt => receipt.id === entry.receiptId) + 1 : null;
  return <>
    <strong>{fact.state === "known" ? formatQuantity(fact.quantity, unit) : fact.state === "restricted" ? "Acesso restrito" : "Não disponível no registro"}</strong>
    {entry ? <><small>Validação: {formatBrazilDate(entry.validatedAt)} · {entry.validatorName ?? "Nome histórico não preservado"}</small>
      <small>Parcela {ordinal} · entrada de {formatQuantity(entry.enteredQuantity, unit)}</small></> : null}
  </>;
}
export function PurchaseMaterials({ data }: { data: SupplyDocument }) {
  const progress = useMemo(() => new Map(data.purchaseProgress?.lines.map(line => [line.lineId, line])), [data.purchaseProgress]);
  const balances = useMemo(() => {
    if (data.purchaseEntryBalances === undefined) return { valid: true, facts: [] };
    try { return { valid: true, facts: requirePurchaseEntryBalances(data.purchaseEntryBalances, { version: data.version, lines: data.lines, receipts: data.receipts, events: data.events }) }; }
    catch { return { valid: false, facts: [] }; }
  }, [data.purchaseEntryBalances, data.version, data.lines, data.receipts, data.events]);
  return <DocumentMaterialsTable key={data.id} label="Materiais da compra ou doação" heading={<><h2>Produtos e quantidades</h2><p>Valores de cada ato são apresentados separadamente. A validação da chegada determina a entrada no estoque.</p><p>O saldo da família é o registrado após a última entrada validada de cada material nesta ficha. As datas podem ser diferentes; movimentos posteriores não substituem esse saldo.</p>{!balances.valid ? <FeedbackBanner tone="error">Não foi possível conferir o saldo das entradas. Use Atualizar ficha para consultar novamente.</FeedbackBanner> : null}</>} columns={[...(progress.size ? [...core, ...expectation] : core), afterEntry]}
    rows={data.lines.map(line => {
      const current = progress.get(line.id);
      const quantity = (value: string | number | undefined) => value === undefined ? "Não informado neste registro" : formatQuantity(value, line.unit_snapshot);
      return { id: line.id, searchText: line.name_snapshot, cells: {
        material: <><strong>{line.name_snapshot}</strong><small>{line.unit_snapshot}</small>{readPresentationConversions(line.presentation_conversions).map(row => <small key={row.id}>{presentationCaption(row)}</small>)}{line.requisitionItemIds.length ? <small>{line.requisitionItemIds.length} linha(s) REQ explicitamente vinculada(s).</small> : null}</>,
        proposed: quantity(line.quantity), approved: quantity(line.approved_quantity), purchased: quantity(line.purchased_quantity), validated: quantity(line.accepted_quantity),
        pending: quantity(current?.pendingValidationQuantity), unarrived: quantity(current?.unarrivedQuantity), waived: quantity(current?.waivedQuantity), remaining: quantity(current?.remainingExpectation),
        entryBalance: balances.valid ? <EntryBalance fact={balances.facts.find(fact => fact.lineId === line.id)} unit={line.unit_snapshot} receipts={data.receipts} /> : "Saldo não conferido",
      } };
    })} />;
}
