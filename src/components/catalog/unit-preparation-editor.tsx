"use client";

import { useId, useState, type FormEvent } from "react";
import { RecordDrawer } from "@/components/forms/record-drawer";
import { ActionButton, DefinitionGrid, FormField, SelectField, TextInput } from "@/components/ui/controls";
import { FeedbackBanner } from "@/components/ui/feedback";
import { Icon } from "@/components/ui/icon";
import { Dialog } from "@/components/ui/overlays";
import { useScopedRead } from "@/lib/use-scoped-read";
import type { CatalogueScope, PrecisionFields, ReviewedCatalogueProductReference, UnitFields } from "@/lib/validation/catalogue-preparation";
import type { CatalogProduct } from "@/types/documents";
import type { CatalogueComplementaryReference, MeasurementUnit } from "./catalogue-complementary-reference";
import { reviewedCatalogueUrl, type useReviewedCatalogueOperation } from "./reviewed-catalogue-operation";

export const unitDimensions = { count: "Contagem", volume: "Volume", mass: "Massa", package: "Embalagem" };
type Fields = UnitFields | PrecisionFields;

export function UnitPreparationEditor({ scope, products, opener, onClose, operation, revision, refreshReference }: {
  scope: CatalogueScope;
  products: CatalogProduct[];
  opener: HTMLElement;
  onClose: () => void;
  operation: ReturnType<typeof useReviewedCatalogueOperation>;
  revision: number;
  refreshReference: () => void;
}) {
  const create = scope.purpose === "unit_create";
  const title = create ? "Nova unidade" : "Precisão do material";
  const action = create ? "Criar unidade" : "Salvar precisão";
  const formId = useId();
  const [fields, setFields] = useState<Fields>(() => create
    ? { code: "", name: "", dimension: "count", decimals: "0" }
    : { productId: "", unit: "", decimals: "" });
  const [previous, setPrevious] = useState<{ reference: CatalogueComplementaryReference; revision: number } | null>(null);
  const [dismissedRevision, setDismissedRevision] = useState(0);
  const [unitHistory, setUnitHistory] = useState(false);
  const selection = "productId" in fields ? fields.productId : "";
  const reference = useScopedRead<CatalogueComplementaryReference>(
    create || selection ? reviewedCatalogueUrl(scope, selection) : null, String(revision));
  const history = useScopedRead<ReviewedCatalogueProductReference>(
    selection ? reviewedCatalogueUrl({ ...scope, purpose: "edit", targetId: selection }) : null, String(revision));
  const latest = reference.data;
  const product = latest?.product;
  const locked = history.data && "unitLocked" in history.data && history.data.unitLocked;
  const validUnit = "unit" in fields && (!locked || product?.unit === fields.unit);
  const fresh = !reference.loading && !reference.error && !history.loading && !history.error;
  const canReview = !operation.blocked && fresh && !!latest && (create || Boolean(product?.active && validUnit)) && !previous;
  const scopeLabel = scope.mode === "global" ? "Unidade global" : "Esta residência";

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!latest || !canReview) return;
    void operation.submit(scope, { fields, referenceHash: latest.hash }, cause => {
      if (cause.code === "VERSION_CONFLICT") setPrevious({ reference: latest, revision });
    });
  }

  const comparing = previous && revision > Math.max(previous.revision, dismissedRevision);
  return <>
    <RecordDrawer title={title} kicker="Organização da residência" headingIcon="box"
      modal={create} popupClassName={create ? undefined : "hca-preference-sheet hca-residence-settings-sheet"}
      onClose={onClose} busy={operation.busy} trackChanges={false} restoreFocusTo={opener}
      footer={close => <>
        <ActionButton onClick={close}>Voltar</ActionButton>
        {operation.pending && !operation.failure ? <ActionButton variant="primary" onClick={operation.openRecovery}>Conferir resultado pendente</ActionButton>
          : <ActionButton form={formId} type="submit" variant="primary" disabled={!canReview}><Icon name={create ? "plus" : "check"} />{action}</ActionButton>}
      </>}>
      <form id={formId} className="hca-form" onSubmit={save}>
        {"code" in fields ? <>
          <FormField label="Nome"><TextInput required minLength={2} maxLength={80} placeholder="Ex.: Mililitro"
            value={fields.name} onChange={event => setFields({ ...fields, name: event.currentTarget.value })} /></FormField>
          <FormField label="Código"><TextInput required maxLength={30} placeholder="Ex.: mL"
            value={fields.code} onChange={event => setFields({ ...fields, code: event.currentTarget.value })} /></FormField>
          <FormField label="Dimensão"><SelectField value={fields.dimension}
            onChange={event => setFields({ ...fields, dimension: event.currentTarget.value as UnitFields["dimension"] })}>
            {Object.entries(unitDimensions).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </SelectField></FormField>
        </> : <>
          <FormField label="Material"><SelectField required value={fields.productId} onChange={event => {
            const id = event.currentTarget.value;
            const item = products.find(row => row.id === id);
            setFields({ productId: id, unit: item?.unit ?? "", decimals: item ? String(item.quantity_decimals ?? 0) : "" });
            setPrevious(null);
          }}>
            <option value="">Selecione</option>
            {products.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </SelectField></FormField>
          {fields.productId ? <FormField label="Unidade base">
            <SelectField disabled={Boolean(locked)} required value={locked ? product?.unit ?? fields.unit : fields.unit}
              onChange={event => setFields({ ...fields, unit: event.currentTarget.value })}>
              {!latest?.units?.some(unit => unit.code === fields.unit) && fields.unit
                ? <option value={fields.unit}>{fields.unit}</option> : null}
              {unitOptions(latest?.units ?? [], scope.patientId).map(unit => <option key={unit.id} value={unit.code}>{unit.name}</option>)}
            </SelectField>
          </FormField> : null}
        </>}
        {create || selection ? <FormField label="Casas decimais">
          <SelectField required value={fields.decimals} onChange={event => setFields({ ...fields, decimals: event.currentTarget.value })}>
            {["0", "1", "2", "3", "4", "5", "6"].map(value => <option key={value} value={value}>
              {value === "0" ? "0 · inteiros" : value === "1" ? "1 casa" : value + " casas"}
            </option>)}
          </SelectField>
        </FormField> : null}
        {create ? <DefinitionGrid items={[{ label: "Âmbito", value: scopeLabel }]} /> : null}
        {locked ? <ActionButton variant="quiet" onClick={() => setUnitHistory(true)}><Icon name="history" />Unidade preservada pelo histórico</ActionButton> : null}
        {!create && selection ? <p className="hca-residence-admin-note"><Icon name="history" width={16} height={16} />As quantidades registradas preservam a unidade e a precisão da ocasião.</p> : null}
        {reference.error || history.error ? <FeedbackBanner tone="error">{reference.error || history.error}
          <ActionButton onClick={refreshReference}>Consultar referência novamente</ActionButton>
        </FeedbackBanner> : null}
        {previous && !comparing ? <FeedbackBanner tone="warning">A referência mudou. Confira os dados atuais antes de revisar.
          <ActionButton onClick={refreshReference}>Conferir atualização</ActionButton>
        </FeedbackBanner> : null}
      </form>
    </RecordDrawer>
    {unitHistory && product ? <Dialog open title="Unidade preservada pelo histórico" headingIcon="history"
      onClose={() => setUnitHistory(false)}
      footer={<ActionButton variant="primary" onClick={() => setUnitHistory(false)}>Entendi</ActionButton>}>
      <DefinitionGrid items={[{ label: "Material", value: product.name }, { label: "Unidade registrada", value: product.unit }]} />
      <p className="hca-field-hint">Para controlar outro material em uma unidade diferente, cadastre um novo item.</p>
    </Dialog> : null}
    {comparing ? <Dialog open title="Referência atual da unidade" headingIcon="history"
      onClose={() => setDismissedRevision(revision)}
      footer={<><ActionButton onClick={() => setDismissedRevision(revision)}>Voltar</ActionButton>
        <ActionButton variant="primary" disabled={!fresh || !latest}
          onClick={() => {
            if (locked && product && "unit" in fields) setFields({ ...fields, unit: product.unit });
            setPrevious(null);
          }}>Usar referência atual</ActionButton></>}>
      {reference.loading || history.loading ? <p role="status">Consultando referência…</p> : null}
      {reference.error || history.error ? <FeedbackBanner tone="error">{reference.error || history.error}<ActionButton onClick={refreshReference}>Consultar novamente</ActionButton></FeedbackBanner> : null}
      {fresh && product ? <DefinitionGrid items={[
        { label: "Material", value: product.name },
        { label: "Unidade anterior", value: previous.reference.product?.unit ?? "" },
        { label: "Unidade atual", value: product.unit },
        { label: "Casas decimais atuais", value: product.decimals },
        { label: "Casas decimais informadas", value: fields.decimals },
      ]} /> : null}
    </Dialog> : null}
  </>;
}

function unitOptions(units: MeasurementUnit[], patientId: string | null) {
  const byCode = new Map<string, MeasurementUnit>();
  for (const unit of units) if (!byCode.has(unit.code) || unit.care_recipient_id === patientId) byCode.set(unit.code, unit);
  return [...byCode.values()].sort((left, right) => left.name.localeCompare(right.name, "pt-BR"));
}
