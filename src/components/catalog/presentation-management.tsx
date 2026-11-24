"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { RecordDrawer } from "@/components/forms/record-drawer";
import { ActionButton, CheckboxField, DefinitionGrid, FormField, LoadingIndicator, Pill, SelectField, TextInput } from "@/components/ui/controls";
import { FeedbackBanner } from "@/components/ui/feedback";
import { Icon } from "@/components/ui/icon";
import { Dialog } from "@/components/ui/overlays";
import { EmptyState } from "@/components/ui/primitives";
import { SearchSelect } from "@/components/ui/search-select";
import { normalizeCatalogText } from "@/lib/catalog-match";
import { formatQuantity, validQuantity } from "@/lib/quantity";
import { formatBrazilDate } from "@/lib/receipt";
import { useScopedRead } from "@/lib/use-scoped-read";
import { presentationCommandSchema } from "@/lib/validation/catalogue";
import type { CatalogueScope, PresentationFields } from "@/lib/validation/catalogue-preparation";
import type { CatalogProduct } from "@/types/documents";
import type { PresentationsRead, ProductPresentation } from "@/types/catalogue";
import { BarcodeScanner } from "./barcode-scanner";
import type { CatalogueComplementaryReference } from "./catalogue-complementary-reference";
import { ReviewedCatalogueFeedback, reviewedCatalogueUrl, useReviewedCatalogueOperation } from "./reviewed-catalogue-operation";

const purposes = ["presentation_create", "presentation_edit"] as const;
const pageSize = 15;

function presentationFactor(row: ProductPresentation, unit?: string) {
  return validQuantity(String(row.base_quantity), 6)
    ? "1 embalagem = " + formatQuantity(row.base_quantity, unit)
    : "Equivalência inválida. Revise a apresentação.";
}

function presentationUrl(patientId: string, query: Record<string, string> = {}) {
  return "/api/catalog/presentations?" + new URLSearchParams({ careRecipientId: patientId, ...query });
}

export function PresentationManagement({ userId, patientId, writable }: {
  userId: string; patientId: string; writable: boolean;
}) {
  const source = useScopedRead<PresentationsRead>(presentationUrl(patientId, { includeInactive: "true" }));
  const catalog = useScopedRead<{ data: CatalogProduct[] }>("/api/catalog?" + new URLSearchParams({ careRecipientId: patientId, includeInactive: "true" }));
  const operation = useReviewedCatalogueOperation(userId, { patientId, mode: "patient" }, purposes);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("active");
  const [page, setPage] = useState(1);
  const [editor, setEditor] = useState<{ row: ProductPresentation | null; opener: HTMLElement } | null>(null);
  const [scanner, setScanner] = useState<HTMLElement | null>(null);
  const [revision, setRevision] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const savedOpenerRef = useRef<HTMLElement | null>(null);
  const products = catalog.data?.data ?? [];
  const knownProducts = new Map(products.map(product => [product.id, product]));
  const query = normalizeCatalogText(search);
  const filtered = (source.data?.data ?? []).filter(row =>
    (!status || row.active === (status === "active")) &&
    normalizeCatalogText([row.name, row.barcode, knownProducts.get(row.product_id)?.name].join(" ")).includes(query));
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(pageCount, page);
  const openEditor = (row: ProductPresentation | null, opener: HTMLElement) => { setRevision(0); setEditor({ row, opener }); };
  const refreshReference = () => setRevision(value => value + 1);

  useEffect(() => {
    if (editor || source.loading || !savedOpenerRef.current) return;
    const opener = savedOpenerRef.current;
    savedOpenerRef.current = null;
    if (!opener.isConnected && document.activeElement === document.body) searchRef.current?.focus();
  }, [editor, source.data, source.loading]);

  return <>
    <section className="hca-residence-admin-section hca-residence-rules" aria-labelledby="presentations-heading">
      <header><h2 id="presentations-heading">Apresentações dos materiais</h2>
        {writable ? <ActionButton compact aria-label="Adicionar apresentação" disabled={!catalog.data || catalog.loading || !!catalog.error || operation.blocked}
          onClick={event => openEditor(null, event.currentTarget)}><Icon name="plus" />Adicionar</ActionButton> : null}
      </header>
      <div className="hca-notice-rules-filter hca-catalogue-filter-search hca-catalogue-presentation-filters">
        <TextInput ref={searchRef} type="search" leading={<Icon name="search" />} aria-label="Pesquisar apresentações" placeholder="Buscar material, embalagem ou código"
          value={search} onChange={event => { setSearch(event.currentTarget.value); setPage(1); }} />
        <SelectField aria-label="Situação das apresentações" value={status} onChange={event => { setStatus(event.currentTarget.value); setPage(1); }}>
          <option value="active">Ativas</option><option value="inactive">Inativas</option><option value="">Todas</option>
        </SelectField>
      </div>
      {source.loading || catalog.loading ? <div className="hca-residence-rules-empty"><LoadingIndicator label="Consultando apresentações e materiais" /></div> : null}
      {source.error || catalog.error ? <div className="hca-residence-rules-empty"><FeedbackBanner tone="error">
        {source.error || catalog.error}
        <ActionButton onClick={() => { source.refresh(); catalog.refresh(); }}>Consultar apresentações novamente</ActionButton>
      </FeedbackBanner></div> : null}
      <div>{filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize).map(row => {
        const product = knownProducts.get(row.product_id);
        return <button key={row.id} data-presentation-id={row.id} type="button" className="hca-guide-row hca-catalogue-row"
          onClick={event => openEditor(row, event.currentTarget)}>
          <span className="hca-guide-row-icon"><Icon name="scan" /></span>
          <span className="hca-guide-row-label"><strong>{product ? product.name + " · " + row.name : row.name}</strong>
            <small>{presentationFactor(row, product?.unit)}</small><Pill tone={row.active ? "success" : "neutral"}>{row.active ? "Ativa" : "Inativa"}</Pill>
          </span><Icon name="chevron" width={15} height={15} />
        </button>;
      })}</div>
      {source.data && !source.loading && !source.error && !filtered.length ? <div className="hca-residence-rules-empty">
        <EmptyState title="Nenhuma apresentação nesta seleção">Confira a busca ou use a unidade base.</EmptyState>
      </div> : null}
      {pageCount > 1 ? <nav aria-label="Páginas das apresentações" className="hca-pagination">
        <ActionButton disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>Anterior</ActionButton>
        <span>Página {currentPage} de {pageCount}</span>
        <ActionButton disabled={currentPage >= pageCount} onClick={() => setPage(currentPage + 1)}>Próxima</ActionButton>
      </nav> : null}
    </section>
    <section className="hca-residence-admin-section hca-residence-rules">
      <header><h2>Consultar embalagem</h2></header>
      <div><button type="button" className="hca-guide-row" onClick={event => setScanner(event.currentTarget)}>
        <span className="hca-guide-row-icon"><Icon name="scan" /></span>
        <span className="hca-guide-row-label"><strong>Ler código de barras</strong><small>Câmera, imagem ou digitação manual</small></span>
        <Icon name="chevron" width={15} height={15} />
      </button></div>
    </section>
    {scanner ? <PresentationCodeLookup patientId={patientId} products={knownProducts} opener={scanner}
      onClose={() => setScanner(null)} onInspect={row => { openEditor(row, scanner); setScanner(null); }} /> : null}
    {editor ? <PresentationEditor key={editor.row?.id ?? "new"} patientId={patientId} products={products} initial={editor.row}
      writable={writable} opener={editor.opener} onClose={() => setEditor(null)} operation={operation}
      revision={revision} refreshReference={refreshReference} /> : null}
    <ReviewedCatalogueFeedback operation={operation} showPending={!editor}
      onFinish={result => {
        if (result.state === "recorded") {
          savedOpenerRef.current = editor?.opener ?? null;
          setEditor(null);
          source.refresh();
        }
      }}
      onReview={editor && writable ? () => { operation.closeFailure(); refreshReference(); } : undefined} />
  </>;
}

function PresentationCodeLookup({ patientId, products, opener, onClose, onInspect }: {
  patientId: string; products: Map<string, CatalogProduct>; opener: HTMLElement;
  onClose: () => void; onInspect: (row: ProductPresentation) => void;
}) {
  const [code, setCode] = useState("");
  const [revision, setRevision] = useState(0);
  const read = useScopedRead<PresentationsRead>(code ? presentationUrl(patientId, { barcode: code }) : null, String(revision));
  const row = read.data?.data.find(value => value.active && value.barcode === code && value.care_recipient_id === patientId);
  const product = row ? products.get(row.product_id) : undefined;
  return <RecordDrawer title="Consultar código de barras" subtitle="Apresentações do catálogo desta residência" headingIcon="scan"
    kicker="Organização da residência" popupClassName="hca-preference-sheet hca-residence-settings-sheet" trackChanges={false}
    restoreFocusTo={opener} onClose={onClose} footer={close => <ActionButton onClick={close}>Voltar</ActionButton>}>
    <div className="hca-form-stack">
      <div className="hca-catalogue-scan-guide"><Icon name="scan" width={38} height={38} />
        <strong>Identifique a embalagem</strong><small>Centralize o código para consultar o catálogo.</small>
      </div>
      <BarcodeScanner catalogue onRead={value => { setCode(value); setRevision(previous => previous + 1); }} />
      {read.loading ? <LoadingIndicator label="Consultando código" /> : null}
      {read.error ? <FeedbackBanner tone="error">{read.error}<ActionButton onClick={read.refresh}>Consultar novamente</ActionButton></FeedbackBanner> : null}
      {code && read.data && !read.loading && !read.error ? row ? <section className="hca-residence-admin-section">
        <header><h3>Apresentação localizada</h3></header>
        <div className="hca-form-stack">
          <DefinitionGrid items={[
            { label: "Material", value: product?.name ?? "Material autorizado" },
            { label: "Apresentação", value: row.name },
            { label: "Código consultado", value: code },
            { label: "Equivalência", value: presentationFactor(row, product?.unit) },
          ]} />
          <ActionButton onClick={() => onInspect(row)}>Ver apresentação</ActionButton>
        </div>
      </section> : <EmptyState title="Código não localizado">
        Confira o número ou use a unidade base. <ActionButton onClick={() => setCode("")}>Consultar outro código</ActionButton>
      </EmptyState> : null}
      <p className="hca-residence-admin-note"><Icon name="info" width={16} height={16} />A consulta identifica a embalagem. A entrada de estoque é registrada no fluxo de materiais.</p>
    </div>
  </RecordDrawer>;
}

function PresentationEditor({ patientId, products, initial, writable, opener, onClose, operation, revision, refreshReference }: {
  patientId: string; products: CatalogProduct[]; initial: ProductPresentation | null; writable: boolean;
  opener: HTMLElement; onClose: () => void;
  operation: ReturnType<typeof useReviewedCatalogueOperation>; revision: number; refreshReference: () => void;
}) {
  const scope: CatalogueScope = { patientId, mode: "patient", purpose: initial ? "presentation_edit" : "presentation_create", targetId: initial?.id ?? null };
  const id = useId();
  const [fields, setFields] = useState<PresentationFields>(() => ({
    productId: initial?.product_id ?? "", name: initial?.name ?? "", barcode: initial?.barcode ?? "",
    factor: initial ? String(initial.base_quantity) : "", active: initial?.active ?? true,
  }));
  const [productSearch, setProductSearch] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [review, setReview] = useState<{ fields: PresentationFields; hash: string } | null>(null);
  const [expectedVersion, setExpectedVersion] = useState(initial?.version);
  const [staleRevision, setStaleRevision] = useState<number | null>(null);
  const [dismissedRevision, setDismissedRevision] = useState(-1);
  const [historySurface, setHistorySurface] = useState<{ page: number; opener: HTMLElement } | null>(null);
  const historyPage = historySurface?.page ?? 0;
  const select = !initial && fields.productId ? fields.productId : undefined;
  const reference = useScopedRead<CatalogueComplementaryReference>(
    writable && (initial || select) ? reviewedCatalogueUrl(scope, select) : null, String(revision));
  const history = useScopedRead<PresentationsRead>(initial && historyPage > 0
    ? presentationUrl(patientId, { presentationId: initial.id, includeInactive: "true", historyPage: String(historyPage) }) : null);
  const current = reference.data?.presentation;
  const product = products.find(row => row.id === fields.productId);
  const unit = reference.data?.product?.unit ?? product?.unit;
  const precision = reference.data?.product?.decimals ?? product?.quantity_decimals;
  const stale = staleRevision !== null || Boolean(current && current.version !== expectedVersion);
  const comparing = writable && stale && revision > Math.max(staleRevision ?? -1, dismissedRevision);
  const canReview = writable && !operation.blocked && !reference.loading && !reference.error && !stale;
  const edit = <K extends keyof PresentationFields>(key: K, value: PresentationFields[K]) => setFields(previous => ({ ...previous, [key]: value }));
  const hasProduct = !!reference.data?.product && (initial ? !!current : reference.data.product.active);

  function prepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canReview) return;
    const parsed = presentationCommandSchema.safeParse({
      action: "presentation", careRecipientId: patientId, id: current?.id ?? null, referenceVersion: current?.version ?? null,
      productId: fields.productId, name: fields.name, barcode: fields.barcode, baseQuantity: fields.factor,
      active: fields.active, idempotencyKey: patientId,
    });
    if (!parsed.success) {
      const problems: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0]);
        if (!problems[key]) problems[key] = issue.message;
      }
      setErrors(problems);
      const first = ["productId", "name", "barcode", "baseQuantity"].find(key => problems[key]);
      if (first) document.getElementById(id + "-" + first)?.focus();
      return;
    }
    if (reference.data && hasProduct) {
      setErrors({});
      setReview({ fields: { ...fields, factor: parsed.data.baseQuantity }, hash: reference.data.hash });
    }
  }

  function confirm() {
    if (!review || !canReview) return;
    setReview(null);
    void operation.submit(scope, { fields: review.fields, referenceHash: review.hash }, error => {
      if (error.code === "VERSION_CONFLICT") setStaleRevision(revision);
    });
  }

  const title = initial ? "Apresentação da embalagem" : "Nova apresentação";
  return <>
    <RecordDrawer title={title} subtitle={product?.name} kicker="Organização da residência" headingIcon="scan"
      popupClassName="hca-preference-sheet hca-residence-settings-sheet" onClose={onClose}
      trackChanges={false} busy={operation.busy} restoreFocusTo={opener} footer={close => <>
        <ActionButton onClick={close}>Voltar</ActionButton>
        {operation.pending && !operation.failure ? <ActionButton variant="primary" onClick={operation.openRecovery}>Conferir resultado pendente</ActionButton>
          : writable ? <ActionButton variant="primary" form={id} type="submit" disabled={!canReview || Boolean(fields.productId && !hasProduct)}>
            <Icon name="check" />Revisar apresentação
          </ActionButton> : null}
      </>}>
      <div className="hca-form-stack">
        {product ? <DefinitionGrid items={[
          { label: "Material", value: product.name }, { label: "Unidade base", value: unit ?? "" },
          { label: "Precisão", value: precision === undefined ? "Indisponível" : precision + " casa(s) decimais" },
        ]} /> : null}
        {!writable && initial ? <DefinitionGrid items={[
          { label: "Apresentação", value: initial.name }, { label: "Código de barras", value: initial.barcode },
          { label: "Equivalência", value: presentationFactor(initial, unit) }, { label: "Situação", value: initial.active ? "Ativa" : "Inativa" },
        ]} /> : null}
        {writable ? <form id={id} className="hca-form" noValidate onSubmit={prepare}>
          {!initial ? <FormField label="Material da apresentação" htmlFor={id + "-productId"} error={errors.productId}>
            <SearchSelect id={id + "-productId"} query={productSearch || product?.name || ""} selectedIds={fields.productId ? [fields.productId] : []}
              onQueryChange={value => { setProductSearch(value); edit("productId", ""); }}
              onSelectionChange={value => { setProductSearch(""); edit("productId", value[0] ?? ""); setStaleRevision(null); }}
              options={products.filter(row => row.active !== false &&
                normalizeCatalogText([row.name, ...(row.aliases ?? [])].join(" ")).includes(normalizeCatalogText(productSearch)))
                .map(row => ({ value: row.id, label: row.name, content: row.name + " · " + row.unit }))} />
          </FormField> : null}
          <FormField label="Nome da apresentação" htmlFor={id + "-name"} error={errors.name}>
            <TextInput id={id + "-name"} required minLength={2} maxLength={160} value={fields.name} onChange={event => edit("name", event.currentTarget.value)} />
          </FormField>
          <FormField label="Código de barras" htmlFor={id + "-barcode"} error={errors.barcode} helpText="O código é texto. Zeros à esquerda são preservados.">
            <TextInput id={id + "-barcode"} required inputMode="numeric" pattern="[0-9]{8,14}" maxLength={14}
              placeholder="8 a 14 dígitos" value={fields.barcode} onChange={event => edit("barcode", event.currentTarget.value)} />
          </FormField>
          <FormField label="Quantidade na unidade base" htmlFor={id + "-baseQuantity"} error={errors.baseQuantity} helpText="Quantas unidades existem em uma embalagem.">
            <TextInput id={id + "-baseQuantity"} required inputMode="decimal" maxLength={64} value={fields.factor} onChange={event => edit("factor", event.currentTarget.value)} />
          </FormField>
          <CheckboxField className="hca-setting-switch hca-catalogue-presentation-switch" role="switch" label="Disponível para novas escolhas" checked={fields.active} onChange={event => edit("active", event.currentTarget.checked)} />
          <p className="hca-residence-admin-note"><Icon name="history" width={16} height={16} />Alterar a equivalência cria uma nova versão. Os registros anteriores conservam a equivalência usada.</p>
          {reference.loading ? <LoadingIndicator label="Consultando dados da apresentação" /> : null}
          {reference.error ? <FeedbackBanner tone="error">{reference.error}<ActionButton onClick={refreshReference}>Consultar referência novamente</ActionButton></FeedbackBanner> : null}
          {!reference.loading && !reference.error && fields.productId && !hasProduct ? <FeedbackBanner tone="warning">A referência desta apresentação está indisponível para edição.</FeedbackBanner> : null}
          {stale && !comparing ? <FeedbackBanner tone="warning">A apresentação mudou. Confira os dados atuais.
            <ActionButton onClick={refreshReference}>Conferir atualização</ActionButton>
          </FeedbackBanner> : null}
        </form> : null}
        {initial ? <button type="button" className="hca-guide-row" onClick={event => setHistorySurface({ page: 1, opener: event.currentTarget })}>
          <span className="hca-guide-row-icon"><Icon name="history" /></span>
          <span className="hca-guide-row-label"><strong>Histórico de equivalências</strong><small>Versão {current?.version ?? initial.version} · {presentationFactor(current ?? initial, unit)}</small></span>
          <Icon name="chevron" width={15} height={15} />
        </button> : null}
      </div>
    </RecordDrawer>
    {review && writable ? <Dialog open title="Confirmar apresentação?" kicker="Organização da residência" headingIcon="check"
      onClose={() => setReview(null)} footer={<><ActionButton onClick={() => setReview(null)}>Voltar à edição</ActionButton>
        <ActionButton variant="primary" disabled={!canReview} onClick={confirm}>Confirmar apresentação</ActionButton></>}>
      <DefinitionGrid items={[
        { label: "Material", value: product?.name ?? "Material autorizado" },
        { label: "Apresentação", value: review.fields.name },
        { label: "Código de barras", value: review.fields.barcode },
        { label: "Equivalência", value: "1 embalagem = " + formatQuantity(review.fields.factor, unit) },
        { label: "Situação", value: review.fields.active ? "Ativa" : "Inativa" },
      ]} />
    </Dialog> : null}
    {comparing ? <Dialog open title="Referência atual da apresentação" headingIcon="history"
      onClose={() => setDismissedRevision(revision)}
      footer={<><ActionButton onClick={() => setDismissedRevision(revision)}>Voltar</ActionButton>
        <ActionButton variant="primary" disabled={!hasProduct || reference.loading || !!reference.error} onClick={() => {
          setExpectedVersion(current?.version);
          setStaleRevision(null);
        }}>Usar referência atual</ActionButton></>}>
      {reference.loading ? <LoadingIndicator label="Conferindo referência atual" /> : null}
      {reference.error ? <FeedbackBanner tone="error">{reference.error}<ActionButton onClick={refreshReference}>Consultar novamente</ActionButton></FeedbackBanner> : null}
      {!reference.loading && !reference.error ? <>
        <DefinitionGrid items={[
          { label: "Sua equivalência", value: validQuantity(fields.factor, 6) ? formatQuantity(fields.factor, unit) : fields.factor || "A definir" },
          { label: "Versão atual", value: current?.version ?? "Novo cadastro" },
          { label: "Equivalência atual", value: current ? presentationFactor(current, unit) : "A definir" },
          ...(current ? [{ label: "Apresentação e código atuais", value: current.name + " · " + current.barcode }] : []),
        ]} />
        <p className="hca-field-hint">A nova revisão mantém seus campos e usa a referência atual.</p>
      </> : null}
    </Dialog> : null}
    {historySurface ? <RecordDrawer title="Histórico de equivalências" subtitle={initial?.name} headingIcon="history"
      kicker="Organização da residência" popupClassName="hca-preference-sheet hca-residence-settings-sheet"
      trackChanges={false} restoreFocusTo={historySurface.opener} onClose={() => setHistorySurface(null)} footer={close => <ActionButton onClick={close}>Voltar</ActionButton>}>
      <div className="hca-form-stack">
        {history.loading ? <LoadingIndicator label="Consultando histórico de equivalências" /> : null}
        {history.error ? <FeedbackBanner tone="error">{history.error}<ActionButton onClick={history.refresh}>Consultar histórico novamente</ActionButton></FeedbackBanner> : null}
        {history.data?.versions?.map(row => <section className="hca-residence-admin-section" key={row.version}>
          <header><h3>Versão {row.version} · {row.definition.name}</h3></header>
          <div><DefinitionGrid items={[
            { label: "Código de barras", value: row.definition.barcode },
            { label: "Equivalência", value: presentationFactor(row.definition, row.definition.unit) },
            { label: "Situação", value: row.definition.active ? "Ativa" : "Inativa" },
            { label: "Registro", value: row.definition.capturedExisting ? "Definição anterior preservada, com autoria e data indisponíveis."
              : (row.definition.actorName ?? "Autoria indisponível") + " · " + formatBrazilDate(row.recorded_at) },
          ]} /></div>
        </section>)}
        {history.data && history.data.versionTotal === 0 ? <EmptyState title="Nenhuma versão disponível" /> : null}
        {(history.data?.versionTotal ?? 0) > 20 ? <nav aria-label="Páginas do histórico da apresentação" className="hca-pagination">
          <ActionButton disabled={historyPage <= 1} onClick={() => setHistorySurface({ ...historySurface, page: historyPage - 1 })}>Mais recentes</ActionButton><span>{historyPage}</span>
          <ActionButton disabled={historyPage * 20 >= (history.data?.versionTotal ?? 0)} onClick={() => setHistorySurface({ ...historySurface, page: historyPage + 1 })}>Mais antigas</ActionButton>
        </nav> : null}
      </div>
    </RecordDrawer> : null}
  </>;
}
