"use client";
import { DefinitionGrid } from "@/components/ui/controls";
import {
  ScheduleChangeFacts,
  ScheduleSeriesOccurrences,
  ShiftFacts,
} from "./schedule-review";
import type { ScheduleResourceReference } from "@/lib/schedules/resource-preparations";
export function ScheduleResourceReferenceFacts({
  reference,
}: {
  reference: ScheduleResourceReference;
}) {
  const data = reference.workspace,
    type = data.types[0],
    series = data.series[0],
    shift = data.shifts[0],
    change = data.changes[0];
  if (change) return <ScheduleChangeFacts proposal={change} />;
  if (shift)
    return (
      <>
        <p>Plantão, versão {reference.version}.</p>
        <ShiftFacts title="Plantão atual" value={shift} />
      </>
    );
  if (series)
    return (
      <div className="hca-form-stack">
        <DefinitionGrid
          items={[
            { label: "Profissional", value: series.professional_name },
            { label: "Tipo de plantão", value: series.type_name },
            { label: "Fuso", value: series.timezone },
            {
              label: "Estado da programação",
              value:
                series.status === "proposed"
                  ? "Proposta"
                  : series.status === "published"
                    ? "Publicada"
                    : series.status === "rejected"
                      ? "Rejeitada"
                      : series.status,
            },
            { label: "Versão", value: reference.version },
            { label: "Primeiro dia", value: series.anchor_date },
            { label: "Último dia", value: series.valid_until },
            {
              label: "Encerrada a partir de",
              value: series.ended_on ?? "Não encerrada",
            },
            {
              label: "Notas originais",
              value: (
                <p className="whitespace-pre-wrap wrap-break-word">
                  {series.notes || "Sem notas"}
                </p>
              ),
              wide: true,
            },
          ]}
        />
        <ScheduleSeriesOccurrences series={series} />
      </div>
    );
  return type ? (
    <DefinitionGrid
      items={[
        { label: "Nome registrado", value: type.name },
        { label: "Início local registrado", value: type.starts_local },
        {
          label: "Duração registrada",
          value: type.duration_minutes + " minutos",
        },
        {
          label: "Disponível para novas escalas",
          value: type.is_active ? "Sim" : "Não",
        },
        { label: "Versão", value: type.version },
      ]}
    />
  ) : null;
}
