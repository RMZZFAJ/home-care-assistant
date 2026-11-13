"use client";
import { useCallback, useRef, useState, type ComponentProps } from "react";
import { z } from "zod";
import { ActionButton, TextAreaField } from "@/components/ui/controls";
import { useScopedRead } from "@/lib/use-scoped-read";
import { progressPeoplePage, progressReferencePage, progressPerson, progressReferenceRow } from "@/lib/validation/document-progress";

type Person = z.infer<typeof progressPerson>;
type Reference = z.infer<typeof progressReferenceRow>;
export function ProgressTextArea({ documentId, value, onText, onMention, onReference, ...props }: Omit<ComponentProps<typeof TextAreaField>, "value" | "onChange"> & {
  documentId: string; value: string; onText: (value: string) => void; onMention: (person: Person) => boolean; onReference: (reference: Reference, text?: string) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [cursor, setCursor] = useState(0), [dismissed, setDismissed] = useState("");
  const before = value.slice(0, cursor), match = /(?:^|\s)([@#])([^\s@#]{0,100})$/.exec(before);
  const token = match ? match[1] + match[2] : "";
  const active = Boolean(token && token !== dismissed && !props.disabled);
  const kind = match?.[1], search = match?.[2] ?? "";
  const decodePeople = useCallback((raw: unknown) => { const result = progressPeoplePage.parse(z.object({ data: z.unknown() }).parse(raw).data); if (result.documentId !== documentId || result.search !== search || result.page !== 1) throw new Error("A consulta de pessoas não corresponde a esta ficha."); return result; }, [documentId, search]);
  const decodeReferences = useCallback((raw: unknown) => { const result = progressReferencePage.parse(raw); if (result.documentId !== documentId || result.search !== search || result.page !== 1) throw new Error("A consulta de referências não corresponde a esta ficha."); return result; }, [documentId, search]);
  const people = useScopedRead(active && kind === "@" ? `/api/documents/${documentId}/progress/people?search=${encodeURIComponent(search)}` : null, "", decodePeople);
  const references = useScopedRead(active && kind === "#" ? `/api/documents/${documentId}/progress/references?search=${encodeURIComponent(search)}` : null, "", decodeReferences);
  function insert(text: string) {
    const start = cursor - token.length;
    const next = value.slice(0, start) + text + " " + value.slice(cursor);
    if (next.length > 2000) return;
    onText(next); setDismissed(token);
    requestAnimationFrame(() => { ref.current?.focus(); ref.current?.setSelectionRange(start + text.length + 1, start + text.length + 1); });
  }
  return <div className="hca-progress-text-editor"><TextAreaField {...props} ref={ref} value={value} maxLength={2000} onChange={event => { onText(event.currentTarget.value); setCursor(event.currentTarget.selectionStart); setDismissed(""); }} onSelect={event => setCursor(event.currentTarget.selectionStart)} onKeyDown={event => { if (event.key === "Escape") { setDismissed(token); event.stopPropagation(); } }} />
    {active ? <div className="hca-token-suggestions" role="group" aria-label={kind === "@" ? "Pessoas para mencionar" : "Fichas e andamentos para referência"}>
      {kind === "@" && "todos".startsWith(search.toLocaleLowerCase("pt-BR")) ? <ActionButton onClick={() => insert("@todos")}>@todos · Todos com acesso à ficha</ActionButton> : null}
      {kind === "@" && !people.loading && !people.error ? people.data?.data.map(person => <ActionButton key={person.id} onClick={() => { if (onMention(person)) insert("@" + person.name); }}>@{person.name}</ActionButton>) : null}
      {kind === "#" && !references.loading && !references.error ? references.data?.data.map(reference => <ActionButton key={reference.id} onClick={() => { const text = "#" + (reference.code ?? reference.type) + (reference.kind === "progress" ? " (andamento)" : ""); const start = cursor - token.length; onReference(reference, value.slice(0, start) + text + " " + value.slice(cursor)); setDismissed(token); requestAnimationFrame(() => ref.current?.focus()); }}>{reference.kind === "progress" ? "Andamento · " : "Ficha · "}{reference.code ?? reference.type}{reference.excerpt ? " · " + reference.excerpt : ""}</ActionButton>) : null}
      {(kind === "@" ? people.loading : references.loading) ? <p role="status">Consultando sugestões autorizadas…</p> : null}
      {(kind === "@" ? people.error : references.error) ? <p role="alert">Não foi possível consultar sugestões. Seu texto foi preservado.</p> : null}
      <ActionButton variant="quiet" onClick={() => { setDismissed(token); ref.current?.focus(); }}>Fechar sugestões</ActionButton>
    </div> : null}
  </div>;
}
