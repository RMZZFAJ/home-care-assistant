"use client";

import { HouseholdListSelection, type HouseholdListSelectionHandle } from "@/components/forms/household-list-selection";
import { materialCategories, supplyWizardStages, WizardMaterialCategories, type WizardMaterialCategory } from "@/components/forms/supply-wizard-stages";
import { pendingExtraDispatchMessage, pendingExtraReviewRow, SupplyExtraItems } from "./supply-extra-items";
import { MaterialReview } from "./material-review";
import { IssuanceObservationsEditor, IssuanceObservationList } from "@/components/forms/issuance-observations";
import { issuanceObservationErrors } from "@/lib/documents/issuance-observations";
import { normalizeCatalogText } from "@/lib/catalog-match";
import {
  FormField,
  SelectField,
  TextAreaField,
  TextInput,
} from "@/components/ui/controls";
import { SearchSelect } from "@/components/ui/search-select";
import { ActionButton, LoadingIndicator } from "@/components/ui/controls";
import { useOperationActivity } from "@/components/ui/operation-activity";
import { issuanceSteps } from "./document-issuance-result";
import { useIssuanceNavigation } from "./document-issuance-navigation";
import { DocumentIssuanceFailure, issuanceRecoverySteps, reconcileIssuance, useIssuanceFailure } from "./document-issuance-failure";
import { Icon, StepNavigator } from "@/components/ui/primitives";
import { Dialog } from "@/components/ui/overlays";
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
import { SimpleDraftPanel } from "@/components/forms/simple-draft-panel";
import { useLongDraftAutosave } from "@/components/forms/use-long-draft-autosave";
import { useCreationDraft } from "@/components/forms/use-creation-draft";
import { DocumentWriteAccessNotice, useDocumentWriteAccess } from "./document-write-access-notice";
import { DocumentCatalogueEmpty, DocumentOpeningFailure, DocumentOpeningPending, type OpeningFailure } from "./document-opening-status";
import { CatalogueOpeningError, readWizardCatalogue } from "@/lib/client/wizard-catalogue";
import {
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
import { quantity, validQuantity } from "@/lib/quantity";
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
import { MaterialConsultButton } from "./catalogue-material-panel";

export const custodyName = (source: Custody) =>
  source === "FAMILY" ? "Família" : "Equipe";
const transferStepActions = ["Selecionar materiais", "Continuar", "Continuar", "Revisar ficha"];
export function TransferConsole({ source }: { source?: Custody } = {}) {
  return (
    <Workspace title={source === "CARE_TEAM" ? "Nova devolução" : "Entregas e devoluções de materiais"}>
      {(context) =>
        context.patient && can(context, "ent.read") ? (
          <PatientTransfers key={context.patient.id} context={context} fixedSource={source} />
        ) : (
          <Notice>Selecione um paciente com acesso às entregas.</Notice>
        )
      }
    </Workspace>
  );
}
function PatientTransfers({ context, fixedSource }: { context: WorkspaceContext; fixedSource?: Custody }) {
  const [source, setSource] = useState<Custody | "">(fixedSource ?? ""),
    [editing, setEditing] = useState(false),
    [consulting, setConsulting] = useState(false);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  function endEditing() {
    setEditing(false);
    requestAnimationFrame(() => headingRef.current?.focus());
  }
  const returnOnly = fixedSource === "CARE_TEAM";
  const canPrepare = can(context, "ent.create") && !!source && can(context, source === "CARE_TEAM" ? "stock.team.read" : "stock.family.read");
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      {!editing ? <section className="ui-card space-y-4">
        <h2 ref={headingRef} tabIndex={-1}>
          {returnOnly ? "Nova devolução" : "Nova entrega ou devolução"}
        </h2>
        <p>
          A entrega segue da família para a equipe. A devolução de materiais
          segue da equipe para a família e pode ser autônoma, sem uma entrega
          de origem vinculada. Ao expedir, os materiais ficam em trânsito até a
          conferência da pessoa designada.
        </p>
        <p>
          Consumo, descarte e correção de estoque têm seus próprios registros.
        </p>
        {can(context, "ent.read") ? (
          <>
            {fixedSource ? <p><strong>Percurso:</strong> {custodyName(fixedSource)} → {custodyName(fixedSource === "CARE_TEAM" ? "FAMILY" : "CARE_TEAM")}</p> : <FormField label="Custódia de origem" required>
              <SelectField
                value={source}
                onChange={(controlEvent) => {
                  const controlValue = controlEvent.currentTarget.value;
                  return setSource(controlValue as Custody | "");
                }}
              >
                <option value="">Escolha a origem</option>
                {can(context, "ent.read") ? (
                  <option value="FAMILY">Entrega de materiais · Família → Equipe</option>
                ) : null}
                {can(context, "ent.read") ? (
                  <option value="CARE_TEAM">Devolução de materiais · Equipe → Família</option>
                ) : null}
              </SelectField>
            </FormField>}
            <ActionButton
              variant="primary"
              disabled={!source}
              onClick={() => {
                setConsulting(!canPrepare);
                setEditing(true);
              }}
            >
              {canPrepare ? returnOnly ? "Preparar devolução" : "Preparar declaração" : "Consultar último rascunho"}
            </ActionButton>
          </>
        ) : (
          <Notice>
            Seu contexto não permite uma nova declaração. As decisões e os
            recebimentos designados continuam no acompanhamento.
          </Notice>
        )}
        <Link className="ui-button ui-button-secondary" href="/entregas">
          Acompanhar entregas e devoluções
        </Link>
        {returnOnly ? <Link className="ui-button ui-button-secondary" href="/transferencias">Consultar os dois percursos de materiais</Link> : null}
      </section> : null}
      {editing && source ? (
        <TransferDeclarationEditor
          key={source + ":" + consulting}
          context={context}
          source={source}
          consulting={consulting}
          onClose={endEditing}
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
  const [openingFailure, setOpeningFailure] = useState<OpeningFailure | null>(null);
  const [emptyCatalogueTotal, setEmptyCatalogueTotal] = useState<number | null>(null);
  const [counterpartyId, setCounterpartyId] = useState(""),
    [recipientId, setRecipientId] = useState(""),
    [originId, setOriginId] = useState("");
  const [reason, setReason] = useState(""),
    [query, setQuery] = useState(""),
    [lines, setLines] = useState<{ productId: string; quantity: string; extra?: boolean }[]>([]);
  const [pendingExtras, setPendingExtras] = useState<NonNullable<TransferDeclarationDraftContent["pendingExtras"]>>([]);
  const [reviewingPending, setReviewingPending] = useState(false);
  const [observations, setObservations] = useState<string[]>([]);
  const [observationErrors, setObservationErrors] = useState<Record<string, string>>({});
  const [step, setStep] = useState(0);
  const [category, setCategory] = useState<WizardMaterialCategory | null>("medicamentos");
  const [packet, setPacket] = useState<TransferDeclaration | null>(null),
    [result, setResult] = useState<SupplyDocument | null>(null);
  const [recoveredId, setRecoveredId] = useState<string | null>(null);
  const issuanceFailure = useIssuanceFailure();
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [uncertain, setUncertain] = useState(false),
    [discard, setDiscard] = useState(false);
  const pendingRef = useRef<TransferDeclaration | null>(null),
    reviewHeadingRef = useRef<HTMLHeadingElement | null>(null),
    observationsHeadingRef = useRef<HTMLHeadingElement | null>(null),
    originFieldRef = useRef<HTMLSelectElement | null>(null),
    reasonFieldRef = useRef<HTMLTextAreaElement | null>(null);
  const loadedRef = useRef(false);
  const patientId = context.patient!.id;
  const storageKey = "hca:transfer-issuance:" + context.userId + ":" + patientId + ":" + source;
  const { navigating, openIssued } = useIssuanceNavigation(context.userId, patientId);
  const processName = materialTransferLabel(source, source === "FAMILY" ? "CARE_TEAM" : "FAMILY").toLocaleLowerCase("pt-BR");
  const isReturn = source === "CARE_TEAM";
  const householdSelectionRef = useRef<HouseholdListSelectionHandle>(null);
  useOperationActivity((busy && Boolean(packet)) || navigating, {
    title: uncertain ? "Consultando a expedição" : isReturn ? "Expedindo devolução" : "Expedindo entrega",
    stage: navigating ? 1 : 0,
    steps: uncertain ? issuanceRecoverySteps : issuanceSteps,
    detail: navigating ? "A expedição foi registrada. Estamos abrindo a ficha."
      : uncertain ? "Aguarde a confirmação desta tentativa." : "Conferindo o saldo da origem e registrando os materiais em trânsito.",
  });
  const restoredRef = useRef(false);
  const returnFocusRef = useRef(false);
  const [baseline, setBaseline] = useState<TransferDeclarationDraftContent>(
    () => emptyTransferDeclarationDraft(source),
  );
  const [referenceUnavailable, setReferenceUnavailable] = useState(true);
  const write =
    can(context, "ent.create") &&
    can(context, source === "FAMILY" ? "stock.family.read" : "stock.team.read");
  const writeAccess = useDocumentWriteAccess(write);
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
      setObservations(values.observations ?? (values.reason ? [values.reason] : []));
      setPendingExtras(values.pendingExtras ?? []);
      setReviewingPending(false);
      setObservationErrors({});
      setQuery(values.query);
      setCategory(materialCategories.find(item => item.id === values.category)?.id ?? null);
      setLines(values.lines);
      setStep(values.step ?? 0);
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
      setDraftTouched(false);
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
      setObservations([]);
      setObservationErrors({});
      setQuery("");
      setCategory("medicamentos");
      setLines([]);
      setPendingExtras([]);
      setReviewingPending(false);
      setStep(0);
      setPacket(null);
    },
  });
  useEffect(() => {
    if (consulting) return;
    const timer = window.setTimeout(() => {
      try {
        const parsed = createTransferSchema.safeParse(JSON.parse(sessionStorage.getItem(storageKey) ?? "null"));
        if (!parsed.success || parsed.data.careRecipientId !== patientId ||
          parsed.data.declaration.source !== source || !parsed.data.draftCommit) return;
        pendingRef.current = parsed.data;
        setPacket(parsed.data);
        setUncertain(true);
      } catch { /* Recovery still requires the authorized server receipt. */ }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [consulting, patientId, source, storageKey]);
  const privateReadRef = useRef(privateDraft.revalidateRead);
  useEffect(() => {
    privateReadRef.current = privateDraft.base?.state === "active"
      ? privateDraft.revalidateRead
      : () => Promise.resolve(false);
  }, [privateDraft.base, privateDraft.revalidateRead]);
  useEffect(() => {
    if (!busy && !privateDraft.busy && !packet && returnFocusRef.current) {
      returnFocusRef.current = false;
      (reasonFieldRef.current ?? observationsHeadingRef.current)?.focus();
    }
  }, [busy, privateDraft.busy, packet, referenceUnavailable]);
  const currentContent = declarationContent(baseline, reference, {
    counterpartyId,
    recipientId,
    originId,
    reason,
    observations,
    pendingExtras,
    step,
    query,
    category: category ?? undefined,
    lines,
  });
  const products = reference?.products ?? [];
  const manualRecipient = Boolean(recipientId && recipientId !== reference?.suggested?.professionalId);
  const productsById = new Map(products.map(product => [product.id, product]));
  const activeCategory = category ?? materialCategories.find(item => item.id === productsById.get(lines[0]?.productId)?.category)?.id ?? "medicamentos";
  const selectedIds = lines.map(line => line.productId);
  const review = packet?.declaration ?? (reviewingPending ? {
    recipientId, originDocumentId: originId, reason, observations, lines,
  } : null);
  const regularSelection = lines.flatMap(line => {
    const product = productsById.get(line.productId);
    return product && !line.extra ? [product] : [];
  });
  const visibleLines = lines.filter(line => step === 2 ? Boolean(line.extra) : !line.extra &&
    (productsById.get(line.productId)?.category ?? "medicamentos") === activeCategory);

  const [draftTouched, setDraftTouched] = useState(false);
  useLongDraftAutosave(privateDraft, currentContent, write && draftTouched && !(busy || uncertain || !!packet));
  useEffect(() => {
    if (recoveryOnly) return;
    const controller = new AbortController();
    api<unknown>(
      "/api/transfers/preparation?" +
        new URLSearchParams({ careRecipientId: patientId, source }),
      undefined,
      controller.signal,
    )
      .then(async (response) => {
        if (controller.signal.aborted) return;
        const current = parseTransferPreparation(response, {
          patientId,
          userId: context.userId,
          source,
        });
        if (!loadedRef.current && !current.products.length) {
          const catalogue = await readWizardCatalogue(patientId, controller.signal);
          if (controller.signal.aborted) return;
          if (catalogue.data.length) throw new Error("A referência de materiais mudou durante a abertura.");
          setEmptyCatalogueTotal(catalogue.total);
        } else setEmptyCatalogueTotal(null);
        if (!loadedRef.current && !restoredRef.current) {
          setReference(current);
          setRecipientId((previous) => previous || current.suggested?.professionalId || "");
          setBaseline((old) => adoptTransferDeclarationReference(old, current));
          setReferenceUnavailable(false);
          setNeedsRefresh(false);
        } else setComparison(current);
        loadedRef.current = true;
        setError("");
        setOpeningFailure(null);
      })
      .catch((cause) => {
        if (controller.signal.aborted) return;
        setOpeningFailure(cause instanceof CatalogueOpeningError
          ? { source: "catalogue", cause: cause.cause }
          : { source: "reference", cause });
        setReferenceUnavailable(true);
        setNeedsRefresh(true);
        setComparison(null);
        setError(
          cause instanceof Error
            ? cause.message
            : "Não foi possível consultar a referência.",
        );
        if (cause instanceof ApiError && [401, 403, 404].includes(cause.status))
          void privateReadRef.current();
      })
      .finally(() => {
        if (!controller.signal.aborted) setRefreshing(false);
      });
    return () => controller.abort();
  }, [patientId, source, context.userId, attempt, recoveryOnly]);
  useEffect(() => {
    if (packet || result || reviewingPending) reviewHeadingRef.current?.focus();
  }, [packet, result, reviewingPending]);
  function close() {
    if (uncertain || privateDraft.pending || busy) return;
    if (
      !result &&
      !recoveryOnly &&
      (reason || observations.length || lines.length || pendingExtras.length || counterpartyId || recipientId)
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
      privateDraft.backgroundBusy ||
      busy ||
      uncertain ||
      recoveryOnly
    )
      return;
    if (step < 3) {
      if (step === 0 && manualRecipient && reason.trim().length < 3) {
        setError("Justifique a escolha do recebedor.");
        reasonFieldRef.current?.focus();
        return;
      }
      if (step === 0 && householdSelectionRef.current?.apply() === false) return;
      const materialStep = step === 1 || step === 2;
      const stepLines = lines.filter((line) => !!line.extra === (step === 2));
      if (materialStep && stepLines.some((line) => {
        const product = reference.products.find((item) => item.id === line.productId);
        return !product || !validQuantity(line.quantity, product.quantityDecimals) || quantity(line.quantity).gt(product.available);
      })) {
        setError("Escolha os materiais e informe quantidades válidas dentro do saldo disponível.");
        return;
      }
      setError("");
      setQuery("");
      setStep(step + 1);
      return;
    }
    if (
      (!lines.length && !pendingExtras.length) ||
      !reference.people.some((person) => person.id === recipientId) ||
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
      setStep(0);
      requestAnimationFrame(() => originFieldRef.current?.focus());
      return;
    }
    if (manualRecipient && reason.trim().length < 3) {
      setError("Justifique a escolha do recebedor.");
      setStep(0);
      requestAnimationFrame(() => reasonFieldRef.current?.focus());
      return;
    }
    const invalidObservations = issuanceObservationErrors(observations);
    setObservationErrors(invalidObservations);
    if (Object.keys(invalidObservations).length) {
      setError("Confira as observações destacadas.");
      window.setTimeout(() => document.querySelector<HTMLElement>('[data-field-error][aria-invalid="true"]')?.focus(), 0);
      return;
    }
    if (pendingExtras.length) {
      setError("");
      setReviewingPending(true);
      return;
    }
    const parsed = createTransferSchema.safeParse({
      careRecipientId: patientId,
      idempotencyKey: crypto.randomUUID(),
      declaration: {
        source,
        mode: "direct",
        recipientId,
        originDocumentId: originId || null,
        referenceHash: reference.referenceHash,
        reason: reason.trim(),
        observations: observations.map(note => note.trim()),
        lines: lines.map(({ productId, quantity }) => ({ productId, quantity })),
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
    if (parsed.data.declaration.lines.some((line) => {
      const product = reference.products.find((item) => item.id === line.productId);
      return !product || quantity(line.quantity).gt(product.available);
    })) {
      setError("A quantidade a expedir deve caber no saldo disponível de cada material.");
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
        await privateReadRef.current();
    } finally {
      setBusy(false);
    }
  }
  function addExtra(id: string, amount: string, replace?: string) {
    if (selectedIds.includes(id)) return;
    setLines(current => [...current, { productId: id, quantity: amount, extra: true }]);
    if (replace) setPendingExtras(current => current.filter(item => item.id !== replace));
    setDraftTouched(true);
  }
  async function submit() {
    if (busy) return;
    const intent = pendingRef.current ?? packet;
    if (!intent) return;
    pendingRef.current = intent;
    setBusy(true);
    setError("");
    try { sessionStorage.setItem(storageKey, JSON.stringify(intent)); } catch { /* Retained in memory. */ }
    try {
      if (uncertain && intent.draftCommit) {
        const resolution = await reconcileIssuance(patientId, intent.draftCommit, intent.idempotencyKey);
        if (resolution.state === "not_applied") {
          pendingRef.current = null;
          try { sessionStorage.removeItem(storageKey); } catch { /* The server has closed the old key. */ }
          setUncertain(false);
          if (resolution.draftSaved && write) {
            setPacket({ ...intent, idempotencyKey: crypto.randomUUID() });
          } else {
            setPacket(null);
            if (!resolution.draftSaved) void privateDraft.reportConflict();
          }
          issuanceFailure.report({ outcome: "rejected", cause: issuanceFailure.failure?.cause,
            draftSaved: resolution.draftSaved, retryable: resolution.draftSaved && write });
          return;
        }
        setRecoveredId(resolution.documentId);
        openIssued(resolution.documentId);
      } else {
        const response = await api<unknown>("/api/transfers", intent);
        const issued = requireTransferDeclarationConfirmation(response, {
          patientId, userId: context.userId, declaration: intent.declaration,
        });
        setResult(issued);
        openIssued(issued.id);
      }
      pendingRef.current = null;
      setPacket(null);
      setUncertain(false);
      issuanceFailure.clear();
      try { sessionStorage.removeItem(storageKey); } catch { /* Issuance is already confirmed. */ }
      privateDraft.reload();
    } catch (cause) {
      const rejected =
        !uncertain && cause instanceof ApiError &&
        [400, 401, 403, 404, 409, 422].includes(cause.status);
      setUncertain(!rejected);
      if (rejected) {
        pendingRef.current = null;
        try { sessionStorage.removeItem(storageKey); } catch { /* Storage may be unavailable. */ }
        setPacket(null);
        setNeedsRefresh(true);
        setReferenceUnavailable(true);
        setBaseline(currentContent);
        if (cause.code === "DRAFT_VERSION_CONFLICT")
          void privateDraft.reportConflict();
        else if ([401, 403, 404].includes(cause.status)) await privateReadRef.current();
        returnFocusRef.current = true;
        issuanceFailure.clear();
        setError(cause.message);
      } else {
        issuanceFailure.report({ outcome: "uncertain", cause });
      }
    } finally {
      setBusy(false);
    }
  }
  const personName = (id: string, ref = reference) =>
    (referenceUnavailable && ref === reference
      ? currentContent.fields.recipientLabel
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
  const privatePanel = !result && !uncertain ? (
    <SimpleDraftPanel
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
  ) : null;
  const referenceComparison = comparison ? (
    <section
      className="ui-card hca-form-stack"
      aria-label="Comparação da referência da transferência"
    >
      <h3>Referência preservada e atual</h3>
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
          requestAnimationFrame(() => (reasonFieldRef.current ?? observationsHeadingRef.current)?.focus());
        }}
      >
        Adotar referência atual e revisar meus campos
      </ActionButton>
    </section>
  ) : null;
  if (recoveredId)
    return <Notice>Expedição registrada. <Link href={"/fichas/" + recoveredId}>Acompanhar ficha</Link></Notice>;
  if (
    (recoveryOnly && !result && !issuanceFailure.open) ||
    privateDraft.readDenied ||
    privateDraft.protectedReadPending
  )
    return (<>
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
          <>
            <DraftContentSummary content={privateDraft.base.content} kind="ENT" purpose={purpose} />
            <ActionButton disabled={privateDraft.busy || !!privateDraft.pending || privateDraft.conflict} onClick={() => void privateDraft.discard()}>
              Descartar preenchimento privado
            </ActionButton>
          </>
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
      {!privateDraft.readDenied && !privateDraft.protectedReadPending && !privateDraft.pending && !uncertain
        ? <DocumentWriteAccessNotice {...writeAccess} draftSaved={privateDraft.base?.state === "active"} /> : null}
    </>);
  if (!result && !packet && !uncertain && !privateDraft.pending && !privateDraft.consumed) {
    if (!reference && !comparison && !privateDraft.base && !privateDraft.offered) {
      if (refreshing || !openingFailure) return <DocumentOpeningPending />;
      return <DocumentOpeningFailure failure={openingFailure} attempts={attempt}
        operation={isReturn ? "Abrir devolução" : "Abrir entrega"} back={onClose} onRetry={refresh} />;
    }
    if (emptyCatalogueTotal !== null && !privateDraft.base && !privateDraft.offered)
      return <DocumentCatalogueEmpty patientId={patientId} patientName={context.patient!.display_name}
        mayManage={can(context, "catalog.manage")} hasInactive={emptyCatalogueTotal > 0} />;
  }
  return (
    <section
      className="hca-transfer-wizard"
      aria-label={
        result
          ? (isReturn ? "Devolução expedida" : "Entrega expedida")
          : (isReturn ? "Nova devolução" : "Nova entrega")
      }
      aria-busy={busy || privateDraft.busy}
    >
      <div onChangeCapture={event => {
        if (event.currentTarget.contains(event.target as Node)) setDraftTouched(true);
      }}>
      {privatePanel}
      {error ? <Notice error>{error}</Notice> : null}
      {!result && (reference && !referenceUnavailable || packet) ? (
        <StepNavigator
          steps={supplyWizardStages}
          compact
          active={review ? 4 : step}
          disabled={busy || uncertain || privateDraft.blocked}
          onChange={(next) => {
            if (next < 4) {
              setPacket(null);
              setReviewingPending(false);
              setError("");
              setStep(next);
            }
          }}
        />
      ) : null}
      {discard ? (
        <Dialog open title="Sair por agora?" onClose={() => setDiscard(false)}>
          <p>Você pode guardar o preenchimento e continuar em outro momento.</p>
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
        </Dialog>
      ) : null}
      {result ? (
        <div className="hca-transfer-wizard-result">
          <span className="hca-transfer-wizard-result-icon" aria-hidden="true"><Icon name="check" width="24" height="24" /></span>
          <h3 ref={reviewHeadingRef} tabIndex={-1}>
            {isReturn ? "Devolução expedida" : "Entrega expedida"}
          </h3>
          <p>
            Os materiais estão em trânsito e aguardam a conferência de {result.transfer?.declaration.recipient.name}.
          </p>
          <p>
            {result.code} · Expedida por {result.transfer?.declaration.actor.name}.
          </p>
          <Link
            className="ui-button ui-button-primary"
            href={"/fichas/" + result.id}
          >
            Acompanhar ficha
          </Link>
          <ActionButton onClick={onClose}>Nova ficha</ActionButton>
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
              Revisar ficha
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
          <ActionButton disabled={busy || privateDraft.busy} onClick={close}>Sair por agora</ActionButton>
        </div>
      ) : (
        <div className="hca-transfer-wizard-content">
          {!review ? <p className="hca-field-help">
            <strong>
              {custodyName(source)} → {custodyName(reference!.destination)}
            </strong>{" "}
            ·{" "}
            {referenceUnavailable
              ? "Referência indisponível; recupere a mesma confirmação anterior."
              : "Referência consultada em " +
                formatBrazilDate(reference!.checkedAt) +
                "."}
          </p> : null}
          {needsRefresh ? (
            <Notice>
              Seus campos foram preservados. Consulte, compare e adote a
              referência atual antes de confirmar.
            </Notice>
          ) : null}
          {!review ? (
            <>
              <ActionButton disabled={refreshing} onClick={refresh}>
                {refreshing
                  ? "Consultando referência…"
                  : "Comparar referência atual"}
              </ActionButton>
              {!reference!.people.length ? (
                <Notice>
                  Não há pessoa habilitada na custódia de destino para confirmar o recebimento.
                </Notice>
              ) : null}
              <form className="grid gap-4" onSubmit={prepare}>
                {step === 0 ? <>
                <h3>Confirme os dados da {isReturn ? "devolução" : "entrega"}</h3>
                <p><strong>Paciente</strong> · {context.patient?.display_name}</p>
                <p><strong>Expedidor</strong> · {context.fullName}</p>
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
                        {person.name}{person.id === reference!.suggested?.professionalId ? " · Em plantão" : ""}
                      </option>
                    ))}
                  </SelectField>
                </FormField>
                {manualRecipient || reason ? <FormField label="Justificativa da escolha do recebedor" required={manualRecipient}>
                  <TextAreaField ref={reasonFieldRef} rows={2} required={manualRecipient} minLength={3} maxLength={1000}
                    value={reason} onChange={event => setReason(event.currentTarget.value)} />
                </FormField> : null}
                <FormField label="ENT documental de origem, quando conhecida">
                  <SelectField
                    ref={originFieldRef}
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
                {!isReturn ? (
                  <HouseholdListSelection ref={householdSelectionRef}
                    key={context.userId + ":" + patientId}
                    userId={context.userId} patientId={patientId} kind="ENT"
                    catalogue={reference!.products.map(product => ({
                      ...product, selectable: quantity(product.available).gt(0),
                    }))}
                    selectedIds={lines.map(line => line.productId)}
                    disabled={!write || needsRefresh || referenceUnavailable || privateDraft.blocked}
                    onApply={ids => {
                      setLines(current => [
                        ...current,
                        ...ids.filter(id => !current.some(line => line.productId === id))
                          .map(productId => ({ productId, quantity: "" })),
                      ]);
                      setDraftTouched(true);
                    }} />
                ) : null}
                </> : null}
                {step === 1 || step === 2 ? <>
                <h3>{step === 2 ? "Itens extras" : supplyWizardStages[step]}</h3>
                {step === 1 ? <WizardMaterialCategories category={activeCategory} selected={regularSelection} onChange={next => { setCategory(next); setQuery(""); }} /> : null}
                <SupplyExtraItems items={pendingExtras} inExtras={step === 2}
                  catalogue={products.map(({ id, name, unit }) => ({ id, name, unit }))} selected={new Set(selectedIds)}
                  onChange={items => { setPendingExtras(items); setDraftTouched(true); }} onChoose={addExtra} />
                {step === 1 ? (
                <FormField label="Adicionar material da origem">
                  <SearchSelect
                    query={query}
                    selectedIds={[]}
                    placeholder="Buscar material"
                    onQueryChange={(queryValue) => setQuery(queryValue)}
                    onSelectionChange={(nextIds) => {
                      const product = products.find(item => item.id === nextIds[0]);
                      if (product && !selectedIds.includes(product.id)) {
                        setLines((previous) => [
                          ...previous,
                          { productId: product.id, quantity: "" },
                        ]);
                        setCategory(materialCategories.find(item => item.id === product.category)?.id ?? activeCategory);
                        setDraftTouched(true);
                      }
                      setQuery("");
                    }}
                    options={
                      products
                        .filter(
                          (product) =>
                            !selectedIds.includes(product.id) &&
                            (query.trim()
                              ? normalizeCatalogText(`${product.name} ${product.category}`).includes(normalizeCatalogText(query))
                              : product.category === activeCategory),
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
                        }))
                    }
                  />
                </FormField>
                ) : null}
                {visibleLines.length === 0 ? (
                  step === 2 && pendingExtras.length ? null : <p>
                    {step === 2 ? "Nenhum item extra incluído." : "Nenhum material selecionado. Informe as quantidades na unidade base."}
                  </p>
                ) : (
                  visibleLines.map((line) => {
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
                        {product ? <MaterialConsultButton context={context} material={product} /> : null}
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
                                previous.map((row) =>
                                  row.productId === line.productId
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
                </> : null}
                {step === 3 ? <>
                <h3 ref={observationsHeadingRef} tabIndex={-1}>Observações</h3>
                <IssuanceObservationsEditor observations={observations} onChange={setObservations} errors={observationErrors} />
                </> : null}
                <div className="hca-transfer-wizard-footer">
                {step > 0 ? <ActionButton onClick={() => { setError(""); setStep(step - 1); }}>Voltar</ActionButton> : null}
                {step === 0 ? <ActionButton disabled={busy || privateDraft.blocked} onClick={close}>Sair por agora</ActionButton> : null}
                <ActionButton
                  type="submit"
                  variant="primary"
                  disabled={
                    needsRefresh ||
                    referenceUnavailable ||
                    privateDraft.blocked ||
                    privateDraft.backgroundBusy ||
                    busy ||
                    !reference!.people.length ||
                    (step === 0 && !recipientId) ||
                    (step === 3 && !lines.length && !pendingExtras.length)
                  }
                >
                  {transferStepActions[step]}
                </ActionButton>
                </div>
              </form>
            </>
          ) : (
            <section className="hca-transfer-wizard-review">
              <h2 ref={reviewHeadingRef} tabIndex={-1}>Revise antes de expedir</h2>
              <p className="hca-field-help">Confira os materiais e as informações que acompanharão esta ficha.</p>
              <dl className="hca-transfer-wizard-summary">
                <div><dt>Paciente</dt><dd>{context.patient?.display_name}</dd></div>
                <div><dt>Preenchido por</dt><dd>{context.fullName}</dd></div>
                <div><dt>Destino</dt><dd>{isReturn ? "Estoque da família" : "Estoque da equipe"}</dd></div>
                <div><dt>Recebedor físico</dt><dd>{personName(review.recipientId)}</dd></div>
              </dl>
              <h4>Materiais</h4>
              {review.lines.map((line) => {
                const product = reference?.products.find(
                  (p) => p.id === line.productId,
                );
                return (
                  <article className="hca-transfer-wizard-material" key={line.productId}>
                    <strong>{product?.name ?? "Material selecionado"}</strong>
                    <p>{formatQuantity(line.quantity, product?.unit)}
                      {lines.find((item) => item.productId === line.productId)?.extra ? " · Item extra" : ""}
                      {product?.active === false ? " · inativo com saldo" : ""}
                    </p>
                    {product ? <MaterialConsultButton context={context} material={product} /> : null}
                  </article>
                );
              })}
              {pendingExtras.length ? <section aria-label="Itens extras pendentes">
                <h4>Itens extras pendentes</h4>
                <MaterialReview rows={pendingExtras.map(pendingExtraReviewRow)} />
              </section> : null}
              <p>
                Origem documental:{" "}
                {reference?.origins.find(
                  (origin) => origin.id === review.originDocumentId,
                )?.code ?? "Sem vínculo informado"}
                .
              </p>
              {review.reason ? <p className="whitespace-pre-wrap">
                {review.observations ? "Justificativa da escolha do recebedor" : "Sua justificativa"}: {review.reason}
              </p> : null}
              <section className="hca-document-summary"><h3>Observações</h3>
                <IssuanceObservationList observations={review.observations ?? []} />
              </section>
              <Notice>
                A expedição debita o saldo da origem e coloca os materiais em trânsito.
                O destino recebe o saldo após a conferência pessoal.
              </Notice>
              {reviewingPending ? <Notice>{pendingExtraDispatchMessage}</Notice> : null}
              {uncertain ? (
                <Notice>
                  O resultado ainda é incerto. Verifique esta tentativa de expedição antes de enviar outra.
                </Notice>
              ) : null}
              <div className="hca-transfer-wizard-footer">
                {!uncertain ? (
                  <ActionButton
                    onClick={() => {
                      issuanceFailure.clear();
                      setPacket(null);
                      setReviewingPending(false);
                      requestAnimationFrame(() =>
                        (reasonFieldRef.current ?? observationsHeadingRef.current)?.focus(),
                      );
                    }}
                  >
                    Voltar
                  </ActionButton>
                ) : null}
                <ActionButton variant="primary" disabled={busy || reviewingPending} onClick={() => { if (!issuanceFailure.reopen()) void submit(); }}>
                  <Icon name="send" width="16" height="16" />
                  {uncertain
                    ? "Verificar a expedição"
                    : isReturn ? "Expedir devolução" : "Expedir entrega"}
                </ActionButton>
              </div>
            </section>
          )}
        </div>
      )}
      </div>
      <DocumentIssuanceFailure state={issuanceFailure} operation={isReturn ? "Expedição de devolução" : "Expedição de entrega"} onRetry={submit} />
    </section>
  );
}
