import { formatBrazilDate } from "@/lib/receipt";
import type { TransferFacts } from "@/types/transfers";
import { custodyName } from "./transfer-console";
export function TransferFactsDisplay({ facts }: { facts: TransferFacts }) {
  const declaration = facts.declaration;
  return (
    <div className="space-y-3 wrap-break-word text-sm">
      <p>
        <strong>
          {custodyName(declaration.source)} →{" "}
          {custodyName(declaration.destination)}
        </strong>
        .
      </p>
      <p>
        Declarante: <strong>{declaration.actor.name}</strong> ·{" "}
        {formatBrazilDate(declaration.recordedAt)}.
      </p>
      <p className="whitespace-pre-wrap">
        Justificativa original: {declaration.reason}
      </p>
      <p>
        Contraparte designada para concordância:{" "}
        <strong>{declaration.counterparty.name}</strong>.
      </p>
      <p>
        Recebedor físico designado:{" "}
        <strong>{declaration.recipient.name}</strong>.
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
