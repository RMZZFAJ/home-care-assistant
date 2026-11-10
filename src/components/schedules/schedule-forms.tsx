"use client";
import {
  ActionButton,
  FormField,
  SelectField,
  TextAreaField,
  TextInput,
} from "@/components/ui/controls";
import { useState, type FormEvent, type RefObject } from "react";
import { z } from "zod";

import type { ScheduleCommand } from "@/lib/validation/schedules";
import type {
  ScheduleWorkspace,
  ScheduledShift,
  ShiftType,
} from "@/types/schedules";
import { ScheduleCreationFields } from "./schedule-creation-fields";
import {
  initialScheduleType,
  initialScheduleSeries,
  scheduleCreationCommand,
  type ScheduleCreationFields as CreationFields,
} from "@/lib/schedules/creation";
import { Notice } from "@/components/workspace";
import { editedCivilInstant, localMinute } from "@/lib/schedules/time";
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
  creationFields,
  onCreationChange,
  reviewTriggerRef,
  datesMonth,
  onDatesMonthChange,
}: {
  editor: ScheduleEditor;
  data: ScheduleWorkspace;
  ownId: string;
  team: boolean;
  publishOwn?: boolean;
  today: string;
  onReview: (command: ScheduleCommand, version?: number) => void;
  creationFields?: CreationFields;
  onCreationChange?: (fields: CreationFields) => void;
  reviewTriggerRef?: RefObject<HTMLButtonElement | null>;
  datesMonth?: string | null;
  onDatesMonthChange?: (month: string) => void;
}) {
  const [localCreation, setLocalCreation] = useState<CreationFields>(() =>
    editor.kind === "series"
      ? initialScheduleSeries(data, ownId, team, today)
      : initialScheduleType(editor.kind === "type" ? editor.type : undefined),
  );
  const creation = creationFields ?? localCreation;
  const changeCreation = onCreationChange ?? setLocalCreation;
  const [creationError, setCreationError] = useState("");
  const [shiftAction, setShiftAction] = useState("change");
  // These fields survive the conditional cancel view. Native authorization and
  // the frozen source version are still checked when the command is submitted.
  const [shiftFields, setShiftFields] = useState(() => ({
    person: editor.kind === "shift" ? editor.shift.professional_id : "",
    start:
      editor.kind === "shift"
        ? localMinute(editor.shift.starts_at, editor.shift.timezone)
        : "",
    end:
      editor.kind === "shift"
        ? localMinute(editor.shift.ends_at, editor.shift.timezone)
        : "",
    notes: editor.kind === "shift" ? editor.shift.notes : "",
  }));
  function changeShift(field: keyof typeof shiftFields, value: string) {
    setShiftFields((previous) => ({ ...previous, [field]: value }));
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget),
      value = (key: string) => String(form.get(key) ?? "");
    if (editor.kind === "type" || editor.kind === "series") {
      try {
        if (creation.form === "series") {
          if (
            !data.professionals.some(
              (person) => person.id === creation.professionalId,
            )
          )
            throw new Error(
              "Confira se o profissional selecionado está disponível para esta programação.",
            );
          const selected = data.types.find(
            (t) => t.id === creation.shiftTypeId,
          );
          if (
            !selected?.is_active ||
            selected.version !== creation.shiftTypeVersion
          )
            throw new Error(
              "Compare e adote a versão atual do tipo de plantão antes de revisar.",
            );
        }
        const command = scheduleCreationCommand(creation);
        setCreationError("");
        if (editor.kind === "type" && editor.type && command.action === "type")
          onReview(
            { ...command, body: { ...command.body, id: editor.type.id } },
            editor.type.version,
          );
        else onReview(command);
      } catch (cause) {
        setCreationError(
          cause instanceof z.ZodError
            ? (cause.issues.find((issue) => issue.code === "custom")?.message ??
                "Confira os campos e as datas da programação. Seu preenchimento foi preservado.")
            : cause instanceof Error
              ? cause.message
              : "Confira o preenchimento antes de revisar.",
        );
      }
      return;
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
        let timeField = "start";
        try {
          startsAt = editedCivilInstant(
            shiftFields.start,
            editor.shift.starts_at,
            editor.shift.timezone,
          );
          timeField = "end";
          endsAt = editedCivilInstant(
            shiftFields.end,
            editor.shift.ends_at,
            editor.shift.timezone,
          );
        } catch (error) {
          const input = event.currentTarget.elements.namedItem(
            timeField,
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
              professionalId: shiftFields.person,
              startsAt,
              endsAt,
              reason: value("reason"),
              notes: shiftFields.notes,
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
      {editor.kind === "type" || editor.kind === "series" ? (
        <>
          <ScheduleCreationFields
            datesMonth={datesMonth}
            onDatesMonthChange={onDatesMonthChange}
            value={creation}
            onChange={changeCreation}
            data={data}
            ownId={ownId}
            team={team}
            publishOwn={publishOwn}
          />
          {editor.kind === "type" && editor.type ? (
            <p className="hca-muted">
              Plantões já programados conservam seus intervalos originais.
            </p>
          ) : null}
          {creationError ? <Notice error>{creationError}</Notice> : null}
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
            <TextAreaField
              name="reason"
              required
              minLength={3}
              maxLength={1000}
            />
          </FormField>
        </>
      ) : null}
      {editor.kind === "reject" || editor.kind === "reject_change" ? (
        <FormField label="Motivo da rejeição">
          <TextAreaField
            name="reason"
            minLength={3}
            maxLength={1000}
            required
          />
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
                  value={shiftFields.person}
                  onChange={(e) => changeShift("person", e.currentTarget.value)}
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
                  value={shiftFields.start}
                  onChange={(e) => changeShift("start", e.currentTarget.value)}
                  required
                />
              </FormField>
              <FormField label="Fim do plantão">
                <TextInput
                  name="end"
                  type="datetime-local"
                  value={shiftFields.end}
                  onChange={(e) => changeShift("end", e.currentTarget.value)}
                  required
                />
              </FormField>
              <p className="hca-muted">Horários em {editor.shift.timezone}.</p>
              <FormField label="Observações">
                <TextAreaField
                  name="notes"
                  value={shiftFields.notes}
                  onChange={(e) => changeShift("notes", e.currentTarget.value)}
                  maxLength={2000}
                />
              </FormField>
            </>
          ) : null}
          <FormField label="Justificativa">
            <TextAreaField
              name="reason"
              minLength={3}
              maxLength={1000}
              required
            />
          </FormField>
          {!team && !publishOwn ? (
            <p>
              A proposta depende de aprovação; o plantão atual permanece válido.
            </p>
          ) : null}
        </>
      ) : null}
      <ActionButton
        ref={reviewTriggerRef}
        id="schedule-review-button"
        variant="primary"
        type="submit"
      >
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
