"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";
import { ActionButton, TextAreaField } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { maximumIssuanceObservations, maximumIssuanceObservationLength } from "@/lib/documents/issuance-observations";
import { textRows } from "@/lib/text-rows";

export function IssuanceObservationsEditor({ observations, onChange, errors = {}, limitInput = true }: {
  observations: string[];
  onChange: (observations: string[]) => void;
  errors?: Record<string, string>;
  limitInput?: boolean;
}) {
  const groupId = useId();
  const [rowIds, setRowIds] = useState(() => observations.map(() => crypto.randomUUID()));
  const addRef = useRef<HTMLButtonElement>(null);
  const nextFocusRef = useRef<number | "add" | null>(null);
  useLayoutEffect(() => {
    const next = nextFocusRef.current;
    if (next === null) return;
    nextFocusRef.current = null;
    const control = next === "add" ? addRef.current : document.getElementById(`${groupId}-${next}`);
    control?.focus();
  }, [groupId, observations.length]);
  return <div className="hca-issuance-observations">
    <p className="doc-subtle">Registre o que a pessoa que acompanhará esta ficha precisa saber.</p>
    {observations.length ? <div className="hca-issuance-observation-list">
      {observations.map((value, index) => {
        const id = `${groupId}-${index}`;
        const field = `observation:${index}`;
        return <div key={rowIds[index] ?? id}>
          <div className="hca-issuance-observation-heading">
            <label htmlFor={id}>Observação {index + 1}</label>
            <ActionButton compact variant="quiet" aria-label={`Remover observação ${index + 1}`} onClick={() => {
              nextFocusRef.current = observations.length > 1 ? Math.min(index, observations.length - 2) : "add";
              setRowIds(ids => ids.filter((_, position) => position !== index));
              onChange(observations.filter((_, position) => position !== index));
            }}>Remover</ActionButton>
          </div>
          <TextAreaField id={id} rows={3} maxLength={limitInput ? maximumIssuanceObservationLength : undefined}
            placeholder="Escreva sua observação" value={value} data-field-error={field}
            aria-invalid={Boolean(errors[field]) || undefined} aria-describedby={errors[field] ? id + "-error" : undefined}
            onChange={event => {
              const edited = event.currentTarget.value;
              onChange(observations.map((text, position) => position === index ? edited : text));
            }} />
          {errors[field] ? <p id={id + "-error"} className="ui-field-error">{errors[field]}</p> : null}
        </div>;
      })}
    </div> : <p className="hca-issuance-observation-empty"><Icon name="comment" />Nenhuma observação adicionada.</p>}
    <ActionButton ref={addRef} disabled={observations.length >= maximumIssuanceObservations} onClick={() => {
      const rowId = crypto.randomUUID();
      nextFocusRef.current = observations.length;
      setRowIds(ids => [...ids, rowId]);
      onChange([...observations, ""]);
    }}><Icon name="plus" />Adicionar observação</ActionButton>
  </div>;
}

export function IssuanceObservationList({ observations, empty = "Sem observações." }: {
  observations: string[];
  empty?: string;
}) {
  return observations.length
    ? <ol className="doc-original-notes">{textRows(observations).map(row => <li key={row.key}>{row.value}</li>)}</ol>
    : <p className="doc-subtle">{empty}</p>;
}
