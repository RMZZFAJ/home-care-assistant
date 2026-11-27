"use client";

import Link from "next/link";
import { can, Notice, type WorkspaceContext } from "@/components/workspace";
import { scheduleResidenceSettingsHref } from "@/lib/schedules/routes";

export function canConfigureResidenceHours(context: WorkspaceContext) {
  return context.activeContext?.mode === "patient"
    && can(context, "access.manage")
    && can(context, "schedule.types.manage");
}

export function ScheduleResidenceRequirement({
  context,
  day,
}: {
  context: WorkspaceContext;
  day: string;
}) {
  return (
    <Notice>
      <p>Defina o fuso da residência e o início dos períodos diurno e noturno antes de programar plantões.</p>
      {context.patient && canConfigureResidenceHours(context) ? (
        <Link href={scheduleResidenceSettingsHref(context.patient.id, day)} prefetch={false}>
          Configurar horários da residência
        </Link>
      ) : (
        <p>Peça à administração do paciente para configurar os horários.</p>
      )}
    </Notice>
  );
}
