"use client";

import { HouseholdListSelection, type HouseholdListSelectionHandle } from "@/components/forms/household-list-selection";
import { adjacentMaterialCategory, materialCategories, supplyWizardCopy, supplyWizardNextLabels, supplyWizardStages, WizardMaterialCategories, type WizardMaterialCategory } from "@/components/forms/supply-wizard-stages";
import { SupplyWizardHeading } from "@/components/forms/supply-wizard-heading";
import { SupplyWizardIdentity } from "@/components/forms/supply-wizard-identity";
import { focusWizardMaterial, WizardCatalogueReview, WizardMaterialSearch, WizardMaterialToolbar, WizardQuantityInput } from "@/components/forms/wizard-material-tools";
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
import { MaterialChoice } from "@/components/catalog/material-choice";
import { ActionButton, LoadingIndicator } from "@/components/ui/controls";
import { useOperationActivity } from "@/components/ui/operation-activity";
import { issuanceSteps } from "./document-issuance-result";
import { useIssuanceNavigation } from "./document-issuance-navigation";
import { DocumentIssuanceFailure, issuanceRecoverySteps, reconcileIssuance, useIssuanceFailure } from "./document-issuance-failure";
import { Icon, StepNavigator } from "@/components/ui/primitives";
import { Dialog } from "@/components/ui/overlays";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
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
import { SupplyWizardFooter } from "@/components/forms/wizard-actions";
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
import { emptySupplySources, prepareSupplySources } from "@/lib/forms/supply-source-preparation";
import { useScopedRead } from "@/lib/use-scoped-read";
import { parseSupplySources, type SupplySourceOption } from "@/lib/validation/supply-sources";
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
import { WizardRecipientCard, WizardRecipientOptions } from "./delivery-recipient";
import { RelatedDocument } from "./related-document";
import { ReturnBarcodeDialog } from "./return-barcode-dialog";
import { SupplySourcePicker, type SupplySourceSelection } from "./supply-source-picker";

function ReturnRecipient({ reference, recipientId, savedName, reason, onSelect }: {
  reference: TransferPreparation; recipientId: string; savedName: string | undefined; reason: string;
  onSelect: (id: string, reason: string) => void;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [edit, setEdit] = useState<{ id: string; reason: string } | null>(null);
  const chosen = reference.people.find(person => person.id === recipientId);
  const valid = edit && reference.people.some(person => person.id === edit.id);
  const needsReason = !!edit?.id && edit.id !== reference.suggested?.professionalId;

  return <section className="hca-form-stack" aria-label="Escolha do recebedor">
    <WizardRecipientCard title="Quem receberá na família" name={chosen?.name || (recipientId ? savedName : undefined)} role={chosen?.role}
      invalid={!!recipientId && !chosen} disabled={!reference.people.length} triggerRef={triggerRef}
      onEdit={() => setEdit({ id: recipientId, reason })} />
    {recipientId && !chosen ? <p className="hca-field-help">A escolha anterior está indisponível. Indique outra pessoa.</p> : null}
    {edit ? <Dialog open title="Escolher quem receberá" kicker="Devolução" subtitle="Escolha quem conferirá a devolução na família."
      popupClassName="hca-wizard-dialog" finalFocus={triggerRef} onClose={() => setEdit(null)} keyboardScrollable
      footer={<>
        <ActionButton onClick={() => setEdit(null)}>Voltar</ActionButton>
        <ActionButton variant="primary" disabled={!valid || needsReason && edit.reason.trim().length < 3}
          onClick={() => { onSelect(edit.id, edit.reason.trim()); setEdit(null); }}>
          <Icon name="check" />Usar recebedor
        </ActionButton>
      </>}>
      <div className="hca-form-stack">
        {edit.id && !valid ? <p className="hca-field-help">{savedName || "Escolha anterior"} · indisponível</p> : null}
        <WizardRecipientOptions label="Recebedor físico designado" people={reference.people} value={edit.id}
          onChange={id => setEdit(current => current && { ...current, id })} />
        {needsReason || edit.reason ? <FormField label="Justificativa da escolha do recebedor" required={needsReason}>
          <TextAreaField rows={2} minLength={3} maxLength={1000} value={edit.reason}
            onChange={event => setEdit({ ...edit, reason: event.currentTarget.value })} />
        </FormField> : null}
      </div>
    </Dialog> : null}
  </section>;
}

export const custodyName = (source: Custody) =>
  source === "FAMILY" ? "Família" : "Equipe";
export function TransferConsole({ source, routedOriginId }: { source?: Custody; routedOriginId?: string } = {}) {
  const kind = source === "CARE_TEAM" ? "DEV" : source === "FAMILY" ? "ENT" : null;
  return (
    <Workspace title={kind ? supplyWizardCopy[kind].title : "Entregas e devoluções de materiais"}
      heading={kind ? context => <SupplyWizardHeading kind={kind} patient={context.patient!.display_name} /> : undefined}>
      {(context) =>
        context.patient && can(context, "ent.read") ? (
          <PatientTransfers key={[context.userId, context.patient.id, routedOriginId].join(":")}
            context={context} fixedSource={source} routedOriginId={routedOriginId} />
        ) : (
          <Notice>Selecione um paciente com acesso às entregas.</Notice>
        )
      }
    </Workspace>
  );
}
function PatientTransfers({ context, fixedSource, routedOriginId }: { context: WorkspaceContext; fixedSource?: Custody; routedOriginId?: string }) {
  const router = useRouter();
  const [source, setSource] = useState<Custody | "">(fixedSource ?? ""),
    [editing, setEditing] = useState(() => Boolean(fixedSource === "CARE_TEAM" &&
      can(context, "ent.create") && can(context, "stock.team.read"))),
    [consulting, setConsulting] = useState(false);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  function endEditing() {
    if (fixedSource === "CARE_TEAM" && !consulting) {
      router.push(routedOriginId ? "/fichas/" + encodeURIComponent(routedOriginId) : "/fichas");
      return;
    }
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
          routedOriginId={routedOriginId}
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
  routedOriginId,
  consulting,
  onClose,
  headingRef,
}: {
  context: WorkspaceContext;
  source: Custody;
  routedOriginId?: string;
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
  const [sourceSetup, setSourceSetup] = useState(emptySupplySources);
  const [sourcePicker, setSourcePicker] = useState<{
    product?: { id: string; name: string };
    returnFocus: () => HTMLButtonElement | null;
  } | null>(null);
  const initialSourceRef = useRef<SupplySourceOption | null>(null);
  const [routedOriginWarning, setRoutedOriginWarning] = useState(false);
  const [readingBarcode, setReadingBarcode] = useState(false);
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
    returnOriginRef = useRef<HTMLButtonElement | null>(null),
    barcodeTriggerRef = useRef<HTMLButtonElement | null>(null),
    materialFormRef = useRef<HTMLFormElement>(null),
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
  const [draftTouched, setDraftTouched] = useState(false);
  const startFromOrigin = useCallback((option: SupplySourceOption) => {
    const result = prepareSupplySources(emptySupplySources, [{ option, importMaterials: true }], {}, {}, []);
    setLines(Object.entries(result.quantities).map(([productId, amount]) => ({ productId, quantity: amount })));
    setSourceSetup(result.preparation);
    setDraftTouched(true);
  }, []);
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
      setSourceSetup(values.sourceSetup ?? emptySupplySources);
      setRoutedOriginWarning(false);
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
      setSourceSetup(emptySupplySources);
      setSourcePicker(null);
      setReadingBarcode(false);
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
      if (initialSourceRef.current) startFromOrigin(initialSourceRef.current);
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
    sourceSetup,
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
  const linesByProduct = new Map(lines.map(line => [line.productId, line]));
  const selectedIds = [...linesByProduct.keys()];
  const extraItemsControl = <SupplyExtraItems items={pendingExtras} inExtras={step === 2}
    catalogue={products.map(({ id, name, unit }) => ({ id, name, unit }))} selected={new Set(selectedIds)}
    onChange={items => { setPendingExtras(items); setDraftTouched(true); }} onChoose={addExtra} />;
  const sourceIds = sourceSetup.sources.length ? sourceSetup.sources.map(link => link.documentId).join(",") : originId;
  const sourceParams = new URLSearchParams({ careRecipientId: patientId, target: "DEV", ids: sourceIds });
  const decodeSources = useCallback((value: unknown) => parseSupplySources(value, patientId, "DEV", 1), [patientId]);
  const originOptions = useScopedRead(isReturn && write && sourceIds ? "/api/documents/sources?" + sourceParams : null,
    reference?.referenceHash, decodeSources);
  const sourceOptions = originOptions.data?.data ?? [];
  const generalSources = sourceSetup.sources.filter(link => link.general);
  const generalSourceOptions = sourceOptions.filter(option => option.id === originId || generalSources.some(link => link.documentId === option.id));
  const normalizedQuery = normalizeCatalogText(query);
  const returnProducts = isReturn && step === 1 ? products.filter(product =>
    !linesByProduct.get(product.id)?.extra && (normalizedQuery
      ? (linesByProduct.has(product.id) && product.category === activeCategory) ||
        normalizeCatalogText(`${product.name} ${product.category}`).includes(normalizedQuery)
      : product.category === activeCategory)) : [];
  const review = packet?.declaration ?? (reviewingPending ? {
    recipientId, originDocumentId: originId, reason, observations, lines, sources: sourceSetup.sources,
  } : null);
  const regularSelection = lines.flatMap(line => {
    const product = productsById.get(line.productId);
    return product && !line.extra ? [product] : [];
  });
  const visibleLines = lines.filter(line => step === 2 ? Boolean(line.extra) : !line.extra &&
    (productsById.get(line.productId)?.category ?? "medicamentos") === activeCategory);

  function currentSourceSelection() {
    const productId = sourcePicker?.product?.id;
    return sourceOptions.flatMap(option => {
      const link = sourceSetup.sources.find(row => row.documentId === option.id);
      const chosen = productId ? link?.productIds.includes(productId) : link?.general || option.id === originId;
      return chosen ? [{ option, importMaterials: Boolean(sourceSetup.sourceImports[option.id]?.length) }] : [];
    });
  }
  function closeSourcePicker() {
    const restore = sourcePicker?.returnFocus;
    setSourcePicker(null);
    if (restore) requestAnimationFrame(() => restore()?.focus({ preventScroll: true }));
  }
  function applyReturnSources(selections: SupplySourceSelection[], productId?: string) {
    const previous = originId && productId
      ? { ...sourceSetup, sources: [...sourceSetup.sources, { documentId: originId, general: true, productIds: [] }] }
      : sourceSetup;
    const quantities = Object.fromEntries(lines.map(line => [line.productId, line.quantity]));
    if (productId && selections.length && !Object.hasOwn(quantities, productId)) quantities[productId] = "";
    const result = prepareSupplySources(previous, selections, quantities, {}, [], productId);
    setLines(Object.entries(result.quantities).map(([id, amount]) => ({
      productId: id, quantity: amount, extra: linesByProduct.get(id)?.extra,
    })));
    setSourceSetup(result.preparation);
    if (productId && selections.length) {
      const productCategory = productsById.get(productId)?.category;
      setCategory(materialCategories.find(entry => entry.id === productCategory)?.id ?? activeCategory);
    }
    setOriginId("");
    setDraftTouched(true);
  }
  function setReturnMaterial(productId: string, included: boolean) {
    if (!included) applyReturnSources([], productId);
    else {
      const productCategory = productsById.get(productId)?.category;
      setCategory(materialCategories.find(entry => entry.id === productCategory)?.id ?? activeCategory);
    }
    setLines(previous => included
      ? [...previous, { productId, quantity: "" }]
      : previous.filter(line => line.productId !== productId));
    setDraftTouched(true);
  }
  function updateReturnQuantity(productId: string, amount: string) {
    setLines(previous => previous.some(row => row.productId === productId)
      ? previous.map(row => row.productId === productId ? { ...row, quantity: amount } : row)
      : [...previous, { productId, quantity: amount }]);
    setSourceSetup(previous => {
      if (!Object.hasOwn(previous.sourceSeeds, productId)) return previous;
      const seeds = { ...previous.sourceSeeds };
      delete seeds[productId];
      return { ...previous, sourceSeeds: seeds };
    });
    setDraftTouched(true);
  }
  function closeBarcode() {
    setReadingBarcode(false);
  }
  useLongDraftAutosave(privateDraft, currentContent, write && draftTouched && !(busy || uncertain || packet || result || recoveredId || navigating));
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
        if (!loadedRef.current && isReturn && routedOriginId) {
          try {
            const params = new URLSearchParams({ careRecipientId: patientId, target: "DEV", ids: routedOriginId });
            const payload = await api<unknown>("/api/documents/sources?" + params, undefined, controller.signal);
            if (controller.signal.aborted) return;
            const option = parseSupplySources(payload, patientId, "DEV", 1).data.find(row => row.id === routedOriginId);
            initialSourceRef.current = option
              ? { ...option, materials: option.materials.filter(row => current.products.some(item => item.id === row.productId)) }
              : null;
          } catch {
            if (controller.signal.aborted) return;
          }
        }
        if (!loadedRef.current && !restoredRef.current) {
          if (initialSourceRef.current) startFromOrigin(initialSourceRef.current);
          else if (routedOriginId) setRoutedOriginWarning(true);
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
  }, [patientId, source, context.userId, attempt, recoveryOnly, isReturn, routedOriginId, startFromOrigin]);
  useEffect(() => {
    if (packet || result || reviewingPending) reviewHeadingRef.current?.focus();
  }, [packet, result, reviewingPending]);
  function close() {
    if (uncertain || privateDraft.pending || busy) return;
    if (
      !result &&
      !recoveryOnly &&
      (reason || observations.length || lines.length || pendingExtras.length || counterpartyId || recipientId || sourceIds)
    )
      setDiscard(true);
    else onClose();
  }
  function editReviewedStep(target: 1 | 2 | 3) {
    if (uncertain || busy) return;
    issuanceFailure.clear();
    setPacket(null);
    setReviewingPending(false);
    setStep(target);
    if (target === 3) requestAnimationFrame(() => observationsHeadingRef.current?.focus());
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
      const nextCategory = step === 1 && isReturn && adjacentMaterialCategory(activeCategory, reference.products, "next");
      const stepLines = lines.filter(line => !!line.extra === (step === 2) &&
        (!nextCategory || productsById.get(line.productId)?.category === activeCategory));
      const invalidLine = materialStep && stepLines.find((line) => {
        const product = reference.products.find((item) => item.id === line.productId);
        return !product || !validQuantity(line.quantity, product.quantityDecimals) || quantity(line.quantity).gt(product.available);
      });
      if (invalidLine) {
        const invalidCategory = materialCategories.find(entry => entry.id === productsById.get(invalidLine.productId)?.category);
        if (step === 1 && isReturn && invalidCategory && invalidCategory.id !== activeCategory) {
          setCategory(invalidCategory.id);
          setQuery("");
        }
        setError("Escolha os materiais e informe quantidades válidas dentro do saldo disponível.");
        return;
      }
      setError("");
      setQuery("");
      if (nextCategory) {
        setCategory(nextCategory);
        return;
      }
      if (step === 0 && isReturn) setCategory(adjacentMaterialCategory(undefined, reference.products, "next") ?? "medicamentos");
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
      requestAnimationFrame(() => (returnOriginRef.current ?? originFieldRef.current)?.focus());
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
        ...(sourceSetup.sources.length ? { sources: sourceSetup.sources } : {}),
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
    const product = productsById.get(id);
    const destination = materialCategories.find(entry => entry.id === product?.category);
    if (!destination || selectedIds.includes(id)) return;
    setLines(current => [...current, { productId: id, quantity: amount }]);
    if (replace) setPendingExtras(current => current.filter(item => item.id !== replace));
    setCategory(destination.id);
    setQuery("");
    setStep(1);
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
  const privatePanel = !result && !uncertain && !navigating && !(busy && packet) ? (
    <SimpleDraftPanel
      draft={privateDraft}
      current={currentContent}
      statusInFooter
      patientName={context.patient?.display_name ?? "Paciente selecionado"}
      authorName={context.fullName}
      documentLabel={isReturn ? "Devolução" : "Entrega"}
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
      {sourceSetup.sources.length ? <p>Fichas vinculadas: {sourceOptions.length
        ? sourceOptions.map(option => option.code).join(" · ")
        : "Vínculos preservados no rascunho"}</p> : <p>
        Origem documental:{" "}
        {currentContent.fields.originLabel || "Sem vínculo informado"} →{" "}
        {originId
          ? (comparison.origins.find((origin) => origin.id === originId)
              ?.code ?? "Vínculo fora da seleção atual ou indisponível")
          : "Sem vínculo informado"}
        .
      </p>}
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
  const reviewRows = (review?.lines ?? []).map(line => {
    const product = productsById.get(line.productId);
    const material = product ?? currentContent.materials.find(item => item.id === line.productId);
    return {
      id: line.productId,
      name: material?.name ?? "Material indisponível",
      category: product?.category ?? "medicamentos",
      extra: linesByProduct.get(line.productId)?.extra,
      details: <small>{formatQuantity(line.quantity, material?.unit)}
        {product?.active === false ? " · Inativo com saldo" : ""}</small>,
      consult: product ? <MaterialConsultButton context={context} material={product} menu /> : null,
    };
  });
  const catalogueReviewRows = reviewRows.filter(row => !row.extra);
  const extraReviewRows = [...reviewRows.filter(row => row.extra), ...pendingExtras.map(pendingExtraReviewRow)];
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
              <form ref={materialFormRef} className="grid min-w-0 grid-cols-1 gap-4" onSubmit={prepare}>
                {step === 0 ? <>
                <h3>Confirme os dados da {isReturn ? "devolução" : "entrega"}</h3>
                <SupplyWizardIdentity context={context} kind={isReturn ? "DEV" : "ENT"} />
                {isReturn ? <ReturnRecipient reference={reference!} recipientId={recipientId}
                  savedName={currentContent.fields.recipientLabel} reason={reason}
                  onSelect={(id, explanation) => { setRecipientId(id); setReason(explanation); setDraftTouched(true); }} /> : <>
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
                </>}
                {isReturn ? <section className="hca-form-stack" aria-label="Fichas vinculadas">
                  <h3>Fichas vinculadas</h3>
                  <div className="hca-source-summary">
                    <span className="hca-source-symbol"><Icon name="link" /></span>
                    <div>
                      <strong>{generalSourceOptions.length ? generalSourceOptions.map(option => option.code).join(" · ")
                        : originId || generalSources.length ? "Origens vinculadas"
                        : sourceSetup.sources.length ? "Vínculos por material" : "Ficha independente"}</strong>
                      <small>{Object.values(sourceSetup.sourceImports).some(ids => ids.length)
                        ? "Materiais elegíveis trazidos das fichas de origem."
                        : originId || generalSources.length ? "Vínculo geral, sem importar materiais."
                        : "Vincule uma origem se ela fizer parte deste registro."}</small>
                    </div>
                    <ActionButton ref={returnOriginRef} compact variant="quiet"
                      onClick={() => setSourcePicker({ returnFocus: () => returnOriginRef.current })} disabled={originOptions.loading}>
                      <Icon name={originId || generalSources.length ? "edit" : "link"} />
                      {originId || generalSources.length ? "Alterar" : "Vincular"}
                    </ActionButton>
                  </div>
                  {!originOptions.loading && sourceIds && sourceOptions.length < sourceIds.split(",").length
                    ? <p className="hca-field-help">Uma origem está indisponível. Confira a seleção antes de expedir.</p> : null}
                  {routedOriginWarning && !sourceIds ? <p className="hca-field-help">
                    A entrega de origem está indisponível. Você pode vincular outra entrega ou prosseguir com uma devolução independente.
                  </p> : null}
                </section> : <>
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
                  O vínculo identifica a origem documental conhecida. Até 100 fichas recentes
                  com aceite nesta custódia ({reference!.originTotal} no total).
                </p>
                </>}
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
                <h3>{step === 2 ? "Itens extras" : isReturn ? "Selecione o que será devolvido" : supplyWizardStages[step]}</h3>
                {isReturn && step === 1 ? <p className="hca-field-help">
                  A devolução leva materiais do estoque da equipe de volta à família.
                </p> : null}
                {step === 1 ? <WizardMaterialCategories category={activeCategory} selected={regularSelection} onChange={next => { setCategory(next); setQuery(""); }} /> : null}
                {isReturn && step === 1 ? <>
                  <WizardMaterialToolbar count={selectedIds.length + pendingExtras.length} matches={query.trim() ? returnProducts.length : undefined}>
                    <ActionButton ref={barcodeTriggerRef} variant="quiet" compact onClick={() => setReadingBarcode(true)}>
                      <Icon name="camera" />Ler código
                    </ActionButton>
                    {extraItemsControl}
                  </WizardMaterialToolbar>
                  <WizardMaterialSearch value={query} onChange={setQuery} />
                </> : extraItemsControl}
                {isReturn && step === 1 ? <div className="hca-wizard-material-list">
                  {returnProducts.map(product => {
                    const line = linesByProduct.get(product.id);
                    const available = quantity(product.available).gt(0);
                    const materialSources = sourceOptions.filter(option => sourceSetup.sources.some(link =>
                      link.documentId === option.id && link.productIds.includes(product.id)));
                    return <MaterialChoice key={product.id} materialId={product.id} selected={!!line} quantity className="hca-wizard-material hca-wizard-transfer-line">
                      <div className="hca-wizard-material-head">
                        <label className="hca-material-choice-heading">
                          <input type="checkbox" role="switch" className="hca-wizard-include-switch" aria-label={"Incluir " + product.name}
                            checked={!!line} disabled={!line && !available}
                            onChange={event => setReturnMaterial(product.id, event.currentTarget.checked)} />
                          <span className="hca-wizard-material-icon"><Icon name={materialCategories.find(entry => entry.id === product.category)?.icon ?? "box"} /></span>
                          <span className="hca-material-choice-copy">
                            <strong>{product.name}</strong>
                            <small>{product.unit}{!product.active ? " · Inativo" : ""}</small>
                          </span>
                        </label>
                        <MaterialConsultButton context={context} material={product} menu
                          onLink={(line || available) && !originOptions.loading ? returnFocus => setSourcePicker({ product, returnFocus }) : undefined} />
                      </div>
                      {materialSources.map(option => {
                        const amount = option.materials.find(item => item.productId === product.id)?.available;
                        return <div className="hca-wizard-return-source" key={option.id}>
                          <RelatedDocument id={option.id} type="ENT" label={option.code} compact />
                          <time dateTime={option.createdAt}>{formatBrazilDate(option.createdAt)}</time>
                          {amount ? <><span>Disponível para devolução</span><strong>{formatQuantity(amount, product.unit)}</strong></> : null}
                        </div>;
                      })}
                      <p className="hca-wizard-material-balance col-span-full">
                        Estoque atual da equipe: {formatQuantity(product.available, product.unit)}.
                      </p>
                      {line ? <label className="hca-wizard-stock-field text-xs font-semibold">
                        <span>Quantidade a devolver</span>
                        <WizardQuantityInput aria-label={"Quantidade de " + product.name} required unit={product.unit}
                          inputMode={product.quantityDecimals ? "decimal" : "numeric"} value={line.quantity}
                          onChange={event => updateReturnQuantity(product.id, event.currentTarget.value)} />
                      </label> : null}
                    </MaterialChoice>;
                  })}
                  {!returnProducts.length ? <p role="status">Nenhum material neste filtro.</p> : null}
                </div> : null}
                {!isReturn && step === 1 ? (
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
                  isReturn && step === 1 ? null :
                  step === 2 && pendingExtras.length ? null : <p>
                    {step === 2 ? "Nenhum item extra incluído." : "Nenhum material selecionado. Informe as quantidades na unidade base."}
                  </p>
                ) : (
                  visibleLines.filter(line => !isReturn || step !== 1 || !productsById.has(line.productId)).map((line) => {
                    const product = reference!.products.find(
                      (p) => p.id === line.productId,
                    );
                    const name = product?.name ?? currentContent.materials.find(material => material.id === line.productId)?.name ?? "Material indisponível";
                    return (
                      <fieldset
                        key={line.productId}
                        data-wizard-material={line.productId}
                        aria-label={name}
                        className="hca-material-choice is-selected hca-wizard-material hca-wizard-transfer-line"
                      >
                        <div className="hca-wizard-material-head">
                          <div className="hca-material-choice-copy"><strong>{name}</strong>{product?.unit ? <small>{product.unit}</small> : null}</div>
                          {product ? <MaterialConsultButton context={context} material={product} menu
                            onLink={isReturn && !originOptions.loading ? returnFocus => setSourcePicker({ product, returnFocus }) : undefined} /> : null}
                        </div>
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
                          onClick={() => isReturn ? setReturnMaterial(line.productId, false)
                            : setLines(previous => previous.filter(row => row.productId !== line.productId))}
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
                <SupplyWizardFooter status={{ draft: privateDraft, current: currentContent, hasEdits: draftTouched }} back={step > 0
                  ? <ActionButton variant="quiet" onClick={() => {
                    setError("");
                    setQuery("");
                    const previous = isReturn && reference && (step === 1 || step === 2) &&
                      adjacentMaterialCategory(step === 1 ? activeCategory : undefined, reference.products, "previous");
                    if (previous) setCategory(previous);
                    if (!previous || step === 2) setStep(step - 1);
                  }}><Icon name="back" width="14" height="14" />Voltar</ActionButton>
                  : <ActionButton variant="quiet" disabled={busy || privateDraft.blocked} onClick={close}><Icon name="back" width="14" height="14" />Sair por agora</ActionButton>}>
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
                  <Icon name="arrow" width="14" height="14" />
                  {supplyWizardNextLabels[step]}
                </ActionButton>
                </SupplyWizardFooter>
              </form>
            </>
          ) : (
            <section className="hca-transfer-wizard-review">
              <h2 ref={reviewHeadingRef} tabIndex={-1}>Revise antes de expedir</h2>
              <p className="hca-field-help">Confira os materiais e as informações que acompanharão esta ficha.</p>
              <dl className="hca-transfer-wizard-summary hca-wizard-review-identity">
                <div><dt>Paciente</dt><dd>{context.patient?.display_name}</dd></div>
                <div><dt>Preenchido por</dt><dd>{context.fullName}</dd></div>
                <div><dt>Destino</dt><dd>{isReturn ? "Estoque da família" : "Estoque da equipe"}</dd></div>
                <div><dt>Recebedor físico</dt><dd>{personName(review.recipientId)}</dd></div>
              </dl>
              {isReturn ? <WizardCatalogueReview rows={catalogueReviewRows} disabled={uncertain || busy}
                onEdit={(category, materialId) => {
                  setCategory(category);
                  setQuery("");
                  editReviewedStep(1);
                  focusWizardMaterial(() => materialFormRef.current, materialId);
                }} /> : <section>
                <div className="hca-issuance-observation-heading">
                  <h3>Materiais</h3>
                  <ActionButton compact variant="quiet" aria-label="Editar materiais do catálogo" disabled={uncertain || busy}
                    onClick={() => editReviewedStep(1)}>Editar</ActionButton>
                </div>
                <MaterialReview rows={catalogueReviewRows} />
              </section>}
              <section aria-label="Itens extras">
                <div className="hca-issuance-observation-heading">
                  <h3>Itens extras</h3>
                  <ActionButton compact variant="quiet" aria-label="Editar itens extras" disabled={uncertain || busy}
                    onClick={() => editReviewedStep(2)}>Editar</ActionButton>
                </div>
                {extraReviewRows.length ? <MaterialReview rows={extraReviewRows} />
                  : <p className="hca-field-help">Nenhum item extra pendente.</p>}
              </section>
              {review.sources?.length ? <section className="hca-document-summary" aria-label="Fichas vinculadas">
                <h3>Fichas vinculadas</h3>
                {review.sources.map(link => {
                  const option = sourceOptions.find(item => item.id === link.documentId);
                  return <div key={link.documentId}>
                    {option ? <RelatedDocument id={option.id} type="ENT" label={option.code} compact /> : <p>Origem indisponível para consulta</p>}
                    {link.general ? <small>Vínculo geral</small> : null}
                    {link.productIds.length ? <small>{link.productIds.map(id => productsById.get(id)?.name ?? "Material selecionado").join(", ")}</small> : null}
                  </div>;
                })}
              </section> : <p>
                Origem documental:{" "}
                {reference?.origins.find(
                  (origin) => origin.id === review.originDocumentId,
                )?.code ?? "Sem vínculo informado"}
                .
              </p>}
              {review.reason ? <p className="whitespace-pre-wrap">
                {review.observations ? "Justificativa da escolha do recebedor" : "Sua justificativa"}: {review.reason}
              </p> : null}
              <section className="hca-document-summary">
                <div className="hca-issuance-observation-heading">
                  <h3>Observações</h3>
                  <ActionButton compact variant="quiet" aria-label="Editar observações" disabled={uncertain || busy}
                    onClick={() => editReviewedStep(3)}>Editar</ActionButton>
                </div>
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
              <SupplyWizardFooter status={busy || navigating || uncertain ? undefined : { draft: privateDraft, current: currentContent, hasEdits: draftTouched }} back={!uncertain ? (
                  <ActionButton
                    variant="quiet"
                    onClick={() => {
                      issuanceFailure.clear();
                      setPacket(null);
                      setReviewingPending(false);
                      requestAnimationFrame(() =>
                        (reasonFieldRef.current ?? observationsHeadingRef.current)?.focus(),
                      );
                    }}
                  >
                    <Icon name="back" width="14" height="14" />Voltar
                  </ActionButton>
                ) : null}>
                <ActionButton variant="primary" disabled={busy || reviewingPending} onClick={() => { if (!issuanceFailure.reopen()) void submit(); }}>
                  <Icon name="send" width="16" height="16" />
                  {uncertain
                    ? "Verificar a expedição"
                    : supplyWizardCopy[isReturn ? "DEV" : "ENT"].finish}
                </ActionButton>
              </SupplyWizardFooter>
            </section>
          )}
        </div>
      )}
      </div>
      {sourcePicker ? <SupplySourcePicker patientId={patientId} target="DEV" current={currentSourceSelection()}
        product={sourcePicker.product} onClose={closeSourcePicker}
        onApply={selection => {
          const productId = sourcePicker.product?.id;
          const previousIds = sourceSetup.sources.filter(link => productId && link.productIds.includes(productId))
            .map(link => link.documentId);
          const unchanged = productId && previousIds.length === selection.length &&
            selection.every(row => previousIds.includes(row.option.id));
          if (!unchanged) applyReturnSources(selection, productId);
          closeSourcePicker();
        }} /> : null}
      {readingBarcode && write && !referenceUnavailable ? <ReturnBarcodeDialog patientId={patientId} products={products}
        amounts={linesByProduct} onClose={closeBarcode} finalFocus={() => barcodeTriggerRef.current ?? false} onApply={(product, amount) => {
          updateReturnQuantity(product.id, amount);
          if (!linesByProduct.get(product.id)?.extra) {
            setCategory(materialCategories.find(entry => entry.id === product.category)?.id ?? activeCategory);
            setQuery("");
          }
          closeBarcode();
        }} /> : null}
      <DocumentIssuanceFailure state={issuanceFailure} operation={isReturn ? "Expedição de devolução" : "Expedição de entrega"} onRetry={submit} />
    </section>
  );
}
