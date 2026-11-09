"use client";
import { ActionButton } from "@/components/ui/controls";
import { useEffect, useRef, useState } from "react";

import { api, ApiError, inputClass, Notice } from "@/components/workspace";
import { Dialog } from "@/components/ui/primitives";
import { formatBrazilDate } from "@/lib/receipt";
import type { ConsumptionReport } from "@/types/consumption";
import { ConsumptionLines } from "./consumption-lines";

type Decision = {
  action: "confirm";
  id: string;
  accept: boolean;
  reason?: string;
  expectedVersion: number;
  idempotencyKey: string;
};
export function ConsumptionDecision({
  report,
  accept,
  onClose,
  onSaved,
}: {
  report: ConsumptionReport;
  accept: boolean;
  onClose: () => void;
  onSaved: (report: ConsumptionReport) => void;
}) {
  const [reference, setReference] = useState(report),
    [reason, setReason] = useState(""),
    [review, setReview] = useState(accept);
  const [key, setKey] = useState(() => crypto.randomUUID()),
    [busy, setBusy] = useState(false),
    [uncertain, setUncertain] = useState(false),
    [error, setError] = useState("");
  const [conflict, setConflict] = useState(false),
    [current, setCurrent] = useState<ConsumptionReport | null>(null);
  const frozenRef = useRef<Decision | null>(null);
  const reviewHeadingRef = useRef<HTMLHeadingElement>(null),
    reasonRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (review) reviewHeadingRef.current?.focus();
  }, [review, reference.version]);
  async function send() {
    setBusy(true);
    setError("");
    frozenRef.current ??= {
      action: "confirm",
      id: reference.id,
      accept,
      ...(accept ? {} : { reason: reason.trim() }),
      expectedVersion: reference.version,
      idempotencyKey: key,
    };
    try {
      const result = await api<{ data: ConsumptionReport }>(
        "/api/consumption",
        frozenRef.current,
      );
      frozenRef.current = null;
      setUncertain(false);
      onSaved(result.data);
    } catch (cause) {
      const refused =
        cause instanceof ApiError &&
        [400, 401, 403, 404, 409].includes(cause.status);
      if (refused) frozenRef.current = null;
      setUncertain(!refused);
      setConflict(cause instanceof ApiError && cause.status === 409);
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível confirmar a decisão.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function compare() {
    setBusy(true);
    setError("");
    try {
      setCurrent(
        (
          await api<{ data: ConsumptionReport }>(
            "/api/consumption/" + reference.id,
          )
        ).data,
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível consultar o resultado.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open
      title={
        accept
          ? reference.kind === "shortage"
            ? "Revisar confirmação da falta"
            : "Revisar confirmação do consumo"
          : "Revisar rejeição do relato"
      }
      closeDisabled={busy || uncertain}
      onClose={onClose}
    >
      <div className="space-y-4">
        {review ? (
          <h3 tabIndex={-1} ref={reviewHeadingRef} className="font-semibold">
            Resumo da decisão
          </h3>
        ) : null}
        <p>
          Relato de {reference.reported_name ?? "nome não preservado"} ·{" "}
          {formatBrazilDate(reference.created_at)} · versão {reference.version}
        </p>
        <p className="whitespace-pre-wrap wrap-break-word">{reference.body}</p>
        <ConsumptionLines lines={reference.current_lines} />
        {reference.revisions.at(-1) ? (
          <p className="text-sm">
            Último complemento:{" "}
            {reference.revisions.at(-1)!.actor_name ?? "nome não preservado"} ·{" "}
            {reference.revisions.at(-1)!.body}
          </p>
        ) : null}
        {!accept ? (
          review ? (
            <p className="whitespace-pre-wrap">Motivo da rejeição: {reason}</p>
          ) : (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                setReview(true);
                setError("");
              }}
            >
              <label className="block text-sm font-semibold">
                Motivo da rejeição
                <textarea
                  ref={reasonRef}
                  className={inputClass}
                  required
                  minLength={3}
                  maxLength={1000}
                  rows={3}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                />
              </label>
              <p className="hca-field-hint">
                {reason.length}/1000 caracteres. O original permanece íntegro.
              </p>
              <ActionButton type="submit" variant="primary">
                Revisar rejeição
              </ActionButton>
            </form>
          )
        ) : null}
        <Notice>
          {!accept
            ? "Rejeitar preserva o relato e os complementos, sem movimentar o estoque."
            : reference.kind === "shortage"
              ? "Confirmar esta falta registra a conferência da necessidade, sem descontar estoque."
              : `Confirmar desconta somente as quantidades estruturadas acima da custódia ${reference.location === "FAMILY" ? "Família" : "Equipe"}. O débito fica vinculado a esta versão.`}
        </Notice>
        {error ? <Notice error>{error}</Notice> : null}
        {uncertain ? (
          <Notice>
            O resultado ainda não foi confirmado. A decisão, versão e chave
            estão preservadas. Recupere a tentativa antes de editar ou fechar.
          </Notice>
        ) : null}
        {conflict ? (
          <div className="space-y-3">
            <ActionButton disabled={busy} onClick={() => void compare()}>
              Consultar decisão e versão atuais
            </ActionButton>
            {current ? (
              <>
                <p>
                  Versão atual: {current.version} ·{" "}
                  {current.status === "reported"
                    ? "Aguardando conferência"
                    : current.status === "confirmed"
                      ? "Confirmado"
                      : "Rejeitado"}
                </p>
                <ConsumptionLines lines={current.current_lines} />
                {current.status === "reported" ? (
                  <ActionButton
                    onClick={() => {
                      setReference(current);
                      setCurrent(null);
                      setKey(crypto.randomUUID());
                      setConflict(false);
                      setError("");
                      setReview(accept);
                    }}
                  >
                    Revisar versão atual
                  </ActionButton>
                ) : (
                  <>
                    <p>
                      {current.decision?.actor_name ??
                        "Nome do decisor não preservado"}{" "}
                      · {formatBrazilDate(current.confirmed_at)}
                    </p>
                    <p>{current.decision?.reason}</p>
                    <ActionButton onClick={() => onSaved(current)}>
                      Abrir resultado registrado
                    </ActionButton>
                  </>
                )}
              </>
            ) : null}
          </div>
        ) : null}
        <div className="hca-toolbar">
          <ActionButton disabled={busy || uncertain} onClick={onClose}>
            Voltar sem decidir
          </ActionButton>
          {review && !accept ? (
            <ActionButton
              disabled={busy || uncertain}
              onClick={() => {
                setReview(false);
                setKey(crypto.randomUUID());
                requestAnimationFrame(() => reasonRef.current?.focus());
              }}
            >
              Editar motivo
            </ActionButton>
          ) : null}
          {review ? (
            <ActionButton
              variant="primary"
              disabled={
                busy ||
                conflict ||
                (accept &&
                  reference.kind === "consumption" &&
                  !reference.current_lines.length)
              }
              onClick={() => void send()}
            >
              {uncertain
                ? "Recuperar decisão"
                : !accept
                  ? "Confirmar rejeição sem desconto"
                  : reference.kind === "shortage"
                    ? "Confirmar falta sem desconto"
                    : "Confirmar consumo e descontar"}
            </ActionButton>
          ) : null}
        </div>
      </div>
    </Dialog>
  );
}
