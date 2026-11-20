"use client";
import { MaterialChoice } from "@/components/catalog/material-choice";
import { MaterialReview } from "./material-review";
import { MaterialConsultButton } from "./catalogue-material-panel";
import { ActionButton, CheckboxField, DefinitionGrid, FormField, TextAreaField } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { Dialog } from "@/components/ui/overlays";
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

export function SupplyWizardStep({
  step,
  onCategoryChange,
  type,
  context,
  form,
  setForm,
  fieldErrors,
  catalog,
  people,
  links,
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
  type: SupplyType;
  context: WorkspaceContext;
  form: WizardState;
  setForm: Dispatch<SetStateAction<WizardState>>;
  fieldErrors: Record<string, string>;
  catalog: CatalogProduct[];
  people: PatientPerson[];
  links: Record<string, string[]>;
  sourceSection?: ReactNode;
  openMaterialSources?: (product: CatalogProduct) => void;
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
  const isExtraStep = type !== "BAL" && step === supplyExtrasStep;
  const [searchByCategory, setSearchByCategory] = useState<
    Record<string, string>
  >({});
  const [presentationEditor, setPresentationEditor] = useState<{
    productId: string;
    returnFocus: () => HTMLButtonElement | null;
  } | null>(null);
  const [barcodeOpen, setBarcodeOpen] = useState(false);
  const barcodeTriggerRef = useRef<HTMLButtonElement>(null);
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
  function addExtra(id: string, amount = "", replace?: string) {
    setForm(current => Object.hasOwn(current.quantities, id) ? current : {
      ...current,
      quantities: { ...current.quantities, [id]: amount },
      extraProductIds: [...(current.extraProductIds ?? []), id],
      ...(replace ? { pendingExtras: current.pendingExtras?.filter(item => item.id !== replace) } : {}),
    });
  }
  const extraControl = <SupplyExtraItems items={pendingExtras} catalogue={catalog}
    selected={new Set(Object.keys(form.quantities))} inExtras={isExtraStep}
    onChange={items => setForm(current => ({ ...current, pendingExtras: items }))} onChoose={addExtra} />;
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
  const reviewRows = step === 5 && type !== "BAL" ? selected.map(product => ({
    id: product.id, name: product.name, category: product.category,
    consult: <MaterialConsultButton context={context} material={product} />,
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
          <p className="text-sm leading-6 text-(--muted)">
            {type === "COM"
              ? "Organize os materiais a adquirir. A família registra a compra ou a doação quando ela acontecer."
              : type === "ENT"
                ? "Selecione as custódias e a pessoa que confirmará o recebimento. A expedição deixa os materiais em trânsito."
                : "Conte todos os produtos sob responsabilidade familiar que estão com a equipe. Materiais de terceiros ficam fora deste controle."}
          </p>
          {type === "ENT" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-semibold">
                Origem
                <select
                  className={inputClass}
                  value={form.source}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      source: event.target.value as "FAMILY" | "CARE_TEAM",
                      recipientId: "",
                    })
                  }
                >
                  <option value="FAMILY">Entrega de materiais · Família → Equipe</option>
                  <option value="CARE_TEAM">
                    Devolução de materiais · Equipe → Família
                  </option>
                </select>
              </label>
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
          {category && type !== "BAL" ? <>
            <WizardMaterialCategories category={category} selected={selected.filter(item => !extras.has(item.id))} onChange={onCategoryChange} />
            <div className="hca-toolbar"><ActionButton ref={barcodeTriggerRef} compact variant="quiet"
              onClick={() => setBarcodeOpen(true)}><Icon name="camera" />Ler código</ActionButton>
              {extraControl}
            </div>
          </> : null}
          {isExtraStep ? extraControl : null}
          {category ? <label className="block text-sm font-semibold">
            Buscar materiais nesta categoria
            <input
              type="search"
              className={inputClass}
              value={search}
              onChange={(event) => {
                const value = event.currentTarget.value;
                setSearchByCategory((current) => ({
                  ...current,
                  [category]: value,
                }));
              }}
            />
          </label> : null}
          {category ? (
          <p
            role="status"
            aria-label="Resultado da busca e seleção de materiais"
            className="text-sm"
          >
            {visibleProducts.length}{" "}
            {visibleProducts.length === 1
              ? "material encontrado"
              : "materiais encontrados"}
            . {Object.keys(form.quantities).length}{" "}
            {Object.keys(form.quantities).length === 1
              ? "material selecionado"
              : "materiais selecionados"}
            . As seleções permanecem ao filtrar ou trocar de categoria.
          </p>) : null}
          {!visibleProducts.length && !(isExtraStep && pendingExtras.length) ? (
            <Notice>
              {isExtraStep ? "Nenhum item extra incluído." : "Nenhum material nesta busca. Ajuste ou limpe o filtro; suas seleções continuam preservadas."}
            </Notice>
          ) : null}
          <div className="space-y-3">
            {visibleProducts.map((product) => {
              const checked =
                type === "BAL" || Object.hasOwn(form.quantities, product.id);
              const linkedNeeds = links[product.id]?.length ?? 0;
              const assessmentHelpId = `ent-assessment-${encodeURIComponent(product.id)}`;
              const usesPresentations = Boolean(form.presentationSelections?.[product.id]?.length);
              const presentationErrorId = usesPresentations && fieldErrors[product.id]
                ? `wizard-presentation-error-${encodeURIComponent(product.id)}` : undefined;
              return (
                <MaterialChoice
                  selected={checked}
                  quantity
                  className={type === "BAL" ? "product-choice" : "product-choice hca-wizard-material"}
                  key={product.id}
                >
                  <div className="hca-wizard-material-head">
                  <label className="hca-material-choice-heading">
                    {type !== "BAL" && !isExtraStep ? (
                      <input
                        type="checkbox"
                        className="hca-wizard-include-switch"
                        checked={checked}
                        onChange={(event) => selectProduct(product.id, event.currentTarget.checked)}
                      />
                    ) : null}
                    {type !== "BAL" ? <span className="hca-wizard-material-icon"><Icon name={materialCategories.find(entry => entry.id === product.category)?.icon ?? "box"} /></span> : null}
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
                  {type !== "BAL" ? <MaterialConsultButton context={context} material={product} menu
                    onLink={checked && openMaterialSources ? () => openMaterialSources(product) : undefined}
                    onEditPresentations={checked
                      ? returnFocus => setPresentationEditor({ productId: product.id, returnFocus }) : undefined}
                    presentationErrorId={presentationErrorId} /> : null}
                  </div>
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
                    <label className="product-quantity text-xs font-semibold">
                      {type === "BAL"
                        ? "Contagem física"
                        : type === "COM"
                          ? "Quantidade a adquirir"
                          : "Quantidade expedida"}
                      <input
                        className={inputClass}
                        inputMode="decimal"
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
                  {checked && type !== "BAL" && usesPresentations ? (
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
          {type === "BAL" || form.notes ? (
          <label className="block text-sm font-semibold">
            {type === "BAL" ? "Observações e contexto" : "Observação do preenchimento anterior"}
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
          {type !== "BAL" ? <IssuanceObservationsEditor observations={form.observations ?? []}
            onChange={observations => setForm(previous => ({ ...previous, observations }))} errors={fieldErrors} /> : null}
          {type === "BAL" ? <p className="text-xs leading-5 text-(--muted)">
            Fotos e anexos poderão ser adicionados no detalhamento após salvar a
            ficha.
          </p> : null}
        </>
      ) : null}
      {step === 5 ? (
        <>
          {type === "COM" ? <DefinitionGrid items={[
            { label: "Pessoa assistida", value: context.patient?.display_name },
            { label: "Responsável", value: context.fullName },
          ]} /> : <div className={type === "ENT" ? "hca-form-stack" : "rounded-xl bg-(--background) p-4 text-sm"}>
            {type === "ENT" ? <DefinitionGrid items={[
              { label: "Pessoa assistida", value: context.patient?.display_name },
              { label: "Responsável", value: context.fullName },
              { label: "Percurso", value: form.source === "FAMILY" ? "Família → Equipe" : "Equipe → Família" },
              { label: "Recebedor", value: recipientContext?.people.find(person => person.id === form.recipientId)?.name ?? people.find(person => person.id === form.recipientId)?.name ?? "Pessoa não disponível na referência atual" },
            ]} /> : <><strong>{context.patient?.display_name}</strong>
              <p className="mt-1 text-xs text-(--muted)">
                Responsável: {context.fullName}
              </p></>}
            {type === "ENT" && recipientContext ? (
              <div className="mt-3 space-y-2">
                <DeliveryRecipientReference data={recipientContext} />
                {form.recipientReason ? (
                  <p className="whitespace-pre-wrap">
                    Justificativa da escolha: {form.recipientReason}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>}
          {type !== "BAL" ? <>
            {materialCategories.map(category => {
              const rows = reviewRows.filter(row => row.category === category.id && !extras.has(row.id));
              return rows.length ? <section key={category.id}><h3>{category.label}</h3><MaterialReview rows={rows} /></section> : null;
            })}
            <section aria-label="Itens extras">
              <h3>Itens extras</h3>
              {extras.size || pendingExtras.length ? <MaterialReview rows={[
                ...reviewRows.filter(row => extras.has(row.id)),
                ...pendingExtras.map(pendingExtraReviewRow),
              ]} /> : <p className="hca-field-help">Nenhum item extra incluído.</p>}
            </section>
          </> : <ul className="divide-y divide-(--line)">
            {selected.map((product) => (
              <li
                key={product.id}
                className="flex items-start justify-between gap-4 py-3 text-sm"
              >
                <span
                  className="min-w-0 flex-1"
                  style={{ overflowWrap: "anywhere" }}
                >
                  {product.name}
                  {form.presentationSelections?.[product.id]?.map((row) => (
                    <small className="mt-2 block wrap-break-word" key={row.id}>
                      {presentationCaption(row)}
                    </small>
                  ))}
                </span>
                <strong className="shrink-0">
                  {form.quantities[product.id]
                    ? formatQuantity(form.quantities[product.id], product.unit)
                    : "Quantidade pendente"}
                </strong>
              </li>
            ))}
          </ul>}
          {type !== "BAL" ? <section className="hca-document-summary">
            <h3>Observações</h3>
            <IssuanceObservationList observations={issuanceObservations(form).map(note => note.trim()).filter(Boolean)} />
          </section> : form.notes ? (
            <p className="whitespace-pre-wrap text-sm">{form.notes}</p>
          ) : null}
          <Notice>
            {type === "ENT"
              ? "Ao concluir, as quantidades serão expedidas e aguardarão recebimento. Confira origem, destinatário e materiais."
              : type === "BAL"
                ? "Ao concluir, os ajustes seguirão a política de aprovação do paciente. Confira todas as contagens."
                : "A aprovação dos itens e o recebimento serão acompanhados nesta ficha. Nenhum pagamento é necessário para registrar uma doação."}
          </Notice>
        </>
      ) : null}
    </>
  );
}
