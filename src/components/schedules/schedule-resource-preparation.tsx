"use client";
import {
  loadScheduleResourceLocal as load,
  scheduleResourceLocalKey,
  scheduleResourceLocalMatches,
  type ScheduleResourceStored as Stored,
} from "@/lib/schedules/resource-local";
import { parsePrivateDraft } from "@/lib/validation/private-draft-results";
import {
  useEffect,
  useRef,
  useState,
  useCallback,
  type RefObject,
  type FormEvent,
} from "react";
import { z } from "zod";
import {
  api,
  ApiError,
  can,
  Notice,
  type WorkspaceContext,
} from "@/components/workspace";
import { ActionButton } from "@/components/ui/controls";
import { RecordDrawer } from "@/components/forms/record-drawer";
import { CreationDraftPanel } from "@/components/forms/creation-draft-panel";
import { useCreationDraft } from "@/components/forms/use-creation-draft";
import { useScopedRead } from "@/lib/use-scoped-read";
import { useLiveRevision } from "@/lib/use-live-revision";
import { holdDialogFocus } from "@/lib/forms/dialog-focus";
import {
  scheduleResourceReferenceSchema,
  checkScheduleResourceReference,
  scheduleResourceLabels,
  initialScheduleResource,
  scheduleResourceCommand,
  type ScheduleResourcePurpose,
  type ScheduleResourceFields,
  type ScheduleResourceReference,
} from "@/lib/schedules/resource-preparations";
import {
  scheduleResourceCommitSchema,
  parseScheduleResourceConfirmation,
  parseScheduleResourceRecovery,
  scheduleResourceReceiptMatches,
  type ScheduleResourcePacket,
  type ScheduleResourceReceipt,
  type ScheduleResourceRecovery,
} from "@/lib/validation/schedule-resource-preparations";
import { ScheduleResourceFields as ResourceFields } from "./schedule-resource-fields";
import { ScheduleResourceSummary } from "./schedule-resource-summary";
import { ScheduleResourceReferenceFacts } from "./schedule-resource-reference";
import { ScheduleSummaryContext } from "./schedule-preparation-summary";
import { ScheduleReviewDetails } from "./schedule-review";
import type { CreationDraft } from "@/types/creation-drafts";
import type { ScheduleWorkspace } from "@/types/schedules";

const empty: ScheduleWorkspace = {
  types: [],
  professionals: [],
  series: [],
  shifts: [],
  changes: [],
  events: [],
};
const sourceSchema = z.object({
  data: z
    .object({
      reference: scheduleResourceReferenceSchema,
      professionals: z.array(z.object({ id: z.uuid(), name: z.string() })),
    })
    .strict(),
});

const equal = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);

export function ScheduleResourcePreparation({
  context,
  purpose,
  targetResourceId: target,
  today,
  onClose,
  onCommitted,
  opener,
  fallbackFocus,
}: {
  context: WorkspaceContext;
  purpose: ScheduleResourcePurpose;
  targetResourceId: string;
  today: string;
  onClose: () => void;
  onCommitted: (receipt: ScheduleResourceReceipt) => void;
  opener?: HTMLElement | null;
  fallbackFocus?: RefObject<HTMLElement | null>;
}) {
  const patient = context.patient!,
    userId = context.userId,
    key = scheduleResourceLocalKey(userId, patient.id, purpose, target);
  const [initial] = useState(() =>
    load(sessionStorage, key, userId, patient.id, purpose, target),
  );
  const [local, setLocal] = useState(initial.value),
    localRef = useRef(initial.value);
  const [integrityError, setIntegrityError] = useState(initial.error),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const [fields, setFields] = useState<ScheduleResourceFields>(
    () =>
      initial.value?.fields ??
      initialScheduleResource(
        purpose,
        target,
        null,
        today,
        can(context, "schedule.manage.team") ||
          can(context, "schedule.manage.own"),
      ),
  );
  const [reference, setReference] = useState<ScheduleResourceReference | null>(
      null,
    ),
    [working, setWorking] = useState(Boolean(initial.value));
  const [packet, setPacket] = useState<ScheduleResourcePacket | null>(null),
    [proof, setProof] = useState<ScheduleResourceRecovery | null>(null),
    [reviewRejected, setReviewRejected] = useState(false),
    [publishing, setPublishing] = useState(false);
  const [obsoleteOutcome, setObsoleteOutcome] = useState(false);
  const [discardChoice, setDiscardChoice] = useState<{
    id: string;
    fields: ScheduleResourceFields;
  } | null>(null);
  const busyRef = useRef(false),
    mountedRef = useRef(false),
    reviewHeadingRef = useRef<HTMLHeadingElement>(null),
    reviewTriggerRef = useRef<HTMLButtonElement>(null),
    previousReviewRef = useRef(false);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  const team = can(context, "schedule.manage.team"),
    publishOwn = can(context, "schedule.manage.own"),
    mayPropose = can(context, "schedule.propose"),
    mayRead =
      can(context, "schedule.read.team") || can(context, "schedule.read.own");
  const writable =
    patient.is_active !== false &&
    patient.active !== false &&
    (purpose === "shift_type_edit"
      ? can(context, "schedule.types.manage")
      : purpose.startsWith("schedule_change_")
        ? team
        : team ||
          publishOwn ||
          (purpose === "schedule_shift_edit" && mayPropose));
  const revision = useLiveRevision(),
    scopeRevision = JSON.stringify([
      patient.capabilities,
      patient.is_active,
      patient.active,
      context.activeContext?.mode,
    ]);
  const decodeSource = useCallback(
    (v: unknown) => {
      const data = sourceSchema.parse(v).data;
      checkScheduleResourceReference(data.reference, {
        patientId: patient.id,
        purpose,
        targetResourceId: target,
      });
      return data;
    },
    [patient.id, purpose, target],
  );
  const source = useScopedRead(
    mayRead
      ? `/api/schedules/resource-preparations/reference?${new URLSearchParams({ careRecipientId: patient.id, purpose, targetResourceId: target })}`
      : null,
    scopeRevision + ":" + revision,
    decodeSource,
  );
  const current =
    mayRead && !source.loading && !source.error ? source.data : null;
  const data: ScheduleWorkspace = {
    ...(reference?.workspace ?? empty),
    professionals: current?.professionals ?? [],
  };
  const pending = local?.mode === "pending" ? local : null,
    carry = local?.mode === "carry" ? local : null;
  const snapshot = {
    scheduleAction: fields,
    referenceHash: reference?.hash ?? null,
    referenceVersion: reference?.version ?? null,
  };
  const [seedBaseline, setSeedBaseline] = useState<typeof snapshot | null>(
    null,
  );
  function writeLocal(next: Stored | null, expected = localRef.current) {
    const existing = load(
      sessionStorage,
      key,
      userId,
      patient.id,
      purpose,
      target,
    );
    if (existing.error) throw Error(existing.error);
    if (
      existing.value &&
      !scheduleResourceLocalMatches(existing.value, expected)
    )
      throw Error(
        "Outra referência apareceu neste aparelho. Ela foi preservada; confira a tentativa correspondente antes de continuar.",
      );
    if (next) sessionStorage.setItem(key, JSON.stringify(next));
    else sessionStorage.removeItem(key);
    localRef.current = next;
    setLocal(next);
    setIntegrityError("");
  }
  function baseStored(mode: "carry"): Extract<Stored, { mode: "carry" }> {
    return {
      mode,
      userId,
      patientId: patient.id,
      purpose,
      targetResourceId: target,
      fields,
    };
  }
  function confirmed(
    receipt: ScheduleResourceReceipt,
    original: Extract<Stored, { mode: "pending" }>,
  ) {
    if (
      !scheduleResourceReceiptMatches(receipt, original.packet, userId) ||
      !equal(receipt.fields, original.fields)
    )
      throw Error(
        "O resultado não corresponde ao preenchimento preservado. A referência foi mantida.",
      );
    writeLocal(null, original);
    const obsolete =
      purpose === "schedule_change_approve" &&
      receipt.nativeResult.status === "obsolete";
    setObsoleteOutcome(obsolete);
    setReviewRejected(obsolete);
    if (obsolete) {
      setPacket(original.packet);
      if (!reference && current) setReference(current.reference);
    } else setPacket(null);
    setProof(null);
    setMessage(
      receipt.nativeResult.status === "obsolete"
        ? "A proposta foi encerrada como obsoleta. Nenhuma aprovação foi realizada."
        : "Resultado da agenda conferido. Esta preparação foi utilizada uma única vez.",
    );
    draft.reload();
    onCommitted(receipt);
    if (!obsolete) onClose();
  }
  function reconcile(row: CreationDraft | null) {
    const original = localRef.current;
    if (
      !mountedRef.current ||
      original?.mode !== "pending" ||
      row?.state !== "consumed" ||
      row.id !== original.packet.draftCommit.id ||
      row.revision !== original.packet.draftCommit.revision + 1 ||
      !row.consumedResult ||
      !("sourceTimezone" in row.consumedResult) ||
      !scheduleResourceReceiptMatches(
        row.consumedResult,
        original.packet,
        userId,
      )
    )
      return;
    try {
      confirmed(row.consumedResult, original);
    } catch (e) {
      setIntegrityError(
        e instanceof Error ? e.message : "A referência foi preservada.",
      );
    }
  }
  const draft = useCreationDraft({
    userId,
    patientId: patient.id,
    kind: "SCHEDULE",
    purpose,
    targetDocumentId: null,
    targetResourceId: target,
    navigation: { version: 1, stage: "schedule_resource" },
    readScopeRevision: scopeRevision,
    onRead: reconcile,
    onResume(row) {
      if (
        !mountedRef.current ||
        !writable ||
        !mayRead ||
        localRef.current?.mode === "pending" ||
        integrityError ||
        !row.content ||
        !("scheduleAction" in row.content)
      )
        return false;
      setFields(row.content.scheduleAction);
      setReference(row.content.reference ?? null);
      setWorking(true);
      setPacket(null);
      setProof(null);
      setReviewRejected(false);
      setError("");
      return true;
    },
    onDiscard(action) {
      setObsoleteOutcome(false);
      if (
        !mountedRef.current ||
        localRef.current?.mode === "pending" ||
        integrityError
      )
        return;
      setPacket(null);
      setProof(null);
      setReference(null);
      if (action === "acknowledge" && localRef.current?.mode === "carry") {
        setFields(localRef.current.fields);
        setWorking(true);
      } else {
        try {
          writeLocal(null);
        } catch (e) {
          setIntegrityError(
            e instanceof Error ? e.message : "Sua edição foi preservada.",
          );
          return;
        }
        setSeedBaseline(null);
        setFields(
          initialScheduleResource(
            purpose,
            target,
            current?.reference.workspace ?? null,
            today,
            team || publishOwn,
          ),
        );
        setWorking(false);
        if (action === "acknowledge") onClose();
      }
    },
  });
  const protectedView =
    draft.loading ||
    Boolean(draft.loadError) ||
    draft.readDenied ||
    draft.protectedReadPending;
  // Seed only a confirmed empty private slot; a later read cannot replace human fields.
  useEffect(() => {
    let cancelled = false;
    if (
      !seedBaseline &&
      !working &&
      !protectedView &&
      !draft.offered &&
      !draft.consumed &&
      !draft.base &&
      !localRef.current &&
      current &&
      writable
    )
      void Promise.resolve().then(() => {
        if (cancelled) return;
        const initialFields = initialScheduleResource(
          purpose,
          target,
          current.reference.workspace,
          today,
          team || publishOwn,
        );
        setSeedBaseline({
          scheduleAction: initialFields,
          referenceHash: current.reference.hash,
          referenceVersion: current.reference.version,
        });
        setFields(initialFields);
        setReference(current.reference);
      });
    return () => {
      cancelled = true;
    };
  }, [
    seedBaseline,
    working,
    protectedView,
    draft.offered,
    draft.consumed,
    draft.base,
    current,
    writable,
    purpose,
    target,
    today,
    team,
    publishOwn,
  ]);
  const stale = Boolean(
    reference && current && reference.hash !== current.reference.hash,
  );
  const editorReady = working || seedBaseline !== null;
  const hiddenEditor =
    protectedView ||
    Boolean(draft.offered) ||
    draft.conflict ||
    Boolean(draft.consumed) ||
    Boolean(draft.pending) ||
    Boolean(pending) ||
    Boolean(packet) ||
    Boolean(integrityError);
  const showReview =
    !protectedView &&
    !pending &&
    Boolean(current) &&
    Boolean(packet) &&
    (obsoleteOutcome ||
      (!draft.offered && !draft.consumed && !draft.conflict && !draft.pending));
  useEffect(() => {
    if (publishing || draft.busy) return;
    const returning = previousReviewRef.current && !showReview;
    previousReviewRef.current = showReview;
    if (!showReview && !returning) return;
    const frame = requestAnimationFrame(() => {
      if (showReview) reviewHeadingRef.current?.focus();
      else reviewTriggerRef.current?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [showReview, publishing, draft.busy]);
  const consumed = draft.consumed?.consumedResult;
  const ownDifference = Boolean(
    working &&
      consumed &&
      "sourceTimezone" in consumed &&
      !equal(fields, consumed.fields),
  );
  const carryIsCurrent = Boolean(carry && equal(carry.fields, fields)),
    discardIsCurrent =
      Boolean(discardChoice) &&
      discardChoice?.id === draft.consumed?.id &&
      equal(discardChoice?.fields, fields);
  const chooseLocal =
    ownDifference &&
    !pending &&
    !draft.pending &&
    !carryIsCurrent &&
    !discardIsCurrent;
  const typeSource = reference?.workspace.types[0],
    seriesSource = reference?.workspace.series[0],
    shiftSource = reference?.workspace.shifts[0],
    changeSource = reference?.workspace.changes[0];
  const mayConfirm =
    writable &&
    Boolean(reference) &&
    !stale &&
    Boolean(current) &&
    (fields.form === "type"
      ? Boolean(typeSource)
      : fields.form === "series"
        ? Boolean(
            seriesSource &&
              (team ||
                (publishOwn && seriesSource.professional_id === userId)) &&
              (fields.operation === "end_series"
                ? seriesSource.status === "published" && !seriesSource.ended_on
                : seriesSource.status === "proposed" &&
                  !seriesSource.ended_on &&
                  (fields.operation !== "approve" ||
                    !seriesSource.publication_blocked)),
          )
        : fields.form === "shift"
          ? Boolean(
              shiftSource?.status === "published" &&
                (fields.operation === "cancel" ||
                  current?.professionals.some(
                    (person) => person.id === fields.professionalId,
                  )) &&
                (fields.operation !== "change" ||
                  team ||
                  fields.professionalId === userId) &&
                (fields.operation === "propose_change"
                  ? mayPropose &&
                    (shiftSource.professional_id === userId ||
                      can(context, "schedule.read.team"))
                  : team ||
                    (publishOwn && shiftSource.professional_id === userId)),
            )
          : Boolean(
              changeSource?.status === "pending" &&
                team &&
                (fields.operation === "approve"
                  ? !changeSource.is_stale &&
                    changeSource.source_snapshot &&
                    changeSource.proposed_snapshot &&
                    !changeSource.bal_impact.requires_family_decision
                  : fields.operation === "close"
                    ? changeSource.is_stale
                    : true),
            ));
  const canReview =
    writable && Boolean(reference) && Boolean(current) && !stale;
  async function savePersonal(close = false) {
    if (
      !editorReady ||
      !writable ||
      busyRef.current ||
      pending ||
      draft.blocked ||
      integrityError
    )
      return;
    const saved = await draft.save(snapshot);
    if (!mountedRef.current || !saved) return;
    try {
      if (localRef.current?.mode === "carry" && !saved.replayed)
        writeLocal(null);
      setMessage(
        "Preenchimento privado salvo. Nenhuma operação da agenda foi realizada.",
      );
      if (close) onClose();
    } catch (e) {
      setIntegrityError(
        e instanceof Error ? e.message : "Sua edição foi preservada.",
      );
    }
  }
  async function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      !canReview ||
      !reference ||
      busyRef.current ||
      draft.blocked ||
      pending ||
      integrityError
    )
      return;
    try {
      if (
        fields.form === "shift" &&
        fields.operation !== "cancel" &&
        (!current?.professionals.some((p) => p.id === fields.professionalId) ||
          (fields.operation === "change" &&
            !team &&
            fields.professionalId !== userId))
      )
        throw Error(
          "Confira a disponibilidade e a permissão do profissional de destino.",
        );
      const command = scheduleResourceCommand(fields, target, reference),
        saved = await draft.save(snapshot);
      if (!mountedRef.current || !saved) return;
      const verified = parsePrivateDraft(
        (
          await api<{ data: unknown }>(
            `/api/schedules/resource-preparations?${new URLSearchParams({ careRecipientId: patient.id, purpose, targetResourceId: target })}`,
          )
        ).data,
        {
          userId,
          patientId: patient.id,
          kind: "SCHEDULE",
          purpose,
          targetDocumentId: null,
          targetResourceId: target,
        },
      );
      if (!mountedRef.current) return;
      if (
        verified?.id !== saved.id ||
        verified.revision !== saved.revision ||
        verified.state !== "active"
      ) {
        await draft.reportConflict();
        return;
      }
      if (
        !verified.content ||
        !("scheduleAction" in verified.content) ||
        !verified.content.reference ||
        verified.content.reference.hash !== reference.hash
      ) {
        setReference(null);
        source.refresh();
        setMessage(
          "Seus campos foram salvos. Confira e adote a referência atual antes de revisar novamente.",
        );
        return;
      }
      if (localRef.current?.mode === "carry" && !saved.replayed)
        writeLocal(null);
      if (reviewTriggerRef.current) holdDialogFocus(reviewTriggerRef.current);
      setPacket(
        scheduleResourceCommitSchema.parse({
          careRecipientId: patient.id,
          purpose,
          targetResourceId: target,
          draftCommit: { id: saved.id, revision: saved.revision },
          expectedVersion: reference.version,
          sourceVersion: reference.sourceVersion,
          referenceHash: reference.hash,
          command,
          idempotencyKey: crypto.randomUUID(),
        }),
      );
      setProof(null);
      setReviewRejected(false);
      setError("");
    } catch (e) {
      setError(
        e instanceof z.ZodError
          ? "Confira os campos e as datas antes de revisar. Seu preenchimento foi preservado."
          : e instanceof Error
            ? e.message
            : "Confira o preenchimento antes de revisar.",
      );
    }
  }
  async function send() {
    if (
      busyRef.current ||
      protectedView ||
      integrityError ||
      (!pending && (reviewRejected || !mayConfirm))
    )
      return;
    const original: Extract<Stored, { mode: "pending" }> | null =
      pending ??
      (packet
        ? {
            ...baseStored("carry"),
            mode: "pending" as const,
            packet,
            sourceTimezone:
              fields.form === "shift"
                ? (reference?.workspace.shifts[0]?.timezone ?? null)
                : null,
          }
        : null);
    if (!original || original.resolutionKey) return;
    busyRef.current = true;
    setPublishing(true);
    setError("");
    try {
      writeLocal(original);
      const result = await api<{ data: unknown }>(
        "/api/schedules/resource-preparations/commit",
        original.packet,
      );
      if (!mountedRef.current) return;
      confirmed(
        parseScheduleResourceConfirmation(result.data, original.packet, userId)
          .receipt,
        original,
      );
    } catch (e) {
      if (!mountedRef.current) return;
      if (
        !pending &&
        e instanceof ApiError &&
        [400, 401, 403, 404, 409, 422].includes(e.status)
      ) {
        try {
          writeLocal(null, original);
          setReviewRejected(true);
          if (e.code === "DRAFT_VERSION_CONFLICT") await draft.reportConflict();
          if ([401, 403, 404].includes(e.status)) await draft.revalidateRead();
          source.refresh();
        } catch (cause) {
          setIntegrityError(
            cause instanceof Error
              ? cause.message
              : "A referência foi preservada.",
          );
        }
      }
      setError(
        e instanceof Error
          ? e.message
          : "A confirmação não foi recebida. Consulte a mesma tentativa.",
      );
    } finally {
      busyRef.current = false;
      if (mountedRef.current) setPublishing(false);
    }
  }
  async function check(resolve = false) {
    if (!pending || busyRef.current || protectedView || integrityError) return;
    let original = pending;
    busyRef.current = true;
    setPublishing(true);
    setError("");
    try {
      if (resolve && !original.resolutionKey) {
        const next = { ...original, resolutionKey: crypto.randomUUID() };
        writeLocal(next, original);
        original = next;
      }
      const raw = await api<{ data: unknown }>(
        "/api/schedules/resource-preparations/recovery",
        {
          packet: original.packet,
          ...(original.resolutionKey
            ? { resolutionKey: original.resolutionKey }
            : {}),
        },
      );
      if (!mountedRef.current) return;
      const result = parseScheduleResourceRecovery(
        raw.data,
        original.packet,
        userId,
      );
      if (result.status === "applied")
        confirmed(result.confirmation.receipt, original);
      else setProof(result);
    } catch (e) {
      if (mountedRef.current)
        setError(
          e instanceof Error
            ? e.message
            : "A consulta não confirmou o resultado.",
        );
    } finally {
      busyRef.current = false;
      if (mountedRef.current) setPublishing(false);
    }
  }
  async function preserveUnapplied() {
    if (!pending || proof?.status !== "not_applied" || busyRef.current) return;
    try {
      const next: Stored = { ...baseStored("carry"), fields: pending.fields };
      writeLocal(next, pending);
      setFields(next.fields);
      setWorking(true);
      setReference(null);
      setPacket(null);
      setProof(null);
      setMessage(
        "Esta preparação não foi utilizada. Sua edição foi preservada por sua escolha; nenhum novo envio foi realizado.",
      );
      source.refresh();
      await draft.revalidateRead();
    } catch (e) {
      setIntegrityError(
        e instanceof Error ? e.message : "A referência foi preservada.",
      );
    }
  }
  function chooseEdition(keep: boolean) {
    if (!draft.consumed || pending || draft.pending || draft.busy || publishing)
      return;
    try {
      if (keep) writeLocal(baseStored("carry"));
      else {
        writeLocal(null);
        setDiscardChoice({ id: draft.consumed.id, fields });
      }
    } catch (e) {
      setIntegrityError(
        e instanceof Error ? e.message : "Sua edição foi preservada.",
      );
    }
  }
  const dirty =
    !pending &&
    !packet &&
    !draft.offered &&
    !draft.consumed &&
    !draft.pending &&
    (Boolean(carry) ||
      (working &&
        !equal(
          snapshot,
          draft.base?.content && "scheduleAction" in draft.base.content
            ? {
                scheduleAction: draft.base.content.scheduleAction,
                referenceHash: draft.base.content.referenceHash,
                referenceVersion: draft.base.content.referenceVersion,
              }
            : seedBaseline,
        )));
  const title =
    purpose === "shift_type_edit"
      ? "Tipo de plantão"
      : purpose === "schedule_series_end"
        ? "Encerrar programação"
        : purpose === "schedule_shift_edit"
          ? "Alteração pontual"
          : scheduleResourceLabels[purpose];
  const confirmLabel =
    fields.form === "decision"
      ? fields.operation === "close"
        ? "Encerrar proposta obsoleta"
        : fields.operation === "approve"
          ? "Aprovar proposta"
          : "Confirmar rejeição"
      : fields.form === "series" && fields.operation !== "end_series"
        ? fields.operation === "approve"
          ? "Aprovar proposta"
          : "Confirmar rejeição"
        : "Confirmar gravação";
  const summary = { ...snapshot, reference: current ? reference : null };
  return (
    <ScheduleSummaryContext value={current ? data : null}>
      <RecordDrawer
        keyboardScrollable
        title={
          pending
            ? "Recuperar confirmação da escala"
            : packet
              ? "Revisar escala"
              : title
        }
        restoreFocusTo={opener}
        restoreFocusFallbackRef={fallbackFocus}
        busy={publishing || draft.busy}
        preventClose={Boolean(pending) || Boolean(draft.pending)}
        hasUnsavedChanges={
          dirty ||
          (ownDifference && !discardIsCurrent && !pending && !draft.pending)
        }
        onClose={() => {
          try {
            if (localRef.current?.mode === "carry") writeLocal(null);
            onClose();
          } catch (e) {
            setIntegrityError(
              e instanceof Error ? e.message : "Sua edição foi preservada.",
            );
          }
        }}
      >
        <div className="hca-form-stack">
          <CreationDraftPanel
            draft={draft}
            current={summary}
            hasUnsavedChanges={dirty}
            patientName={patient.display_name}
            canResume={writable && mayRead}
            disabled={
              publishing ||
              Boolean(pending) ||
              Boolean(packet) ||
              Boolean(integrityError) ||
              chooseLocal
            }
            discardLabel="Descartar este preenchimento"
            acknowledgeLabel={
              carry
                ? "Reconhecer resultado e manter minha edição"
                : "Reconhecer resultado e começar outro preenchimento"
            }
          />
          <ActionButton
            disabled={publishing || draft.busy || draft.loading}
            onClick={() => void draft.revalidateRead()}
          >
            Atualizar preenchimento privado
          </ActionButton>
          {message ? <Notice>{message}</Notice> : null}
          {error ? <Notice error>{error}</Notice> : null}
          {integrityError ? <Notice error>{integrityError}</Notice> : null}
          {!protectedView && chooseLocal ? (
            <section
              className="ui-card hca-form-stack"
              aria-label="Edição local ainda não publicada"
            >
              <h3>Sua edição ainda não foi publicada</h3>
              <ScheduleResourceSummary content={summary} />
              <p>
                Outra conclusão está registrada acima. Escolha o que fazer com
                sua edição antes de reconhecer esse resultado.
              </p>
              <div className="hca-toolbar">
                <ActionButton onClick={() => chooseEdition(true)}>
                  Manter minha edição ao reconhecer o resultado
                </ActionButton>
                <ActionButton onClick={() => chooseEdition(false)}>
                  Descartar minha edição local e usar o resultado
                </ActionButton>
              </div>
            </section>
          ) : null}
          {!protectedView && carry ? (
            <section
              className="ui-card hca-form-stack"
              aria-label="Minha edição preservada"
            >
              <h3>Minha edição preservada neste aparelho</h3>
              <ScheduleResourceSummary
                content={{
                  scheduleAction: carry.fields,
                  referenceHash: null,
                  referenceVersion: null,
                }}
              />
              {!equal(carry.fields, fields) ? (
                <Notice>
                  Há alterações posteriores à cópia preservada. Escolha
                  novamente qual edição manter antes de reconhecer o resultado.
                </Notice>
              ) : null}
            </section>
          ) : null}
          {!protectedView && pending ? (
            <section
              className="ui-card hca-form-stack"
              aria-label="Confirmação de alteração da agenda"
            >
              <h3>Tentativa de agenda preservada</h3>
              <ScheduleResourceSummary
                content={{
                  scheduleAction: pending.fields,
                  referenceHash: pending.packet.referenceHash,
                  referenceVersion: pending.packet.expectedVersion,
                }}
                sourceTimezone={pending.sourceTimezone}
              />
              <p>
                Consulte o resultado antes de preparar outra operação neste
                preenchimento. A consulta não envia novamente a alteração.
              </p>
              <ActionButton
                disabled={publishing || draft.busy}
                onClick={() => void check()}
              >
                {pending.resolutionKey
                  ? "Recuperar encerramento da tentativa"
                  : "Consultar confirmação da escala"}
              </ActionButton>
              {proof?.status === "unknown" ? (
                <>
                  <Notice>
                    A confirmação ainda não foi localizada. Isso não comprova
                    que a operação deixou de acontecer.
                  </Notice>
                  <div className="hca-toolbar">
                    <ActionButton
                      disabled={
                        !writable ||
                        publishing ||
                        Boolean(pending.resolutionKey)
                      }
                      onClick={() => void send()}
                    >
                      Reenviar explicitamente a mesma tentativa
                    </ActionButton>
                    <ActionButton
                      disabled={publishing}
                      onClick={() => void check(true)}
                    >
                      Encerrar esta tentativa e preservar meus campos
                    </ActionButton>
                  </div>
                  <p>
                    Encerrar consulta a tentativa original e impede um envio
                    atrasado daquela revisão. Se o resultado já estiver
                    confirmado, ele será recuperado.
                  </p>
                </>
              ) : null}
              {proof?.status === "not_applied" ? (
                <>
                  <Notice>
                    {proof.reason === "key_conflict"
                      ? "Esta chave já foi utilizada. A preparação não foi consumida por esta tentativa; confira o histórico antes de decidir outra operação."
                      : "A revisão preservada não pode mais ser aplicada. Nenhuma nova operação foi enviada nesta consulta."}
                  </Notice>
                  <ActionButton
                    disabled={publishing || draft.busy}
                    onClick={() => void preserveUnapplied()}
                  >
                    Retomar meus campos após a conferência
                  </ActionButton>
                </>
              ) : null}
            </section>
          ) : null}
          {!protectedView && !pending && packet && !current ? (
            <Notice error>
              A referência operacional não está disponível nesta consulta. Sua
              revisão e seus campos foram preservados.
              <ActionButton
                disabled={source.loading || publishing}
                onClick={() => source.refresh()}
              >
                Atualizar referência da agenda
              </ActionButton>
              <ActionButton
                disabled={publishing}
                onClick={(e) => {
                  holdDialogFocus(e.currentTarget);
                  setPacket(null);
                }}
              >
                Voltar aos meus campos
              </ActionButton>
            </Notice>
          ) : null}
          {!protectedView && draft.consumed && current && !obsoleteOutcome ? (
            <section aria-label="Referência operacional do resultado">
              <h3>Referência operacional do resultado</h3>
              <ScheduleResourceReferenceFacts reference={current.reference} />
            </section>
          ) : null}
          {!hiddenEditor ? (
            <div className="hca-form-stack">
              <p>
                Guardar este preenchimento não altera a agenda, publica proposta
                ou comprova presença.
              </p>
              {!writable ? (
                <Notice error>
                  Seu vínculo atual não permite confirmar esta operação. Seus
                  campos próprios continuam disponíveis para consulta e
                  descarte.
                </Notice>
              ) : null}
              {source.loading ? (
                <p role="status">Consultando a referência atual…</p>
              ) : null}
              {source.error ? <Notice error>{source.error}</Notice> : null}
              <ActionButton
                disabled={publishing || draft.busy || source.loading}
                onClick={() => source.refresh()}
              >
                Atualizar referência da agenda
              </ActionButton>
              {reference && current ? (
                <section aria-label="Referência preservada">
                  <h3>Referência preservada, versão {reference.version}</h3>
                  <ScheduleResourceReferenceFacts reference={reference} />
                </section>
              ) : (
                <Notice>
                  Confira e adote a referência atual antes de revisar. Seus
                  campos serão preservados.
                </Notice>
              )}
              {current && (!reference || stale) ? (
                <section
                  className="hca-form-stack"
                  aria-label="Referência atual para comparação"
                >
                  <h3>Referência atual, versão {current.reference.version}</h3>
                  <ScheduleResourceReferenceFacts
                    reference={current.reference}
                  />
                  <ActionButton
                    disabled={!writable || publishing || draft.busy}
                    onClick={() => {
                      setReference(current.reference);
                      setPacket(null);
                      setWorking(true);
                      setReviewRejected(false);
                      setMessage(
                        "Referência atual adotada por sua escolha. Seus campos foram preservados; revise novamente antes de confirmar.",
                      );
                    }}
                  >
                    Adotar referência atual e manter meus campos
                  </ActionButton>
                </section>
              ) : null}
              {!mayConfirm && reference && current && !stale ? (
                <Notice error>
                  O estado do recurso ou sua permissão atual impede esta
                  confirmação. Confira a referência e mantenha seus campos para
                  decidir como prosseguir.
                </Notice>
              ) : null}
              <form
                className="hca-form-stack hca-schedule-form min-w-0"
                onSubmit={review}
              >
                <fieldset
                  disabled={
                    !editorReady || !writable || draft.blocked || publishing
                  }
                >
                  <ResourceFields
                    value={fields}
                    onChange={(value) => {
                      setFields(value);
                      setWorking(true);
                    }}
                    data={data}
                    ownId={userId}
                    team={team}
                    publishOwn={publishOwn}
                    mayPropose={mayPropose}
                  />
                  <div className="hca-toolbar">
                    <ActionButton
                      disabled={!canReview || draft.blocked || publishing}
                      variant="primary"
                      type="submit"
                      ref={reviewTriggerRef}
                      id="schedule-resource-review-button"
                    >
                      Revisar alteração
                    </ActionButton>
                    <ActionButton
                      disabled={
                        !editorReady || !writable || draft.blocked || publishing
                      }
                      onClick={() => void savePersonal()}
                    >
                      Guardar preenchimento privado
                    </ActionButton>
                    <ActionButton
                      disabled={
                        !editorReady || !writable || draft.blocked || publishing
                      }
                      onClick={() => void savePersonal(true)}
                    >
                      Guardar e fechar
                    </ActionButton>
                  </div>
                </fieldset>
              </form>
            </div>
          ) : null}
          {showReview && packet && reference && current ? (
            <section className="hca-schedule-review min-w-0 hca-form-stack">
              <h3 ref={reviewHeadingRef} tabIndex={-1}>
                Conferência da escala
              </h3>
              <ScheduleResourceSummary content={summary} />
              <ScheduleReviewDetails
                review={{
                  command: packet.command,
                  version: packet.expectedVersion,
                  workspace: data,
                }}
              />
              {reviewRejected && !obsoleteOutcome ? (
                <Notice error>
                  A confirmação foi recusada. Seu preenchimento foi preservado;
                  volte e confira a referência antes de revisar novamente.
                </Notice>
              ) : null}
              {stale && !obsoleteOutcome ? (
                <Notice error>
                  A referência mudou depois da revisão. Volte, compare e adote a
                  referência antes de confirmar.
                </Notice>
              ) : null}
              {obsoleteOutcome ? (
                <Notice error>
                  A proposta foi encerrada como obsoleta. Nenhuma aprovação foi
                  realizada. A revisão apresentada e o motivo próprio foram
                  preservados.
                </Notice>
              ) : null}

              <div className="hca-toolbar hca-schedule-decision-actions">
                <ActionButton
                  disabled={publishing}
                  onClick={(e) => {
                    holdDialogFocus(e.currentTarget);
                    if (obsoleteOutcome) {
                      onClose();
                      return;
                    }
                    setPacket(null);
                  }}
                >
                  {obsoleteOutcome ? "Fechar revisão e atualizar" : "Voltar"}
                </ActionButton>
                <ActionButton
                  variant="primary"
                  disabled={publishing || reviewRejected || !mayConfirm}
                  onClick={() => void send()}
                >
                  {confirmLabel}
                </ActionButton>
              </div>
            </section>
          ) : null}
        </div>
      </RecordDrawer>
    </ScheduleSummaryContext>
  );
}
