"use client";
import { ActionButton } from "@/components/ui/controls";
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
  editor: Extract<ScheduleEditor, { kind: "type" | "series" }>;
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
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
