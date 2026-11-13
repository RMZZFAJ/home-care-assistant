"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type SetStateAction,
} from "react";
import { z } from "zod";
import {
  api,
  ApiError,
  can,
  Notice,
  type WorkspaceContext,
} from "@/components/workspace";
import { ProgressPreparationSummary } from "./progress-preparation-summary";
import { useCreationDraft } from "@/components/forms/use-creation-draft";
import { CreationDraftPanel } from "@/components/forms/creation-draft-panel";
import {
  progressPreparationContentSchema,
  progressDraftNoteSchema,
  progressPreparationCommitSchema,
  storedProgressPacketSchema,
  storedProgressPacketsMatch,
  parseProgressPreparationConfirmation,
  progressPreparationConfirmed,
  progressReceiptMatchesPacket,
  parseProgressRecovery,
  type ProgressRecovery,
  type StoredProgressPacket,
} from "@/lib/validation/progress-preparations";
import { useClientReady } from "@/lib/use-client-ready";
import { useScopedRead } from "@/lib/use-scoped-read";
import { useLiveRevision } from "@/lib/use-live-revision";
import { useCommandIntent } from "@/lib/client/use-command-intent";
import { useSearchParams } from "next/navigation";
import { ProgressReference } from "./progress-reference";
import { ProgressTextArea } from "./progress-text-area";
import { progressCareRoles, progressEventPresentation, progressRelevance } from "@/lib/documents/progress-catalog";
import { ProgressPublicationOptions } from "./progress-publication-options";
import { formatBrazilDate } from "@/lib/receipt";
import { Dialog, Icon } from "@/components/ui/primitives";
import {
  ActionButton,
  FormField,
  Pill,
  SelectField,
  TextInput,
} from "@/components/ui/controls";
import { DocumentActionSlot } from "./document-action-slot";
import {
  parseProgressPage,
  parseProgressOutcome,
  progressConfirmed,
  publishProgress,
  progressCategories,
  progressStages,
  stagesByDocument,
  type ProgressPacket,
  type ProgressPage,
  progressReferencePage,
  progressReferenceRow,
  mentionsEveryone,
} from "@/lib/validation/document-progress";
import type { CreationDraft } from "@/types/creation-drafts";
import type { DocumentType } from "@/types/documents";

type Reference = z.infer<typeof progressReferenceRow>;
const blank = {
  category: "record",
  stage: null,
  text: "",
  references: [],
} satisfies ProgressPacket["content"];
const storedDraft = z
  .object({
    content: progressDraftNoteSchema,
    pending: storedProgressPacketSchema.nullable(),
    carryFrom: z.uuid().optional(),
  })
  .strict();
type Draft = {
  content: ProgressPacket["content"];
  pending: StoredProgressPacket | null;
  carryFrom?: string;
};
function loadDraft(
  key: string,
  patientId: string,
  documentId: string,
): Draft & { error: string; } {
  try {
    const raw = sessionStorage.getItem(key);
    const saved: z.infer<typeof storedDraft> = raw
      ? storedDraft.parse(JSON.parse(raw))
      : { content: blank, pending: null };
    if (
      saved.pending &&
      "draftCommit" in saved.pending &&
      (saved.pending.careRecipientId !== patientId ||
        saved.pending.targetResourceId !== documentId)
    )
      throw new Error("Wrong local scope");
    return {
      content: saved.pending?.content ?? saved.content,
      pending: saved.pending,
      ...(saved.carryFrom ? { carryFrom: saved.carryFrom } : {}),
      error: "",
    };
  } catch {
    return {
      content: blank,
      pending: null,
      error:
        "Não foi possível recuperar o rascunho deste andamento. Nenhuma publicação foi enviada.",
    };
  }
}

type ProgressProps = {
  id: string;
  type: DocumentType;
  patientId: string;
  context: WorkspaceContext;
  actionTarget?: HTMLElement | null;
  onAction?: () => void;
};
export function DocumentProgress({
  id,
  type,
  patientId,
  context,
  actionTarget,
  onAction,
}: ProgressProps) {
  const ready = useClientReady();
  return ready ? (
    <ProgressContent
      key={context.userId + ":" + id}
      id={id}
      type={type}
      patientId={patientId}
      context={context}
      actionTarget={actionTarget}
      onAction={onAction}
    />
  ) : (
    <section className="ui-card" role="status">
      Preparando Andamentos…
    </section>
  );
}
function ProgressContent({
  id,
  type,
  patientId,
  context,
  actionTarget,
  onAction,
}: ProgressProps) {
  const [filter, setFilter] = useState<ProgressPage["filter"]>("all"),
    [page, setPage] = useState(1);
  const storageKey = `hca:progress:${context.userId}:${id}`;
  const [draft, setDraft] = useState(() =>
    loadDraft(storageKey, patientId, id),
  );
  const draftRef = useRef<Draft>({
    content: draft.content,
    pending: draft.pending,
    carryFrom: draft.carryFrom,
  });
  const { content, pending } = draft;
  const anchor = useSearchParams().get("progressRecord");
  const [anchorError, setAnchorError] = useState("");
  useEffect(() => {
    if (!anchor) return;
    const controller = new AbortController();
    void api<unknown>(`/api/documents/${id}/progress/location?record=${encodeURIComponent(anchor)}`, undefined, controller.signal).then(raw => {
      const result = z.object({ data: z.object({ documentId: z.uuid(), recordId: z.uuid(), page: z.number().int().positive() }) }).parse(raw).data;
      if (result.documentId !== id || result.recordId !== anchor) throw new Error("Referência indisponível.");
      if (!controller.signal.aborted) { setFilter("all"); setPage(result.page); setAnchorError(""); }
    }).catch(() => { if (!controller.signal.aborted) setAnchorError("Este andamento não está disponível no seu contexto autorizado."); });
    return () => controller.abort();
  }, [id, anchor]);
  const publishingRef = useRef(false),
    mountedRef = useRef(false);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  const [recoveryCheck, setRecoveryCheck] = useState<ProgressRecovery | null>(
    null,
  ),
    [checkingRecovery, setCheckingRecovery] = useState(false);
  const [localIntegrityError, setLocalIntegrityError] = useState(
    Boolean(draft.error),
  );
  const [open, setOpen] = useState(false);
  const [publication, setPublication] = useState<NonNullable<ProgressPacket["publication"]>>({ relevance: "normal", mentions: [] });
  const [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [storageError, setStorageError] = useState(draft.error);
  const [search, setSearch] = useState(""),
    [referenceQuery, setReferenceQuery] = useState<string | null>(null),
    [referenceNumber, setReferenceNumber] = useState(1);
  const revision = useLiveRevision();
  const decode = useCallback(
    (value: unknown) => {
      const result = parseProgressPage(
        z.object({ data: z.unknown() }).parse(value).data,
        id,
        filter,
        page,
      );
      if (result.documentType !== type)
        throw new Error("Os Andamentos não correspondem ao tipo desta ficha.");
      return result;
    },
    [id, filter, page, type],
  );
  const read = useScopedRead(
    `/api/documents/${id}/progress?filter=${filter}&page=${page}`,
    String(revision),
    decode,
  );
  const feed = !read.loading && !read.error ? read.data : null;
  useEffect(() => {
    if (!anchor || !feed?.data.some(row => row.id === anchor)) return;
    const frame = requestAnimationFrame(() => { const element = document.getElementById("andamento-" + anchor); element?.scrollIntoView({ block: "center" }); element?.focus({ preventScroll: true }); });
    return () => cancelAnimationFrame(frame);
  }, [anchor, feed]);
  const openerRef = useRef<HTMLButtonElement>(null);
  const command = useCommandIntent<StoredProgressPacket, unknown>(
    (value, packet) =>
      "draftCommit" in packet
        ? progressPreparationConfirmed(value, packet, context.userId)
        : progressConfirmed(value, packet, id, context.userId),
  );
  const writable = Boolean(
    feed?.canPublish &&
    context.patient?.id === patientId &&
    context.activeContext?.mode === "patient" &&
    can(context, "document.progress.create"),
  );
  const privateDraft = useCreationDraft({
    userId: context.userId,
    patientId,
    kind: "PROGRESS",
    purpose: "progress_note",
    targetResourceId: id,
    navigation: { version: 1, stage: "progress_note" },
    readScopeRevision: JSON.stringify([
      context.activeContext?.mode,
      can(context, type.toLowerCase() + ".read"),
      can(context, "document.progress.create"),
    ]),
    onRead: reconcilePublication,
    onResume(saved) {
      if (pending || localIntegrityError || !saved.content) return false;
      const parsed = progressPreparationContentSchema.safeParse(saved.content);
      if (!parsed.success || parsed.data.documentType !== type) return false;
      updateDraft({ content: parsed.data.note, pending: null });
      setOpen(true);
      return true;
    },
    onDiscard(action, resultId) {
      if (!pending && !localIntegrityError)
        updateDraft({
          content:
            action === "acknowledge" && draftRef.current.carryFrom === resultId
              ? draftRef.current.content
              : blank,
          pending: null,
        });
    },
  });
  const privateContent = { documentType: type, note: content };
  const locked =
    command.busy ||
    pending !== null ||
    privateDraft.blocked ||
    localIntegrityError;
  const clearEnvelope = useCallback(
    (packet: StoredProgressPacket) => {
      const raw = sessionStorage.getItem(storageKey);
      if (raw) {
        const actual = storedDraft.parse(JSON.parse(raw));
        if (
          actual.pending &&
          !storedProgressPacketsMatch(actual.pending, packet)
        )
          throw new Error(
            "Há outra tentativa de andamento neste aparelho. A referência foi preservada; confira-a antes de continuar.",
          );
      }
      sessionStorage.removeItem(storageKey);
    },
    [storageKey],
  );
  function preservePacket(packet: StoredProgressPacket) {
    const raw = sessionStorage.getItem(storageKey);
    if (raw) {
      const actual = storedDraft.parse(JSON.parse(raw));
      if (actual.pending && !storedProgressPacketsMatch(actual.pending, packet))
        throw new Error(
          "Há outra tentativa de andamento neste aparelho. A referência foi preservada; confira-a antes de continuar.",
        );
    }
    sessionStorage.setItem(
      storageKey,
      JSON.stringify({ content: packet.content, pending: packet }),
    );
  }
  function reconcilePublication(saved: CreationDraft | null) {
    if (!mountedRef.current) return;
    if (
      !saved ||
      saved.state !== "consumed" ||
      !saved.consumedResult ||
      !("documentType" in saved.consumedResult) ||
      saved.consumedResult.documentType !== type ||
      !pending ||
      !("draftCommit" in pending) ||
      saved.id !== pending.draftCommit.id ||
      saved.revision !== pending.draftCommit.revision + 1 ||
      !progressReceiptMatchesPacket(saved.consumedResult, pending)
    )
      return;
    try {
      clearEnvelope(pending);
      draftRef.current = { content: blank, pending: null };
      setDraft({ content: blank, pending: null, error: "" });
      setStorageError("");
      setMessage(
        "Publicação recuperada por consulta autorizada. O mesmo andamento permanece no histórico.",
      );
    } catch {
      setStorageError(
        "O resultado foi encontrado, mas a referência local mudou. Ela foi preservada; recupere a tentativa correspondente antes de reconhecer o resultado.",
      );
    }
  }
  function updateDraft(value: Draft, persist = true) {
    const next: Draft = {
      content: value.content,
      pending: value.pending,
      ...(value.carryFrom ? { carryFrom: value.carryFrom } : {}),
    };
    draftRef.current = next;
    setDraft({ ...next, error: "" });
    if (!persist) return;
    try {
      const actual = loadDraft(storageKey, patientId, id);
      if (actual.error) throw new Error(actual.error);
      if (actual.pending) {
        if (
          !next.pending ||
          !storedProgressPacketsMatch(actual.pending, next.pending)
        ) {
          draftRef.current = {
            content: actual.content,
            pending: actual.pending,
            ...(actual.carryFrom ? { carryFrom: actual.carryFrom } : {}),
          };
          setDraft(actual);
          setStorageError(
            "Outra tentativa preservada foi encontrada neste aparelho. Ela não foi substituída; confira a referência antes de continuar.",
          );
        }
        return;
      }
      if (next.pending || next.content.text || next.content.references.length)
        sessionStorage.setItem(storageKey, JSON.stringify(next));
      else sessionStorage.removeItem(storageKey);
    } catch {
      setStorageError(
        "Não foi possível guardar este rascunho no aparelho. Seu texto continua nesta aba.",
      );
    }
  }
  function setContent(change: SetStateAction<ProgressPacket["content"]>) {
    const previous = draftRef.current;
    updateDraft({
      ...previous,
      content: typeof change === "function" ? change(previous.content) : change,
    });
  }
  const decodeReferences = useCallback(
    (value: unknown) => {
      const parsed = progressReferencePage.safeParse(value);
      if (
        !parsed.success ||
        parsed.data.documentId !== id ||
        parsed.data.careRecipientId !== patientId ||
        parsed.data.search !== referenceQuery ||
        parsed.data.page !== referenceNumber
      )
        throw new Error(
          "A consulta de referências não pôde ser conferida para esta ficha. Atualize a busca.",
        );
      return parsed.data;
    },
    [id, patientId, referenceQuery, referenceNumber],
  );
  const references = useScopedRead(
    open && referenceQuery !== null
      ? `/api/documents/${id}/progress/references?search=${encodeURIComponent(referenceQuery)}&page=${referenceNumber}`
      : null,
    String(revision),
    decodeReferences,
  );
  const choices =
    !references.loading && !references.error ? references.data : null;
  async function checkUncertainPublication() {
    if (
      !mountedRef.current ||
      publishingRef.current ||
      !pending ||
      !("draftCommit" in pending)
    )
      return;
    const packet = pending;
    publishingRef.current = true;
    setCheckingRecovery(true);
    setError("");
    try {
      const value = await api<{ data: unknown; }>(
        "/api/documents/progress-preparations/recovery",
        packet,
      ),
        proof = parseProgressRecovery(value.data, packet, context.userId);
      if (!mountedRef.current) return;
      if (proof.status === "applied" || proof.status === "applied_native") {
        clearEnvelope(packet);
        updateDraft({ content: blank, pending: null }, false);
        setOpen(false);
        setRecoveryCheck(null);
        setStorageError("");
        setMessage(
          proof.status === "applied"
            ? "Publicação recuperada pela consulta da mesma intenção. Nenhum efeito foi repetido."
            : "Publicação encontrada no histórico nativo. A preparação pessoal continua separada; descarte ou revise esse preenchimento antes de registrar outro andamento.",
        );
        read.refresh();
        await privateDraft.revalidateRead();
      } else if (proof.status === "not_applied") {
        setRecoveryCheck(proof);
        await privateDraft.revalidateRead();
      } else {
        setRecoveryCheck(null);
        setError(
          "A consulta ainda não comprova o resultado. Preserve e recupere a mesma tentativa; ela não foi reenviada por esta consulta.",
        );
      }
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível conferir esta tentativa.",
      );
    } finally {
      publishingRef.current = false;
      setCheckingRecovery(false);
    }
  }
  async function keepUnappliedEdition() {
    if (
      !pending ||
      !("draftCommit" in pending) ||
      recoveryCheck?.status !== "not_applied" ||
      publishingRef.current
    )
      return;
    try {
      // The read proof establishes that this exact packet cannot be applied by the CAS/key guards.
      // Clearing still requires an explicit choice and the same local envelope.
      clearEnvelope(pending);
      updateDraft({
        content: pending.content,
        pending: null,
        ...(recoveryCheck.current.state === "consumed"
          ? { carryFrom: recoveryCheck.current.id }
          : {}),
      });
      setRecoveryCheck(null);
      setStorageError("");
      setMessage(
        "Tentativa não aplicada encerrada por sua escolha. Sua edição permanece para revisar e salvar; nenhuma nova publicação foi enviada.",
      );
      if (recoveryCheck.current.state !== "consumed")
        await privateDraft.reportConflict();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "A referência local foi preservada.",
      );
    }
  }
  async function savePersonal(close = false) {
    if (
      command.busy ||
      pending ||
      !writable ||
      privateDraft.blocked ||
      localIntegrityError
    )
      return;
    const saved = await privateDraft.save(privateContent);
    if (saved && close) setOpen(false);
  }
  async function publish() {
    if (
      publishingRef.current ||
      command.busy ||
      localIntegrityError ||
      (!pending && (!writable || privateDraft.blocked))
    )
      return;
    publishingRef.current = true;
    setRecoveryCheck(null);
    const recovering = pending !== null;
    let packet: StoredProgressPacket | undefined = pending ?? undefined;
    try {
      if (!packet) {
        const native = publishProgress.parse({
          key: crypto.randomUUID(),
          content,
          publication: { ...publication, visibility: mentionsEveryone(content.text) ? "public" : publication.visibility ?? "public", mentionAll: mentionsEveryone(content.text) },
        });
        const saved = await privateDraft.save(privateContent);
        if (!saved || !mountedRef.current) return;
        packet = progressPreparationCommitSchema.parse({
          ...native,
          careRecipientId: patientId,
          purpose: "progress_note",
          targetResourceId: id,
          draftCommit: { id: saved.id, revision: saved.revision },
        });
      }
      preservePacket(packet);
      updateDraft({ content: packet.content, pending: packet }, false);
      setError("");
      const value = await (command.uncertain
        ? command.recover()
        : command.send(
          "draftCommit" in packet
            ? "/api/documents/progress-preparations/commit"
            : `/api/documents/${id}/progress`,
          packet,
        ));
      if (!mountedRef.current) return;
      const result =
        "draftCommit" in packet
          ? parseProgressPreparationConfirmation(
            z.object({ data: z.unknown() }).parse(value).data,
            packet,
            context.userId,
          ).receipt.nativeResult
          : parseProgressOutcome(value);
      clearEnvelope(packet);
      updateDraft({ content: blank, pending: null }, false);
      setPublication({ relevance: "normal", mentions: [] });
      setOpen(false);
      setStorageError("");
      setMessage(
        `${result.recovered ? "Publicação recuperada" : "Andamento publicado"}. Autoria e horário registrados; nenhum conteúdo original, PDF ou saldo foi alterado.`,
      );
      read.refresh();
      await privateDraft.revalidateRead();
    } catch (reason) {
      if (!mountedRef.current) return;
      const unknown =
        recovering ||
        !(reason instanceof ApiError) ||
        reason.status === 0 ||
        reason.status >= 500;
      if (!unknown && packet) {
        try {
          clearEnvelope(packet);
          updateDraft({ content: packet.content, pending: null });
        } catch {
          setLocalIntegrityError(true);
        }
        if (reason instanceof ApiError && reason.status === 409)
          await privateDraft.reportConflict();
      }
      setError(
        reason instanceof z.ZodError
          ? (reason.issues[0]?.message ?? "Revise o andamento.")
          : reason instanceof SyntaxError
            ? "A referência local de publicação não pôde ser lida. Nenhuma nova tentativa foi enviada."
            : reason instanceof Error
              ? reason.message
              : "Não foi possível confirmar a publicação. Recupere a mesma tentativa.",
      );
    } finally {
      publishingRef.current = false;
    }
  }
  function addReference(row: Reference, replacement?: string) {
    const current = draftRef.current.content;
    if (
      locked ||
      !current.references.includes(row.id) && current.references.length >= 8
    )
      return;
    const text =
      replacement ?? current.text.replace(/(?:^|\s)#[^\s]*$/, "") + (current.text ? " " : "") + "#" + (row.code ?? row.id) + (row.kind === "progress" ? " (andamento)" : "");
    if (text.length > 2000) {
      setError(
        "A referência ultrapassaria 2000 caracteres. Seu texto foi preservado; ajuste-o antes de inserir o vínculo.",
      );
      return;
    }
    setError("");
    setContent({
      ...current,
      references: current.references.includes(row.id) ? current.references : [...current.references, row.id],
      text,
    });
  }
  return (
    <section
      className="ui-card hca-progress-feed"
      aria-label="Andamentos da ficha"
      aria-busy={read.loading}
    >
      <div className="hca-section-heading">
        <div>
          <h2>Andamentos</h2>
          <p>
            Fatos documentais e registros complementares, do primeiro ao mais
            recente. Etapa relacionada não muda a ordem.
          </p>
        </div>
        <DocumentActionSlot target={actionTarget}>
          <ActionButton
            ref={openerRef}
            disabled={
              !pending &&
              !writable &&
              !privateDraft.offered &&
              !privateDraft.base &&
              !privateDraft.consumed &&
              !privateDraft.pending
            }
            onClick={() => {
              onAction?.();
              setOpen(true);
            }}
          >
            <Icon name="plus" />
            {pending
              ? "Recuperar publicação"
              : privateDraft.pending
                ? "Recuperar preenchimento de andamento"
                : "Registrar andamento"}
          </ActionButton>
        </DocumentActionSlot>
      </div>
      {!open &&
        (privateDraft.offered ||
          privateDraft.base ||
          privateDraft.consumed ||
          privateDraft.pending ||
          privateDraft.loadError ||
          privateDraft.readDenied) ? (
        <CreationDraftPanel
          draft={privateDraft}
          current={privateContent}
          patientName={context.patient?.display_name ?? "Paciente"}
          disabled={Boolean(pending) || localIntegrityError}
          acknowledgeLabel={
            draft.carryFrom === privateDraft.consumed?.id
              ? "Reconhecer resultado e continuar minha edição"
              : "Reconhecer resultado e iniciar outro andamento"
          }
        />
      ) : null}
      {message ? <Notice>{message}</Notice> : null}
      {storageError ? <Notice error>{storageError}</Notice> : null}
      {pending && !open ? (
        <Notice>
          Há uma publicação sem confirmação. A referência e o conteúdo estão
          guardados neste aparelho; recupere a mesma tentativa antes de iniciar
          outra.
        </Notice>
      ) : null}
      <div className="hca-toolbar">
        <FormField label="Mostrar Andamentos">
          <SelectField
            value={filter}
            onChange={(event) => {
              setFilter(event.currentTarget.value as ProgressPage["filter"]);
              setPage(1);
            }}
          >
            <option value="all">Todos</option>
            <option value="automatic">Fatos automáticos</option>
            <option value="manual">Registros manuais</option>
          </SelectField>
        </FormField>
        <ActionButton
          aria-disabled={read.loading}
          onClick={() => {
            if (!read.loading) read.refresh();
          }}
        >
          Atualizar Andamentos
        </ActionButton>
      </div>
      {read.loading ? (
        <Notice>Consultando Andamentos autorizados…</Notice>
      ) : read.error ? (
        <Notice error>
          Não foi possível consultar os Andamentos. {read.error} O texto em
          edição foi preservado.
        </Notice>
      ) : null}
      {anchorError ? <Notice error>{anchorError}</Notice> : null}
      {feed ? (
        <>
          <p className="hca-field-help">
            {feed.total} registro(s). Publicar um andamento não registra
            ciência, recebimento ou conclusão.
          </p>
          {feed.data.length ? (
            <ol className="hca-event-feed">
              {feed.data.map((row) => {
                const presentation = progressEventPresentation(row);
                return (
                  <li key={row.id} id={"andamento-" + row.id} tabIndex={-1} className="hca-progress-event" data-tone={presentation.tone} data-selected={row.id === anchor || undefined}>
                    <span className="hca-event-marker" aria-hidden="true">
                      <Icon name={presentation.originIcon} />
                    </span>
                    <article
                      className={
                        row.source === "manual"
                          ? "hca-manual-note"
                          : "hca-event-body"
                      }
                      aria-label={
                        row.source === "manual"
                          ? progressCategories[row.category]
                          : (presentation.event ?? undefined)
                      }
                    >
                      <div className="hca-event-heading">
                        <strong>
                          {row.source === "manual"
                            ? progressCategories[row.category]
                            : presentation.event}
                        </strong>
                        <time dateTime={row.recordedAt}>
                          {formatBrazilDate(row.recordedAt)}
                        </time>
                      </div>
                      <Pill tone={row.source === "manual" ? "accent" : "neutral"}>
                        {presentation.origin}
                      </Pill>
                      <Pill tone={presentation.tone}><Icon name={presentation.icon} /> {presentation.label}</Pill>
                      {row.source === "manual" && row.visibility === "family" ? <Pill>Privado · família e pessoas mencionadas</Pill> : null}
                      <p className="hca-event-meta">
                        {row.authorId
                          ? (row.authorName ?? "Nome histórico não preservado")
                          : "Sistema, sem autoria pessoal"}
                        {row.source === "manual" && row.stage
                          ? ` · Etapa relacionada: ${progressStages[row.stage]}`
                          : ""}
                        {row.source === "automatic"
                          ? ` · Versão ${row.version}`
                          : ""}
                      </p>
                      {row.source === "manual" ? (
                        <>
                          <p className="hca-event-text">{row.text}</p>
                          {row.mentions?.length ? <p className="hca-event-meta">Pessoas mencionadas: {row.mentions.map(person => person.name + " · " + progressCareRoles[person.careRole]).join("; ")}. Uma menção não registra ciência ou autoria.</p> : null}
                          <div className="hca-toolbar">
                            {row.references.map((ref) => (
                              <ProgressReference key={ref.id} reference={ref} />
                            ))}
                          </div>
                        </>
                      ) : null}
                    </article>
                  </li>
                );
})}
            </ol>
          ) : (
            <p>Nenhum andamento corresponde a este filtro e página.</p>
          )}
          <nav className="hca-toolbar" aria-label="Páginas dos Andamentos">
            <ActionButton
              disabled={page === 1}
              onClick={() => setPage((value) => value - 1)}
            >
              Anteriores
            </ActionButton>
            <span>
              Página {page} de {Math.max(1, Math.ceil(feed.total / 20))}
            </span>
            <ActionButton
              disabled={page * 20 >= feed.total}
              onClick={() => setPage((value) => value + 1)}
            >
              Próximos
            </ActionButton>
            <ActionButton
              disabled={page === Math.max(1, Math.ceil(feed.total / 20))}
              onClick={() => setPage(Math.max(1, Math.ceil(feed.total / 20)))}
            >
              Ir ao fim da cronologia
            </ActionButton>
          </nav>
        </>
      ) : null}
      <Dialog
        open={open}
        title={
          pending ? "Recuperar publicação de andamento" : "Registrar andamento"
        }
        closeDisabled={command.busy || privateDraft.busy}
        finalFocus={openerRef}
        onClose={() => {
          if (!command.busy && !privateDraft.busy) setOpen(false);
        }}
      >
        <p className="hca-field-help">
          Registro complementar com autoria e momento próprios. Não altera a
          ficha original, estoque, ciência, recebimento ou arquivos já emitidos.
        </p>
        {error ? <Notice error>{error}</Notice> : null}
        {pending ? (
          <Notice>
            A tentativa está congelada. Fechar guarda a referência; recuperar
            verifica ou publica o mesmo conteúdo, sem criar outro andamento.
          </Notice>
        ) : null}
        <CreationDraftPanel
          draft={privateDraft}
          current={privateContent}
          patientName={context.patient?.display_name ?? "Paciente"}
          disabled={Boolean(pending) || command.busy || localIntegrityError}
          acknowledgeLabel={
            draft.carryFrom === privateDraft.consumed?.id
              ? "Reconhecer resultado e continuar minha edição"
              : "Reconhecer resultado e iniciar outro andamento"
          }
          onRevalidateRead={() => void privateDraft.revalidateRead()}
        />
        {!pending &&
          privateDraft.consumed?.consumedResult &&
          "documentType" in privateDraft.consumed.consumedResult &&
          !privateDraft.readDenied &&
          !privateDraft.protectedReadPending &&
          (content.text || content.references.length) &&
          JSON.stringify(content) !==
          JSON.stringify(
            privateDraft.consumed.consumedResult.command.content,
          ) ? (
          <section
            className="ui-card hca-form-stack"
            aria-label="Edição local ainda não publicada"
          >
            <h3>Sua edição ainda não publicada</h3>
            <ProgressPreparationSummary content={privateContent} />
            <Notice>
              {draft.carryFrom === privateDraft.consumed.id
                ? "Esta edição será mantida após reconhecer o resultado registrado."
                : "Esta edição difere do resultado registrado. Escolha mantê-la antes de reconhecer o resultado e iniciar outro preenchimento."}
            </Notice>
            {draft.carryFrom !== privateDraft.consumed.id ? (
              <ActionButton
                onClick={() =>
                  updateDraft({
                    content,
                    pending: null,
                    carryFrom: privateDraft.consumed!.id,
                  })
                }
              >
                Manter minha edição ao reconhecer o resultado
              </ActionButton>
            ) : null}
          </section>
        ) : null}
        {pending &&
          "draftCommit" in pending &&
          !privateDraft.readDenied &&
          !privateDraft.protectedReadPending ? (
          <div className="hca-form-stack">
            <ActionButton
              disabled={command.busy || checkingRecovery}
              onClick={() => void checkUncertainPublication()}
            >
              Conferir tentativa sem reenviar
            </ActionButton>
            {recoveryCheck?.status === "not_applied" ? (
              <>
                <Notice>
                  Esta tentativa não foi aplicada:{" "}
                  {recoveryCheck.reason === "advanced_revision"
                    ? "a preparação já avançou em outra sessão."
                    : "a chave foi vinculada a outros dados."}{" "}
                  Sua edição continua preservada.
                </Notice>
                <ActionButton
                  disabled={command.busy || checkingRecovery}
                  onClick={() => void keepUnappliedEdition()}
                >
                  Manter minha edição para novo preenchimento
                </ActionButton>
              </>
            ) : null}
          </div>
        ) : null}
        {pending &&
          !privateDraft.readDenied &&
          !privateDraft.protectedReadPending ? (
          <div className="hca-form-stack">
            <ProgressPreparationSummary
              content={{ documentType: type, note: pending.content }}
            />
            {pending.publication ? <p>Destaque: {progressRelevance[pending.publication.relevance].label}. Pessoas mencionadas: {pending.publication.mentions.length}.</p> : null}
            <div className="hca-toolbar">
              <ActionButton
                disabled={command.busy}
                onClick={() => setOpen(false)}
              >
                Fechar guardando referência
              </ActionButton>
              <ActionButton
                variant="primary"
                disabled={command.busy || checkingRecovery}
                onClick={() => void publish()}
              >
                {command.busy
                  ? "Confirmando publicação…"
                  : "Recuperar a mesma publicação"}
              </ActionButton>
            </div>
          </div>
        ) : null}
        {!(
          privateDraft.readDenied ||
          privateDraft.protectedReadPending ||
          pending ||
          privateDraft.offered ||
          privateDraft.conflict ||
          privateDraft.consumed
        ) ? (
          <form
            className="hca-form"
            onSubmit={(event) => {
              event.preventDefault();
              void publish();
            }}
          >
            <fieldset
              disabled={locked}
              className="hca-compact-grid hca-progress-fields"
            >
              <FormField label="Categoria">
                <SelectField
                  value={content.category}
                  onChange={(event) => {
                    const category = event.currentTarget
                      .value as ProgressPacket["content"]["category"];
                    setContent((value) => ({ ...value, category }));
                  }}
                >
                  {Object.entries(progressCategories).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </SelectField>
              </FormField>
              <FormField label="Etapa relacionada (opcional)">
                <SelectField
                  value={content.stage ?? ""}
                  onChange={(event) => {
                    const stage = (event.currentTarget.value ||
                      null) as ProgressPacket["content"]["stage"];
                    setContent((value) => ({ ...value, stage }));
                  }}
                >
                  <option value="">Sem vínculo de etapa</option>
                  {stagesByDocument[type].map((value) => (
                    <option key={value} value={value}>
                      {progressStages[value]}
                    </option>
                  ))}
                </SelectField>
              </FormField>
              <FormField
                label="Texto do andamento"
                required
                helpText={`${content.text.length}/2000 caracteres. O texto é exibido como escrito, sem executar HTML.`}
              >
                <ProgressTextArea
                  documentId={id}
                  value={content.text}
                  onText={text => setContent(value => ({ ...value, text }))}
                  onMention={person => { if (!publication.mentions.includes(person.id) && publication.mentions.length >= 8) { setError("Até oito pessoas podem ser mencionadas. Remova uma menção antes de escolher outra."); return false; } setPublication(value => value.mentions.includes(person.id) ? value : ({ ...value, mentions: [...value.mentions, person.id] })); return true; }}
                  onReference={addReference}
                />
              </FormField>
            </fieldset>
            <fieldset disabled={locked} className="hca-reference-picker">
              <legend>Referências autorizadas (opcional)</legend>
              <div className="hca-toolbar">
                <TextInput
                  aria-label="Código da ficha a vincular"
                  maxLength={100}
                  value={search}
                  onChange={(event) => setSearch(event.currentTarget.value)}
                  placeholder="Ex.: ENT-0001"
                />
                <ActionButton
                  onClick={() => {
                    setReferenceQuery(search.trim());
                    setReferenceNumber(1);
                  }}
                >
                  Buscar fichas e andamentos
                </ActionButton>
              </div>
              {references.loading ? (
                <p role="status">Consultando fichas autorizadas…</p>
              ) : references.error ? (
                <Notice error>{references.error}</Notice>
              ) : null}
              {choices ? (
                <>
                  <ul className="hca-reference-options">
                    {choices.data.map((row) => (
                      <li key={row.id}>
                        <ActionButton
                          disabled={
                            content.references.length >= 8 ||
                            content.references.includes(row.id)
                          }
                          onClick={() => addReference(row)}
                        >
                          Inserir {row.kind === "progress" ? "andamento" : "ficha"} {row.code ?? row.type}{row.excerpt ? " · " + row.excerpt : ""}
                        </ActionButton>
                      </li>
                    ))}
                  </ul>
                  {!choices.data.length ? (
                    <p>Nenhuma ficha autorizada nesta página.</p>
                  ) : null}
                  <div className="hca-toolbar">
                    <ActionButton
                      disabled={referenceNumber === 1}
                      onClick={() => setReferenceNumber((value) => value - 1)}
                    >
                      Referências anteriores
                    </ActionButton>
                    <span>
                      {referenceNumber} /{" "}
                      {Math.max(1, Math.ceil(choices.total / 20))}
                    </span>
                    <ActionButton
                      disabled={referenceNumber * 20 >= choices.total}
                      onClick={() => setReferenceNumber((value) => value + 1)}
                    >
                      Próximas referências
                    </ActionButton>
                  </div>
                </>
              ) : null}
              {content.references.length ? (
                <ul>
                  {content.references.map((ref, index) => (
                    <li key={ref}>
                      <span>Referência {index + 1}</span>{" "}
                      <ActionButton
                        compact
                        onClick={() =>
                          setContent((value) => ({
                            ...value,
                            references: value.references.filter(
                              (id) => id !== ref,
                            ),
                          }))
                        }
                      >
                        Remover referência {index + 1}
                      </ActionButton>
                    </li>
                  ))}
                </ul>
              ) : null}
              <p className="hca-field-help">
                Até oito fichas deste paciente. O link só aparece enquanto a
                pessoa consultando tiver acesso; texto digitado não concede
                permissão.
              </p>
            </fieldset>
            <ProgressPublicationOptions id={id} patientId={patientId} value={publication} onChange={setPublication} disabled={locked} canPrivate={["family", "admin"].includes(context.patient?.role ?? "")} collective={mentionsEveryone(content.text)} />
            <div className="hca-toolbar">
              <ActionButton
                disabled={
                  command.busy ||
                  Boolean(pending) ||
                  !writable ||
                  privateDraft.blocked ||
                  localIntegrityError
                }
                onClick={() => void savePersonal()}
              >
                Salvar preenchimento privado
              </ActionButton>
              <ActionButton
                disabled={
                  command.busy ||
                  (!pending && (!writable || privateDraft.blocked))
                }
                onClick={() =>
                  pending ? setOpen(false) : void savePersonal(true)
                }
              >
                {pending
                  ? "Fechar guardando referência"
                  : "Guardar rascunho e fechar"}
              </ActionButton>
              <ActionButton
                type="submit"
                variant="primary"
                disabled={
                  command.busy ||
                  localIntegrityError ||
                  (!pending && (!writable || privateDraft.blocked))
                }
              >
                {command.busy
                  ? "Confirmando publicação…"
                  : pending
                    ? "Recuperar a mesma publicação"
                    : "Publicar andamento"}
              </ActionButton>
            </div>
          </form>
        ) : null}
      </Dialog>
    </section>
  );
}
