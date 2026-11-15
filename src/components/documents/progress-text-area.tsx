"use client";
import { useCallback, useId, useLayoutEffect, useRef, useState, type ComponentProps } from "react";
import { z } from "zod";
import { ActionButton, TextAreaField } from "@/components/ui/controls";
import { useScopedRead } from "@/lib/use-scoped-read";
import { progressPeoplePage, progressReferencePage, progressPerson, progressReferenceRow } from "@/lib/validation/document-progress";

type Person = z.infer<typeof progressPerson>;
type Reference = z.infer<typeof progressReferenceRow>;
export function ProgressTextArea({ documentId, value, onText, onMention, onReference, allowCollective = true, ...props }: Omit<ComponentProps<typeof TextAreaField>, "value" | "onChange"> & {
  documentId: string; value: string; onText: (value: string) => void; onMention: (person: Person) => boolean; onReference: (reference: Reference, text?: string) => void; allowCollective?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const selectionRef = useRef<{ value: string; position: number } | null>(null);
  useLayoutEffect(() => {
    const selection = selectionRef.current;
    if (!selection) return;
    selectionRef.current = null;
    ref.current?.focus();
    if (value === selection.value) ref.current?.setSelectionRange(selection.position, selection.position);
  });
  const suggestionsRef = useRef<HTMLDivElement>(null), suggestionsId = useId();
  const [cursor, setCursor] = useState(0), [dismissed, setDismissed] = useState("");
  const [paging, setPaging] = useState({ token: "", page: 1 });
  const before = value.slice(0, cursor), match = /(?:^|\s)([@#])([^\s@#]{0,100})$/.exec(before);
  const token = match ? match[1] + match[2] : "";
  const page = paging.token === token ? paging.page : 1;
  const active = Boolean(token && token !== dismissed && !props.disabled);
  const kind = match?.[1], search = match?.[2] ?? "";
  const decodePeople = useCallback((raw: unknown) => { const result = progressPeoplePage.parse(z.object({ data: z.unknown() }).parse(raw).data); if (result.documentId !== documentId || result.search !== search || result.page !== page) throw new Error("A consulta de pessoas não corresponde a esta ficha."); return result; }, [documentId, search, page]);
  const decodeReferences = useCallback((raw: unknown) => { const result = progressReferencePage.parse(raw); if (result.documentId !== documentId || result.search !== search || result.page !== page) throw new Error("A consulta de referências não corresponde a esta ficha."); return result; }, [documentId, search, page]);
  const people = useScopedRead(active && kind === "@" ? `/api/documents/${documentId}/progress/people?search=${encodeURIComponent(search)}&page=${page}` : null, "", decodePeople);
  const references = useScopedRead(active && kind === "#" ? `/api/documents/${documentId}/progress/references?search=${encodeURIComponent(search)}&page=${page}` : null, "", decodeReferences);
  const choices = kind === "@" ? people : references;
  function insert(text: string) {
    const start = cursor - token.length;
    const next = value.slice(0, start) + text + " " + value.slice(cursor);
    if (next.length > 2000) return;
    selectionRef.current = { value: next, position: start + text.length + 1 };
    onText(next); setCursor(start + text.length + 1);setDismissed(token);
  }
  return <div className="hca-progress-text-editor"><TextAreaField {...props} ref={ref} value={value} maxLength={2000} aria-controls={active ? suggestionsId : undefined} aria-autocomplete="list" onChange={event => { selectionRef.current = null;onText(event.currentTarget.value); setCursor(event.currentTarget.selectionStart); setDismissed(""); }} onSelect={event => setCursor(event.currentTarget.selectionStart)} onKeyDown={event => { if (active && event.key === "Escape") { setDismissed(token); event.stopPropagation(); } if (active && event.key === "ArrowDown") { const first = suggestionsRef.current?.querySelector<HTMLButtonElement>("button:not(:disabled)"); if (first) { event.preventDefault(); first.focus(); } } }} />
    {active ? <div ref={suggestionsRef} id={suggestionsId} className="hca-token-suggestions" role="group" aria-label={kind === "@" ? "Pessoas para mencionar" : "Fichas e andamentos para referência"} onKeyDown={event => { if (event.key === "Escape") { event.stopPropagation(); setDismissed(token); ref.current?.focus(); } }}>
      {allowCollective && kind === "@" && "todos".startsWith(search.toLocaleLowerCase("pt-BR")) ? <ActionButton onClick={() => insert("@todos")}>@todos · Todos com acesso à ficha</ActionButton> : null}
      {kind === "@" && !people.loading && !people.error ? people.data?.data.map(person => <ActionButton key={person.id} onClick={() => { if (onMention(person)) insert("@" + person.name); }}>@{person.name}</ActionButton>) : null}
      {kind === "#" && !references.loading && !references.error ? references.data?.data.map(reference => <ActionButton key={reference.id} onClick={() => { const text = "#" + (reference.code ?? reference.type) + (reference.kind === "progress" ? " (andamento)" : ""); const start = cursor - token.length, next = value.slice(0, start) + text + " " + value.slice(cursor); selectionRef.current = { value: next, position: start + text.length + 1 };onReference(reference, next);setCursor(start + text.length + 1);setDismissed(token); }}>{reference.kind === "progress" ? "Andamento · " : "Ficha · "}{reference.code ?? reference.type}{reference.excerpt ? " · " + reference.excerpt : ""}</ActionButton>) : null}
      {(kind === "@" ? people.loading : references.loading) ? <p role="status">Consultando sugestões autorizadas…</p> : null}
      {(kind === "@" ? people.error : references.error) ? <p role="alert">Não foi possível consultar sugestões. Seu texto foi preservado.</p> : null}
      {!choices.loading && !choices.error && choices.data && choices.data.total > 20 ? <div className="hca-toolbar"><ActionButton disabled={page === 1} onClick={() => setPaging({ token, page: page - 1 })}>Sugestões anteriores</ActionButton><span>Página {page} de {Math.ceil(choices.data.total / 20)}</span><ActionButton disabled={page * 20 >= choices.data.total} onClick={() => setPaging({ token, page: page + 1 })}>Próximas sugestões</ActionButton></div> : null}
      <ActionButton variant="quiet" onClick={() => { setDismissed(token); ref.current?.focus(); }}>Fechar sugestões</ActionButton>
    </div> : null}
  </div>;
}
