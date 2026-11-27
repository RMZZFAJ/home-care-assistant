"use client";
import { use } from "react";
import { DefinitionGrid } from "@/components/ui/controls";
import {
  SchedulePreparationSummary,
  ScheduleSummaryContext,
} from "./schedule-preparation-summary";
import type { ScheduleResourceContent } from "@/lib/schedules/resource-preparations";
import { balanceScheduleLabels } from "./schedule-balance-impact";
import { scheduleBalanceReview } from "@/lib/schedules/balance-impact";
import { formatZonedDate } from "@/lib/schedules/time";

export function ScheduleResourceSummary({
  content,
  sourceTimezone,
}: {
  content: ScheduleResourceContent;
  sourceTimezone?: string | null;
}) {
  const data = use(ScheduleSummaryContext),
    f = content.scheduleAction;
  if (f.form === "type")
    return <SchedulePreparationSummary content={{ schedule: f }} />;
  const person =
    f.form === "shift"
      ? data?.professionals.find((p) => p.id === f.professionalId)
      : null;
  const missing = "Ainda não preenchido";
  const balance = f.balanceImpact;
  const destination = balance && balance.decision !== "keep"
    ? scheduleBalanceReview(f, content.reference ?? null)?.[balance.decision].find(shift =>
      shift.id === balance.targetShiftId && shift.version === balance.targetShiftVersion)
    : undefined;
  const operations = {
    end_series: "Encerrar programação",
    approve: "Aprovar proposta",
    reject: "Rejeitar proposta",
    close: "Encerrar proposta obsoleta",
    change: "Alterar ou substituir plantão",
    propose_change: "Propor alteração de plantão",
    cancel: "Cancelar por ausência",
  };
  const items = [
    { label: "Operação preservada", value: operations[f.operation] },
    ...(f.form === "series" && f.operation === "end_series"
      ? [{ label: "Encerrar a partir de", value: f.from || missing }]
      : []),
    ...(f.form === "shift"
      ? [
          {
            label: "Profissional de destino",
            value: person
              ? person.name + " (cadastro atual)"
              : f.professionalId
                ? "Seleção preservada; confira a disponibilidade ao retomar"
                : "Ainda não selecionado",
          },
          {
            label: "Início do plantão",
            value: f.start.replace("T", " ") || missing,
          },
          {
            label: "Fim do plantão",
            value: f.end.replace("T", " ") || missing,
          },
          {
            label: "Fuso da referência",
            value:
              content.reference?.workspace.shifts[0]?.timezone ??
              sourceTimezone ??
              "Referência operacional não disponível nesta consulta",
          },
          {
            label: "Observações",
            value: (
              <p className="whitespace-pre-wrap wrap-break-word">
                {f.notes || "Sem observações"}
              </p>
            ),
            wide: true,
          },
        ]
      : []),
    {
      label: "Motivo próprio",
      value: (
        <p className="whitespace-pre-wrap wrap-break-word">
          {f.reason || "Ainda não preenchido"}
        </p>
      ),
      wide: true,
    },
    ...(f.balanceImpact ? [
      { label: "Encaminhamento do balanço", value: balanceScheduleLabels[f.balanceImpact.decision] },
      { label: "Motivo da decisão sobre o balanço", value: f.balanceImpact.reason || missing },
    ] : []),
    ...(balance && balance.decision !== "keep" && balance.targetShiftId ? [{
      label: "Plantão de destino da contagem",
      value: destination
        ? `${destination.professionalName} · ${formatZonedDate(destination.startsAt, destination.timezone)} até ${formatZonedDate(destination.endsAt, destination.timezone)}`
        : "Destino registrado na tentativa. Horário e responsável indisponíveis nesta consulta.",
    }] : []),
    {
      label: content.reference
        ? "Versão da referência preservada"
        : "Versão indicada no preenchimento; confira ao retomar",
      value: content.referenceVersion ?? "Ainda não conferida",
    },
  ];
  return (
    <div className="hca-form-stack">
      {f.form === "shift" && f.operation === "cancel" ? (
        <p>
          O cancelamento usa a justificativa. Os campos da alteração estão
          preservados para uma retomada explícita.
        </p>
      ) : null}
      <DefinitionGrid items={items} />
    </div>
  );
}
