"use client";
import {
  comOperationPurposes,
  entOperationPurposes,
  type ComOperationPurpose,
  type EntOperationPurpose,
} from "@/lib/validation/supply-drafts";
import { buttonClass } from "@/components/workspace";

const labels: Record<string, string> = {
  approve: "Aprovação",
  purchase: "Aquisição",
  receive: "Conferência ou chegada",
  validate_receipt: "Validação de parcela",
  reject_receipt: "Rejeição de parcela",
  close_expectation: "Encerramento da expectativa",
  cancel: "Cancelamento ou pedido",
  divergence: "Divergência da conferência",
  reassign: "Troca de destinatário",
  resolve: "Conciliação da divergência",
  consent_cancel: "Consentimento e conciliação",
  refuse_cancellation: "Recusa do pedido",
  withdraw_cancellation: "Retirada do pedido",
};
export function PrivateOperationRecoveryActions({
  kind,
  onSelect,
}: {
  kind: "COM" | "ENT";
  onSelect: (purpose: ComOperationPurpose | EntOperationPurpose) => void;
}) {
  const purposes = kind === "COM" ? comOperationPurposes : entOperationPurposes;
  return (
    <details className="hca-form-stack">
      <summary>Meus preenchimentos nesta ficha</summary>
      <p>
        Consulte somente seus preenchimentos, descarte um rascunho próprio ou
        reconheça um resultado já aplicado. Esta consulta não repete a operação
        oficial.
      </p>
      <div className="hca-form-stack">
        {purposes.map((purpose) => (
          <button
            type="button"
            className={buttonClass}
            key={purpose}
            onClick={() => onSelect(purpose)}
          >
            Consultar preenchimento:{" "}
            {kind === "ENT" && purpose === "receive"
              ? "Conferência pessoal"
              : kind === "COM" && purpose === "receive"
                ? "Chegada"
                : labels[purpose]}
          </button>
        ))}
      </div>
    </details>
  );
}
