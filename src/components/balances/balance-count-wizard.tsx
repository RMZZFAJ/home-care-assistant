"use client";
import { ProgressMeter } from "@/components/ui/feedback";
import { ActionButton, DefinitionGrid, FormField, LoadingIndicator, TextAreaField } from "@/components/ui/controls";
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
import { Dialog, StepNavigator } from "@/components/ui/primitives";
import { PatientSupplyWizard } from "@/components/documents/supply-wizard";
import { SimpleDraftPanel } from "@/components/forms/simple-draft-panel";
import { useLongDraftAutosave } from "@/components/forms/use-long-draft-autosave";
import { useWizardMaterialReferences } from "@/components/forms/use-wizard-material-references";
import { useCreationDraft } from "@/components/forms/use-creation-draft";
import {
  draftFlowStages,
  navigationForStep,
  stepForNavigation,
} from "@/lib/forms/draft-navigation";
import {
  BalanceObservationTimes,
} from "@/components/forms/creation-draft-panel";
import type { BalanceDraftContent } from "@/lib/validation/creation-drafts";
import { WizardActions } from "@/components/forms/wizard-actions";
import { adjacentMaterialCategory, materialCategories, WizardMaterialCategories, type WizardMaterialCategory } from "@/components/forms/supply-wizard-stages";
import { DocumentActions } from "@/components/documents/document-actions";
import { BalanceNotice } from "@/components/notifications/balance-notice";
import { DocumentDeliveryStatus } from "@/components/notifications/document-delivery-status";
import { BarcodeScanner } from "@/components/catalog/barcode-scanner";
import { scanBalancePresentation } from "@/lib/client/balance-scan";
import { formatZonedDate } from "@/lib/schedules/time";
import { quantity, validQuantity } from "@/lib/quantity";
import type {
  CatalogProduct,
  SupplyDocument,
  SupplyPayload,
} from "@/types/documents";
import type { BalanceAssignment, BalanceWorkspace } from "@/types/balances";
import { balanceCountAdmission, parseBalanceCountReference, parseBalanceCountReview, type BalanceCountAdmission } from "@/lib/validation/balances";
import { useBalanceWorkspace } from "./use-balance-workspace";
import { BalanceCountFields, BalanceExtraFields, BalanceReviewRows } from "./balance-count-fields";
import { BalanceRecordedExtras } from "./balance-materials";
import { balanceCatalogueMatches, confirmedBalanceExtras, priorBalanceMaterials } from "@/lib/balances/count-materials";
import type { BalanceCountExtra } from "@/lib/validation/balance-count-extras";
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
              assignmentId={params.get("assignmentId")}
              assignmentVersion={params.get("assignmentVersion")}
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
  assignmentId,
  assignmentVersion,
}: {
  context: WorkspaceContext;
  documentId: string | null;
  recount: boolean;
  assignmentId: string | null;
  assignmentVersion: string | null;
}) {
  const { data, error, reload, hasBeenEligible } = useBalanceWorkspace(
    context.patient!.id,
  );
  const [recoverable, setRecoverable] = useState(false);
  const [openedAssignment, setOpenedAssignment] = useState(false);
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
  if ((assignmentId !== null || assignmentVersion !== null) && !openedAssignment) {
    const current = data.eligibility.assignment;
    if (!current || assignmentId !== current.id || assignmentVersion !== String(current.version)
      || documentId !== data.eligibility.documentId)
      return <Notice error>A atribuição mudou. Volte a Plantões e balanços para consultar a responsabilidade atual.</Notice>;
    setOpenedAssignment(true);
  }
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
  const [extras, setExtras] = useState<BalanceCountExtra[]>([]);
  const [category, setCategory] = useState<WizardMaterialCategory>();
  const [cataloguePicker, setCataloguePicker] = useState(false);
  const cataloguePickerButtonRef = useRef<HTMLButtonElement>(null);
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
  const [started, setStarted] = useState<{ workspace: BalanceWorkspace; admission: BalanceCountAdmission } | null>(null);
  const [discardedAdmissionId, setDiscardedAdmissionId] = useState<string | null>(null);
  const candidate = started?.workspace === balance ? started.admission : balance.eligibility.admission;
  const candidateMatches = candidate && assignment && candidate.id !== discardedAdmissionId &&
    candidate.assignmentId === assignment.id && candidate.assignmentVersion === assignment.version &&
    candidate.documentId === (editing?.id ?? null) && candidate.documentVersion === (editing?.version ?? null);
  const sameAssignment =
    balance.eligibility.assignment?.id === assignment?.id &&
    balance.eligibility.assignment?.version === assignment?.version;
  const admission = candidateMatches && sameAssignment && can(context, "bal.count") ? candidate : null;
  const canStart = sameAssignment && balance.eligibility.available && can(context, "bal.count") &&
    balance.eligibility.documentId === (editing?.id ?? null);
  const eligible = admission !== null;
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
  const [draftTouched, setDraftTouched] = useState(false);
  const recount = assignment?.kind === "recount";
  const prior = useMemo(() => priorBalanceMaterials(recount ? editing : null, products), [recount, editing, products]);
  const preservedExtraIds = new Set(prior.extras.map(extra => extra.id));
  const countedProducts = products.filter(product => !recount || prior.catalogued.has(product.id) || Object.hasOwn(counts, product.id));
  const activeCategory = category ?? adjacentMaterialCategory(undefined, countedProducts, "next") ?? "medicamentos";
  const visibleProducts = countedProducts.filter(product => product.category === activeCategory);
  const countedProductIds = new Set(countedProducts.map(product => product.id));
  const pickableProducts = cataloguePicker
    ? products.filter(product => product.category === activeCategory && !countedProductIds.has(product.id)) : [];
  const materialReferences = useWizardMaterialReferences(
    context.patient!.id, "BAL", () => setDraftTouched(true), editing?.id ?? documentId,
  );
  const balanceContent = useMemo<BalanceDraftContent>(
    () => ({
      counts,
      observationTimes,
      notes,
      materialCategory: category,
      ...(extras.length ? { balanceExtras: extras } : {}),
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
      ...(materialReferences.links.length ? { materialReferences: materialReferences.links } : {}),
      ...(previousObservations ? { previousObservations } : {}),
    }),
    [
      counts,
      observationTimes,
      notes,
      category,
      extras,
      draftMaterials,
      products,
      preservedContext,
      currentContext,
      previousObservations,
      materialReferences.links,
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
      materialReferences.setLinks(content.materialReferences ?? []);
      setCounts(content.counts);
      setObservationTimes(content.observationTimes);
      setNotes(content.notes);
      setExtras(content.balanceExtras ?? []);
      setCategory(content.materialCategory);
      setDraftMaterials(content.materials);
      setStep(stepForNavigation("BAL", draft.navigation));
      setError("");
      setFieldErrors({});
      return true;
    },
    onDiscard: () => {
      setDiscardedAdmissionId(admission?.id ?? null);
      setStarted(null);
      reload();
      setDraftTouched(false);
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
      materialReferences.setLinks([]);
      setObservationTimes({});
      setNotes("");
      setExtras(prior.extras.map(extra => ({ ...extra, quantity: "" })));
      setCategory(undefined);
      setDraftMaterials([]);
      setPreservedContext(null);
      setPreviousObservations(undefined);
      setNeedsRecount(false);
      setStep(0);
      setError("");
      setFieldErrors({});
    },
  });

  useLongDraftAutosave(privateDraft, balanceContent, draftTouched && !(busy || uncertain));
  const missingMaterials = [...new Set([...Object.keys(counts), ...materialReferences.links.map(link => link.productId)])].filter(
    (id) => !products.some((product) => product.id === id),
  );
  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      const [catalog, state, stock] = await Promise.all([
        api<{ data: CatalogProduct[]; }>(
          "/api/catalog?careRecipientId=" + context.patient!.id,
          undefined,
          controller.signal,
        ),
        api<{ data: BalanceWorkspace; }>(
          "/api/balances?careRecipientId=" + context.patient!.id,
          undefined,
          controller.signal,
        ),
        api<unknown>("/api/balances?careRecipientId=" + context.patient!.id + "&reference=true", undefined, controller.signal)
          .then(value => parseBalanceCountReference(value, context.patient!.id)),
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
          await api<{ data: SupplyDocument; }>(
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
      const initialPrior = state.data.eligibility.assignment?.kind === "recount" ? priorBalanceMaterials(doc, catalog.data) : null;
      setCategory(undefined);
      setReference(stock.data.revision === state.data.referenceRevision ? stock.data.quantities : {});
      const persistedExtras = initialPrior ? initialPrior.extras.map(extra => ({ ...extra, quantity: "" })) : doc?.payload.balanceExtras ?? [];
      setExtras(persistedExtras);
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
          if (cache.content?.materialCategory) setCategory(cache.content.materialCategory);
          if (cache.content || cache.pending) setExtras(cache.content?.balanceExtras ?? []);
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
          } else if (cache.navigation) {
            setStep(stepForNavigation("BAL", cache.navigation));
          } else if (cache.notes || Object.keys(cache.counts ?? {}).length) {
            setStep(1);
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
            navigation: navigationForStep("BAL", step),
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
    step,
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
        navigation: navigationForStep("BAL", step),
      },
      intent,
      expected,
    );
  }
  function validate() {
    const errors: Record<string, string> = {};
    for (const p of countedProducts)
      if (!validQuantity(counts[p.id] ?? "", p.quantity_decimals ?? 0, true))
        errors[p.id] =
          "Informe a quantidade física, inclusive zero, na precisão da unidade.";
    setFieldErrors(errors);
    if (recount && prior.unresolved.some(({ matches }) => !matches.some(product => Object.hasOwn(counts, product.id)))) {
      setError("Selecione a identificação de catálogo de cada extra incorporado.");
      setStep(1);
      return false;
    }
    if (Object.keys(errors).length) {
      setError("Confira os campos destacados.");
      const first = countedProducts.find(product => errors[product.id]);
      if (first) showProduct(first);
      requestAnimationFrame(() =>
        document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
      );
      return false;
    }
    if (!countedProducts.length) {
      setError("Inclua ao menos um material do catálogo para concluir esta contagem.");
      setStep(1);
      return false;
    }
    return true;
  }
  function showProduct(product: CatalogProduct) {
    const group = materialCategories.find(entry => entry.id === product.category);
    if (group) setCategory(group.id);
    setStep(1);
  }
  function includeProduct(product: CatalogProduct, extraId?: string) {
    if (extraId) setExtras(current => current.filter(extra => extra.id !== extraId));
    setDraftTouched(true);
    setCounts(current => Object.hasOwn(current, product.id) ? current : { ...current, [product.id]: "" });
    setCataloguePicker(false);
    showProduct(product);
  }
  function confirmedExtras() {
    const result = confirmedBalanceExtras(extras, products);
    if (!result) {
      setError("Confira o nome, a unidade e a quantidade dos extras. Se o item estiver no catálogo, conte-o em Materiais.");
      setStep(2);
      return null;
    }
    return result;
  }
  function changeCount(id: string, value: string) {
    setDraftTouched(true);
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
  async function confirmAdmission(targetAssignment: BalanceAssignment, target: SupplyDocument | null) {
    const body = {
      careRecipientId: context.patient!.id, assignmentId: targetAssignment.id, assignmentVersion: targetAssignment.version,
      documentId: target?.id ?? null, documentVersion: target?.version ?? null,
    };
    const response = await api<{ data: unknown }>("/api/balances/count-admission", body);
    const confirmed = balanceCountAdmission.parse(response.data);
    if (confirmed.assignmentId !== body.assignmentId || confirmed.assignmentVersion !== body.assignmentVersion ||
      confirmed.documentId !== body.documentId || confirmed.documentVersion !== body.documentVersion) {
      throw new Error("O início confirmado pertence a outra contagem.");
    }
    return confirmed;
  }
  async function startCount() {
    if (!assignment || !canStart || busy || privateDraft.blocked || cacheError) return;
    setBusy(true);
    setError("");
    try {
      const confirmed = await confirmAdmission(assignment, editing);
      setStarted({ workspace: balance, admission: confirmed });
      setDiscardedAdmissionId(null);
      setStep(1);
      reload();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Não foi possível iniciar esta contagem.");
      reload();
    } finally {
      setBusy(false);
    }
  }
  async function review() {
    if (needsReferenceReview || !sourceReady || !validate() || !confirmedExtras()) return;
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
        !admission ||
        state.data.eligibility.admission?.id !== admission.id ||
        state.data.eligibility.assignment?.id !== assignment?.id ||
        state.data.eligibility.assignment?.version !== assignment?.version
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
      setStep(draftFlowStages.BAL.length - 1);
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function nextStep() {
    setError("");
    if (step === 0) setStep(1);
    if (step === 1) {
      const nextCategory = adjacentMaterialCategory(activeCategory, countedProducts, "next");
      if (nextCategory) setCategory(nextCategory);
      else if (validate()) setStep(2);
    }
    if (step === 2 && confirmedExtras()) setStep(3);
    if (step === 3) void review();
  }
  function previousStep() {
    const previousCategory = step === 1 ? adjacentMaterialCategory(activeCategory, countedProducts, "previous") : undefined;
    if (previousCategory) setCategory(previousCategory);
    else setStep(step - 1);
  }
  async function save() {
    if (cacheError || !sourceReady) return;
    if (
      !pendingRef.current &&
      (privateDraft.blocked || missingMaterials.length)
    )
      return;
    if (!pendingRef.current) {
      if (needsReferenceReview || !validate()) return;
      const completedExtras = confirmedExtras();
      if (!completedExtras) return;
      if (!admission || !assignment) {
        setError(
          "Confirme o início com a atribuição vigente antes de concluir.",
        );
        return;
      }
      const payload: SupplyPayload = {
        lines: countedProducts.map((p) => ({
          productId: p.id,
          quantity: quantity(counts[p.id]).toFixed(),
        })),
        notes,
        ...(completedExtras.length ? { balanceExtras: completedExtras } : {}),
        balanceAssignment: {
          id: assignment.id,
          version: assignment.version,
          referenceRevision,
          admissionId: admission.id,
        },
      };
      const savedDraft = await privateDraft.save(structuredClone(balanceContent));
      if (!savedDraft) return;
      const commit = { draftCommit: { id: savedDraft.id, revision: savedDraft.revision } };
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
              submit: true,
            }
            : {
              ...commit,
              careRecipientId: context.patient!.id,
              type: "BAL",
              payload,
              idempotencyKey: crypto.randomUUID(),
              draft: false,
            },
          draft: false,
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
      const [catalog, state, documentRead, stock] = await Promise.all([
        api<{ data: CatalogProduct[]; }>(
          "/api/catalog?careRecipientId=" + context.patient!.id,
        ),
        api<{ data: BalanceWorkspace; }>(
          "/api/balances?careRecipientId=" + context.patient!.id,
        ),
        editing
          ? api<{ data: SupplyDocument; }>("/api/documents/" + editing.id)
          : Promise.resolve(null),
        api<unknown>("/api/balances?careRecipientId=" + context.patient!.id + "&reference=true")
          .then(value => parseBalanceCountReference(value, context.patient!.id)),
      ]);
      if (
        !state.data.eligibility.assignment ||
        (!state.data.eligibility.available && !state.data.eligibility.admission)
      )
        throw Error(
          "O plantão não está disponível para você. Os valores anteriores foram mantidos.",
        );
      if (
        documentRead &&
        (documentRead.data.type !== "BAL" ||
          documentRead.data.care_recipient_id !== context.patient!.id ||
          !(["draft", "submitted"].includes(documentRead.data.status) ||
            documentRead.data.status === "approved" && state.data.eligibility.assignment.kind === "recount"))
      )
        throw Error(
          "Esta ficha não permite outra contagem. Consulte seu acompanhamento; o preenchimento foi preservado.",
        );
      const target = documentRead?.data ?? null;
      const confirmed = await confirmAdmission(state.data.eligibility.assignment, target);
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
      const carriedItems = new Set(countedProducts.map(product => product.id));
      const previousExtras = next.balanceExtras ?? [];
      next.balanceExtras = previousExtras.filter(extra => {
        const matches = balanceCatalogueMatches(extra.name, catalog.data);
        if (matches.length !== 1) return true;
        carriedItems.add(matches[0].id);
        return false;
      });
      if (state.data.eligibility.assignment.kind === "recount")
        next.counts = Object.fromEntries(catalog.data.filter(product => carriedItems.has(product.id)).map(product => [product.id, ""]));
      const currentProducts = state.data.eligibility.assignment.kind === "recount"
        ? catalog.data.filter(product => carriedItems.has(product.id))
        : catalog.data;
      const nextCategory = currentProducts.some(product => product.category === category)
        ? category : undefined;
      next.materialCategory = nextCategory;
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
          navigation: navigationForStep("BAL", 1),
        },
        null,
      );
      setProducts(catalog.data);
      setEditing(target);
      setAssignment(state.data.eligibility.assignment);
      setStarted({ workspace: balance, admission: confirmed });
      setDiscardedAdmissionId(null);
      setReferenceRevision(state.data.referenceRevision);
      setCounts(next.counts);
      setObservationTimes(next.observationTimes);
      setNotes(next.notes);
      setExtras(next.balanceExtras);
      setReference(stock.data.revision === state.data.referenceRevision ? stock.data.quantities : {});
      setDraftMaterials(next.materials);
      setPreservedContext(next.context);
      setPreviousObservations(next.previousObservations);
      setNeedsRecount(false);
      setFieldErrors({});
      setCategory(nextCategory);
      setDraftTouched(true);
      setStep(1);
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
    const { product, quantity: counted, message } = await scanBalancePresentation(context.patient!.id, code, products, counts);
    changeCount(product.id, counted);
    showProduct(product);
    setMessage(message);
    requestAnimationFrame(() =>
      document
        .querySelector<HTMLElement>(
          `[data-product="${CSS.escape(product.id)}"] input`,
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
    needsReferenceReview && (eligible || preservedContext || draftTouched || needsRecount) && !uncertain && !cacheError ? (
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
  const draftPanel = uncertain ? null : (
    <SimpleDraftPanel
      draft={privateDraft}
      current={balanceContent}
      statusInFooter={eligible && !cacheError}
      exitHref="/balancos"
      patientName={context.patient!.display_name}
      authorName={context.fullName}
      disabled={busy || uncertain || Boolean(cacheError)}
    />
  );
  const shiftType = balance.assignments.find((item) => item.id === assignment?.id)?.type_name;
  const identity = <DefinitionGrid items={[
    { label: "Paciente", value: context.patient!.display_name },
    { label: "Quem preenche", value: context.fullName },
    { label: "Plantão", value: `${formatBrazilDate(assignment?.starts_at ?? null)} → ${formatBrazilDate(assignment?.ends_at ?? null)}` },
    ...(shiftType ? [{ label: "Tipo de plantão", value: shiftType }] : []),
    { label: "Estoque", value: "Equipe" },
    { label: "Contagem", value: recount ? `Recontagem de ${editing?.code ?? "balanço"}` : "Balanço do plantão" },
  ]} />;
  if (!eligible && !uncertain)
    return (
      <div className="hca-form-stack">
        {draftPanel}
        {referencePanel}
        {previousPanel}
        {cacheError ? <Notice error>{cacheError}</Notice> : null}
        <section className="ui-card hca-form-stack">
          {error ? <Notice error>{error}</Notice> : null}
          {canStart ? <>
            <StepNavigator steps={draftFlowStages.BAL.map(stage => stage.label)} active={0} onChange={setStep} disabled compact />
            <h2 className="font-semibold">Confirme os dados</h2>
            {identity}
            <p>Iniciar neste plantão permite concluir a mesma contagem depois do horário.</p>
            <ActionButton variant="primary" disabled={busy || privateDraft.blocked || Boolean(cacheError)}
              onClick={() => void startCount()}>Iniciar contagem</ActionButton>
          </> : <Notice>
            Uma nova contagem pode ser iniciada pela pessoa designada durante o plantão.
            Consulte a programação e o acompanhamento.
          </Notice>}
          {!canStart ? <p>
            {formatBrazilDate(
              balance.eligibility.assignment?.starts_at ?? null,
            )}{" "}
            →{" "}
            {formatBrazilDate(balance.eligibility.assignment?.ends_at ?? null)}
          </p> : null}
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
  const progress = countedProducts.filter((p) =>
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
      {eligible && !balance.eligibility.available && !uncertain ? (
        <Notice>
          Esta contagem foi iniciada no plantão e pode ser concluída agora.
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
                onClick={() => {
                  materialReferences.remove(id);
                  setDraftTouched(true);
                  setCounts((current) => {
                    const next = { ...current };
                    delete next[id];
                    return next;
                  });
                }}
              >
                Remover material indisponível
              </ActionButton>
            </div>
          ))}
        </Notice>
      ) : null}
      <div className="hca-supply-wizard-card hca-balance-count-card">
      <StepNavigator
        steps={draftFlowStages.BAL.map((stage) => stage.label)}
        compact
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
        className="hca-supply-wizard-body hca-form-stack"
      >
        {step === 0 ? <>
          <h2>Confirme os dados</h2>
          {identity}
          <p>A contagem será vinculada a este paciente e a quem está preenchendo.</p>
        </> : null}
        {step === 1 ? (
          <>
            <div><h2>{recount ? "Conte novamente os materiais" : "Conte os materiais"}</h2>
              <p className="hca-muted">Informe a quantidade física da equipe. Use zero quando o material estiver ausente.</p></div>
            <WizardMaterialCategories category={activeCategory} onChange={setCategory}
              selected={countedProducts.filter(product => validQuantity(counts[product.id] ?? "", product.quantity_decimals ?? 0, true))} />
            <div className="hca-toolbar">
              <strong>
                {progress}/{countedProducts.length} materiais contados
              </strong>
              {recount ? <ActionButton ref={cataloguePickerButtonRef} onClick={() => setCataloguePicker(true)}>Incluir item não contado</ActionButton>
                : <ActionButton onClick={() => { if (validate()) setStep(2); }}>Item extra</ActionButton>}
            </div>
            <ProgressMeter
              value={progress}
              max={Math.max(countedProducts.length, 1)}
              aria-label="Progresso da contagem física"
            />
            {recount ? prior.unresolved.filter(row => !row.matches.some(product => Object.hasOwn(counts, product.id))).map(row =>
              <Notice key={row.extra.id}>Selecione a identificação de catálogo de {row.extra.name}.
                {row.matches.map(product => <ActionButton key={product.id} onClick={() => includeProduct(product)}>{product.name} · {product.unit}</ActionButton>)}
              </Notice>) : null}
            <details className="hca-count-scan">
              <summary className="ui-button ui-button-secondary">Contar por código de barras</summary>
              <BarcodeScanner onRead={scan} />
            </details>
            <BalanceCountFields
              context={context}
              products={visibleProducts}
              counts={counts}
              errors={fieldErrors}
              reference={reference}
              onCount={changeCount}
              onLink={materialReferences.open}
              linkedCount={materialReferences.count}
            />
            {!visibleProducts.length ? <p className="hca-muted">Nenhum material nesta categoria.</p> : null}
          </>
        ) : null}
        {step === 2 ? <BalanceExtraFields extras={extras} catalogue={products} preservedIds={preservedExtraIds}
          onChange={value => { setExtras(value); setDraftTouched(true); }} onUseCatalogue={(id, product) => includeProduct(product, id)} /> : null}
        {step === 3 ? <>
          <h2>Observações da contagem</h2>
          <p>Registre algo que ajude a família e a supervisão a entender os números.</p>
          <FormField label="Observações da contagem">
            <TextAreaField value={notes} onChange={event => { setNotes(event.currentTarget.value); setDraftTouched(true); }} maxLength={2000} />
          </FormField>
        </> : null}
        {step === 4 ? (
          <>
            <h2>Revisão da contagem</h2>
            <p>Confira as quantidades físicas e as diferenças.</p>
            <p className="hca-muted">{context.patient!.display_name} · {context.fullName} · estoque da equipe</p>
            {shiftType ? <p className="hca-muted">{shiftType} · {formatBrazilDate(assignment?.starts_at ?? null)} → {formatBrazilDate(assignment?.ends_at ?? null)}</p> : null}
            {editing?.workflow_data.reviewPolicy &&
              typeof editing.workflow_data.reviewPolicy === "object" &&
              "balReview" in editing.workflow_data.reviewPolicy ? (
              <Notice>
                {editing.workflow_data.reviewPolicy.balReview === "optional"
                  ? "Ao confirmar, as diferenças desta nova contagem serão conciliadas no estoque da equipe. A revisão é facultativa; a diferença não será registrada como consumo."
                  : "Esta contagem usa a revisão exigida na política preservada do balanço. A conciliação aguarda as novas revisões. Revisões anteriores não aprovam esta contagem."}
              </Notice>
            ) : (
              <p>
                A confirmação registra a contagem; a conciliação seguirá a
                política do paciente.
              </p>
            )}
            <BalanceReviewRows
              products={countedProducts}
              counts={counts}
              reference={reference}
            />
            <BalanceRecordedExtras extras={extras} />
            <BalanceObservationTimes content={balanceContent} />
            {notes ? <p>{notes}</p> : null}
          </>
        ) : null}
      </fieldset>
      {materialReferences.picker}
      <Dialog open={cataloguePicker} title="Incluir item não contado" onClose={() => setCataloguePicker(false)} finalFocus={cataloguePickerButtonRef}>
        <p>Selecione um material desta categoria para incluir na recontagem.</p>
        {pickableProducts.length ? <div className="hca-form-stack">
          {pickableProducts.map(product => <ActionButton key={product.id} onClick={() => includeProduct(product)}>{product.name} · {product.unit}</ActionButton>)}
        </div> : <p>Todos os materiais desta categoria já estão na contagem.</p>}
      </Dialog>
      <fieldset
        disabled={Boolean(cacheError)}
        className="min-w-0"
        aria-label="Ações da contagem"
      >
        <WizardActions
          step={step}
          total={draftFlowStages.BAL.length}
          saving={
            busy || privateDraft.busy || (privateDraft.blocked && !uncertain)
          }
          draftBusy={privateDraft.backgroundBusy}
          draftStatus={{ draft: privateDraft, current: balanceContent, hasEdits: draftTouched }}
          uncertain={uncertain}
          blocked={
            !eligible ||
            needsReferenceReview ||
            !sourceReady ||
            (!countedProducts.length && !recount) ||
            missingMaterials.length > 0 ||
            Boolean(cacheError)
          }
          onBack={previousStep}
          onNext={nextStep}
          onFinish={() => void save()}
          finishLabel={
            assignment?.kind === "recount"
              ? "Confirmar reconto"
              : "Confirmar contagem"
          }
        />
      </fieldset>
      </div>
      {uncertain && step === 0 ? (
        <ActionButton
          disabled={busy || Boolean(cacheError)}
          variant="primary"
          onClick={() => void save()}
        >
          Recuperar a mesma tentativa
        </ActionButton>
      ) : null}
    </div>
  );
}
