"use client";
import {
  ActionButton,
  CheckboxField,
  FormField,
  SelectField,
  TextAreaField,
  TextInput,
} from "@/components/ui/controls";
import { SearchSelect } from "@/components/ui/search-select";
import { useState, type RefObject } from "react";
import { formatZonedDate } from "@/lib/schedules/time";
import type { BalancePreparationPurpose } from "@/lib/forms/balance-preparation-purposes";
import type {
  BalancePreparationFields as Values,
  BalancePreparationReference,
} from "@/lib/validation/balance-preparations";
import { DeferralFacts } from "./balance-deferral-facts";
import { weekDays } from "./balance-forms";
const timezones = [
  "America/Sao_Paulo",
  "America/Manaus",
  "America/Belem",
  "America/Fortaleza",
  "America/Cuiaba",
  "America/Rio_Branco",
  "America/Noronha",
  "UTC",
];

export function BalancePreparationFields({
  purpose,
  targetResourceId,
  reference,
  values,
  onChange,
  onReview,
  canReview,
  allowDeferral,
  reasonRef,
  error,
}: {
  purpose: BalancePreparationPurpose;
  targetResourceId: string;
  reference: BalancePreparationReference | null;
  values: Values;
  onChange: (patch: Partial<Values>) => void;
  onReview: () => void;
  canReview: boolean;
  allowDeferral: boolean;
  reasonRef: RefObject<HTMLTextAreaElement | null>;
  error?: string;
}) {
  const [now] = useState(() => Date.now());
  const data = reference?.workspace,
    a = data?.assignments.find((x) => x.id === targetResourceId),
    request = data?.deferrals.find((x) => x.id === targetResourceId),
    zone = data?.regime?.timezone ?? values.timezone;
  const fmt = (s: string | null | undefined) =>
    s ? formatZonedDate(s, zone) : "Não preservado";
  const deadline =
    purpose === "assign"
      ? Math.min(
          ...(data?.obligations ?? [])
            .filter(
              (o) =>
                o.cycle_id === targetResourceId &&
                o.state === "pending" &&
                Date.parse(o.effective_due) > now,
            )
            .map((o) => Date.parse(o.effective_due)),
        )
      : Infinity;
  const targets = (data?.targets ?? []).filter(
    (t) =>
      ((purpose !== "defer" && purpose !== "request_deferral") ||
        !a ||
        Date.parse(t.starts_at) >= Date.parse(a.ends_at)) &&
      (purpose !== "assign" ||
        allowDeferral ||
        Date.parse(t.ends_at) <= deadline),
  );
  const selected = targets.find((t) => t.id === values.targetShiftId),
    type = (data?.types ?? []).find(
      (t) => t.id === values.shiftTypeId && t.is_active,
    ),
    person = (data?.professionals ?? []).find(
      (p) => p.id === values.professionalId,
    );
  const label = (t: (typeof targets)[number]) =>
    `${t.professional_name} · ${t.type_name} · ${fmt(t.starts_at)} → ${fmt(t.ends_at)}`;
  const decisionAvailable =
    purpose === "approve_deferral"
      ? request?.decisionContext.canApprove
      : purpose === "reject_deferral"
        ? request?.decisionContext.canReject
        : true;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onReview();
      }}
      className="hca-form-stack"
    >
      {purpose === "configure" ? (
        <>
          <CheckboxField
            name="enabled"
            label="Processamento automático neste paciente"
            checked={values.enabled === "true"}
            onChange={(e) =>
              onChange({ enabled: String(e.currentTarget.checked) })
            }
          />
          <p>
            A ativação gera obrigações a partir da data escolhida. Pausar não
            apaga pendências ou atrasos existentes.
          </p>
          <FormField label="Dia do balanço" required>
            <SelectField
              name="day"
              value={values.weekday ?? ""}
              onChange={(e) => onChange({ weekday: e.currentTarget.value })}
              required
            >
              <option value="">Escolha o dia</option>
              {weekDays.map((d, i) => (
                <option key={d} value={i}>
                  {d}
                </option>
              ))}
            </SelectField>
          </FormField>
          <FormField label="Plantão responsável" required>
            <SelectField
              name="type"
              value={values.shiftTypeId ?? ""}
              onChange={(e) => {
                const id = e.currentTarget.value;
                onChange({
                  shiftTypeId: id,
                  shiftTypeLabel:
                    data?.types.find((t) => t.id === id)?.name ?? "",
                });
              }}
              required
            >
              <option value="">Escolha o tipo de plantão</option>
              {values.shiftTypeId && !type ? (
                <option value={values.shiftTypeId} disabled>
                  {values.shiftTypeLabel || "Tipo preservado"} · indisponível
                </option>
              ) : null}
              {data?.types
                .filter((t) => t.is_active)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} · {t.starts_local.slice(0, 5)} ·{" "}
                    {t.duration_minutes / 60}h
                  </option>
                ))}
            </SelectField>
          </FormField>
          <FormField label="Profissional designado">
            <SelectField
              name="person"
              value={values.professionalId ?? ""}
              onChange={(e) => {
                const id = e.currentTarget.value;
                onChange({
                  professionalId: id,
                  professionalLabel:
                    data?.professionals.find((p) => p.id === id)?.name ?? "",
                });
              }}
            >
              <option value="">Derivar da escala real</option>
              {values.professionalId && !person ? (
                <option value={values.professionalId} disabled>
                  {values.professionalLabel || "Pessoa preservada"} ·
                  indisponível
                </option>
              ) : null}
              {data?.professionals.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </SelectField>
            <small>
              Se houver mais de uma pessoa no mesmo plantão, designe uma ou
              resolva a atribuição formalmente.
            </small>
          </FormField>
          <FormField label="Fuso do paciente" required>
            <SelectField
              name="zone"
              value={values.timezone ?? ""}
              onChange={(e) => onChange({ timezone: e.currentTarget.value })}
              required
            >
              <option value="">Escolha o fuso</option>
              {values.timezone && !timezones.includes(values.timezone) ? (
                <option value={values.timezone}>
                  {values.timezone} · fuso preservado
                </option>
              ) : null}
              {timezones.map((z) => (
                <option key={z}>{z}</option>
              ))}
            </SelectField>
          </FormField>
          <FormField label="Vigente a partir de" required>
            <TextInput
              name="from"
              type="date"
              value={values.startsOn ?? ""}
              onChange={(e) => onChange({ startsOn: e.currentTarget.value })}
              required
            />
          </FormField>
        </>
      ) : null}
      {purpose === "defer" || purpose === "request_deferral" ? (
        <>
          <p>
            Plantão atual: {fmt(a?.starts_at)} até {fmt(a?.ends_at)}.
          </p>
          <p>
            {purpose === "request_deferral"
              ? "O adiamento depende de aprovação familiar. A pendência e o prazo originais continuam válidos até a decisão."
              : "A decisão familiar registra um adiamento autorizado, separado de atraso."}
          </p>
        </>
      ) : null}
      {purpose === "approve_deferral" || purpose === "reject_deferral" ? (
        <>
          {request ? (
            <DeferralFacts deferral={request} timezone={zone} />
          ) : (
            <p>O pedido ainda não foi consultado nesta referência.</p>
          )}
          <p>
            {purpose === "approve_deferral"
              ? "A aprovação exige o mesmo alvo ainda elegível e a atribuição vigente."
              : "A recusa encerra somente este pedido; preserva atribuição, prazo original e prazo vigente."}
          </p>
        </>
      ) : null}
      {purpose === "assign" ? (
        <>
          <p>
            Escolha explicitamente um plantão elegível para resolver a pendência
            sem responsável.
          </p>
          <p>
            {allowDeferral
              ? "Escolher um período além do prazo vigente registra também sua decisão familiar de adiamento, preservando os atrasos já ocorridos."
              : "Sua permissão permite atribuir dentro do prazo vigente; adiamento exige capacidade familiar própria."}
          </p>
          {Number.isFinite(deadline) ? (
            <p>
              Prazo vigente desta obrigação:{" "}
              {fmt(new Date(deadline).toISOString())}.
            </p>
          ) : null}
        </>
      ) : null}
      {purpose === "assign" ||
      purpose === "defer" ||
      purpose === "request_deferral" ? (
        <>
          <FormField
            label="Plantão de destino"
            required
            helpText="Escolha uma pessoa e um período reais. A busca não escolhe automaticamente."
          >
            <SearchSelect
              name="target"
              query={values.targetShiftQuery ?? ""}
              selectedIds={values.targetShiftId ? [values.targetShiftId] : []}
              onQueryChange={(query) =>
                onChange({
                  targetShiftQuery: query,
                  targetShiftId: "",
                  targetShiftLabel: "",
                })
              }
              onSelectionChange={(ids) => {
                const t = targets.find((t) => t.id === ids[0]);
                onChange({
                  targetShiftId: ids[0] ?? "",
                  targetShiftLabel: t ? label(t) : "",
                  targetShiftQuery: t ? label(t) : "",
                });
              }}
              options={targets
                .filter((t) =>
                  label(t)
                    .toLocaleLowerCase("pt-BR")
                    .includes(
                      (values.targetShiftQuery ?? "").toLocaleLowerCase(
                        "pt-BR",
                      ),
                    ),
                )
                .map((t) => ({ value: t.id, label: label(t) }))}
            />
          </FormField>
          {values.targetShiftId ? (
            <p className="wrap-anywhere">
              Pessoa e período selecionados:{" "}
              {selected
                ? label(selected)
                : (values.targetShiftLabel || "Seleção preservada") +
                  " · indisponível nesta referência; escolha outro destino explicitamente."}
            </p>
          ) : null}
          {!targets.length ? (
            <p>
              Cadastre um próximo plantão elegível na escala ou consulte a
              referência novamente.
            </p>
          ) : null}
        </>
      ) : null}
      <FormField
        label="Justificativa"
        required
        error={error}
        helpText={`${(values.reason ?? "").length}/1000 caracteres. Motivo próprio; não substitui o motivo da solicitação original.`}
      >
        <TextAreaField
          ref={reasonRef}
          name="reason"
          value={values.reason ?? ""}
          onChange={(e) => onChange({ reason: e.currentTarget.value })}
          required
          minLength={3}
          maxLength={1000}
        />
      </FormField>
      <ActionButton
        variant="primary"
        type="submit"
        disabled={
          !canReview ||
          !decisionAvailable ||
          ((purpose === "assign" ||
            purpose === "defer" ||
            purpose === "request_deferral") &&
            !selected) ||
          (purpose === "configure" &&
            (!type || Boolean(values.professionalId && !person)))
        }
      >
        Revisar decisão
      </ActionButton>
    </form>
  );
}
