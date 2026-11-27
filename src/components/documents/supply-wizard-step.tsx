"use client";
import { SupplyWizardIdentity, SupplyWizardReviewIdentity } from "@/components/forms/supply-wizard-identity";
import { focusWizardMaterial, WizardCatalogueReview, WizardMaterialSearch, WizardMaterialToolbar, WizardQuantityInput } from "@/components/forms/wizard-material-tools";
import { MaterialChoice } from "@/components/catalog/material-choice";
import { MaterialReview } from "./material-review";
import { MaterialConsultButton } from "./catalogue-material-panel";
import { RelatedDocument } from "./related-document";
import { ActionButton, CheckboxField, FormField, Pill, TextAreaField } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { Dialog } from "@/components/ui/overlays";
import { FeedbackBanner } from "@/components/ui/feedback";
import { materialCategories, supplyExtrasStep, WizardMaterialCategories } from "@/components/forms/supply-wizard-stages";
import { pendingExtraReviewRow, SupplyExtraItems } from "./supply-extra-items";
import type { PendingPurchaseExtra } from "@/lib/validation/pending-purchase-extras";
import { IssuanceObservationsEditor, IssuanceObservationList } from "@/components/forms/issuance-observations";
import { issuanceObservations } from "@/lib/documents/issuance-observations";
import {
  DeliveryRecipientField,
  DeliveryRecipientReference,
} from "./delivery-recipient";
import { useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import {
  inputClass,
  Notice,
  type WorkspaceContext,
} from "@/components/workspace";
import { SupplyBarcodeDialog } from "./supply-barcode-dialog";
import {
  PresentationQuantity,
  presentationTotal,
} from "./presentation-quantity";
import type {
  PresentationSelection,
  ProductPresentation,
} from "@/types/catalogue";
import { formatQuantity } from "@/lib/quantity";
import { formatBrazilDate } from "@/lib/receipt";
import { formatStockObservation, newestStockObservationsFirst } from "@/lib/stock-observation";
import type { PurchaseMaterialSource } from "@/lib/forms/supply-source-preparation";
import { normalizeCatalogText } from "@/lib/catalog-match";
import { presentationCaption } from "@/lib/presentation-conversion";
import type {
  SupplyType,
  CatalogProduct,
  PatientPerson,
  DeliveryPreparation,
} from "@/types/documents";
export type WizardState = {
  quantities: Record<string, string>;
  extraProductIds?: string[];
  pendingExtras?: PendingPurchaseExtra[];
  notes: string;
  observations?: string[];
  observationTimes?: Record<string, string | null>;
  origin: "" | "purchase" | "donation";
  source: "FAMILY" | "CARE_TEAM";
  recipientId: string;
  recipientReason?: string;
  sharedNeedReasons?: Record<string, string>;
  requestFulfillments?: Record<string, "" | "partial" | "complete">;
  presentationSelections?: Record<string, PresentationSelection[]>;
  manualQuantities?: Record<string, string>;
};

function SharedNeedReason({ type, productId, form, setForm, error }: {
  type: "COM" | "ENT";
  productId: string;
  form: WizardState;
  setForm: Dispatch<SetStateAction<WizardState>>;
  error?: string;
}) {
  return <FormField label="Justificativa da necessidade compartilhada" required error={error}
    helpText={type === "ENT" ? "Explique por que as requisições representam a mesma necessidade."
      : "A compra relacionada às requisições ajuda a preparar a entrega."}>
    <TextAreaField rows={2} required minLength={3} maxLength={500}
      value={form.sharedNeedReasons?.[productId] ?? ""} onChange={(event) => {
        const reason = event.currentTarget.value;
        setForm(current => ({ ...current, sharedNeedReasons: { ...current.sharedNeedReasons, [productId]: reason } }));
      }} />
  </FormField>;
}

function PurchaseSourceCounts({ sources, familyStock, unit }: {
  sources: PurchaseMaterialSource[];
  familyStock?: string;
  unit: string;
}) {
  const ordered = newestStockObservationsFirst(sources.map(source => ({ ...source, ...source.observation })));
  const latest = ordered.find(source => source.mode === "observed" && source.quantity !== null);
  return <div className="hca-wizard-source-counts">
    <ul aria-label="Contagens das REQs vinculadas">
      {ordered.map(source => {
        const counted = source.mode === "observed" && source.quantity !== null;
        const mostRecent = source.lineId === latest?.lineId;
        const recordedAt = source.observedAt ?? source.createdAt;
        return <li key={source.lineId}>
          <RelatedDocument id={source.id} label={source.code} compact compactIcon="link" />
          <time dateTime={recordedAt}>{formatBrazilDate(recordedAt)}</time>
          <small>Estoque informado na REQ</small>
          <strong>{counted
            ? formatQuantity(source.quantity, source.unit ?? undefined)
            : formatStockObservation(source.quantity, source.mode ?? undefined, source.unit ?? undefined)}</strong>
          {counted && ordered.length > 1 ? <>
            <small>{source.requesterName}</small>
            <Pill tone={mostRecent ? "success" : "neutral"}>
              {mostRecent ? "Mais recente" : "Contagem anterior"}
            </Pill>
          </> : null}
        </li>;
      })}
    </ul>
    {familyStock !== undefined ? <p><Icon name="home" width={14} height={14} />Estoque familiar hoje: {formatQuantity(familyStock, unit)}</p> : null}
  </div>;
}

export function SupplyWizardStep({
  step,
  onCategoryChange,
  onEditStage,
  type,
  purchaseApproval,
  context,
  form,
  setForm,
  fieldErrors,
  catalog,
  people,
  links,
  purchaseSources,
  purchaseSourceNotice,
  sourceSection,
  openMaterialSources,
  onScannedMaterial,
  recipientContext,
  recipientComparison,
  recipientError,
  recipientLoading,
  previousRecipient,
  refreshRecipients,
  adoptRecipients,
  presentations,
  presentationError,
  presentationLoading,
  refreshPresentations,
}: {
  step: number;
  onCategoryChange: (category: string) => void;
  onEditStage: (stage: 2 | 3) => void;
  type: Exclude<SupplyType, "BAL">;
  purchaseApproval?: "automatic" | "required";
  context: WorkspaceContext;
  form: WizardState;
  setForm: Dispatch<SetStateAction<WizardState>>;
  fieldErrors: Record<string, string>;
  catalog: CatalogProduct[];
  people: PatientPerson[];
  links: Record<string, string[]>;
  purchaseSources?: { byProduct: Map<string, PurchaseMaterialSource[]>; familyStock?: Record<string, string> };
  purchaseSourceNotice?: ReactNode;
  sourceSection?: ReactNode;
  openMaterialSources?: (product: CatalogProduct, returnFocus: () => HTMLButtonElement | null) => void;
  onScannedMaterial: (product: CatalogProduct) => void;
  recipientContext: DeliveryPreparation | null;
  recipientComparison: DeliveryPreparation | null;
  recipientError: string;
  recipientLoading: boolean;
  previousRecipient?: string | null;
  refreshRecipients: () => void;
  adoptRecipients: () => void;
  presentations: ProductPresentation[];
  presentationError: string;
  presentationLoading: boolean;
  refreshPresentations: () => void;
}) {
  const category = materialCategories[step - 1]?.id;
  const extras = new Set(form.extraProductIds);
  const isExtraStep = step === supplyExtrasStep;
  const [searchByCategory, setSearchByCategory] = useState<
    Record<string, string>
  >({});
  const [presentationEditor, setPresentationEditor] = useState<{
    productId: string;
    returnFocus: () => HTMLButtonElement | null;
  } | null>(null);
  const [barcodeOpen, setBarcodeOpen] = useState(false);
  const barcodeTriggerRef = useRef<HTMLButtonElement>(null);
  const materialListRef = useRef<HTMLDivElement>(null);
  const search = searchByCategory[category ?? ""] ?? "";
  const visibleProducts = catalog.filter(
    (product) =>
      isExtraStep ? extras.has(product.id) : !extras.has(product.id) && product.category === category &&
      (fieldErrors[product.id] || fieldErrors[product.id + ":shared"] || [
        product.name,
        ...(product.aliases ?? []),
        ...(product.selectionPredecessors ?? []).map((row) => row.name),
      ].some((name) =>
        normalizeCatalogText(name).includes(normalizeCatalogText(search)),
      )),
  );
  const selected = catalog.filter((product) =>
    Object.hasOwn(form.quantities, product.id),
  );
  const presentationProduct = presentationEditor && visibleProducts.find(product =>
    product.id === presentationEditor.productId && Object.hasOwn(form.quantities, product.id));
  const assessesDelivery = type === "ENT" && form.source === "FAMILY";
  const sharedPurchaseNeeds = type === "COM" && step === 0
    ? selected.filter(product => (links[product.id]?.length ?? 0) > 1)
    : [];
  const pendingExtras = form.pendingExtras ?? [];
  function adoptCatalogueMaterial(id: string, amount: string, replace?: string) {
    const product = catalog.find(item => item.id === id);
    const destination = materialCategories.find(item => item.id === product?.category);
    if (!destination) return;
    setForm(current => Object.hasOwn(current.quantities, id) ? current : {
      ...current,
      quantities: { ...current.quantities, [id]: amount },
      manualQuantities: { ...current.manualQuantities, [id]: amount },
      ...(replace ? { pendingExtras: current.pendingExtras?.filter(item => item.id !== replace) } : {}),
    });
    setSearchByCategory(current => ({ ...current, [destination.id]: "" }));
    onCategoryChange(destination.id);
  }
  const extraControl = <SupplyExtraItems items={pendingExtras} catalogue={catalog}
    selected={new Set(Object.keys(form.quantities))} inExtras={isExtraStep}
    onChange={items => setForm(current => ({ ...current, pendingExtras: items }))} onChoose={adoptCatalogueMaterial} />;
  function selectProduct(id: string, include: boolean) {
    setForm(current => {
      const quantities = { ...current.quantities };
      const presentationSelections = { ...current.presentationSelections };
      const manualQuantities = { ...current.manualQuantities };
      if (include) quantities[id] = "";
      else {
        delete quantities[id];
        delete presentationSelections[id];
        delete manualQuantities[id];
      }
      const next = { ...current, quantities, presentationSelections, manualQuantities,
        extraProductIds: current.extraProductIds?.filter(extraId => extraId !== id) };
      if (!include && assessesDelivery) {
        const requestFulfillments = { ...current.requestFulfillments };
        delete requestFulfillments[id];
        return { ...next, requestFulfillments };
      }
      return next;
    });
  }
  const reviewRows = step === 5 ? selected.map(product => ({
    id: product.id, name: product.name, category: product.category,
    consult: <MaterialConsultButton context={context} material={product} menu />,
    details: <><small>{form.quantities[product.id] ? formatQuantity(form.quantities[product.id], product.unit) : "Quantidade pendente"}</small>{form.presentationSelections?.[product.id]?.map(row => <small key={row.id}>{presentationCaption(row)}</small>)}
      {links[product.id]?.length ? <small>{links[product.id].length} {links[product.id].length === 1 ? "necessidade vinculada" : "necessidades vinculadas"}</small> : null}
      {assessesDelivery && links[product.id]?.length ? <small>
        {form.requestFulfillments?.[product.id] === "complete" ? "Atendimento integral previsto" : "Atendimento parcial previsto"}
      </small> : null}
      {assessesDelivery && (links[product.id]?.length ?? 0) > 1 && form.sharedNeedReasons?.[product.id]
        ? <small>{form.sharedNeedReasons[product.id]}</small> : null}
    </>,
  })) : [];
  function updatePackages(
    productId: string,
    selections: PresentationSelection[],
    manual: string,
  ) {
    setForm((current) => ({
      ...current,
      presentationSelections: {
        ...current.presentationSelections,
        [productId]: selections,
      },
      manualQuantities: { ...current.manualQuantities, [productId]: manual },
      quantities: {
        ...current.quantities,
        [productId]: selections.length
          ? presentationTotal(selections, manual)
          : manual,
      },
    }));
  }
  function closePresentationEditor() {
    const restoreFocus = presentationEditor?.returnFocus;
    setPresentationEditor(null);
    if (restoreFocus) requestAnimationFrame(() => restoreFocus()?.focus({ preventScroll: true }));
  }
  return (
    <>
      {step === 0 ? (
        <>
          <SupplyWizardIdentity context={context} kind={type} />
          <p className="hca-wizard-intro">
            {type === "COM"
              ? "Organize os materiais a adquirir. A família registra a compra ou a doação quando ela acontecer."
              : "A entrega vai da família para a equipe. Indique quem vai receber e conferir os materiais."}
          </p>
          {type === "ENT" ? (
            <div className="hca-form-stack">
              {form.source === "CARE_TEAM" ? <Notice>Preenchimento anterior de devolução · Equipe → Família.</Notice> : null}
              <DeliveryRecipientField
                key={form.source}
                data={recipientContext}
                comparison={recipientComparison}
                error={recipientError}
                loading={recipientLoading}
                form={form}
                setForm={setForm}
                fieldErrors={fieldErrors}
                previousRecipient={previousRecipient}
                onRefresh={refreshRecipients}
                onAdopt={adoptRecipients}
              />
            </div>
          ) : null}
          {sourceSection}
          {sharedPurchaseNeeds.length ? <section className="hca-form-stack" aria-label="Avaliação dos vínculos">
            <h3>Avaliação dos vínculos</h3>
            {sharedPurchaseNeeds.map(({ id, name }) => <fieldset className="hca-form-stack" key={id}>
              <legend>{name}</legend>
              <SharedNeedReason type="COM" productId={id} form={form} setForm={setForm} error={fieldErrors[id + ":shared"]} />
            </fieldset>)}
          </section> : null}
        </>
      ) : null}
      {category || isExtraStep ? (
        <>
          {category ? <>
            <WizardMaterialCategories category={category} selected={selected.filter(item => !extras.has(item.id))} onChange={onCategoryChange} />
          </> : null}
          {isExtraStep ? extraControl : null}
          {category ? <>
            <WizardMaterialToolbar count={selected.length + pendingExtras.length} matches={search.trim() ? visibleProducts.length : undefined}>
              <ActionButton ref={barcodeTriggerRef} compact variant="quiet"
                onClick={() => setBarcodeOpen(true)}><Icon name="camera" />Ler código</ActionButton>
              {extraControl}
            </WizardMaterialToolbar>
            <WizardMaterialSearch value={search} onChange={value => setSearchByCategory(current => ({ ...current, [category]: value }))} />
          </> : null}
          {purchaseSourceNotice}
          {!visibleProducts.length && !(isExtraStep && pendingExtras.length) ? (
            <Notice>
              {isExtraStep ? "Nenhum item extra incluído." : "Nenhum material nesta busca. Ajuste ou limpe o filtro; suas seleções continuam preservadas."}
            </Notice>
          ) : null}
          <div ref={materialListRef} className={isExtraStep ? "space-y-3" : "hca-wizard-material-list"}>
            {visibleProducts.map((product) => {
              const checked = Object.hasOwn(form.quantities, product.id);
              const linkedNeeds = links[product.id]?.length ?? 0;
              const sourceCounts = checked ? purchaseSources?.byProduct.get(product.id) : undefined;
              const assessmentHelpId = `ent-assessment-${encodeURIComponent(product.id)}`;
              const usesPresentations = Boolean(form.presentationSelections?.[product.id]?.length);
              const presentationErrorId = usesPresentations && fieldErrors[product.id]
                ? `wizard-presentation-error-${encodeURIComponent(product.id)}` : undefined;
              return (
                <MaterialChoice
                  selected={checked}
                  quantity
                  className="product-choice hca-wizard-material"
                  key={product.id}
                  materialId={product.id}
                >
                  <div className="hca-wizard-material-head">
                  <label className="hca-material-choice-heading">
                    {!isExtraStep ? (
                      <input
                        type="checkbox"
                        className="hca-wizard-include-switch"
                        checked={checked}
                        onChange={(event) => selectProduct(product.id, event.currentTarget.checked)}
                      />
                    ) : null}
                    <span className="hca-wizard-material-icon"><Icon name={materialCategories.find(entry => entry.id === product.category)?.icon ?? "box"} /></span>
                    <span className="hca-material-choice-copy">
                      <strong>{product.name}</strong>
                      <small>
                        {product.unit}
                        {links[product.id]?.length ? " · Vinculado à REQ" : ""}
                      </small>
                      {product.selectionPredecessors?.length ? (
                        <span className="mt-2 block text-xs">
                          Opção para novas escolhas após{" "}
                          {product.selectionPredecessors
                            .map((row) => `${row.name} (${row.unit})`)
                            .join(", ")}
                          . Confira a unidade {product.unit}; não há conversão
                          do saldo anterior.
                        </span>
                      ) : null}
                    </span>
                  </label>
                  <MaterialConsultButton context={context} material={product} menu
                    onLink={openMaterialSources ? returnFocus => openMaterialSources(product, returnFocus) : undefined}
                    onEditPresentations={checked
                      ? returnFocus => setPresentationEditor({ productId: product.id, returnFocus }) : undefined}
                    presentationErrorId={presentationErrorId} />
                  </div>
                  {sourceCounts?.length ? <PurchaseSourceCounts sources={sourceCounts}
                    familyStock={purchaseSources?.familyStock?.[product.id]} unit={product.unit} /> : null}
                  {isExtraStep ? <ActionButton type="button" onClick={() => selectProduct(product.id, false)}>
                    Remover {product.name}
                  </ActionButton> : null}
                  {checked && assessesDelivery && linkedNeeds ? <div className="col-span-full hca-form-stack">
                    <div>
                      <CheckboxField label="Atende integralmente à necessidade"
                        aria-label={`Atende integralmente à necessidade de ${product.name}`}
                        aria-describedby={assessmentHelpId}
                        checked={form.requestFulfillments?.[product.id] === "complete"}
                        onChange={event => {
                          const choice = event.currentTarget.checked ? "complete" : "partial";
                          setForm(current => ({ ...current, requestFulfillments: { ...current.requestFulfillments, [product.id]: choice } }));
                        }} />
                      <p id={assessmentHelpId} className="hca-field-help">Desmarcado indica atendimento parcial.</p>
                    </div>
                    {linkedNeeds > 1 ? <SharedNeedReason type="ENT" productId={product.id} form={form}
                      setForm={setForm} error={fieldErrors[product.id + ":shared"]} /> : null}
                  </div> : null}
                  {checked && !usesPresentations ? (
                    <label className="hca-wizard-stock-field text-xs font-semibold">
                      <span>{type === "COM" ? "Quantidade a adquirir" : "Quantidade a entregar"}</span>
                      <WizardQuantityInput
                        unit={product.unit}
                        inputMode={product.quantity_decimals ? "decimal" : "numeric"}
                        value={form.quantities[product.id] ?? ""}
                        aria-label={"Quantidade — " + product.name}
                        aria-invalid={Boolean(fieldErrors[product.id])}
                        onChange={(event) => {
                          // React can apply the update after the browser restores the input.
                          const value = event.currentTarget.value;
                          setForm((current) => ({
                            ...current,
                            quantities: {
                              ...current.quantities,
                              [product.id]: value,
                            },
                            manualQuantities: {
                              ...current.manualQuantities,
                              [product.id]: value,
                            },
                          }));
                        }}
                      />
                      {fieldErrors[product.id] ? (
                        <span className="ui-field-error">
                          {fieldErrors[product.id]}
                        </span>
                      ) : null}
                    </label>
                  ) : null}
                  {checked && usesPresentations ? (
                    <div className="col-span-full text-sm" aria-live="polite">
                      <p>Quantidade total calculada: <strong>{form.quantities[product.id]
                        ? formatQuantity(form.quantities[product.id], product.unit)
                        : "Preencha as quantidades"}</strong></p>
                      {presentationErrorId ? <p id={presentationErrorId} className="ui-field-error">
                        {fieldErrors[product.id]}
                      </p> : null}
                    </div>
                  ) : null}
                </MaterialChoice>
              );
            })}
          </div>
          {barcodeOpen && context.patient ? <SupplyBarcodeDialog patientId={context.patient.id}
            catalog={catalog} presentations={presentations} form={form}
            finalFocus={() => barcodeTriggerRef.current ?? document.getElementById("supply-wizard-heading") ?? false}
            onClose={() => setBarcodeOpen(false)} onApply={({ product, selections, manual }) => {
              updatePackages(product.id, selections, manual);
              setBarcodeOpen(false);
              onScannedMaterial(product);
            }} /> : null}
          {presentationProduct ? <Dialog open title={`Embalagens de ${presentationProduct.name}`}
            kicker="Apresentações e equivalência" headingIcon="box" keyboardScrollable
            onClose={closePresentationEditor} finalFocus={() => false}
            footer={<ActionButton variant="primary" onClick={closePresentationEditor}>Voltar ao material</ActionButton>}>
            <PresentationQuantity product={presentationProduct}
              selections={form.presentationSelections?.[presentationProduct.id] ?? []}
              manual={form.manualQuantities?.[presentationProduct.id] ?? form.quantities[presentationProduct.id] ?? "0"}
              source={presentations} error={presentationError} loading={presentationLoading} refresh={refreshPresentations}
              validationError={form.presentationSelections?.[presentationProduct.id]?.length
                ? fieldErrors[presentationProduct.id] : undefined}
              onChange={(selections, manual) => updatePackages(presentationProduct.id, selections, manual)} />
          </Dialog> : null}
        </>
      ) : null}
      {step === 4 ? (
        <>
          {form.notes ? (
          <label className="block text-sm font-semibold">
            Observação do preenchimento anterior
            <textarea
              className={inputClass}
              rows={4}
              maxLength={2000}
              value={form.notes}
              onChange={(event) =>
                setForm({ ...form, notes: event.target.value })
              }
              placeholder="Registre apenas exceções e informações necessárias."
            />
          </label>
          ) : null}
          <IssuanceObservationsEditor observations={form.observations ?? []}
            onChange={observations => setForm(previous => ({ ...previous, observations }))} errors={fieldErrors} />
        </>
      ) : null}
      {step === 5 ? (
        <>
          <SupplyWizardReviewIdentity context={context} kind={type}
            destination={type === "ENT" && form.source === "CARE_TEAM" ? "Estoque da família" : undefined}
            additional={type === "ENT" ? [
              { label: "Percurso", value: form.source === "FAMILY" ? "Família → Equipe" : "Equipe → Família" },
              { label: "Recebedor físico", value: recipientContext?.people.find(person => person.id === form.recipientId)?.name ?? people.find(person => person.id === form.recipientId)?.name ?? "Pessoa não disponível na referência atual" },
            ] : undefined}
          />
          {type === "ENT" && recipientContext ? <div className="mt-3 space-y-2">
            <DeliveryRecipientReference data={recipientContext} />
            {form.recipientReason ? <p className="whitespace-pre-wrap">
              Justificativa da escolha: {form.recipientReason}
            </p> : null}
          </div> : null}
            <WizardCatalogueReview rows={reviewRows.filter(row => !extras.has(row.id))} onEdit={(category, materialId) => {
              setSearchByCategory(current => ({ ...current, [category]: "" }));
              onCategoryChange(category);
              focusWizardMaterial(() => materialListRef.current, materialId);
            }} />
            <section aria-label="Itens extras">
              <div className="hca-issuance-observation-heading">
                <h3>Itens extras</h3>
                <ActionButton compact variant="quiet" aria-label="Editar itens extras" onClick={() => onEditStage(2)}>Editar</ActionButton>
              </div>
              {extras.size || pendingExtras.length ? <MaterialReview rows={[
                ...reviewRows.filter(row => extras.has(row.id)),
                ...pendingExtras.map(pendingExtraReviewRow),
              ]} /> : <p className="hca-field-help">Nenhum item extra incluído.</p>}
            </section>
          <section className="hca-document-summary">
            <div className="hca-issuance-observation-heading">
              <h3>Observações</h3>
              <ActionButton compact variant="quiet" aria-label="Editar observações" onClick={() => onEditStage(3)}>Editar</ActionButton>
            </div>
            <IssuanceObservationList observations={issuanceObservations(form).map(note => note.trim()).filter(Boolean)} />
          </section>
          {type === "ENT" ? <Notice>Ao concluir, as quantidades serão expedidas e aguardarão recebimento. Confira origem, destinatário e materiais.</Notice>
            : purchaseApproval && selected.length ? <div className="hca-form-stack">
                {purchaseApproval === "automatic" ? <>
                  <p className="hca-purchase-administrator"><Icon name="shield" />Administração · aprovação automática</p>
                  <FeedbackBanner tone="success" heading="Sua autorização já acompanha esta compra">
                    <p>Os materiais identificados serão autorizados no momento da emissão.</p>
                  </FeedbackBanner>
                </> : <Notice>Um administrador precisa autorizar os materiais identificados antes da compra.</Notice>}
                {pendingExtras.length ? <p className="hca-field-help">Os itens sem identificação aguardam cadastro.</p> : null}
              </div> : null}
        </>
      ) : null}
    </>
  );
}
