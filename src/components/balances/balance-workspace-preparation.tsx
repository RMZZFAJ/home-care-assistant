"use client";
import { useOperationActivity } from "@/components/ui/operation-activity";
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
import { useDocumentDecision, DocumentDecisionFailure } from "@/components/documents/use-document-decision";
import type { DocumentDecisionIntention } from "@/lib/validation/document-decisions";
import {
  balancePreparationTitles,
  type BalancePreparationPurpose,
} from "@/lib/forms/balance-preparation-purposes";
import {
  initialBalancePreparationFields,
  balancePreparationCommand,
  balancePreparationRequiresReason,
  balancePreparationVersion,
} from "@/lib/forms/balance-preparation";
import {
  balancePreparationDecisionSchema,
  parseBalancePreparationReference,
  parseBalancePreparationReceipt,
  type BalancePreparationFields as Values,
  type BalancePreparationReference,
  type BalancePreparationDecision,
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
    [review, setReview] = useState<BalancePreparationDecision | null>(null),
    [receipt, setReceipt] = useState<BalancePreparationReceipt | null>(null);
  const [error, setError] = useState(""),
    [fieldError, setFieldError] = useState(""),
    [referenceError, setReferenceError] = useState(""),
    [referenceForbidden, setReferenceForbidden] = useState(false),
    [comparing, setComparing] = useState(false),
    [needsAdoption, setNeedsAdoption] = useState(false);
  const initializedRef = useRef(false),
    mountedRef = useRef(true),
    packetRef = useRef<BalancePreparationDecision | null>(null);
  const reasonRef = useRef<HTMLTextAreaElement>(null),
    reviewRef = useRef<HTMLHeadingElement>(null),
    resultRef = useRef<HTMLHeadingElement>(null),
    readRecoveryRef = useRef<HTMLButtonElement>(null),
    queryRef = useRef<HTMLButtonElement>(null);
  const restoreEditingFocusRef = useRef(false);
  const referenceUrl =
    "/api/balances/preparations/reference?" +
    new URLSearchParams({
      careRecipientId: patientId,
      purpose,
      targetResourceId,
    });
  const decision = useDocumentDecision({ userId: context.userId, documentId: targetResourceId, patientId, domain: "balance_workspace", action: purpose });
  useOperationActivity(!source && !referenceError, { title: "Consultando a programação", detail: "Estamos conferindo a referência autorizada para este preenchimento." });
  const content = { values, referenceHash: reference.referenceHash, referenceVersion: reference.referenceVersion };
  const saved = { values: initialValues, ...initialReference };
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
    referenceForbidden;
  const requiresReason = balancePreparationRequiresReason(
    purpose,
    source?.workspace.regime?.enabled ?? false,
    values,
  );
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
    if (
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
        if (!packetRef.current) {
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
    if (!restoreEditingFocusRef.current || busy || review) return;
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
  }, [busy, review, protectedView]);
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
    if (busy || !canWrite) return;
    const reason = (values.reason ?? "").trim();
    if (requiresReason && (Array.from(reason).length < 3 || reason.length > 1000)) {
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
      const intent = balancePreparationDecisionSchema.parse({ careRecipientId: patientId, purpose, targetResourceId, referenceHash: reference.referenceHash, expectedVersion: reference.referenceVersion, command });
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
        }
      }
    } finally {
      if (mountedRef.current) setBusy(false);
    }
  }
  async function send() {
    const intent = packetRef.current;
    if (!intent || busy) return;
    setBusy(true); setError("");
    const verify = (result: Record<string, unknown>, accepted: DocumentDecisionIntention) => {
      parseBalancePreparationReceipt(result, { patientId, purpose: accepted.action, targetResourceId, userId: context.userId }, { ...intent, purpose: accepted.action, command: accepted.body.command, referenceHash: accepted.referenceHash, expectedVersion: accepted.expectedVersion || null } as BalancePreparationDecision);
    };
    try {
      const result = uncertain ? await decision.checkPrevious(verify) : await decision.execute({ domain: "balance_workspace", action: purpose, expectedVersion: intent.expectedVersion ?? 0, referenceHash: intent.referenceHash, body: { command: intent.command } }, verify);
      if (!mountedRef.current || !result) return;
      if (result.state === "not_applied") { setUncertain(false); setReview(null); setError("A conferência confirmou que nada foi alterado. Confira seus campos e tente novamente; se persistir, procure a supervisão."); return; }
      packetRef.current = null;
      setReceipt(parseBalancePreparationReceipt(result.result, { patientId, purpose, targetResourceId, userId: context.userId }));
      setReview(null); setUncertain(false); onCommitted();
    } catch (e) {
      if (!mountedRef.current) return;
      setError(e instanceof Error ? e.message : "Não foi possível conferir a decisão. Procure a supervisão.");
      const unknown = !(e instanceof DocumentDecisionFailure) || e.outcome === "uncertain";
      setUncertain(unknown);
      if (!unknown) { setReview(null); restoreEditingFocusRef.current = true; if (e.cause instanceof ApiError && [401,403,404,409].includes(e.cause.status)) { setNeedsAdoption(true); setComparing(true); } }
    } finally { if (mountedRef.current) setBusy(false); }
  }
  return (
    <RecordDrawer
      exitDialog
      title={
        review
          ? "Revisar decisão do balanço"
          : balancePreparationTitles[purpose]
      }
      onClose={onClose}
      busy={busy}
      uncertainOutcome={uncertain || decision.uncertain}
      hasUnsavedChanges={!receipt && dirty}
      restoreFocusTo={restoreFocusTo}
      restoreFocusFallbackRef={restoreFocusFallbackRef}
    >
      {decision.recoveryMessage ? <Notice>{decision.recoveryMessage}</Notice> : null}
        {error ? <Notice error>{error}</Notice> : null}
      {uncertain ? (
        <Notice>
          A resposta ainda não foi confirmada. A tentativa original está
          preservada; recuperar não cria outra decisão.
        </Notice>
      ) : null}
      {uncertain ? (
        <ActionButton disabled={busy} onClick={() => void send()}>
          Recuperar a mesma tentativa
        </ActionButton>
      ) : null}
      {protectedView ? (
        <Notice error>
          O acesso precisa ser revalidado antes de exibir este preenchimento.
          <ActionButton
            disabled={busy}
            onClick={() => {
              setReferenceForbidden(false); void consult();
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
      ) : review ? (
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
                  : purpose === "configure"
                    ? "A programação será registrada com a identificação de quem confirmou."
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
          {"reason" in review.command.body && review.command.body.reason ? (
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
              disabled={busy}
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
                  uncertain
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
            disabled={busy || !canWrite}
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
              canReview={!stale && canWrite}
              allowDeferral={allowDeferral}
              reasonRef={reasonRef}
              requiresReason={requiresReason}
              error={fieldError || undefined}
            />
          </fieldset>
        </div>
      )}
    </RecordDrawer>
  );
}
