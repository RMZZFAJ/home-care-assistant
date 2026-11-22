"use client";

import { ActionButton, DefinitionGrid } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { Dialog } from "@/components/ui/overlays";
import { formatQuantity, quantity } from "@/lib/quantity";
import type { SupplyDocument } from "@/types/documents";

export function purchaseCancellationBlockers(data: SupplyDocument | null) {
  const progress = data?.purchaseProgress;
  return {
    unavailable: !progress,
    awaitingArrival: progress?.physicalPending === true,
    awaitingReview: data?.receipts.some(receipt => receipt.state === "pending" || receipt.state === "correction_requested") === true,
  };
}

export function PurchaseCancellationFacts({ data, blockers }: { data: SupplyDocument; blockers: ReturnType<typeof purchaseCancellationBlockers> }) {
  const pending = blockers.unavailable || blockers.awaitingArrival || blockers.awaitingReview;
  return <>
    <ul className="hca-cancellation-checklist">
      <li><Icon name="check-circle" /><div><strong>Vínculos e histórico</strong><p>Os registros anteriores serão preservados.</p></div></li>
      {pending ? <li className="hca-follow-up-blocker"><Icon name="alert" /><details>
        <summary><strong>Chegadas e aprovações pendentes</strong></summary>
        {blockers.unavailable ? <p>Consulte novamente a ficha para conferir as chegadas.</p> : null}
        {blockers.awaitingArrival ? <p>Confira os materiais comprados que ainda aguardam chegada ou registro de falta.</p> : null}
        {blockers.awaitingReview ? <p>Revise as chegadas pendentes ou aguarde o autor enviar a correção solicitada.</p> : null}
      </details></li> : <li><Icon name="check-circle" /><div><strong>Chegadas e aprovações</strong><p>Nenhuma chegada aguarda aprovação.</p></div></li>}
    </ul>
    {data.purchaseProgress?.lines.filter(line => quantity(line.purchasedQuantity).gt(0) || quantity(line.validatedQuantity).gt(0)).map(line =>
      <article key={line.lineId} className="hca-receipt-line">
        <header><h3>{line.name}</h3></header>
        <DefinitionGrid className="hca-transit-quantities" items={[
          { label: "Comprados", value: formatQuantity(line.purchasedQuantity, line.unit) },
          { label: "Chegadas aprovadas", value: formatQuantity(line.validatedQuantity, line.unit) },
          { label: "Crédito no estoque", value: "Preservado" },
        ]} />
      </article>)}
    <p className="hca-muted">Cancelar o planejamento encerra as aquisições restantes e preserva as entradas já registradas no estoque familiar.</p>
  </>;
}

export function PurchaseCancellationResult({ onClose }: { onClose: () => void }) {
  return <Dialog open success title="Ficha cancelada"
    subtitle="As aquisições, as chegadas e os créditos no estoque foram preservados." onClose={onClose}
    footer={<ActionButton variant="primary" onClick={onClose}>Voltar à ficha</ActionButton>}>
    <p>O cancelamento encerrou o planejamento desta compra.</p>
  </Dialog>;
}
