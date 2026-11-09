"use client";
import { ActionButton } from "@/components/ui/controls";
import { FeedbackBanner } from "@/components/ui/feedback";

export function DocumentNextStep({
  label,
  pending,
  onOpen,
}: {
  label: string;
  pending: boolean;
  onOpen: () => void;
}) {
  return (
    <FeedbackBanner tone={pending ? "warning" : "info"}>
      <strong>
        {pending ? "Etapas para acompanhar" : "Acompanhamento da ficha"}
      </strong>
      <p>
        {pending
          ? "Há etapa registrada que requer acompanhamento. Consulte os detalhes e as ações disponíveis para seu perfil."
          : "Consulte os fatos, as decisões e eventuais ressalvas. Esta orientação não registra recebimento, ciência ou conclusão."}
      </p>
      <ActionButton onClick={onOpen}>Abrir {label}</ActionButton>
    </FeedbackBanner>
  );
}
