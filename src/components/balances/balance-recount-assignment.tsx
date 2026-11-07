"use client";
import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type RefObject,
} from "react";
import {
  Button,
  Combobox,
  Field,
  Option,
  Spinner,
  Textarea,
} from "@fluentui/react-components";
import { api, ApiError, Notice } from "@/components/workspace";
import { RecordDrawer } from "@/components/forms/record-drawer";
import { formatZonedDate } from "@/lib/schedules/time";
import type {
  BalanceRecountContext,
  BalanceRecountResult,
} from "@/types/balances";
import type { BalanceCommand } from "@/lib/validation/balances";
import type { ScheduledShift } from "@/types/schedules";

export function recountHref(patientId: string, documentId: string) {
  return (
    "/balancos?" +
    new URLSearchParams({
      careRecipientId: patientId,
      recountDocumentId: documentId,
    })
  );
}
function targetLabel(target: ScheduledShift) {
  return `${target.professional_name} · ${target.type_name} · ${formatZonedDate(target.starts_at, target.timezone)} → ${formatZonedDate(target.ends_at, target.timezone)}`;
}
function CountFacts({ source }: { source: BalanceRecountContext }) {
  return (
    <div className="space-y-3 text-sm break-words">
      <p>
        <strong>{source.code}</strong> · versão documental{" "}
        {source.documentVersion} · contagem{" "}
        {source.countVersion ?? "não identificada"}
      </p>
      <p>
        Contador efetivo:{" "}
        <strong>{source.counter.name ?? "Autoria não disponível"}</strong>.
      </p>
      {source.counter.source === "current_profile" ? (
        <p>Nome atual do cadastro; o nome histórico não foi preservado.</p>
      ) : null}
      {source.countWindow ? (
        <p>
          Janela da contagem anterior:{" "}
          {formatZonedDate(
            source.countWindow.startsAt,
            source.countWindow.timezone,
          )}{" "}
          →{" "}
          {formatZonedDate(
            source.countWindow.endsAt,
            source.countWindow.timezone,
          )}
          .
        </p>
      ) : null}
      <div>
        <h3 className="font-semibold">Observações originais de quem contou</h3>
        <p className="whitespace-pre-wrap">
          {source.notes || "Nenhuma observação registrada."}
        </p>
      </div>
      {source.activeAssignment ? (
        <p>
          Atribuição atual:{" "}
          {source.activeAssignment.professionalName ??
            "Profissional com nome indisponível"}{" "}
          ·{" "}
          {formatZonedDate(
            source.activeAssignment.starts_at,
            source.activeAssignment.timezone ?? undefined,
          )}{" "}
          →{" "}
          {formatZonedDate(
            source.activeAssignment.ends_at,
            source.activeAssignment.timezone ?? undefined,
          )}
          .
        </p>
      ) : null}
      {!source.canAssign ? (
        <Notice>
          Esta consulta não permite nova designação. Confira a situação atual, a
          atribuição existente e sua permissão de família ou supervisão.
        </Notice>
      ) : null}
    </div>
  );
}
type Packet = {
  careRecipientId: string;
  command: Extract<BalanceCommand, { action: "assign_recount" }>;
  expectedVersion: number;
  idempotencyKey: string;
};
export function BalanceRecountAssignment({
  patientId,
  documentId,
  onClose,
  onCommitted,
  restoreFocusFallbackRef,
}: {
  patientId: string;
  documentId: string;
  onClose: () => void;
  onCommitted: () => void;
  restoreFocusFallbackRef: RefObject<HTMLElement | null>;
}) {
  const [reference, setReference] = useState<BalanceRecountContext | null>(
    null,
  );
  const [comparison, setComparison] = useState<BalanceRecountContext | null>(
    null,
  );
  const [initialAttempt, setInitialAttempt] = useState(0);
  const [reason, setReason] = useState(""),
    [targetId, setTargetId] = useState(""),
    [query, setQuery] = useState("");
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [querying, setQuerying] = useState(false);
  const [reviewing, setReviewing] = useState(false),
    [uncertain, setUncertain] = useState(false),
    [needsRefresh, setNeedsRefresh] = useState(false);
  const [inaccessible, setInaccessible] = useState(false),
    [discard, setDiscard] = useState(false);
  const [result, setResult] = useState<BalanceRecountResult | null>(null);
  const packetRef = useRef<Packet | null>(null),
    reasonRef = useRef<HTMLTextAreaElement>(null),
    queryRef = useRef<HTMLButtonElement>(null),
    resultRef = useRef<HTMLHeadingElement>(null);
  const focusRef = useRef<"reason" | "query" | "result" | null>(null);
  const url = "/api/balances/recount?" + new URLSearchParams({ documentId });
  useEffect(() => {
    const controller = new AbortController();
    api<{ data: BalanceRecountContext }>(url, undefined, controller.signal)
      .then((response) => {
        if (controller.signal.aborted) return;
        if (response.data.patientId !== patientId) {
          setInaccessible(true);
          setError("O balanço não pertence ao paciente selecionado.");
          return;
        }
        setReference(response.data);
        setInaccessible(false);
        setError("");
      })
      .catch((failure) => {
        if (!controller.signal.aborted)
          setError(
            failure instanceof Error
              ? failure.message
              : "Não foi possível consultar o balanço.",
          );
      });
    return () => controller.abort();
  }, [url, patientId, initialAttempt]);
  useEffect(() => {
    if (busy || querying) return;
    const focus = focusRef.current;
    focusRef.current = null;
    if (focus === "reason") reasonRef.current?.focus();
    if (focus === "query") queryRef.current?.focus();
    if (focus === "result") resultRef.current?.focus();
  }, [busy, querying, reviewing, result]);
  const target = reference?.targets?.find((row) => row.id === targetId);
  const comparedTarget = comparison?.targets?.find(
    (row) => row.id === targetId,
  );
  const blocked =
    busy ||
    querying ||
    uncertain ||
    needsRefresh ||
    Boolean(comparison) ||
    inaccessible ||
    !reference?.canAssign;
  async function consult() {
    setQuerying(true);
    setError("");
    setNeedsRefresh(true);
    try {
      const response = await api<{ data: BalanceRecountContext }>(url);
      if (response.data.patientId !== patientId) {
        setInaccessible(true);
        setReference(null);
        setComparison(null);
        setError("O balanço não pertence ao paciente selecionado.");
        return;
      }
      setComparison(response.data);
      setInaccessible(false);
    } catch (failure) {
      if (
        failure instanceof ApiError &&
        [401, 403, 404].includes(failure.status)
      ) {
        setInaccessible(true);
        setReference(null);
        setComparison(null);
      }
      setError(
        failure instanceof Error
          ? failure.message
          : "A consulta falhou. Sua justificativa e escolha foram preservadas.",
      );
    } finally {
      focusRef.current = "query";
      setQuerying(false);
    }
  }
  function prepare(event: FormEvent) {
    event.preventDefault();
    if (
      blocked ||
      !reference ||
      !target ||
      reason.trim().length < 3 ||
      reason.length > 1000
    )
      return;
    packetRef.current = {
      careRecipientId: patientId,
      command: {
        action: "assign_recount",
        body: {
          documentId,
          targetShiftId: target.id,
          targetShiftVersion: target.version,
          referenceHash: reference.referenceHash,
          reason,
        },
      },
      expectedVersion: reference.documentVersion,
      idempotencyKey: crypto.randomUUID(),
    };
    setError("");
    setReviewing(true);
  }
  async function send() {
    if (!packetRef.current) return;
    setBusy(true);
    setError("");
    const recovering = uncertain;
    try {
      const response = await api<{ data: BalanceRecountResult }>(
        "/api/balances",
        packetRef.current,
      );
      packetRef.current = null;
      setUncertain(false);
      setReviewing(false);
      setResult(response.data);
      focusRef.current = "result";
      onCommitted();
    } catch (failure) {
      const rejected =
        failure instanceof ApiError &&
        [400, 401, 403, 404, 409, 422].includes(failure.status);
      const inaccessibleRecovery =
        recovering &&
        failure instanceof ApiError &&
        [401, 403, 404].includes(failure.status);
      setUncertain(!rejected || inaccessibleRecovery);
      setError(
        failure instanceof Error
          ? failure.message
          : "Resultado não confirmado. Recupere a mesma tentativa.",
      );
      if (
        failure instanceof ApiError &&
        [401, 403, 404].includes(failure.status)
      ) {
        setInaccessible(true);
        setReference(null);
        setComparison(null);
      }
      if (rejected && !inaccessibleRecovery) {
        packetRef.current = null;
        setReviewing(false);
        focusRef.current = "reason";
      }
      if (failure instanceof ApiError && failure.status === 409) {
        setNeedsRefresh(true);
        await consult();
        focusRef.current = "reason";
      }
    } finally {
      setBusy(false);
    }
  }
  function adopt() {
    if (!comparison) return;
    const retained = comparison.targets?.find((row) => row.id === targetId);
    setReference(comparison);
    setComparison(null);
    setNeedsRefresh(false);
    setError("");
    setTargetId(retained?.id ?? "");
    setQuery(retained ? targetLabel(retained) : "");
    focusRef.current = "reason";
    reasonRef.current?.focus();
  }
  return (
    <RecordDrawer
      title={
        result
          ? "Reconto designado"
          : reviewing
            ? "Revisar designação do reconto"
            : "Designar reconto"
      }
      busy={busy || querying}
      preventClose={uncertain || reviewing}
      trackChanges={false}
      restoreFocusFallbackRef={restoreFocusFallbackRef}
      onClose={() => {
        if (result || (!reason && !targetId)) onClose();
        else setDiscard(true);
      }}
    >
      {discard ? (
        <Notice>
          Há uma justificativa ou escolha ainda não confirmada.
          <div className="hca-toolbar">
            <Button onClick={() => setDiscard(false)}>
              Continuar editando
            </Button>
            <Button onClick={onClose}>Descartar alterações</Button>
          </div>
        </Notice>
      ) : null}
      {error ? <Notice error>{error}</Notice> : null}
      {uncertain ? (
        <Notice>
          O resultado ainda não foi confirmado. A pessoa, o período e a
          justificativa desta tentativa permanecem congelados.
          <Button disabled={busy} onClick={() => void send()}>
            Recuperar a mesma tentativa
          </Button>
        </Notice>
      ) : null}
      {result ? (
        <section
          aria-label="Resultado da designação"
          className="space-y-4 break-words"
        >
          <h2 ref={resultRef} tabIndex={-1}>
            Designação confirmada
          </h2>
          <p>
            {result.code} · contagem {result.countVersion ?? "não identificada"}{" "}
            por {result.counter.name ?? "Autoria não disponível"}.
          </p>
          <p>
            Reconto designado para <strong>{result.professionalName}</strong> ·{" "}
            {formatZonedDate(result.startsAt, result.timezone)} →{" "}
            {formatZonedDate(result.endsAt, result.timezone)}.
          </p>
          <p>
            Decisão de {result.designerName} em{" "}
            {formatZonedDate(result.recordedAt, result.timezone)}.
          </p>
          <p className="whitespace-pre-wrap">{result.reason}</p>
          <Notice>
            A designação não registra uma contagem física e não movimenta
            estoque. Este comprovante preserva a decisão confirmada; atribuições
            posteriores podem mudar.
          </Notice>
          <div className="hca-toolbar">
            <Button appearance="primary" onClick={onClose}>
              Consultar acompanhamento atual
            </Button>
            <Link href={"/documentos/" + documentId} prefetch={false}>
              Abrir balanço
            </Link>
          </div>
        </section>
      ) : (
        <>
          <div hidden={reviewing} className="space-y-4">
            {!reference ? (
              error || inaccessible ? (
                <Button
                  disabled={busy || querying}
                  onClick={() => {
                    setError("");
                    setInitialAttempt((value) => value + 1);
                  }}
                >
                  Tentar consultar novamente
                </Button>
              ) : (
                <Spinner label="Consultando contagem para reconto" />
              )
            ) : (
              <CountFacts source={reference} />
            )}
            {reference ? (
              <Button
                ref={queryRef}
                disabled={busy || querying || uncertain}
                onClick={() => void consult()}
              >
                Comparar com a situação atual
              </Button>
            ) : null}
            {comparison ? (
              <section
                aria-label="Comparação do reconto"
                className="space-y-3 rounded-lg border border-(--line) p-3"
              >
                <h2>Referência atual consultada</h2>
                <CountFacts source={comparison} />
                {target ? (
                  <p className="break-words">
                    Plantão escolhido na consulta anterior:{" "}
                    {targetLabel(target)}.
                  </p>
                ) : null}
                {targetId ? (
                  <p className="break-words">
                    Mesmo plantão na consulta atual:{" "}
                    {comparedTarget
                      ? targetLabel(comparedTarget)
                      : "Indisponível para esta designação"}
                    .
                  </p>
                ) : null}
                <p>
                  A adoção mantém sua justificativa. A pessoa e o período passam
                  a usar a versão atual do plantão escolhido, se ele continuar
                  disponível; confira-os novamente.
                </p>
                <Button
                  disabled={busy || querying || uncertain}
                  onClick={adopt}
                >
                  Adotar referência atual
                </Button>
              </section>
            ) : null}
            {needsRefresh && !comparison ? (
              <Notice>
                Consulte a situação atual e adote explicitamente a nova
                referência antes de preparar outra confirmação. Sua
                justificativa e escolha foram preservadas.
              </Notice>
            ) : null}
            {reference ? (
              <form onSubmit={prepare} className="hca-form-stack">
                <Field
                  label="Plantão para o reconto"
                  required
                  hint="Escolha uma pessoa e um plantão reais. Não há escolha automática."
                >
                  <Combobox
                    value={query}
                    selectedOptions={targetId ? [targetId] : []}
                    disabled={blocked}
                    onChange={(event) => {
                      setQuery(event.target.value);
                      setTargetId("");
                    }}
                    onOptionSelect={(_, selection) => {
                      const selected = reference.targets?.find(
                        (row) => row.id === selection.optionValue,
                      );
                      setTargetId(selected?.id ?? "");
                      setQuery(selected ? targetLabel(selected) : "");
                    }}
                    placeholder="Buscar profissional ou plantão"
                  >
                    {(reference.targets ?? [])
                      .filter((row) =>
                        targetLabel(row)
                          .toLocaleLowerCase("pt-BR")
                          .includes(query.toLocaleLowerCase("pt-BR")),
                      )
                      .map((row) => (
                        <Option
                          key={row.id}
                          value={row.id}
                          text={targetLabel(row)}
                        >
                          {targetLabel(row)}
                        </Option>
                      ))}
                  </Combobox>
                  {!reference.targets?.length ? (
                    <p>
                      Nenhum plantão elegível disponível. Consulte ou ajuste a
                      escala antes de designar.
                    </p>
                  ) : null}
                </Field>
                {target ? (
                  <p className="text-sm break-words">
                    Pessoa e período selecionados: {targetLabel(target)}.
                  </p>
                ) : null}
                <Field
                  label="Sua justificativa para o reconto"
                  required
                  hint={`${reason.length}/1000 caracteres. As observações de quem contou permanecem preservadas.`}
                >
                  <Textarea
                    ref={reasonRef}
                    value={reason}
                    onChange={(_, value) => setReason(value.value)}
                    minLength={3}
                    maxLength={1000}
                    required
                    disabled={busy || querying || uncertain}
                  />
                </Field>
                <p>
                  O reconto gera uma nova contagem com autoria própria.
                  Pareceres da contagem anterior permanecem históricos e não
                  aprovam automaticamente a nova contagem.
                </p>
                <Button
                  appearance="primary"
                  type="submit"
                  disabled={blocked || !target || reason.trim().length < 3}
                >
                  Revisar designação
                </Button>
              </form>
            ) : null}
          </div>
          {reviewing ? (
            <section
              aria-label="Conferência da designação"
              className="space-y-4"
            >
              {reference && !inaccessible ? (
                <CountFacts source={reference} />
              ) : null}
              {target && !inaccessible ? (
                <p className="break-words">
                  Reconto a ser realizado por{" "}
                  <strong>{target.professional_name}</strong> ·{" "}
                  {formatZonedDate(target.starts_at, target.timezone)} →{" "}
                  {formatZonedDate(target.ends_at, target.timezone)}.
                </p>
              ) : null}
              <div>
                <h3 className="font-semibold">Sua justificativa</h3>
                <p className="whitespace-pre-wrap break-words">{reason}</p>
              </div>
              <p>
                A confirmação designa responsabilidade. A contagem física será
                registrada pessoalmente durante o plantão.
              </p>
              <div className="hca-toolbar">
                <Button
                  disabled={busy || uncertain}
                  onClick={() => {
                    packetRef.current = null;
                    setReviewing(false);
                  }}
                >
                  Voltar
                </Button>
                <Button
                  appearance="primary"
                  disabled={busy}
                  onClick={() => void send()}
                >
                  {uncertain ? "Recuperar confirmação" : "Confirmar designação"}
                </Button>
              </div>
            </section>
          ) : null}
        </>
      )}
    </RecordDrawer>
  );
}
