"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@fluentui/react-components";
import { api, ApiError, inputClass, Notice } from "@/components/workspace";
import { RecordDrawer } from "@/components/forms/record-drawer";
import { formatBrazilDate } from "@/lib/receipt";
import { formatQuantity } from "@/lib/quantity";
import type { BalanceReviewContext, SupplyDocument } from "@/types/documents";

const groupLabel = { family: "Família", supervisor: "Supervisão" };
function referenceLabel(context: BalanceReviewContext) {
  if (context.referenceState === "unavailable")
    return "Referência do efeito anterior não preservada. O parecer histórico não reaplica estoque.";
  if (context.referenceState === "historical")
    return "O estoque recebeu movimentos posteriores. O parecer sobre esta contagem não valida o saldo atual nem reaplica ajustes.";
  return context.reconciliationApplied
    ? "Contagem já conciliada. A revisão facultativa não repete a movimentação."
    : "A conciliação depende da política configurada e desta referência de estoque ainda válida.";
}
function CountFacts({ data }: { data: SupplyDocument }) {
  const context = data.balanceReview!;
  return (
    <div className="space-y-3 text-sm">
      <p>
        Contador efetivo:{" "}
        <strong>{context.counter.name ?? "Autoria não disponível"}</strong> ·
        contagem {context.countVersion ?? "não identificada"}
      </p>
      {context.counter.source === "current_profile" ? (
        <p>Nome atual do cadastro; o nome histórico não foi preservado.</p>
      ) : null}
      {context.counter.recordedAt ? (
        <p>
          Registro da contagem: {formatBrazilDate(context.counter.recordedAt)}
        </p>
      ) : null}
      <p>Versão documental: {data.version}</p>
      <div>
        <h4 className="font-semibold">Observações originais de quem contou</h4>
        <p className="whitespace-pre-wrap break-words">
          {context.notes || "Nenhuma observação registrada."}
        </p>
      </div>
      <p>
        {["cancelled", "rejected"].includes(data.status)
          ? "Consulta histórica de balanço encerrado. A revisão não inicia uma nova conciliação."
          : data.status === "submitted" && context.referenceState !== "current"
            ? "A referência desta contagem não permite concluir a conciliação. É necessário um reconto autorizado; a referência original permanece preservada."
            : referenceLabel(context)}
      </p>
      <ul className="space-y-2">
        {data.lines.map((line) => (
          <li key={line.id}>
            {line.name_snapshot}: contado{" "}
            {formatQuantity(line.quantity, line.unit_snapshot)}; referência{" "}
            {formatQuantity(
              line.metadata.expectedQuantity as
                | string
                | number
                | null
                | undefined,
              line.unit_snapshot,
            )}
            .
          </li>
        ))}
      </ul>
    </div>
  );
}
export function BalanceReview({
  data,
  onUpdated,
  onEditingChange,
}: {
  data: SupplyDocument;
  onUpdated: (data: SupplyDocument) => void;
  onEditingChange: (editing: boolean) => void;
}) {
  const [editor, setEditor] = useState<{
    group: "family" | "supervisor";
    reference: SupplyDocument;
    opener: HTMLElement;
  } | null>(null);
  const [comment, setComment] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [comparison, setComparison] = useState<SupplyDocument | null>(null);
  const packetRef = useRef<{
    action: "approve";
    body: {
      group: "family" | "supervisor";
      comment: string;
      reviewReference: string;
    };
    expectedVersion: number;
    idempotencyKey: string;
  } | null>(null);
  const commentRef = useRef<HTMLTextAreaElement>(null);
  const resultRef = useRef<HTMLHeadingElement>(null);
  const queryRef = useRef<HTMLButtonElement>(null);
  const focusAfterRejectionRef = useRef(false),
    focusAfterSuccessRef = useRef(false),
    focusAfterQueryRef = useRef(false);
  useEffect(() => {
    if (!busy && focusAfterQueryRef.current) {
      focusAfterQueryRef.current = false;
      queryRef.current?.focus();
    }
    if (!busy && !reviewing && focusAfterRejectionRef.current) {
      focusAfterRejectionRef.current = false;
      commentRef.current?.focus();
    }
    if (!editor && focusAfterSuccessRef.current) {
      focusAfterSuccessRef.current = false;
      resultRef.current?.focus();
    }
  }, [busy, reviewing, editor]);
  const context = data.balanceReview;
  if (!context)
    return (
      <Notice>
        Referência de revisão indisponível. Consulte novamente o balanço;
        nenhuma aprovação foi presumida.
      </Notice>
    );
  function close() {
    setEditor(null);
    setReviewing(false);
    setComparison(null);
    packetRef.current = null;
    onEditingChange(false);
  }
  function prepare() {
    if (
      !editor ||
      comparison ||
      (editor.reference.status === "submitted" &&
        editor.reference.balanceReview?.referenceState !== "current")
    )
      return;
    if (comment.length > 2000) {
      setError("O parecer permite até 2.000 caracteres.");
      commentRef.current?.focus();
      return;
    }
    packetRef.current = {
      action: "approve",
      body: {
        group: editor.group,
        comment,
        reviewReference: editor.reference.balanceReview!.referenceHash,
      },
      expectedVersion: editor.reference.version,
      idempotencyKey: crypto.randomUUID(),
    };
    setError("");
    setReviewing(true);
  }
  async function consult() {
    setBusy(true);
    setError("");
    try {
      const fresh = await api<{ data: SupplyDocument }>(
        `/api/documents/${data.id}`,
      );
      setComparison(fresh.data);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível consultar a referência atual. Seu parecer e a última consulta foram preservados.",
      );
    } finally {
      focusAfterQueryRef.current = true;
      setBusy(false);
    }
  }
  async function save() {
    if (!packetRef.current) return;
    setBusy(true);
    setError("");
    const recovering = uncertain;
    try {
      const response = await api<{ data: SupplyDocument }>(
        `/api/documents/${data.id}`,
        packetRef.current,
      );
      onUpdated(response.data);
      setMessage(
        "Parecer registrado com autoria própria. As observações da contagem foram preservadas.",
      );
      setUncertain(false);
      focusAfterSuccessRef.current = true;
      close();
    } catch (reason) {
      const rejected =
        reason instanceof ApiError &&
        [400, 403, 404, 409, 422].includes(reason.status);
      setError(
        reason instanceof Error ? reason.message : "Resultado não confirmado.",
      );
      const inaccessibleRecovery =
        recovering &&
        reason instanceof ApiError &&
        [403, 404].includes(reason.status);
      setUncertain(!rejected || inaccessibleRecovery);
      if (rejected && !inaccessibleRecovery) {
        packetRef.current = null;
        setReviewing(false);
        focusAfterRejectionRef.current = true;
      }
      if (reason instanceof ApiError && reason.status === 409) {
        try {
          const fresh = await api<{ data: SupplyDocument }>(
            `/api/documents/${data.id}`,
          );
          setComparison(fresh.data);
        } catch {
          setError(
            "Conflito confirmado. A referência atual está indisponível; seu parecer foi preservado.",
          );
        }
      }
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="ui-card space-y-4"
      aria-labelledby="balance-review-heading"
    >
      <h2 ref={resultRef} tabIndex={-1} id="balance-review-heading">
        Contagem e revisão
      </h2>
      {message ? <Notice>{message}</Notice> : null}
      <CountFacts data={data} />
      <Notice>
        {["cancelled", "rejected"].includes(data.status)
          ? "Balanço encerrado: pareceres e observações permanecem em leitura."
          : context.reviewRequired
            ? "Este balanço usa a revisão configurada para concluir a conciliação. Cada pessoa revisa uma vez, em grupo autorizado e distinto de quem contou."
            : "Revisão facultativa. A contagem válida não entra em uma fila universal de aprovação."}
      </Notice>
      {context.eligibleGroups.length ? (
        <div className="hca-toolbar">
          {context.eligibleGroups.map((group) => (
            <Button
              key={group}
              onClick={(event) => {
                setComment("");
                setError("");
                setComparison(null);
                setEditor({
                  group,
                  reference: data,
                  opener: event.currentTarget,
                });
                onEditingChange(true);
              }}
            >
              {group === "family"
                ? "Revisão da família"
                : "Revisão da supervisão"}
            </Button>
          ))}
        </div>
      ) : (
        <p className="text-sm">
          Não há nova revisão elegível para sua identidade nesta contagem. O
          contador não revisa o próprio ato.
        </p>
      )}
      <section className="space-y-3" aria-label="Pareceres do balanço">
        <h3 className="font-semibold">Pareceres com autoria própria</h3>
        {context.reviews.map((row) => (
          <article
            className="rounded-lg border border-(--line) p-3 text-sm"
            key={row.id}
          >
            <p>
              <strong>{row.reviewer_name}</strong> ·{" "}
              {groupLabel[row.review_group]} ·{" "}
              {formatBrazilDate(row.recorded_at)}
            </p>
            <p>
              Contagem {row.count_version} por{" "}
              {row.reviewed_snapshot.counter.name ?? "Autoria não disponível"} ·
              versão revisada {row.reviewed_document_version}
              {row.count_version !== context.countVersion
                ? " · Histórico de contagem anterior"
                : ""}
            </p>
            <p className="whitespace-pre-wrap break-words">
              {row.comment || "Parecer sem comentário adicional."}
            </p>
            <p>
              {row.reviewed_snapshot.appliedBeforeReview
                ? "Revisão posterior sem reaplicar o estoque."
                : "Revisão da contagem para conciliação, conforme política e referência."}
            </p>
            <details>
              <summary>Contagem e observações revisadas</summary>
              <p className="whitespace-pre-wrap break-words">
                {row.reviewed_snapshot.notes ||
                  "Nenhuma observação registrada."}
              </p>
              <ul>
                {row.reviewed_snapshot.lines.map((line) => (
                  <li key={line.id}>
                    {line.name_snapshot}:{" "}
                    {formatQuantity(line.quantity, line.unit_snapshot)}
                  </li>
                ))}
              </ul>
            </details>
          </article>
        ))}
        {!context.reviews.length ? (
          <p className="text-sm">Nenhum parecer independente registrado.</p>
        ) : null}
        {context.legacyApprovals.length ? (
          <details>
            <summary>Registros legados de revisão</summary>
            {context.legacyApprovals.map((row) => (
              <p
                className="text-sm"
                key={row.count_version + ":" + row.review_group}
              >
                Contagem {row.count_version} · {row.review_group} · nome atual:{" "}
                {row.actorName ?? "Não preservado"} ·{" "}
                {formatBrazilDate(row.created_at)}. Registro preservado;
                elegibilidade histórica não reconstituída.
              </p>
            ))}
          </details>
        ) : null}
      </section>
      {editor ? (
        <RecordDrawer
          title="Revisar contagem do balanço"
          busy={busy}
          preventClose={uncertain}
          onClose={close}
          restoreFocusTo={editor.opener}
        >
          <div className="space-y-4">
            {error ? <Notice error>{error}</Notice> : null}
            <p className="text-sm">
              Grupo autorizado: <strong>{groupLabel[editor.group]}</strong>. O
              parecer é seu; não substitui a contagem.
            </p>
            <CountFacts data={editor.reference} />
            {!reviewing ? (
              <Button
                ref={queryRef}
                disabled={busy || uncertain}
                onClick={() => void consult()}
              >
                {busy
                  ? "Consultando referência…"
                  : "Consultar referência atual"}
              </Button>
            ) : null}
            {comparison?.balanceReview ? (
              <section
                className="space-y-3 rounded-lg border border-(--line) p-3"
                aria-label="Comparação da contagem atual"
              >
                <h3 className="font-semibold">Referência atual</h3>
                <CountFacts data={comparison} />
                <Button
                  className="max-w-full"
                  disabled={
                    busy ||
                    uncertain ||
                    (comparison.status === "submitted" &&
                      comparison.balanceReview.referenceState !== "current") ||
                    !comparison.balanceReview.eligibleGroups.includes(
                      editor.group,
                    )
                  }
                  onClick={() => {
                    setEditor({ ...editor, reference: comparison });
                    onUpdated(comparison);
                    setComparison(null);
                    setError("");
                    packetRef.current = null;
                    focusAfterRejectionRef.current = true;
                    commentRef.current?.focus();
                  }}
                >
                  Adotar referência atual e manter meu parecer
                </Button>
                <p className="text-sm">
                  Adotar não envia a revisão. Confira novamente antes de
                  confirmar.
                </p>
              </section>
            ) : null}
            {reviewing ? (
              <div className="space-y-3">
                <h3 className="font-semibold">Parecer a registrar</h3>
                <p className="whitespace-pre-wrap break-words text-sm">
                  {comment || "Sem comentário adicional."}
                </p>
                <div className="hca-toolbar">
                  <Button
                    disabled={busy || uncertain}
                    onClick={() => {
                      setReviewing(false);
                      packetRef.current = null;
                    }}
                  >
                    Voltar ao parecer
                  </Button>
                  <Button
                    appearance="primary"
                    disabled={busy}
                    onClick={() => void save()}
                  >
                    {busy
                      ? "Registrando…"
                      : uncertain
                        ? "Recuperar revisão"
                        : "Confirmar revisão"}
                  </Button>
                </div>
              </div>
            ) : (
              <form
                className="space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  prepare();
                }}
              >
                <label className="block text-sm font-semibold">
                  Seu parecer sobre a contagem
                  <textarea
                    ref={commentRef}
                    className={inputClass}
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    maxLength={2000}
                    rows={5}
                    disabled={busy || uncertain}
                  />
                  <span className="block text-xs font-normal">
                    {comment.length}/2000. Não altera as observações de quem
                    contou.
                  </span>
                </label>
                <Button
                  type="submit"
                  appearance="primary"
                  disabled={
                    busy ||
                    uncertain ||
                    Boolean(comparison) ||
                    (editor.reference.status === "submitted" &&
                      editor.reference.balanceReview?.referenceState !==
                        "current")
                  }
                >
                  Revisar parecer
                </Button>
              </form>
            )}
          </div>
        </RecordDrawer>
      ) : null}
    </section>
  );
}
