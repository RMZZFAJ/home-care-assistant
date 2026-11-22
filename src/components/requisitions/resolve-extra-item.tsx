"use client";
import { ActionButton } from "@/components/ui/controls";

export function ResolveExtraItem({ onOpen }: { onOpen: () => void }) {
  return (
    <section className="ui-card hca-form-stack">
      <h2>Identificar itens extras no catálogo</h2>
      <p>
        Associe cada item extra a um produto deste paciente antes de incluí-lo
        em COM ou ENT. O texto original da requisição será preservado e a
        decisão ficará registrada em uma nova versão. Você pode salvar o
        preenchimento privado antes de confirmar.
      </p>
      <ActionButton onClick={onOpen}>Identificar item extra</ActionButton>
    </section>
  );
}
