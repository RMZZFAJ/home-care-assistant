"use client";
import { createContext, use } from "react";
import { DefinitionGrid } from "@/components/ui/controls";
import type { ScheduleWorkspace } from "@/types/schedules";
import type { ScheduleCreationContent } from "@/lib/schedules/creation";

/** Only a currently authorized workspace supplies current catalogue labels. */
export const ScheduleSummaryContext = createContext<ScheduleWorkspace | null>(
  null,
);
export function SchedulePreparationSummary({
  content,
}: {
  content: ScheduleCreationContent;
}) {
  const data = use(ScheduleSummaryContext),
    f = content.schedule;
  if (f.form === "type")
    return (
      <DefinitionGrid
        items={[
          { label: "Nome do plantão", value: f.name || "Ainda não preenchido" },
          { label: "Início local", value: f.start || "Ainda não preenchido" },
          {
            label: "Duração em minutos",
            value: f.duration || "Ainda não preenchido",
          },
          {
            label: "Disponível para novas escalas",
            value: f.active ? "Sim" : "Não",
          },
        ]}
      />
    );
  const person = data?.professionals.find((p) => p.id === f.professionalId),
    type = data?.types.find((t) => t.id === f.shiftTypeId);
  return (
    <div className="hca-form-stack">
      <DefinitionGrid
        items={[
          {
            label: "Profissional",
            value: person
              ? person.name + " (cadastro atual)"
              : f.professionalId
                ? "Seleção preservada; confira a disponibilidade ao retomar"
                : "Ainda não selecionado",
          },
          {
            label: "Tipo de plantão",
            value: type
              ? type.name + " (cadastro atual)"
              : f.shiftTypeId
                ? "Seleção preservada; confira a disponibilidade ao retomar"
                : "Ainda não selecionado",
          },
          {
            label: "Versão do tipo preservada",
            value: f.shiftTypeVersion ?? "Ainda não conferida",
          },
          {
            label: "Repetição",
            value: {
              once: "Data específica",
              weekly: "Dias da semana",
              dates: "Datas escolhidas",
              cycle: "Ciclo de trabalho e descanso",
            }[f.recurrence],
          },
          {
            label: "Primeiro dia / âncora",
            value: f.from || "Ainda não preenchido",
          },
          {
            label: "Válida até",
            value:
              f.recurrence === "once"
                ? f.from || "Ainda não preenchido"
                : f.until || "Ainda não preenchido",
          },
          {
            label: "Fuso horário",
            value: f.timezone || "Ainda não selecionado",
          },
          ...(f.recurrence === "weekly"
            ? [
                {
                  label: "Dias da semana",
                  value: f.weekdays.length
                    ? f.weekdays
                        .map(
                          (n) =>
                            ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][
                              n
                            ],
                        )
                        .join(", ")
                    : "Ainda não selecionados",
                },
              ]
            : []),
          ...(f.recurrence === "cycle"
            ? [{ label: "Regime", value: f.cycle }]
            : []),
          {
            label: "Observações",
            value: (
              <p className="whitespace-pre-wrap wrap-break-word">
                {f.notes || "Sem observações"}
              </p>
            ),
            wide: true,
          },
          {
            label: "Justificativa própria",
            value: (
              <p className="whitespace-pre-wrap wrap-break-word">
                {f.reason || "Ainda não preenchida"}
              </p>
            ),
            wide: true,
          },
        ]}
      />
      {f.recurrence === "dates" ? (
        <section aria-label="Datas preservadas">
          <h3>Datas escolhidas</h3>
          {f.dates.length ? (
            <ul>
              {f.dates.map((d) => (
                <li key={d}>{d.split("-").reverse().join("/")}</li>
              ))}
            </ul>
          ) : (
            <p>Ainda não selecionadas</p>
          )}
        </section>
      ) : null}
    </div>
  );
}
