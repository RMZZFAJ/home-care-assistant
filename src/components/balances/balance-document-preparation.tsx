"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import Link from "next/link";
import { z } from "zod";
import {
  api,
  ApiError,
  can,
  Notice,
  type WorkspaceContext,
} from "@/components/workspace";
import {
  ActionButton,
  DefinitionGrid,
  FormField,
  TextAreaField,
} from "@/components/ui/controls";
import { SearchSelect } from "@/components/ui/search-select";
import { RecordDrawer } from "@/components/forms/record-drawer";
import {
  CreationDraftPanel,
  DraftContentSummary,
} from "@/components/forms/creation-draft-panel";
import { useCreationDraft } from "@/components/forms/use-creation-draft";
import { draftFlow, navigationForStep } from "@/lib/forms/draft-navigation";
import {
  adoptBalanceDocumentDraft,
  balanceDocumentAvailable,
  balanceDocumentPacket,
  balanceTargetLabel,
  emptyBalanceDocumentDraft,
  parseBalanceDocumentConfirmation,
  parseBalancePreparation,
} from "@/lib/forms/balance-document-draft";
import type {
  BalanceDocumentDecision,
  BalancePreparation,
} from "@/lib/validation/balance-document-decisions";
import type {
  BalanceDocumentPurpose,
  ReceiptDraftContent,
} from "@/lib/validation/supply-drafts";
import { formatZonedDate } from "@/lib/schedules/time";
import { BalanceMaterials } from "./balance-materials";
import { BalanceReviewItemFields, BalanceReviewPreparedFacts } from "./balance-review-items";
import { balanceReviewItemFields, balanceReviewItemsFromFields } from "@/lib/validation/balance-review-items";

export function BalancePreparationFacts({
  source,
}: {
  source: BalancePreparation;
}) {
  const facts = source.review ?? source.recount!;
  return (
    <section className="hca-form-stack" aria-label="Contagem física consultada">
      <DefinitionGrid items={[
        { label: "Ficha", value: source.code ?? "BAL" },
        { label: "Versão documental", value: source.documentVersion },
        { label: "Contagem", value: facts.countVersion ?? "não identificada" },
        { label: "Contador efetivo", value: facts.counter.name ?? "Autoria não disponível" },
        { label: "Registro da contagem", value: facts.counter.recordedAt ? formatZonedDate(facts.counter.recordedAt) : "Instante não preservado" },
      ]} />
      {facts.counter.source === "current_profile" ? (
        <p>Nome atual do cadastro; o nome histórico não foi preservado.</p>
      ) : null}
      <div>
        <h3>Observações originais de quem contou</h3>
        <p className="whitespace-pre-wrap wrap-anywhere">
          {facts.notes || "Nenhuma observação registrada."}
        </p>
      </div>
      {source.review ? (
        <>
          <p>
            {["cancelled", "rejected"].includes(source.status)
              ? "Consulta histórica de balanço encerrado. A revisão não inicia uma nova conciliação."
              : source.review.referenceState === "unavailable"
                  ? "Referência do efeito anterior não preservada. O parecer histórico não reaplica estoque."
                  : source.review.referenceState === "historical"
                    ? "O estoque recebeu movimentos posteriores. O parecer sobre esta contagem não valida o saldo atual nem reaplica ajustes."
                    : source.review.reconciliationApplied
                      ? "Contagem já conciliada. A revisão facultativa não repete a movimentação."
                      : "O parecer não aplica a contagem ao estoque. A aplicação é um ato separado, após as revisões previstas e com referência válida."}
          </p>
          <BalanceMaterials rows={source.lines.map(row => ({ id: row.id, name: row.name, unit: row.unit, counted: row.quantity, reference: row.expectedQuantity }))} />
        </>
      ) : null}
      {source.recount?.countWindow ? (
        <p>
          Janela da contagem:{" "}
          {formatZonedDate(
            source.recount.countWindow.startsAt,
            source.recount.countWindow.timezone,
          )}{" "}
          →{" "}
          {formatZonedDate(
            source.recount.countWindow.endsAt,
            source.recount.countWindow.timezone,
          )}{" "}
          · {source.recount.countWindow.professionalName}.
        </p>
      ) : null}
      {source.recount?.activeAssignment ? (
        <p>
          Atribuição atual:{" "}
          {source.recount.activeAssignment.professionalName ??
            "Profissional com nome indisponível"}{" "}
          ·{" "}
          {formatZonedDate(
            source.recount.activeAssignment.starts_at,
            source.recount.activeAssignment.timezone ?? undefined,
          )}{" "}
          →{" "}
          {formatZonedDate(
            source.recount.activeAssignment.ends_at,
            source.recount.activeAssignment.timezone ?? undefined,
          )}
          .
        </p>
      ) : null}
      {source.recount && !source.recount.canAssign ? (
        <Notice>
          Esta consulta não permite nova designação. Confira a situação atual, a
          atribuição existente e sua permissão de família ou supervisão.
        </Notice>
      ) : null}
    </section>
  );
}

export function BalanceDocumentPreparation({
  context,
  patientId,
  documentId,
  purpose,
  consulting = false,
  onClose,
  onCommitted,
  restoreFocusTo,
  restoreFocusFallbackRef,
}: {
  context: WorkspaceContext;
  patientId: string;
  documentId: string;
  purpose: BalanceDocumentPurpose;
  consulting?: boolean;
  onClose: () => void;
  onCommitted: () => void;
  restoreFocusTo?: HTMLElement | null;
  restoreFocusFallbackRef?: RefObject<HTMLElement | null>;
}) {
  const [baseline, setBaseline] = useState<ReceiptDraftContent | null>(null),
    [fields, setFields] = useState<Record<string, string>>({});
  const [source, setSource] = useState<BalancePreparation | null>(null),
    [comparison, setComparison] = useState<BalancePreparation | null>(null);
  const [needsReference, setNeedsReference] = useState(true),
    [unavailable, setUnavailable] = useState(true),
    [busy, setBusy] = useState(false),
    [reviewing, setReviewing] = useState(false),
    [uncertain, setUncertain] = useState(false),
    [dirty, setDirty] = useState(false);
  const [error, setError] = useState(""),
    [fieldError, setFieldError] = useState("");
  const [confirmed, setConfirmed] = useState<ReturnType<
    typeof parseBalanceDocumentConfirmation
  > | null>(null);
  const restoredRef = useRef(false),
    packetRef = useRef<BalanceDocumentDecision | null>(null),
    returnFocusRef = useRef(false),
    initialFocusRef = useRef(false),
    focusQueryRef = useRef(false);
  const textRef = useRef<HTMLTextAreaElement>(null),
    itemsRef = useRef<HTMLFieldSetElement>(null),
    resultRef = useRef<HTMLHeadingElement>(null),
    reviewRef = useRef<HTMLHeadingElement>(null),
    readRecoveryRef = useRef<HTMLButtonElement>(null),
    recoveryRef = useRef<HTMLButtonElement>(null),
    queryRef = useRef<HTMLButtonElement>(null);
  const scopeMatches = context.patient?.id === patientId;
  const roleAllows =
    purpose === "assign_recount"
      ? can(context, "bal.approve.family") ||
        can(context, "bal.approve.supervisor")
      : can(
          context,
          purpose === "review_family"
            ? "bal.approve.family"
            : "bal.approve.supervisor",
        );
  const privateDraft = useCreationDraft({
    userId: context.userId,
    patientId,
    kind: "BAL",
    purpose,
    targetDocumentId: documentId,
    enabled: scopeMatches,
    navigation: navigationForStep(draftFlow("BAL", purpose)!, 0),
    onResume(saved) {
      if (
        !saved.content ||
        !("fields" in saved.content) ||
        saved.content.documentVersion === null
      )
        return false;
      setBaseline(saved.content);
      setFields(saved.content.fields);
      restoredRef.current = true;
      setNeedsReference(true);
      setUnavailable(true);
      setComparison(null);
      setReviewing(false);
      setDirty(false);
      setError("");
      return true;
    },
    onDiscard() {
      const next = source ? emptyBalanceDocumentDraft(source, purpose) : null;
      setBaseline(next);
      setFields(next?.fields ?? {});
      setNeedsReference(!next);
      setDirty(false);
      setError("");
    },
  });
  const readReference = useCallback(
    async (signal?: AbortSignal, minimumVersion?: number) =>
      parseBalancePreparation(
        await api<unknown>(
          "/api/balances/document-preparation?" +
            new URLSearchParams({
              careRecipientId: patientId,
              documentId,
              purpose,
            }),
          undefined,
          signal,
        ),
        { patientId, documentId, purpose, minimumVersion },
      ),
    [patientId, documentId, purpose],
  );
  useEffect(() => {
    if (consulting || !scopeMatches) return;
    const controller = new AbortController();
    void readReference(controller.signal)
      .then((current) => {
        if (controller.signal.aborted) return;
        setSource(current);
        if (!restoredRef.current) {
          const content = emptyBalanceDocumentDraft(current, purpose);
          setBaseline(content);
          setFields((previous) => ({ ...content.fields, ...previous }));
          setNeedsReference(false);
          setUnavailable(false);
        }
      })
      .catch((cause) => {
        if (!controller.signal.aborted) {
          setUnavailable(true);
          setError(
            cause instanceof Error
              ? cause.message
              : "Não foi possível consultar a contagem.",
          );
        }
      });
    return () => controller.abort();
  }, [consulting, scopeMatches, purpose, readReference]);
  useEffect(() => {
    if (reviewing) reviewRef.current?.focus();
  }, [reviewing]);
  useEffect(() => {
    if (
      confirmed?.recount &&
      !privateDraft.busy &&
      !privateDraft.readDenied &&
      !privateDraft.protectedReadPending
    )
      resultRef.current?.focus();
  }, [
    confirmed,
    privateDraft.busy,
    privateDraft.readDenied,
    privateDraft.protectedReadPending,
  ]);
  useEffect(() => {
    if (uncertain && !busy) recoveryRef.current?.focus();
  }, [uncertain, busy]);
  useEffect(() => {
    if (!busy && !privateDraft.busy && focusQueryRef.current) {
      focusQueryRef.current = false;
      queryRef.current?.focus();
    }
    if (!busy && !privateDraft.busy && !reviewing && returnFocusRef.current) {
      returnFocusRef.current = false;
      (textRef.current ?? readRecoveryRef.current ?? queryRef.current)?.focus();
    }
  }, [busy, privateDraft.busy, reviewing]);
  const canSeePrivate =
    scopeMatches &&
    !privateDraft.readDenied &&
    !privateDraft.protectedReadPending;
  const readOnly =
    !reviewing &&
    (consulting ||
      !scopeMatches ||
      !roleAllows ||
      !canSeePrivate ||
      !!privateDraft.consumed);
  useEffect(() => {
    if (
      !initialFocusRef.current &&
      baseline &&
      !readOnly &&
      !privateDraft.blocked
    ) {
      initialFocusRef.current = true;
      textRef.current?.focus();
    }
  }, [baseline, readOnly, privateDraft.blocked]);
  const content = baseline ? { ...baseline, fields } : null;
  const savedContent = privateDraft.base?.content;
  const matchesSaved = !!(
    privateDraft.base?.state === "active" &&
    content &&
    savedContent &&
    "fields" in savedContent &&
    savedContent.documentVersion === content.documentVersion &&
    Object.keys(savedContent.fields).length === Object.keys(fields).length &&
    Object.keys(fields).every((key) => savedContent.fields[key] === fields[key])
  );
  const allowed =
    !readOnly &&
    !needsReference &&
    !unavailable &&
    !!source &&
    balanceDocumentAvailable(source, purpose) &&
    !privateDraft.blocked;
  const target = !unavailable
    ? source?.recount?.targets.find((row) => row.id === fields.targetShiftId)
    : null;
  function setField(name: string, value: string) {
    setFields((previous) => ({ ...previous, [name]: value }));
    setDirty(true);
    setFieldError("");
  }
  async function compare() {
    if (busy || uncertain) return;
    setBusy(true);
    setNeedsReference(true);
    setUnavailable(true);
    setComparison(null);
    setError("");
    try {
      setComparison(await readReference(undefined, baseline?.documentVersion));
      focusQueryRef.current = true;
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Não foi possível comparar.",
      );
      returnFocusRef.current = true;
      if (cause instanceof ApiError && [401, 403, 404].includes(cause.status))
        await privateDraft.revalidateRead();
    } finally {
      setBusy(false);
    }
  }
  async function savePrivate() {
    if (
      content &&
      !busy &&
      !uncertain &&
      !reviewing &&
      (await privateDraft.save(content))
    ) {
      setDirty(false);
      returnFocusRef.current = true;
    }
  }
  async function prepare() {
    if (!content || !allowed || busy || uncertain) return;
    try {
      if (purpose !== "assign_recount" && source && balanceReviewItemsFromFields(fields).some(item => !source.lines.some(line => line.id === item.lineId)))
        throw new Error("Há um material de outra referência neste parecer. Remova a referência anterior explicitamente.");
      if (purpose !== "assign_recount" && source) for (const [key, raw] of Object.entries(fields).filter(([key]) => key.startsWith("item:"))) {
        const item = balanceReviewItemFields.parse(JSON.parse(raw)), line = source.lines.find(row => row.id === key.slice(5));
        if (!line || (item.materialName !== undefined && item.materialName !== line.name) || (item.unit !== undefined && item.unit !== line.unit))
          throw new Error("O material da referência mudou. Confira e escolha novamente seu resultado antes de confirmar.");
      }
      balanceDocumentPacket(
        {
          patientId,
          documentId,
          purpose,
          draftCommit: { id: crypto.randomUUID(), revision: 1 },
          key: crypto.randomUUID(),
        },
        content,
      );
    } catch (cause) {
      setFieldError(
        cause instanceof z.ZodError
          ? (cause.issues[0]?.message ?? "Confira seu preenchimento.")
          : cause instanceof Error ? cause.message : "Confira seu preenchimento.",
      );
      const invalidItem = itemsRef.current?.querySelector<HTMLElement>('[aria-invalid="true"],button');
      if (invalidItem) invalidItem.focus(); else textRef.current?.focus();
      return;
    }
    setBusy(true);
    setError("");
    try {
      const current = await readReference(undefined, content.documentVersion),
        live = purpose === "assign_recount" ? current.recount : current.review;
      if (
        !balanceDocumentAvailable(current, purpose) ||
        current.documentVersion !== content.documentVersion ||
        live?.referenceHash !== content.fields.referenceHash ||
        (purpose === "assign_recount" &&
          !current.recount?.targets.some(
            (row) =>
              row.id === fields.targetShiftId &&
              String(row.version) === fields.targetShiftVersion,
          ))
      ) {
        setComparison(current);
        returnFocusRef.current = true;
        setNeedsReference(true);
        setUnavailable(true);
        setError(
          "A referência ou o plantão mudou. Compare e adote explicitamente antes de confirmar.",
        );
        return;
      }
      const saved = await privateDraft.save(content);
      if (!saved) {
        returnFocusRef.current = true;
        return;
      }
      packetRef.current = balanceDocumentPacket(
        {
          patientId,
          documentId,
          purpose,
          draftCommit: { id: saved.id, revision: saved.revision },
          key: crypto.randomUUID(),
        },
        content,
      );
      setDirty(false);
      setReviewing(true);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível preparar a revisão.",
      );
      setNeedsReference(true);
      setUnavailable(true);
      returnFocusRef.current = true;
      if (cause instanceof ApiError && [401, 403, 404].includes(cause.status))
        await privateDraft.revalidateRead();
    } finally {
      setBusy(false);
    }
  }
  async function send() {
    const packet = packetRef.current;
    if (!packet || busy) return;
    const recovering = uncertain;
    setBusy(true);
    setError("");
    try {
      const result = parseBalanceDocumentConfirmation(
        await api<unknown>("/api/balances/document-preparation", packet),
        packet,
        context.userId,
      );
      setConfirmed(result);
      packetRef.current = null;
      setUncertain(false);
      setReviewing(false);
      setDirty(false);
      privateDraft.reload();
      onCommitted();
    } catch (cause) {
      const rejected =
        cause instanceof ApiError &&
        [400, 401, 403, 404, 409, 422].includes(cause.status);
      setError(
        cause instanceof Error
          ? cause.message
          : "Resultado não confirmado. Preserve a tentativa.",
      );
      setUncertain(!rejected || recovering);
      if (rejected && !recovering) {
        packetRef.current = null;
        setReviewing(false);
        setNeedsReference(true);
        setUnavailable(true);
        returnFocusRef.current = true;
        if (cause.code === "DRAFT_VERSION_CONFLICT")
          await privateDraft.reportConflict();
      }
      if (cause instanceof ApiError && [401, 403, 404].includes(cause.status))
        await privateDraft.revalidateRead();
    } finally {
      setBusy(false);
    }
  }
  return (
    <RecordDrawer
      title={
        purpose !== "assign_recount"
          ? "Revisar contagem do balanço"
          : confirmed
            ? "Reconto designado"
            : reviewing
              ? "Revisar designação do reconto"
              : "Designar reconto"
      }
      onClose={onClose}
      busy={busy || privateDraft.busy}
      preventClose={uncertain || !!privateDraft.pending}
      hasUnsavedChanges={dirty && !matchesSaved}
      restoreFocusTo={restoreFocusTo}
      restoreFocusFallbackRef={restoreFocusFallbackRef}
    >
      <div className="hca-form-stack">
        <CreationDraftPanel
          draft={privateDraft}
          current={content}
          patientName={context.patient?.display_name ?? "Paciente selecionado"}
          disabled={busy || uncertain || reviewing}
          resumeLabel={readOnly ? "Consultar preenchimento salvo" : undefined}
          acknowledgeLabel="Reconhecer resultado aplicado"
          onRevalidateRead={() => {
            returnFocusRef.current = true;
            void privateDraft.revalidateRead();
          }}
          revalidationRef={readRecoveryRef}
        />
        {error ? <Notice error>{error}</Notice> : null}
        {uncertain ? (
          <ActionButton
            ref={recoveryRef}
            variant="primary"
            disabled={busy}
            onClick={() => void send()}
          >
            {purpose === "assign_recount"
              ? "Recuperar a mesma tentativa"
              : "Recuperar revisão"}
          </ActionButton>
        ) : null}
        {confirmed?.recount && canSeePrivate ? (
          <section
            className="hca-form-stack"
            aria-label="Resultado da designação"
          >
            <h3 ref={resultRef} tabIndex={-1}>
              Designação confirmada
            </h3>
            <p>
              {confirmed.recount.code ?? "BAL sem código preservado"} · contagem{" "}
              {confirmed.recount.countVersion ?? "não identificada"} por{" "}
              {confirmed.recount.counter.name ?? "Autoria não disponível"}.
            </p>
            <p>
              Resultado congelado da confirmação; consulte a atribuição atual
              antes de contar.
            </p>
            <p>
              Reconto designado para{" "}
              <strong>{confirmed.recount.professionalName}</strong> ·{" "}
              {formatZonedDate(
                confirmed.recount.startsAt,
                confirmed.recount.timezone,
              )}{" "}
              →{" "}
              {formatZonedDate(
                confirmed.recount.endsAt,
                confirmed.recount.timezone,
              )}
              .
            </p>
            <p>Justificativa: {confirmed.recount.reason}</p>
            <p>
              Designado por {confirmed.recount.designerName} em{" "}
              {formatZonedDate(
                confirmed.recount.recordedAt,
                confirmed.recount.timezone,
              )}
              .
            </p>
            <Link href={"/documentos/" + documentId} prefetch={false}>
              Abrir balanço
            </Link>
            <ActionButton variant="primary" onClick={onClose}>
              Consultar acompanhamento atual
            </ActionButton>
          </section>
        ) : null}
        {!confirmed && readOnly ? (
          <>
            <h3 tabIndex={-1}>Seu preenchimento em consulta</h3>
            <Notice>
              Consulta pessoal. Nenhum parecer, designação ou efeito no estoque
              é confirmado nesta consulta.
            </Notice>
            {canSeePrivate &&
            privateDraft.base?.state === "active" &&
            !privateDraft.offered ? (
              <DraftContentSummary
                content={privateDraft.base.content}
                kind="BAL"
                purpose={purpose}
              />
            ) : null}
            {!privateDraft.loading &&
            !privateDraft.loadError &&
            !privateDraft.base &&
            !privateDraft.offered &&
            !privateDraft.consumed ? (
              <p>
                Nenhum preenchimento ou resultado privado pendente para esta
                decisão neste perfil.
              </p>
            ) : null}
          </>
        ) : null}
        {!confirmed && !readOnly && !reviewing && canSeePrivate ? (
          <>
            <Notice>
              Salvar guarda apenas o seu preenchimento. Parecer e designação
              exigem confirmação própria; as observações originais de quem
              contou permanecem separadas.
            </Notice>
            <div className="hca-toolbar">
              <ActionButton
                disabled={busy || uncertain || privateDraft.blocked || !content}
                onClick={() => void savePrivate()}
              >
                Salvar preenchimento privado
              </ActionButton>
              <ActionButton
                ref={queryRef}
                disabled={busy || uncertain || privateDraft.blocked}
                onClick={() => void compare()}
              >
                {purpose === "assign_recount"
                  ? "Comparar com a situação atual"
                  : "Consultar referência atual"}
              </ActionButton>
            </div>
            {!unavailable && source ? (
              <BalancePreparationFacts source={source} />
            ) : null}
            {needsReference ? (
              <Notice>
                Compare a contagem, a situação atual e as referências antes de
                adotar e revisar seus campos.
              </Notice>
            ) : null}
            {comparison ? (
              <section
                className="hca-form-stack"
                aria-label={
                  purpose === "assign_recount"
                    ? "Comparação do reconto"
                    : "Comparação da contagem atual"
                }
              >
                <h3>Referência atual do balanço</h3>
                <BalancePreparationFacts source={comparison} />
                {purpose === "assign_recount" && fields.targetShiftId ? (
                  <>
                    <p>
                      Plantão escolhido na consulta anterior:{" "}
                      {fields.targetLabel ||
                        "Identidade preservada; confira a seleção"}
                      .
                    </p>
                    <p>
                      Mesmo plantão na consulta atual:{" "}
                      {comparison.recount?.targets.find(
                        (row) => row.id === fields.targetShiftId,
                      )
                        ? balanceTargetLabel(
                            comparison.recount.targets.find(
                              (row) => row.id === fields.targetShiftId,
                            )!,
                          )
                        : "Indisponível para esta designação"}
                      .
                    </p>
                  </>
                ) : null}
                <p>
                  A adoção mantém seu texto e atualiza explicitamente as
                  referências. Confira a pessoa e o período novamente.
                </p>
                <ActionButton
                  disabled={
                    busy ||
                    privateDraft.blocked ||
                    !balanceDocumentAvailable(comparison, purpose)
                  }
                  onClick={() => {
                    const adopted = adoptBalanceDocumentDraft(
                      content ?? emptyBalanceDocumentDraft(comparison, purpose),
                      comparison,
                      purpose,
                    );
                    setBaseline(adopted);
                    setFields(adopted.fields);
                    setSource(comparison);
                    setComparison(null);
                    setNeedsReference(false);
                    setUnavailable(false);
                    setDirty(true);
                    returnFocusRef.current = true;
                    textRef.current?.focus();
                  }}
                >
                  {purpose === "assign_recount"
                    ? "Adotar referência atual"
                    : "Adotar referência atual e manter meu parecer"}
                </ActionButton>
                {!balanceDocumentAvailable(comparison, purpose) ? (
                  <Notice>
                    Esta decisão não está mais disponível nesta contagem ou
                    atribuição. Seu preenchimento foi preservado para consulta
                    ou descarte pessoal.
                  </Notice>
                ) : null}
              </section>
            ) : null}
            {purpose === "assign_recount" ? (
              <>
                <FormField
                  label="Plantão para o reconto"
                  required
                  helpText="Escolha uma pessoa e um plantão reais. Não há escolha automática."
                >
                  <SearchSelect
                    query={fields.query ?? ""}
                    selectedIds={target ? [target.id] : []}
                    disabled={
                      busy ||
                      privateDraft.busy ||
                      privateDraft.loading ||
                      !!privateDraft.offered ||
                      !!privateDraft.pending ||
                      uncertain ||
                      needsReference ||
                      unavailable
                    }
                    onQueryChange={(query) => {
                      setFields((previous) => ({
                        ...previous,
                        query,
                        targetShiftId: "",
                        targetShiftVersion: "",
                        targetLabel: "",
                      }));
                      setDirty(true);
                    }}
                    onSelectionChange={(ids) => {
                      const chosen = source?.recount?.targets.find(
                        (row) => row.id === ids[0],
                      );
                      if (chosen) {
                        setFields((previous) => ({
                          ...previous,
                          targetShiftId: chosen.id,
                          targetShiftVersion: String(chosen.version),
                          targetLabel: balanceTargetLabel(chosen),
                          query: balanceTargetLabel(chosen),
                        }));
                        setDirty(true);
                      }
                    }}
                    placeholder="Buscar profissional ou plantão"
                    options={(unavailable
                      ? []
                      : (source?.recount?.targets ?? [])
                    )
                      .filter((row) =>
                        balanceTargetLabel(row)
                          .toLocaleLowerCase("pt-BR")
                          .includes(
                            (fields.query ?? "").toLocaleLowerCase("pt-BR"),
                          ),
                      )
                      .map((row) => ({
                        value: row.id,
                        label: balanceTargetLabel(row),
                      }))}
                  />
                </FormField>
                {fields.targetShiftId ? (
                  <p>
                    Pessoa e período selecionados:{" "}
                    {target
                      ? balanceTargetLabel(target)
                      : (fields.targetLabel || "Identidade preservada") +
                        " · indisponível nesta consulta; selecione outro destino explicitamente."}
                  </p>
                ) : null}
                {!unavailable && !source?.recount?.targets.length ? (
                  <p>
                    Nenhum plantão elegível disponível. Consulte ou ajuste a
                    escala antes de designar.
                  </p>
                ) : null}
                <p>
                  O reconto gera uma nova contagem com autoria própria.
                  Pareceres anteriores permanecem históricos e não aprovam
                  automaticamente a nova contagem.
                </p>
              </>
            ) : (
              <p>
                Grupo autorizado:{" "}
                <strong>
                  {purpose === "review_family" ? "Família" : "Supervisão"}
                </strong>
                . Seu parecer não substitui as observações da contagem.
              </p>
            )}
            {purpose !== "assign_recount" && source ? <BalanceReviewItemFields
              ref={itemsRef}
              lines={source.lines} fields={fields}
              disabled={busy || privateDraft.busy || privateDraft.loading || !!privateDraft.offered || !!privateDraft.pending || uncertain || needsReference || unavailable}
              onChange={next => { setFields(next);setDirty(true);setFieldError(""); }}
            /> : null}
            <FormField
              label={
                purpose === "assign_recount"
                  ? "Sua justificativa para o reconto"
                  : "Seu parecer sobre a contagem"
              }
              required={purpose === "assign_recount"}
              error={fieldError || undefined}
              helpText={`${(fields[purpose === "assign_recount" ? "reason" : "comment"] ?? "").length}/${purpose === "assign_recount" ? 1000 : 2000} caracteres. ${purpose === "assign_recount" ? "A designação não registra a contagem física." : "Parecer opcional, com autoria própria."}`}
            >
              <TextAreaField
                ref={textRef}
                value={
                  fields[purpose === "assign_recount" ? "reason" : "comment"] ??
                  ""
                }
                onChange={(event) =>
                  setField(
                    purpose === "assign_recount" ? "reason" : "comment",
                    event.currentTarget.value,
                  )
                }
                maxLength={purpose === "assign_recount" ? 1000 : 2000}
                disabled={
                  busy ||
                  privateDraft.busy ||
                  privateDraft.loading ||
                  !!privateDraft.offered ||
                  !!privateDraft.pending ||
                  uncertain
                }
              />
            </FormField>
            <ActionButton
              variant="primary"
              disabled={
                !allowed || busy || (purpose === "assign_recount" && !target)
              }
              onClick={() => void prepare()}
            >
              {purpose === "assign_recount"
                ? "Revisar designação"
                : "Revisar parecer"}
            </ActionButton>
          </>
        ) : null}
        {reviewing && canSeePrivate ? (
          <section
            className="hca-form-stack"
            aria-label={
              purpose === "assign_recount"
                ? "Conferência da designação"
                : "Conferência do parecer"
            }
          >
            <h3 ref={reviewRef} tabIndex={-1}>
              {purpose === "assign_recount"
                ? "Confira a designação"
                : "Confira seu parecer"}
            </h3>
            {source && !unavailable ? (
              <BalancePreparationFacts source={source} />
            ) : null}
            {purpose === "assign_recount" ? (
              <p>
                Reconto a ser realizado por {fields.targetLabel}. A confirmação
                designa responsabilidade; a contagem física será registrada
                pessoalmente durante o plantão.
              </p>
            ) : (
              <p>
                Grupo autorizado:{" "}
                {purpose === "review_family" ? "Família" : "Supervisão"}. A
                confirmação registra seu parecer independente e segue a política
                vigente da contagem.
              </p>
            )}
            {purpose !== "assign_recount" && source ? <BalanceReviewPreparedFacts lines={source.lines} fields={fields} /> : null}
            <div>
              <h3>
                {purpose === "assign_recount"
                  ? "Sua justificativa"
                  : "Seu parecer"}
              </h3>
              <p className="whitespace-pre-wrap wrap-anywhere">
                {fields[purpose === "assign_recount" ? "reason" : "comment"] ||
                  "Sem observação adicional."}
              </p>
            </div>
            <div className="hca-toolbar">
              <ActionButton
                disabled={busy || uncertain}
                onClick={() => {
                  packetRef.current = null;
                  setReviewing(false);
                  returnFocusRef.current = true;
                }}
              >
                {purpose === "assign_recount" ? "Voltar" : "Voltar ao parecer"}
              </ActionButton>
              {!uncertain ? (
                <ActionButton
                  variant="primary"
                  disabled={busy}
                  onClick={() => void send()}
                >
                  {purpose === "assign_recount"
                    ? "Confirmar designação"
                    : "Confirmar revisão"}
                </ActionButton>
              ) : null}
            </div>
          </section>
        ) : null}
      </div>
    </RecordDrawer>
  );
}
