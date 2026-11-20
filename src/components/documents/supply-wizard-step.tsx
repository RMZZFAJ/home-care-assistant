"use client";
import { MaterialChoice } from "@/components/catalog/material-choice";
import { MaterialReview } from "./material-review";
import { MaterialConsultButton } from "./catalogue-material-panel";
import { ActionButton, DefinitionGrid } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { materialCategories, supplyExtrasStep, WizardMaterialCategories } from "@/components/forms/supply-wizard-stages";
import { pendingExtraReviewRow, SupplyExtraItems } from "./supply-extra-items";
import type { PendingPurchaseExtra } from "@/lib/validation/pending-purchase-extras";
import { IssuanceObservationsEditor, IssuanceObservationList } from "@/components/forms/issuance-observations";
import { issuanceObservations } from "@/lib/documents/issuance-observations";
import {
  DeliveryRecipientField,
  DeliveryRecipientReference,
} from "./delivery-recipient";
import { useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import {
  inputClass,
  Notice,
  type WorkspaceContext,
} from "@/components/workspace";
import { BarcodeScanner } from "@/components/catalog/barcode-scanner";
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

function SupplyRequestAssessments({ type, catalog, links, form, setForm, fieldErrors }: {
  type: "COM" | "ENT";
  catalog: CatalogProduct[];
  links: Record<string, string[]>;
  form: WizardState;
  setForm: Dispatch<SetStateAction<WizardState>>;
  fieldErrors: Record<string, string>;
}) {
  const products = catalog.filter(({ id }) => Object.hasOwn(form.quantities, id) &&
    (links[id]?.length ?? 0) >= (type === "ENT" ? 1 : 2));
  if (!products.length) return null;
  return <section className="hca-form-stack" aria-label="Avaliação dos vínculos">
    <h3>Avaliação dos vínculos</h3>
    {products.map(({ id, name }) => <fieldset className="hca-form-stack" key={id}>
      <legend>{name}</legend>
      {type === "ENT" ? <label className="hca-field">
        <span>Esta entrega pretende atender a necessidade</span>
        <select className={inputClass} required value={form.requestFulfillments?.[id] ?? ""}
          aria-invalid={Boolean(fieldErrors[id + ":fulfillment"])} onChange={(event) => {
            const choice = event.currentTarget.value as "" | "partial" | "complete";
            setForm(current => ({ ...current, requestFulfillments: { ...current.requestFulfillments, [id]: choice } }));
          }}>
          <option value="">Escolha a avaliação familiar</option>
          <option value="partial">Parcialmente · continua em aberto</option>
          <option value="complete">Por completo · necessidade atendida após recebimento</option>
        </select>
        <span className="hca-field-help">O recebedor confirma separadamente as quantidades físicas.</span>
        {fieldErrors[id + ":fulfillment"] ? <span className="ui-field-error">{fieldErrors[id + ":fulfillment"]}</span> : null}
      </label> : null}
      {links[id].length > 1 ? <label className="hca-field">
        <span>Justificativa da necessidade compartilhada</span>
        <textarea className={inputClass} required minLength={3} maxLength={500}
          aria-invalid={Boolean(fieldErrors[id + ":shared"])}
          value={form.sharedNeedReasons?.[id] ?? ""} onChange={(event) => {
            const reason = event.currentTarget.value;
            setForm(current => ({ ...current, sharedNeedReasons: { ...current.sharedNeedReasons, [id]: reason } }));
          }} />
        <span className="hca-field-help">{type === "ENT"
          ? "A entrega representa a mesma necessidade nas requisições vinculadas."
          : "A compra relacionada às requisições ajuda a preparar a entrega."}</span>
        {fieldErrors[id + ":shared"] ? <span className="ui-field-error">{fieldErrors[id + ":shared"]}</span> : null}
      </label> : null}
    </fieldset>)}
  </section>;
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
  scan,
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
  scan: (code: string) => Promise<void>;
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
  const search = searchByCategory[category ?? ""] ?? "";
  const visibleProducts = catalog.filter(
    (product) =>
      isExtraStep ? extras.has(product.id) : !extras.has(product.id) && product.category === category &&
      [
        product.name,
        ...(product.aliases ?? []),
        ...(product.selectionPredecessors ?? []).map((row) => row.name),
      ].some((name) =>
        normalizeCatalogText(name).includes(normalizeCatalogText(search)),
      ),
  );
  const selected = catalog.filter((product) =>
    Object.hasOwn(form.quantities, product.id),
  );
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
      return { ...current, quantities, presentationSelections, manualQuantities,
        extraProductIds: current.extraProductIds?.filter(extraId => extraId !== id) };
    });
  }
  const reviewRows = step === 5 && type !== "BAL" ? selected.map(product => ({
    id: product.id, name: product.name, category: product.category,
    consult: <MaterialConsultButton context={context} material={product} />,
    details: <><small>{form.quantities[product.id] ? formatQuantity(form.quantities[product.id], product.unit) : "Quantidade pendente"}</small>{form.presentationSelections?.[product.id]?.map(row => <small key={row.id}>{presentationCaption(row)}</small>)}
      {links[product.id]?.length ? <small>{links[product.id].length} {links[product.id].length === 1 ? "necessidade vinculada" : "necessidades vinculadas"}</small> : null}
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
          {type !== "BAL" && (type === "COM" || form.source === "FAMILY") ? (
            <SupplyRequestAssessments type={type} catalog={catalog} links={links} form={form}
              setForm={setForm} fieldErrors={fieldErrors} />
          ) : null}
        </>
      ) : null}
      {category || isExtraStep ? (
        <>
          {category && type !== "BAL" ? <>
            <WizardMaterialCategories category={category} selected={selected.filter(item => !extras.has(item.id))} onChange={onCategoryChange} />
            <div className="hca-toolbar"><BarcodeScanner onRead={scan} />
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
                    onLink={checked && openMaterialSources ? () => openMaterialSources(product) : undefined} /> : null}
                  </div>
                  {isExtraStep ? <ActionButton type="button" onClick={() => selectProduct(product.id, false)}>
                    Remover {product.name}
                  </ActionButton> : null}
                  {checked &&
                    !form.presentationSelections?.[product.id]?.length ? (
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
                  {checked && type !== "BAL" ? (
                    <div className="col-span-full w-full">
                      <PresentationQuantity
                        product={product}
                        selections={
                          form.presentationSelections?.[product.id] ?? []
                        }
                        manual={
                          form.manualQuantities?.[product.id] ??
                          form.quantities[product.id] ??
                          "0"
                        }
                        source={presentations}
                        error={presentationError}
                        loading={presentationLoading}
                        refresh={refreshPresentations}
                        validationError={
                          form.presentationSelections?.[product.id]?.length
                            ? fieldErrors[product.id]
                            : undefined
                        }
                        onChange={(selections, manual) =>
                          updatePackages(product.id, selections, manual)
                        }
                      />
                    </div>
                  ) : null}
                </MaterialChoice>
              );
            })}
          </div>
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
