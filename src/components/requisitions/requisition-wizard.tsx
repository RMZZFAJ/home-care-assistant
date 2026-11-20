"use client";
import { ComplementOriginHint } from "@/components/documents/complement-origin-hint";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { RemainingNeedReference } from "./remaining-need-reference";
import {
  restoreStockObservation,
  validStockObservation,
} from "@/lib/stock-observation";
import type { RequisitionFormData, RequisitionLine, RequisitionReceipt } from "@/types/requisition";
import type { ItemContext } from "@/types/documents";
import {
  api,
  ApiError,
  buttonClass,
  Notice,
  may,
  can,
  Workspace,
  type WorkspaceContext,
} from "@/components/workspace";
import { useLongDraftAutosave } from "@/components/forms/use-long-draft-autosave";
import { useWizardMaterialReferences } from "@/components/forms/use-wizard-material-references";
import { useCreationDraft } from "@/components/forms/use-creation-draft";
import { DocumentWriteAccessNotice, useDocumentWriteAccess } from "@/components/documents/document-write-access-notice";
import { DocumentCatalogueEmpty, DocumentOpeningFailure, DocumentOpeningPending, type OpeningFailure } from "@/components/documents/document-opening-status";
import { CatalogueOpeningError, readWizardCatalogue } from "@/lib/client/wizard-catalogue";
import { requisitionDraftContent } from "@/lib/validation/creation-drafts";
import { RecurringSelection } from "./recurring-selection";
import { HouseholdListSelection, type HouseholdListSelectionHandle } from "@/components/forms/household-list-selection";
import { applyMaterialSelection } from "@/lib/requisitions/recurring-selection";
import { navigationForStep, stepForNavigation } from "@/lib/forms/draft-navigation";
import { SimpleDraftPanel } from "@/components/forms/simple-draft-panel";
import { WizardActions } from "@/components/forms/wizard-actions";
import { SupplyWizardHeading } from "@/components/forms/supply-wizard-heading";
import { SupplyWizardIdentity } from "@/components/forms/supply-wizard-identity";
import { IssuanceObservationsEditor } from "@/components/forms/issuance-observations";
import { adjacentMaterialCategory, materialCategories, supplyWizardCopy, supplyWizardStages, WizardMaterialCategories, type WizardMaterialCategory } from "@/components/forms/supply-wizard-stages";
import { Dialog, StepNavigator } from "@/components/ui/primitives";
import { ActionButton, ActionLink } from "@/components/ui/controls";
import { formatQuantity, quantity } from "@/lib/quantity";
import { RequisitionExtras } from "./requisition-extra-items";

import {
  CatalogStep,
  Review,
  type Product,
} from "./requisition-steps";
import { useOperationActivity } from "@/components/ui/operation-activity";
import { issuanceSteps } from "@/components/documents/document-issuance-result";
import { useIssuanceNavigation } from "@/components/documents/document-issuance-navigation";
import { DocumentIssuanceFailure, issuanceRecoverySteps, reconcileIssuance, useIssuanceFailure } from "@/components/documents/document-issuance-failure";

// Keep the stored REQ category positions while presenting the shared five stages.
const stageStart = [0, 1, 4, 5, 6];
export function RequisitionWizard() {
  const sourceId = useSearchParams().get("sourceRequisitionId");
  return (
    <Workspace title={supplyWizardCopy.REQ.title} compact
      heading={context => <SupplyWizardHeading kind="REQ" patient={context.patient!.display_name} />}>
      {(context) =>
        context.patient ? (
          <PatientRequisition
            key={
              context.userId +
              ":" +
              context.patient.id +
              ":" +
              (sourceId ?? "new")
            }
            context={context}
            sourceId={sourceId}
          />
        ) : (
          <Notice>Selecione um paciente para iniciar.</Notice>
        )
      }
    </Workspace>
  );
}
function PatientRequisition({
  context,
  sourceId,
}: {
  context: WorkspaceContext;
  sourceId: string | null;
}) {
  const [sourceReady, setSourceReady] = useState(!sourceId);
  const [sourceAttempt, setSourceAttempt] = useState(0);
  const [step, setStep] = useState(0);
  const householdSelectionRef = useRef<HouseholdListSelectionHandle>(null);
  const [form, setForm] = useState<RequisitionFormData>({
    lines: [],
    extraItems: [],
    observations: [],
  });
  const { navigating, openIssued } = useIssuanceNavigation(context.userId, context.patient!.id);
  const [issuedDocumentId, setIssuedDocumentId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  useOperationActivity(saving || navigating, {
    title: uncertain ? "Consultando a emissão" : "Emissão da requisição",
    stage: navigating ? 1 : 0, steps: uncertain ? issuanceRecoverySteps : issuanceSteps,
    detail: navigating ? "A requisição foi registrada. Estamos abrindo a ficha."
      : uncertain ? "Aguarde a confirmação desta tentativa." : "Estamos registrando a requisição e conferindo a contagem informada.",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const fieldsRef = useRef<HTMLDivElement>(null), focusErrorRef = useRef<string | null>(null);
  useEffect(() => {
    if (!focusErrorRef.current) return;
    const target = [...(fieldsRef.current?.querySelectorAll<HTMLElement>('[data-field-error]') ?? [])].find(element => element.dataset.fieldError === focusErrorRef.current) ?? fieldsRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
    if (target) {
      // Keep the invalid field clear of the fixed header and mobile navigation.
      target.focus({ preventScroll: true });
      target.scrollIntoView({ behavior: "instant", block: "center", inline: "nearest" });
      focusErrorRef.current = null;
    }
  }, [step, fieldErrors]);
  const frozenRef = useRef<(RequisitionFormData & {
    careRecipientId: string;
    idempotencyKey: string;
    draftCommit?: { id: string; revision: number };
  }) | null>(null);
  const issuanceFailure = useIssuanceFailure();
  const [products, setProducts] = useState<Product[]>([]);
  const [itemContext, setItemContext] = useState<ItemContext[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const [openingFailure, setOpeningFailure] = useState<OpeningFailure | null>(null);
  const [catalogueTotal, setCatalogueTotal] = useState<number | null>(null);
  const [catalogueWasAvailable, setCatalogueWasAvailable] = useState(false);
  const [catalogAttempt, setCatalogAttempt] = useState(0);
  const [reviewStock, setReviewStock] = useState(false);
  const contextByProduct = useMemo(
    () => new Map(itemContext.map((item) => [item.productId, item])),
    [itemContext],
  );
  const storageKey =
    "hca:v2:requisition:" +
    context.userId +
    ":" +
    context.patient!.id +
    (sourceId ? ":remaining:" + sourceId : "");
  const [draftTouched, setDraftTouched] = useState(false);
  const materialReferences = useWizardMaterialReferences(context.patient!.id, "REQ", () => setDraftTouched(true));
  const draftContent = {
    lines: form.lines,
    extraItems: form.extraItems,
    observations: form.observations,
    ...(materialReferences.links.length ? { materialReferences: materialReferences.links } : {}),
    ...(form.remainingNeed ? { remainingNeed: form.remainingNeed } : {}),
  };
  const privateDraft = useCreationDraft({
    userId: context.userId,
    patientId: context.patient!.id,
    kind: "REQ",
    navigation: navigationForStep("REQ", step),
    enabled: can(context, "req.read"),
    onResume: (draft) => {
      if (!draft.content || !("lines" in draft.content)) return false;
      if ((draft.content.remainingNeed?.requisitionId ?? null) !== sourceId)
        return false;
      const { materialReferences: links, ...rest } = draft.content;
      materialReferences.setLinks(links ?? []);
      setForm({
        ...rest,
        lines: draft.content.lines.map((line) => {
          const product = products.find((item) => item.id === line.productId);
          return product
            ? {
                ...line,
                productName: product.name,
                unit: product.unit,
                category: product.category,
              }
            : line;
        }),
      });
      setStep(stepForNavigation("REQ", draft.navigation));
      setError("");
      setFieldErrors({});
      return true;
    },
    onDiscard: () => {
      setDraftTouched(false);
      materialReferences.setLinks([]);
      setForm({ lines: [], extraItems: [], observations: [] });
      setStep(0);
      setFieldErrors({});
      sessionStorage.removeItem(storageKey);
    },
  });

  const canWrite = may(context, "request");
  const writeAccess = useDocumentWriteAccess(canWrite);
  const consultationRef = useRef<HTMLAnchorElement>(null);
  useLongDraftAutosave(
    privateDraft,
    draftContent,
    canWrite && draftTouched && !saving && !uncertain && requisitionDraftContent.safeParse(draftContent).success,
  );
  const offeredSource =
    privateDraft.offered?.content && "lines" in privateDraft.offered.content
      ? (privateDraft.offered.content.remainingNeed?.requisitionId ?? null)
      : null;
  const resumeHref =
    privateDraft.offered && offeredSource !== sourceId
      ? `/fichas/req?careRecipientId=${context.patient!.id}${offeredSource ? "&sourceRequisitionId=" + offeredSource : ""}`
      : undefined;
  const missingProducts = form.lines.filter(
    (line) => !products.some((item) => item.id === line.productId),
  );
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const raw = sessionStorage.getItem(storageKey);
        if (!raw) return;
        const saved = JSON.parse(raw);
        if (
          (saved.form?.careRecipientId &&
            saved.form.careRecipientId !== context.patient!.id)
        ) {
          sessionStorage.removeItem(storageKey);
          return;
        }
        if (
          saved.form &&
          Array.isArray(saved.form.lines) &&
          Array.isArray(saved.form.extraItems) &&
          Array.isArray(saved.form.observations)
        ) {
          setForm({
            ...saved.form,
            lines: saved.form.lines.map(restoreStockObservation),
            extraItems: saved.form.extraItems.map(restoreStockObservation),
          });
          setMessage(saved.intent
            ? "Tentativa desta aba recuperada. Consulte a mesma tentativa antes de iniciar outra requisição."
            : "Preenchimento desta aba recuperado.");
          if (saved.intent) {
            frozenRef.current = saved.intent;
            setStep(6);
            setUncertain(true);
          }
        }
      } catch {
        /* Optional local recovery cannot authorize an operation. */
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [storageKey, context.patient]);
  useEffect(() => {
    const controller = new AbortController();
    readWizardCatalogue(context.patient!.id, controller.signal)
      .then(async ({ data: items, total }) => {
        const info = items.length ? await api<{ data: ItemContext[] }>(
          "/api/requisitions/item-context?careRecipientId=" +
            context.patient!.id +
            "&productIds=" +
            items.map((item) => encodeURIComponent(item.id)).join(","),
          undefined,
          controller.signal,
        ) : { data: [] };
        if (!Array.isArray(info.data)) throw new Error("Não foi possível conferir a referência de materiais.");
        if (!controller.signal.aborted) {
          setProducts(items);
          setItemContext(info.data);
          setCatalogError("");
          setOpeningFailure(null);
          setCatalogueTotal(total);
          if (items.length) setCatalogueWasAvailable(true);
        }
      })
      .catch((reason) => {
        if (!controller.signal.aborted) {
          setOpeningFailure(reason instanceof CatalogueOpeningError
            ? { source: "catalogue", cause: reason.cause }
            : { source: "reference", cause: reason });
          setCatalogError(
            reason instanceof Error
              ? reason.message
              : "Não foi possível carregar o catálogo.",
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingCatalog(false);
      });
    return () => controller.abort();
  }, [context.patient, catalogAttempt]);
  useEffect(() => {
    if (issuedDocumentId || uncertain || saving || loadingCatalog) return;
    const timer = window.setTimeout(() => {
      if (frozenRef.current) return;
      try {
        sessionStorage.setItem(
          storageKey,
          JSON.stringify({ savedAt: Date.now(), form }),
        );
      } catch {
        /* In-memory draft remains available. */
      }
    }, 500);
    return () => window.clearTimeout(timer);
  }, [form, issuedDocumentId, loadingCatalog, saving, storageKey, uncertain]);
  const currentCategory = materialCategories[step - 1]?.id;
  const stage = currentCategory ? 1 : stageStart.indexOf(step);
  function openCategory(category: WizardMaterialCategory) {
    setStep(materialCategories.findIndex(entry => entry.id === category) + 1);
  }
  const categoryItems = useMemo(
    () => products.filter((item) => item.category === currentCategory),
    [products, currentCategory],
  );
  const selected = (id: string) =>
    form.lines.find((line) => line.productId === id);
  function stockReferenceFor(productId: string) {
    const current = contextByProduct.get(productId);
    if (current?.teamStockReference)
      return { token: current.teamStockReference, quantity: current.teamStock ?? null };
  }
  function newStockObservation(productId: string) {
    const stockReference = stockReferenceFor(productId);
    const teamStock = stockReference?.quantity;
    const prefilledStock = teamStock != null && Number(teamStock) >= 0 && Number(teamStock) <= 100000
      ? teamStock
      : null;
    return {
      currentStock: prefilledStock,
      stockObservation: prefilledStock === null ? "unfilled" as const : "observed" as const,
      stockObservationAt: prefilledStock === null ? null : new Date().toISOString(),
      ...(stockReference ? { stockReference } : {}),
    };
  }
  const stockReviewLines = form.lines.filter((line) =>
    line.stockObservation === "observed" &&
    (!line.stockReference || line.stockReference.token !== contextByProduct.get(line.productId)?.teamStockReference),
  );
  function openStockReview(refresh: boolean) {
    setReviewStock(true);
    if (refresh) {
      setLoadingCatalog(true);
      setCatalogAttempt((attempt) => attempt + 1);
    }
  }
  function updateLine(item: Product, patch: Partial<RequisitionLine>) {
    setDraftTouched(true);
    setForm((current) => {
      const existing = current.lines.find((line) => line.productId === item.id);
      return {
        ...current,
        lines: existing
          ? current.lines.map((line) =>
              line.productId === item.id ? { ...line, ...patch } : line,
            )
          : [
              ...current.lines,
              {
                productId: item.id,
                productName: item.name,
                category: item.category,
                unit: item.unit,
                ...newStockObservation(item.id),
                urgent: false,
                ...patch,
              },
            ],
      };
    });
  }
  function removeLine(id: string) {
    setDraftTouched(true);
    materialReferences.remove(id);
    setForm((current) => ({
      ...current,
      lines: current.lines.filter((line) => line.productId !== id),
    }));
  }
  function validate(all = false) {
    const errors: Record<string, string> = {};
    if (missingProducts.length)
      errors.catalog =
        "Há materiais fora do catálogo ativo. Confira e remova-os antes de emitir.";
    if (sourceId && (all || step === 0)) {
      if (!sourceReady || form.remainingNeed?.requisitionId !== sourceId)
        errors.remainingSource =
          "Consulte e escolha a referência da requisição de origem.";
      else if (
        [...form.remainingNeed.reason.trim()].length < 3 ||
        form.remainingNeed.reason.trim().length > 1000
      )
        errors.remainingNeed =
          "Informe o motivo da necessidade remanescente, entre3 e1000 caracteres.";
    }
    const linesToValidate = all ? form.lines : form.lines.filter(line =>
      currentCategory ? line.category === currentCategory && !line.catalogueExtra : step === 4 && line.catalogueExtra);
    for (const line of linesToValidate) {
      if (
        !validStockObservation(
          line,
          products.find((item) => item.id === line.productId)
            ?.quantity_decimals ?? 0,
        )
      )
        errors[line.productId] =
          line.stockObservation === "legacy_unclassified"
            ? "Confirme como informar a observação recuperada do rascunho antigo."
            : "Revise a informação do estoque e a precisão da unidade.";
      if (
        itemContext.find((item) => item.productId === line.productId)?.pending
          .length &&
        ((line.repeatReason?.trim().length ?? 0) < 3 || (line.repeatReason?.trim().length ?? 0) > 1000)
      )
        errors[line.productId + ":repeat"] =
          "Justifique a nova requisição deste produto, entre três e 1.000 caracteres.";
    }
    if (all || step === 4) for (const item of form.extraItems) {
      if (!item.name.trim()) errors[item.id + ":name"] = "Informe o nome do item extra ou remova-o.";
      if (!item.identification) errors[item.id + ":unit"] = "Confirme a unidade de medida do item extra.";
      if (!validStockObservation(item)) errors[item.id + ":stock"] = "Revise a informação de estoque deste item extra.";
    }
    if (all || step === 5) form.observations.forEach((item, index) => {
      if (!item.trim()) errors["observation:" + index] = "Preencha a observação ou remova-a.";
      else if (item.length > 1000) errors["observation:" + index] = "A observação deve ter até 1.000 caracteres.";
    });
    if (all && !form.lines.length && !form.extraItems.length)
      errors.lines = "Selecione ao menos um item.";
    setFieldErrors(errors);
    if (
      !may(context, "request") ||
      loadingCatalog ||
      catalogError ||
      Object.keys(errors).length
    ) {
      const key = Object.keys(errors)[0];
      setError(key?.startsWith("observation:") ? "" : Object.values(errors)[0] ?? "Aguarde o catálogo e confira seu acesso.");
      const product = products.find((item) => key === item.id || key === item.id + ":repeat");
      if (product)
        setStep(selected(product.id)?.catalogueExtra ? 4 : materialCategories.findIndex(category => category.id === product.category) + 1);
      else if (all && key) {
        if (form.extraItems.some(item => key.startsWith(item.id + ":"))) setStep(4);
        else if (key.startsWith("observation:")) setStep(5);
        else if (key.startsWith("remaining")) setStep(0);
        else if (key === "lines" || key === "catalog") setStep(1);
      }
      focusErrorRef.current = key ?? null;
      return false;
    }
    setError("");
    return true;
  }
  async function submit() {
    if (saving) return;
    if (!frozenRef.current && (privateDraft.blocked || privateDraft.backgroundBusy || !validate(true))) return;
    if (!frozenRef.current && stockReviewLines.length) {
      openStockReview(false);
      return;
    }
    const savedDraft = !frozenRef.current ? await privateDraft.save(structuredClone(draftContent)) : null;
    if (!frozenRef.current && !savedDraft) return;
    if (!frozenRef.current)
      frozenRef.current = {
        ...form,
        ...(savedDraft
          ? { draftCommit: { id: savedDraft.id, revision: savedDraft.revision } }
          : {}),
        careRecipientId: context.patient!.id,
        idempotencyKey: crypto.randomUUID(),
      };
    try {
      sessionStorage.setItem(
        storageKey,
        JSON.stringify({
          savedAt: Date.now(),
          form,
          intent: frozenRef.current,
        }),
      );
    } catch {
      /* Retained in memory. */
    }
    setSaving(true);
    setError("");
    try {
      const intent = frozenRef.current;
      let issuedId: string | undefined;
      if (uncertain && intent.draftCommit) {
        const resolution = await reconcileIssuance(context.patient!.id, intent.draftCommit, intent.idempotencyKey);
        if (resolution.state === "not_applied") {
          frozenRef.current = null;
          try { sessionStorage.removeItem(storageKey); } catch { /* The server has closed the old key. */ }
          setUncertain(false);
          issuanceFailure.report({ outcome: "rejected", cause: issuanceFailure.failure?.cause,
            draftSaved: resolution.draftSaved, retryable: resolution.draftSaved && may(context, "request") });
          return;
        }
        issuedId = resolution.documentId;
      } else {
        const body = await api<{ receipt: RequisitionReceipt }>("/api/requisitions", intent);
        issuedId = body.receipt?.requisitionId;
      }
      if (!issuedId)
        throw new Error(
          "Consulte o histórico ou recupere esta tentativa para confirmar o comprovante.",
        );
      openIssued(issuedId);
      setIssuedDocumentId(issuedId);
      setUncertain(false);
      issuanceFailure.clear();
      try { sessionStorage.removeItem(storageKey); } catch { /* A missing storage API does not change the confirmed receipt. */ }
    } catch (reason) {
      const rejected =
        !uncertain && reason instanceof ApiError &&
        ([400, 403, 404, 413, 422].includes(reason.status) ||
          reason.code === "DRAFT_VERSION_CONFLICT" ||
          reason.code === "VERSION_CONFLICT" ||
          reason.code === "MATERIAL_REFERENCE_CHANGED" ||
          reason.code === "REQUEST_STOCK_CHANGED" ||
          reason.code === "DUPLICATE_REVIEW_REQUIRED");
      if (rejected) {
        if (
          reason instanceof ApiError &&
          reason.code === "DRAFT_VERSION_CONFLICT"
        ) {
          await privateDraft.reportConflict();
          setStep(0);
        }
        if (
          reason instanceof ApiError &&
          reason.code === "VERSION_CONFLICT" &&
          sourceId
        ) {
          setSourceAttempt((value) => value + 1);
          setStep(0);
        }
        frozenRef.current = null;
        try { sessionStorage.removeItem(storageKey); } catch { /* Storage may be unavailable. */ }
        if (reason instanceof ApiError && reason.code === "REQUEST_STOCK_CHANGED")
          openStockReview(true);
        if (
          reason instanceof ApiError &&
          reason.code === "DUPLICATE_REVIEW_REQUIRED"
        ) {
          setCatalogAttempt((value) => value + 1);
          setStep(1);
        }
      }
      setUncertain(!rejected);
      if (rejected) {
        issuanceFailure.clear();
        setError(reason.message);
      } else {
        issuanceFailure.report({ outcome: "uncertain", cause: reason });
      }
    } finally {
      setSaving(false);
    }
  }
  if (privateDraft.readDenied)
    return (
      <Notice error>
        Seu acesso ao rascunho foi encerrado. Selecione um vínculo autorizado.
      </Notice>
    );
  if (!can(context, "req.read"))
    return <Notice>Seu acesso à requisição foi encerrado.</Notice>;
  if (issuedDocumentId)
    return <Notice>Requisição registrada. <ActionButton onClick={() => openIssued(issuedDocumentId)}>Abrir ficha</ActionButton></Notice>;
  function includeMaterials(ids: string[]) {
    setForm(current => {
      const existing = new Set(current.lines.map(line => line.productId));
      const { lines } = applyMaterialSelection(current.lines, ids, products);
      return { ...current, lines: lines.map(line => existing.has(line.productId) ? line : { ...line, ...newStockObservation(line.productId) }) };
    });
    setDraftTouched(true);
  }
  const selectionLibrary = (readonly = false) => <details className="hca-household-personal">
    <summary>Minhas listas pessoais</summary>
    <RecurringSelection key={context.userId+":"+context.patient!.id} userId={context.userId} patientId={context.patient!.id} catalogue={products} lines={form.lines}
    disabled={readonly||saving||uncertain||loadingCatalog||Boolean(catalogError)||privateDraft.blocked||!may(context,"request")} canSave={may(context,"request")}
    cataloguePending={loadingCatalog} catalogueError={catalogError} onRefresh={()=>{setLoadingCatalog(true);setCatalogAttempt(value=>value+1);}}
    onApply={includeMaterials}/>
  </details>;
  if (
    !canWrite &&
    !uncertain &&
    !privateDraft.pending
  )
    return (
      <div className="hca-form-stack">
        <Notice>Seu vínculo permite consultar as fichas autorizadas no histórico.</Notice>
        <div><ActionLink ref={consultationRef} href={sourceId ? "/fichas/" + sourceId : "/historico"}>Consultar fichas autorizadas</ActionLink></div>
        {selectionLibrary(true)}
        <DocumentWriteAccessNotice {...writeAccess} draftSaved={privateDraft.base?.state === "active"} consultationRef={consultationRef} />
      </div>
    );
  if (!uncertain && !privateDraft.pending && !privateDraft.consumed) {
    if (catalogueTotal === null) {
      if (loadingCatalog || !openingFailure) return <DocumentOpeningPending />;
      return <DocumentOpeningFailure failure={openingFailure} attempts={catalogAttempt} operation="Abrir requisição"
        back={sourceId ? "/fichas/" + sourceId : "/fichas"} onRetry={() => {
          setLoadingCatalog(true);
          setCatalogAttempt(current => current + 1);
        }} />;
    }
    if (!loadingCatalog && !catalogError && !catalogueWasAvailable && !products.length && !draftTouched && step === 0)
      return <DocumentCatalogueEmpty patientId={context.patient!.id} patientName={context.patient!.display_name}
        mayManage={can(context, "catalog.manage")} hasInactive={catalogueTotal > 0} />;
  }
  const extraEditor = <RequisitionExtras showItems={step === 4} errors={fieldErrors}
    items={form.extraItems} products={products} lines={form.lines} itemContext={itemContext}
    updateLine={updateLine} removeLine={removeLine}
    setItems={extraItems => {
      setDraftTouched(true);
      setForm(current => ({ ...current, extraItems }));
    }}
    adopt={(product, extra, details) => {
      updateLine(product, {
        ...(extra.stockObservationAt ? {
          currentStock: extra.currentStock,
          stockObservation: extra.stockObservation,
          stockObservationAt: extra.stockObservationAt,
        } : {}),
        urgent: extra.urgent,
      });
      setForm(current => ({ ...current, extraItems: current.extraItems.filter(item => item.id !== extra.id),
        observations: details ? [...current.observations, details] : current.observations }));
      openCategory(product.category);
    }} />;
  return (
    <div ref={fieldsRef} onChangeCapture={event => {
      if (event.currentTarget.contains(event.target as Node)) setDraftTouched(true);
    }} className="hca-document-wizard min-w-0 space-y-5">
      {materialReferences.picker}
      <Dialog open={reviewStock} title="Confira o estoque da equipe" onClose={() => setReviewStock(false)}>
        {loadingCatalog ? <p role="status">Consultando o estoque atual…</p> : catalogError ? (
          <Notice error>{catalogError}</Notice>
        ) : (
          <>
            <p>Sua contagem foi preservada. Confira os valores antes de emitir a requisição.</p>
            <ul className="my-4 space-y-3">
              {stockReviewLines.map((line) => {
                const current = stockReferenceFor(line.productId);
                const canCompare = current?.quantity != null;
                const unit = products.find((product) => product.id === line.productId)?.unit;
                const difference = current?.quantity != null && line.currentStock != null
                  ? quantity(line.currentStock).minus(current.quantity)
                  : null;
                return <li key={line.productId} className="ui-card">
                  <strong>{line.productName}</strong>
                  <dl className="mt-2 grid grid-cols-2 gap-2">
                    <dt>Saldo na referência anterior</dt>
                    <dd>{canCompare ? <s>{formatQuantity(line.stockReference?.quantity, line.unit)}</s> : "Indisponível"}</dd>
                    <dt>Saldo atual da equipe</dt>
                    <dd>{canCompare ? formatQuantity(current.quantity, unit) : "Indisponível"}</dd>
                    <dt>Sua contagem</dt>
                    <dd>{formatQuantity(line.currentStock, line.unit)}</dd>
                    {difference && line.unit === unit ? <>
                      <dt>Ajuste na emissão</dt>
                      <dd>{difference.isPositive() ? "+" : ""}{formatQuantity(difference.toFixed(), unit)}</dd>
                    </> : null}
                  </dl>
                  {unit && unit !== line.unit ? <p>Confira a contagem na unidade atual, {unit}.</p> : null}
                </li>;
              })}
            </ul>
          </>
        )}
        <div className="flex flex-wrap gap-2">
          <ActionButton type="button" onClick={() => setReviewStock(false)}>Voltar</ActionButton>
          <ActionButton type="button" variant="primary"
            disabled={loadingCatalog || Boolean(catalogError) || stockReviewLines.some((line) => !stockReferenceFor(line.productId))}
            onClick={() => {
              const changed = new Set(stockReviewLines.map((line) => line.productId));
              setForm((current) => ({ ...current, lines: current.lines.map((line) =>
                changed.has(line.productId) ? {
                  ...line,
                  unit: products.find((product) => product.id === line.productId)?.unit,
                  stockReference: stockReferenceFor(line.productId),
                } : line) }));
              setDraftTouched(true);
              setReviewStock(false);
              setError("");
            }}>
            Usar referência atual
          </ActionButton>
        </div>
      </Dialog>
      <ComplementOriginHint />
      {!uncertain ? <SimpleDraftPanel
        draft={privateDraft}
        current={draftContent}
        statusInFooter
        patientName={context.patient!.display_name}
        resumeHref={resumeHref}
        disabled={saving || uncertain || loadingCatalog}
      /> : null}
      {missingProducts.length ? (
        <Notice error>
          Materiais do preenchimento que não estão no catálogo ativo:{" "}
          {missingProducts.map((line) => (
            <div key={line.productId}>
              {line.productName}
              <button
                className={buttonClass}
                disabled={
                  saving ||
                  uncertain ||
                  privateDraft.blocked ||
                  !may(context, "request")
                }
                onClick={() => removeLine(line.productId)}
              >
                Remover material indisponível
              </button>
            </div>
          ))}
        </Notice>
      ) : null}
      {sourceId ? (
        <RemainingNeedReference
          sourceId={sourceId}
          patientId={context.patient!.id}
          value={form.remainingNeed}
          onChange={(remainingNeed) =>
            setForm((current) => ({ ...current, remainingNeed }))
          }
          readonly={
            step !== 0 ||
            uncertain ||
            saving ||
            privateDraft.blocked ||
            !may(context, "request")
          }
          attempt={sourceAttempt}
          onReady={setSourceReady}
          reasonError={fieldErrors.remainingNeed}
        />
      ) : null}
      {message ? <Notice>{message}</Notice> : null}
      {catalogError ? (
        <Notice error>
          {catalogError}
          <button
            className={buttonClass}
            onClick={() => {
              setLoadingCatalog(true);
              setCatalogAttempt((value) => value + 1);
            }}
          >
            Recarregar catálogo
          </button>
        </Notice>
      ) : null}
        <section className="hca-supply-wizard-card">
          <StepNavigator
            steps={supplyWizardStages}
            active={stage}
            compact
            onChange={nextStage => {
              if (nextStage === stage) return;
              issuanceFailure.clear();
              setStep(stageStart[nextStage]);
            }}
            disabled={uncertain || saving || loadingCatalog || privateDraft.blocked}
            label="Etapas da requisição"
          />
          <div className="hca-supply-wizard-body">
          <h2 className="my-4 text-xl font-semibold">{currentCategory ? "Informe o estoque atual" : step === 0 ? "Confirme os dados da ficha" : step === 4 ? "Itens extras" : supplyWizardStages[stage]}</h2>
          {currentCategory ? <p className="hca-field-help">Confira o saldo sugerido em cada material e ajuste após a contagem da equipe.</p> : null}
          <fieldset
            disabled={
              saving ||
              uncertain ||
              privateDraft.blocked ||
              !may(context, "request") ||
              Boolean(catalogError)
            }
            className="min-w-0"
          >
            {step === 0 ? <>
              <SupplyWizardIdentity context={context} kind="REQ" />
              <p className="hca-wizard-intro">Ao emitir, as contagens informadas atualizam o estoque da equipe. A requisição registra as necessidades de materiais.</p>
              <HouseholdListSelection ref={householdSelectionRef} key={context.userId + ":" + context.patient!.id}
                userId={context.userId} patientId={context.patient!.id} kind="REQ"
                catalogue={products} selectedIds={form.lines.map(line => line.productId)}
                disabled={saving || uncertain || loadingCatalog || Boolean(catalogError) || privateDraft.blocked || !canWrite}
                onApply={includeMaterials} personalLists={selectionLibrary()} />
            </> : null}
            {currentCategory ? <>
              <WizardMaterialCategories
                category={currentCategory}
                selected={form.lines}
                onChange={openCategory}
              />
            </> : null}
            {currentCategory ? <CatalogStep key={currentCategory} context={context} items={categoryItems}
              itemContext={itemContext} selected={selected} updateLine={updateLine} removeLine={removeLine}
              onLink={materialReferences.open} linkedCount={materialReferences.count}
              errors={fieldErrors} selectedCount={form.lines.length + form.extraItems.length} extras={extraEditor} /> : null}
            {step === 4 ? extraEditor : null}
            {step === 5 ? (
              <IssuanceObservationsEditor
                errors={fieldErrors}
                observations={form.observations}
                limitInput={false}
                onChange={observations => {
                  setDraftTouched(true);
                  setForm(current => ({ ...current, observations }));
                  setFieldErrors(current => Object.fromEntries(Object.entries(current).filter(([name]) => !name.startsWith("observation:"))));
                  setError("");
                }}
              />
            ) : null}
            {step === 6 ? (
              <Review
                context={context}
                form={form}
                recipientName={context.patient!.display_name}
                requesterName={context.fullName}
                onEditCategory={openCategory}
                onEditExtras={() => setStep(4)}
                onEditObservations={() => {
                  setStep(5);
                  requestAnimationFrame(() => {
                    const editor = fieldsRef.current?.querySelector(".hca-issuance-observations");
                    const control = editor?.querySelector("textarea") ?? editor?.querySelector("button");
                    control?.focus({ preventScroll: true });
                    control?.scrollIntoView({ block: "center", inline: "nearest" });
                  });
                }}
              />
            ) : null}
          </fieldset>
          {error ? <Notice error>{error}</Notice> : null}
          {uncertain ? (
            <Notice>
              Confirme a tentativa preservada antes de iniciar outra requisição.
              Nenhum dado será reenviado com uma chave nova.
            </Notice>
          ) : null}
          </div>
          <WizardActions
            step={stage}
            total={supplyWizardStages.length}
            saving={
              saving ||
              privateDraft.busy ||
              (privateDraft.blocked && !uncertain) ||
              (!may(context, "request") && !uncertain)
            }
            draftBusy={privateDraft.backgroundBusy}
            supply={{ kind: "REQ", draft: privateDraft, current: draftContent, hasEdits: draftTouched,
              exitHref: sourceId ? "/fichas/" + encodeURIComponent(sourceId) : "/fichas" }}
            uncertain={uncertain}
            blocked={loadingCatalog || Boolean(catalogError) || Boolean(sourceId && !sourceReady)}
            onBack={() => {
              issuanceFailure.clear();
              const previous = currentCategory && adjacentMaterialCategory(currentCategory, products, "previous");
              if (previous) openCategory(previous);
              else setStep(step === 4 ? materialCategories.length : stageStart[stage - 1]);
            }}
            onNext={() => {
              if (!validate() || step === 0 && householdSelectionRef.current?.apply() === false) return;
              const next = (step === 0 || currentCategory) && adjacentMaterialCategory(currentCategory, products, "next");
              if (next) openCategory(next);
              else setStep(stageStart[stage + 1]);
            }}
            onFinish={() => { if (!issuanceFailure.reopen()) void submit(); }}
          />
          <DocumentIssuanceFailure state={issuanceFailure} operation="Emissão de requisição" onRetry={submit} />
        </section>
    </div>
  );
}
