import Link from "next/link";
import { ActionButton, Pill } from "@/components/ui/controls";
import { Icon, type IconName } from "@/components/ui/icon";
import { formatQuantity } from "@/lib/quantity";
import { formatBrazilDate } from "@/lib/receipt";
import type { StockOperationHistory, StockOperationMovement } from "@/lib/validation/stock-reads";

const custodyLabels = { FAMILY: "Família", CARE_TEAM: "Equipe", TRANSIT: "Em trânsito" };
export const stockOperationOrigins = {
  manual: { title: "Lançamento manual", icon: "edit" },
  COM: { title: "Compra e chegada", icon: "box" },
  CON: { title: "Consumo", icon: "note" },
  REQ: { title: "Requisição", icon: "file" },
  ENT: { title: "Entrega", icon: "truck" },
  DEV: { title: "Devolução", icon: "truck" },
  BAL: { title: "Balanço", icon: "check-circle" },
  inventory: { title: "Inventário", icon: "check-circle" },
  other: { title: "Movimentação", icon: "history" },
} satisfies Record<StockOperationHistory["origin"], { title: string; icon: IconName }>;

export function StockMovementHistory({ operations, canCorrect = false, onOrigin, onCorrect }: {
  operations: StockOperationHistory[];
  canCorrect?: boolean;
  onOrigin: (movement: StockOperationMovement, target: HTMLElement) => void;
  onCorrect?: (movement: StockOperationMovement, target: HTMLElement) => void;
}) {
  return <div className="hca-stock-ledger" aria-label="Movimentos do estoque">
    {operations.map(operation => {
      const origin = stockOperationOrigins[operation.origin];
      const inbound = operation.rows.every(row => row.direction === "inbound");
      const outbound = operation.rows.every(row => row.direction === "outbound");
      const tone = inbound ? "success" : outbound ? "danger" : "neutral";
      const custody = Array.from(new Set(operation.rows.map(row => custodyLabels[row.custody]))).join(" / ");
      const materialCount = new Set(operation.rows.map(row => row.product_id)).size;
      return <details key={operation.id} className="hca-stock-act" data-stock-act={operation.id}>
        <summary>
          <span className={"hca-stock-act-icon ui-badge-" + tone}><Icon name={origin.icon} width={19} height={19} /></span>
          <span className="hca-stock-act-heading">
            <span><strong>{operation.documentCode ?? origin.title}</strong> <Pill tone={tone}>{inbound ? "Entrada" : outbound ? "Saída" : "Ajuste misto"}</Pill></span>
            <small>{operation.documentCode ? origin.title + " · " : ""}{materialCount} {materialCount === 1 ? "material" : "materiais"}</small>
            <small><time dateTime={operation.recordedAt}>{formatBrazilDate(operation.recordedAt)}</time> · {custody}</small>
          </span>
          <Icon name="down" width={17} height={17} />
        </summary>
        <div className="hca-stock-act-body">
          <p className="hca-stock-act-actor"><Icon name="users" width={15} height={15} />{operation.actor ?? "Autoria indisponível"}</p>
          {operation.rows.map(row => <div key={row.id} data-movement-id={row.id} className="hca-stock-act-line">
            <button type="button" className="hca-stock-act-effect" onClick={event => onOrigin(row, event.currentTarget)}
              aria-label={"Consultar origem · " + (row.name ?? "Material")}>
              <span><strong>{row.name ?? "Nome do material indisponível"}</strong>
                <small>{row.before !== null && row.after !== null
                  ? <>{formatQuantity(row.before)} <span aria-hidden="true">→</span><span className="sr-only"> para </span> {formatQuantity(row.after, row.unit ?? undefined)}</>
                  : "Saldos do efeito indisponíveis"}</small></span>
              <b data-direction={row.direction}>{row.direction === "outbound" ? "−" : "+"}{formatQuantity(row.quantity, row.unit ?? undefined)}</b>
              <Icon name="chevron" width={16} height={16} />
            </button>
            {operation.origin === "manual" ? <p className="hca-stock-act-reason">{row.justification}</p> : null}
            {row.reference_document_id || canCorrect && row.reference_type === "family_manual" ? <div className="hca-stock-act-links">
              {row.reference_document_id ? <Link href={"/fichas/" + row.reference_document_id}>{row.reference_type === "delivery_regularization" ? "Abrir dossiê administrativo" : "Abrir ficha"}</Link> : null}
              {canCorrect && onCorrect && row.reference_type === "family_manual" ? <ActionButton variant="quiet" onClick={event => onCorrect(row, event.currentTarget)}>Corrigir este movimento</ActionButton> : null}
            </div> : null}
          </div>)}
        </div>
      </details>;
    })}
  </div>;
}
