"use client";
import { ActionButton } from "@/components/ui/controls";
import { FeedbackBanner } from "@/components/ui/feedback";

export function DocumentNextStep({
  label,
  pending,
  onOpen,
  heading,
  description,
}: {
  label: string;
  pending: boolean;
  onOpen: () => void;
  heading?: string;
  description?: string;
}) {
  return (
    <FeedbackBanner tone={pending ? "warning" : "info"}>
      <strong>
        {heading ?? (pending ? "Etapas para acompanhar" : "Acompanhamento da ficha")}
      </strong>
      <p>
        {description ?? (pending
          ? "Há etapa registrada que requer acompanhamento. Consulte os detalhes e as ações disponíveis para seu perfil."
          : "Consulte os fatos, as decisões e eventuais ressalvas. Esta orientação não registra recebimento, ciência ou conclusão.")}
      </p>
      <ActionButton onClick={onOpen}>Abrir {label}</ActionButton>
    </FeedbackBanner>
  );
}
