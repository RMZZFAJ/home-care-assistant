"use client";

import Link from "next/link";
import { FormField, SelectField, TextAreaField } from "@/components/ui/controls";
import { Notice } from "@/components/workspace";
import type { ScheduleBalanceReview } from "@/lib/schedules/balance-impact";
import type { ScheduleBalanceDecision } from "@/lib/schedules/resource-preparations";
import { formatZonedDate } from "@/lib/schedules/time";

export const balanceScheduleLabels = {
  keep: "Manter a responsabilidade e o prazo atuais",
  assign: "Designar outro plantão no mesmo prazo",
  defer: "Aprovar adiamento para outro plantão",
};

export function ScheduleBalanceImpact({ review, value, onChange }: {
  review: ScheduleBalanceReview;
  value?: ScheduleBalanceDecision;
  onChange: (value?: ScheduleBalanceDecision) => void;
}) {
  const { impact, keep, assign, defer } = review;
  if (impact.restricted || !impact.canDecide) return (
    <Notice error>
      Esta alteração afeta uma contagem de balanço. Uma pessoa da família habilitada precisa decidir como encaminhá-la.
    </Notice>
  );
  const selected = value?.assignmentId === impact.assignmentId && value.assignmentVersion === impact.assignmentVersion &&
    value.sourceVersion === impact.sourceVersion ? value : undefined;
  const selectedTarget = selected && selected.decision !== "keep" ? review[selected.decision] : [];
  const targetAvailable = selectedTarget.some(shift => shift.id === selected?.targetShiftId && shift.version === selected.targetShiftVersion);

  return (
    <section className="hca-form-stack hca-schedule-impact" aria-label="Impacto em balanço">
      <h3>O balanço também será afetado</h3>
      <div>
        <strong>{impact.document?.protocol ?? "Balanço de " + formatZonedDate(impact.startsAt, impact.timezone).split(",")[0]}</strong>
        <p>{impact.inProgress ? "Contagem em preenchimento" : "Ainda não contado"}</p>
        <p>{impact.professionalName} · prazo atual {formatZonedDate(impact.endsAt, impact.timezone)}</p>
        {impact.document ? <Link href={`/fichas/${impact.document.id}`}>Consultar ficha de balanço</Link> : null}
      </div>
      {value && !selected ? <Notice>A referência do balanço mudou. Revise o encaminhamento antes de confirmar.</Notice> : null}
      <FormField label="O que fazer com o balanço" required>
        <SelectField required value={selected?.decision ?? ""} onChange={(event) => {
          const decision = event.currentTarget.value;
          onChange(decision === "keep" || decision === "assign" || decision === "defer" ? {
            decision, assignmentId: impact.assignmentId, assignmentVersion: impact.assignmentVersion,
            sourceVersion: impact.sourceVersion, reason: value?.reason ?? "",
          } : undefined);
        }}>
          <option value="">Escolha uma decisão</option>
          {keep ? <option value="keep">{balanceScheduleLabels.keep}</option> : null}
          {assign.length ? <option value="assign">{balanceScheduleLabels.assign}</option> : null}
          {impact.canDefer && defer.length ? <option value="defer">{balanceScheduleLabels.defer}</option> : null}
        </SelectField>
      </FormField>
      {!keep && !assign.length && !defer.length ? (
        <Notice>Cadastre um plantão elegível para encaminhar a contagem antes de confirmar.</Notice>
      ) : null}
      {selected && selected.decision !== "keep" ? (
        <FormField label="Plantão de destino da contagem" required
          error={selected.targetShiftId && !targetAvailable ? "O plantão selecionado já não está disponível. Escolha outro destino." : undefined}>
          <SelectField required value={targetAvailable ? selected.targetShiftId : ""} onChange={(event) => {
            const target = selectedTarget.find((shift) => shift.id === event.currentTarget.value);
            onChange({ ...selected, targetShiftId: target?.id, targetShiftVersion: target?.version });
          }}>
            <option value="">Selecione o plantão</option>
            {selectedTarget.map((shift) => (
              <option key={shift.id} value={shift.id}>
                {shift.professionalName} · {formatZonedDate(shift.startsAt, shift.timezone)} até {formatZonedDate(shift.endsAt, shift.timezone)}
              </option>
            ))}
          </SelectField>
        </FormField>
      ) : null}
      {selected ? (
        <FormField label="Motivo da decisão sobre o balanço" required>
          <TextAreaField required minLength={3} maxLength={1000} value={selected.reason}
            onChange={(event) => onChange({ ...selected, reason: event.currentTarget.value })} />
        </FormField>
      ) : null}
    </section>
  );
}
