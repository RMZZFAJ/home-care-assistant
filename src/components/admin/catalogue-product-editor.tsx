"use client";

import { useId, useRef, useState, type FormEvent, type RefObject } from "react";
import { RecordDrawer } from "@/components/forms/record-drawer";
import { ActionButton, DefinitionGrid, FormField, LoadingIndicator, Pill, SelectField, TextAreaField, TextInput } from "@/components/ui/controls";
import { FeedbackBanner } from "@/components/ui/feedback";
import { Icon } from "@/components/ui/icon";
import { Dialog } from "@/components/ui/overlays";
import { reviewedCatalogueUrl, type useReviewedCatalogueOperation } from "@/components/catalog/reviewed-catalogue-operation";
import { matchCatalog, type CatalogMatch } from "@/lib/catalog-match";
import { useScopedRead } from "@/lib/use-scoped-read";
import { reviewedCatalogueProductReference, type CatalogueFields, type CatalogueScope, type ReviewedCatalogueProductReference } from "@/lib/validation/catalogue-preparation";
import type { CatalogueCollectionItem } from "@/lib/validation/catalogue-list";

export const catalogueCategories = { medicamentos: "Medicamentos", higiene: "Higiene", dieta: "Dieta" } as const;
type Fields = CatalogueFields | { modelId: string };
type Operation = ReturnType<typeof useReviewedCatalogueOperation>;
type EditorProps = {
  scope: CatalogueScope;
  readRevision: number;
  operation: Operation;
  rows: CatalogueCollectionItem[];
  opener: HTMLElement;
  fallback: RefObject<HTMLElement | null>;
  onClose: () => void;
  onInspect: (id: string) => void;
};

function initialValues(reference: ReviewedCatalogueProductReference): Fields {
  if ("models" in reference) return { modelId: reference.models[0]?.id ?? "" };
  const row = reference.item;
  const category = row?.category === "medicamentos" || row?.category === "dieta" ? row.category : "higiene";
  return {
    name: String(row?.name ?? ""), category, unit: String(row?.unit ?? reference.units.find(unit => unit.code === "unidade")?.code ?? reference.units[0]?.code ?? ""),
    aliases: Array.isArray(row?.aliases) ? row.aliases.join(", ") : "", description: String(row?.description ?? ""),
    sortOrder: String(row?.sort_order ?? 0), isActive: row?.is_active !== false,
  };
}

function hashFor(reference: ReviewedCatalogueProductReference, fields: Fields) {
  if ("models" in reference && "modelId" in fields) return reference.models.find(model => model.id === fields.modelId)?.hash;
  return "hash" in reference ? reference.hash : undefined;
}

export function CatalogueProductEditor(props: EditorProps) {
  const { scope, readRevision, opener, fallback, onClose } = props;
  const read = useScopedRead(reviewedCatalogueUrl(scope), String(readRevision), reviewedCatalogueProductReference.parse);
  const title = scope.purpose === "adopt" ? "Adotar modelo de material" : scope.purpose === "edit" ? "Editar material" : "Novo material";
  if (read.data) return <CatalogueProductForm {...props} reference={read.data} reading={read.loading} readError={read.error} refresh={read.refresh} title={title} />;
  return <RecordDrawer title={title} subtitle="Catálogo da residência" headingIcon="box" restoreFocusTo={opener}
    restoreFocusFallbackRef={fallback} onClose={onClose}>
    {read.error ? <FeedbackBanner tone="error">{read.error} <ActionButton onClick={read.refresh}>Consultar novamente</ActionButton></FeedbackBanner>
      : <p role="status"><LoadingIndicator compact /> Consultando o catálogo…</p>}
  </RecordDrawer>;
}

function CatalogueProductForm({ scope, reference, reading, readError, refresh, title, operation, rows, opener, fallback, onClose, onInspect }: EditorProps & {
  reference: ReviewedCatalogueProductReference; reading: boolean; readError: string; refresh: () => void; title: string;
}) {
  const [reviewed, setReviewed] = useState(reference);
  const [fields, setFields] = useState<Fields>(() => initialValues(reference));
  const [confirmation, setConfirmation] = useState(false);
  const [reviewConflict, setReviewConflict] = useState(false);
  const [duplicates, setDuplicates] = useState<CatalogMatch<CatalogueCollectionItem>[]>([]);
  const [duplicateId, setDuplicateId] = useState("");
  const [duplicateMessage, setDuplicateMessage] = useState("");
  const formId = useId();
  const nameRef = useRef<HTMLInputElement>(null);
  const currentHash = hashFor(reference, fields), reviewedHash = hashFor(reviewed, fields);
  const model = "models" in reference && "modelId" in fields ? reference.models.find(item => item.id === fields.modelId) : undefined;
  const stale = Boolean(reviewedHash && currentHash !== reviewedHash);
  const locked = operation.blocked || reading || Boolean(readError);
  const globalMode = scope.mode === "global";
  const exactConflict = duplicates.some(candidate => candidate.kind !== "approximate");
  const duplicate = duplicates.find(candidate => candidate.product.id === duplicateId) ?? duplicates[0];
  const reviewLabel = scope.purpose === "adopt" ? "Revisar adoção" : "Revisar material";
  const unitLabel = (unit: string) => "units" in reference ? reference.units.find(candidate => candidate.code === unit)?.name ?? unit : unit;

  function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (locked || stale || !reviewedHash) return;
    setDuplicateMessage("");
    const labels = "name" in fields ? [fields.name, ...fields.aliases.split(",")] : model ? [model.name, ...model.aliases] : [];
    const others = rows.filter(item => item.id !== scope.targetId)
      .map(item => ({ id: item.id, name: item.name, aliases: item.aliases }));
    // An inactive item keeps its catalogue identity and still participates in names and aliases.
    const possible = new Map<string, CatalogMatch<CatalogueCollectionItem>>();
    for (const label of labels) {
      for (const candidate of matchCatalog(label, others).candidates) {
        const product = rows.find(item => item.id === candidate.product.id);
        if (product && (candidate.kind !== "approximate" || !possible.has(product.id)))
          possible.set(product.id, { ...candidate, product });
      }
    }
    if (possible.size) {
      const matches = [...possible.values()];
      setDuplicates(matches);
      setDuplicateId(matches[0].product.id);
    }
    else setConfirmation(true);
  }

  function save() {
    if (locked || stale || !reviewedHash) return;
    setConfirmation(false);
    void operation.submit(scope, { fields: "sortOrder" in fields ? { ...fields, sortOrder: String(Number(fields.sortOrder)) } : fields, referenceHash: reviewedHash });
  }

  const summary = "name" in fields ? [
    { label: "Material", value: fields.name }, { label: "Tipo", value: catalogueCategories[fields.category] },
    { label: "Unidade", value: unitLabel(fields.unit) },
  ] : model ? [{ label: "Modelo", value: model.name }, { label: "Unidade", value: model.unit }] : [];
  const current = "item" in reference ? reference.item : null;
  const previous = "item" in reviewed ? reviewed.item : null;
  return <>
    <RecordDrawer title={title} subtitle="Catálogo da residência" kicker="Organização da residência" headingIcon="box"
      popupClassName="hca-preference-sheet hca-residence-settings-sheet" busy={operation.busy}
      restoreFocusTo={opener} restoreFocusFallbackRef={fallback} onClose={onClose} keyboardScrollable exitDialog
      footer={close => <><ActionButton onClick={close}>Cancelar</ActionButton>
        <ActionButton type="submit" form={formId} variant="primary" disabled={locked || stale || !currentHash}>
          <Icon name="check" />{globalMode && scope.purpose !== "adopt" ? "Propor material" : reviewLabel}</ActionButton></>}>
      {readError ? <FeedbackBanner tone="error">{readError} <ActionButton onClick={refresh}>Consultar novamente</ActionButton></FeedbackBanner> : null}
      {stale ? <FeedbackBanner tone="warning">Confira o cadastro atualizado antes de confirmar a edição.
        <ActionButton onClick={() => setReviewConflict(true)}>Conferir alteração</ActionButton></FeedbackBanner> : null}
      {operation.pending && !operation.failure && !operation.busy
        ? <ActionButton onClick={operation.openRecovery}>Conferir resultado pendente</ActionButton> : null}
      <form id={formId} className="hca-form" onSubmit={review}>
        <fieldset className="hca-form" disabled={locked}>
          {"name" in fields && "units" in reference ? <>
            <section className="hca-form"><h3>Identificação</h3>
              <FormField label="Nome do material" error={duplicateMessage || undefined}>
                <TextInput ref={nameRef} minLength={2} maxLength={160} required value={fields.name}
                  onChange={event => { setDuplicateMessage(""); setFields({ ...fields, name: event.currentTarget.value }); }} />
              </FormField>
              <FormField label="Tipo de material">
                <SelectField value={fields.category} onChange={event => setFields({ ...fields, category: event.currentTarget.value as CatalogueFields["category"] })}>
                  {Object.entries(catalogueCategories).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
                </SelectField>
              </FormField>
              <FormField label="Nomes alternativos" helpText="Separe os nomes por vírgula.">
                <TextInput maxLength={4900} value={fields.aliases} onChange={event => {
                  setDuplicateMessage(""); setFields({ ...fields, aliases: event.currentTarget.value });
                }} />
              </FormField>
            </section>
            <section className="hca-form"><h3>Controle e organização</h3>
              <FormField label="Unidade de controle" helpText={reference.unitLocked ? "A unidade é preservada pelo histórico deste material." : "As quantidades serão registradas nesta unidade."}>
                <SelectField value={fields.unit} required disabled={reference.unitLocked} onChange={event => setFields({ ...fields, unit: event.currentTarget.value })}>
                  {[...new Map(reference.units.map(unit => [unit.code, unit])).values()].map(unit => <option key={unit.code} value={unit.code}>{unit.name}</option>)}
                </SelectField>
              </FormField>
              <FormField label="Ordem na lista"><TextInput type="number" min={0} max={1000000} step={1} required value={fields.sortOrder}
                onChange={event => setFields({ ...fields, sortOrder: event.currentTarget.value })} /></FormField>
              <FormField label="Descrição operacional"><TextAreaField maxLength={2000} value={fields.description}
                onChange={event => setFields({ ...fields, description: event.currentTarget.value })} /></FormField>
            </section>
          </> : "models" in reference && "modelId" in fields ? <>
            {reference.models.length ? <FormField label="Modelo disponível"><SelectField value={fields.modelId} required
              onChange={event => { setReviewed(reference); setFields({ modelId: event.currentTarget.value }); }}>
              {!model ? <option value={fields.modelId} disabled>Modelo indisponível</option> : null}
              {reference.models.map(option => <option key={option.id} value={option.id}>{option.name} · {option.unit}</option>)}
            </SelectField></FormField> : <p>Nenhum modelo disponível para adoção nesta residência.</p>}
            {duplicateMessage ? <FeedbackBanner tone="warning">{duplicateMessage}</FeedbackBanner> : null}
          </> : null}
        </fieldset>
      </form>
      <FeedbackBanner>{globalMode ? "A confirmação registra uma proposta para decisão de outro administrador local." : "O catálogo identifica materiais. As entradas físicas são registradas no próprio fluxo."}</FeedbackBanner>
    </RecordDrawer>
    {duplicate ? <Dialog open title="Este material já está no catálogo?" kicker="Organização da residência" headingIcon="search"
      popupClassName="hca-catalogue-duplicate" onClose={() => setDuplicates([])}
      footer={<><ActionButton onClick={() => setDuplicates([])}>Voltar à edição</ActionButton>
        <ActionButton variant="primary" onClick={() => onInspect(duplicate.product.id)}><Icon name="check" />Usar este cadastro</ActionButton>
        <ActionButton onClick={() => {
          setDuplicates([]);
          if (exactConflict) { setDuplicateMessage("Escolha um nome e nomes alternativos distintos dos cadastros encontrados."); requestAnimationFrame(() => nameRef.current?.focus()); }
          else setConfirmation(true);
        }}><Icon name="plus" />Cadastrar outro material</ActionButton></>}>
      <div className="hca-form-stack">
        {duplicates.length > 1 ? <FormField label="Cadastro para comparar"><SelectField value={duplicate.product.id}
          onChange={event => setDuplicateId(event.currentTarget.value)}>
          {duplicates.map(({ product }) => <option key={product.id} value={product.id}>{product.name} · {product.unit}</option>)}
        </SelectField></FormField> : null}
        <div className="hca-residence-admin-hero">
          <span className="hca-guide-row-icon"><Icon name="box" /></span>
          <div className="hca-guide-row-label"><strong>{duplicate.product.name}</strong><small>{catalogueCategories[duplicate.product.category as keyof typeof catalogueCategories] ?? duplicate.product.category} · {duplicate.product.unit}</small></div>
          <Pill tone={duplicate.product.is_active ? "success" : "neutral"}>{duplicate.product.is_active ? "Ativo" : "Inativo"}</Pill>
        </div>
        <DefinitionGrid items={[
          { label: "Nomes alternativos", value: duplicate.product.aliases.join(", ") || "—" },
          { label: "Identificação", value: duplicate.product.id, wide: true },
        ]} />
        <FeedbackBanner>Confira tamanho e apresentação. Você pode consultar o cadastro existente ou seguir com uma identificação distinta.</FeedbackBanner>
      </div>
    </Dialog> : null}
    {reviewConflict ? <Dialog open title="O cadastro foi atualizado" headingIcon="history" onClose={() => setReviewConflict(false)}
      subtitle="Confira a referência vigente. Os campos digitados continuam na edição."
      footer={<><ActionButton onClick={() => setReviewConflict(false)}>Voltar</ActionButton><ActionButton variant="primary" disabled={!currentHash}
        onClick={() => {
          setReviewed(reference);
          if ("name" in fields && "units" in reference && current)
            setFields({ ...fields, unit: reference.unitLocked ? String(current.unit) : fields.unit, isActive: current.is_active === true });
          setReviewConflict(false);
        }}>Usar referência atual</ActionButton></>}>
      {previous && current ? <div className="hca-form-stack">
        {([["Referência da edição", previous], ["Cadastro atual", current]] as const).map(([label, item]) =>
          <section key={label} className="hca-form">
            <h3>{label}</h3><DefinitionGrid items={[
              { label: "Nome", value: String(item.name) },
              { label: "Unidade", value: unitLabel(String(item.unit)) },
              { label: "Nomes alternativos", value: Array.isArray(item.aliases) ? item.aliases.join(", ") : "—" },
              { label: "Descrição operacional", value: String(item.description ?? "—"), wide: true },
            ]} />
          </section>)}
      </div> : null}
    </Dialog> : null}
    {confirmation ? <Dialog open title={globalMode ? "Registrar esta proposta?" : scope.purpose === "edit" ? "Salvar cadastro?" : scope.purpose === "adopt" ? "Adotar este modelo?" : "Adicionar material?"}
      headingIcon="check" onClose={() => setConfirmation(false)} subtitle="A alteração preserva quantidades e movimentos já registrados."
      footer={<><ActionButton onClick={() => setConfirmation(false)}>Voltar à edição</ActionButton>
        <ActionButton variant="primary" disabled={locked || stale} onClick={save}>{globalMode ? "Registrar proposta"
          : scope.purpose === "edit" ? "Salvar cadastro" : scope.purpose === "adopt" ? "Adotar modelo" : "Adicionar material"}</ActionButton></>}>
      <DefinitionGrid items={summary} />
    </Dialog> : null}
  </>;
}
