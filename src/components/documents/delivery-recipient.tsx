"use client";
import { useEffect, useId, useRef, useState, type Dispatch, type Ref, type SetStateAction } from "react";

import { Notice } from "@/components/workspace";
import { ActionButton, FormField, Pill, TextAreaField, TextInput } from "@/components/ui/controls";
import { Dialog } from "@/components/ui/overlays";
import { Icon } from "@/components/ui/icon";
import { roleLabel } from "@/lib/role-labels";
import { normalizeCatalogText } from "@/lib/catalog-match";
import { formatBrazilDate } from "@/lib/receipt";
import type {
  DeliveryPreparation,
  DeliveryRecipientSelection,
} from "@/types/documents";
import type { WizardState } from "./supply-wizard-step";

export function WizardRecipientCard({ title, name, role, duty, invalid, disabled, onEdit, triggerRef }: {
  title: string; name?: string; role?: string; duty?: string; invalid?: boolean;
  disabled?: boolean; onEdit: () => void; triggerRef: Ref<HTMLButtonElement>;
}) {
  return <>
    <div className="hca-issuance-observation-heading">
      <h3>{title}</h3>
      <ActionButton ref={triggerRef} compact variant="quiet" aria-label={name ? "Alterar recebedor" : "Escolher recebedor"}
        aria-invalid={invalid || undefined} disabled={disabled} onClick={onEdit}>
        <Icon name="edit" />{name ? "Alterar" : "Escolher"}
      </ActionButton>
    </div>
    <div className="hca-source-summary hca-wizard-recipient">
      <span className="hca-source-symbol"><Icon name="user" /></span>
      <div>
        <strong>{name || "Recebedor a definir"}</strong>
        <small>{role ? roleLabel(role) : "Escolha uma pessoa habilitada para a conferência."}</small>
      </div>
      {duty ? <Pill tone="success"><Icon name="clock" width={12} height={12} />{duty}</Pill> : null}
    </div>
  </>;
}

const shiftTime = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

function dutyByPerson(shifts: DeliveryPreparation["shifts"]) {
  const duty = new Map<string, string>();
  for (const shift of shifts) {
    if (!duty.has(shift.professionalId)) duty.set(shift.professionalId,
      `Em plantão · ${shiftTime.format(new Date(shift.startsAt))}–${shiftTime.format(new Date(shift.endsAt))}`);
  }
  return duty;
}

export function WizardRecipientOptions({ label, people, value, onChange, duty, disabled, groupRef }: {
  label: string;
  people: DeliveryPreparation["people"];
  value: string;
  onChange: (id: string) => void;
  duty?: ReadonlyMap<string, string>;
  disabled?: boolean;
  groupRef?: Ref<HTMLFieldSetElement>;
}) {
  const groupId = useId();
  const [search, setSearch] = useState("");
  const query = normalizeCatalogText(search);
  const visible = people.filter(person => normalizeCatalogText(person.name).includes(query));
  return <fieldset className="hca-recipient-options" ref={groupRef} disabled={disabled}>
    <legend className="sr-only">{label}</legend>
    {people.length > 8 ? <FormField label="Buscar recebedor">
      <TextInput type="search" value={search} onChange={event => setSearch(event.currentTarget.value)} />
    </FormField> : null}
    {visible.map(person => {
      const shift = duty?.get(person.id);
      const labelId = `${groupId}-${person.id}`;
      return <label key={person.id} className="hca-recipient-option">
        <input type="radio" name={groupId} value={person.id} checked={value === person.id}
          aria-labelledby={labelId} aria-describedby={`${labelId}-status`} onChange={() => onChange(person.id)} />
        <span>
          <strong id={labelId}>{person.name}</strong>
          <span id={`${labelId}-status`}>{shift ? <Pill tone="success"><Icon name="clock" width={12} height={12} />{shift}</Pill>
            : <Pill>{roleLabel(person.role)}</Pill>}</span>
        </span>
      </label>;
    })}
    {!visible.length && query ? <p role="status">Nenhum recebedor encontrado.</p> : null}
  </fieldset>;
}

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
  const triggerRef = useRef<HTMLButtonElement>(null);
  const groupRef = useRef<HTMLFieldSetElement>(null);
  const helpRef = useRef<HTMLParagraphElement>(null);
  const focusAfterAdoptRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [reason, setReason] = useState("");
  const chosen = data?.people.find(person => person.id === form.recipientId);
  const selected = data?.people.find(person => person.id === selectedId);
  const duty = dutyByPerson(data?.shifts ?? []);
  const needsReason = Boolean(selectedId &&
    (selectedId !== data?.suggestedId || (previousRecipient && previousRecipient !== selectedId)));
  const missing = fieldErrors.recipientId || fieldErrors.recipientReason || fieldErrors.recipientContext;
  useEffect(() => {
    if (!open || comparison || loading || error || !focusAfterAdoptRef.current) return;
    const frame = requestAnimationFrame(() => {
      focusAfterAdoptRef.current = false;
      const first = groupRef.current?.querySelector<HTMLInputElement>("input:checked")
        ?? groupRef.current?.querySelector<HTMLInputElement>("input");
      first?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [open, comparison, loading, error]);

  function edit() {
    focusAfterAdoptRef.current = false;
    setSelectedId(form.recipientId);
    setReason(form.recipientReason ?? "");
    setOpen(true);
    if (!comparison) onRefresh();
  }

  function apply() {
    if (!selected || comparison || (needsReason && reason.trim().length < 3)) return;
    setForm(current => ({ ...current, recipientId: selected.id, recipientReason: reason.trim() }));
    setOpen(false);
  }

  return <section className="hca-form-stack" aria-label="Escolha do recebedor">
    <WizardRecipientCard title={data?.destination === "FAMILY" ? "Quem receberá na família" : "Quem receberá na equipe"}
      name={chosen?.name} role={chosen?.role} duty={chosen && duty.get(chosen.id)} invalid={Boolean(missing)}
      disabled={loading || (!error && !data?.people.length)} onEdit={edit} triggerRef={triggerRef} />
    {loading ? <p className="hca-field-help" role="status">Consultando escala e recebedores elegíveis…</p> : null}
    {!open && (missing || error) ? <Notice error>{missing || error}</Notice> : null}
    {data && !chosen && data.state !== "no_eligible_recipient" ? <p className="hca-field-help">{stateLabels[data.state]}</p> : null}
    {data?.state === "no_eligible_recipient" ? <Notice>{stateLabels.no_eligible_recipient}</Notice> : null}
    {comparison && !open ? <Notice>Confira a referência atual da escala ao alterar o recebedor.</Notice> : null}
    {open ? <Dialog open title="Escolher quem receberá" kicker="Entrega" popupClassName="hca-wizard-dialog" finalFocus={triggerRef}
      subtitle="Escolha a pessoa que conferirá os materiais."
      onClose={() => setOpen(false)} keyboardScrollable
      footer={<>
        <ActionButton onClick={() => setOpen(false)}>Voltar</ActionButton>
        <ActionButton variant="primary" disabled={loading || Boolean(error) || Boolean(comparison) || !selected || needsReason && reason.trim().length < 3}
          onClick={apply}><Icon name="check" />Usar recebedor</ActionButton>
      </>}>
      <div className="hca-form-stack">
        {loading ? <p role="status">Consultando escala e recebedores elegíveis…</p> : null}
        {error ? <Notice error>{error}<ActionButton compact onClick={onRefresh}>Tentar consultar novamente</ActionButton></Notice> : null}
        {comparison ? <section className="hca-form-stack" aria-label="Comparação do recebedor">
          <h3>Referências atualizadas</h3>
          <DeliveryRecipientReference data={comparison} />
          <ActionButton disabled={loading || Boolean(error)} onClick={() => {
            helpRef.current?.focus({ preventScroll: true });
            focusAfterAdoptRef.current = true;
            onAdopt();
          }}>Usar referências atuais</ActionButton>
        </section> : null}
        <WizardRecipientOptions label="Destinatário designado" people={data?.people ?? []} value={selectedId}
          onChange={setSelectedId} duty={duty} disabled={loading || Boolean(error) || Boolean(comparison)} groupRef={groupRef} />
        <p ref={helpRef} tabIndex={-1} className="hca-field-help">Somente a pessoa que receber fisicamente pode confirmar o recebimento.</p>
        {needsReason || reason ? <FormField label="Justificativa da escolha do recebedor" required={needsReason}>
          <TextAreaField rows={3} minLength={3} maxLength={1000} value={reason} onChange={event => setReason(event.currentTarget.value)} />
        </FormField> : null}
      </div>
    </Dialog> : null}
  </section>;
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
        <p className="whitespace-pre-wrap wrap-break-word">
          Justificativa da escolha: {selection.reason}
        </p>
      ) : null}
      <p>Essa indicação não é aceite de recebimento.</p>
    </section>
  );
}
