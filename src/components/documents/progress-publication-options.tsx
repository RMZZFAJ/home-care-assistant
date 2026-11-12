"use client";
import { useCallback, useState } from "react";
import { z } from "zod";
import { Notice } from "@/components/workspace";
import { ActionButton, FormField, SelectField, TextInput } from "@/components/ui/controls";
import { useScopedRead } from "@/lib/use-scoped-read";
import { progressCareRoles, progressRelevance } from "@/lib/documents/progress-catalog";
import { progressPeoplePage, type ProgressPacket } from "@/lib/validation/document-progress";

type Publication = NonNullable<ProgressPacket["publication"]>;
type Person = z.infer<typeof progressPeoplePage>["data"][number];
export function ProgressPublicationOptions({ id, patientId, value, onChange, disabled }: {
  id: string; patientId: string; value: Publication; onChange: (value: Publication) => void; disabled: boolean;
}) {
  const [search, setSearch] = useState(""), [query, setQuery] = useState<string | null>(null), [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Person[]>([]);
  const decode = useCallback((raw: unknown) => {
    const result = progressPeoplePage.parse(z.object({ data: z.unknown() }).parse(raw).data);
    if (result.documentId !== id || result.careRecipientId !== patientId || result.search !== query || result.page !== page || result.data.length > result.total || new Set(result.data.map(x => x.id)).size !== result.data.length)
      throw new Error("A consulta de pessoas não corresponde à ficha e à página selecionadas.");
    return result;
  }, [id, patientId, query, page]);
  const people = useScopedRead(query === null || disabled ? null : "/api/documents/" + id + "/progress/people?search=" + encodeURIComponent(query) + "&page=" + page, "", decode);
  const choices = !people.loading && !people.error ? people.data : null;
  return <fieldset disabled={disabled} className="hca-reference-picker">
    <legend>Detalhes da publicação</legend>
    <FormField label="Destaque do andamento">
      <SelectField value={value.relevance} onChange={event => onChange({ ...value, relevance: event.currentTarget.value as Publication["relevance"] })}>
        {Object.entries(progressRelevance).map(([key, item]) => <option key={key} value={key}>{item.label}</option>)}
      </SelectField>
    </FormField>
    <p className="hca-field-help">Escolha ao publicar. Uma menção identifica a pessoa citada; não registra ciência, autoria, assinatura ou recebimento.</p>
    <div className="hca-toolbar">
      <TextInput aria-label="Nome da pessoa a mencionar" value={search} maxLength={100} onChange={event => setSearch(event.currentTarget.value)} />
      <ActionButton onClick={() => { setQuery(search.trim()); setPage(1); }}>Buscar pessoas para menção</ActionButton>
    </div>
    {people.loading ? <p role="status">Consultando pessoas deste paciente…</p> : people.error ? <Notice error>{people.error}</Notice> : null}
    {choices ? <>
      <ul className="hca-reference-options">{choices.data.map(person => <li key={person.id}>
        <ActionButton disabled={value.mentions.length >= 8 || value.mentions.includes(person.id)} onClick={() => {
          setSelected(rows => [...rows.filter(x => x.id !== person.id), person]);
          onChange({ ...value, mentions: [...value.mentions, person.id] });
        }}>Mencionar {person.name} · {progressCareRoles[person.careRole]}</ActionButton>
      </li>)}</ul>
      {!choices.data.length ? <p>Nenhuma pessoa ativa corresponde à busca nesta página.</p> : null}
      <nav className="hca-toolbar" aria-label="Páginas de pessoas para menção">
        <ActionButton disabled={page === 1} onClick={() => setPage(n => n - 1)}>Pessoas anteriores</ActionButton>
        <span>Página {page} de {Math.max(1, Math.ceil(choices.total / 20))}</span>
        <ActionButton disabled={page * 20 >= choices.total} onClick={() => setPage(n => n + 1)}>Próximas pessoas</ActionButton>
      </nav>
    </> : null}
    {value.mentions.length ? <ul>{value.mentions.map(id => <li key={id}>
      {selected.find(x => x.id === id)?.name ?? "Pessoa selecionada"}{" "}
      <ActionButton compact onClick={() => onChange({ ...value, mentions: value.mentions.filter(x => x !== id) })}>Remover menção a {selected.find(x => x.id === id)?.name ?? "pessoa selecionada"}</ActionButton>
    </li>)}</ul> : null}
    <p className="hca-field-help">Até oito pessoas com vínculo ativo neste paciente. As escolhas serão conferidas ao publicar.</p>
  </fieldset>;
}
