"use client";
import { ActionButton } from "@/components/ui/controls";
import { FeedbackBanner } from "@/components/ui/feedback";
import { useState } from "react";
import { Icon } from "@/components/ui/primitives";

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
  const [dismissed, setDismissed] = useState<string | null>(null);
  const suggestion = JSON.stringify([label, pending, heading, description]);
  if (dismissed === suggestion) return null;
  return (
    <FeedbackBanner tone={pending ? "warning" : "info"}>
      <span className="hca-next-step-kicker">Próximo passo sugerido</span>
      <ActionButton variant="quiet" className="hca-dismiss-suggestion" aria-label="Dispensar sugestão" onClick={() => setDismissed(suggestion)}><Icon name="close" /></ActionButton>
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
