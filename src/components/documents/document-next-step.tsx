"use client";
import { ActionButton } from "@/components/ui/controls";
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
    <section className="doc-next-suggestion" aria-label="Próximo passo sugerido">
      <span className="doc-next-icon"><Icon name="arrow" width={18} height={18} /></span><div><span className="doc-kicker">Próximo passo sugerido</span>
      <button type="button" className="hca-suggestion-link" onClick={onOpen} aria-label={"Abrir " + label}><strong>
        {heading ?? (pending ? "Etapas para acompanhar" : "Acompanhamento da ficha")}
      </strong></button>
      <p>
        {description ?? (pending
          ? "Há etapa registrada que requer acompanhamento. Consulte os detalhes e as ações disponíveis para seu perfil."
          : "Consulte os fatos, as decisões e eventuais ressalvas. Esta orientação não registra recebimento, ciência ou conclusão.")}
      </p>
      </div><ActionButton variant="quiet" className="btn-icon" aria-label="Dispensar sugestão" onClick={() => setDismissed(suggestion)}><Icon name="close" /></ActionButton>
    </section>
  );
}
