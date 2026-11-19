"use client";
import { Notice } from "@/components/workspace";
import { ActionButton, FormField, SelectField } from "@/components/ui/controls";
import { progressRelevance } from "@/lib/documents/progress-catalog";
import type { ProgressPacket } from "@/lib/validation/document-progress";

type Publication = NonNullable<ProgressPacket["publication"]>;
export function ProgressPublicationOptions({ value, onChange, disabled, canPrivate = false, privateOnly = false, collective = false, mentionNames }: {
  value: Publication; onChange: (value: Publication) => void; disabled: boolean;
  canPrivate?: boolean; privateOnly?: boolean; collective?: boolean; mentionNames: Record<string, string>;
}) {
  return <fieldset disabled={disabled} className="hca-progress-publication">
    <FormField label="Destaque do andamento">
      <SelectField value={value.relevance} onChange={event => onChange({ ...value, relevance: event.currentTarget.value as Publication["relevance"] })}>
        {Object.entries(progressRelevance).map(([key, item]) => <option key={key} value={key}>{item.label}</option>)}
      </SelectField>
    </FormField>
    {!privateOnly && canPrivate ? (
      <label className="hca-progress-visibility">
        <span>Andamento privado</span>
        <input
          type="checkbox"
          role="switch"
          checked={!collective && value.visibility === "family"}
          disabled={disabled || collective}
          onChange={event => onChange({ ...value, visibility: event.currentTarget.checked ? "family" : "public" })}
        />
      </label>
    ) : null}
    {collective && privateOnly ? <Notice error>Os Andamentos da família são privados. Mencione cada pessoa pelo nome em vez de usar @todos.</Notice> : collective ? <Notice>Você mencionou @todos. Este andamento será visível a todos com acesso à ficha.</Notice> : <p className="hca-field-help">{privateOnly || value.visibility === "family" ? "Privado: a família autorizada e as pessoas mencionadas poderão ler este andamento. Cada pessoa mencionada precisa manter acesso à ficha." : "Visível às pessoas que têm acesso à ficha."}</p>}
    {value.mentions.length ? <ul className="hca-progress-selected">{value.mentions.map(id => <li key={id}>
      @{mentionNames[id] ?? "Pessoa selecionada"}{" "}
      <ActionButton compact onClick={() => onChange({ ...value, mentions: value.mentions.filter(person => person !== id) })}>Remover menção a {mentionNames[id] ?? "pessoa selecionada"}</ActionButton>
    </li>)}</ul> : null}
    <p className="hca-field-help">Digite @ para mencionar uma pessoa ou # para vincular uma ficha ou andamento. Até oito pessoas e oito referências. Uma menção não registra ciência, autoria ou recebimento.</p>
  </fieldset>;
}
