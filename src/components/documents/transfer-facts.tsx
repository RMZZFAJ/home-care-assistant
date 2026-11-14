import { formatBrazilDate } from "@/lib/receipt";
import type { TransferFacts } from "@/types/transfers";
import { custodyName } from "./transfer-console";
import { materialTransferLabel } from "@/lib/documents/transfer-follow-up";
import { DefinitionGrid } from "@/components/ui/controls";
export function TransferFactsDisplay({ facts }: { facts: TransferFacts }) {
  const declaration = facts.declaration;
  return (
    <div className="space-y-3 wrap-break-word text-sm">
      <p>
        <strong>{materialTransferLabel(declaration.source, declaration.destination)}</strong>
        {" · "}
        <strong>
          {custodyName(declaration.source)} →{" "}
          {custodyName(declaration.destination)}
        </strong>
        .
      </p>
      <DefinitionGrid items={[
        { label: "Declarante", value: declaration.actor.name },
        { label: "Registrada em", value: formatBrazilDate(declaration.recordedAt) },
        { label: "Contraparte designada para concordância", value: declaration.counterparty.name },
        { label: "Recebedor físico designado", value: declaration.recipient.name },
      ]} />
      <p className="whitespace-pre-wrap">
        Justificativa original: {declaration.reason}
      </p>
      {facts.agreement ? (
        <>
          <p>
            <strong>
              {facts.agreement.decision === "agree"
                ? "Concordância própria"
                : "Recusa própria"}
            </strong>
            : {facts.agreement.actor.name} ·{" "}
            {formatBrazilDate(facts.agreement.recordedAt)}.
          </p>
          <p className="whitespace-pre-wrap">{facts.agreement.reason}</p>
        </>
      ) : (
        <p>A concordância ainda não foi registrada.</p>
      )}
      {facts.dispatchedAt ? (
        <p>
          Expedição efetiva: {formatBrazilDate(facts.dispatchedAt)}. Acompanhe o
          recebimento e as divergências abaixo.
        </p>
      ) : (
        <p>
          Sem expedição registrada nesta declaração. Concordância não comprova
          recebimento nem movimenta os materiais.
        </p>
      )}
      {facts.withdrawal ? (
        <>
          <p>
            {facts.withdrawal.kind === "administrative_close"
              ? "Encerramento administrativo"
              : "Retirada pelo declarante"}
            : {facts.withdrawal.actor.name} ·{" "}
            {formatBrazilDate(facts.withdrawal.recordedAt)}.
          </p>
          <p className="whitespace-pre-wrap">{facts.withdrawal.reason}</p>
        </>
      ) : null}
    </div>
  );
}
