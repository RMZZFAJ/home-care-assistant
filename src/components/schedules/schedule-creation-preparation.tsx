"use client";
import { useEffect, useRef, useState, type RefObject } from "react";
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
import { useCreationDraft } from "@/components/forms/use-creation-draft";
import { CreationDraftPanel } from "@/components/forms/creation-draft-panel";
import { useScopedRead } from "@/lib/use-scoped-read";
import { useLiveRevision } from "@/lib/use-live-revision";
import { holdDialogFocus } from "@/lib/forms/dialog-focus";
import { calendarPeriod } from "@/lib/schedules/calendar";
import {
  initialScheduleSeries,
  initialScheduleType,
  scheduleCreationFields,
  scheduleCreationCommand,
  schedulePurpose,
  type ScheduleCreationFields,
  type ScheduleCreationPurpose,
} from "@/lib/schedules/creation";
import {
  parseSchedulePreparationConfirmation,
  parseScheduleRecovery,
  schedulePreparationCommitSchema,
  scheduleReceiptMatches,
  type SchedulePreparationPacket,
  type SchedulePreparationReceipt,
  type ScheduleRecovery,
} from "@/lib/validation/schedule-preparations";
import { ScheduleForm } from "./schedule-forms";
import { ScheduleReviewDetails } from "./schedule-review";
import {
  SchedulePreparationSummary,
  ScheduleSummaryContext,
} from "./schedule-preparation-summary";
import type { ScheduleWorkspace } from "@/types/schedules";
import type { CreationDraft } from "@/types/creation-drafts";

const empty: ScheduleWorkspace = {
  types: [],
  professionals: [],
  shifts: [],
  series: [],
  changes: [],
  events: [],
};
const sourceSchema = z.object({
  data: z.object({
    types: z.array(
      z.object({
        id: z.uuid(),
        name: z.string(),
        starts_local: z.string(),
        duration_minutes: z.number().int().min(15).max(1440),
        version: z.number().int().positive(),
        is_active: z.boolean(),
      }),
    ),
    professionals: z.array(z.object({ id: z.uuid(), name: z.string() })),
  }),
});
const decodeSource = (value: unknown): ScheduleWorkspace => ({
  ...empty,
  ...sourceSchema.parse(value).data,
});
const stored = z.discriminatedUnion("mode", [
  z
    .object({
      mode: z.literal("pending"),
      userId: z.uuid(),
      packet: schedulePreparationCommitSchema,
      fields: scheduleCreationFields,
    })
    .strict(),
  z
    .object({
      mode: z.literal("carry"),
      userId: z.uuid(),
      patientId: z.uuid(),
      purpose: z.enum(["shift_type_create", "schedule_series_create"]),
      fields: scheduleCreationFields,
    })
    .strict(),
]);
type Stored = z.infer<typeof stored>;
const equal = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);
function load(
  key: string,
  userId: string,
  patientId: string,
  purpose: ScheduleCreationPurpose,
): { value: Stored | null; error: string } {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return { value: null, error: "" };
    const v = stored.parse(JSON.parse(raw));
    if (
      v.userId !== userId ||
      schedulePurpose(v.fields) !== purpose ||
      (v.mode === "pending"
        ? v.packet.careRecipientId !== patientId ||
          v.packet.purpose !== purpose ||
          !equal(v.packet.command, scheduleCreationCommand(v.fields))
        : v.patientId !== patientId || v.purpose !== purpose)
    )
      throw new Error("Wrong scope");
    return { value: v, error: "" };
  } catch {
    return {
      value: null,
      error:
        "Não foi possível conferir a referência guardada neste aparelho. Ela foi preservada; nenhum envio foi realizado.",
    };
  }
}

export function ScheduleCreationPreparation({
  context,
  purpose,
  today,
  onClose,
  onCommitted,
  opener,
  fallbackFocus,
}: {
  context: WorkspaceContext;
  purpose: ScheduleCreationPurpose;
  today: string;
  onClose: () => void;
  onCommitted: (receipt: SchedulePreparationReceipt) => void;
  opener?: HTMLElement | null;
  fallbackFocus?: RefObject<HTMLElement | null>;
}) {
  const patient = context.patient!,
    userId = context.userId,
    key = `hca:schedule-creation:${userId}:${patient.id}:${purpose}`;
  const [initial] = useState(() => load(key, userId, patient.id, purpose));
  const [local, setLocal] = useState<Stored | null>(initial.value),
    localRef = useRef<Stored | null>(initial.value);
  const [integrityError, setIntegrityError] = useState(initial.error),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const [packet, setPacket] = useState<SchedulePreparationPacket | null>(null),
    [reviewRejected, setReviewRejected] = useState(false),
    [publishing, setPublishing] = useState(false),
    [proof, setProof] = useState<ScheduleRecovery | null>(null);
  const mountedRef = useRef(false),
    busyRef = useRef(false);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  const mayRead =
      can(context, "schedule.read.team") || can(context, "schedule.read.own"),
    team = can(context, "schedule.manage.team"),
    publishOwn = can(context, "schedule.manage.own");
  const writable =
    patient.is_active !== false &&
    patient.active !== false &&
    (purpose === "shift_type_create"
      ? can(context, "schedule.types.manage")
      : team || publishOwn || can(context, "schedule.propose"));
  const period = calendarPeriod(today, "week"),
    revision = useLiveRevision();
  const source = useScopedRead(
    mayRead
      ? `/api/schedules?${new URLSearchParams({ careRecipientId: patient.id, from: period.from, until: period.until })}`
      : null,
    JSON.stringify([
      revision,
      patient.capabilities,
      patient.is_active,
      patient.active,
    ]),
    decodeSource,
  );
  const data = mayRead && !source.loading && !source.error ? source.data : null;
  const [fields, setFields] = useState<ScheduleCreationFields>(
    () =>
      initial.value?.fields ??
      (purpose === "shift_type_create"
        ? initialScheduleType()
        : initialScheduleSeries(empty, userId, team, today)),
  );
  const [working, setWorking] = useState(Boolean(initial.value));
  const [datesMonth, setDatesMonth] = useState<string | null>(null);
  const [discardChoice, setDiscardChoice] = useState<{
    draftId: string;
    fields: ScheduleCreationFields;
  } | null>(null);
  const pending = local?.mode === "pending" ? local : null,
    carry = local?.mode === "carry" ? local : null;
  function writeLocal(next: Stored | null, expected = localRef.current) {
    const current = load(key, userId, patient.id, purpose);
    if (current.error) throw new Error(current.error);
    if (current.value && !equal(current.value, expected))
      throw new Error(
        "Outra referência apareceu neste aparelho. Ela foi preservada; confira a tentativa correspondente antes de continuar.",
      );
    if (next) sessionStorage.setItem(key, JSON.stringify(next));
    else sessionStorage.removeItem(key);
    localRef.current = next;
    setLocal(next);
    setIntegrityError("");
  }
  function reconcile(row: CreationDraft | null) {
    if (
      !mountedRef.current ||
      row?.state !== "consumed" ||
      !row.consumedResult ||
      !("fields" in row.consumedResult)
    )
      return;
    const original = localRef.current;
    if (
      original?.mode !== "pending" ||
      row.id !== original.packet.draftCommit.id ||
      row.revision !== original.packet.draftCommit.revision + 1 ||
      !scheduleReceiptMatches(row.consumedResult, original.packet, userId)
    )
      return;
    try {
      if (!equal(row.consumedResult.fields, original.fields))
        throw new Error(
          "O resultado não corresponde ao preenchimento preservado.",
        );
      writeLocal(null, original);
      setPacket(null);
      setProof(null);
      setMessage(
        "Resultado recuperado por consulta autorizada. Nenhum novo envio foi realizado.",
      );
    } catch (e) {
      setIntegrityError(
        e instanceof Error ? e.message : "A referência local foi preservada.",
      );
    }
  }
  const draft = useCreationDraft({
    userId,
    patientId: patient.id,
    kind: "SCHEDULE",
    purpose,
    targetDocumentId: null,
    targetResourceId: null,
    navigation: { version: 1, stage: "schedule_creation" },
    readScopeRevision: JSON.stringify([
      patient.capabilities,
      patient.is_active,
      patient.active,
      context.activeContext?.mode,
    ]),
    onRead: reconcile,
    onResume(row) {
      if (
        !mountedRef.current ||
        !writable ||
        localRef.current?.mode === "pending" ||
        integrityError ||
        !row.content ||
        !("schedule" in row.content)
      )
        return false;
      try {
        setFields(row.content.schedule);
        setDatesMonth(null);
        setWorking(true);
        setPacket(null);
        setError("");
        return true;
      } catch (e) {
        setIntegrityError(
          e instanceof Error ? e.message : "A edição foi preservada.",
        );
        return false;
      }
    },
    onDiscard(action) {
      if (!mountedRef.current) return;
      if (localRef.current?.mode === "pending" || integrityError) return;
      setPacket(null);
      setProof(null);
      if (action === "acknowledge" && localRef.current?.mode === "carry") {
        setFields(localRef.current.fields);
        setWorking(true);
      } else {
        try {
          writeLocal(null);
        } catch (e) {
          setIntegrityError(
            e instanceof Error ? e.message : "A edição foi preservada.",
          );
          return;
        }
        setDatesMonth(null);
        setFields(
          purpose === "shift_type_create"
            ? initialScheduleType()
            : initialScheduleSeries(data ?? empty, userId, team, today),
        );
        setWorking(false);
      }
    },
  });
  const protectedView =
    draft.loading ||
    Boolean(draft.loadError) ||
    draft.readDenied ||
    draft.protectedReadPending;
  const hiddenEditor =
    protectedView ||
    Boolean(draft.offered) ||
    draft.conflict ||
    Boolean(draft.consumed) ||
    Boolean(draft.pending) ||
    Boolean(pending) ||
    Boolean(packet) ||
    Boolean(integrityError);
  const snapshot = { schedule: fields };
  const reviewHeadingRef = useRef<HTMLHeadingElement>(null),
    reviewTriggerRef = useRef<HTMLButtonElement>(null),
    previousReviewRef = useRef(false);
  const showReview =
    !protectedView &&
    !pending &&
    Boolean(packet) &&
    !draft.consumed &&
    !draft.conflict &&
    !draft.offered &&
    !draft.pending;
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
  const consumedReceipt = draft.consumed?.consumedResult;
  const localDifference = Boolean(
    working &&
      consumedReceipt &&
      "fields" in consumedReceipt &&
      !equal(fields, consumedReceipt.fields),
  );
  const carryIsCurrent = Boolean(carry && equal(carry.fields, fields));
  const discardIsCurrent =
    discardChoice?.draftId === draft.consumed?.id &&
    equal(discardChoice?.fields, fields);
  const chooseLocal =
    localDifference &&
    !pending &&
    !carryIsCurrent &&
    !discardIsCurrent &&
    !draft.pending;
  async function savePersonal(close = false) {
    if (!writable || publishing || pending || draft.blocked || integrityError)
      return;
    const savedFields = fields,
      result = await draft.save({ schedule: savedFields });
    if (!mountedRef.current || !result) return;
    try {
      if (localRef.current?.mode === "carry" && !result.replayed)
        writeLocal(null);
    } catch (e) {
      setIntegrityError(
        e instanceof Error ? e.message : "A referência foi preservada.",
      );
    }
    if (close) onClose();
  }
  async function review() {
    if (!writable || publishing || pending || draft.blocked || integrityError)
      return;
    try {
      const command = scheduleCreationCommand(fields);
      if (
        fields.form === "series" &&
        (!data ||
          !data.types.some(
            (t) =>
              t.id === fields.shiftTypeId &&
              t.is_active &&
              t.version === fields.shiftTypeVersion,
          ))
      )
        throw new Error(
          "Atualize e compare a referência do tipo de plantão antes de revisar.",
        );
      const saved = await draft.save(snapshot);
      if (!mountedRef.current || !saved) return;
      if (localRef.current?.mode === "carry" && !saved.replayed)
        writeLocal(null);
      setReviewRejected(false);
      setPacket(
        schedulePreparationCommitSchema.parse({
          careRecipientId: patient.id,
          purpose,
          draftCommit: { id: saved.id, revision: saved.revision },
          command,
          idempotencyKey: crypto.randomUUID(),
        }),
      );
      setProof(null);
      setError("");
    } catch (e) {
      if (mountedRef.current)
        setError(
          e instanceof Error
            ? e.message
            : "Confira o preenchimento antes de revisar.",
        );
    }
  }
  function confirm(
    receipt: SchedulePreparationReceipt,
    original: Extract<Stored, { mode: "pending" }>,
  ) {
    if (!equal(receipt.fields, original.fields))
      throw new Error(
        "O resultado não corresponde aos campos preservados. A referência foi mantida.",
      );
    writeLocal(null, original);
    setPacket(null);
    setProof(null);
    setMessage(
      "Resultado da escala conferido. A preparação foi utilizada uma única vez.",
    );
    draft.reload();
    onCommitted(receipt);
  }
  async function send() {
    if (
      busyRef.current ||
      protectedView ||
      integrityError ||
      (!pending && reviewRejected)
    )
      return;
    const original =
      pending ??
      (packet ? { mode: "pending" as const, userId, packet, fields } : null);
    if (!original) return;
    const recovering = Boolean(pending);
    busyRef.current = true;
    setPublishing(true);
    setError("");
    try {
      writeLocal(original);
      const raw = await api<{ data: unknown }>(
        "/api/schedules/preparations/commit",
        original.packet,
      );
      if (!mountedRef.current) return;
      confirm(
        parseSchedulePreparationConfirmation(raw.data, original.packet, userId)
          .receipt,
        original,
      );
      onClose();
    } catch (e) {
      if (!mountedRef.current) return;
      const rejected =
        !recovering &&
        e instanceof ApiError &&
        [400, 401, 403, 404, 409, 422].includes(e.status);
      if (rejected) {
        try {
          writeLocal(null, original);
          if (
            e.code === "DRAFT_VERSION_CONFLICT" ||
            [401, 403, 404].includes(e.status)
          )
            setPacket(null);
          else setReviewRejected(true);
        } catch (c) {
          setIntegrityError(
            c instanceof Error ? c.message : "A referência foi preservada.",
          );
        }
        if (e instanceof ApiError && e.code === "DRAFT_VERSION_CONFLICT")
          await draft.reportConflict();
        else if (e instanceof ApiError && [401, 403, 404].includes(e.status)) {
          await draft.revalidateRead();
          if (mountedRef.current) await context.refresh();
        } else source.refresh();
      }
      setError(
        e instanceof Error
          ? e.message
          : "A resposta ainda não foi confirmada. Consulte a mesma tentativa antes de editar.",
      );
    } finally {
      busyRef.current = false;
      if (mountedRef.current) setPublishing(false);
    }
  }
  async function check() {
    if (!pending || busyRef.current || protectedView || integrityError) return;
    const original = pending;
    busyRef.current = true;
    setPublishing(true);
    setError("");
    try {
      const raw = await api<{ data: unknown }>(
        "/api/schedules/preparations/recovery",
        original.packet,
      );
      if (!mountedRef.current) return;
      const result = parseScheduleRecovery(raw.data, original.packet, userId);
      if (result.status === "applied")
        confirm(result.confirmation.receipt, original);
      else setProof(result);
    } catch (e) {
      if (mountedRef.current)
        setError(
          e instanceof Error
            ? e.message
            : "A consulta não confirmou a tentativa.",
        );
    } finally {
      busyRef.current = false;
      if (mountedRef.current) setPublishing(false);
    }
  }
  async function preserveUnapplied() {
    if (!pending || proof?.status !== "not_applied" || busyRef.current) return;
    try {
      const next: Stored = {
        mode: "carry",
        userId,
        patientId: patient.id,
        purpose,
        fields: pending.fields,
      };
      writeLocal(next, pending);
      setFields(next.fields);
      setWorking(true);
      setPacket(null);
      setProof(null);
      setMessage(
        "A tentativa não foi aplicada. Sua edição foi preservada por sua escolha; nenhuma nova programação foi enviada.",
      );
      source.refresh();
      await draft.revalidateRead();
    } catch (e) {
      setIntegrityError(
        e instanceof Error ? e.message : "A referência foi preservada.",
      );
    }
  }
  const dirty =
    !packet &&
    !pending &&
    !draft.offered &&
    !draft.consumed &&
    !draft.pending &&
    (Boolean(carry) ||
      !equal(
        fields,
        draft.base?.content && "schedule" in draft.base.content
          ? draft.base.content.schedule
          : purpose === "shift_type_create"
            ? initialScheduleType()
            : initialScheduleSeries(empty, userId, team, today),
      ));
  const close = () => {
    if (!pending && localRef.current?.mode === "carry")
      try {
        writeLocal(null);
      } catch (e) {
        setIntegrityError(
          e instanceof Error ? e.message : "A edição foi preservada.",
        );
        return;
      }
    onClose();
  };
  function chooseEdition(keep: boolean) {
    if (!draft.consumed || pending || draft.pending || draft.busy || publishing)
      return;
    try {
      if (keep)
        writeLocal({
          mode: "carry",
          userId,
          patientId: patient.id,
          purpose,
          fields,
        });
      else {
        writeLocal(null);
        setDiscardChoice({ draftId: draft.consumed.id, fields });
      }
    } catch (e) {
      setIntegrityError(
        e instanceof Error ? e.message : "A edição foi preservada.",
      );
    }
  }
  return (
    <ScheduleSummaryContext value={data}>
      <RecordDrawer
        keyboardScrollable
        title={
          pending
            ? "Recuperar confirmação da escala"
            : packet
              ? "Revisar escala"
              : purpose === "shift_type_create"
                ? "Tipo de plantão"
                : "Programação de plantões"
        }
        onClose={close}
        restoreFocusTo={opener}
        restoreFocusFallbackRef={fallbackFocus}
        busy={publishing || draft.busy}
        preventClose={Boolean(pending) || Boolean(draft.pending)}
        hasUnsavedChanges={
          dirty ||
          Boolean(
            localDifference && !discardIsCurrent && !pending && !draft.pending,
          )
        }
      >
        <div className="hca-form-stack">
          <CreationDraftPanel
            draft={draft}
            current={snapshot}
            patientName={patient.display_name}
            canResume={writable}
            discardLabel="Descartar este preenchimento"
            disabled={
              publishing ||
              Boolean(pending) ||
              Boolean(integrityError) ||
              chooseLocal
            }
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
              <SchedulePreparationSummary content={snapshot} />
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
              aria-label="Minha edição preservada"
              className="ui-card hca-form-stack"
            >
              <h3>Minha edição preservada neste aparelho</h3>
              <SchedulePreparationSummary
                content={{ schedule: carry.fields }}
              />
              {draft.offered && !draft.conflict ? (
                <ActionButton
                  disabled={publishing || draft.busy}
                  onClick={() => {
                    setFields(carry.fields);
                    setWorking(true);
                    void draft.reportConflict();
                  }}
                >
                  Comparar minha edição com o servidor
                </ActionButton>
              ) : null}
              <ActionButton
                disabled={publishing || draft.busy || Boolean(draft.pending)}
                onClick={onClose}
              >
                Fechar preservando minha edição
              </ActionButton>
            </section>
          ) : null}
          {!protectedView && pending ? (
            <section
              className="ui-card hca-form-stack"
              aria-label="Tentativa de escala preservada"
            >
              <h3>Tentativa sem confirmação</h3>
              <SchedulePreparationSummary
                content={{ schedule: pending.fields }}
              />
              <p>
                Os dados e a chave continuam preservados. Consultar não envia
                outra programação.
              </p>
              <div className="hca-toolbar">
                <ActionButton
                  disabled={publishing || Boolean(integrityError)}
                  onClick={() => void check()}
                >
                  Conferir tentativa sem reenviar
                </ActionButton>
                <ActionButton
                  disabled={
                    publishing ||
                    Boolean(integrityError) ||
                    proof?.status === "not_applied"
                  }
                  onClick={() => void send()}
                >
                  Recuperar a mesma confirmação
                </ActionButton>
                <ActionButton disabled={publishing} onClick={onClose}>
                  Fechar guardando referência
                </ActionButton>
              </div>
              {proof?.status === "unknown" ? (
                <Notice>
                  O resultado ainda é desconhecido. A ausência de registro não
                  comprova falha; a referência foi preservada.
                </Notice>
              ) : null}
              {proof?.status === "not_applied" ? (
                <Notice>
                  Uma revisão posterior, uma chave já vinculada ou uma mudança
                  do tipo de plantão impede esta tentativa de ser aplicada.
                  Compare o resultado atual e preserve sua edição antes de
                  preparar outra ação.
                  <ActionButton
                    disabled={publishing}
                    onClick={() => void preserveUnapplied()}
                  >
                    Manter minha edição para novo preenchimento
                  </ActionButton>
                </Notice>
              ) : null}
            </section>
          ) : null}
          {showReview && packet ? (
            <section
              className="hca-form-stack"
              aria-label="Conferência da nova escala"
            >
              <h3 ref={reviewHeadingRef} tabIndex={-1}>
                Confira antes de confirmar
              </h3>
              {reviewRejected ? (
                <Notice error>
                  A gravação foi recusada. Volte ao preenchimento e confira os
                  dados antes de preparar outra confirmação.
                </Notice>
              ) : null}
              <ScheduleReviewDetails
                review={{ command: packet.command, workspace: data ?? empty }}
              />
              <div className="hca-toolbar">
                <ActionButton
                  disabled={publishing}
                  onClick={(event) => {
                    holdDialogFocus(event.currentTarget);
                    setPacket(null);
                    setReviewRejected(false);
                  }}
                >
                  Voltar
                </ActionButton>
                <ActionButton
                  variant="primary"
                  disabled={
                    publishing ||
                    draft.blocked ||
                    !writable ||
                    reviewRejected ||
                    (purpose === "schedule_series_create" && !data) ||
                    Boolean(integrityError)
                  }
                  onClick={() => void send()}
                >
                  Confirmar gravação
                </ActionButton>
              </div>
            </section>
          ) : null}
          {!writable && !protectedView ? (
            <Notice>
              Seu preenchimento e seu resultado próprios continuam disponíveis
              para consulta, descarte ou reconhecimento. Um novo registro exige
              permissão atual.
            </Notice>
          ) : null}
          {source.error && mayRead ? (
            <Notice error>
              Não foi possível consultar as referências da agenda. Seu
              preenchimento foi preservado.
              <ActionButton onClick={source.refresh}>
                Atualizar referências da agenda
              </ActionButton>
            </Notice>
          ) : null}
          {!hiddenEditor && writable ? (
            <>
              <fieldset className="min-w-0" disabled={publishing || draft.busy}>
                <ScheduleForm
                  editor={
                    purpose === "shift_type_create"
                      ? { kind: "type" }
                      : { kind: "series" }
                  }
                  data={data ?? empty}
                  ownId={userId}
                  team={team}
                  publishOwn={publishOwn}
                  today={today}
                  creationFields={fields}
                  reviewTriggerRef={reviewTriggerRef}
                  datesMonth={datesMonth}
                  onDatesMonthChange={setDatesMonth}
                  onCreationChange={(value) => {
                    if (
                      value.form === "series" &&
                      fields.form === "series" &&
                      value.from.slice(0, 7) !== fields.from.slice(0, 7)
                    )
                      setDatesMonth(null);
                    setFields(value);
                    setWorking(true);
                    setError("");
                  }}
                  onReview={() => void review()}
                />
              </fieldset>
              <div className="hca-toolbar">
                <ActionButton
                  disabled={publishing || draft.blocked}
                  onClick={() => void savePersonal()}
                >
                  Salvar preenchimento privado
                </ActionButton>
                <ActionButton
                  disabled={publishing || draft.blocked}
                  onClick={() => void savePersonal(true)}
                >
                  Guardar rascunho e fechar
                </ActionButton>
              </div>
            </>
          ) : null}
        </div>
      </RecordDrawer>
    </ScheduleSummaryContext>
  );
}
