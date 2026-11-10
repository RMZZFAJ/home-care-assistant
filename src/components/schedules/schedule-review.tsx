"use client";
import { Notice } from "@/components/workspace";
import { civilInstant } from "@/lib/schedules/time";
import type { ScheduleCommand } from "@/lib/validation/schedules";
import type {
  ScheduleWorkspace,
  ShiftSnapshot,
  ShiftChange,
  ShiftSeries,
} from "@/types/schedules";

export type ScheduleReview = {
  command: ScheduleCommand;
  version?: number;
  workspace: ScheduleWorkspace;
};
export const scheduleStamp = (date: string, timezone: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    timeZone: timezone,
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(date));

export function ShiftFacts({
  title,
  value,
  currentName,
}: {
  title: string;
  value: ShiftSnapshot | null;
  currentName?: string;
}) {
  return (
    <section className="ui-card" aria-label={title}>
      <h3>{title}</h3>
      {value ? (
        <dl>
          <dt>Profissional</dt>
          <dd>
            {value.professional_name ||
              (currentName
                ? `${currentName} (nome do cadastro atual)`
                : "Nome não preservado no registro")}
          </dd>
          <dt>Período</dt>
          <dd>
            {scheduleStamp(value.starts_at, value.timezone)} →{" "}
            {scheduleStamp(value.ends_at, value.timezone)}
          </dd>
          <dt>Fuso</dt>
          <dd>{value.timezone}</dd>
          <dt>Notas</dt>
          <dd className="whitespace-pre-wrap">
            {value.notes == null
              ? "Notas não preservadas no registro"
              : value.notes || "Sem notas"}
          </dd>
        </dl>
      ) : (
        <Notice error>
          O registro anterior não está disponível. A aprovação exige conferir a
          origem; mantenha a proposta e atualize esta seção.
        </Notice>
      )}
    </section>
  );
}

export function ScheduleChangeFacts({ proposal }: { proposal: ShiftChange }) {
  const impact = proposal.bal_impact;
  return (
    <div className="hca-form-stack">
      <p>
        Proposta, versão {proposal.version}. A decisão usa esta versão e
        preserva a autoria de quem propôs.
      </p>
      <ShiftFacts
        title="Antes da alteração"
        value={proposal.source_snapshot}
        currentName={proposal.current_professional_name}
      />
      <ShiftFacts
        title="Depois da alteração proposta"
        value={proposal.proposed_snapshot}
        currentName={proposal.current_proposed_professional_name}
      />
      <section aria-label="Motivo da proposta">
        <h3>Motivo de quem propôs</h3>
        <p className="whitespace-pre-wrap">{proposal.reason}</p>
      </section>
      <section aria-label="Consequências para o BAL">
        <h3>Consequências para o BAL</h3>
        {impact.requires_family_decision ? (
          <Notice error>
            Existe BAL designado com janela vigente. A alteração do período
            exige decisão familiar no acompanhamento do balanço; esta aprovação
            não pode adiar o prazo.
          </Notice>
        ) : impact.has_assignment ? (
          <p>
            A janela e o prazo do BAL permanecem. A substituição transfere a
            tarefa futura para a pessoa autorizada e preserva a autoria das
            contagens anteriores.
          </p>
        ) : (
          <p>
            Não há atribuição de BAL ativa neste plantão. A proposta altera a
            programação e não comprova presença ou contagem.
          </p>
        )}
        {impact.assignment_deadline && proposal.source_snapshot ? (
          <p>
            Prazo da atribuição:{" "}
            {scheduleStamp(
              impact.assignment_deadline,
              proposal.source_snapshot.timezone,
            )}
            .
          </p>
        ) : null}
      </section>
      {proposal.status !== "pending" ? (
        <Notice>
          Esta proposta já foi{" "}
          {proposal.status === "approved"
            ? "aprovada"
            : proposal.status === "rejected"
              ? "rejeitada"
              : proposal.status === "obsolete"
                ? "encerrada como obsoleta"
                : proposal.status}
          . O histórico e a autoria permanecem preservados.
        </Notice>
      ) : proposal.is_stale ? (
        <Notice error>
          O plantão ou o vínculo mudou desde a proposta. Encerre como obsoleta
          ou prepare uma nova proposta; a programação atual será preservada.
        </Notice>
      ) : null}
    </div>
  );
}

export function ScheduleSeriesOccurrences({ series }: { series: ShiftSeries }) {
  return (
    <details open>
      <summary>
        {series.occurrences.length} plantões na programação completa
      </summary>
      <ul>
        {series.occurrences.map((shift) => (
          <li key={shift.id}>
            {shift.professional_name} ·{" "}
            {scheduleStamp(shift.starts_at, shift.timezone)} →{" "}
            {scheduleStamp(shift.ends_at, shift.timezone)}
          </li>
        ))}
      </ul>
    </details>
  );
}

export function ScheduleReviewDetails({ review }: { review: ScheduleReview }) {
  const { command, workspace: data } = review,
    body = command.body;
  const id = "id" in body ? body.id : undefined;
  if (
    command.action === "decide_change" ||
    command.action === "close_obsolete"
  ) {
    const proposal = data.changes.find((item) => item.id === id);
    if (!proposal)
      return (
        <Notice error>
          Não foi possível carregar a proposta. Atualize a escala antes de
          decidir.
        </Notice>
      );
    return <ScheduleChangeFacts proposal={proposal} />;
  }
  if (command.action === "type")
    return (
      <dl>
        <dt>Tipo de plantão</dt>
        <dd>{command.body.name}</dd>
        <dt>Início local</dt>
        <dd>{command.body.startsLocal}</dd>
        <dt>Duração</dt>
        <dd>{command.body.durationMinutes} minutos</dd>
        <dt>Uso futuro</dt>
        <dd>
          {command.body.active === false ? "Indisponível" : "Disponível"}.
          Ocorrências anteriores conservam seus horários.
        </dd>
      </dl>
    );
  if (command.action === "series")
    return (
      <dl>
        <dt>Profissional</dt>
        <dd>
          {data.professionals.find(
            (person) => person.id === command.body.professionalId,
          )?.name ?? "Profissional indisponível"}
        </dd>
        <dt>Tipo de plantão</dt>
        <dd>
          {
            data.types.find((type) => type.id === command.body.shiftTypeId)
              ?.name
          }
        </dd>
        <dt>Período</dt>
        <dd>
          {command.body.anchorDate.split("-").reverse().join("/")} a{" "}
          {command.body.validUntil.split("-").reverse().join("/")}
        </dd>
        <dt>Fuso</dt>
        <dd>{command.body.timezone}</dd>
        <dt>Repetição</dt>
        <dd>
          {command.body.recurrence === "dates"
            ? "Datas escolhidas"
            : command.body.recurrence === "once"
              ? "Data específica"
              : command.body.recurrence === "cycle"
                ? `${command.body.workHours} horas de trabalho / ${command.body.restHours} horas de descanso`
                : command.body.weekdays
                    .map(
                      (day) =>
                        [
                          "Domingo",
                          "Segunda",
                          "Terça",
                          "Quarta",
                          "Quinta",
                          "Sexta",
                          "Sábado",
                        ][day],
                    )
                    .join(", ")}
        </dd>
        {command.body.recurrence === "dates" ? (
          <>
            <dt>Plantões selecionados</dt>
            <dd>
              <ol className="hca-form-stack">
                {(command.body.dates ?? []).map((day) => {
                  const type = data.types.find(
                    (row) => row.id === command.body.shiftTypeId,
                  );
                  if (!type)
                    return (
                      <li key={day}>
                        Tipo indisponível; retorne à preparação.
                      </li>
                    );
                  const start = civilInstant(
                      day + "T" + type.starts_local.slice(0, 5),
                      command.body.timezone,
                    ),
                    end = new Date(
                      Date.parse(start) + type.duration_minutes * 60000,
                    ).toISOString();
                  return (
                    <li key={day}>
                      {scheduleStamp(start, command.body.timezone)} →{" "}
                      {scheduleStamp(end, command.body.timezone)}
                    </li>
                  );
                })}
              </ol>
            </dd>
          </>
        ) : null}
        <dt>Notas</dt>
        <dd className="whitespace-pre-wrap">
          {command.body.notes || "Sem notas"}
        </dd>
        <dt>Consequência</dt>
        <dd>
          A capacidade vigente determina publicação ou proposta para aprovação.
          Nenhuma programação comprova presença.
        </dd>
      </dl>
    );
  if (
    command.action === "approve" ||
    command.action === "reject" ||
    command.action === "end_series"
  ) {
    const series = data.series.find((item) => item.id === id);
    return series ? (
      <div className="hca-form-stack">
        <p>
          {series.professional_name} · {series.type_name} · {series.timezone}
        </p>
        <p>
          {command.action === "end_series"
            ? `Encerrar a partir de ${command.body.fromDate.split("-").reverse().join("/")}. Ocorrências anteriores permanecem no histórico; janelas de BAL vigentes exigem a decisão familiar correspondente.`
            : command.action === "approve"
              ? "Publicar somente as ocorrências propostas desta versão. Uma série encerrada não pode ser reaberta por aprovação."
              : "Recusar esta programação, preservando a proposta e sua autoria."}
        </p>
        <p className="whitespace-pre-wrap">
          Notas: {series.notes || "Sem notas"}
        </p>
        <ScheduleSeriesOccurrences series={series} />
        {"reason" in body && body.reason ? (
          <p>Motivo desta decisão: {body.reason}</p>
        ) : null}
      </div>
    ) : (
      <Notice error>
        A programação não está disponível para revisão. Atualize a escala.
      </Notice>
    );
  }
  const before = data.shifts.find((shift) => shift.id === id);
  const after =
    before &&
    (command.action === "change" || command.action === "propose_change")
      ? {
          ...before,
          professional_id:
            command.body.professionalId ?? before.professional_id,
          professional_name:
            data.professionals.find(
              (person) =>
                person.id ===
                (command.body.professionalId ?? before.professional_id),
            )?.name ??
            ((command.body.professionalId ?? before.professional_id) ===
            before.professional_id
              ? before.professional_name
              : "Profissional de destino indisponível na consulta atual"),
          starts_at: command.body.startsAt ?? before.starts_at,
          ends_at: command.body.endsAt ?? before.ends_at,
          notes: command.body.notes ?? before.notes,
        }
      : null;
  return (
    <div className="hca-form-stack">
      <p>
        Esta alteração afeta somente este plantão. As demais datas da série
        permanecem preservadas.
      </p>
      <ShiftFacts title="Plantão atual" value={before ?? null} />
      {after ? (
        <ShiftFacts title="Alteração a registrar" value={after} />
      ) : null}
      <p>
        {command.action === "cancel"
          ? "Cancelar a programação, preservando o histórico. Se houver BAL em janela vigente, conclua a decisão familiar antes de cancelar."
          : command.action === "propose_change"
            ? "Registrar proposta: a agenda publicada permanece até uma decisão autorizada."
            : "Aplicar esta alteração, preservando contagens e seus autores. Alterar a janela de BAL exige decisão familiar própria."}
      </p>
      {"reason" in body ? <p>Motivo: {body.reason}</p> : null}
    </div>
  );
}
