"use client";

import { useState } from "react";
import { ActionButton } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { Dialog } from "@/components/ui/overlays";
import { formatQuantity } from "@/lib/quantity";
import type { RequisitionStockCancellation, RequisitionStockChoice } from "@/lib/validation/requisition-decisions";

const blockText = {
  already_reversed: "O ajuste desta contagem já foi revertido.",
  later_count: "Uma contagem posterior foi aplicada. A reversão deste ajuste está indisponível.",
  material_changed: "A referência do material mudou. A reversão deste ajuste está indisponível.",
  insufficient_stock: "A reversão produziria um saldo negativo.",
  stock_limit: "O saldo após a reversão ultrapassaria o limite do estoque.",
} satisfies Record<NonNullable<RequisitionStockCancellation["lines"][number]["block"]>, string>;

export type RequisitionStockOutcome = {
  choice: RequisitionStockChoice;
  lines: RequisitionStockCancellation["lines"];
};

export function RequisitionStockCancellationDialog({ code, comparison, onClose, onConfirm }: {
  code: string;
  comparison: RequisitionStockCancellation;
  onClose: () => void;
  onConfirm: (choice: RequisitionStockChoice) => void;
}) {
  const [choice, setChoice] = useState<RequisitionStockChoice | null>(null);
  return (
    <Dialog
      open
      title="Como deve ficar o estoque?"
      kicker={code}
      subtitle="Escolha o saldo antes de concluir o cancelamento."
      onClose={onClose}
      keyboardScrollable
      footer={<>
        <ActionButton onClick={onClose}><Icon name="arrow" className="rotate-180" />Voltar</ActionButton>
        <ActionButton variant="danger" disabled={!choice} onClick={() => choice && onConfirm(choice)}>
          <Icon name="check" />Cancelar a requisição
        </ActionButton>
      </>}
    >
      <div className="hca-form-stack">
        {comparison.lines.map((line) => (
          <div className="hca-cancellation-stock-material" key={line.productId}>
            <Icon name="stock" />
            <div>
              <strong>{line.name}</strong>
              <p>Na emissão da REQ, a contagem passou de {formatQuantity(line.beforeIssuance)} para {formatQuantity(line.counted, line.unit)}.</p>
              {line.block ? <p className="hca-field-help">{blockText[line.block]}</p> : null}
            </div>
          </div>
        ))}
        {!comparison.canReadStock ? (
          <p className="hca-field-help">Seu vínculo permite cancelar a ficha mantendo a contagem. A consulta e a reversão do saldo exigem acesso ao estoque da equipe.</p>
        ) : null}
        <fieldset className="hca-form-stack">
          <legend className="sr-only">Decisão sobre a contagem da requisição</legend>
          {(["keep", "reverse"] as const).map((option) => (
            <label className="hca-cancellation-stock-option" key={option}>
              <input type="radio" name="requisition-stock-choice" value={option}
                checked={choice === option} disabled={option === "reverse" && !comparison.canReverse}
                onChange={() => setChoice(option)} />
              <span>
                <strong>{option === "keep" ? "Manter a contagem da REQ" : "Reverter o ajuste da emissão"}</strong>
                {comparison.canReadStock && (option === "keep" || comparison.canReverse) ? (
                  <>
                    <small>Saldo atual → após o cancelamento</small>
                    {comparison.lines.map((line) => (
                      <span className="hca-cancellation-stock-amounts" key={line.productId}>
                        {comparison.lines.length > 1 ? <small>{line.name}</small> : null}
                        <span>
                          {formatQuantity(line.current)}
                          <Icon name="arrow" />
                          {formatQuantity(option === "keep" ? line.current : line.afterReversal, line.currentUnit)}
                        </span>
                      </span>
                    ))}
                  </>
                ) : null}
              </span>
            </label>
          ))}
        </fieldset>
        <p className="hca-field-help">Os materiais cuja contagem permaneceu igual e as movimentações posteriores são preservados.</p>
      </div>
    </Dialog>
  );
}
