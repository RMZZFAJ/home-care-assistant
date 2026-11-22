import { DefinitionGrid } from "@/components/ui/controls";
import type { BalanceCommand } from "@/lib/validation/balances";
import type { BalanceWorkspace } from "@/types/balances";
import { weekDays } from "./balance-forms";

export function BalanceConfigurationFacts({
  command,
  data,
}: {
  command: Extract<BalanceCommand, { action: "configure" }>;
  data: {
    types: Pick<
      BalanceWorkspace["types"][number],
      "id" | "name" | "starts_local" | "duration_minutes"
    >[];
    professionals: BalanceWorkspace["professionals"];
  };
}) {
  const body = command.body,
    type = data.types.find((t) => t.id === body.shiftTypeId);
  return (
    <section aria-label="Programação a confirmar" className="space-y-3 text-sm">
      <DefinitionGrid items={[
        { label: "Dia do balanço", value: weekDays[body.weekday] },
        { label: "Plantão responsável", value: type ? type.name + " · início " + type.starts_local.slice(0,5) + " · duração " + type.duration_minutes / 60 + "h" : "Tipo de plantão indisponível nesta referência" },
        { label: "Fuso do paciente", value: body.timezone },
        { label: "Profissional designado", value: body.professionalId ? data.professionals.find(p => p.id === body.professionalId)?.name ?? "Pessoa indisponível nesta referência" : "Derivar da escala real; ausência ou ambiguidade exige resolução" },
        { label: "Vigente a partir de", value: body.startsOn.split("-").reverse().join("/") },
      ]} />
      <p>
        Esta programação não registra contagem nem movimenta estoque. Ativar
        gera obrigações a partir da data escolhida; pausar preserva pendências,
        atrasos e autoria anteriores. A política de revisão permanece própria do
        paciente.
      </p>
    </section>
  );
}
