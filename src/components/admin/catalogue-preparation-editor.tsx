"use client";

import { type RefObject } from "react";
import { RecordDrawer } from "@/components/forms/record-drawer";
import { ActionButton, DefinitionGrid, CheckboxField, FormField, SelectField, TextInput } from "@/components/ui/controls";
import { api } from "@/lib/client/api";
import { CatalogueDraftButtons, CataloguePreparationFeedback } from "@/components/catalog/catalogue-preparation-controls";
import { useCataloguePreparation } from "@/components/catalog/use-catalogue-preparation";
import {
  type CatalogueFields,
  type CatalogueOutcome, type CatalogueReference, type CatalogueScope,
} from "@/lib/validation/catalogue-preparation";
import { bool, text } from "./admin-fields";

const productLabels = {
  name: "Nome", category: "Categoria", unit: "Unidade", aliases: "Nomes alternativos, separados por vírgula",
  description: "Descrição operacional", sortOrder: "Ordem", isActive: "Item ativo",
} satisfies Record<keyof CatalogueFields, string>;
const categories = { medicamentos: "Medicamentos", higiene: "Higiene", dieta: "Dieta" };
type ItemFields = CatalogueFields | { modelId: string };

function defaultFields(reference: CatalogueReference): ItemFields {
  if ("models" in reference) return { modelId: "" };
  const row = reference.item ?? {};
  const category = row.category === "higiene" || row.category === "dieta" ? row.category : "medicamentos";
  return {
    name: text(row, "name"), category, unit: text(row, "unit") || "unidade",
    aliases: Array.isArray(row.aliases) ? row.aliases.join(", ") : "",
    description: text(row, "description"), sortOrder: String(row.sort_order ?? 0),
    isActive: bool(row, "is_active", true),
  };
}

function fieldHash(reference: CatalogueReference, fields: ItemFields) {
  if ("models" in reference && "modelId" in fields) return reference.models.find(model => model.id === fields.modelId)?.hash ?? null;
  return "hash" in reference ? reference.hash : null;
}

function messageFor(outcome: CatalogueOutcome, purpose: CatalogueScope["purpose"]) {
  if ("proposalId" in outcome) return "Proposta global registrada. Um administrador local distinto deve aprovar em Permissões, comunicação e regras.";
  return purpose === "adopt" ? "Modelo adicionado ao catálogo deste paciente." : "Item salvo e auditado.";
}

function FieldValues({ fields, reference }: { fields: ItemFields; reference?: CatalogueReference }) {
  const model = "modelId" in fields && reference && "models" in reference ? reference.models.find(option => option.id === fields.modelId) : null;
  const items = "modelId" in fields ? [
    { label: "Modelo", value: model?.name ?? (fields.modelId || "Em branco") },
    ...(model ? [{ label: "Unidade", value: model.unit }, { label: "Categoria", value: categories[model.category] }, { label: "Nomes alternativos", value: model.aliases.join(", ") || "Em branco", wide: true }] : []),
  ] : (Object.keys(productLabels) as (keyof CatalogueFields)[]).map(key => ({
    label: productLabels[key], value: key === "isActive" ? fields.isActive ? "Sim" : "Não" : key === "category" ? categories[fields.category] : fields[key] || "Em branco", wide: key === "description" || key === "aliases",
  }));
  return <DefinitionGrid items={items} />;
}

export function CataloguePreparationEditor({ patientId, mode, purpose, targetId, userId, opener, headingRef, onClose, onSaved }: CatalogueScope & {
  userId: string;
  opener: HTMLElement;
  headingRef: RefObject<HTMLHeadingElement | null>;
  onClose: () => void;
  onSaved: (message: string) => Promise<void>;
}) {
  const editor = useCataloguePreparation({
    scope: { patientId, mode, purpose, targetId }, userId, defaultFields, hashFor: fieldHash,
    sendCommit: attempt => api("/api/admin", { action: purpose === "adopt" ? "adoptProduct" : "product", cataloguePreparation: attempt }),
    onCommit: outcome => {
      onClose();
      void onSaved(messageFor(outcome, purpose)).catch(() => undefined);
    },
  });
  const { snapshot, fields, reviewedHash, setReviewedHash, setFields, draft, dirty, pending, busy,
    message, start, locked } = editor;
  const reference = snapshot?.reference;
  const currentHash = reference && fields ? fieldHash(reference, fields) : null;
  const referenceChanged = reviewedHash !== null && currentHash !== reviewedHash;
  const title = purpose === "edit" ? "Editar item" : purpose === "adopt" ? "Adotar modelo existente" : "Adicionar item exclusivo deste paciente";
  return <RecordDrawer title={title} busy={busy} preventClose={!!pending}
    hasUnsavedChanges={dirty} onClose={onClose} restoreFocusTo={opener} restoreFocusFallbackRef={headingRef}>
    <CataloguePreparationFeedback editor={editor} onClose={onClose} outcomeText={outcome => messageFor(outcome, purpose)}
      compareFields={values => <FieldValues fields={values} reference={editor.comparison?.reference} />} />
    {reference && fields && draft?.state !== "consumed" ? <form className="hca-form" onSubmit={event => {
      event.preventDefault();
      if (locked || referenceChanged) return;
      start("commit", reviewedHash, "sortOrder" in fields ? { ...fields, sortOrder: String(Number(fields.sortOrder)) } : fields);
    }}>
      {draft?.state === "active" && !message ? <p role="status">Preenchimento privado recuperado.</p> : null}
      {mode === "global" ? <p>A confirmação registra uma proposta para aprovação local.</p> : null}
      {referenceChanged ? <div className="hca-attention">
        <p>{currentHash ? "A referência do catálogo mudou. Revise os dados atuais para continuar." : "O modelo selecionado deixou de estar disponível. Escolha um dos modelos atuais."}</p>
        {"item" in reference && reference.item ? <FieldValues fields={defaultFields(reference)} /> : null}
        {"models" in reference && currentHash ? <FieldValues fields={fields} reference={reference} /> : null}
        {currentHash ? <ActionButton type="button" disabled={locked} onClick={() => setReviewedHash(currentHash)}>Usar referência atual</ActionButton> : null}
      </div> : null}
      <fieldset className="hca-form" disabled={locked}>
        {"models" in reference && "modelId" in fields ? <>
          <p>A cópia será editável apenas neste paciente.</p>
          <FormField label="Produto modelo">
            <SelectField name="productId" value={fields.modelId} required onChange={event => {
              const updated = { modelId: event.target.value };
              setFields(updated);
              setReviewedHash(fieldHash(reference, updated));
            }}>
              <option value="">Selecione</option>
              {fields.modelId && !currentHash ? <option value={fields.modelId} disabled>Modelo indisponível</option> : null}
              {reference.models.map(model => <option key={model.id} value={model.id}>{model.name} · {model.unit}</option>)}
            </SelectField>
          </FormField>
        </> : "name" in fields ? <ProductFields fields={fields} onChange={setFields} /> : null}
      </fieldset>
      <div className="hca-toolbar">
        <ActionButton type="submit" variant="primary" disabled={locked || !currentHash || referenceChanged}>{purpose === "adopt" ? "Adotar modelo" : "Salvar item"}</ActionButton>
        <CatalogueDraftButtons editor={editor} />
      </div>
    </form> : null}
  </RecordDrawer>;
}

function ProductFields({ fields, onChange }: { fields: CatalogueFields; onChange: (fields: CatalogueFields) => void }) {
  function input(key: "name" | "unit" | "aliases" | "description" | "sortOrder", maxLength: number, required = false) {
    const numeric = key === "sortOrder";
    return <FormField label={productLabels[key]}>
      <TextInput name={key} value={fields[key]} required={required}
        {...(numeric ? { type: "number", min: 0, max: 1_000_000, step: 1 } : { type: "text", maxLength })}
        onChange={event => onChange({ ...fields, [key]: event.target.value })} />
    </FormField>;
  }
  return <>
    {input("name", 160, true)}
    <FormField label="Categoria">
      <SelectField name="category" value={fields.category}
        onChange={event => onChange({ ...fields, category: event.target.value as CatalogueFields["category"] })}>
        {Object.entries(categories).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </SelectField>
    </FormField>
    {input("unit", 30, true)}
    {input("aliases", 4900)}
    {input("description", 2000)}
    {input("sortOrder", 24, true)}
    <CheckboxField name="isActive" label="Item ativo" checked={fields.isActive}
      onChange={event => onChange({ ...fields, isActive: event.target.checked })} />
    <p className="hca-field-hint">A unidade de itens com histórico é preservada. Para outra unidade, cadastre um novo item.</p>
  </>;
}
