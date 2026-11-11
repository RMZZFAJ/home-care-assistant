"use client";

import { Fragment } from "react";
import { RecordDrawer } from "@/components/forms/record-drawer";
import { ActionButton, FormField, SelectField, TextInput } from "@/components/ui/controls";
import type { CatalogueOutcome, CatalogueScope, PrecisionFields, UnitFields } from "@/lib/validation/catalogue-preparation";
import type { CatalogProduct } from "@/types/documents";
import { CatalogueDraftButtons, CataloguePreparationFeedback } from "./catalogue-preparation-controls";
import { useCatalogueProductReference, type CatalogueComplementaryReference, type MeasurementUnit } from "./catalogue-complementary-reference";
import { sendPreparedCatalogueCommit, useCataloguePreparation } from "./use-catalogue-preparation";
import { Notice } from "@/components/workspace";

const dimensions = { count: "Contagem", volume: "Volume", mass: "Massa", package: "Embalagem" };
const unitLabels = { code: "Código", name: "Nome", dimension: "Dimensão", decimals: "Casas decimais", unit: "Unidade base" };
type Fields = UnitFields | PrecisionFields;
function outcomeText(outcome: CatalogueOutcome) {
  return "unitId" in outcome ? "Unidade criada e confirmada." : "Unidade base e precisão confirmadas.";
}

export function UnitPreparationEditor({ scope, userId, products, opener, onClose, onSaved, writable }: {
  scope: CatalogueScope;
  userId: string;
  products: CatalogProduct[];
  opener: HTMLElement;
  onClose: () => void;
  onSaved: (message: string) => void;
  writable: boolean;
}) {
  const create = scope.purpose === "unit_create";
  const editor = useCataloguePreparation<Fields, CatalogueComplementaryReference>({
    scope, userId, separateReference: true,
    defaultFields: () => create ? { code: "", name: "", dimension: "count", decimals: "0" } : { productId: "", unit: "", decimals: "" },
    hashFor: reference => reference.hash,
    sendCommit: attempt => sendPreparedCatalogueCommit(create ? "/api/units" : "/api/catalog/presentations", attempt),
    onCommit: outcome => { onClose(); onSaved(outcomeText(outcome)); },
  });
  const { fields, snapshot } = editor;
  const selection = fields && "productId" in fields ? fields.productId : "";
  const selected = useCatalogueProductReference(scope, selection, snapshot?.reference, editor.referenceAttempt);
  const reference = selected.reference;
  const hash = editor.reviewedHash ?? reference?.hash ?? null;
  const changed = !!(reference && hash && hash !== reference.hash);
  const units = reference?.units ?? snapshot?.reference.units ?? [];
  function compareFields(values: Fields) {
    return <dl className="hca-summary-grid wrap-anywhere">
      {Object.entries(values).map(([key, value]) => <Fragment key={key}>
        <dt>{key === "productId" ? "Produto" : unitLabels[key as keyof typeof unitLabels]}</dt>
        <dd>{key === "productId" ? products.find(row => row.id === value)?.name ?? value
          : key === "dimension" ? dimensions[value as keyof typeof dimensions] : value || "Em branco"}</dd>
      </Fragment>)}
    </dl>;
  }
  return <RecordDrawer title={create ? "Nova unidade" : "Unidade base e precisão"}
    onClose={onClose} busy={editor.busy} preventClose={!!editor.pending}
    hasUnsavedChanges={editor.dirty} restoreFocusTo={opener}>
    <CataloguePreparationFeedback editor={editor} onClose={onClose} outcomeText={outcomeText} compareFields={compareFields} writable={writable} />
    {writable && fields && editor.draft?.state !== "consumed" ? <form className="hca-form" onSubmit={event => {
      event.preventDefault();
      if (!editor.locked && !changed && !selected.loading && !selected.error)
        editor.start("commit", hash, { ...fields, decimals: String(Number(fields.decimals)) });
    }}>
      {editor.draft?.state === "active" ? <p role="status">Preenchimento privado disponível.</p> : null}
      {selected.error ? <Notice error>{selected.error} <ActionButton type="button" onClick={selected.refresh}>Consultar referência novamente</ActionButton></Notice> : null}
      {changed && reference?.product ? <div className="hca-attention">
        <p>A referência do catálogo mudou. Hoje, {reference.product.name} usa {reference.product.unit} com {reference.product.decimals} casa(s).</p>
        <ActionButton type="button" disabled={editor.locked} onClick={() => editor.setReviewedHash(reference.hash)}>Usar referência atual</ActionButton>
      </div> : null}
      <fieldset className="hca-form" disabled={editor.locked}>
        {"code" in fields ? <>
          <FormField label="Âmbito">
            <SelectField name="scope" value={scope.mode} disabled>
              <option value={scope.mode}>{scope.mode === "global" ? "Global" : "Paciente selecionado"}</option>
            </SelectField>
          </FormField>
          <FormField label="Código"><TextInput name="code" required maxLength={30} value={fields.code}
            onChange={event => editor.setFields({ ...fields, code: event.target.value })} /></FormField>
          <FormField label="Nome"><TextInput name="name" required minLength={2} maxLength={80} value={fields.name}
            onChange={event => editor.setFields({ ...fields, name: event.target.value })} /></FormField>
          <FormField label="Dimensão"><SelectField name="dimension" value={fields.dimension}
            onChange={event => editor.setFields({ ...fields, dimension: event.target.value as UnitFields["dimension"] })}>
            {Object.entries(dimensions).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </SelectField></FormField>
        </> : <>
          <p className="hca-field-hint">Documentos, estoque e apresentações preservam a unidade registrada.</p>
          <FormField label="Produto"><SelectField required value={fields.productId} onChange={event => {
            const productId = event.target.value;
            const product = products.find(row => row.id === productId);
            editor.setFields({ productId, unit: product?.unit ?? "", decimals: product ? String(product.quantity_decimals ?? 0) : "" });
            editor.setReviewedHash(null);
          }}>
            <option value="">Selecione</option>
            {fields.productId && !products.some(row => row.id === fields.productId) ? <option disabled value={fields.productId}>Produto indisponível</option> : null}
            {products.map(product => <option key={product.id} value={product.id}>{product.name}</option>)}
          </SelectField></FormField>
          {fields.productId ? <FormField label="Unidade base"><SelectField name="unit" required value={fields.unit}
            onChange={event => editor.setFields({ ...fields, unit: event.target.value })}>
            {fields.unit && !units.some(unit => unit.code === fields.unit) ? <option disabled value={fields.unit}>{fields.unit} · indisponível</option> : null}
            {unitOptions(units, scope.patientId).map(unit => <option key={unit.id} value={unit.code}>{unit.name}</option>)}
          </SelectField></FormField> : null}
        </>}
        {"code" in fields || fields.productId ? <FormField label={create ? "Casas decimais" : "Precisão do produto"}>
          <TextInput name="decimals" type="number" min={0} max={6} step={1} required value={fields.decimals}
            onChange={event => editor.setFields({ ...fields, decimals: event.target.value })} />
        </FormField> : null}
      </fieldset>
      <div className="hca-toolbar">
        <ActionButton type="submit" variant="primary" disabled={editor.locked || changed || !hash || selected.loading || !!selected.error || (!create && !reference?.product?.active)}>
          {create ? "Criar unidade" : "Salvar unidade / precisão"}
        </ActionButton>
        <CatalogueDraftButtons editor={editor} hash={hash} />
      </div>
    </form> : null}
  </RecordDrawer>;
}

function unitOptions(units: MeasurementUnit[], patientId: string | null) {
  const byCode = new Map<string, MeasurementUnit>();
  for (const unit of units) if (!byCode.has(unit.code) || unit.care_recipient_id === patientId) byCode.set(unit.code, unit);
  return [...byCode.values()].sort((left, right) => left.name.localeCompare(right.name, "pt-BR"));
}
