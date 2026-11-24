"use client";

import Link from "next/link";
import { useCallback, useRef, useState, type RefObject } from "react";
import { CatalogueIdentityManagement } from "@/components/catalog/catalogue-identity-management";
import { ReviewedCatalogueFeedback, useReviewedCatalogueOperation } from "@/components/catalog/reviewed-catalogue-operation";
import { RecordDrawer } from "@/components/forms/record-drawer";
import { ActionButton, DefinitionGrid, Pill, SelectField, TextInput } from "@/components/ui/controls";
import { FeedbackBanner } from "@/components/ui/feedback";
import { Icon, type IconName } from "@/components/ui/icon";
import { EmptyState } from "@/components/ui/primitives";
import { normalizeCatalogText } from "@/lib/catalog-match";
import { useLiveRevision } from "@/lib/use-live-revision";
import { useScopedRead } from "@/lib/use-scoped-read";
import { parseCatalogueCollectionRead, type CatalogueCollectionItem } from "@/lib/validation/catalogue-list";
import type { CatalogueScope, ReviewedCatalogueReceipt } from "@/lib/validation/catalogue-preparation";
import { catalogueCategories, CatalogueProductEditor } from "./catalogue-product-editor";

const purposes = ["create", "edit", "adopt"] as const;
const identityPurposes = ["identity"] as const;
type ProductPurpose = typeof purposes[number];
type OpenProduct = { id: string; opener: HTMLElement };
const categoryIcon: Record<string, IconName> = { medicamentos: "pill", higiene: "heart", dieta: "box" };
const categoryLabel = (category: string) => catalogueCategories[category as keyof typeof catalogueCategories] ?? category;
const pageSize = 15;

export function CatalogueManagement({ writable, userId, globalMode, patientId, headingRef }: {
  writable: boolean; userId: string; globalMode: boolean; patientId: string;
  headingRef: RefObject<HTMLHeadingElement | null>;
}) {
  const mode = globalMode ? "global" : "patient";
  const revision = useLiveRevision();
  const decode = useCallback((value: unknown) => parseCatalogueCollectionRead(value, patientId), [patientId]);
  const read = useScopedRead("/api/admin?" + new URLSearchParams({ section: "catalog", careRecipientId: patientId }), String(revision), decode);
  const operation = useReviewedCatalogueOperation(userId, { patientId, mode }, purposes);
  const identityOperation = useReviewedCatalogueOperation(userId, { patientId, mode }, identityPurposes);
  const rows = read.data?.data ?? [];
  const unavailable = read.loading || !read.data || Boolean(read.error);
  const locked = unavailable || operation.blocked;
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("active");
  const [page, setPage] = useState(1);
  const [product, setProduct] = useState<OpenProduct | null>(null);
  const [identity, setIdentity] = useState<OpenProduct | null>(null);
  const [editor, setEditor] = useState<{ purpose: ProductPurpose; id: string | null; opener: HTMLElement } | null>(null);
  const [referenceRevision, setReferenceRevision] = useState(0);
  const [identityRevision, setIdentityRevision] = useState(0);
  const addRef = useRef<HTMLButtonElement>(null);
  const term = normalizeCatalogText(search);
  const filtered = rows.filter(row =>
    (!status || (status === "active") === row.is_active) && (!category || category === row.category)
      && normalizeCatalogText([row.name, ...row.aliases, row.category, row.unit].join(" ")).includes(term));
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const groups = [...new Set(visible.map(row => row.category))].sort((a, b) => categoryLabel(a).localeCompare(categoryLabel(b), "pt-BR"));
  const detail = rows.find(row => row.id === product?.id);

  function openEditor(purpose: ProductPurpose, id: string | null, opener: HTMLElement) {
    if (locked || !writable) return;
    setReferenceRevision(0);
    setEditor({ purpose, id, opener });
  }

  function finish(result: ReviewedCatalogueReceipt) {
    if (result.state === "recorded") {
      setEditor(null);
      read.refresh();
    }
  }

  return <section className="hca-form-stack">
    {globalMode ? <div className="hca-residence-admin-banner"><Icon name="shield" />
      <p><strong>Administração global</strong> Alterações seguem para decisão de outro administrador da residência.</p>
    </div> : null}
    {writable ? <ActionButton className="hca-catalogue-add" ref={addRef} variant="primary" compact aria-disabled={locked}
      onClick={event => openEditor("create", null, event.currentTarget)}><Icon name="plus" />Novo item</ActionButton> : null}
    {read.error ? <FeedbackBanner tone="error">{read.error} <ActionButton onClick={read.refresh}>Consultar catálogo novamente</ActionButton></FeedbackBanner> : null}
    {read.loading ? <p role="status" className="sr-only">Consultando catálogo…</p> : null}
    {writable ? <>
      <form className="hca-catalogue-search" role="search" onSubmit={event => { event.preventDefault(); setSearch(query); setPage(1); }}>
        <TextInput type="search" aria-label="Pesquisar catálogo" placeholder="Buscar nome ou nome alternativo"
          leading={<Icon name="search" />} value={query} onChange={event => setQuery(event.currentTarget.value)} />
        <ActionButton type="submit" compact aria-label="Buscar no catálogo"><Icon name="search" /></ActionButton>
      </form>
      <div className="hca-catalogue-types" role="group" aria-label="Tipos de material">
        {[["", "Todos"], ...Object.entries(catalogueCategories)].map(([value, label]) =>
          <ActionButton key={value} compact aria-pressed={category === value} variant="quiet"
            onClick={() => { setCategory(value); setPage(1); }}>{label}</ActionButton>)}
      </div>
      <div className="hca-catalogue-status">
        <SelectField aria-label="Situação dos produtos" value={status} onChange={event => { setStatus(event.currentTarget.value); setPage(1); }}>
          <option value="active">Ativos</option><option value="inactive">Inativos</option><option value="">Todos os estados</option>
        </SelectField>
      </div>
      <div role="region" aria-label="Produtos do catálogo" className="hca-form-stack">
        <p className="sr-only" role="status">{read.data ? `${filtered.length} resultados` : "Resultados ainda não confirmados"}</p>
        {groups.map(group => <section key={group} className="hca-residence-admin-section hca-catalogue-group">
          <header><h3>{categoryLabel(group)}</h3></header>
          <div>{visible.filter(row => row.category === group).map(row =>
            <button key={row.id} data-product-id={row.id} type="button" className="hca-guide-row hca-catalogue-row" aria-disabled={unavailable}
              onClick={event => { if (!unavailable) setProduct({ id: row.id, opener: event.currentTarget }); }}>
              <span className="hca-guide-row-icon"><Icon name={categoryIcon[group] ?? "box"} /></span>
              <span className="hca-guide-row-label"><strong>{row.name}</strong><small>{[row.unit, ...row.aliases].join(" · ")}</small>
                <small className="sr-only">Precisão {row.quantity_decimals} casa(s)</small>
                <Pill tone={row.is_active ? "success" : "neutral"}>{row.is_active ? "Ativo" : "Inativo"}</Pill>
              </span><Icon name="chevron" width={15} height={15} />
            </button>)}</div>
        </section>)}
        {read.data && !read.loading && !read.error && !filtered.length ? <EmptyState title="Nenhum material encontrado">
          <p>Tente outro nome ou confira os nomes alternativos.</p>
          <ActionButton onClick={() => { setQuery(""); setSearch(""); setCategory(""); setStatus("active"); setPage(1); }}>Limpar busca</ActionButton>
        </EmptyState> : null}
      </div>
      {totalPages > 1 ? <nav className="hca-pagination" aria-label="Páginas do catálogo">
        <ActionButton disabled={currentPage <= 1 || unavailable} onClick={() => setPage(currentPage - 1)}>Anterior</ActionButton>
        <span>Página {currentPage} de {totalPages}</span>
        <ActionButton disabled={currentPage >= totalPages || unavailable} onClick={() => setPage(currentPage + 1)}>Próxima</ActionButton>
      </nav> : null}
      <section className="hca-residence-admin-section hca-residence-rules">
        <header><h3>Organização do catálogo</h3></header>
        <div><button type="button" aria-disabled={locked} className="hca-guide-row"
          onClick={event => openEditor("adopt", null, event.currentTarget)}>
          <span className="hca-guide-row-icon"><Icon name="plus" /></span>
          <span className="hca-guide-row-label"><strong>Adotar um modelo</strong><small>Selecionar um material ainda não adotado</small></span><Icon name="chevron" width={15} height={15} />
        </button>
        <Link className="hca-guide-row" href={"/unidades?careRecipientId=" + patientId}>
          <span className="hca-guide-row-icon"><Icon name="layers" /></span>
          <span className="hca-guide-row-label"><strong>Unidades e apresentações</strong><small>Unidade de controle, embalagem e código</small></span><Icon name="chevron" width={15} height={15} />
        </Link></div>
      </section>
      <FeedbackBanner>O catálogo organiza os materiais. Quantidades físicas continuam nos estoques da família e da equipe.</FeedbackBanner>
    </> : null}
    {writable && detail && product ? <ProductDetails item={detail} opener={product.opener} fallback={headingRef}
      globalMode={globalMode} locked={locked} onClose={() => setProduct(null)} openEdit={opener => openEditor("edit", detail.id, opener)}
      openIdentity={opener => { setIdentityRevision(0); setIdentity({ id: detail.id, opener }); }} /> : null}
    {writable && identity ? <CatalogueIdentityManagement
      key={identity.id} operation={identityOperation} referenceRevision={identityRevision}
      patientId={patientId} productId={identity.id} products={rows}
      opener={identity.opener} onClose={() => setIdentity(null)} restoreFocusFallbackRef={headingRef}
      onRefreshReference={() => setIdentityRevision(value => value + 1)}
      /> : null}
    {writable && editor ? <CatalogueProductEditor key={JSON.stringify([editor.purpose, editor.id])}
      scope={{ patientId, mode, purpose: editor.purpose, targetId: editor.id } satisfies CatalogueScope}
      readRevision={referenceRevision} operation={operation} rows={rows} opener={editor.opener} fallback={headingRef}
      onClose={() => setEditor(null)}
      onInspect={id => {
        setEditor(null);
        setProduct({ id, opener: product?.opener ?? addRef.current ?? editor.opener });
      }} /> : null}
    <ReviewedCatalogueFeedback operation={operation} onFinish={finish}
      onReview={editor ? () => { operation.closeFailure(); setReferenceRevision(value => value + 1); read.refresh(); } : undefined} />
    {!globalMode ? <ReviewedCatalogueFeedback identity operation={identityOperation} showPending={!writable || !identity}
      onFinish={result => { if (result.state === "recorded") { setIdentity(null); read.refresh(); } }}
      onReview={identity && writable ? () => {
        identityOperation.closeFailure();
        setIdentityRevision(value => value + 1);
      } : undefined} /> : null}
  </section>;
}

function ProductDetails({ item, opener, fallback, globalMode, locked, onClose, openEdit, openIdentity }: {
  item: CatalogueCollectionItem; opener: HTMLElement; fallback: RefObject<HTMLElement | null>;
  globalMode: boolean; locked: boolean; onClose: () => void;
  openEdit: (opener: HTMLElement) => void; openIdentity: (opener: HTMLElement) => void;
}) {
  return <RecordDrawer title={item.name} subtitle="Cadastro do material" headingIcon={categoryIcon[item.category] ?? "box"}
    kicker="Organização da residência" popupClassName="hca-preference-sheet hca-residence-settings-sheet"
    trackChanges={false} restoreFocusTo={opener} restoreFocusFallbackRef={fallback} onClose={onClose}
    footer={close => <ActionButton onClick={close}>Voltar</ActionButton>} keyboardScrollable>
    <div className="hca-form-stack">
    <div className="hca-residence-admin-hero">
      <span className="hca-guide-row-icon"><Icon name={categoryIcon[item.category] ?? "box"} /></span>
      <div className="hca-guide-row-label"><strong>{item.name}</strong><small>{categoryLabel(item.category)}</small></div>
      <Pill tone={item.is_active ? "success" : "neutral"}>{item.is_active ? "Ativo" : "Inativo"}</Pill>
    </div>
    <DefinitionGrid items={[
      { label: "Unidade base", value: item.unit }, { label: "Precisão", value: `${item.quantity_decimals} casas decimais` },
      { label: "Nomes alternativos", value: item.aliases.join(", ") || "—" },
      { label: "Identidade", value: item.id, wide: true },
      ...(item.description ? [{ label: "Descrição operacional", value: item.description, wide: true }] : []),
    ]} />
    <section className="hca-residence-admin-section hca-residence-rules">
      <header><h3>Organizar material</h3></header>
      <div><button type="button" className="hca-guide-row" aria-disabled={locked} onClick={event => openEdit(event.currentTarget)}>
        <span className="hca-guide-row-icon"><Icon name="edit" /></span>
        <span className="hca-guide-row-label"><strong>{globalMode ? "Propor alteração de cadastro" : "Editar cadastro"}</strong>
          <small>Nome, tipo, nomes alternativos e descrição</small></span><Icon name="chevron" width={15} height={15} />
      </button>
      {!globalMode ? <button type="button" className="hca-guide-row" aria-disabled={locked}
        onClick={event => { if (!locked) openIdentity(event.currentTarget); }}>
        <span className="hca-guide-row-icon"><Icon name="history" /></span>
        <span className="hca-guide-row-label"><strong>Situação e sucessor</strong><small>Inativar, reativar ou orientar novas escolhas</small></span><Icon name="chevron" width={15} height={15} />
      </button> : null}</div>
    </section>
    <FeedbackBanner>O histórico conserva a identidade do material. Alterações no cadastro preservam o saldo.</FeedbackBanner>
    </div>
  </RecordDrawer>;
}
