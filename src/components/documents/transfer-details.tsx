"use client";
import { ActionButton, FormField, LoadingIndicator, TextAreaField } from "@/components/ui/controls";
import { useEffect, useRef, useState } from "react";

import { api, ApiError, Notice } from "@/components/workspace";
import { RecordDrawer } from "@/components/forms/record-drawer";
import { useScopedRead } from "@/lib/use-scoped-read";
import { formatBrazilDate } from "@/lib/receipt";
import { formatQuantity } from "@/lib/quantity";
import type { SupplyDocument } from "@/types/documents";
import type { TransferFacts } from "@/types/transfers";
import type { TransferCommand } from "@/lib/validation/transfers";
import { RelatedDocument } from "./related-document";
import { custodyName } from "./transfer-console";

const actionLabels = {
  agree: "Concordar com a transferência",
  decline: "Recusar transferência",
  withdraw: "Encerrar declaração sem expedir",
  dispatch: "Expedir transferência",
};
function TransferFactsDisplay({ facts }: { facts: TransferFacts }) {
  const declaration = facts.declaration;
  return (
    <div className="space-y-3 wrap-break-word text-sm">
      <p>
        <strong>
          {custodyName(declaration.source)} →{" "}
          {custodyName(declaration.destination)}
        </strong>
        .
      </p>
      <p>
        Declarante: <strong>{declaration.actor.name}</strong> ·{" "}
        {formatBrazilDate(declaration.recordedAt)}.
      </p>
      <p className="whitespace-pre-wrap">
        Justificativa original: {declaration.reason}
      </p>
      <p>
        Contraparte designada para concordância:{" "}
        <strong>{declaration.counterparty.name}</strong>.
      </p>
      <p>
        Recebedor físico designado:{" "}
        <strong>{declaration.recipient.name}</strong>.
      </p>
      {facts.agreement ? (
        <>
          <p>
            <strong>
              {facts.agreement.decision === "agree"
                ? "Concordância própria"
                : "Recusa própria"}
            </strong>
            : {facts.agreement.actor.name} ·{" "}
            {formatBrazilDate(facts.agreement.recordedAt)}.
          </p>
          <p className="whitespace-pre-wrap">{facts.agreement.reason}</p>
        </>
      ) : (
        <p>A concordância ainda não foi registrada.</p>
      )}
      {facts.dispatchedAt ? (
        <p>
          Expedição efetiva: {formatBrazilDate(facts.dispatchedAt)}. Acompanhe o
          recebimento e as divergências abaixo.
        </p>
      ) : (
        <p>
          Sem expedição registrada nesta declaração. Concordância não comprova
          recebimento nem movimenta os materiais.
        </p>
      )}
      {facts.withdrawal ? (
        <>
          <p>
            {facts.withdrawal.kind === "administrative_close"
              ? "Encerramento administrativo"
              : "Retirada pelo declarante"}
            : {facts.withdrawal.actor.name} ·{" "}
            {formatBrazilDate(facts.withdrawal.recordedAt)}.
          </p>
          <p className="whitespace-pre-wrap">{facts.withdrawal.reason}</p>
        </>
      ) : null}
    </div>
  );
}
export function TransferDetails({
  data,
  onUpdated,
  onEditingChange,
}: {
  data: SupplyDocument;
  onUpdated: (document: SupplyDocument) => void;
  onEditingChange: (editing: boolean) => void;
}) {
  const [selected, setSelected] = useState<{
    action: TransferCommand["action"];
    reference: SupplyDocument;
  } | null>(null);
  const [reason, setReason] = useState(""),
    [reviewing, setReviewing] = useState(false),
    [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false),
    [needsRefresh, setNeedsRefresh] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const pendingRef = useRef<TransferCommand | null>(null),
    headerRef = useRef<HTMLHeadingElement | null>(null),
    decisionHeadingRef = useRef<HTMLHeadingElement | null>(null),
    reasonFieldRef = useRef<HTMLTextAreaElement | null>(null);
  const focusReasonRef = useRef(false);
  const comparison = useScopedRead<{ data: SupplyDocument }>(
    needsRefresh ? "/api/documents/" + data.id : null,
  );
  useEffect(() => {
    onEditingChange(Boolean(selected || uncertain));
    return () => onEditingChange(false);
  }, [selected, uncertain, onEditingChange]);
  useEffect(() => {
    if (reviewing) decisionHeadingRef.current?.focus();
  }, [reviewing]);
  useEffect(() => {
    if (!busy && !reviewing && focusReasonRef.current) {
      focusReasonRef.current = false;
      reasonFieldRef.current?.focus();
    }
  }, [busy, reviewing]);
  const facts = data.transfer;
  const selectedAllowed =
    selected &&
    (selected.action === "dispatch"
      ? selected.reference.transfer?.canDispatch
      : selected.action === "withdraw"
        ? selected.reference.transfer?.canWithdraw
        : selected.reference.transfer?.canAgree);
  if (!facts) return null;
  function start(action: TransferCommand["action"]) {
    setSelected({ action, reference: data });
    setReviewing(false);
    setError("");
    setNeedsRefresh(false);
  }
  async function confirm() {
    if (!selected) return;
    if (!pendingRef.current)
      pendingRef.current =
        selected.action === "dispatch"
          ? {
              action: "dispatch",
              body: {},
              expectedVersion: selected.reference.version,
              idempotencyKey: crypto.randomUUID(),
            }
          : {
              action: selected.action,
              body: { reason: reason.trim() },
              expectedVersion: selected.reference.version,
              idempotencyKey: crypto.randomUUID(),
            };
    setBusy(true);
    setError("");
    try {
      const result = await api<{ data: SupplyDocument }>(
        "/api/documents/" + data.id + "/transfer",
        pendingRef.current,
      );
      onUpdated(result.data);
      setMessage(
        selected.action === "dispatch"
          ? "Expedição confirmada. Os materiais estão em trânsito até o recebimento pessoal."
          : selected.action === "agree"
            ? "Concordância registrada com sua autoria. Ainda não houve expedição nem recebimento."
            : "Decisão registrada sem movimentar materiais.",
      );
      pendingRef.current = null;
      setUncertain(false);
      setNeedsRefresh(false);
      setSelected(null);
      setReason("");
      requestAnimationFrame(() => headerRef.current?.focus());
    } catch (cause) {
      const rejected =
        cause instanceof ApiError &&
        [400, 403, 404, 409, 422].includes(cause.status);
      setUncertain(!rejected);
      if (rejected) {
        pendingRef.current = null;
        setReviewing(false);
        setNeedsRefresh(true);
        focusReasonRef.current = true;
      }
      setError(
        cause instanceof Error
          ? cause.message
          : "Resultado não confirmado. Recupere a mesma decisão.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="ui-card space-y-4"
      aria-label="Declaração e concordância da transferência"
    >
      <h2 ref={headerRef} tabIndex={-1}>
        Atos da transferência física
      </h2>
      <TransferFactsDisplay facts={facts} />
      {facts.originDocumentId ? (
        <RelatedDocument
          id={facts.originDocumentId}
          type="ENT"
          label="Consultar ENT documental de origem"
        />
      ) : (
        <p>Origem documental não informada.</p>
      )}
      <p className="text-sm">
        O vínculo documental preserva a origem conhecida. Não individualiza
        lotes e não transforma concordância em recebimento.
      </p>
      {message ? <Notice>{message}</Notice> : null}
      <div className="hca-toolbar">
        {facts.canAgree ? (
          <>
            <ActionButton variant="primary" onClick={() => start("agree")}>
              {actionLabels.agree}
            </ActionButton>
            <ActionButton onClick={() => start("decline")}>
              {actionLabels.decline}
            </ActionButton>
          </>
        ) : null}
        {facts.canDispatch ? (
          <ActionButton variant="primary" onClick={() => start("dispatch")}>
            {actionLabels.dispatch}
          </ActionButton>
        ) : null}
        {facts.canWithdraw ? (
          <ActionButton onClick={() => start("withdraw")}>
            {actionLabels.withdraw}
          </ActionButton>
        ) : null}
      </div>
      {selected ? (
        <RecordDrawer
          title={
            reviewing
              ? "Revisar ato da transferência"
              : actionLabels[selected.action]
          }
          busy={busy}
          preventClose={uncertain}
          restoreFocusFallbackRef={headerRef}
          onClose={() => setSelected(null)}
        >
          {error ? <Notice error>{error}</Notice> : null}
          {needsRefresh ? (
            <section
              className="space-y-3"
              aria-label="Comparação do ato da transferência"
            >
              <Notice>
                Sua justificativa e a versão original foram preservadas. Compare
                o estado vigente antes de preparar outra confirmação.
              </Notice>
              {comparison.loading ? (
                <LoadingIndicator label="Consultando transferência atual" />
              ) : comparison.error ? (
                <Notice error>
                  {comparison.error}
                  <ActionButton onClick={comparison.refresh}>
                    Tentar consulta atual novamente
                  </ActionButton>
                </Notice>
              ) : comparison.data ? (
                <>
                  <p>
                    Versão original {selected.reference.version}; atual{" "}
                    {comparison.data.data.version}.
                  </p>
                  <TransferFactsDisplay
                    facts={comparison.data.data.transfer!}
                  />
                  <ActionButton
                    onClick={() => {
                      const current = comparison.data!.data;
                      onUpdated(current);
                      setSelected({
                        action: selected.action,
                        reference: current,
                      });
                      setNeedsRefresh(false);
                      setError("");
                    }}
                  >
                    Adotar estado atual e revisar minha decisão
                  </ActionButton>
                </>
              ) : null}
            </section>
          ) : null}
          <div className="space-y-4">
            <h3 ref={decisionHeadingRef} tabIndex={-1}>
              {reviewing
                ? "Conferir ato antes de confirmar"
                : "Sua decisão pessoal"}
            </h3>
            <p>
              Versão documental de referência: {selected.reference.version}.
            </p>
            <TransferFactsDisplay facts={selected.reference.transfer!} />
            {selected.reference.lines.map((line) => (
              <p key={line.id}>
                {line.name_snapshot} · {formatQuantity(line.quantity)}{" "}
                {line.unit_snapshot}
              </p>
            ))}
            {reviewing ? (
              <>
                <p>
                  <strong>{actionLabels[selected.action]}</strong>
                </p>
                {selected.action !== "dispatch" ? (
                  <p className="whitespace-pre-wrap">
                    Sua justificativa: {reason}
                  </p>
                ) : (
                  <Notice>
                    A expedição debita a custódia de origem e coloca o material
                    em trânsito. O destino será creditado somente no recebimento
                    pessoal de{" "}
                    {selected.reference.transfer!.declaration.recipient.name}.
                  </Notice>
                )}
                {uncertain ? (
                  <Notice>
                    O resultado ficou incerto. Mantenha a mesma intenção para
                    recuperar o registro confirmado.
                  </Notice>
                ) : null}
                <div className="hca-toolbar">
                  {!uncertain ? (
                    <ActionButton
                      onClick={() => {
                        setReviewing(false);
                        requestAnimationFrame(() =>
                          reasonFieldRef.current?.focus(),
                        );
                      }}
                    >
                      Voltar à minha decisão
                    </ActionButton>
                  ) : null}
                  <ActionButton variant="primary" onClick={() => void confirm()}>
                    {uncertain
                      ? "Recuperar mesmo ato"
                      : "Confirmar " +
                        (selected.action === "dispatch"
                          ? "expedição"
                          : "decisão")}
                  </ActionButton>
                </div>
              </>
            ) : (
              <form
                className="space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  setReviewing(true);
                }}
              >
                {selected.action !== "dispatch" ? (
                  <FormField label="Sua justificativa para este ato" required>
                    <TextAreaField
                      ref={reasonFieldRef}
                      required
                      minLength={3}
                      maxLength={1000}
                      value={reason}
                      onChange={controlEvent => { const controlValue = controlEvent.currentTarget.value; return setReason(controlValue); }}

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
                    needsRefresh ||
                    !selectedAllowed ||
                    (selected.action !== "dispatch" && reason.trim().length < 3)
                  }
                >
                  Revisar meu ato
                </ActionButton>
              </form>
            )}
          </div>
        </RecordDrawer>
      ) : null}
    </section>
  );
}
