"use client";
import { useMemo, useState, type ReactNode } from "react";
import { ActionButton, FormField, SelectField, TextInput } from "@/components/ui/controls";
import { formatQuantity, quantity } from "@/lib/quantity";
import { formatBrazilDate } from "@/lib/receipt";
import { formatPurchaseDate, receiptStates } from "@/lib/documents/purchase";
import type { PurchaseReceipt, PurchaseReceiptLine, SupplyDocument } from "@/types/documents";
import { purchaseReceiptRows, type ReceiptFilter } from "@/lib/documents/purchase-receipt-list";

export function PurchaseReceiptContent({ receipt, lines }: { receipt: PurchaseReceipt; lines: SupplyDocument["lines"] }) {
  const correction = receipt.corrections?.at(-1);
  function historicQuantities(items: PurchaseReceiptLine[]) {
    return items.map(item => {
      const line = lines.find(candidate => candidate.id === item.lineId);
      return <li key={item.lineId}>{line?.name_snapshot ?? "Material registrado"} · {formatQuantity(item.quantity, line?.unit_snapshot)}</li>;
    });
  }
  return <div className="space-y-2 text-sm">
    <p>Informada por <strong>{receipt.submitted_name ?? "Autor histórico não preservado"}</strong> · {formatBrazilDate(receipt.created_at)}</p>
    <dl className="space-y-2">{receipt.lines.map(item => {
      const line = lines.find(line => line.id === item.lineId);
      const expected = receipt.l2_arrival && item.expectedQuantity != null ? quantity(item.expectedQuantity) : null;
      const difference = expected?.minus(item.quantity);
      return <div key={item.lineId} className="grid gap-1 rounded-lg border border-(--line) p-3">
        <dt>{line?.name_snapshot ?? "Material identificado na parcela"}</dt>
        <dd><strong>{formatQuantity(item.quantity, line?.unit_snapshot)}</strong>{expected ? " recebidos" : ""}</dd>
        {expected ? <dd>Esperados nesta parcela {formatQuantity(expected.toFixed(), line?.unit_snapshot)}</dd> : null}
        {difference?.gt(0) ? <dd className="hca-arrival-attention">
          Faltaram {formatQuantity(difference.toFixed(), line?.unit_snapshot)} · {item.remainingAction === "short" ? "Encerrar com falta" : "Aguardar nova entrega"}
        </dd> : null}
        {difference?.lt(0) ? <dd>Excedente conferido de {formatQuantity(difference.abs().toFixed(), line?.unit_snapshot)}</dd> : null}
      </div>;
    })}</dl>
    {receipt.validated_at ? <p>{receipt.state === "rejected" ? "Rejeitada" : "Validada"} por {receipt.validated_name ?? "Nome histórico não preservado"} · {formatBrazilDate(receipt.validated_at)}</p> : null}
    {receipt.reason ? <p className="whitespace-pre-wrap">Motivo: {receipt.reason}</p> : null}
    {receipt.state === "correction_requested" && correction ? <div className="hca-arrival-attention rounded-lg p-3">
      <strong>Correção solicitada a {receipt.submitted_name ?? "quem informou a chegada"}</strong>
      <p className="whitespace-pre-wrap">{correction.reason}</p>
    </div> : null}
    {receipt.corrections?.length ? <details className="hca-arrival-stock">
      <summary>Histórico das correções</summary>
      {receipt.corrections.map(entry => <div key={entry.requestedAt} className="mt-2 space-y-1">
        <p>{entry.requesterName ?? "Nome histórico não preservado"} · {formatBrazilDate(entry.requestedAt)}</p>
        <p className="whitespace-pre-wrap">{entry.reason}</p>
        <p>Informado anteriormente</p><ul>{historicQuantities(entry.previousLines)}</ul>
        {entry.resubmittedAt && entry.correctedLines ? <><p>Reenviado em {formatBrazilDate(entry.resubmittedAt)}</p><ul>{historicQuantities(entry.correctedLines)}</ul></> : null}
      </div>)}
    </details> : null}
  </div>;
}
export function PurchaseDetails({ data, arrivalActions }: {
  data: SupplyDocument; arrivalActions?: (receipt: PurchaseReceipt) => ReactNode;
}) {
  const progress = data.purchaseProgress;
  const [filter, setFilter] = useState<ReceiptFilter>({ query: "", state: "" });
  const [selectedPage, setSelectedPage] = useState(1);
  const rows = useMemo(() => purchaseReceiptRows(data.receipts, data.lines, filter), [data.receipts, data.lines, filter]);
  const pages = Math.max(1, Math.ceil(rows.length / 20)), page = Math.min(selectedPage, pages);
  const visible = rows.slice((page - 1) * 20, page * 20);
  function clear() { setFilter({ query: "", state: "" }); setSelectedPage(1); }
  return <section className="ui-card space-y-4" aria-label="Parcelas de chegada"><h2 className="font-semibold">Parcelas e expectativa da aquisição</h2>
    {progress?.closure ? <div className="rounded-xl border border-(--line) p-4 text-sm"><p className="font-semibold">Expectativa restante encerrada, sem entrada ou baixa de material.</p><p>{progress.closure.actorName ?? "Responsável identificado no evento"} · {formatBrazilDate(progress.closure.recordedAt)}</p><p className="whitespace-pre-wrap">{progress.closure.reason}</p>{progress.physicalPending ? <p className="mt-2">Parcelas que aguardam conferência ou aquisição ainda sem chegada válida continuam pendentes.</p> : <p className="mt-2">As quantidades efetivamente validadas estão preservadas; a parte dispensada não foi recebida.</p>}</div> : null}
    {data.purchaseSchedule?.length ? <details className="hca-purchase-line">
      <summary>Previsões informadas pela loja</summary>
      <ol className="hca-purchase-list">
        {data.purchaseSchedule.map(planned => {
          const line = data.lines.find(item => item.id === planned.lineId);
          return <li key={planned.eventId + planned.lineId}>
            <strong>{line?.name_snapshot ?? "Material da compra"}</strong> · {formatQuantity(planned.quantity, line?.unit_snapshot)}
            <p className="hca-purchase-limit">Previsão {formatPurchaseDate(planned.expectedDate)} · Registro {formatBrazilDate(planned.recordedAt)}</p>
          </li>;
        })}
      </ol>
    </details> : null}
    <p className="text-sm text-(--muted)">Cada chegada tem declaração e decisão próprias. Informar chegada não altera o estoque antes da validação; a validação administrativa imediata fica identificada na parcela.</p>
    {!data.receipts.length ? <p>Nenhuma parcela de chegada informada.</p> : <>
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Buscar parcela" helpText="Número nesta ficha, material ou autor. O número localiza a parcela nesta consulta.">
          <TextInput type="search" value={filter.query} maxLength={160} onChange={event => { setFilter({ ...filter, query: event.currentTarget.value }); setSelectedPage(1); }} />
        </FormField>
        <FormField label="Situação das parcelas">
          <SelectField value={filter.state} onChange={event => { setFilter({ ...filter, state: event.currentTarget.value as ReceiptFilter["state"] }); setSelectedPage(1); }}>
            <option value="">Todas</option>
            {Object.entries(receiptStates).map(([state, label]) => <option key={state} value={state}>{label}</option>)}
          </SelectField>
        </FormField>
      </div>
      <div className="hca-toolbar">
        <p className="text-sm text-(--muted)" role="status">{rows.length} de {data.receipts.length} parcelas nesta seleção.</p>
        {filter.query || filter.state ? <ActionButton onClick={clear}>Limpar consulta de parcelas</ActionButton> : null}
      </div>
      {!rows.length ? <p>Nenhuma parcela nesta seleção. Ajuste ou limpe a consulta; as chegadas registradas continuam preservadas.</p> : <ol className="space-y-4" start={(page - 1) * 20 + 1}>
        {visible.map(({ receipt, ordinal }) => <li key={receipt.id} value={ordinal} data-receipt-id={receipt.id} className="rounded-xl border border-(--line) p-4">
          <h3 className="mb-2 font-semibold">Parcela {ordinal} · {receiptStates[receipt.state]}</h3>
          <PurchaseReceiptContent receipt={receipt} lines={data.lines} />
          {arrivalActions?.(receipt)}
        </li>)}
      </ol>}
      {pages > 1 ? <nav className="hca-toolbar" aria-label="Páginas das parcelas">
        <ActionButton disabled={page <= 1} onClick={() => setSelectedPage(page - 1)}>Anterior</ActionButton>
        <p className="text-sm">Página {page} de {pages}</p>
        <ActionButton disabled={page >= pages} onClick={() => setSelectedPage(page + 1)}>Próxima</ActionButton>
      </nav> : null}
    </>}
  </section>;
}

export function PurchaseExpectationComparison({ original, current }: { original: SupplyDocument; current: SupplyDocument }) {
  return <section className="space-y-3" aria-label="Comparar versões da COM"><h3 className="font-semibold">Resumo original v{original.version} e versão atual v{current.version}</h3><p className="text-sm">A operação recusada não alterou a ficha. Confira a diferença antes de usar a versão atual para uma nova decisão.</p>
    {original.purchaseProgress?.lines.map(line => {
      const latest = current.purchaseProgress?.lines.find(item => item.lineId === line.lineId);
      return <article key={line.lineId} className="rounded-xl border border-(--line) p-4 text-sm"><strong>{line.name}</strong>{latest ? <dl className="mt-2 space-y-2"><div><dt>Adquirido: original → atual</dt><dd>{formatQuantity(line.purchasedQuantity, line.unit)} → {formatQuantity(latest.purchasedQuantity, latest.unit)}</dd></div><div><dt>Em conferência: original → atual</dt><dd>{formatQuantity(line.pendingValidationQuantity, line.unit)} → {formatQuantity(latest.pendingValidationQuantity, latest.unit)}</dd></div><div><dt>A dispensar: original → atual</dt><dd>{formatQuantity(line.waivableQuantity, line.unit)} → {formatQuantity(latest.waivableQuantity, latest.unit)}</dd></div></dl> : <p>Esta linha não está disponível na versão atual. Não confirme o resumo anterior.</p>}</article>;
    })}
  </section>;
}
