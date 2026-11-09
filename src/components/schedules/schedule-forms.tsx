"use client";
import { ActionButton, CheckboxField, FormField, SelectField, TextAreaField, TextInput } from "@/components/ui/controls";
import { useState, type FormEvent } from "react";

import type { ScheduleCommand } from "@/lib/validation/schedules";
import type {
  ScheduleWorkspace,
  ScheduledShift,
  ShiftType,
} from "@/types/schedules";
import { SelectedShiftDates } from "./selected-shift-dates";
import { Notice } from "@/components/workspace";
import { civilInstant, localMinute } from "@/lib/schedules/time";
export type ScheduleEditor =
  | { kind: "type"; type?: ShiftType }
  | { kind: "series" }
  | { kind: "shift"; shift: ScheduledShift }
  | { kind: "end" | "reject"; id: string; version: number }
  | { kind: "reject_change"; id: string; version: number };
export function ScheduleForm({
  editor,
  data,
  ownId,
  team,
  publishOwn = false,
  today,
  onReview,
}: {
  editor: ScheduleEditor;
  data: ScheduleWorkspace;
  ownId: string;
  team: boolean;
  publishOwn?: boolean;
  today: string;
  onReview: (command: ScheduleCommand, version?: number) => void;
}) {
  const [recurrence, setRecurrence] = useState("weekly"),
    [cycle, setCycle] = useState("12x36");
  const [shiftAction, setShiftAction] = useState("change");
  const [fromDate, setFromDate] = useState(today),
    [untilDate, setUntilDate] = useState(() => addDays(today, 28)),
    [dates, setDates] = useState<string[]>([]),
    [dateError, setDateError] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget),
      value = (key: string) => String(form.get(key) ?? "");
    if (editor.kind === "type")
      onReview(
        {
          action: "type",
          body: {
            ...(editor.type ? { id: editor.type.id } : {}),
            name: value("name"),
            startsLocal: value("start"),
            durationMinutes: Number(value("duration")),
            active: value("active") === "on",
          },
        },
        editor.type?.version,
      );
    if (editor.kind === "series") {
      const type = data.types.find((row) => row.id === value("type"));
      if (
        recurrence === "dates" &&
        (!dates.length ||
          dates.some((date) => date < fromDate || date > untilDate) ||
          !type)
      ) {
        setDateError(
          "Selecione ao menos uma data dentro do período escolhido.",
        );
        return;
      }
      setDateError("");
      onReview({
        action: "series",
        body: {
          professionalId: value("person"),
          shiftTypeId: value("type"),
          timezone: value("zone"),
          recurrence: recurrence as "once" | "weekly" | "cycle" | "dates",
          weekdays: form.getAll("day").map(Number),
          ...(recurrence === "cycle"
            ? {
                workHours: Number(cycle.split("x")[0]) as 12 | 24,
                restHours: Number(cycle.split("x")[1]) as 24 | 36 | 48,
              }
            : {}),
          ...(recurrence === "dates"
            ? { dates, shiftTypeVersion: type!.version }
            : {}),
          anchorDate: value("from"),
          validUntil: recurrence === "once" ? value("from") : value("until"),
          notes: value("notes"),
          ...(value("reason") ? { reason: value("reason") } : {}),
        },
      });
    }
    if (editor.kind === "end")
      onReview(
        {
          action: "end_series",
          body: {
            id: editor.id,
            fromDate: value("from"),
            reason: value("reason"),
          },
        },
        editor.version,
      );
    if (editor.kind === "reject")
      onReview(
        { action: "reject", body: { id: editor.id, reason: value("reason") } },
        editor.version,
      );
    if (editor.kind === "reject_change")
      onReview(
        {
          action: "decide_change",
          body: { id: editor.id, approve: false, reason: value("reason") },
        },
        editor.version,
      );
    if (editor.kind === "shift") {
      if (shiftAction === "cancel")
        onReview(
          {
            action: "cancel",
            body: { id: editor.shift.id, reason: value("reason") },
          },
          editor.shift.version,
        );
      else {
        let startsAt: string, endsAt: string;
        try {
          startsAt = civilInstant(value("start"), editor.shift.timezone);
          endsAt = civilInstant(value("end"), editor.shift.timezone);
        } catch (error) {
          const input = event.currentTarget.elements.namedItem(
            "start",
          ) as HTMLInputElement;
          input.setCustomValidity((error as Error).message);
          input.reportValidity();
          input.oninput = () => input.setCustomValidity("");
          return;
        }
        onReview(
          {
            action: team || publishOwn ? "change" : "propose_change",
            body: {
              id: editor.shift.id,
              professionalId: value("person"),
              startsAt,
              endsAt,
              reason: value("reason"),
              notes: value("notes"),
            },
          },
          editor.shift.version,
        );
      }
    }
  }
  return (
    <form
      onSubmit={submit}
      className="hca-form-stack hca-schedule-form min-w-0"
    >
      {editor.kind === "type" ? (
        <>
          <FormField label="Nome do plantão">
            <TextInput
              name="name"
              required
              minLength={2}
              maxLength={100}
              defaultValue={editor.type?.name}
            />
          </FormField>
          <FormField label="Início local">
            <TextInput
              name="start"
              type="time"
              required
              defaultValue={editor.type?.starts_local.slice(0, 5) ?? "07:00"}
            />
          </FormField>
          <FormField label="Duração em minutos">
            <TextInput
              name="duration"
              type="number"
              min={15}
              max={1440}
              step={1}
              defaultValue={String(editor.type?.duration_minutes ?? 720)}
              required
            />
            <small>720 minutos = 12 horas; 1440 minutos = 24 horas.</small>
          </FormField>
          <CheckboxField
            name="active"
            label="Disponível para novas escalas"
            defaultChecked={editor.type?.is_active ?? true}
          />
          {editor.type ? (
            <p className="hca-muted">
              Plantões já programados conservam seus intervalos originais.
            </p>
          ) : null}
        </>
      ) : null}
      {editor.kind === "series" ? (
        <>
          <FormField label="Profissional">
            <SelectField
              name="person"
              defaultValue={team ? data.professionals[0]?.id : ownId}
              required
            >
              {data.professionals
                .filter((p) => team || p.id === ownId)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </SelectField>
          </FormField>
          <FormField label="Tipo de plantão">
            <SelectField name="type" required>
              {data.types
                .filter((t) => t.is_active)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} · {t.starts_local.slice(0, 5)} ·{" "}
                    {t.duration_minutes / 60}h
                  </option>
                ))}
            </SelectField>
          </FormField>
          <FormField label="Repetição">
            <SelectField
              value={recurrence}
              onChange={(e) => setRecurrence(e.target.value)}
            >
              <option value="weekly">Dias da semana</option>
              <option value="once">Data específica</option>
              <option value="dates">Datas escolhidas</option>
              <option value="cycle">Ciclo de trabalho e descanso</option>
            </SelectField>
          </FormField>
          {recurrence === "weekly" ? (
            <fieldset className="hca-weekdays">
              <legend>Dias da semana</legend>
              {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d, n) => (
                <CheckboxField
                  key={d}
                  label={d}
                  name="day"
                  value={String(n)}
                  defaultChecked={n === 1}
                />
              ))}
            </fieldset>
          ) : null}
          {recurrence === "cycle" ? (
            <FormField label="Regime">
              <SelectField value={cycle} onChange={(e) => setCycle(e.target.value)}>
                {["12x36", "24x48", "24x24"].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </SelectField>
              <small>
                Use um tipo com a mesma duração de trabalho. O ciclo mantém
                horas corridas a partir da data de início.
              </small>
            </FormField>
          ) : null}
          <FormField label="Primeiro dia / âncora">
            <TextInput
              name="from"
              type="date"
              value={fromDate}
              onChange={controlEvent => { const controlValue = controlEvent.currentTarget.value; return setFromDate(controlValue); }}
              required
            />
          </FormField>
          {recurrence !== "once" ? (
            <FormField label="Válida até">
              <TextInput
                name="until"
                type="date"
                value={untilDate}
                onChange={controlEvent => { const controlValue = controlEvent.currentTarget.value; return setUntilDate(controlValue); }}
                required
              />
              <small>
                Até 366 dias após a âncora. Todas as ocorrências são verificadas
                antes da gravação.
              </small>
            </FormField>
          ) : null}
          {recurrence === "dates" &&
          /^\d{4}-\d{2}-\d{2}$/.test(fromDate) &&
          /^\d{4}-\d{2}-\d{2}$/.test(untilDate) ? (
            <SelectedShiftDates
              key={fromDate.slice(0, 7)}
              from={fromDate}
              until={untilDate}
              selected={dates}
              onChange={setDates}
            />
          ) : null}
          {dateError ? <Notice error>{dateError}</Notice> : null}
          <FormField label="Fuso horário">
            <SelectField name="zone" defaultValue="America/Sao_Paulo">
              {[
                "America/Sao_Paulo",
                "America/Manaus",
                "America/Belem",
                "America/Fortaleza",
                "America/Cuiaba",
                "America/Rio_Branco",
                "America/Noronha",
                "UTC",
              ].map((z) => (
                <option key={z}>{z}</option>
              ))}
            </SelectField>
          </FormField>
          <FormField label="Observações">
            <TextAreaField name="notes" maxLength={2000} />
          </FormField>
          <FormField label="Motivo de registro retroativo, quando necessário">
            <TextInput name="reason" maxLength={1000} />
          </FormField>
          {!team && !publishOwn ? (
            <p className="hca-muted">
              Sua programação será proposta para aprovação.
            </p>
          ) : null}
        </>
      ) : null}
      {editor.kind === "end" ? (
        <>
          <p>
            As ocorrências a partir da data escolhida serão canceladas. O
            histórico e os documentos permanecem preservados.
          </p>
          <FormField label="Encerrar a partir de">
            <TextInput name="from" type="date" defaultValue={today} required />
          </FormField>
          <FormField label="Justificativa">
            <TextAreaField name="reason" required minLength={3} maxLength={1000} />
          </FormField>
        </>
      ) : null}
      {editor.kind === "reject" || editor.kind === "reject_change" ? (
        <FormField label="Motivo da rejeição">
          <TextAreaField name="reason" minLength={3} maxLength={1000} required />
        </FormField>
      ) : null}
      {editor.kind === "shift" ? (
        <>
          <p>
            {editor.shift.type_name} · {editor.shift.professional_name}
          </p>
          {team || publishOwn ? (
            <FormField label="Operação">
              <SelectField
                value={shiftAction}
                onChange={(e) => setShiftAction(e.target.value)}
              >
                <option value="change">Alterar / substituir</option>
                <option value="cancel">Cancelar por ausência</option>
              </SelectField>
            </FormField>
          ) : null}
          {shiftAction !== "cancel" ? (
            <>
              <FormField label="Profissional de destino">
                <SelectField
                  name="person"
                  defaultValue={editor.shift.professional_id}
                >
                  {data.professionals
                    .filter((p) => team || !publishOwn || p.id === ownId)
                    .map((p) => (
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
                  defaultValue={localMinute(
                    editor.shift.starts_at,
                    editor.shift.timezone,
                  )}
                  required
                />
              </FormField>
              <FormField label="Fim do plantão">
                <TextInput
                  name="end"
                  type="datetime-local"
                  defaultValue={localMinute(
                    editor.shift.ends_at,
                    editor.shift.timezone,
                  )}
                  required
                />
              </FormField>
              <p className="hca-muted">Horários em {editor.shift.timezone}.</p>
              <FormField label="Observações">
                <TextAreaField
                  name="notes"
                  defaultValue={editor.shift.notes}
                  maxLength={2000}
                />
              </FormField>
            </>
          ) : null}
          <FormField label="Justificativa">
            <TextAreaField name="reason" minLength={3} maxLength={1000} required />
          </FormField>
          {!team && !publishOwn ? (
            <p>
              A proposta depende de aprovação; o plantão atual permanece válido.
            </p>
          ) : null}
        </>
      ) : null}
      <ActionButton id="schedule-review-button" variant="primary" type="submit">
        Revisar alteração
      </ActionButton>
    </form>
  );
}
export function addDays(value: string, days: number) {
  const date = new Date(value + "T12:00:00Z");
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
