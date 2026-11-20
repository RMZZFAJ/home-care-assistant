"use client";
import { useMemo } from "react";
import { DocumentMaterialList } from "./document-material-list";
import { formatQuantity, quantity as decimal } from "@/lib/quantity";
import { formatBrazilDate } from "@/lib/receipt";
import { FeedbackBanner } from "@/components/ui/feedback";
import { requirePurchaseEntryBalances, type PurchaseEntryBalance } from "@/lib/validation/purchase-entry-balances";
import { readPresentationConversions, presentationCaption } from "@/lib/presentation-conversion";
import type { SupplyDocument } from "@/types/documents";

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
export function PurchaseMaterials({ data, active }: { data: SupplyDocument; active: boolean }) {
  const progress = useMemo(() => new Map(data.purchaseProgress?.lines.map(line => [line.lineId, line])), [data.purchaseProgress]);
  const balances = useMemo(() => {
    if (data.purchaseEntryBalances === undefined) return { valid: true, facts: [] };
    try { return { valid: true, facts: requirePurchaseEntryBalances(data.purchaseEntryBalances, { version: data.version, lines: data.lines, receipts: data.receipts, events: data.events }) }; }
    catch { return { valid: false, facts: [] }; }
  }, [data.purchaseEntryBalances, data.version, data.lines, data.receipts, data.events]);
  return <DocumentMaterialList key={data.id} documentId={data.id} patientId={data.care_recipient_id}
    revision={String(data.version)} active={active} label="Materiais da compra ou doação" settledLabel="Recebidos"
    today={{ location: "family", label: "Família hoje" }}
    heading={<><h2>Materiais</h2><p>Da autorização à entrada efetiva no estoque familiar.</p>
      {!balances.valid ? <FeedbackBanner tone="error">Não foi possível conferir o saldo das entradas. Use Atualizar ficha.</FeedbackBanner> : null}</>}
    rows={data.lines.map(line => {
      const current = progress.get(line.id);
      const quantity = (value: string | number | undefined) => value === undefined ? "Não informado neste registro" : formatQuantity(value, line.unit_snapshot);
      const entered = current?.validatedQuantity ?? line.accepted_quantity;
      const hasPending = Number(current?.pendingValidationQuantity ?? 0) > 0;
      const done = Number(entered) > 0 && Number(entered) >= Number(line.approved_quantity) && !hasPending;
      const status = hasPending ? "Em conferência" : done ? "Entrada aprovada"
        : Number(entered) > 0 ? "Entrada parcial" : Number(line.purchased_quantity) > 0 ? "Aguardando chegada"
          : Number(line.approved_quantity) > 0 ? "Autorizado" : "Em avaliação";
      const detail = [
        { label: "Proposto", value: quantity(line.quantity) }, { label: "Aprovado", value: quantity(line.approved_quantity) },
        { label: "Adquirido", value: quantity(line.purchased_quantity) }, { label: "Validado", value: quantity(entered) },
        ...(current ? [
          { label: "Em conferência", value: quantity(current.pendingValidationQuantity) },
          { label: "Aquisição sem chegada válida", value: quantity(current.unarrivedQuantity) },
          { label: "Não será adquirido", value: quantity(current.waivedQuantity) },
          { label: "Por adquirir", value: quantity(current.remainingExpectation) },
          ...(Number(current.closedShortQuantity ?? 0) > 0 ? [{ label: "Falta encerrada", value: quantity(current.closedShortQuantity) }] : []),
          ...(Number(current.approvedExcessQuantity ?? 0) > 0 ? [{ label: "Excedente validado", value: quantity(current.approvedExcessQuantity) }] : []),
        ] : []),
        { label: "Saldo após última entrada", value: balances.valid
          ? <EntryBalance fact={balances.facts.find(fact => fact.lineId === line.id)} unit={line.unit_snapshot} receipts={data.receipts} /> : "Saldo não conferido" },
      ];
      return { id: line.id, name: line.name_snapshot, unit: line.unit_snapshot, status, done,
        tone: done ? "success" : hasPending || Number(entered) > 0 ? "pending" : "neutral",
        related: data.originDocuments?.filter(origin => origin.productIds.includes(line.product_id)).map(origin => ({
          document: { id: origin.documentId, type: origin.type, code: origin.code },
          detail: "Origem vinculada a este material",
        })),
        facts: [{ label: "Pedido / autorizado", value: `${formatQuantity(line.quantity)} / ${formatQuantity(line.approved_quantity)}` },
          { label: "Comprado", value: formatQuantity(line.purchased_quantity) },
          { label: "Chegou / entrou", value: `${current ? formatQuantity(decimal(entered).plus(current.pendingValidationQuantity).toFixed()) : "Não informado neste registro"} / ${formatQuantity(entered)}` }],
        detail: <>
          {readPresentationConversions(line.presentation_conversions).map(item => <p key={item.id}>{presentationCaption(item)}</p>)}
          {line.requisitionItemIds.length ? <p>{line.requisitionItemIds.length} linha(s) REQ explicitamente vinculada(s).</p> : null}
          <dl className="hca-material-balance-grid">{detail.map(fact => <div key={fact.label} data-material-fact={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl>
        </>,
      };
    })} />;
}
