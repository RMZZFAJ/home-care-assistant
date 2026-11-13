"use client";
import { ComplementOriginHint } from "@/components/documents/complement-origin-hint";
import { DocumentActions } from "./document-actions";
import { RequisitionOpening } from "@/components/requisitions/requisition-opening";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type SetStateAction,
} from "react";
import {
  api,
  ApiError,
  buttonClass,
  can,
  Notice,
  primaryClass,
  Workspace,
  type WorkspaceContext,
} from "@/components/workspace";
import { DocumentDeliveryStatus } from "@/components/notifications/document-delivery-status";
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
import type { BalanceCountReference } from "@/types/balances";
import { parseBalanceCountReference } from "@/lib/validation/balances";
import { BalanceReviewRows } from "@/components/balances/balance-count-fields";
import {
  balanceDraftContent,
  type BalanceDraftContent,
} from "@/lib/validation/creation-drafts";
import {
  beginBalanceObservation,
  sameBalanceContext,
} from "@/lib/balances/observation-continuity";
import {
  BalancePreviousObservations,
  BalanceReferenceReview,
} from "@/components/balances/observation-continuity";
import type { SupplyDraftContent } from "@/lib/validation/supply-drafts";
import { requireSupplyConfirmation } from "@/lib/validation/supply-confirmation";
import { WizardActions } from "@/components/forms/wizard-actions";
import { StepNavigator, Icon } from "@/components/ui/primitives";
import { SupplyWizardStep, type WizardState } from "./supply-wizard-step";
import { formatQuantity, quantity, validQuantity } from "@/lib/quantity";
import { useScopedRead } from "@/lib/use-scoped-read";
import type { PresentationsRead } from "@/types/catalogue";
import { readPresentationConversions } from "@/lib/presentation-conversion";
import { presentationTotal } from "./presentation-quantity";
import {
  documentLabels,
  type CatalogProduct,
  type DraftLine,
  type PatientPerson,
  type SupplyDocument,
  type SupplyPayload,
  type SupplyType,
  type ItemContext,
  type DeliveryPreparation,
} from "@/types/documents";

const steps = draftFlowStages.SUPPLY.map((stage) => stage.label);
type SourceRequest = {
  care_recipient_id: string;
  is_historical?: boolean;
  requisition_items: {
    id: string;
    product_id: string | null;
    resolution?: { product_id: string; } | null;
  }[];
};
export function SupplyWizard({ type }: { type: SupplyType; }) {
  const params = useSearchParams();
  return (
    <Workspace title={documentLabels[type]} compact>
      {(context) => {
        if (!context.patient)
          return <Notice>Selecione um paciente para abrir uma ficha.</Notice>;
        const wizard = (
          <PatientSupplyWizard
            key={context.patient.id + params.toString()}
            context={context}
            type={type}
            requisitionId={params.get("requisitionId")}
            documentId={params.get("documentId")}
            recount={params.get("recount") === "true"}
          />
        );
        const requisitionId = params.get("requisitionId");
        return requisitionId ? (
          <RequisitionOpening
            key={context.patient.id + params.toString()}
            id={requisitionId}
          >
            {wizard}
          </RequisitionOpening>
        ) : (
          wizard
        );
      }}
    </Workspace>
  );
}
export function PatientSupplyWizard({
  context,
  type,
  requisitionId,
  documentId,
  recount,
}: {
  context: WorkspaceContext;
  type: SupplyType;
  requisitionId: string | null;
  documentId: string | null;
  recount: boolean;
}) {
  const [step, setStep] = useState(0);
  const [catalog, setCatalog] = useState<CatalogProduct[]>([]);
  const [people, setPeople] = useState<PatientPerson[]>([]);
  const [recipientContext, setRecipientContext] =
    useState<DeliveryPreparation | null>(null);
  const recipientContextRef = useRef<DeliveryPreparation | null>(null);
  const [recipientComparison, setRecipientComparison] =
    useState<DeliveryPreparation | null>(null);
  const [recipientError, setRecipientError] = useState("");
  const [recipientPending, setRecipientPending] = useState(false);
  const [recipientLoadedSource, setRecipientLoadedSource] = useState("");
  const [recipientAttempt, setRecipientAttempt] = useState(0);
  const [form, setForm] = useState<WizardState>({
    quantities: {},
    notes: "",
    origin: "",
    source: "FAMILY",
    recipientId: "",
    recipientReason: "",
  });
  const [links, setLinks] = useState<Record<string, string[]>>({});
  const [requestOptions, setRequestOptions] = useState<ItemContext[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState<SupplyDocument | null>(null);
  const [saved, setSaved] = useState<SupplyDocument | null>(null);
  const [uncertain, setUncertain] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const frozenRef = useRef<{
    payload: SupplyPayload;
    key: string;
    draft: boolean;
    submissionKey: string;
    expectedVersion?: number;
    draftCommit?: { id: string; revision: number; };
  } | null>(null);
  const storageKey =
    "hca:v2:draft:" +
    type +
    ":" +
    context.userId +
    ":" +
    context.patient!.id +
    ":" +
    (documentId ?? "new") +
    ":" +
    (requisitionId ?? "standalone") +
    ":" +
    (recount ? "recount" : "edit");
  const canReadRequests = can(context, "req.read");
  const allowed = can(
    context,
    type === "BAL" ? "bal.count" : type.toLowerCase() + ".create",
  );
  const patientId = context.patient!.id;
  const presentations = useScopedRead<PresentationsRead>(
    type !== "BAL"
      ? `/api/catalog/presentations?careRecipientId=${patientId}`
      : null,
  );
  const [legacyReference, setLegacyReference] =
    useState<BalanceCountReference | null>(null);
  const [staleLegacyReference, setStaleLegacyReference] = useState(false);
  const [legacyOpeningKey, setLegacyOpeningKey] = useState<string | null>(null);
  const [draftMaterials, setDraftMaterials] = useState<
    BalanceDraftContent["materials"]
  >([]);
  const [preservedBalanceContext, setPreservedBalanceContext] = useState<
    BalanceDraftContent["context"] | null
  >(null);
  const [previousObservations, setPreviousObservations] =
    useState<BalanceDraftContent["previousObservations"]>(undefined);
  const currentBalanceContext = useMemo<BalanceDraftContent["context"]>(
    () => ({
      mode: "legacy",
      documentId: editing?.id ?? null,
      documentVersion: editing?.version ?? null,
      assignmentId: null,
      assignmentVersion: null,
      referenceRevision: legacyReference?.revision ?? null,
    }),
    [editing?.id, editing?.version, legacyReference?.revision],
  );
  const needsBalanceReview =
    type === "BAL" &&
    (staleLegacyReference ||
      (preservedBalanceContext !== null &&
        !sameBalanceContext(preservedBalanceContext, currentBalanceContext)));
  const balanceContent = useMemo<BalanceDraftContent>(
    () => ({
      counts: form.quantities,
      observationTimes: form.observationTimes ?? {},
      notes: form.notes,
      materials: [
        ...draftMaterials,
        ...catalog
          .filter((product) => !draftMaterials.some((m) => m.id === product.id))
          .map((product) => ({
            id: product.id,
            name: product.name,
            unit: product.unit,
            quantityDecimals: product.quantity_decimals ?? 0,
          })),
      ],
      context: preservedBalanceContext ?? currentBalanceContext,
      ...(previousObservations ? { previousObservations } : {}),
    }),
    [
      form.quantities,
      form.observationTimes,
      form.notes,
      draftMaterials,
      catalog,
      preservedBalanceContext,
      currentBalanceContext,
      previousObservations,
    ],
  );
  const privateDraft = useCreationDraft({
    userId: context.userId,
    patientId,
    kind: type,
    navigation: navigationForStep("SUPPLY", step),
    purpose:
      type === "BAL"
        ? "create"
        : editing?.id || documentId
          ? "revise"
          : "create",
    targetDocumentId: editing?.id ?? documentId,
    enabled:
      !loading && !loadError && can(context, type.toLowerCase() + ".read"),
    onResume: (draft) => {
      const content = draft.content;
      if (content && "form" in content) {
        if (
          content.context.documentId !== (editing?.id ?? null) ||
          content.context.documentVersion !== (editing?.version ?? null) ||
          content.context.requisitionId !== requisitionId
        ) {
          setError(
            "O contexto deste preenchimento mudou. Abra o alvo original ou compare com a ficha vigente antes de continuar.",
          );
          return false;
        }
        setForm(content.form);
        setLinks(content.links);
        setDraftMaterials(content.materials);
        setStep(stepForNavigation("SUPPLY", draft.navigation));
        setError("");
        setFieldErrors({});
        return true;
      }
      if (!content || !("counts" in content)) return false;
      if (content.context.documentId !== (editing?.id ?? null)) {
        setError("Abra a ficha original para recuperar este preenchimento.");
        return false;
      }
      setPreservedBalanceContext(content.context);
      setPreviousObservations(content.previousObservations);
      setForm((current) => ({
        ...current,
        quantities: content.counts,
        observationTimes: content.observationTimes,
        notes: content.notes,
      }));
      setDraftMaterials(content.materials);
      setStep(stepForNavigation("SUPPLY", draft.navigation));
      setError("");
      setFieldErrors({});
      return true;
    },
    onDiscard: () => {
      setForm((current) => ({
        ...current,
        quantities: Object.fromEntries(
          catalog.map((product) => [product.id, ""]),
        ),
        ...(type !== "BAL"
          ? {
            origin: "" as const,
            source: "FAMILY" as const,
            recipientId: "",
            recipientReason: "",
            sharedNeedReasons: {},
            presentationSelections: {},
            manualQuantities: {},
          }
          : {}),
        observationTimes: {},
        notes: "",
      }));
      setDraftMaterials([]);
      setPreservedBalanceContext(null);
      setPreviousObservations(undefined);
      setStaleLegacyReference(false);
      setStep(0);
      setError("");
      setFieldErrors({});
      sessionStorage.removeItem(storageKey);
    },
  });
  const supplyContent: SupplyDraftContent = {
    form: {
      quantities: form.quantities,
      notes: form.notes,
      origin: form.origin,
      source: form.source,
      recipientId: form.recipientId,
      recipientReason: form.recipientReason,
      sharedNeedReasons: form.sharedNeedReasons,
      requestFulfillments: form.requestFulfillments,
      presentationSelections: form.presentationSelections,
      manualQuantities: form.manualQuantities,
    },
    links,
    materials: balanceContent.materials,
    context: {
      documentId: editing?.id ?? null,
      documentVersion: editing?.version ?? null,
      requisitionId,
      recipientName: people.find((p) => p.id === form.recipientId)?.name ?? "",
    },
  };
  const privateContent = type === "BAL" ? balanceContent : supplyContent;
  const offeredContent = privateDraft.offered?.content;
  const originalSource =
    offeredContent && "form" in offeredContent
      ? offeredContent.context.requisitionId
      : null;
  const resumeHref =
    originalSource !== requisitionId &&
      offeredContent &&
      "form" in offeredContent
      ? `/fichas/${type.toLowerCase()}?careRecipientId=${patientId}${originalSource ? "&requisitionId=" + originalSource : ""}`
      : undefined;
  const missingBalanceMaterials = Object.keys(form.quantities).filter(
    (id) => !catalog.some((product) => product.id === id),
  );
  function updateForm(value: SetStateAction<WizardState>) {
    setForm((current) => {
      const next = typeof value === "function" ? value(current) : value;
      if (type !== "BAL") return next;
      const times = { ...current.observationTimes, ...next.observationTimes };
      for (const [id, quantity] of Object.entries(next.quantities))
        if (quantity !== current.quantities[id])
          times[id] = new Date().toISOString();
      return { ...next, observationTimes: times };
    });
  }
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      api<{ data: CatalogProduct[]; }>(
        "/api/catalog?careRecipientId=" + patientId,
        undefined,
        controller.signal,
      ),
      api<{ directory: PatientPerson[]; }>(
        "/api/patient-settings?careRecipientId=" + patientId,
        undefined,
        controller.signal,
      ),
      requisitionId
        ? api<{ data: SourceRequest; }>(
          "/api/requisitions/" + requisitionId,
          undefined,
          controller.signal,
        )
        : Promise.resolve(null),
      type === "BAL"
        ? api<unknown>(
          `/api/balances?careRecipientId=${patientId}&reference=true`,
          undefined,
          controller.signal,
        ).then(value => parseBalanceCountReference(value, patientId))
        : Promise.resolve(null),
    ])
      .then(async ([products, settings, source, stockReference]) => {
        if (controller.signal.aborted) return;
        if (source?.data.is_historical)
          throw new Error(
            "Esta requisição histórica é somente consulta. Registre uma nova necessidade ou prepare uma ficha avulsa para o ato atual.",
          );
        setCatalog(products.data);
        setLegacyReference(stockReference?.data ?? null);
        setStaleLegacyReference(false);
        setPeople(settings.directory);
        if (type !== "BAL" && canReadRequests) {
          const options = await api<{ data: ItemContext[]; }>(
            "/api/requisitions/item-context?careRecipientId=" +
            patientId +
            "&productIds=" +
            products.data
              .map((product) => encodeURIComponent(product.id))
              .join(","),
            undefined,
            controller.signal,
          );
          if (controller.signal.aborted) return;
          setRequestOptions(options.data);
        }
        if (source && source.data.care_recipient_id !== patientId)
          throw new Error(
            "A requisição pertence a outro paciente. Selecione o contexto correspondente.",
          );
        const sourceLinks: Record<string, string[]> = {};
        for (const item of source?.data.requisition_items ?? []) {
          const productId = item.product_id ?? item.resolution?.product_id;
          if (productId) (sourceLinks[productId] ??= []).push(item.id);
        }
        setLinks(sourceLinks);
        let restored: WizardState | undefined;
        let restoredBalance: BalanceDraftContent | undefined;
        let preserved: typeof frozenRef.current = null;
        let recoveredId: string | undefined;
        try {
          const raw = sessionStorage.getItem(storageKey);
          if (raw) {
            const envelope = JSON.parse(raw);
            if (envelope.form && typeof envelope.form.quantities === "object") {
              restored = envelope.form;
              if (type === "BAL") {
                restoredBalance = balanceDraftContent.parse(
                  envelope.balanceContent ?? {
                    counts: restored!.quantities,
                    observationTimes: restored!.observationTimes ?? {},
                    notes: restored!.notes,
                    materials: [],
                    context: {
                      mode: "legacy",
                      documentId: envelope.editingId ?? null,
                      documentVersion: null,
                      assignmentId: null,
                      assignmentVersion: null,
                      referenceRevision: null,
                    },
                  },
                );
              }
              if (envelope.links && typeof envelope.links === "object")
                setLinks(envelope.links);
              recoveredId = envelope.editingId;
              if (envelope.intent?.key && envelope.intent?.payload)
                preserved = envelope.intent;
            } else if (type === "BAL")
              throw Error("Invalid saved balance fields");
            else sessionStorage.removeItem(storageKey);
          }
        } catch {
          if (type === "BAL")
            throw Error(
              "Não foi possível conferir a cópia local do balanço. Ela foi preservada; nenhum envio foi realizado.",
            );
          /* A damaged optional draft cannot change authority or catalogue data. */
        }
        if (documentId || recoveredId) {
          const existing = (
            await api<{ data: SupplyDocument; }>(
              "/api/documents/" + (documentId ?? recoveredId),
              undefined,
              controller.signal,
            )
          ).data;
          if (
            existing.type !== type ||
            existing.care_recipient_id !== patientId ||
            !(
              preserved ||
              existing.status === "draft" ||
              (recount && type === "BAL" && existing.status === "submitted")
            )
          )
            throw new Error("Esta ficha não permite edição neste contexto.");
          setEditing(existing);
          if (type === "BAL" && !recount)
            setPreservedBalanceContext({
              mode: existing.payload.balanceAssignment ? "scheduled" : "legacy",
              documentId: existing.id,
              documentVersion: existing.version,
              assignmentId: existing.payload.balanceAssignment?.id ?? null,
              assignmentVersion:
                existing.payload.balanceAssignment?.version ?? null,
              referenceRevision:
                existing.payload.balanceAssignment?.referenceRevision ??
                existing.payload.balanceReferenceRevision ??
                null,
            });
          setLinks(
            Object.fromEntries(
              existing.lines.map((line) => [
                line.product_id,
                line.requisitionItemIds,
              ]),
            ),
          );
          setForm({
            requestFulfillments: Object.fromEntries(existing.lines.map(line => [line.product_id, line.family_fulfillment ?? ""])),
            quantities: Object.fromEntries(
              existing.lines.map((line) => [
                line.product_id,
                recount ? "" : String(line.quantity),
              ]),
            ),
            notes: existing.payload.notes ?? "",
            origin: existing.payload.origin ?? "",
            source: existing.payload.source ?? "FAMILY",
            recipientId: existing.recipient_id ?? "",
            recipientReason: existing.payload.recipientReason ?? "",
            sharedNeedReasons: Object.fromEntries(
              existing.lines.map((line) => [
                line.product_id,
                String(line.metadata.sharedNeedReason ?? ""),
              ]),
            ),
            presentationSelections: Object.fromEntries(
              existing.lines.map((line) => [
                line.product_id,
                readPresentationConversions(line.presentation_conversions),
              ]),
            ),
            manualQuantities: Object.fromEntries(
              existing.lines.map((line) => [
                line.product_id,
                String(line.metadata.manualQuantity ?? line.quantity),
              ]),
            ),
          });
          if (restored && (preserved || !documentId || type === "BAL"))
            setForm(restored);
          if (preserved) {
            frozenRef.current = preserved;
            setUncertain(true);
            setStep(5);
          }
        } else if (restored) {
          setForm(restored);
          setMessage("Rascunho deste dispositivo recuperado.");
          if (preserved) {
            frozenRef.current = preserved;
            setUncertain(true);
            setStep(5);
          }
        } else if (type === "BAL")
          setForm((current) => ({
            ...current,
            quantities: Object.fromEntries(
              products.data.map((product) => [product.id, ""]),
            ),
          }));
        else if (source)
          setForm((current) => ({
            ...current,
            quantities: Object.fromEntries(
              Object.keys(sourceLinks).map((id) => [id, ""]),
            ),
          }));
        if (type === "BAL") {
          setLegacyOpeningKey(
            documentId || recoveredId || preserved
              ? null
              : sessionStorage.getItem(storageKey + ":start"),
          );
        }
        if (restoredBalance) {
          setPreservedBalanceContext(restoredBalance.context);
          setPreviousObservations(restoredBalance.previousObservations);
          setDraftMaterials(restoredBalance.materials);
        }
        setLoading(false);
        setError("");
      })
      .catch((reason) => {
        if (!controller.signal.aborted) {
          setLoading(false);
          setLoadError(
            reason instanceof Error
              ? reason.message
              : "Não foi possível carregar o formulário.",
          );
        }
      });
    return () => controller.abort();
  }, [
    patientId,
    requisitionId,
    storageKey,
    type,
    attempt,
    documentId,
    recount,
    canReadRequests,
  ]);
  useEffect(() => {
    if (type !== "ENT" || loading || loadError || uncertain || saved) return;
    const controller = new AbortController();
    api<{ data: DeliveryPreparation; }>(
      "/api/documents/delivery-preparation?careRecipientId=" +
      patientId +
      "&source=" +
      form.source,
      undefined,
      controller.signal,
    )
      .then(({ data }) => {
        if (controller.signal.aborted) return;
        if (recipientContextRef.current?.source === data.source) {
          setRecipientComparison(data);
        } else {
          recipientContextRef.current = data;
          setRecipientContext(data);
          setRecipientComparison(null);
          setForm((current) =>
            current.recipientId
              ? current
              : { ...current, recipientId: data.suggestedId ?? "" },
          );
        }
        setRecipientError("");
        setRecipientPending(false);
        setRecipientLoadedSource(data.source);
      })
      .catch((reason) => {
        if (!controller.signal.aborted) {
          setRecipientError(
            reason instanceof Error
              ? reason.message
              : "Não foi possível consultar os recebedores. Atualize esta seção.",
          );
          setRecipientPending(false);
          setRecipientLoadedSource(form.source);
        }
      });
    return () => controller.abort();
  }, [
    type,
    patientId,
    form.source,
    loading,
    loadError,
    uncertain,
    saved,
    recipientAttempt,
  ]);
  const recipientLoading =
    recipientPending || recipientLoadedSource !== form.source;
  const activeRecipientContext =
    recipientContext?.source === form.source ? recipientContext : null;
  useEffect(() => {
    if (loading || loadError || saved || uncertain || busy) return;
    const timer = window.setTimeout(() => {
      if (frozenRef.current) return;
      try {
        sessionStorage.setItem(
          storageKey,
          JSON.stringify({
            savedAt: Date.now(),
            form,
            links,
            editingId: editing?.id,
            ...(type === "BAL" ? { balanceContent } : {}),
          }),
        );
      } catch {
        /* The form remains in memory. */
      }
    }, 500);
    return () => window.clearTimeout(timer);
  }, [
    form,
    links,
    editing,
    loading,
    loadError,
    saved,
    storageKey,
    uncertain,
    busy,
    type,
    balanceContent,
  ]);
  function validate(all = false) {
    const errors: Record<string, string> = {};
    if (
      type === "COM" &&
      (all || step === 0) &&
      !["purchase", "donation"].includes(form.origin)
    )
      errors.origin = "Escolha se este ato é uma compra ou uma doação.";
    const category = ["medicamentos", "higiene", "dieta"][step - 1];
    if (type === "ENT" && (all || step === 0) && !form.recipientId)
      errors.recipientId = "Selecione quem receberá esta entrega.";
    if (type === "ENT" && (all || step === 0)) {
      if (recipientLoading || recipientError || !activeRecipientContext)
        errors.recipientContext =
          "Consulte as pessoas e a escala antes de continuar. Os demais campos foram preservados.";
      else if (recipientComparison)
        errors.recipientContext =
          "Compare e adote explicitamente as referências atuais antes de continuar.";
      else if (
        !activeRecipientContext.people.some(
          (person) => person.id === form.recipientId,
        )
      )
        errors.recipientId =
          "Escolha uma pessoa que continue elegível para receber nesta direção.";
      if (
        activeRecipientContext &&
        !recipientError &&
        !recipientLoading &&
        !recipientComparison &&
        form.recipientId &&
        (form.recipientId !== activeRecipientContext?.suggestedId ||
          (editing?.recipient_id &&
            editing.recipient_id !== form.recipientId)) &&
        (form.recipientReason?.trim().length ?? 0) < 3
      )
        errors.recipientReason =
          "Explique a escolha manual ou troca do recebedor com 3 a 1000 caracteres.";
    }
    const relevant = catalog.filter(
      (product) =>
        (all || product.category === category) &&
        (type === "BAL" || Object.hasOwn(form.quantities, product.id)),
    );
    for (const product of relevant)
      if (
        !validQuantity(
          form.quantities[product.id] ?? "",
          product.quantity_decimals ?? 0,
          type === "BAL",
        )
      )
        errors[product.id] =
          "Informe " +
          ((product.quantity_decimals ?? 0)
            ? "quantidade válida"
            : "unidades inteiras") +
          (type === "BAL" ? ", inclusive zero." : " acima de zero.");
    if (all && !Object.keys(form.quantities).length)
      errors.lines = "Selecione ao menos um produto.";
    if (all || step === 0)
      for (const [productId, ids] of Object.entries(links)) {
        if (type === "ENT" && form.source === "FAMILY" && ids.length && !form.requestFulfillments?.[productId]) errors[productId + ":fulfillment"] = "Escolha se esta entrega atende parcialmente ou por completo à necessidade.";
        if (
          ids.length > 1 &&
          (form.sharedNeedReasons?.[productId]?.trim().length ?? 0) < 3
        )
          errors[productId + ":shared"] =
            "Justifique por que essas requisições representam a mesma necessidade.";
      }
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      setError("Confira os campos destacados.");
      window.setTimeout(
        () =>
          document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
        0,
      );
      return false;
    }
    setError("");
    return true;
  }
  async function next() {
    const openingKey = step === 0 && !editing ? legacyOpeningKey : null;
    if (!openingKey && (needsBalanceReview || !validate())) return;
    // Retain recovery of an old, already-started documentary opening. New
    // entry never creates this key or an operational draft.
    if (openingKey) {
      setBusy(true);
      try {
        const result = await api<unknown>("/api/documents", {
          careRecipientId: context.patient!.id,
          type: "BAL",
          payload: {
            lines: Object.keys(form.quantities).map((productId) => ({
              productId,
              quantity: "0",
            })),
            notes: "",
          },
          idempotencyKey: openingKey,
          draft: true,
        });
        const confirmed = requireSupplyConfirmation(result, {
          patientId,
          type: "BAL",
        });
        if (
          confirmed.created_by !== context.userId ||
          !("idempotency_key" in confirmed) ||
          confirmed.idempotency_key !== openingKey ||
          confirmed.status !== "draft"
        ) {
          throw Error(
            "A resposta não confirmou a abertura original desta ficha em edição.",
          );
        }
        const hasObservations =
          Object.values(balanceContent.counts).some((value) => value !== "") ||
          Object.values(balanceContent.observationTimes).some(
            (value) => value !== null,
          ) ||
          balanceContent.notes !== "" ||
          Boolean(balanceContent.previousObservations?.length);
        const sourceContext = {
          ...(hasObservations ? balanceContent.context : currentBalanceContext),
          documentId: confirmed.id,
          documentVersion: confirmed.version,
        };
        sessionStorage.setItem(
          storageKey,
          JSON.stringify({
            savedAt: Date.now(),
            form,
            links,
            editingId: confirmed.id,
            balanceContent: { ...balanceContent, context: sourceContext },
          }),
        );
        setEditing(confirmed);
        setPreservedBalanceContext(sourceContext);
        setLegacyOpeningKey(null);
        setError("");
        if (hasObservations && needsBalanceReview) return;
      } catch (reason) {
        setError(
          reason instanceof Error
            ? reason.message
            : "Não foi possível abrir a referência da contagem.",
        );
        return;
      } finally {
        setBusy(false);
      }
    }
    if (type === "BAL" && step === 4) {
      setBusy(true);
      try {
        const current = (
          await api<unknown>(
            `/api/balances?careRecipientId=${patientId}&reference=true`,
          ).then(value => parseBalanceCountReference(value, patientId))
        ).data;
        if (!legacyReference || current.revision !== legacyReference.revision) {
          setStaleLegacyReference(true);
          setError(
            "O estoque mudou desde o início da contagem. Preserve os valores para conferir e inicie uma nova conferência antes de concluir.",
          );
          return;
        }
      } catch (reason) {
        setError((reason as Error).message);
        return;
      } finally {
        setBusy(false);
      }
    }
    setStep((current) => Math.min(steps.length - 1, current + 1));
    if (type === "BAL" && step === 4) {
      requestAnimationFrame(() => {
        const heading = document.getElementById("supply-wizard-heading");
        heading?.focus({ preventScroll: true });
        heading?.scrollIntoView({ block: "start", behavior: "instant" });
      });
    }
  }
  async function persist(draft: boolean) {
    if (draft && !frozenRef.current) {
      await privateDraft.save(privateContent);
      return;
    }
    if (
      !frozenRef.current &&
      (privateDraft.blocked || missingBalanceMaterials.length)
    )
      return;
    if (!frozenRef.current) {
      if (type === "BAL" && (needsBalanceReview || !legacyReference)) return;
      if (
        type === "BAL" &&
        !editing &&
        sessionStorage.getItem(storageKey + ":start")
      ) {
        setError(
          "Recupere a abertura anterior na etapa de identificação antes de concluir esta contagem.",
        );
        setStep(0);
        return;
      }
      if (!validate(true)) {
        if (draft) {
          try {
            sessionStorage.setItem(
              storageKey,
              JSON.stringify({ savedAt: Date.now(), form }),
            );
            setMessage(
              "Rascunho salvo neste dispositivo. Complete os campos para emitir a ficha.",
            );
          } catch {
            setError("Não foi possível salvar o rascunho neste dispositivo.");
          }
        }
        return;
      }
      const lines: DraftLine[] = catalog
        .filter((product) => Object.hasOwn(form.quantities, product.id))
        .map((product) => ({
          productId: product.id,
          quantity: quantity(form.quantities[product.id]).toFixed(),
          ...(form.presentationSelections?.[product.id]?.length
            ? {
              manualQuantity: quantity(
                form.manualQuantities?.[product.id] ?? "0",
              ).toFixed(),
              presentations: form.presentationSelections[product.id].map(
                (row) => ({
                  id: row.id,
                  version: row.version,
                  packages: row.packages,
                }),
              ),
            }
            : {}),
          ...(links[product.id]?.length
            ? {
              requisitionItemIds: links[product.id],
              ...(type === "ENT" && form.source === "FAMILY" && form.requestFulfillments?.[product.id] ? { requestFulfillment: form.requestFulfillments[product.id] as "partial" | "complete" } : {}),
              metadata: {
                sharedNeedReason: form.sharedNeedReasons?.[product.id] ?? "",
              },
            }
            : {}),
        }));
      const payload: SupplyPayload = {
        lines,
        notes: form.notes,
        ...(type === "BAL"
          ? { balanceReferenceRevision: legacyReference!.revision }
          : {}),
        ...(type === "COM"
          ? form.origin
            ? { origin: form.origin }
            : {}
          : type === "ENT"
            ? {
              source: form.source,
              destination: form.source === "FAMILY" ? "CARE_TEAM" : "FAMILY",
              recipientId: form.recipientId,
              recipientReason: form.recipientReason?.trim() || undefined,
              recipientReference: activeRecipientContext!.referenceHash,
            }
            : {}),
      };
      const privateCommit =
        type !== "BAL"
          ? await privateDraft.save(structuredClone(privateContent))
          : undefined;
      if (type !== "BAL" && !privateCommit) return;
      frozenRef.current = {
        payload,
        key: crypto.randomUUID(),
        submissionKey: crypto.randomUUID(),
        draft,
        expectedVersion: editing?.version,
        ...(privateCommit || privateDraft.draftCommit
          ? {
            draftCommit: privateCommit
              ? { id: privateCommit.id, revision: privateCommit.revision }
              : privateDraft.draftCommit,
          }
          : {}),
      };
    }
    setBusy(true);
    setError("");
    try {
      sessionStorage.setItem(
        storageKey,
        JSON.stringify({
          savedAt: Date.now(),
          form,
          links,
          editingId: editing?.id,
          intent: frozenRef.current,
          ...(type === "BAL" ? { balanceContent } : {}),
        }),
      );
    } catch {
      /* Attempt retained in memory. */
    }
    try {
      const result = await api<{ data: SupplyDocument; }>(
        editing ? "/api/documents/" + editing.id + "/revise" : "/api/documents",
        editing
          ? {
            payload: frozenRef.current.payload,
            idempotencyKey: frozenRef.current.key,
            submissionKey: frozenRef.current.submissionKey,
            expectedVersion: frozenRef.current.expectedVersion,
            recount,
            ...(frozenRef.current.draftCommit
              ? {
                draftCommit: frozenRef.current.draftCommit,
                ...(type !== "BAL" ? { draftKind: type } : {}),
              }
              : {}),
            submit: !frozenRef.current.draft,
          }
          : {
            careRecipientId: context.patient!.id,
            type,
            payload: frozenRef.current.payload,
            idempotencyKey: frozenRef.current.key,
            draft: frozenRef.current.draft,
            ...(frozenRef.current.draftCommit
              ? { draftCommit: frozenRef.current.draftCommit }
              : {}),
          },
      );
      setSaved(
        requireSupplyConfirmation(result, {
          patientId,
          type,
          id: editing?.id,
          minimumVersion:
            frozenRef.current.expectedVersion !== undefined
              ? frozenRef.current.expectedVersion + 1
              : editing
                ? editing.version + 1
                : 1,
        }),
      );
      sessionStorage.removeItem(storageKey);
      sessionStorage.removeItem(storageKey + ":start");
      setUncertain(false);
    } catch (reason) {
      const known =
        reason instanceof ApiError &&
        [400, 403, 404, 409, 413, 422].includes(reason.status);
      if (known && !uncertain) frozenRef.current = null;
      if (
        type === "BAL" &&
        reason instanceof ApiError &&
        reason.code === "INVENTORY_CONFLICT"
      )
        setStaleLegacyReference(true);
      if (
        reason instanceof ApiError &&
        reason.code === "DRAFT_VERSION_CONFLICT" &&
        !uncertain
      ) {
        await privateDraft.reportConflict();
        setStep(0);
      }
      if (
        type === "ENT" &&
        reason instanceof ApiError &&
        reason.status === 409 &&
        !uncertain
      ) {
        setRecipientPending(true);
        setRecipientAttempt((value) => value + 1);
        setStep(0);
      }
      setUncertain(uncertain || !known);
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível confirmar a gravação.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function adoptBalanceReference() {
    if (
      busy ||
      uncertain ||
      privateDraft.blocked ||
      type !== "BAL" ||
      legacyOpeningKey
    )
      return;
    setBusy(true);
    setError("");
    try {
      const [stock, products, documentRead] = await Promise.all([
        api<unknown>(
          `/api/balances?careRecipientId=${patientId}&reference=true`,
        ).then(value => parseBalanceCountReference(value, patientId)),
        api<{ data: CatalogProduct[]; }>(
          `/api/catalog?careRecipientId=${patientId}`,
        ),
        editing
          ? api<{ data: SupplyDocument; }>("/api/documents/" + editing.id)
          : Promise.resolve(null),
      ]);
      if (
        documentRead &&
        (documentRead.data.type !== "BAL" ||
          documentRead.data.care_recipient_id !== patientId ||
          !(
            documentRead.data.status === "draft" ||
            (recount && documentRead.data.status === "submitted")
          ))
      )
        throw Error(
          "Esta ficha não permite outra contagem. Consulte o acompanhamento; os valores foram preservados.",
        );
      const target = documentRead?.data ?? null;
      const next = beginBalanceObservation(
        balanceContent,
        {
          mode: "legacy",
          documentId: target?.id ?? null,
          documentVersion: target?.version ?? null,
          assignmentId: null,
          assignmentVersion: null,
          referenceRevision: stock.data.revision,
        },
        products.data.map((p) => ({
          id: p.id,
          name: p.name,
          unit: p.unit,
          quantityDecimals: p.quantity_decimals ?? 0,
        })),
      );
      const nextForm = {
        ...form,
        quantities: next.counts,
        notes: next.notes,
        observationTimes: next.observationTimes,
      };
      sessionStorage.setItem(
        storageKey,
        JSON.stringify({
          savedAt: Date.now(),
          form: nextForm,
          links,
          editingId: target?.id,
          balanceContent: next,
        }),
      );
      setCatalog(products.data);
      setEditing(target);
      setLegacyReference(stock.data);
      setStaleLegacyReference(false);
      setPreservedBalanceContext(next.context);
      setPreviousObservations(next.previousObservations);
      setDraftMaterials(next.materials);
      setForm(nextForm);
      setFieldErrors({});
      setStep(0);
      setMessage(
        "Referência atualizada. Confira fisicamente cada material; as observações anteriores continuam preservadas.",
      );
      requestAnimationFrame(() =>
        document.getElementById("supply-wizard-heading")?.focus(),
      );
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function scan(code: string) {
    setError("");
    setMessage("");
    const result = await api<PresentationsRead>(
      "/api/catalog/presentations?careRecipientId=" +
      context.patient!.id +
      "&barcode=" +
      encodeURIComponent(code),
    );
    const presentation = result.data[0];
    if (!presentation) {
      setError(
        "Código desconhecido. Associe uma apresentação no catálogo ou selecione o produto manualmente. Nenhum item foi criado.",
      );
      return;
    }
    const product = catalog.find((item) => item.id === presentation.product_id);
    if (!product || !quantity(presentation.base_quantity).isFinite()) {
      setError(
        "Este código não tem material ativo e fator válido neste catálogo. Selecione o material manualmente.",
      );
      return;
    }
    const previous = form.presentationSelections?.[product.id]?.find(
      (row) => row.id === presentation.id,
    );
    if (previous && previous.version !== presentation.version) {
      presentations.refresh();
      setError(
        "O fator desta apresentação mudou. Compare e adote a referência atual na seção de embalagens antes de ler novamente.",
      );
      return;
    }
    setForm((current) => {
      const selections = [
        ...(current.presentationSelections?.[product.id] ?? []),
      ];
      const index = selections.findIndex((row) => row.id === presentation.id);
      if (index >= 0)
        selections[index] = {
          ...selections[index],
          packages: quantity(selections[index].packages || "0")
            .plus(1)
            .toFixed(),
        };
      else
        selections.push({
          id: presentation.id,
          version: presentation.version,
          packages: "1",
          barcode: presentation.barcode,
          name: presentation.name,
          baseQuantity: quantity(presentation.base_quantity).toFixed(),
          unit: product.unit,
        });
      const manual =
        (current.manualQuantities?.[product.id] ??
          current.quantities[product.id]) ||
        "0";
      return {
        ...current,
        presentationSelections: {
          ...current.presentationSelections,
          [product.id]: selections,
        },
        manualQuantities: { ...current.manualQuantities, [product.id]: manual },
        quantities: {
          ...current.quantities,
          [product.id]: presentationTotal(selections, manual || "0"),
        },
      };
    });
    setMessage(
      presentation.name +
      ": adicionados " +
      formatQuantity(presentation.base_quantity, product?.unit),
    );
    if (product)
      setStep(
        ["medicamentos", "higiene", "dieta"].indexOf(product.category) + 1,
      );
  }
  if (privateDraft.readDenied || privateDraft.protectedReadPending)
    return (
      <Notice error>
        Revalide o acesso antes de exibir o preenchimento preservado. A
        tentativa original continua guardada.
        <button
          type="button"
          className={buttonClass}
          onClick={privateDraft.reload}
        >
          Revalidar acesso ao rascunho
        </button>
      </Notice>
    );
  if (!can(context, type.toLowerCase() + ".read"))
    return (
      <Notice>
        Seu vínculo atual não permite consultar este preenchimento. A tentativa
        original continua preservada.
      </Notice>
    );
  if (!allowed && !uncertain && !privateDraft.active)
    return (
      <Notice>
        Seu vínculo não permite emitir esta ficha. Consulte as fichas
        autorizadas no histórico.
      </Notice>
    );
  if (saved)
    return (
      <section className="ui-card mx-auto max-w-3xl">
        <ComplementOriginHint />
        <span className="ui-badge ui-badge-success">Documento persistido</span>
        <h2 className="mt-4 text-2xl font-semibold">
          {saved.code ?? "Rascunho salvo"}
        </h2>
        <p className="mt-2 break-all text-xs text-(--muted)">
          {saved.protocol}
        </p>
        <p className="my-5 text-sm leading-6">
          {saved.status === "draft"
            ? "A ficha está salva como rascunho e ainda não foi expedida."
            : type === "ENT"
              ? "Entrega registrada. O recebimento depende da confirmação do destinatário designado."
              : type === "COM"
                ? saved.payload.origin === "donation"
                  ? "Doação registrada. Acompanhe as parcelas e a validação da chegada."
                  : "Compra registrada. Acompanhe a aprovação, aquisição e validação do recebimento."
                : saved.status === "approved"
                  ? "Balanço concluído e estoque reconciliado."
                  : "Balanço registrado e aguardando as revisões configuradas."}
        </p>
        <div className="flex flex-wrap gap-3">
          <Link className={primaryClass} href={"/fichas/" + saved.id}>
            Acompanhar ficha <Icon name="arrow" />
          </Link>
          <Link className={buttonClass} href="/fichas">
            Voltar à central
          </Link>
        </div>
        <p className="mt-4 text-xs text-(--muted)">
          A navegação está liberada. O envio de notificações é acompanhado
          abaixo.
        </p>
        {saved.status !== "draft" ? (
          <>
            <DocumentActions
              id={saved.id}
              code={saved.code ?? type}
              version={saved.version}
            />
            <DocumentDeliveryStatus id={saved.id} version={saved.version} />
          </>
        ) : null}
      </section>
    );
  return (
    <div className="hca-document-wizard min-w-0 space-y-5">
      <ComplementOriginHint />
      {privateDraft.active ? (
        <CreationDraftPanel
          draft={privateDraft}
          current={privateContent}
          resumeHref={resumeHref}
          patientName={context.patient!.display_name}
          disabled={busy || uncertain || loading}
        />
      ) : null}
      {legacyOpeningKey && !loading && !loadError ? (
        <Notice>
          Na etapa Identificação, use Avançar para recuperar a abertura anterior
          desta ficha.
        </Notice>
      ) : null}
      {needsBalanceReview && !uncertain && !loading && !loadError ? (
        <BalanceReferenceReview
          source={balanceContent}
          current={currentBalanceContext}
          disabled={
            busy ||
            privateDraft.blocked ||
            !allowed ||
            Boolean(legacyOpeningKey)
          }
          onAdopt={() => void adoptBalanceReference()}
        />
      ) : null}
      {type === "BAL" && !loading && !loadError ? (
        <BalancePreviousObservations content={balanceContent} />
      ) : null}
      {missingBalanceMaterials.length ? (
        <Notice error>
          Há materiais fora do catálogo ativo. Confira os valores preservados
          antes de removê-los.
          {missingBalanceMaterials.map((id) => (
            <div key={id}>
              {draftMaterials.find((material) => material.id === id)?.name ??
                "Material indisponível"}
              : {form.quantities[id]}
              <button
                className={buttonClass}
                disabled={busy || uncertain || privateDraft.blocked || !allowed}
                onClick={() =>
                  setForm((current) => {
                    const next = { ...current.quantities };
                    delete next[id];
                    return { ...current, quantities: next };
                  })
                }
              >
                Remover material indisponível
              </button>
            </div>
          ))}
        </Notice>
      ) : null}
      {loadError ? (
        <div className="space-y-3">
          <Notice error>{loadError}</Notice>
          <button
            type="button"
            className={buttonClass}
            onClick={() => {
              setLoading(true);
              setLoadError("");
              setAttempt((value) => value + 1);
            }}
          >
            Recarregar dados
          </button>
          <Link
            className={buttonClass}
            href={requisitionId ? "/historico/" + requisitionId : "/fichas"}
          >
            Voltar
          </Link>
        </div>
      ) : (
        <>
          <StepNavigator
            steps={steps}
            active={step}
            onChange={setStep}
            disabled={busy || uncertain || loading || privateDraft.blocked}
            label={"Etapas da " + type}
          />
          {message ? <Notice>{message}</Notice> : null}
          {error ? (
            <Notice error>
              {error}
              {loading ? null : (
                <button
                  type="button"
                  className={buttonClass}
                  onClick={() => {
                    setLoading(true);
                    setAttempt((value) => value + 1);
                  }}
                >
                  Recarregar dados
                </button>
              )}
            </Notice>
          ) : null}
          {loading ? (
            <Notice>Carregando catálogo e vínculos…</Notice>
          ) : (
            <section className="ui-card">
              <div className="mb-6">
                <p className="eyebrow">
                  {type} · {context.patient?.display_name}
                </p>
                <h2
                  id="supply-wizard-heading"
                  tabIndex={-1}
                  className="mt-2 text-xl font-semibold"
                >
                  {steps[step]}
                </h2>
              </div>
              <fieldset
                disabled={
                  busy ||
                  uncertain ||
                  privateDraft.blocked ||
                  !allowed ||
                  needsBalanceReview
                }
                className="min-w-0 space-y-5"
              >
                <SupplyWizardStep
                  step={step}
                  type={type}
                  context={context}
                  form={form}
                  setForm={updateForm}
                  fieldErrors={fieldErrors}
                  catalog={catalog}
                  people={people}
                  links={links}
                  setLinks={setLinks}
                  requestOptions={requestOptions}
                  requisitionId={requisitionId}
                  scan={scan}
                  presentations={presentations.data?.data ?? []}
                  presentationError={presentations.error}
                  presentationLoading={presentations.loading}
                  refreshPresentations={presentations.refresh}
                  recipientContext={activeRecipientContext}
                  recipientComparison={recipientComparison}
                  recipientError={recipientError}
                  recipientLoading={recipientLoading}
                  previousRecipient={editing?.recipient_id}
                  refreshRecipients={() => {
                    setRecipientPending(true);
                    setRecipientError("");
                    setRecipientAttempt((value) => value + 1);
                  }}
                  adoptRecipients={() => {
                    if (recipientComparison) {
                      recipientContextRef.current = recipientComparison;
                      setRecipientContext(recipientComparison);
                      setRecipientComparison(null);
                      setFieldErrors({});
                      requestAnimationFrame(() =>
                        document.getElementById("delivery-recipient")?.focus(),
                      );
                    }
                  }}
                />
              </fieldset>
              {type === "BAL" && step === 5 ? (
                <>
                  <BalanceReviewRows
                    products={catalog}
                    counts={form.quantities}
                    reference={legacyReference?.quantities ?? {}}
                  />
                  <BalanceObservationTimes content={balanceContent} />
                </>
              ) : null}
              {uncertain ? (
                <Notice>
                  A confirmação da gravação está pendente. Recupere a mesma
                  tentativa antes de iniciar outra.
                </Notice>
              ) : null}
              <WizardActions
                step={step}
                total={6}
                saving={
                  busy ||
                  privateDraft.busy ||
                  (privateDraft.blocked && !uncertain) ||
                  (!allowed && !uncertain)
                }
                uncertain={uncertain}
                blocked={
                  (!(step === 0 && legacyOpeningKey) &&
                    (needsBalanceReview ||
                      missingBalanceMaterials.length > 0)) ||
                  (type === "ENT" && step === 0 && recipientLoading)
                }
                onBack={() => {
                  setStep((value) => value - 1);
                  setError("");
                }}
                onDraft={() => void persist(true)}
                onNext={next}
                onFinish={() => void persist(false)}
              />
            </section>
          )}
        </>
      )}
    </div>
  );
}
