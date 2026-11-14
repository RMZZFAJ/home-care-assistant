import {
  balanceCommandSchema,
  type BalanceCommand,
} from "../validation/balances";
import type {
  BalancePreparationFields,
  BalancePreparationReference,
} from "../validation/balance-preparations";
import type { BalancePreparationPurpose } from "./balance-preparation-purposes";

export function balancePreparationVersion(
  reference: BalancePreparationReference,
): number | null {
  if (reference.purpose === "configure")
    return reference.workspace.regime?.version ?? null;
  if (reference.purpose === "defer" || reference.purpose === "request_deferral")
    return (
      reference.workspace.assignments.find(
        (a) => a.id === reference.targetResourceId,
      )?.version ?? null
    );
  return null;
}
export function initialBalancePreparationFields(
  workspace: Pick<
    BalancePreparationReference["workspace"],
    "regime" | "types" | "professionals"
  >,
  today: string,
): BalancePreparationFields {
  const r = workspace.regime;
  return {
    reason: "",
    enabled: String(r?.enabled ?? false),
    weekday: String(r?.weekday ?? 1),
    shiftTypeId: r?.shift_type_id ?? "",
    shiftTypeLabel:
      workspace.types.find((t) => t.id === r?.shift_type_id)?.name ?? "",
    professionalId: r?.designated_professional_id ?? "",
    professionalLabel:
      workspace.professionals.find(
        (p) => p.id === r?.designated_professional_id,
      )?.name ?? "",
    timezone: r?.timezone ?? "America/Sao_Paulo",
    startsOn: r?.starts_on ?? today,
    targetShiftId: "",
    targetShiftLabel: "",
    targetShiftQuery: "",
  };
}
export function balancePreparationCommand(
  purpose: BalancePreparationPurpose,
  targetResourceId: string,
  values: BalancePreparationFields,
): BalanceCommand {
  const reason = (values.reason ?? "").trim();
  if (
    purpose === "configure" &&
    (!["true", "false"].includes(values.enabled ?? "") ||
      !/^[0-6]$/.test(values.weekday ?? ""))
  )
    throw new Error(
      "Escolha o processamento e o dia do balanço antes de revisar.",
    );
  const command =
    purpose === "configure"
      ? {
          action: "configure",
          body: {
            enabled: values.enabled === "true",
            weekday: Number(values.weekday),
            shiftTypeId: values.shiftTypeId,
            professionalId: values.professionalId || null,
            timezone: values.timezone,
            startsOn: values.startsOn,
            reason,
          },
        }
      : purpose === "assign"
        ? {
            action: "assign",
            body: {
              cycleId: targetResourceId,
              targetShiftId: values.targetShiftId,
              reason,
            },
          }
        : purpose === "defer" || purpose === "request_deferral"
          ? {
              action: purpose,
              body: {
                assignmentId: targetResourceId,
                targetShiftId: values.targetShiftId,
                reason,
              },
            }
          : {
              action: "decide_deferral",
              body: {
                id: targetResourceId,
                approve: purpose === "approve_deferral",
                reason,
              },
            };
  return balanceCommandSchema.shape.command.parse(command);
}
