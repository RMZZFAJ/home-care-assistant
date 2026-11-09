"use client";
import { ActionButton, LoadingIndicator } from "@/components/ui/controls";
import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type RefObject,
} from "react";
import { Combobox, Field, Input, Option, Select, Textarea } from "@fluentui/react-components";
import {
  api,
  ApiError,
  can,
  Notice,
  Workspace,
  type WorkspaceContext,
} from "@/components/workspace";
import { RecordDrawer } from "@/components/forms/record-drawer";
import {
  createTransferSchema,
  type TransferDeclaration,
} from "@/lib/validation/transfers";
import { formatQuantity } from "@/lib/quantity";
import { formatBrazilDate } from "@/lib/receipt";
import type { Custody, SupplyDocument } from "@/types/documents";
import type { TransferPreparation } from "@/types/transfers";

export const custodyName = (source: Custody) =>
  source === "FAMILY" ? "Família" : "Equipe";
export function TransferConsole() {
  return (
    <Workspace title="Transferência entre custódias">
      {(context) =>
        context.patient && can(context, "ent.read") ? (
          <PatientTransfers key={context.patient.id} context={context} />
        ) : (
          <Notice>Selecione um paciente com acesso às entregas.</Notice>
        )
      }
    </Workspace>
  );
}
function PatientTransfers({ context }: { context: WorkspaceContext }) {
  const [source, setSource] = useState<Custody | "">(""),
    [editing, setEditing] = useState(false);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <section className="ui-card space-y-4">
        <h2 ref={headingRef} tabIndex={-1}>
          Declarar uma transferência física
        </h2>
        <p>
          Use para mover materiais entre família e equipe, inclusive uma
          devolução. A contraparte concorda primeiro. A expedição coloca os
          materiais em trânsito; somente o recebimento pessoal credita o
          destino.
        </p>
        <p>
          Consumo, descarte e correção de estoque têm seus próprios registros.
        </p>
        {can(context, "ent.create") ? (
          <>
            <Field label="Custódia de origem" required>
              <Select
                value={source}
                onChange={(_, data) => setSource(data.value as Custody | "")}
              >
                <option value="">Escolha a origem</option>
                {can(context, "stock.family.read") ? (
                  <option value="FAMILY">Família → Equipe</option>
                ) : null}
                {can(context, "stock.team.read") ? (
                  <option value="CARE_TEAM">Equipe → Família</option>
                ) : null}
              </Select>
            </Field>
            <ActionButton
              variant="primary"
              disabled={!source}
              onClick={() => setEditing(true)}
            >
              Preparar declaração
            </ActionButton>
          </>
        ) : (
          <Notice>
            Seu contexto não permite uma nova declaração. As decisões e os
            recebimentos designados continuam no acompanhamento.
          </Notice>
        )}
        <Link className="ui-button ui-button-secondary" href="/entregas">
          Acompanhar entregas e decisões
        </Link>
      </section>
      {editing && source ? (
        <TransferDeclarationEditor
          context={context}
          source={source}
          onClose={() => setEditing(false)}
          headingRef={headingRef}
        />
      ) : null}
    </div>
  );
}
function TransferDeclarationEditor({
  context,
  source,
  onClose,
  headingRef,
}: {
  context: WorkspaceContext;
  source: Custody;
  onClose: () => void;
  headingRef: RefObject<HTMLHeadingElement | null>;
}) {
  const [reference, setReference] = useState<TransferPreparation | null>(null),
    [comparison, setComparison] = useState<TransferPreparation | null>(null);
  const [attempt, setAttempt] = useState(0),
    [refreshing, setRefreshing] = useState(false),
    [needsRefresh, setNeedsRefresh] = useState(false);
  const [counterpartyId, setCounterpartyId] = useState(""),
    [recipientId, setRecipientId] = useState(""),
    [originId, setOriginId] = useState("");
  const [reason, setReason] = useState(""),
    [query, setQuery] = useState(""),
    [lines, setLines] = useState<{ productId: string; quantity: string }[]>([]);
  const [packet, setPacket] = useState<TransferDeclaration | null>(null),
    [result, setResult] = useState<SupplyDocument | null>(null);
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [uncertain, setUncertain] = useState(false),
    [discard, setDiscard] = useState(false);
  const pendingRef = useRef<TransferDeclaration | null>(null),
    reviewHeadingRef = useRef<HTMLHeadingElement | null>(null),
    reasonFieldRef = useRef<HTMLTextAreaElement | null>(null);
  const loadedRef = useRef(false);
  const patientId = context.patient!.id;
  useEffect(() => {
    const controller = new AbortController();
    api<{ data: TransferPreparation }>(
      "/api/transfers/preparation?" +
        new URLSearchParams({ careRecipientId: patientId, source }),
      undefined,
      controller.signal,
    )
      .then((response) => {
        if (!controller.signal.aborted) {
          if (loadedRef.current) setComparison(response.data);
          else {
            loadedRef.current = true;
            setReference(response.data);
          }
          setError("");
        }
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setError(
            cause instanceof Error
              ? cause.message
              : "Não foi possível consultar a referência.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setRefreshing(false);
      });
    return () => controller.abort();
  }, [patientId, source, attempt]);
  useEffect(() => {
    if (packet || result) reviewHeadingRef.current?.focus();
  }, [packet, result]);
  function close() {
    if (!result && (reason || lines.length || counterpartyId || recipientId))
      setDiscard(true);
    else onClose();
  }
  function prepare(event: FormEvent) {
    event.preventDefault();
    if (!reference || needsRefresh) return;
    if (
      ![counterpartyId, recipientId].every((id) =>
        reference.people.some((person) => person.id === id),
      ) ||
      lines.some(
        (line) =>
          !reference.products.some((product) => product.id === line.productId),
      )
    ) {
      setError("Escolha pessoas e materiais presentes na referência adotada.");
      return;
    }
    if (
      originId &&
      !reference.origins.some(
        (origin) =>
          origin.id === originId &&
          lines.every((line) => origin.productIds.includes(line.productId)),
      )
    ) {
      setError(
        "A ENT de origem não corresponde a todos os materiais. Revise o vínculo conhecido ou escolha sem vínculo.",
      );
      return;
    }
    const parsed = createTransferSchema.safeParse({
      careRecipientId: patientId,
      idempotencyKey: crypto.randomUUID(),
      declaration: {
        source,
        counterpartyId,
        recipientId,
        originDocumentId: originId || null,
        referenceHash: reference.referenceHash,
        reason,
        lines,
      },
    });
    if (!parsed.success) {
      setError(
        "Revise as pessoas, os materiais, as quantidades positivas e a justificativa de 3 a 1.000 caracteres.",
      );
      return;
    }
    setError("");
    setPacket(parsed.data);
  }
  async function submit() {
    if (!pendingRef.current) pendingRef.current = packet;
    if (!pendingRef.current) return;
    setBusy(true);
    setError("");
    try {
      const response = await api<{ data: SupplyDocument }>(
        "/api/transfers",
        pendingRef.current,
      );
      setResult(response.data);
      pendingRef.current = null;
      setUncertain(false);
    } catch (cause) {
      const rejected =
        cause instanceof ApiError &&
        [400, 403, 404, 409, 422].includes(cause.status);
      setUncertain(!rejected);
      if (rejected) {
        pendingRef.current = null;
        setPacket(null);
        setNeedsRefresh(true);
        requestAnimationFrame(() => reasonFieldRef.current?.focus());
      }
      setError(
        cause instanceof Error
          ? cause.message
          : "Resultado não confirmado. Recupere a mesma declaração.",
      );
    } finally {
      setBusy(false);
    }
  }
  const personName = (id: string, ref = reference) =>
    ref?.people.find((person) => person.id === id)?.name ??
    "Escolha anterior indisponível";
  const refresh = () => {
    setComparison(null);
    setRefreshing(true);
    setAttempt((value) => value + 1);
  };
  return (
    <RecordDrawer
      title={
        result
          ? "Declaração registrada"
          : packet
            ? "Revisar declaração da transferência"
            : "Preparar transferência física"
      }
      busy={busy}
      preventClose={uncertain}
      onClose={close}
      restoreFocusFallbackRef={headingRef}
      trackChanges={false}
    >
      {error ? <Notice error>{error}</Notice> : null}
      {discard ? (
        <Notice>
          Há uma declaração ainda não registrada.
          <div className="hca-toolbar">
            <ActionButton onClick={() => setDiscard(false)}>
              Continuar editando
            </ActionButton>
            <ActionButton onClick={onClose}>Descartar declaração</ActionButton>
          </div>
        </Notice>
      ) : null}
      {result ? (
        <div className="space-y-4">
          <h3 ref={reviewHeadingRef} tabIndex={-1}>
            Declaração confirmada
          </h3>
          <p>
            A contraparte precisa decidir. Nenhum material foi expedido por este
            registro.
          </p>
          <p>
            Declarante: {result.transfer?.declaration.actor.name}. Contraparte:{" "}
            {result.transfer?.declaration.counterparty.name}. Recebedor físico:{" "}
            {result.transfer?.declaration.recipient.name}.
          </p>
          <Link
            className="ui-button ui-button-primary"
            href={"/documentos/" + result.id}
          >
            Consultar a transferência registrada
          </Link>
        </div>
      ) : !reference ? (
        <>
          {!error ? (
            <LoadingIndicator label="Consultando pessoas e saldo da origem" />
          ) : (
            <ActionButton
              onClick={() => {
                setError("");
                setRefreshing(true);
                setAttempt((value) => value + 1);
              }}
            >
              Tentar consultar novamente
            </ActionButton>
          )}
        </>
      ) : (
        <div className="space-y-4">
          <p>
            <strong>
              {custodyName(source)} → {custodyName(reference.destination)}
            </strong>{" "}
            · Referência consultada em {formatBrazilDate(reference.checkedAt)}.
          </p>
          {comparison ? (
            <section
              className="ui-card space-y-3"
              aria-label="Comparação da referência da transferência"
            >
              <h3>Referência anterior e atual</h3>
              <p>
                Contraparte: {personName(counterpartyId)} →{" "}
                {personName(counterpartyId, comparison)}.
              </p>
              <p>
                Recebedor: {personName(recipientId)} →{" "}
                {personName(recipientId, comparison)}.
              </p>
              {lines.map((line) => (
                <p key={line.productId}>
                  {
                    reference.products.find((p) => p.id === line.productId)
                      ?.name
                  }
                  : saldo anterior{" "}
                  {reference.products.find((p) => p.id === line.productId)
                    ?.available ?? "indisponível"}
                  ; atual{" "}
                  {comparison.products.find((p) => p.id === line.productId)
                    ?.available ?? "indisponível"}
                  .
                </p>
              ))}
              <ActionButton
                onClick={() => {
                  setReference(comparison);
                  setComparison(null);
                  setNeedsRefresh(false);
                }}
              >
                Adotar referência atual e revisar meus campos
              </ActionButton>
            </section>
          ) : null}
          {needsRefresh ? (
            <Notice>
              Seus campos foram preservados. Consulte, compare e adote a
              referência atual antes de confirmar.
            </Notice>
          ) : null}
          {!packet ? (
            <>
              <ActionButton disabled={refreshing} onClick={refresh}>
                {refreshing
                  ? "Consultando referência…"
                  : "Comparar referência atual"}
              </ActionButton>
              {!reference.people.length ? (
                <Notice>
                  Não há pessoa habilitada na custódia de destino. A declaração
                  exige contraparte e recebedor elegíveis.
                </Notice>
              ) : null}
              <form className="grid gap-4" onSubmit={prepare}>
                <p>
                  Declarante: <strong>{context.fullName}</strong>. Contraparte e
                  recebedor são escolhas separadas. A mesma pessoa pode exercer
                  os dois atos, registrando cada um pessoalmente.
                </p>
                <Field label="Contraparte para concordância" required>
                  <Select
                    required
                    value={counterpartyId}
                    onChange={(_, data) => setCounterpartyId(data.value)}
                  >
                    <option value="">Escolha quem decide a concordância</option>
                    {counterpartyId &&
                    !reference.people.some((p) => p.id === counterpartyId) ? (
                      <option value={counterpartyId} disabled>
                        Escolha anterior indisponível
                      </option>
                    ) : null}
                    {reference.people.map((person) => (
                      <option key={person.id} value={person.id}>
                        {person.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Recebedor físico designado" required>
                  <Select
                    required
                    value={recipientId}
                    onChange={(_, data) => setRecipientId(data.value)}
                  >
                    <option value="">Escolha quem recebe pessoalmente</option>
                    {recipientId &&
                    !reference.people.some((p) => p.id === recipientId) ? (
                      <option value={recipientId} disabled>
                        Escolha anterior indisponível
                      </option>
                    ) : null}
                    {reference.people.map((person) => (
                      <option key={person.id} value={person.id}>
                        {person.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Adicionar material da origem">
                  <Combobox
                    value={query}
                    selectedOptions={[]}
                    placeholder="Buscar material"
                    onChange={(event) => setQuery(event.target.value)}
                    onOptionSelect={(_, data) => {
                      if (
                        data.optionValue &&
                        !lines.some(
                          (line) => line.productId === data.optionValue,
                        )
                      )
                        setLines((previous) => [
                          ...previous,
                          { productId: data.optionValue!, quantity: "" },
                        ]);
                      setQuery("");
                    }}
                  >
                    {reference.products
                      .filter(
                        (product) =>
                          !lines.some(
                            (line) => line.productId === product.id,
                          ) &&
                          `${product.name} ${product.category}`
                            .toLocaleLowerCase("pt-BR")
                            .includes(query.toLocaleLowerCase("pt-BR")),
                      )
                      .map((product) => (
                        <Option
                          key={product.id}
                          value={product.id}
                          text={product.name}
                        >
                          {product.name} ·{" "}
                          {product.active ? "Ativo" : "Inativo com saldo"} ·{" "}
                          {formatQuantity(product.available)} {product.unit}
                        </Option>
                      ))}
                  </Combobox>
                </Field>
                {!lines.length ? (
                  <p>
                    Nenhum material selecionado. Informe as quantidades na
                    unidade base.
                  </p>
                ) : (
                  lines.map((line, index) => {
                    const product = reference.products.find(
                      (p) => p.id === line.productId,
                    );
                    return (
                      <fieldset
                        key={line.productId}
                        className="ui-card space-y-3"
                      >
                        <legend>
                          {product?.name ?? "Material indisponível"}
                        </legend>
                        <p>
                          {product?.active === false
                            ? "Inativo com saldo preservado. "
                            : ""}
                          Disponível na origem:{" "}
                          {product
                            ? `${formatQuantity(product.available)} ${product.unit}`
                            : "indisponível"}
                          .
                        </p>
                        <Field
                          label={`Quantidade de ${product?.name ?? "material indisponível"}`}
                          required
                        >
                          <Input
                            required
                            inputMode="decimal"
                            value={line.quantity}
                            onChange={(_, data) =>
                              setLines((previous) =>
                                previous.map((row, i) =>
                                  i === index
                                    ? { ...row, quantity: data.value }
                                    : row,
                                ),
                              )
                            }
                          />
                        </Field>
                        <ActionButton
                          onClick={() =>
                            setLines((previous) =>
                              previous.filter(
                                (row) => row.productId !== line.productId,
                              ),
                            )
                          }
                        >
                          Remover {product?.name ?? "material"}
                        </ActionButton>
                      </fieldset>
                    );
                  })
                )}
                <Field label="ENT documental de origem, quando conhecida">
                  <Select
                    value={originId}
                    onChange={(_, data) => setOriginId(data.value)}
                  >
                    <option value="">Sem vínculo documental de origem</option>
                    {reference.origins
                      .filter(
                        (origin) =>
                          lines.length &&
                          lines.every((line) =>
                            origin.productIds.includes(line.productId),
                          ),
                      )
                      .map((origin) => (
                        <option key={origin.id} value={origin.id}>
                          {origin.code} · {formatBrazilDate(origin.createdAt)}
                        </option>
                      ))}
                  </Select>
                </Field>
                <p className="text-sm">
                  A seleção contém até 100 ENT recentes com aceite na custódia
                  de origem ({reference.originTotal} no total). O vínculo
                  documenta a origem conhecida; não identifica lotes ou presume
                  disponibilidade dessas unidades.
                </p>
                <Field label="Sua justificativa para a transferência" required>
                  <Textarea
                    ref={reasonFieldRef}
                    required
                    minLength={3}
                    maxLength={1000}
                    value={reason}
                    onChange={(_, data) => setReason(data.value)}
                    resize="vertical"
                  />
                </Field>
                <ActionButton
                  type="submit"
                  variant="primary"
                  disabled={
                    needsRefresh || !reference.people.length || !lines.length
                  }
                >
                  Revisar declaração
                </ActionButton>
              </form>
            </>
          ) : (
            <section className="space-y-4">
              <h3 ref={reviewHeadingRef} tabIndex={-1}>
                Conferir declaração antes de registrar
              </h3>
              <p>Declarante: {context.fullName}.</p>
              <p>
                Contraparte:{" "}
                <strong>{personName(packet.declaration.counterpartyId)}</strong>
                .
              </p>
              <p>
                Recebedor físico:{" "}
                <strong>{personName(packet.declaration.recipientId)}</strong>.
              </p>
              {packet.declaration.lines.map((line) => {
                const product = reference.products.find(
                  (p) => p.id === line.productId,
                );
                return (
                  <p key={line.productId}>
                    {product?.name} · {formatQuantity(line.quantity)}{" "}
                    {product?.unit}
                    {product?.active === false ? " · inativo com saldo" : ""}
                  </p>
                );
              })}
              <p>
                Origem documental:{" "}
                {reference.origins.find(
                  (origin) => origin.id === packet.declaration.originDocumentId,
                )?.code ?? "Sem vínculo informado"}
                .
              </p>
              <p className="whitespace-pre-wrap">
                Sua justificativa: {packet.declaration.reason}
              </p>
              <Notice>
                A declaração aguarda a concordância própria da contraparte.
                Concordância não confirma expedição nem recebimento. Somente a
                expedição posterior debita a origem e cria trânsito.
              </Notice>
              {uncertain ? (
                <Notice>
                  O resultado não foi confirmado. Recupere esta mesma declaração
                  antes de editar ou iniciar outra.
                </Notice>
              ) : null}
              <div className="hca-toolbar">
                {!uncertain ? (
                  <ActionButton
                    onClick={() => {
                      setPacket(null);
                      requestAnimationFrame(() =>
                        reasonFieldRef.current?.focus(),
                      );
                    }}
                  >
                    Voltar aos meus campos
                  </ActionButton>
                ) : null}
                <ActionButton variant="primary" onClick={() => void submit()}>
                  {uncertain
                    ? "Recuperar mesma declaração"
                    : "Registrar declaração sem expedir"}
                </ActionButton>
              </div>
            </section>
          )}
        </div>
      )}
    </RecordDrawer>
  );
}
