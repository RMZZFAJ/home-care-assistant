"use client";
import { SearchSelect } from "@/components/ui/search-select";
import { useState, type Dispatch, type SetStateAction } from "react";

import { inputClass, Notice, buttonClass } from "@/components/workspace";
import { formatBrazilDate } from "@/lib/receipt";
import type {
  DeliveryPreparation,
  DeliveryRecipientSelection,
} from "@/types/documents";
import type { WizardState } from "./supply-wizard-step";

const stateLabels = {
  suggested: "A escala sugere uma pessoa para este horário.",
  ambiguous:
    "Há mais de uma pessoa escalada. Indique quem receberá e justifique a escolha.",
  no_schedule:
    "Não há sugestão inequívoca da escala neste horário. Escolha uma pessoa elegível e registre o motivo.",
  no_eligible_recipient:
    "Não há pessoa elegível para receber nesta direção. Mantenha a preparação pendente e procure a administração para regularizar o vínculo; ninguém pode confirmar por outra pessoa.",
};
export function DeliveryRecipientReference({
  data,
}: {
  data: DeliveryPreparation;
}) {
  return (
    <div className="space-y-2 text-sm">
      <p>{stateLabels[data.state]}</p>
      {data.suggestedId ? (
        <p>
          Sugestão:{" "}
          <strong>
            {data.people.find((p) => p.id === data.suggestedId)?.name}
          </strong>
        </p>
      ) : null}
      {data.shifts.map((shift) => (
        <p key={shift.id}>
          {shift.professionalName} · {formatBrazilDate(shift.startsAt)} até{" "}
          {formatBrazilDate(shift.endsAt)}
        </p>
      ))}
      <p className="text-xs text-(--muted)">
        Consultado em {formatBrazilDate(data.checkedAt)}. Escala não comprova
        presença ou recebimento.
      </p>
    </div>
  );
}
export function DeliveryRecipientField({
  data,
  comparison,
  error,
  loading,
  form,
  setForm,
  fieldErrors,
  previousRecipient,
  onRefresh,
  onAdopt,
}: {
  data: DeliveryPreparation | null;
  comparison: DeliveryPreparation | null;
  error: string;
  loading: boolean;
  form: WizardState;
  setForm: Dispatch<SetStateAction<WizardState>>;
  fieldErrors: Record<string, string>;
  previousRecipient?: string | null;
  onRefresh: () => void;
  onAdopt: () => void;
}) {
  const [search, setSearch] = useState<string | null>(null);
  const chosen = data?.people.find((person) => person.id === form.recipientId);
  const needsReason = Boolean(
    form.recipientId &&
    (form.recipientId !== data?.suggestedId ||
      (previousRecipient && previousRecipient !== form.recipientId)),
  );
  return (
    <section
      className="space-y-4 sm:col-span-2"
      aria-label="Escolha do recebedor"
    >
      {loading ? (
        <Notice>Consultando pessoas elegíveis e sugestão da escala…</Notice>
      ) : null}
      {error ? <Notice error>{error}</Notice> : null}
      {fieldErrors.recipientContext ? (
        <Notice error>{fieldErrors.recipientContext}</Notice>
      ) : null}
      {data ? <DeliveryRecipientReference data={data} /> : null}
      <button
        type="button"
        className={buttonClass}
        disabled={loading}
        onClick={onRefresh}
      >
        Atualizar pessoas e escala
      </button>
      {comparison ? (
        <section
          className="space-y-3 rounded-xl border border-(--line) p-4"
          aria-label="Comparação do recebedor"
        >
          <h3 className="font-semibold">Referências atualizadas</h3>
          <p>
            Sugestão revisada:{" "}
            {data?.people.find((person) => person.id === data.suggestedId)
              ?.name ?? "Sem sugestão"}
          </p>
          <DeliveryRecipientReference data={comparison} />
          <p>
            Seu recebedor e motivo digitados foram preservados. Confira a
            elegibilidade antes de continuar.
          </p>
          <button type="button" className={buttonClass} onClick={onAdopt}>
            Usar referências atuais
          </button>
        </section>
      ) : null}
      <div>
        <label
          htmlFor="delivery-recipient"
          className="block text-sm font-semibold"
        >
          Destinatário designado
        </label>
        <SearchSelect
          id="delivery-recipient"
          query={search ?? chosen?.name ?? ""}
          selectedIds={chosen ? [chosen.id] : []}
          disabled={
            loading ||
            Boolean(error) ||
            !data?.people.length ||
            Boolean(comparison)
          }
          required
          aria-invalid={Boolean(fieldErrors.recipientId)}
          aria-describedby={
            fieldErrors.recipientId
              ? "delivery-recipient-help delivery-recipient-error"
              : "delivery-recipient-help"
          }
          triggerLabel={"Abrir opções de recebedor"}
          placeholder="Busque e selecione quem receberá"
          onQueryChange={queryValue => {
            setSearch(queryValue);
            setForm((current) => ({ ...current, recipientId: "" }));
          }}
          onSelectionChange={nextIds => {
            if (
              data?.people.some((person) => person.id === nextIds[0])
            ) {
              setForm((current) => ({
                ...current,
                recipientId: nextIds[0]!,
              }));
              setSearch(null);
            }
          }}
          options={(data?.people
            .filter(
              (person) =>
                !search ||
                person.name
                  .toLocaleLowerCase("pt-BR")
                  .includes(search.toLocaleLowerCase("pt-BR")),
            )
            .map((person) => (
              ({ value: person.id, label: person.name, content: <>
                {person.name}
              </> })
            ))) ?? []}
        />
        <p id="delivery-recipient-help" className="hca-field-hint">
          Somente a pessoa que receber fisicamente poderá confirmar o aceite. A
          escolha não transfere essa autoria.
        </p>
        {fieldErrors.recipientId ? (
          <p id="delivery-recipient-error" className="ui-field-error">
            {fieldErrors.recipientId}
          </p>
        ) : null}
      </div>
      {needsReason || form.recipientReason ? (
        <div>
          <label
            htmlFor="delivery-recipient-reason"
            className="block text-sm font-semibold"
          >
            Justificativa da escolha do recebedor
          </label>
          <textarea
            id="delivery-recipient-reason"
            className={inputClass}
            rows={3}
            minLength={3}
            maxLength={1000}
            required={needsReason}
            value={form.recipientReason ?? ""}
            aria-invalid={Boolean(fieldErrors.recipientReason)}
            aria-describedby={
              fieldErrors.recipientReason
                ? "delivery-recipient-reason-help delivery-recipient-reason-error"
                : "delivery-recipient-reason-help"
            }
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                recipientReason: event.target.value,
              }))
            }
          />
          <p id="delivery-recipient-reason-help" className="hca-field-hint">
            {form.recipientReason?.length ?? 0}/1000 caracteres. Explique a
            escolha manual ou a troca; o motivo será preservado com sua autoria.
          </p>
          {fieldErrors.recipientReason ? (
            <p id="delivery-recipient-reason-error" className="ui-field-error">
              {fieldErrors.recipientReason}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
export function DeliveryRecipientFacts({
  selection,
}: {
  selection: DeliveryRecipientSelection;
}) {
  return (
    <section className="space-y-2 text-sm" aria-label="Indicação do recebedor">
      <h3 className="font-semibold">
        Recebedor indicado: {selection.recipientName}
      </h3>
      <p>
        {selection.manual ? "Escolha manual" : "Sugestão da escala mantida"} ·{" "}
        {selection.official ? "Expedição oficial" : "Preparação"}
      </p>
      <p>
        Indicado por {selection.selectedName} ·{" "}
        {formatBrazilDate(selection.recordedAt)}
      </p>
      {selection.reason ? (
        <p className="whitespace-pre-wrap break-words">
          Justificativa da escolha: {selection.reason}
        </p>
      ) : null}
      <p>Essa indicação não é aceite de recebimento.</p>
    </section>
  );
}
