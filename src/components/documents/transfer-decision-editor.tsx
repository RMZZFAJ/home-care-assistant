"use client";
import { useEffect, useRef, useState } from "react";
import {
  ActionButton,
  FormField,
  TextAreaField,
} from "@/components/ui/controls";
import {
  api,
  ApiError,
  Notice,
  type WorkspaceContext,
} from "@/components/workspace";
import { RecordDrawer } from "@/components/forms/record-drawer";
import { useDocumentDecision, DocumentDecisionFailure } from "./use-document-decision";
import type { DocumentDecisionIntention } from "@/lib/validation/document-decisions";
import {
  DraftContentSummary,
} from "@/components/forms/creation-draft-panel";
import {
  adoptTransferDecisionReference,
  transferActionLabels,
  transferActAvailable,
  transferDecisionReference,
  transferPurpose,
  type TransferAction,
} from "@/lib/forms/transfer-decision-draft";
import { parseTransferReference } from "@/lib/validation/transfer-reference";
import {
  transferCommandSchema,
  type TransferCommand,
} from "@/lib/validation/transfers";
import { requireSupplyConfirmation } from "@/lib/validation/supply-confirmation";
import type { ReceiptDraftContent } from "@/lib/validation/supply-drafts";
import type { SupplyDocument } from "@/types/documents";
import { formatQuantity } from "@/lib/quantity";
import { TransferFactsDisplay } from "./transfer-facts";

export function TransferDecisionEditor({
  original,
  context,
  action,
  consulting,
  restoreFocusTo,
  onClose,
  onSaved,
}: {
  original: SupplyDocument;
  context: WorkspaceContext;
  action: TransferAction;
  consulting: boolean;
  restoreFocusTo: HTMLElement | null;
  onClose: () => void;
  onSaved: (row: SupplyDocument) => void;
}) {
  const [reference, setReference] = useState(original);
  const [baseline, setBaseline] = useState(() =>
    transferDecisionReference(original),
  );
  const [reason, setReason] = useState("");
  const [comparison, setComparison] = useState<SupplyDocument | null>(null);
  const [blocked, setBlocked] = useState(false),
    [unavailable, setUnavailable] = useState(false);
  const [reviewing, setReviewing] = useState(false),
    [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false),
    [error, setError] = useState("");
  const pendingRef = useRef<TransferCommand | null>(null),
    headingRef = useRef<HTMLHeadingElement>(null);
  const reasonControlRef = useRef<HTMLTextAreaElement>(null);
  const returnFocusRef = useRef(false);
  const purpose = transferPurpose(action),
    recoveryOnly = consulting || !transferActAvailable(original, action);
  const decision = useDocumentDecision({ userId: context.userId, documentId: original.id, domain: "transfer", action });
  useEffect(() => {
    if (reviewing) headingRef.current?.focus();
  }, [reviewing]);
  useEffect(() => {
    if (!busy && !reviewing && returnFocusRef.current) {
      returnFocusRef.current = false;
      reasonControlRef.current?.focus();
    }
  }, [busy, reviewing]);
  const content: ReceiptDraftContent = {
    ...baseline,
    fields: { ...baseline.fields, reason },
  };
  const readOnly = recoveryOnly;
  const allowed =
    !readOnly &&
    !blocked &&
    !unavailable &&
    transferActAvailable(reference, action);
  async function compare() {
    setBusy(true);
    setError("");
    setBlocked(true);
    setUnavailable(true);
    setComparison(null);
    try {
      setComparison(
        parseTransferReference(
          await api<unknown>("/api/documents/" + original.id),
          {
            id: original.id,
            patientId: original.care_recipient_id,
            minimumVersion: baseline.documentVersion,
          },
        ),
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível consultar a transferência.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function review() {
    if (!allowed || busy || uncertain) return;
    const parsed = transferCommandSchema.safeParse({
      action,
      body: action === "dispatch" ? {} : { reason },
      expectedVersion: reference.version,
      idempotencyKey: crypto.randomUUID(),
    });
    if (!parsed.success) {
      setError("Informe sua justificativa de 3 a 1.000 caracteres.");
      reasonControlRef.current?.focus();
      return;
    }
    setBusy(true);
    try {
      const fresh = parseTransferReference(
        await api<unknown>("/api/documents/" + original.id),
        {
          id: original.id,
          patientId: original.care_recipient_id,
          minimumVersion: baseline.documentVersion,
        },
      );
      if (
        fresh.version !== reference.version ||
        !transferActAvailable(fresh, action)
      ) {
        setComparison(fresh);
        setBlocked(true);
        setUnavailable(true);
        setError(
          "A transferência mudou. Seu texto foi preservado; compare o estado atual antes de revisar.",
        );
        returnFocusRef.current = true;
        return;
      }
    } catch (cause) {
      setBlocked(true);
      setUnavailable(true);
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível conferir a transferência atual.",
      );
      return;
    } finally {
      setBusy(false);
    }
    pendingRef.current = parsed.data;
    setError("");
    setReviewing(true);
  }
  function verified(row: Record<string, unknown>, intention: DocumentDecisionIntention) {
    const value = requireSupplyConfirmation({ data: row, persistence: "confirmed" }, { id: original.id, patientId: original.care_recipient_id, type: "ENT", minimumVersion: intention.expectedVersion });
    parseTransferReference({ data: value }, { id: original.id, patientId: original.care_recipient_id, minimumVersion: intention.expectedVersion });
  }
  async function confirm() {
    if (busy || !pendingRef.current && !uncertain) return;
    setBusy(true); setError("");
    try {
      const packet = pendingRef.current;
      const result = uncertain ? await decision.checkPrevious(verified) : await decision.execute({
        domain: "transfer", action, body: packet!.body, expectedVersion: packet!.expectedVersion,
      }, verified);
      if (!result) return;
      pendingRef.current = null; setUncertain(false);
      if (result.state === "applied") onSaved(requireSupplyConfirmation({ data: result.result, persistence: "confirmed" }, { id: original.id, patientId: original.care_recipient_id, type: "ENT", minimumVersion: result.intention.expectedVersion }));
      else { setReviewing(false); setError("A conferência confirmou que nada foi alterado. Seus campos continuam nesta tela para tentar novamente. Se persistir, procure a supervisão."); }
    } catch (cause) {
      const failure = cause instanceof DocumentDecisionFailure ? cause : null;
      const originalCause = failure?.cause ?? cause;
      const rejected = failure?.outcome === "not_applied" || originalCause instanceof ApiError && [400,401,403,404,409,422].includes(originalCause.status);
      setUncertain(failure ? failure.outcome === "uncertain" : !rejected);
      if (rejected) { pendingRef.current = null; setReviewing(false); if (originalCause instanceof ApiError && [403,404,409].includes(originalCause.status)) { setBlocked(true); setUnavailable(true); } }
      setError(cause instanceof Error ? cause.message : "Não foi possível concluir. Procure a supervisão se persistir.");
    } finally { setBusy(false); }
  }
  return (
    <RecordDrawer
      exitDialog
      title={
        reviewing
          ? "Revisar ato da transferência"
          : transferActionLabels[action]
      }
      busy={busy}
      uncertainOutcome={uncertain || decision.uncertain}
      restoreFocusTo={restoreFocusTo}
      onClose={onClose}
    >
      <div className="hca-form-stack">
        {decision.recoveryMessage ? <Notice>{decision.recoveryMessage}</Notice> : null}
        {error ? <Notice error>{error}</Notice> : null}
        {readOnly ? <Notice>Este ato não está disponível neste estado ou perfil. Feche para consultar a ficha.</Notice> : (
          <>


            {!reviewing ? (
              <ActionButton
                disabled={busy || uncertain}
                onClick={() => void compare()}
              >
                Consultar e comparar transferência atual
              </ActionButton>
            ) : null}
            {blocked || unavailable ? (
              <Notice>
                Seu texto e a versão {baseline.documentVersion} foram
                preservados. Consulte, compare e adote a referência atual antes
                de revisar.
              </Notice>
            ) : null}
            {comparison && !reviewing ? (
              <section
                className="ui-card hca-form-stack"
                aria-label="Comparação do ato da transferência"
              >
                <h3>Referência preservada e atual</h3>
                <DraftContentSummary
                  content={content}
                  kind="ENT"
                  purpose={purpose}
                />
                <p>
                  Versão preservada {baseline.documentVersion}; atual{" "}
                  {comparison.version}.
                </p>
                <TransferFactsDisplay facts={comparison.transfer!} />
                <ActionButton
                  disabled={
                    busy ||
                    !transferActAvailable(comparison, action)
                  }
                  onClick={() => {
                    setBaseline(
                      adoptTransferDecisionReference(content, comparison),
                    );
                    setReference(comparison);
                    setComparison(null);
                    setBlocked(false);
                    setUnavailable(false);
                    setError("");
                    requestAnimationFrame(() =>
                      reasonControlRef.current?.focus(),
                    );
                  }}
                >
                  Adotar estado atual e revisar minha decisão
                </ActionButton>
                {!transferActAvailable(comparison, action) ? (
                  <Notice>
                    Este ato não está disponível no estado atual. Seu
                    preenchimento permanece nesta tela; fechar o descarta.
                  </Notice>
                ) : null}
              </section>
            ) : null}
            <h3 ref={headingRef} tabIndex={-1}>
              {reviewing
                ? "Conferir ato antes de confirmar"
                : "Sua decisão pessoal"}
            </h3>
            <p>Versão documental de referência: {baseline.documentVersion}.</p>
            {!unavailable ? (
              <>
                <TransferFactsDisplay facts={reference.transfer!} />
                {reference.lines.map((line) => (
                  <p key={line.id}>
                    {line.name_snapshot} · {formatQuantity(line.quantity)}{" "}
                    {line.unit_snapshot}
                  </p>
                ))}
              </>
            ) : null}
            {reviewing ? (
              <>
                <p>
                  <strong>{transferActionLabels[action]}</strong>
                </p>
                {action !== "dispatch" ? (
                  <p className="whitespace-pre-wrap">
                    Sua justificativa: {reason}
                  </p>
                ) : (
                  <Notice>
                    A expedição debita a custódia de origem e coloca o material
                    em trânsito. O destino será creditado somente no recebimento
                    pessoal de {reference.transfer!.declaration.recipient.name}.
                  </Notice>
                )}
                {uncertain ? (
                  <Notice>
                    O resultado ficou incerto. Recupere o mesmo ato antes de
                    preparar outro.
                  </Notice>
                ) : null}
                <div className="hca-toolbar">
                  {!uncertain ? (
                    <ActionButton
                      disabled={busy}
                      onClick={() => {
                        setReviewing(false);
                        pendingRef.current = null;
                        requestAnimationFrame(() =>
                          reasonControlRef.current?.focus(),
                        );
                      }}
                    >
                      Voltar à minha decisão
                    </ActionButton>
                  ) : null}
                  <ActionButton
                    variant="primary"
                    disabled={busy}
                    onClick={() => void confirm()}
                  >
                    {uncertain
                      ? "Recuperar mesmo ato"
                      : "Confirmar " +
                        (action === "dispatch" ? "expedição" : "decisão")}
                  </ActionButton>
                </div>
              </>
            ) : (
              <form
                className="hca-form-stack"
                onSubmit={(event) => {
                  event.preventDefault();
                  void review();
                }}
              >
                {action !== "dispatch" ? (
                  <FormField label="Sua justificativa para este ato" required>
                    <TextAreaField
                      ref={reasonControlRef}
                      required
                      minLength={3}
                      maxLength={1000}
                      value={reason}
                      disabled={
                        busy ||
                        uncertain ||
                        readOnly
                      }
                      onChange={(event) => setReason(event.currentTarget.value)}
                    />
                  </FormField>
                ) : (
                  <p>
                    A concordância anterior está preservada. Confirme apenas se
                    esta é a expedição física efetiva.
                  </p>
                )}
                <ActionButton
                  type="submit"
                  variant="primary"
                  disabled={
                    !allowed ||
                    busy ||
                    uncertain ||
                    (action !== "dispatch" && reason.trim().length < 3)
                  }
                >
                  Revisar meu ato
                </ActionButton>
              </form>
            )}
          </>
        )}
      </div>
    </RecordDrawer>
  );
}
