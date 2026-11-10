"use client";
import { useEffect, useRef, useState, type RefObject } from "react";
import { ActionButton } from "@/components/ui/controls";
import {
  api,
  ApiError,
  can,
  Notice,
  type WorkspaceContext,
} from "@/components/workspace";
import { RecordDrawer } from "@/components/forms/record-drawer";
import { useCreationDraft } from "@/components/forms/use-creation-draft";
import { CreationDraftPanel } from "@/components/forms/creation-draft-panel";
import { navigationForStep } from "@/lib/forms/draft-navigation";
import {
  balancePreparationTitles,
  type BalancePreparationPurpose,
} from "@/lib/forms/balance-preparation-purposes";
import {
  initialBalancePreparationFields,
  balancePreparationCommand,
  balancePreparationVersion,
} from "@/lib/forms/balance-preparation";
import {
  balancePreparationContentSchema,
  balancePreparationCommitSchema,
  parseBalancePreparationReference,
  balancePreparationPendingSchema,
  parseBalancePreparationConfirmation,
  type BalancePreparationFields as Values,
  type BalancePreparationReference,
  type BalancePreparationCommit,
  type BalancePreparationReceipt,
} from "@/lib/validation/balance-preparations";
import type { BalanceWorkspace } from "@/types/balances";
import { BalancePreparationFields } from "./balance-preparation-fields";
import { BalanceConfigurationFacts } from "./balance-configuration-facts";
import { DeferralFacts } from "./balance-deferral-facts";
import { formatZonedDate } from "@/lib/schedules/time";

export type BalancePreparationSelection = {
  purpose: BalancePreparationPurpose;
  targetResourceId: string;
};
export function BalanceWorkspacePreparation({
  context,
  selection,
  initialData,
  onClose,
  onCommitted,
  onConsulted,
  restoreFocusTo,
  restoreFocusFallbackRef,
}: {
  context: WorkspaceContext;
  selection: BalancePreparationSelection;
  initialData: BalanceWorkspace;
  onClose: () => void;
  onCommitted: () => void;
  onConsulted: () => void;
  restoreFocusTo?: HTMLElement | null;
  restoreFocusFallbackRef?: RefObject<HTMLElement | null>;
}) {
  const { purpose, targetResourceId } = selection,
    patient = context.patient!,
    patientId = patient.id;
  const [initialValues] = useState(() =>
    initialBalancePreparationFields(
      initialData,
      new Intl.DateTimeFormat("sv-SE", {
        timeZone: "America/Sao_Paulo",
      }).format(new Date()),
    ),
  );
  const [values, setValues] = useState<Values>(initialValues),
    [source, setSource] = useState<BalancePreparationReference | null>(null),
    [reference, setReference] = useState<{
      referenceHash: string | null;
      referenceVersion: number | null;
    }>({ referenceHash: null, referenceVersion: null });
  const [initialReference, setInitialReference] = useState(reference),
    [busy, setBusy] = useState(false),
    [uncertain, setUncertain] = useState(false),
    [review, setReview] = useState<BalancePreparationCommit | null>(null),
    [receipt, setReceipt] = useState<BalancePreparationReceipt | null>(null);
  const [error, setError] = useState(""),
    [fieldError, setFieldError] = useState(""),
    [referenceError, setReferenceError] = useState(""),
    [referenceForbidden, setReferenceForbidden] = useState(false),
    [comparing, setComparing] = useState(false),
    [needsAdoption, setNeedsAdoption] = useState(false);
  const savedBeforeReferenceRef = useRef(false),
    restoredRef = useRef(false),
    initializedRef = useRef(false),
    mountedRef = useRef(true),
    packetRef = useRef<BalancePreparationCommit | null>(null);
  const reasonRef = useRef<HTMLTextAreaElement>(null),
    reviewRef = useRef<HTMLHeadingElement>(null),
    resultRef = useRef<HTMLHeadingElement>(null),
    readRecoveryRef = useRef<HTMLButtonElement>(null),
    queryRef = useRef<HTMLButtonElement>(null);
  const restoreEditingFocusRef = useRef(false);
  const storageKey = `hca:bal-preparation-confirmation:${context.userId}:${patientId}:${purpose}:${targetResourceId}`;
  const referenceUrl =
    "/api/balances/preparations/reference?" +
    new URLSearchParams({
      careRecipientId: patientId,
      purpose,
      targetResourceId,
    });
  const flow = ("BAL_" + purpose.toUpperCase()) as
    | "BAL_CONFIGURE"
    | "BAL_ASSIGN"
    | "BAL_REQUEST_DEFERRAL"
    | "BAL_DEFER"
    | "BAL_APPROVE_DEFERRAL"
    | "BAL_REJECT_DEFERRAL";
  const draft = useCreationDraft({
    userId: context.userId,
    patientId,
    kind: "BAL",
    purpose,
    targetDocumentId: null,
    targetResourceId,
    navigation: navigationForStep(flow, 0),
    onResume: (row) => {
      const c = balancePreparationContentSchema.safeParse(row.content);
      if (!c.success) return false;
      restoredRef.current = true;
      setValues(c.data.values);
      setReference({
        referenceHash: c.data.referenceHash,
        referenceVersion: c.data.referenceVersion,
      });
      setReview(null);
      setError("");
      return true;
    },
    onDiscard: onClose,
  });
  const content = {
    values,
    referenceHash: reference.referenceHash,
    referenceVersion: reference.referenceVersion,
  };
  const saved =
    draft.base?.content && "values" in draft.base.content
      ? draft.base.content
      : { values: initialValues, ...initialReference };
  const dirty = JSON.stringify(content) !== JSON.stringify(saved);
  const family = ["family", "admin"].includes(patient.role),
    allowDeferral = family && can(context, "bal.defer.approve");
  const canWrite =
    purpose === "configure" || purpose === "assign"
      ? family && can(context, "bal.schedule.manage")
      : purpose === "request_deferral"
        ? can(context, "bal.defer.request") &&
          (source?.workspace.assignments.find((a) => a.id === targetResourceId)
            ?.professional_id === context.userId ||
            patient.role === "supervisor")
        : allowDeferral;
  const protectedView =
    referenceForbidden || draft.readDenied || draft.protectedReadPending;
  const stale =
    !source ||
    source.referenceHash !== reference.referenceHash ||
    reference.referenceVersion !== balancePreparationVersion(source) ||
    Boolean(referenceError) ||
    needsAdoption;
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (!active) return;
      try {
        const raw = sessionStorage.getItem(storageKey),
          parsed = raw
            ? balancePreparationPendingSchema.safeParse(JSON.parse(raw))
            : null;
        if (
          parsed?.success &&
          parsed.data.packet.careRecipientId === patientId &&
          parsed.data.packet.purpose === purpose &&
          parsed.data.packet.targetResourceId === targetResourceId
        ) {
          restoredRef.current = true;
          setValues(parsed.data.content.values);
          setReference({
            referenceHash: parsed.data.content.referenceHash,
            referenceVersion: parsed.data.content.referenceVersion,
          });
          packetRef.current = parsed.data.packet;
          setReview(parsed.data.packet);
          setUncertain(true);
        }
      } catch {
        /* An optional damaged copy never authorizes a command. */
      }
    });
    return () => {
      active = false;
    };
  }, [storageKey, patientId, purpose, targetResourceId]);
  useEffect(() => {
    if (
      draft.loading ||
      draft.offered ||
      draft.consumed ||
      draft.pending ||
      uncertain ||
      initializedRef.current
    )
      return;
    const controller = new AbortController();
    void api<{ data: unknown }>(referenceUrl, undefined, controller.signal)
      .then((r) => {
        if (controller.signal.aborted) return;
        const current = parseBalancePreparationReference(r.data, {
          patientId,
          purpose,
          targetResourceId,
        });
        if (
          current.patientId !== patientId ||
          current.purpose !== purpose ||
          current.targetResourceId !== targetResourceId
        )
          throw new Error(
            "A referência não corresponde ao contexto consultado.",
          );
        initializedRef.current = true;
        setSource(current);
        setReferenceError("");
        setReferenceForbidden(false);
        if (!restoredRef.current && !savedBeforeReferenceRef.current) {
          const ref = {
            referenceHash: current.referenceHash,
            referenceVersion: balancePreparationVersion(current),
          };
          setReference(ref);
          setInitialReference(ref);
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted) {
          setReferenceError(
            e instanceof Error
              ? e.message
              : "Não foi possível consultar a referência.",
          );
          setReferenceForbidden(
            e instanceof ApiError && [401, 403, 404].includes(e.status),
          );
        }
      });
    return () => controller.abort();
  }, [
    draft.loading,
    draft.offered,
    draft.consumed,
    draft.pending,
    uncertain,
    referenceUrl,
    patientId,
    purpose,
    targetResourceId,
  ]);
  useEffect(() => {
    if (review) reviewRef.current?.focus();
    else if (receipt) resultRef.current?.focus();
  }, [review, receipt]);
  useEffect(() => {
    if (protectedView) readRecoveryRef.current?.focus();
  }, [protectedView]);
  useEffect(() => {
    if (!restoreEditingFocusRef.current || busy || draft.busy || review) return;
    const frame = requestAnimationFrame(() => {
      restoreEditingFocusRef.current = false;
      if (protectedView) {
        readRecoveryRef.current?.focus();
        return;
      }
      const reason = reasonRef.current;
      if (reason && !reason.matches(":disabled")) reason.focus();
      else queryRef.current?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [busy, draft.busy, draft.blocked, review, protectedView]);
  async function queryReference() {
    try {
      const current = parseBalancePreparationReference(
        (await api<{ data: unknown }>(referenceUrl)).data,
        { patientId, purpose, targetResourceId },
      );
      if (
        current.patientId !== patientId ||
        current.purpose !== purpose ||
        current.targetResourceId !== targetResourceId
      )
        throw new Error("A referência não corresponde ao contexto consultado.");
      if (mountedRef.current) {
        initializedRef.current = true;
        setSource(current);
        setReferenceError("");
        setReferenceForbidden(false);
        setComparing(true);
      }
      return current;
    } catch (e) {
      if (mountedRef.current) {
        setReferenceError(
          e instanceof Error
            ? e.message
            : "Não foi possível conferir a referência atual.",
        );
        if (e instanceof ApiError && [401, 403, 404].includes(e.status))
          setReferenceForbidden(true);
      }
      throw e;
    }
  }
  async function consult() {
    setBusy(true);
    setError("");
    try {
      await queryReference();
      if (mountedRef.current) onConsulted();
    } catch (e) {
      if (mountedRef.current) {
        setReferenceError(
          e instanceof Error
            ? e.message
            : "Não foi possível consultar a referência.",
        );
        if (e instanceof ApiError && [401, 403, 404].includes(e.status)) {
          setReferenceForbidden(true);
          await draft.revalidateRead();
        }
      }
    } finally {
      if (mountedRef.current) setBusy(false);
    }
  }
  function adopt() {
    if (!source || referenceError || busy || uncertain) return;
    setReference({
      referenceHash: source.referenceHash,
      referenceVersion: balancePreparationVersion(source),
    });
    setComparing(false);
    setNeedsAdoption(false);
    setValues((previous) => {
      const target = source.workspace.targets.find(
          (t) => t.id === previous.targetShiftId,
        ),
        type = source.workspace.types.find(
          (t) => t.id === previous.shiftTypeId,
        ),
        person = source.workspace.professionals.find(
          (p) => p.id === previous.professionalId,
        );
      const label = target
        ? `${target.professional_name} · ${target.type_name} · ${formatZonedDate(target.starts_at, source.workspace.regime?.timezone)} → ${formatZonedDate(target.ends_at, source.workspace.regime?.timezone)}`
        : previous.targetShiftLabel;
      return {
        ...previous,
        shiftTypeLabel: type?.name ?? previous.shiftTypeLabel,
        professionalLabel: person?.name ?? previous.professionalLabel,
        targetShiftLabel: label,
        targetShiftQuery:
          previous.targetShiftQuery === previous.targetShiftLabel
            ? label
            : previous.targetShiftQuery,
      };
    });
    reasonRef.current?.focus();
  }
  async function prepare() {
    if (busy || draft.blocked || !canWrite) return;
    const reason = (values.reason ?? "").trim();
    if (Array.from(reason).length < 3 || reason.length > 1000) {
      setFieldError(
        "Informe uma justificativa própria com 3 a 1.000 caracteres.",
      );
      reasonRef.current?.focus();
      return;
    }
    setFieldError("");
    setBusy(true);
    setError("");
    try {
      const command = balancePreparationCommand(
          purpose,
          targetResourceId,
          values,
        ),
        current = await queryReference();
      if (!mountedRef.current) return;
      if (
        current.referenceHash !== reference.referenceHash ||
        balancePreparationVersion(current) !== reference.referenceVersion
      ) {
        setNeedsAdoption(true);
        setError(
          "A situação mudou. Compare e adote explicitamente a referência atual; seu preenchimento foi preservado.",
        );
        return;
      }
      const saved = await draft.save(content);
      if (!saved || !mountedRef.current) return;
      const intent = balancePreparationCommitSchema.parse({
        careRecipientId: patientId,
        purpose,
        targetResourceId,
        draftCommit: { id: saved.id, revision: saved.revision },
        idempotencyKey: crypto.randomUUID(),
        referenceHash: reference.referenceHash,
        expectedVersion: reference.referenceVersion,
        command,
      });
      packetRef.current = intent;
      setReview(intent);
      setComparing(false);
    } catch (e) {
      if (mountedRef.current) {
        setError(
          e instanceof Error
            ? e.message
            : "Não foi possível preparar a decisão.",
        );
        reasonRef.current?.focus();
        if (e instanceof ApiError && [401, 403, 404].includes(e.status)) {
          setReferenceForbidden(true);
          await draft.revalidateRead();
        }
      }
    } finally {
      if (mountedRef.current) setBusy(false);
    }
  }
  async function send() {
    const intent = packetRef.current;
    if (!intent || busy) return;
    const recovering = uncertain;
    setBusy(true);
    setError("");
    try {
      try {
        sessionStorage.setItem(
          storageKey,
          JSON.stringify({ packet: intent, content }),
        );
      } catch {
        /* Retain the exact packet in memory. */
      }
      const raw = await api<{ data: unknown }>(
        "/api/balances/preparations/commit",
        intent,
      );
      const confirmed = parseBalancePreparationConfirmation(
        raw.data,
        intent,
        context.userId,
      );
      try {
        sessionStorage.removeItem(storageKey);
      } catch {
        /* The confirmed server result remains authoritative. */
      }
      if (!mountedRef.current) return;
      packetRef.current = null;
      setReceipt(confirmed);
      setReview(null);
      setUncertain(false);
      draft.reload();
      onCommitted();
    } catch (e) {
      if (!mountedRef.current) return;
      const rejected =
        e instanceof ApiError &&
        [400, 401, 403, 404, 409, 422].includes(e.status);
      setError(
        e instanceof Error
          ? e.message
          : "A confirmação ainda não foi recuperada.",
      );
      setUncertain(!rejected || recovering);
      if (rejected && !recovering) {
        packetRef.current = null;
        setReview(null);
        try {
          sessionStorage.removeItem(storageKey);
        } catch {
          /* No committed result was claimed. */
        }
        setNeedsAdoption(true);
        setComparing(true);
        restoreEditingFocusRef.current = true;
        if (e.code === "DRAFT_VERSION_CONFLICT") await draft.reportConflict();
      }
      if (e instanceof ApiError && [401, 403, 404].includes(e.status)) {
        setReferenceForbidden(true);
        await draft.revalidateRead();
      }
    } finally {
      if (mountedRef.current) setBusy(false);
    }
  }
  return (
    <RecordDrawer
      title={
        review
          ? "Revisar decisão do balanço"
          : balancePreparationTitles[purpose]
      }
      onClose={onClose}
      busy={busy || draft.busy}
      preventClose={uncertain || Boolean(review) || Boolean(draft.pending)}
      hasUnsavedChanges={!receipt && !draft.consumed && dirty}
      restoreFocusTo={restoreFocusTo}
      restoreFocusFallbackRef={restoreFocusFallbackRef}
    >
      {error ? <Notice error>{error}</Notice> : null}
      {uncertain ? (
        <Notice>
          A resposta ainda não foi confirmada. A tentativa original está
          preservada; recuperar não cria outra decisão.
        </Notice>
      ) : null}
      {uncertain ? (
        <ActionButton disabled={busy || draft.busy} onClick={() => void send()}>
          Recuperar a mesma tentativa
        </ActionButton>
      ) : null}
      <CreationDraftPanel
        draft={draft}
        current={content}
        patientName={patient.display_name}
        disabled={busy || uncertain || Boolean(review)}
        revalidationRef={readRecoveryRef}
        onRevalidateRead={() => {
          void draft.revalidateRead().then((ok) => {
            if (ok) {
              setReferenceForbidden(false);
              if (!draft.consumed) void consult();
            }
          });
        }}
      />
      {protectedView ? (
        <Notice error>
          O acesso precisa ser revalidado antes de exibir este preenchimento.
          <ActionButton
            disabled={busy || draft.busy}
            onClick={() => {
              void draft.revalidateRead().then((ok) => {
                if (ok) {
                  setReferenceForbidden(false);
                  void consult();
                }
              });
            }}
          >
            Revalidar acesso ao preenchimento
          </ActionButton>
        </Notice>
      ) : receipt ? (
        <section className="hca-form-stack">
          <h3 ref={resultRef} tabIndex={-1}>
            Decisão registrada
          </h3>
          <p>
            O resultado preservado corresponde àquela decisão. O acompanhamento
            mostra a situação atual; registro de programação não comprova
            presença ou contagem física.
          </p>
          <p>
            {balancePreparationTitles[receipt.purpose]} ·{" "}
            {formatZonedDate(receipt.recordedAt, initialData.regime?.timezone)}.
          </p>
          <ActionButton onClick={onClose}>
            Voltar ao acompanhamento
          </ActionButton>
        </section>
      ) : draft.consumed ? null : review ? (
        <section className="hca-form-stack" aria-label="Conferência da decisão">
          <h3 ref={reviewRef} tabIndex={-1}>
            Confira a decisão do balanço
          </h3>
          <p>
            {purpose === "request_deferral"
              ? "A solicitação será encaminhada à família. O prazo atual continua válido."
              : purpose === "reject_deferral"
                ? "Rejeitar este pedido com motivo próprio, sem alterar atribuição, prazo ou estoque."
                : purpose === "approve_deferral"
                  ? "Aprovar somente o destino congelado, se ainda elegível. A alteração do prazo será explícita e auditável."
                  : "A decisão será registrada com seu responsável e justificativa."}
          </p>
          {review.command.action === "configure" && source ? (
            <BalanceConfigurationFacts
              command={review.command}
              data={source.workspace}
            />
          ) : null}
          {(purpose === "approve_deferral" || purpose === "reject_deferral") &&
          source?.workspace.deferrals.find((d) => d.id === targetResourceId) ? (
            <DeferralFacts
              deferral={
                source.workspace.deferrals.find(
                  (d) => d.id === targetResourceId,
                )!
              }
              timezone={source.workspace.regime?.timezone}
            />
          ) : null}
          {values.targetShiftLabel ? (
            <p className="wrap-anywhere">Destino: {values.targetShiftLabel}.</p>
          ) : null}
          {"reason" in review.command.body ? (
            <div>
              <h3>Sua justificativa</h3>
              <p className="whitespace-pre-wrap wrap-anywhere">
                {review.command.body.reason}
              </p>
            </div>
          ) : null}
          <div className="hca-toolbar">
            <ActionButton
              disabled={busy || uncertain}
              onClick={() => {
                packetRef.current = null;
                restoreEditingFocusRef.current = true;
                setReview(null);
              }}
            >
              Voltar
            </ActionButton>
            <ActionButton
              variant="primary"
              disabled={busy}
              onClick={() => void send()}
            >
              {uncertain ? "Recuperar confirmação" : "Confirmar decisão"}
            </ActionButton>
          </div>
        </section>
      ) : (
        <div className="hca-form-stack">
          {referenceError ? (
            <Notice error>{referenceError}</Notice>
          ) : !source ? (
            <Notice>
              Consultando a referência autorizada da programação e dos plantões…
            </Notice>
          ) : null}
          <div className="hca-toolbar">
            <ActionButton
              disabled={
                busy ||
                draft.loading ||
                Boolean(draft.pending) ||
                !canWrite ||
                draft.blocked
              }
              onClick={() => {
                savedBeforeReferenceRef.current = true;
                void draft.save(content);
              }}
            >
              Salvar preenchimento privado
            </ActionButton>
            <ActionButton
              disabled={busy || draft.loading || Boolean(draft.pending)}
              ref={queryRef}
              onClick={() => void consult()}
            >
              Consultar situação atual do pedido
            </ActionButton>
          </div>
          {(stale || comparing) && source ? (
            <section
              className="hca-attention"
              aria-label="Comparação de referências"
            >
              <p>
                Referência atual consultada. Adotar mantém seus textos e
                escolhas; seleção indisponível exige outra escolha explícita.
              </p>
              <ActionButton
                disabled={
                  busy ||
                  Boolean(referenceError) ||
                  Boolean(draft.pending) ||
                  draft.blocked
                }
                onClick={adopt}
              >
                Adotar referência atual preservando meu preenchimento
              </ActionButton>
            </section>
          ) : null}
          {!canWrite ? (
            <Notice>
              Você pode consultar, descartar ou reconhecer seu preenchimento
              preservado. Uma nova decisão exige permissão atual.
            </Notice>
          ) : null}
          <fieldset
            disabled={busy || draft.blocked || !canWrite}
            className="min-w-0"
          >
            <BalancePreparationFields
              purpose={purpose}
              targetResourceId={targetResourceId}
              reference={referenceError ? null : source}
              values={values}
              onChange={(patch) =>
                setValues((current) => ({ ...current, ...patch }))
              }
              onReview={() => void prepare()}
              canReview={!stale && !draft.blocked && canWrite}
              allowDeferral={allowDeferral}
              reasonRef={reasonRef}
              error={fieldError || undefined}
            />
          </fieldset>
        </div>
      )}
    </RecordDrawer>
  );
}
