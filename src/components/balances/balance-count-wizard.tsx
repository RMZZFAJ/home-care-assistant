"use client";
import { ProgressMeter } from "@/components/ui/feedback";
import { ActionButton, LoadingIndicator } from "@/components/ui/controls";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import {
  api,
  ApiError,
  can,
  Notice,
  Workspace,
  type WorkspaceContext,
} from "@/components/workspace";
import { StepNavigator } from "@/components/ui/primitives";
import { PatientSupplyWizard } from "@/components/documents/supply-wizard";
import { useCreationDraft } from "@/components/forms/use-creation-draft";
import {
  draftFlowStages,
  navigationForStep,
  stepForNavigation,
} from "@/lib/forms/draft-navigation";
import {
  CreationDraftPanel,
  BalanceObservationTimes,
} from "@/components/forms/creation-draft-panel";
import type { BalanceDraftContent } from "@/lib/validation/creation-drafts";
import { WizardActions } from "@/components/forms/wizard-actions";
import { DocumentActions } from "@/components/documents/document-actions";
import { BalanceNotice } from "@/components/notifications/balance-notice";
import { DocumentDeliveryStatus } from "@/components/notifications/document-delivery-status";
import { BarcodeScanner } from "@/components/catalog/barcode-scanner";
import { formatZonedDate } from "@/lib/schedules/time";
import { formatQuantity, quantity, validQuantity } from "@/lib/quantity";
import type {
  CatalogProduct,
  SupplyDocument,
  SupplyPayload,
} from "@/types/documents";
import type { BalanceWorkspace } from "@/types/balances";
import { parseBalanceCountReference, parseBalanceCountReview } from "@/lib/validation/balances";
import { useBalanceWorkspace } from "./use-balance-workspace";
import { BalanceCountFields, BalanceReviewRows } from "./balance-count-fields";
import {
  preserveCountCache,
  clearCountCache,
  clearIdleCountCache,
  checkCountAttempt,
  countAttemptTarget,
  parseCountCache,
  requireCountConfirmation,
  type CountAttempt,
} from "@/lib/balances/count-attempt";

import {
  beginBalanceObservation,
  sameBalanceContext,
} from "@/lib/balances/observation-continuity";
import {
  BalancePreviousObservations,
  BalanceReferenceReview,
} from "./observation-continuity";

type Attempt = CountAttempt;
export function BalanceEntry() {
  const params = useSearchParams();
  return (
    <Workspace title="Balanço de estoque" compact>
      {(context) =>
        context.patient && can(context, "bal.read") ? (
          params.get("ref") ? (
            <BalanceNotice
              key={context.patient.id + params.toString()}
              context={context}
            />
          ) : (
            <Mode
              key={context.userId + context.patient.id + params.toString()}
              context={context}
              documentId={params.get("documentId")}
              recount={params.get("recount") === "true"}
            />
          )
        ) : (
          <Notice>
            Selecione um paciente com autorização para consultar o balanço.
          </Notice>
        )
      }
    </Workspace>
  );
}
function Mode({
  context,
  documentId,
  recount,
}: {
  context: WorkspaceContext;
  documentId: string | null;
  recount: boolean;
}) {
  const { data, error, reload, hasBeenEligible } = useBalanceWorkspace(
    context.patient!.id,
  );
  const [recoverable, setRecoverable] = useState(false);
  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      try {
        const cache = JSON.parse(
          sessionStorage.getItem(
            `hca:v2:bal-count:${context.userId}:${context.patient!.id}:${documentId ?? "new"}`,
          ) ?? "null",
        );
        if (active)
          setRecoverable(
            Boolean(
              cache?.pending ||
                cache?.content ||
                cache?.notes ||
                Object.values(cache?.counts ?? {}).some(
                  (value) => value !== "",
                ),
            ),
          );
      } catch {
        if (active) setRecoverable(false);
      }
    });
    return () => {
      active = false;
    };
  }, [context.userId, context.patient, documentId]);
  if (error)
    return (
      <Notice error>
        {error}
        <ActionButton onClick={reload}>Tentar novamente</ActionButton>
      </Notice>
    );
  if (!data)
    return <LoadingIndicator label="Verificando plantão e disponibilidade" />;
  if (
    !data.regime?.activated_at &&
    !data.eligibility.assignment &&
    !hasBeenEligible &&
    !recoverable
  )
    return (
      <PatientSupplyWizard
        context={context}
        type="BAL"
        requisitionId={null}
        documentId={documentId}
        recount={recount}
      />
    );
  return (
    <ScheduledCount
      context={context}
      balance={data}
      documentId={documentId}
      reload={reload}
    />
  );
}
function ScheduledCount({
  context,
  balance,
  documentId,
  reload,
}: {
  context: WorkspaceContext;
  balance: BalanceWorkspace;
  documentId: string | null;
  reload: () => void;
}) {
  const [initial] = useState(balance),
    [products, setProducts] = useState<CatalogProduct[]>([]),
    [counts, setCounts] = useState<Record<string, string>>({}),
    [notes, setNotes] = useState("");
  const [step, setStep] = useState(0),
    [fieldErrors, setFieldErrors] = useState<Record<string, string>>({}),
    [reference, setReference] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<SupplyDocument | null>(null),
    [saved, setSaved] = useState<SupplyDocument | null>(null),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [uncertain, setUncertain] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const [cacheError, setCacheError] = useState("");
  const [attempt, setAttempt] = useState(0),
    [referenceRevision, setReferenceRevision] = useState(
      initial.referenceRevision,
    ),
    [assignment, setAssignment] = useState(initial.eligibility.assignment);
  const [needsRecount, setNeedsRecount] = useState(false);
  const [sourceReady, setSourceReady] = useState(false);
  const [preservedContext, setPreservedContext] = useState<
    BalanceDraftContent["context"] | null
  >(null);
  const [previousObservations, setPreviousObservations] =
    useState<BalanceDraftContent["previousObservations"]>(undefined);
  const pendingRef = useRef<Attempt | null>(null);
  const formatBrazilDate = (value: string | null) =>
    formatZonedDate(value, initial.regime?.timezone);
  const storageKey = `hca:v2:bal-count:${context.userId}:${context.patient!.id}:${documentId ?? "new"}`;
  const eligible =
    balance.eligibility.available &&
    balance.eligibility.assignment?.id === assignment?.id &&
    balance.eligibility.assignment?.version === assignment?.version;
  const [observationTimes, setObservationTimes] = useState<
    Record<string, string | null>
  >({});
  const [draftMaterials, setDraftMaterials] = useState<
    BalanceDraftContent["materials"]
  >([]);
  const currentContext = useMemo<BalanceDraftContent["context"]>(
    () => ({
      mode: "scheduled",
      documentId: editing?.id ?? null,
      documentVersion: editing?.version ?? null,
      assignmentId: assignment?.id ?? null,
      assignmentVersion: assignment?.version ?? null,
      referenceRevision,
    }),
    [
      editing?.id,
      editing?.version,
      assignment?.id,
      assignment?.version,
      referenceRevision,
    ],
  );
  const needsReferenceReview =
    needsRecount ||
    (preservedContext !== null &&
      !sameBalanceContext(preservedContext, currentContext)) ||
    balance.referenceRevision !== referenceRevision ||
    !eligible;
  const balanceContent = useMemo<BalanceDraftContent>(
    () => ({
      counts,
      observationTimes,
      notes,
      materials: [
        ...draftMaterials,
        ...products
          .filter((product) => !draftMaterials.some((m) => m.id === product.id))
          .map((product) => ({
            id: product.id,
            name: product.name,
            unit: product.unit,
            quantityDecimals: product.quantity_decimals ?? 0,
          })),
      ],
      context: preservedContext ?? currentContext,
      ...(previousObservations ? { previousObservations } : {}),
    }),
    [
      counts,
      observationTimes,
      notes,
      draftMaterials,
      products,
      preservedContext,
      currentContext,
      previousObservations,
    ],
  );
  const privateDraft = useCreationDraft({
    userId: context.userId,
    patientId: context.patient!.id,
    kind: "BAL",
    navigation: navigationForStep("BAL", step),
    targetDocumentId: editing?.id ?? documentId,
    enabled: !loading && can(context, "bal.read"),
    onResume: (draft) => {
      const content = draft.content;
      if (!content || !("counts" in content)) return false;
      if (content.context.documentId !== (editing?.id ?? null)) {
        setError("Abra a ficha original para recuperar este preenchimento.");
        return false;
      }
      setPreservedContext(content.context);
      setPreviousObservations(content.previousObservations);
      setCounts(content.counts);
      setObservationTimes(content.observationTimes);
      setNotes(content.notes);
      setDraftMaterials(content.materials);
      setStep(stepForNavigation("BAL", draft.navigation));
      setError("");
      setFieldErrors({});
      return true;
    },
    onDiscard: () => {
      try {
        clearIdleCountCache(sessionStorage, storageKey, {
          userId: context.userId,
          patientId: context.patient!.id,
          documentId: editing?.id ?? documentId,
        });
      } catch {
        setCacheError(
          "Há outra tentativa de contagem preservada neste aparelho. O descarte privado não a apagou; consulte a referência original antes de continuar.",
        );
        return;
      }
      setCounts({});
      setObservationTimes({});
      setNotes("");
      setDraftMaterials([]);
      setPreservedContext(null);
      setPreviousObservations(undefined);
      setNeedsRecount(false);
      setStep(0);
      setError("");
      setFieldErrors({});
    },
  });
  const missingMaterials = Object.keys(counts).filter(
    (id) => !products.some((product) => product.id === id),
  );
  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      const [catalog, state] = await Promise.all([
        api<{ data: CatalogProduct[] }>(
          "/api/catalog?careRecipientId=" + context.patient!.id,
          undefined,
          controller.signal,
        ),
        api<{ data: BalanceWorkspace }>(
          "/api/balances?careRecipientId=" + context.patient!.id,
          undefined,
          controller.signal,
        ),
      ]);
      let raw: string | null,
        cachedTarget: string | null = null;
      try {
        raw = sessionStorage.getItem(storageKey);
        if (raw) {
          const candidate = JSON.parse(raw);
          if (candidate?.pending)
            cachedTarget = countAttemptTarget(candidate.pending);
        }
      } catch {
        setCacheError(
          "Não foi possível conferir a cópia desta contagem. Ela foi preservada; nenhum envio foi realizado.",
        );
        return;
      }
      const id =
        documentId ?? cachedTarget ?? state.data.eligibility.documentId;
      const doc = id
        ? (
            await api<{ data: SupplyDocument }>(
              "/api/documents/" + id,
              undefined,
              controller.signal,
            )
          ).data
        : null;
      if (
        doc &&
        (doc.care_recipient_id !== context.patient!.id || doc.type !== "BAL")
      )
        throw new Error(
          "A ficha pertence a outro paciente. Selecione o vínculo correspondente.",
        );
      if (controller.signal.aborted) return;
      setProducts(catalog.data);
      setEditing(doc);
      setAssignment(state.data.eligibility.assignment);
      setReferenceRevision(state.data.referenceRevision);
      if (doc?.status === "draft") {
        setCounts(
          Object.fromEntries(doc.lines.map((l) => [l.product_id, l.quantity])),
        );
        setNotes(doc.payload.notes ?? "");
        setPreservedContext({
          mode: "scheduled",
          documentId: doc.id,
          documentVersion: doc.version,
          assignmentId: doc.payload.balanceAssignment?.id ?? null,
          assignmentVersion: doc.payload.balanceAssignment?.version ?? null,
          referenceRevision:
            doc.payload.balanceAssignment?.referenceRevision ?? null,
        });
      }
      if (raw) {
        try {
          const cache = parseCountCache(raw, {
            userId: context.userId,
            patientId: context.patient!.id,
            documentId: doc?.id ?? null,
          });
          setCounts(cache.counts ?? {});
          setNotes(cache.notes ?? "");
          setObservationTimes(cache.observationTimes ?? {});
          setPreservedContext(
            cache.content?.context ?? {
              mode: "scheduled",
              documentId: cache.pending
                ? countAttemptTarget(cache.pending)
                : (doc?.id ?? null),
              documentVersion:
                cache.pending && countAttemptTarget(cache.pending) === null
                  ? null
                  : (doc?.version ?? null),
              assignmentId: cache.assignmentId ?? null,
              assignmentVersion: null,
              referenceRevision: cache.referenceRevision ?? null,
            },
          );
          setDraftMaterials(cache.content?.materials ?? []);
          setPreviousObservations(cache.content?.previousObservations);
          if (cache.pending) {
            pendingRef.current = cache.pending;
            setUncertain(true);
            setMessage(
              "Há uma tentativa pendente. Recupere o resultado antes de continuar.",
            );
          }
          setCacheError("");
        } catch {
          setCacheError(
            "Não foi possível conferir a cópia desta contagem. Ela foi preservada; nenhum envio foi realizado.",
          );
        }
      }
      setSourceReady(true);
    };
    load()
      .catch((reason) => {
        if (!controller.signal.aborted) setError(reason.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [context.patient, context.userId, documentId, storageKey, attempt]);
  useEffect(() => {
    if (sourceReady && !loading && !saved && !cacheError)
      try {
        const intent = pendingRef.current;
        preserveCountCache(
          sessionStorage,
          storageKey,
          {
            userId: context.userId,
            patientId: context.patient!.id,
            documentId: intent
              ? countAttemptTarget(intent)
              : (editing?.id ?? documentId),
          },
          {
            assignmentId: assignment?.id ?? null,
            referenceRevision,
            counts,
            notes,
            observationTimes,
            content: balanceContent,
          },
          intent,
        );
      } catch {
        // Unsaved editing remains available. The command path separately
        // requires a verified durable packet before sending an operation.
      }
  }, [
    loading,
    saved,
    storageKey,
    assignment?.id,
    referenceRevision,
    counts,
    notes,
    observationTimes,
    cacheError,
    context.userId,
    context.patient,
    editing?.id,
    documentId,
    sourceReady,
    balanceContent,
  ]);
  function scopeFor(intent: Attempt | null) {
    return {
      userId: context.userId,
      patientId: context.patient!.id,
      documentId: intent
        ? countAttemptTarget(intent)
        : (editing?.id ?? documentId),
    };
  }
  function retain(intent: Attempt | null, expected: Attempt | null = intent) {
    preserveCountCache(
      sessionStorage,
      storageKey,
      scopeFor(expected),
      {
        assignmentId: assignment?.id ?? null,
        referenceRevision,
        counts,
        notes,
        observationTimes,
        content: balanceContent,
      },
      intent,
      expected,
    );
  }
  function validate() {
    const errors: Record<string, string> = {};
    for (const p of products)
      if (!validQuantity(counts[p.id] ?? "", p.quantity_decimals ?? 0, true))
        errors[p.id] =
          "Informe a quantidade física, inclusive zero, na precisão da unidade.";
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      setError("Confira os campos destacados.");
      requestAnimationFrame(() =>
        document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
      );
      return false;
    }
    return products.length > 0;
  }
  function changeCount(id: string, value: string) {
    setCounts((current) => ({ ...current, [id]: value }));
    setObservationTimes((current) => ({
      ...current,
      [id]: new Date().toISOString(),
    }));
    const product = products.find((p) => p.id === id);
    if (validQuantity(value, product?.quantity_decimals ?? 0, true)) {
      setFieldErrors((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      if (error === "Confira os campos destacados.") setError("");
    }
  }
  async function review() {
    if (needsReferenceReview || !sourceReady || !validate()) return;
    setBusy(true);
    setError("");
    try {
      const [stock, state] = await Promise.all([
        api<unknown>(
          "/api/balances?careRecipientId=" + context.patient!.id + "&reference=true",
        ).then(value => parseBalanceCountReference(value, context.patient!.id)),
        api<unknown>(
          "/api/balances?careRecipientId=" + context.patient!.id,
        ).then(value => parseBalanceCountReview(value, context.patient!.id)),
      ]);
      if (stock.data.revision !== referenceRevision || state.data.referenceRevision !== referenceRevision) {
        setNeedsRecount(true);
        throw new Error(
          "O estoque mudou durante a contagem. Inicie uma nova conferência antes de concluir.",
        );
      }
      if (
        !state.data.eligibility.available ||
        state.data.eligibility.assignment?.id !== assignment?.id
      ) {
        setNeedsRecount(true);
        throw new Error(
          "O plantão ou a responsabilidade mudou. Consulte o acompanhamento antes de concluir.",
        );
      }
      if (Object.keys(stock.data.quantities).length !== products.length
        || products.some(product => !Object.hasOwn(stock.data.quantities, product.id))) {
        setNeedsRecount(true);
        throw new Error("O catálogo mudou durante a contagem. Atualize a referência antes de concluir.");
      }
      setReference(stock.data.quantities);
      setStep(1);
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function save(draft: boolean) {
    if (cacheError || !sourceReady) return;
    if (draft && !pendingRef.current) {
      await privateDraft.save(balanceContent);
      return;
    }
    if (
      !pendingRef.current &&
      (privateDraft.blocked || missingMaterials.length)
    )
      return;
    if (!pendingRef.current) {
      if (needsReferenceReview || !validate()) return;
      if (!eligible || !assignment) {
        setError(
          "A contagem exige o plantão ativo e a profissional designada.",
        );
        return;
      }
      const payload: SupplyPayload = {
        lines: products.map((p) => ({
          productId: p.id,
          quantity: quantity(counts[p.id]).toFixed(),
        })),
        notes,
        balanceAssignment: {
          id: assignment.id,
          version: assignment.version,
          referenceRevision,
        },
      };
      const commit = privateDraft.draftCommit
        ? { draftCommit: privateDraft.draftCommit }
        : {};
      pendingRef.current = checkCountAttempt(
        {
          url: editing
            ? `/api/documents/${editing.id}/revise`
            : "/api/documents",
          body: editing
            ? {
                ...commit,
                payload,
                idempotencyKey: crypto.randomUUID(),
                submissionKey: crypto.randomUUID(),
                expectedVersion: editing.version,
                recount: assignment.kind === "recount",
                submit: !draft,
              }
            : {
                ...commit,
                careRecipientId: context.patient!.id,
                type: "BAL",
                payload,
                idempotencyKey: crypto.randomUUID(),
                draft,
              },
          draft,
        },
        {
          userId: context.userId,
          patientId: context.patient!.id,
          documentId: editing?.id ?? null,
        },
      );
    }
    setBusy(true);
    setError("");
    const intent = pendingRef.current;
    try {
      retain(intent);
      const response = await api<unknown>(intent.url, intent.body);
      const confirmed = requireCountConfirmation(
        response,
        intent,
        scopeFor(intent),
      );
      clearCountCache(sessionStorage, storageKey, scopeFor(intent), intent);
      pendingRef.current = null;
      setUncertain(false);
      if (intent.draft) {
        setEditing(confirmed);
        setMessage(
          "Rascunho gravado no sistema. A obrigação continua pendente.",
        );
      } else {
        setSaved(confirmed);
        reload();
      }
    } catch (reason) {
      if (
        reason instanceof ApiError &&
        [400, 403, 404, 409, 422].includes(reason.status) &&
        !uncertain
      ) {
        try {
          retain(null, intent);
          pendingRef.current = null;
          setUncertain(false);
        } catch {
          setUncertain(true);
        }
        if (
          ["INVENTORY_CONFLICT", "VERSION_CONFLICT"].includes(reason.code ?? "")
        )
          setNeedsRecount(true);
      } else setUncertain(true);
      if (
        reason instanceof ApiError &&
        reason.code === "DRAFT_VERSION_CONFLICT"
      ) {
        await privateDraft.reportConflict();
        setStep(0);
      }
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function adoptReference() {
    if (busy || uncertain || cacheError || privateDraft.blocked) return;
    setBusy(true);
    setError("");
    try {
      const [catalog, state, documentRead] = await Promise.all([
        api<{ data: CatalogProduct[] }>(
          "/api/catalog?careRecipientId=" + context.patient!.id,
        ),
        api<{ data: BalanceWorkspace }>(
          "/api/balances?careRecipientId=" + context.patient!.id,
        ),
        editing
          ? api<{ data: SupplyDocument }>("/api/documents/" + editing.id)
          : Promise.resolve(null),
      ]);
      if (
        !state.data.eligibility.available ||
        !state.data.eligibility.assignment
      )
        throw Error(
          "O plantão não está disponível para você. Os valores anteriores foram mantidos.",
        );
      if (
        documentRead &&
        (documentRead.data.type !== "BAL" ||
          documentRead.data.care_recipient_id !== context.patient!.id ||
          !["draft", "submitted"].includes(documentRead.data.status))
      )
        throw Error(
          "Esta ficha não permite outra contagem. Consulte seu acompanhamento; o preenchimento foi preservado.",
        );
      const target = documentRead?.data ?? null;
      const nextContext: BalanceDraftContent["context"] = {
        mode: "scheduled",
        documentId: target?.id ?? null,
        documentVersion: target?.version ?? null,
        assignmentId: state.data.eligibility.assignment.id,
        assignmentVersion: state.data.eligibility.assignment.version,
        referenceRevision: state.data.referenceRevision,
      };
      const next = beginBalanceObservation(
        balanceContent,
        nextContext,
        catalog.data.map((p) => ({
          id: p.id,
          name: p.name,
          unit: p.unit,
          quantityDecimals: p.quantity_decimals ?? 0,
        })),
      );
      preserveCountCache(
        sessionStorage,
        storageKey,
        {
          userId: context.userId,
          patientId: context.patient!.id,
          documentId: nextContext.documentId,
        },
        {
          assignmentId: nextContext.assignmentId,
          referenceRevision: nextContext.referenceRevision,
          counts: next.counts,
          notes: next.notes,
          observationTimes: next.observationTimes,
          content: next,
        },
        null,
      );
      setProducts(catalog.data);
      setEditing(target);
      setAssignment(state.data.eligibility.assignment);
      setReferenceRevision(state.data.referenceRevision);
      setCounts(next.counts);
      setObservationTimes(next.observationTimes);
      setNotes(next.notes);
      setDraftMaterials(next.materials);
      setPreservedContext(next.context);
      setPreviousObservations(next.previousObservations);
      setNeedsRecount(false);
      setFieldErrors({});
      setStep(0);
      setMessage(
        "Referência atualizada. Confira fisicamente cada material; as observações anteriores continuam preservadas.",
      );
      reload();
      requestAnimationFrame(() =>
        document.querySelector<HTMLElement>("[data-product] input")?.focus(),
      );
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function scan(code: string) {
    const result = await api<{
      data: { product_id: string; name: string; base_quantity: string }[];
    }>(
      "/api/catalog/presentations?careRecipientId=" +
        context.patient!.id +
        "&barcode=" +
        encodeURIComponent(code),
    );
    const presentation = result.data[0];
    if (
      !presentation ||
      !products.some((p) => p.id === presentation.product_id)
    )
      throw new Error(
        "Código não encontrado no catálogo ativo. Selecione o material manualmente.",
      );
    const product = products.find((p) => p.id === presentation.product_id)!;
    if (
      !validQuantity(
        counts[product.id] || "0",
        product.quantity_decimals ?? 0,
        true,
      )
    )
      throw new Error(
        "Corrija a quantidade deste material antes de acrescentar uma apresentação.",
      );
    changeCount(
      product.id,
      quantity(counts[product.id] || "0")
        .plus(presentation.base_quantity)
        .toFixed(),
    );
    setMessage(
      `${presentation.name}: ${formatQuantity(presentation.base_quantity)} acrescentados à contagem física.`,
    );
    requestAnimationFrame(() =>
      document
        .querySelector<HTMLElement>(
          `[data-product="${CSS.escape(presentation.product_id)}"] input`,
        )
        ?.focus(),
    );
  }
  if (privateDraft.readDenied)
    return (
      <Notice error>
        Seu acesso ao rascunho foi encerrado. Selecione um vínculo autorizado.
      </Notice>
    );
  if (saved)
    return (
      <section className="ui-card hca-form-stack">
        <Notice>
          {saved.status === "submitted"
            ? "Contagem enviada para revisão. A aprovação ainda está pendente."
            : "Contagem registrada conforme a política de revisão do paciente."}
        </Notice>
        <h2>{saved.code}</h2>
        <p>
          {formatBrazilDate(saved.updated_at)} · {saved.lines.length} itens ·{" "}
          {
            saved.lines.filter(
              (l) =>
                !quantity(l.quantity).eq(
                  String(l.metadata.expectedQuantity ?? "0"),
                ),
            ).length
          }{" "}
          diferenças · responsável:{" "}
          {saved.payload.balanceContext?.professionalName}
        </p>
        <Link
          href={"/documentos/" + saved.id}
          className="ui-button ui-button-primary"
          prefetch={false}
        >
          Abrir ficha BAL
        </Link>
        <DocumentActions
          id={saved.id}
          code={saved.code ?? "BAL"}
          version={saved.version}
        />
        <DocumentDeliveryStatus id={saved.id} version={saved.version} />
      </section>
    );
  if (loading) return <LoadingIndicator label="Preparando contagem física" />;
  if (!sourceReady && !cacheError)
    return (
      <Notice error>
        {error ||
          "Não foi possível consultar a referência da contagem. Os dados preservados não foram substituídos."}
        <ActionButton
          onClick={() => {
            setLoading(true);
            setAttempt((v) => v + 1);
          }}
        >
          Consultar referência novamente
        </ActionButton>
      </Notice>
    );
  const referencePanel =
    needsReferenceReview && !uncertain && !cacheError ? (
      <BalanceReferenceReview
        source={balanceContent}
        current={currentContext}
        disabled={busy || privateDraft.blocked}
        onAdopt={() => void adoptReference()}
      />
    ) : null;
  const previousPanel = (
    <BalancePreviousObservations content={balanceContent} />
  );
  const draftPanel = (
    <CreationDraftPanel
      draft={privateDraft}
      current={balanceContent}
      patientName={context.patient!.display_name}
      disabled={busy || uncertain || Boolean(cacheError)}
    />
  );
  if (!initial.eligibility.available && !uncertain)
    return (
      <div className="hca-form-stack">
        {draftPanel}
        {referencePanel}
        {previousPanel}
        {cacheError ? <Notice error>{cacheError}</Notice> : null}
        <section className="ui-card hca-form-stack">
          {error ? <Notice error>{error}</Notice> : null}
          <Notice>
            A contagem é disponibilizada exclusivamente à pessoa designada
            durante o plantão real. Consulte a programação e o acompanhamento.
          </Notice>
          <p>
            {formatBrazilDate(
              balance.eligibility.assignment?.starts_at ?? null,
            )}{" "}
            →{" "}
            {formatBrazilDate(balance.eligibility.assignment?.ends_at ?? null)}
          </p>
          <Link
            className="ui-button ui-button-primary"
            href="/balancos"
            prefetch={false}
          >
            Consultar balanços e plantões
          </Link>
        </section>
      </div>
    );
  const progress = products.filter((p) =>
    validQuantity(counts[p.id] ?? "", p.quantity_decimals ?? 0, true),
  ).length;
  return (
    <div className="hca-form-stack">
      {draftPanel}
      {referencePanel}
      {previousPanel}
      {cacheError ? <Notice error>{cacheError}</Notice> : null}
      {error ? <Notice error>{error}</Notice> : null}
      {message ? <Notice>{message}</Notice> : null}
      <section className="hca-bal-context">
        <strong>{context.patient!.display_name}</strong>
        <p>
          {balance.assignments.find((a) => a.id === assignment?.id)
            ?.professional_name ?? "Profissional designado"}{" "}
          ·{" "}
          {balance.assignments.find((a) => a.id === assignment?.id)?.type_name}
        </p>
        <small>
          {formatBrazilDate(assignment?.starts_at ?? null)} →{" "}
          {formatBrazilDate(assignment?.ends_at ?? null)}
        </small>
      </section>
      {!eligible && !uncertain ? (
        <Notice>
          A contagem está indisponível fora do plantão ou para outro
          responsável. Os dados preenchidos permanecem visíveis.
          <Link href="/balancos" prefetch={false}>
            Consultar agendamento e pendências
          </Link>
        </Notice>
      ) : null}
      {!products.length ? <Notice>O catálogo ativo está vazio.</Notice> : null}
      {missingMaterials.length ? (
        <Notice error>
          Há materiais fora do catálogo ativo. Confira os valores antes de
          removê-los.
          {missingMaterials.map((id) => (
            <div key={id}>
              {draftMaterials.find((material) => material.id === id)?.name ??
                "Material indisponível"}
              : {counts[id]}
              <ActionButton
                disabled={busy || uncertain || privateDraft.blocked}
                onClick={() =>
                  setCounts((current) => {
                    const next = { ...current };
                    delete next[id];
                    return next;
                  })
                }
              >
                Remover material indisponível
              </ActionButton>
            </div>
          ))}
        </Notice>
      ) : null}
      <StepNavigator
        steps={draftFlowStages.BAL.map((stage) => stage.label)}
        active={step}
        disabled={
          busy || uncertain || privateDraft.blocked || Boolean(cacheError)
        }
        onChange={setStep}
      />
      <fieldset
        disabled={
          busy ||
          uncertain ||
          !eligible ||
          needsReferenceReview ||
          privateDraft.blocked ||
          Boolean(cacheError)
        }
        className="min-w-0 hca-form-stack"
      >
        {step === 0 ? (
          <>
            <div className="hca-toolbar">
              <strong>
                {progress}/{products.length} materiais contados
              </strong>
              <Link href="/balancos" prefetch={false}>
                Acompanhar / solicitar adiamento
              </Link>
            </div>
            <ProgressMeter
              value={progress}
              max={Math.max(products.length, 1)}
              aria-label="Progresso da contagem física"
            />
            <p className="hca-muted">
              Informe o que está fisicamente com a equipe. Registre zero quando
              o material estiver ausente.
            </p>
            <details className="ui-card">
              <summary>Contar por código de barras</summary>
              <BarcodeScanner onRead={scan} />
            </details>
            <BalanceCountFields
              products={products}
              counts={counts}
              errors={fieldErrors}
              notes={notes}
              onCount={changeCount}
              onNotes={setNotes}
            />
          </>
        ) : (
          <>
            <h2>Revisão da contagem</h2>
            <p>Confira as quantidades físicas e as diferenças.</p>
            {editing?.workflow_data.reviewPolicy &&
            typeof editing.workflow_data.reviewPolicy === "object" &&
            "balReview" in editing.workflow_data.reviewPolicy ? (
              <Notice>
                {editing.workflow_data.reviewPolicy.balReview === "optional"
                  ? "Ao confirmar, as diferenças desta nova contagem serão conciliadas no estoque da equipe. A revisão é facultativa; a diferença não será registrada como consumo."
                  : "Esta contagem usa a revisão exigida na política preservada do balanço. A conciliação aguarda os novos pareceres; revisões anteriores não aprovam esta contagem."}
              </Notice>
            ) : (
              <p>
                A confirmação registra a contagem; a conciliação seguirá a
                política do paciente.
              </p>
            )}
            <BalanceReviewRows
              products={products}
              counts={counts}
              reference={reference}
            />
            <BalanceObservationTimes content={balanceContent} />
            {notes ? <p>{notes}</p> : null}
          </>
        )}
      </fieldset>
      <fieldset
        disabled={Boolean(cacheError)}
        className="min-w-0"
        aria-label="Ações da contagem"
      >
        <WizardActions
          step={step}
          total={2}
          saving={
            busy || privateDraft.busy || (privateDraft.blocked && !uncertain)
          }
          uncertain={uncertain}
          blocked={
            !eligible ||
            needsReferenceReview ||
            !sourceReady ||
            !products.length ||
            missingMaterials.length > 0 ||
            Boolean(cacheError)
          }
          onBack={() => setStep(0)}
          onDraft={() => void save(true)}
          onNext={() => void review()}
          onFinish={() => void save(false)}
          finishLabel={
            assignment?.kind === "recount"
              ? "Confirmar reconto"
              : "Confirmar contagem"
          }
        />
      </fieldset>
      {uncertain && step === 0 ? (
        <ActionButton
          disabled={busy || Boolean(cacheError)}
          variant="primary"
          onClick={() => void save(false)}
        >
          Recuperar a mesma tentativa
        </ActionButton>
      ) : null}
    </div>
  );
}
