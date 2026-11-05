import type { SupplyLine, DocumentType, PurchaseProgressLine } from "@/types/documents";
import { formatQuantity, quantity } from "@/lib/quantity";

export function SupplyLineSummary({
  line,
  type,
  status,
  purchaseLine,
}: {
  line: SupplyLine;
  type: DocumentType;
  status: string;
  purchaseLine?: PurchaseProgressLine;
}) {
  return (
    <article className="rounded-xl border border-(--line) p-4">
      <h3 className="font-semibold">{line.name_snapshot}</h3>
      <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-(--muted)">
            {type === "BAL"
              ? "Contado"
              : type === "ENT"
                ? "Expedido"
                : "Proposto"}
          </dt>
          <dd className="mt-1 font-semibold">
            {formatQuantity(line.quantity, line.unit_snapshot)}
          </dd>
        </div>
        {type === "COM" ? (
          <>
            <div>
              <dt>Aprovado</dt>
              <dd>{formatQuantity(line.approved_quantity)}</dd>
            </div>
            <div>
              <dt>Adquirido</dt>
              <dd>{formatQuantity(line.purchased_quantity)}</dd>
            </div>
            {purchaseLine ? <><div><dt>Em conferência</dt><dd>{formatQuantity(purchaseLine.pendingValidationQuantity)}</dd></div><div><dt>Aquisição sem chegada válida</dt><dd>{formatQuantity(purchaseLine.unarrivedQuantity)}</dd></div><div><dt>Não será adquirido</dt><dd>{formatQuantity(purchaseLine.waivedQuantity)}</dd></div><div><dt>Por adquirir</dt><dd>{formatQuantity(purchaseLine.remainingExpectation)}</dd></div></> : null}
          </>
        ) : type === "ENT" ? (
          <>
            <div>
              <dt>Aceito</dt>
              <dd className="font-semibold text-(--brand)">
                {formatQuantity(line.accepted_quantity)}
              </dd>
            </div>
            <div>
              <dt>
                {line.metadata.issueOpen
                  ? "Em divergência"
                  : status === "pending_receipt"
                    ? "Aguardando conferência"
                    : "Quantidade pendente"}
              </dt>
              <dd>
                {formatQuantity(
                  quantity(line.quantity)
                    .minus(line.accepted_quantity)
                    .minus(line.reconciled_quantity)
                    .toFixed(),
                )}
              </dd>
            </div>
          </>
        ) : (
          <div>
            <dt>Saldo na referência</dt>
            <dd>
              {formatQuantity(String(line.metadata.expectedQuantity ?? "0"))}
            </dd>
          </div>
        )}
        <div>
          <dt>{type === "ENT" ? "Conciliado" : type === "COM" ? "Validado" : "Recebido / validado"}</dt>
          <dd>
            {formatQuantity(
              type === "ENT"
                ? line.reconciled_quantity
                : line.accepted_quantity,
            )}
          </dd>
        </div>
      </dl>
      {type === "ENT" ? (
        <p className="mt-3 text-xs">
          {line.fully_checked
            ? "Linha integralmente conferida"
            : line.metadata.issueOpen
              ? "Divergência aberta"
              : status === "confirmed"
                ? "Linha conciliada com diferença"
                : status === "cancelled"
                  ? "Expedição cancelada e compensada"
                  : "Aguardando conferência"}
        </p>
      ) : null}
      {line.requisitionItemIds.length ? (
        <p className="mt-2 text-xs text-(--muted)">
          {line.requisitionItemIds.length} linha(s) REQ explicitamente
          vinculada(s).
        </p>
      ) : null}
    </article>
  );
}
