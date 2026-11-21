"use client";
import Link from "next/link";
import { useCallback, useMemo } from "react";
import { DocumentMaterialList, type DocumentMaterialRow } from "./document-material-list";
import { formatQuantity, quantity as decimal } from "@/lib/quantity";
import { formatBrazilDate } from "@/lib/receipt";
import { FeedbackBanner } from "@/components/ui/feedback";
import { ActionButton } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { DocumentSection } from "@/components/ui/model-section";
import { primaryClass } from "@/components/workspace";
import { useScopedRead } from "@/lib/use-scoped-read";
import { parseSupplySources } from "@/lib/validation/supply-sources";
import { requirePurchaseEntryBalances, type PurchaseEntryBalance } from "@/lib/validation/purchase-entry-balances";
import { readPresentationConversions, presentationCaption } from "@/lib/presentation-conversion";
import type { PurchaseReceipt, SupplyDocument } from "@/types/documents";
import { purchaseMaterialArrivals } from "@/lib/documents/purchase-receipt-list";
import { MaterialReview } from "./material-review";

export function PurchaseDeliveryAvailability({ data, revision }: { data: SupplyDocument; revision: string }) {
  const patientId = data.care_recipient_id;
  const decode = useCallback((value: unknown) => parseSupplySources(value, patientId, "ENT", 1), [patientId]);
  const params = new URLSearchParams({ careRecipientId: patientId, target: "ENT", type: "COM", ids: data.id });
  const read = useScopedRead("/api/documents/sources?" + params, revision, decode);
  const source = read.data?.data.find(option => option.id === data.id && option.type === "COM");
  const eligible = new Map(source?.materials.map(material => [material.lineId, material]));
  const rows = data.lines.flatMap(line => {
    const material = eligible.get(line.id);
    return material?.available && material.productId === line.product_id && decimal(material.available).gt(0)
      ? [{ line, available: material.available }] : [];
  });
  if (read.loading || !rows.length && !read.error) return null;

  const prepareDelivery = <Link className={primaryClass + " hca-control--compact shrink-0"} href={`/fichas/ent?purchaseId=${data.id}`}>
    <Icon name="truck" />Preparar entrega
  </Link>;
  return <DocumentSection title="Materiais disponíveis para entregar" icon="truck">
    {read.error ? <div className="hca-form-stack">
      <p role="status">Não foi possível consultar os materiais disponíveis para entrega.</p>
      <div><ActionButton compact onClick={read.refresh}>Consultar novamente</ActionButton></div>
    </div> : <div className="hca-form-stack">
      <p className="hca-field-help">A entrega usa apenas o saldo que já está disponível.</p>
      <MaterialReview rows={rows.map(({ line, available }) => ({
        id: line.id,
        name: line.name_snapshot,
        icon: "box",
        details: <small>{formatQuantity(available, line.unit_snapshot)} disponíveis para entregar</small>,
        consult: rows.length === 1 ? prepareDelivery : undefined,
      }))} />
      {rows.length > 1 ? <div>{prepareDelivery}</div> : null}
    </div>}
  </DocumentSection>;
}

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
function arrivalPresentation(receipt?: PurchaseReceipt): Pick<DocumentMaterialRow, "status" | "statusDetail" | "tone"> | undefined {
  const correction = receipt?.corrections?.at(-1);
  switch (receipt?.state) {
    case "correction_requested":
      return { status: "Correção solicitada", tone: "pending", statusDetail: correction?.reason };
    case "pending":
      return correction?.resubmittedAt
        ? { status: "Aguardando nova aprovação", tone: "pending", statusDetail: `Motivo da correção anterior: ${correction.reason}` }
        : { status: "Aguardando aprovação", tone: "pending" };
    case "rejected":
      return { status: "Chegada recusada", tone: "danger", statusDetail: receipt.reason ?? undefined };
  }
}

export function PurchaseMaterials({ data, active }: { data: SupplyDocument; active: boolean }) {
  const progress = useMemo(() => new Map(data.purchaseProgress?.lines.map(line => [line.lineId, line])), [data.purchaseProgress]);
  const arrivals = useMemo(() => purchaseMaterialArrivals(data.receipts), [data.receipts]);
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
      const arrival = arrivals.get(line.id);
      const decision = arrivalPresentation(arrival?.receipt);
      const quantity = (value: string | number | undefined) => value === undefined ? "Não informado neste registro" : formatQuantity(value, line.unit_snapshot);
      const entered = current?.validatedQuantity ?? line.accepted_quantity;
      const hasPending = decision?.tone === "pending" || decimal(current?.pendingValidationQuantity ?? 0).gt(0);
      const done = decimal(entered).gt(0) && decimal(entered).gte(line.approved_quantity) && !hasPending;
      const arrived = current
        ? formatQuantity(decimal(entered).plus(current.pendingValidationQuantity).plus(arrival?.correctionQuantity ?? 0).toFixed())
        : "Não informado neste registro";
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
        ...(arrival?.correctionQuantity.gt(0)
          ? [{ label: "Chegada informada em correção", value: quantity(arrival.correctionQuantity.toFixed()) }] : []),
        { label: "Saldo após última entrada", value: balances.valid
          ? <EntryBalance fact={balances.facts.find(fact => fact.lineId === line.id)} unit={line.unit_snapshot} receipts={data.receipts} /> : "Saldo não conferido" },
      ];
      return { id: line.id, name: line.name_snapshot, unit: line.unit_snapshot, done,
        ...(decision ?? { status, tone: done ? "success" : hasPending || decimal(entered).gt(0) ? "pending" : "neutral" }),
        related: data.originDocuments?.filter(origin => origin.productIds.includes(line.product_id)).map(origin => ({
          document: { id: origin.documentId, type: origin.type, code: origin.code },
          detail: "Origem vinculada a este material",
        })),
        facts: [{ label: "Pedido / autorizado", value: `${formatQuantity(line.quantity)} / ${formatQuantity(line.approved_quantity)}` },
          { label: "Comprado", value: formatQuantity(line.purchased_quantity) },
          { label: "Chegou / entrou", value: `${arrived} / ${formatQuantity(entered)}` }],
        detail: <>
          {decision ? <p><strong>{decision.status}</strong>{decision.statusDetail ? <> · {decision.statusDetail}</> : null}</p> : null}
          {readPresentationConversions(line.presentation_conversions).map(item => <p key={item.id}>{presentationCaption(item)}</p>)}
          {line.requisitionItemIds.length ? <p>{line.requisitionItemIds.length} linha(s) REQ explicitamente vinculada(s).</p> : null}
          <dl className="hca-material-balance-grid">{detail.map(fact => <div key={fact.label} data-material-fact={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl>
        </>,
      };
    })} />;
}
