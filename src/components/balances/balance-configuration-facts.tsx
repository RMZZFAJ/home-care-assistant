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
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <dt>Dia do balanço</dt>
          <dd>{weekDays[body.weekday]}</dd>
        </div>
        <div>
          <dt>Plantão responsável</dt>
          <dd>
            {type
              ? `${type.name} · início ${type.starts_local.slice(0, 5)} · duração ${type.duration_minutes / 60}h`
              : "Tipo de plantão indisponível nesta referência"}
          </dd>
        </div>
        <div>
          <dt>Fuso do paciente</dt>
          <dd>{body.timezone}</dd>
        </div>
        <div>
          <dt>Profissional designado</dt>
          <dd>
            {body.professionalId
              ? (data.professionals.find((p) => p.id === body.professionalId)
                  ?.name ?? "Pessoa indisponível nesta referência")
              : "Derivar da escala real; ausência ou ambiguidade exige resolução"}
          </dd>
        </div>
        <div>
          <dt>Vigente a partir de</dt>
          <dd>{body.startsOn.split("-").reverse().join("/")}</dd>
        </div>
      </dl>
      <p>
        Esta programação não registra contagem nem movimenta estoque. Ativar
        gera obrigações a partir da data escolhida; pausar preserva pendências,
        atrasos e autoria anteriores. A política de revisão permanece própria do
        paciente.
      </p>
    </section>
  );
}
