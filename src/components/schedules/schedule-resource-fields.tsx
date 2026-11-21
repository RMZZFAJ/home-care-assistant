"use client";
import {
  FormField,
  TextInput,
  SelectField,
  TextAreaField,
} from "@/components/ui/controls";
import { ScheduleCreationFields } from "./schedule-creation-fields";
import type { ScheduleResourceFields as Fields } from "@/lib/schedules/resource-preparations";
import type { ScheduleWorkspace } from "@/types/schedules";

/** All conditional branches keep their human fields in the parent preparation. */
export function ScheduleResourceFields({
  value: f,
  onChange,
  data,
  ownId,
  team,
  publishOwn,
  mayPropose,
}: {
  value: Fields;
  onChange: (value: Fields) => void;
  data: ScheduleWorkspace;
  ownId: string;
  team: boolean;
  publishOwn: boolean;
  mayPropose: boolean;
}) {
  if (f.form === "type")
    return (
      <>
        <ScheduleCreationFields
          value={f}
          onChange={(next) => {
            if (next.form === "type") onChange(next);
          }}
          data={data}
          ownId={ownId}
          team={team}
          publishOwn={publishOwn}
        />
        <p className="hca-muted">
          Plantões já programados conservam seus intervalos originais.
        </p>
      </>
    );
  if (f.form === "series") {
    const patch = (v: Partial<typeof f>) => onChange({ ...f, ...v });
    return (
      <>
        {f.operation === "end_series" ? (
          <>
            <p>
              As ocorrências a partir da data escolhida serão canceladas. O
              histórico e os documentos permanecem preservados.
            </p>
            <FormField label="Encerrar a partir de">
              <TextInput
                name="from"
                type="date"
                required
                value={f.from}
                onChange={(e) => patch({ from: e.currentTarget.value })}
              />
            </FormField>
          </>
        ) : (
          <p>
            {f.operation === "approve"
              ? "A aprovação publica as ocorrências desta proposta. Nenhuma programação será publicada ao guardar o preenchimento."
              : "A rejeição encerra esta proposta com seu motivo próprio e preserva seu histórico."}
          </p>
        )}
        <FormField
          label={
            f.operation === "reject"
              ? "Motivo da rejeição"
              : f.operation === "approve"
                ? "Motivo desta decisão"
                : "Justificativa"
          }
          required={f.operation !== "approve"}
        >
          <TextAreaField
            name="reason"
            required={f.operation !== "approve"}
            minLength={3}
            maxLength={1000}
            value={f.reason}
            onChange={(e) => patch({ reason: e.currentTarget.value })}
          />
        </FormField>
      </>
    );
  }
  if (f.form === "decision")
    return (
      <>
        <p>
          O motivo e as notas de quem propôs permanecem preservados. Registre
          somente o motivo da sua decisão.
        </p>
        <FormField
          label="Motivo desta decisão"
          required={f.operation !== "approve"}
        >
          <TextAreaField
            name="reason"
            minLength={3}
            maxLength={1000}
            required={f.operation !== "approve"}
            value={f.reason}
            onChange={(e) => onChange({ ...f, reason: e.currentTarget.value })}
          />
        </FormField>
      </>
    );
  const patch = (v: Partial<typeof f>) => onChange({ ...f, ...v });
  const persons = data.professionals.filter(
    (p) => team || f.operation === "propose_change" || p.id === ownId,
  );
  const selected = persons.some((p) => p.id === f.professionalId);
  return (
    <>
      <FormField label="Operação">
        <SelectField
          value={f.operation}
          onChange={(e) =>
            patch({ operation: e.currentTarget.value as typeof f.operation })
          }
        >
          {team || publishOwn || f.operation === "change" ? (
            <option value="change" disabled={!team && !publishOwn}>
              Alterar / substituir
            </option>
          ) : null}
          {team || publishOwn || f.operation === "cancel" ? (
            <option value="cancel" disabled={!team && !publishOwn}>
              Cancelar por ausência
            </option>
          ) : null}
          {mayPropose || f.operation === "propose_change" ? (
            <option value="propose_change" disabled={!mayPropose}>
              Propor alteração
            </option>
          ) : null}
        </SelectField>
      </FormField>
      {f.operation !== "cancel" ? (
        <>
          <FormField label="Profissional de destino">
            <SelectField
              name="person"
              required
              value={f.professionalId}
              onChange={(e) => patch({ professionalId: e.currentTarget.value })}
            >
              <option value="">Selecione o profissional</option>
              {f.professionalId && !selected ? (
                <option value={f.professionalId}>
                  Seleção preservada, indisponível para nova confirmação
                </option>
              ) : null}
              {persons.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </SelectField>
          </FormField>
          <FormField label="Início do plantão">
            <TextInput
              name="start"
              type="datetime-local"
              required
              value={f.start}
              onChange={(e) => patch({ start: e.currentTarget.value })}
            />
          </FormField>
          <FormField label="Fim do plantão">
            <TextInput
              name="end"
              type="datetime-local"
              required
              value={f.end}
              onChange={(e) => patch({ end: e.currentTarget.value })}
            />
          </FormField>
          <p className="hca-muted">
            Horários no fuso da referência do plantão.
          </p>
          <FormField label="Observações">
            <TextAreaField
              name="notes"
              maxLength={2000}
              value={f.notes}
              onChange={(e) => patch({ notes: e.currentTarget.value })}
            />
          </FormField>
        </>
      ) : (
        <p>
          Os campos da alteração estão preservados. O cancelamento registra sua
          justificativa.
        </p>
      )}
      <FormField label="Justificativa" required>
        <TextAreaField
          name="reason"
          required
          minLength={3}
          maxLength={1000}
          value={f.reason}
          onChange={(e) => patch({ reason: e.currentTarget.value })}
        />
      </FormField>
      {f.operation === "propose_change" ? (
        <p>
          A proposta depende de aprovação; o plantão atual permanece válido.
        </p>
      ) : null}
    </>
  );
}
