"use client";
import {
  FormField,
  SelectField,
  TextAreaField,
  TextInput,
} from "@/components/ui/controls";
import { SearchSelect } from "@/components/ui/search-select";
import { ActionButton, LoadingIndicator } from "@/components/ui/controls";
import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type RefObject,
} from "react";

import {
  api,
  ApiError,
  can,
  Notice,
  Workspace,
  type WorkspaceContext,
} from "@/components/workspace";
import { useCreationDraft } from "@/components/forms/use-creation-draft";
import {
  CreationDraftPanel,
  DraftContentSummary,
} from "@/components/forms/creation-draft-panel";
import {
  transferDeclarationPurpose,
  emptyTransferDeclarationDraft,
  transferDeclarationValues,
  transferDeclarationDraftContent as declarationContent,
  adoptTransferDeclarationReference,
} from "@/lib/forms/transfer-declaration-draft";
import { navigationForStep } from "@/lib/forms/draft-navigation";
import {
  parseTransferPreparation,
  requireTransferDeclarationConfirmation,
} from "@/lib/validation/transfer-preparation";
import type { TransferDeclarationDraftContent } from "@/lib/validation/supply-drafts";
import { quantity } from "@/lib/quantity";
import { RecordDrawer } from "@/components/forms/record-drawer";
import {
  createTransferSchema,
  type TransferDeclaration,
} from "@/lib/validation/transfers";
import { formatQuantity } from "@/lib/quantity";
import { formatBrazilDate } from "@/lib/receipt";
import type { Custody, SupplyDocument } from "@/types/documents";
import type { TransferPreparation } from "@/types/transfers";
import { materialTransferLabel } from "@/lib/documents/transfer-follow-up";

export const custodyName = (source: Custody) =>
  source === "FAMILY" ? "Família" : "Equipe";
export function TransferConsole() {
  return (
    <Workspace title="Entregas e devoluções de materiais">
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
    [editing, setEditing] = useState(false),
    [consulting, setConsulting] = useState(false);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <section className="ui-card space-y-4">
        <h2 ref={headingRef} tabIndex={-1}>
          Declarar entrega ou devolução de materiais
        </h2>
        <p>
          A entrega segue da família para a equipe. A devolução de materiais
          segue da equipe para a família e pode ser autônoma, sem uma entrega
          de origem vinculada. A contraparte concorda primeiro. A expedição coloca os
          materiais em trânsito; somente o recebimento pessoal credita o
          destino.
        </p>
        <p>
          Consumo, descarte e correção de estoque têm seus próprios registros.
        </p>
        {can(context, "ent.create") ? (
          <>
            <FormField label="Custódia de origem" required>
              <SelectField
                value={source}
                onChange={(controlEvent) => {
                  const controlValue = controlEvent.currentTarget.value;
                  return setSource(controlValue as Custody | "");
                }}
              >
                <option value="">Escolha a origem</option>
                {can(context, "stock.family.read") ? (
                  <option value="FAMILY">Entrega de materiais · Família → Equipe</option>
                ) : null}
                {can(context, "stock.team.read") ? (
                  <option value="CARE_TEAM">Devolução de materiais · Equipe → Família</option>
                ) : null}
              </SelectField>
            </FormField>
            <ActionButton
              variant="primary"
              disabled={!source}
              onClick={() => {
                setConsulting(false);
                setEditing(true);
              }}
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
        <details className="hca-form-stack">
          <summary>Minhas declarações em preparação</summary>
          <p>
            Consulte somente seus preenchimentos e resultados, inclusive após
            perder acesso à origem.
          </p>
          <div className="hca-form-stack">
            {(["FAMILY", "CARE_TEAM"] as const).map((item) => (
              <ActionButton
                key={item}
                onClick={() => {
                  setSource(item);
                  setConsulting(true);
                  setEditing(true);
                }}
              >
                Consultar preenchimento:{" "}
                {item === "FAMILY" ? "Família → Equipe" : "Equipe → Família"}
              </ActionButton>
            ))}
          </div>
        </details>
        <Link className="ui-button ui-button-secondary" href="/entregas">
          Acompanhar entregas e decisões
        </Link>
      </section>
      {editing && source ? (
        <TransferDeclarationEditor
          key={source + ":" + consulting}
          context={context}
          source={source}
          consulting={consulting}
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
  consulting,
  onClose,
  headingRef,
}: {
  context: WorkspaceContext;
  source: Custody;
  consulting: boolean;
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
  const processName = materialTransferLabel(source, source === "FAMILY" ? "CARE_TEAM" : "FAMILY").toLocaleLowerCase("pt-BR");
  const restoredRef = useRef(false);
  const returnFocusRef = useRef(false);
  const [baseline, setBaseline] = useState<TransferDeclarationDraftContent>(
    () => emptyTransferDeclarationDraft(source),
  );
  const [referenceUnavailable, setReferenceUnavailable] = useState(true);
  const write =
    can(context, "ent.create") &&
    can(context, source === "FAMILY" ? "stock.family.read" : "stock.team.read");
  const recoveryOnly = consulting || (!write && !uncertain);
  const purpose = transferDeclarationPurpose(source);
  const privateDraft = useCreationDraft({
    userId: context.userId,
    patientId,
    kind: "ENT",
    purpose,
    targetDocumentId: null,
    navigation: navigationForStep("TRANSFER_DECLARE", 0),
    onResume(saved) {
      if (
        !saved.content ||
        !("fields" in saved.content) ||
        saved.content.documentVersion !== null ||
        saved.content.fields.source !== source
      )
        return false;
      const values = transferDeclarationValues(saved.content);
      setBaseline(saved.content);
      setCounterpartyId(values.counterpartyId);
      setRecipientId(values.recipientId);
      setOriginId(values.originId);
      setReason(values.reason);
      setQuery(values.query);
      setLines(values.lines);
      setPacket(null);
      setResult(null);
      setError("");
      restoredRef.current = true;
      setNeedsRefresh(true);
      setReferenceUnavailable(true);
      setComparison(null);
      return true;
    },
    onDiscard() {
      const empty = emptyTransferDeclarationDraft(source);
      setBaseline(
        reference && !referenceUnavailable
          ? adoptTransferDeclarationReference(empty, reference)
          : empty,
      );
      setCounterpartyId("");
      setRecipientId("");
      setOriginId("");
      setReason("");
      setQuery("");
      setLines([]);
      setPacket(null);
    },
  });
  const privateReloadRef = useRef(privateDraft.reload);
  useEffect(() => {
    privateReloadRef.current = privateDraft.reload;
  }, [privateDraft.reload]);
  useEffect(() => {
    if (!busy && !privateDraft.busy && !packet && returnFocusRef.current) {
      returnFocusRef.current = false;
      reasonFieldRef.current?.focus();
    }
  }, [busy, privateDraft.busy, packet, referenceUnavailable]);
  const currentContent = declarationContent(baseline, reference, {
    counterpartyId,
    recipientId,
    originId,
    reason,
    query,
    lines,
  });
  useEffect(() => {
    if (recoveryOnly) return;
    const controller = new AbortController();
    api<unknown>(
      "/api/transfers/preparation?" +
        new URLSearchParams({ careRecipientId: patientId, source }),
      undefined,
      controller.signal,
    )
      .then((response) => {
        if (controller.signal.aborted) return;
        const current = parseTransferPreparation(response, {
          patientId,
          userId: context.userId,
          source,
        });
        if (!loadedRef.current && !restoredRef.current) {
          setReference(current);
          setBaseline((old) => adoptTransferDeclarationReference(old, current));
          setReferenceUnavailable(false);
        } else setComparison(current);
        loadedRef.current = true;
        setError("");
      })
      .catch((cause) => {
        if (controller.signal.aborted) return;
        setReferenceUnavailable(true);
        setNeedsRefresh(true);
        setComparison(null);
        setError(
          cause instanceof Error
            ? cause.message
            : "Não foi possível consultar a referência.",
        );
        if (cause instanceof ApiError && [401, 403, 404].includes(cause.status))
          privateReloadRef.current();
      })
      .finally(() => {
        if (!controller.signal.aborted) setRefreshing(false);
      });
    return () => controller.abort();
  }, [patientId, source, context.userId, attempt, recoveryOnly]);
  useEffect(() => {
    if (packet || result) reviewHeadingRef.current?.focus();
  }, [packet, result]);
  function close() {
    if (uncertain || privateDraft.pending || busy) return;
    if (
      !result &&
      !recoveryOnly &&
      (reason || lines.length || counterpartyId || recipientId)
    )
      setDiscard(true);
    else onClose();
  }
  async function prepare(event: FormEvent) {
    event.preventDefault();
    if (
      !reference ||
      needsRefresh ||
      referenceUnavailable ||
      privateDraft.blocked ||
      busy ||
      uncertain ||
      recoveryOnly
    )
      return;
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
    if (
      parsed.data.declaration.lines.some(
        (line) =>
          quantity(line.quantity).decimalPlaces() >
          (reference.products.find((product) => product.id === line.productId)
            ?.quantityDecimals ?? 0),
      )
    ) {
      setError(
        "Revise as casas decimais permitidas na unidade de cada material.",
      );
      return;
    }
    setBusy(true);
    setError("");
    try {
      const fresh = parseTransferPreparation(
        await api<unknown>(
          "/api/transfers/preparation?" +
            new URLSearchParams({ careRecipientId: patientId, source }),
        ),
        { patientId, userId: context.userId, source },
      );
      if (
        fresh.referenceHash !== reference.referenceHash ||
        currentContent.fields.referenceHash !== fresh.referenceHash
      ) {
        setBaseline(currentContent);
        setComparison(fresh);
        setNeedsRefresh(true);
        setReferenceUnavailable(true);
        setError(
          "A origem mudou. Seus campos foram preservados; compare e adote a referência atual.",
        );
        returnFocusRef.current = true;
        return;
      }
      const saved = await privateDraft.save(currentContent);
      if (!saved) return;
      setPacket({
        ...parsed.data,
        draftCommit: { id: saved.id, revision: saved.revision },
      });
    } catch (cause) {
      setNeedsRefresh(true);
      setReferenceUnavailable(true);
      setComparison(null);
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível conferir a referência atual.",
      );
      if (cause instanceof ApiError && [401, 403, 404].includes(cause.status))
        privateDraft.reload();
    } finally {
      setBusy(false);
    }
  }
  async function submit() {
    if (!pendingRef.current) pendingRef.current = packet;
    if (!pendingRef.current) return;
    setBusy(true);
    setError("");
    try {
      const response = await api<unknown>("/api/transfers", pendingRef.current);
      setResult(
        requireTransferDeclarationConfirmation(response, {
          patientId,
          userId: context.userId,
          declaration: pendingRef.current.declaration,
        }),
      );
      pendingRef.current = null;
      setPacket(null);
      setUncertain(false);
      privateDraft.reload();
    } catch (cause) {
      const rejected =
        cause instanceof ApiError &&
        [400, 401, 403, 404, 409, 422].includes(cause.status);
      setUncertain(!rejected);
      if (rejected) {
        pendingRef.current = null;
        setPacket(null);
        setNeedsRefresh(true);
        setReferenceUnavailable(true);
        setBaseline(currentContent);
        if (cause.code === "DRAFT_VERSION_CONFLICT")
          void privateDraft.reportConflict();
        else if ([401, 403, 404].includes(cause.status)) privateDraft.reload();
        returnFocusRef.current = true;
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
    (referenceUnavailable && ref === reference
      ? id === counterpartyId
        ? currentContent.fields.counterpartyLabel
        : id === recipientId
          ? currentContent.fields.recipientLabel
          : undefined
      : ref?.people.find((person) => person.id === id)?.name) ??
    "Escolha anterior indisponível";
  const refresh = () => {
    setBaseline(currentContent);
    setNeedsRefresh(true);
    setReferenceUnavailable(true);
    setComparison(null);
    setRefreshing(true);
    setAttempt((value) => value + 1);
  };
  const privatePanel = (
    <CreationDraftPanel
      draft={privateDraft}
      current={currentContent}
      patientName={context.patient?.display_name ?? "Paciente selecionado"}
      disabled={busy || uncertain || !!packet}
      resumeLabel={recoveryOnly ? "Consultar preenchimento salvo" : undefined}
      discardLabel={
        recoveryOnly ? "Descartar preenchimento privado" : undefined
      }
      acknowledgeLabel="Reconhecer declaração registrada"
    />
  );
  const referenceComparison = comparison ? (
    <section
      className="ui-card hca-form-stack"
      aria-label="Comparação da referência da transferência"
    >
      <h3>Referência preservada e atual</h3>
      <p>
        Contraparte:{" "}
        {currentContent.fields.counterpartyLabel || "Não escolhida"} →{" "}
        {comparison.people.find((person) => person.id === counterpartyId)
          ?.name ?? "Escolha indisponível"}
        .
      </p>
      <p>
        Recebedor: {currentContent.fields.recipientLabel || "Não escolhido"} →{" "}
        {comparison.people.find((person) => person.id === recipientId)?.name ??
          "Escolha indisponível"}
        .
      </p>
      <p>
        Origem documental:{" "}
        {currentContent.fields.originLabel || "Sem vínculo informado"} →{" "}
        {originId
          ? (comparison.origins.find((origin) => origin.id === originId)
              ?.code ?? "Vínculo fora da seleção atual ou indisponível")
          : "Sem vínculo informado"}
        .
      </p>
      {currentContent.materials.map((material) => {
        const current = comparison.products.find(
          (product) => product.id === material.id,
        );
        return (
          <p key={material.id}>
            {material.name} → {current?.name ?? "Material indisponível"}:
            quantidade preservada{" "}
            {currentContent.fields[material.id + ":transferQuantity"] ||
              "não informada"}{" "}
            {material.unit}; atual{" "}
            {current ? formatQuantity(current.available) : "indisponível"}{" "}
            {current?.unit ?? ""}.
          </p>
        );
      })}
      <p>
        O vínculo e os valores próprios são preservados. Materiais ou pessoas
        indisponíveis exigem troca ou retirada explícita; a adoção não converte
        unidades.
      </p>
      <ActionButton
        disabled={busy || privateDraft.blocked}
        onClick={() => {
          setBaseline(
            adoptTransferDeclarationReference(currentContent, comparison),
          );
          setReference(comparison);
          setComparison(null);
          setNeedsRefresh(false);
          setReferenceUnavailable(false);
          setError("");
          requestAnimationFrame(() => reasonFieldRef.current?.focus());
        }}
      >
        Adotar referência atual e revisar meus campos
      </ActionButton>
    </section>
  ) : null;
  if (
    (recoveryOnly && !result) ||
    privateDraft.readDenied ||
    privateDraft.protectedReadPending
  )
    return (
      <RecordDrawer
        title="Minha declaração em preparação"
        busy={privateDraft.busy}
        preventClose={!!privateDraft.pending || uncertain}
        onClose={close}
        restoreFocusFallbackRef={headingRef}
        trackChanges={false}
      >
        <Notice>
          Consulta pessoal do preenchimento. Esta tela não registra nem repete
          uma declaração oficial.
        </Notice>
        {privatePanel}
        {privateDraft.base?.state === "active" &&
        !privateDraft.offered &&
        !privateDraft.readDenied &&
        !privateDraft.protectedReadPending ? (
          <DraftContentSummary
            content={privateDraft.base.content}
            kind="ENT"
            purpose={purpose}
          />
        ) : null}
        {!privateDraft.loading &&
        !privateDraft.loadError &&
        !privateDraft.base &&
        !privateDraft.offered &&
        !privateDraft.consumed ? (
          <p>
            Nenhum preenchimento ou resultado privado pendente para este sentido
            neste perfil.
          </p>
        ) : null}
      </RecordDrawer>
    );
  return (
    <RecordDrawer
      title={
        result
          ? "Declaração registrada"
          : packet
            ? `Revisar declaração da ${processName}`
            : `Preparar ${processName}`
      }
      busy={busy || privateDraft.busy}
      preventClose={uncertain || !!privateDraft.pending}
      onClose={close}
      restoreFocusFallbackRef={headingRef}
      trackChanges={false}
    >
      {privatePanel}
      {error ? <Notice error>{error}</Notice> : null}
      {!packet && !result ? (
        <>
          <Notice>
            Salvar preserva somente sua preparação. Registrar a declaração exige
            revisão e confirmação próprias.
          </Notice>
          <ActionButton
            disabled={busy || uncertain || privateDraft.blocked}
            onClick={() => void privateDraft.save(currentContent)}
          >
            Salvar preenchimento privado
          </ActionButton>
        </>
      ) : null}
      {discard ? (
        <Notice>
          Esta declaração ainda não foi registrada. Fechar sem salvar mantém a
          última cópia privada confirmada e descarta as alterações atuais.
          <div className="hca-toolbar">
            <ActionButton onClick={() => setDiscard(false)}>
              Continuar editando
            </ActionButton>
            <ActionButton
              disabled={busy || privateDraft.blocked}
              onClick={async () => {
                const saved = await privateDraft.save(currentContent);
                if (saved) onClose();
              }}
            >
              Salvar e fechar
            </ActionButton>
            <ActionButton
              disabled={busy || !!privateDraft.pending}
              onClick={onClose}
            >
              Fechar sem salvar estas alterações
            </ActionButton>
          </div>
        </Notice>
      ) : null}
      {result ? (
        <div className="space-y-4">
          <h3 ref={reviewHeadingRef} tabIndex={-1}>
            Declaração confirmada
          </h3>
          <p>
            Consulte a ficha atual para acompanhar a decisão da contraparte.
            Este registro não comprova expedição ou recebimento.
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
      ) : (!reference || referenceUnavailable) && !packet ? (
        <div className="hca-form-stack">
          <Notice>
            Seus campos privados foram preservados. Consulte e adote uma
            referência autorizada antes de editar a declaração.
          </Notice>
          <DraftContentSummary
            content={currentContent}
            kind="ENT"
            purpose={purpose}
          />
          {referenceComparison}
          <div
            className="hca-form-stack"
            aria-label="Meus campos preservados da declaração"
          >
            {currentContent.materials.map((material, index) => (
              <fieldset className="ui-card hca-form-stack" key={material.id}>
                <legend>
                  {material.name} · {material.unit} no preenchimento
                </legend>
                <FormField label={"Quantidade de " + material.name} required>
                  <TextInput
                    inputMode="decimal"
                    value={lines[index]?.quantity ?? ""}
                    onChange={(event) => {
                      const value = event.currentTarget.value;
                      setLines((old) =>
                        old.map((line) =>
                          line.productId === material.id
                            ? { ...line, quantity: value }
                            : line,
                        ),
                      );
                    }}
                  />
                </FormField>
                <ActionButton
                  onClick={() =>
                    setLines((old) =>
                      old.filter((line) => line.productId !== material.id),
                    )
                  }
                >
                  Remover {material.name}
                </ActionButton>
              </fieldset>
            ))}
            <FormField label={`Sua justificativa para a ${processName}`} required>
              <TextAreaField
                ref={reasonFieldRef}
                minLength={3}
                maxLength={1000}
                value={reason}
                onChange={(event) => setReason(event.currentTarget.value)}
              />
            </FormField>
            <ActionButton disabled variant="primary">
              Revisar declaração
            </ActionButton>
          </div>
          {refreshing ? (
            <LoadingIndicator label="Consultando pessoas e saldo da origem" />
          ) : null}
          <ActionButton
            disabled={refreshing || busy || privateDraft.blocked}
            onClick={refresh}
          >
            Comparar referência atual
          </ActionButton>
        </div>
      ) : (
        <div className="space-y-4">
          <p>
            <strong>
              {custodyName(source)} → {custodyName(reference!.destination)}
            </strong>{" "}
            ·{" "}
            {referenceUnavailable
              ? "Referência indisponível; recupere a mesma confirmação anterior."
              : "Referência consultada em " +
                formatBrazilDate(reference!.checkedAt) +
                "."}
          </p>
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
              {!reference!.people.length ? (
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
                <FormField label="Contraparte para concordância" required>
                  <SelectField
                    required
                    value={counterpartyId}
                    onChange={(controlEvent) => {
                      const controlValue = controlEvent.currentTarget.value;
                      return setCounterpartyId(controlValue);
                    }}
                  >
                    <option value="">Escolha quem decide a concordância</option>
                    {counterpartyId &&
                    !reference!.people.some((p) => p.id === counterpartyId) ? (
                      <option value={counterpartyId} disabled>
                        {currentContent.fields.counterpartyLabel ||
                          "Escolha anterior indisponível"}{" "}
                        · indisponível
                      </option>
                    ) : null}
                    {reference!.people.map((person) => (
                      <option key={person.id} value={person.id}>
                        {person.name}
                      </option>
                    ))}
                  </SelectField>
                </FormField>
                <FormField label="Recebedor físico designado" required>
                  <SelectField
                    required
                    value={recipientId}
                    onChange={(controlEvent) => {
                      const controlValue = controlEvent.currentTarget.value;
                      return setRecipientId(controlValue);
                    }}
                  >
                    <option value="">Escolha quem recebe pessoalmente</option>
                    {recipientId &&
                    !reference!.people.some((p) => p.id === recipientId) ? (
                      <option value={recipientId} disabled>
                        {currentContent.fields.recipientLabel ||
                          "Escolha anterior indisponível"}{" "}
                        · indisponível
                      </option>
                    ) : null}
                    {reference!.people.map((person) => (
                      <option key={person.id} value={person.id}>
                        {person.name}
                      </option>
                    ))}
                  </SelectField>
                </FormField>
                <FormField label="Adicionar material da origem">
                  <SearchSelect
                    query={query}
                    selectedIds={[]}
                    placeholder="Buscar material"
                    onQueryChange={(queryValue) => setQuery(queryValue)}
                    onSelectionChange={(nextIds) => {
                      if (
                        nextIds[0] &&
                        !lines.some((line) => line.productId === nextIds[0])
                      )
                        setLines((previous) => [
                          ...previous,
                          { productId: nextIds[0]!, quantity: "" },
                        ]);
                      setQuery("");
                    }}
                    options={
                      reference!.products
                        .filter(
                          (product) =>
                            !lines.some(
                              (line) => line.productId === product.id,
                            ) &&
                            `${product.name} ${product.category}`
                              .toLocaleLowerCase("pt-BR")
                              .includes(query.toLocaleLowerCase("pt-BR")),
                        )
                        .map((product) => ({
                          value: product.id,
                          label: product.name,
                          content: (
                            <>
                              {product.name} ·{" "}
                              {product.active ? "Ativo" : "Inativo com saldo"} ·{" "}
                              {formatQuantity(product.available)} {product.unit}
                            </>
                          ),
                        })) ?? []
                    }
                  />
                </FormField>
                {!lines.length ? (
                  <p>
                    Nenhum material selecionado. Informe as quantidades na
                    unidade base.
                  </p>
                ) : (
                  lines.map((line, index) => {
                    const product = reference!.products.find(
                      (p) => p.id === line.productId,
                    );
                    return (
                      <fieldset
                        key={line.productId}
                        className="ui-card space-y-3"
                      >
                        <legend>
                          {product?.name ??
                            currentContent.materials.find(
                              (material) => material.id === line.productId,
                            )?.name ??
                            "Material indisponível"}
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
                        <FormField
                          label={
                            "Quantidade de " +
                            (product?.name ??
                              currentContent.materials.find(
                                (material) => material.id === line.productId,
                              )?.name ??
                              "material indisponível")
                          }
                          required
                        >
                          <TextInput
                            required
                            inputMode="decimal"
                            value={line.quantity}
                            onChange={(controlEvent) => {
                              const controlValue =
                                controlEvent.currentTarget.value;
                              return setLines((previous) =>
                                previous.map((row, i) =>
                                  i === index
                                    ? { ...row, quantity: controlValue }
                                    : row,
                                ),
                              );
                            }}
                          />
                        </FormField>
                        <ActionButton
                          onClick={() =>
                            setLines((previous) =>
                              previous.filter(
                                (row) => row.productId !== line.productId,
                              ),
                            )
                          }
                        >
                          Remover{" "}
                          {product?.name ??
                            currentContent.materials.find(
                              (material) => material.id === line.productId,
                            )?.name ??
                            "material"}
                        </ActionButton>
                      </fieldset>
                    );
                  })
                )}
                <FormField label="ENT documental de origem, quando conhecida">
                  <SelectField
                    value={originId}
                    onChange={(controlEvent) => {
                      const controlValue = controlEvent.currentTarget.value;
                      return setOriginId(controlValue);
                    }}
                  >
                    <option value="">Sem vínculo documental de origem</option>
                    {originId &&
                    !reference!.origins.some(
                      (origin) =>
                        origin.id === originId &&
                        lines.every((line) =>
                          origin.productIds.includes(line.productId),
                        ),
                    ) ? (
                      <option value={originId} disabled>
                        {currentContent.fields.originLabel ||
                          "Vínculo preservado"}{" "}
                        · indisponível para estes materiais
                      </option>
                    ) : null}
                    {reference!.origins
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
                  </SelectField>
                </FormField>
                <p className="text-sm">
                  O vínculo é opcional: uma devolução não exige entrega de origem.
                  {" "}A seleção contém até 100 ENT recentes com aceite na custódia
                  de origem ({reference!.originTotal} no total). O vínculo
                  documenta a origem conhecida; não identifica lotes ou presume
                  disponibilidade dessas unidades.
                </p>
                <FormField
                  label={`Sua justificativa para a ${processName}`}
                  required
                >
                  <TextAreaField
                    ref={reasonFieldRef}
                    required
                    minLength={3}
                    maxLength={1000}
                    value={reason}
                    onChange={(controlEvent) => {
                      const controlValue = controlEvent.currentTarget.value;
                      return setReason(controlValue);
                    }}
                  />
                </FormField>
                <ActionButton
                  type="submit"
                  variant="primary"
                  disabled={
                    needsRefresh ||
                    referenceUnavailable ||
                    privateDraft.blocked ||
                    busy ||
                    !reference!.people.length ||
                    !lines.length
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
                const product = reference!.products.find(
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
                {reference!.origins.find(
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
