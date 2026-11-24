"use client";

import { useState } from "react";
import { RecordDrawer } from "@/components/forms/record-drawer";
import { ActionButton, DefinitionGrid, LoadingIndicator, TextInput } from "@/components/ui/controls";
import { FeedbackBanner } from "@/components/ui/feedback";
import { Icon } from "@/components/ui/icon";
import { EmptyState } from "@/components/ui/primitives";
import { can, Workspace, type WorkspaceContext } from "@/components/workspace";
import { normalizeCatalogText } from "@/lib/catalog-match";
import { useScopedRead } from "@/lib/use-scoped-read";
import type { CatalogProduct } from "@/types/documents";
import type { MeasurementUnit } from "./catalogue-complementary-reference";
import { PresentationManagement } from "./presentation-management";
import { ReviewedCatalogueFeedback, useReviewedCatalogueOperation } from "./reviewed-catalogue-operation";
import { unitDimensions, UnitPreparationEditor } from "./unit-preparation-editor";
import "../admin/residence-administration.css";

const unitPurposes = ["unit_create", "unit_configure"] as const;
const pageSize = 15;

export function UnitConsole() {
  return <Workspace title="Unidades e apresentações" eyebrow="Organização da residência">
    {context => <Units key={JSON.stringify([context.userId, context.activeContext?.mode, context.patient?.id])} context={context} />}
  </Workspace>;
}

function precisionLabel(decimals: number) {
  return decimals === 1 ? "1 casa decimal" : decimals + " casas decimais";
}

function dimensionLabel(dimension: string) {
  return unitDimensions[dimension as keyof typeof unitDimensions] ?? dimension;
}

function Units({ context }: { context: WorkspaceContext }) {
  const global = context.activeContext?.mode === "global" && context.globalAdministrationAllowed === true;
  const mode = global ? "global" : "patient";
  const patientId = global ? null : context.patient?.id ?? null;
  const writable = global || Boolean(patientId && can(context, "catalog.manage"));
  const units = useScopedRead<{ data: MeasurementUnit[] }>("/api/units");
  const products = useScopedRead<{ data: CatalogProduct[] }>(patientId && writable ? "/api/catalog?careRecipientId=" + patientId : null);
  const operation = useReviewedCatalogueOperation(context.userId, { patientId, mode }, unitPurposes);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [detail, setDetail] = useState<{ unit: MeasurementUnit; opener: HTMLElement } | null>(null);
  const [editor, setEditor] = useState<{ purpose: (typeof unitPurposes)[number]; opener: HTMLElement } | null>(null);
  const matching = (units.data?.data ?? []).filter(unit =>
    (unit.care_recipient_id === null || unit.care_recipient_id === patientId)
    && normalizeCatalogText(unit.name + " " + unit.code).includes(normalizeCatalogText(search)));
  const totalPages = Math.max(1, Math.ceil(matching.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const open = (purpose: (typeof unitPurposes)[number], opener: HTMLElement) => { setRevision(0); setEditor({ purpose, opener }); };
  const refreshReference = () => setRevision(value => value + 1);
  const canOpenPrecision = patientId && writable && products.data && !operation.blocked;

  return <div className="hca-residence-admin">
    <p className="hca-residence-admin-subtitle">Defina como identificar e contar cada material.</p>
    <section className="hca-residence-admin-section hca-residence-rules" aria-labelledby="measurement-units-heading">
      <header><h2 id="measurement-units-heading">Unidades disponíveis</h2>
        {writable ? <ActionButton compact disabled={operation.blocked} onClick={event => open("unit_create", event.currentTarget)}><Icon name="plus" />Nova unidade</ActionButton> : null}
      </header>
      <div className="hca-notice-rules-filter hca-catalogue-filter-search">
        <TextInput type="search" leading={<Icon name="search" />} aria-label="Pesquisar unidades" placeholder="Buscar nome ou código"
          value={search} onChange={event => { setSearch(event.currentTarget.value); setPage(1); }} />
      </div>
      {units.loading ? <div className="hca-residence-rules-empty"><LoadingIndicator label="Consultando unidades" /></div> : null}
      {units.error ? <div className="hca-residence-rules-empty"><FeedbackBanner tone="error">{units.error}
        <ActionButton onClick={units.refresh}>Consultar unidades novamente</ActionButton>
      </FeedbackBanner></div> : null}
      <div>{matching.slice((currentPage - 1) * pageSize, currentPage * pageSize).map(unit => <button key={unit.id} type="button" className="hca-guide-row"
        onClick={event => setDetail({ unit, opener: event.currentTarget })}>
        <span className="hca-guide-row-icon"><Icon name="box" /></span>
        <span className="hca-guide-row-label"><strong>{unit.name}</strong><small>{dimensionLabel(unit.dimension)} · {precisionLabel(unit.decimals)} · {unit.care_recipient_id ? "Residência" : "Global"}</small></span>
        <Icon name="chevron" width={15} height={15} />
      </button>)}</div>
      {units.data && !units.loading && !units.error && !matching.length ? <div className="hca-residence-rules-empty">
        <EmptyState title={search ? "Nenhuma unidade encontrada" : "Nenhuma unidade disponível"} />
      </div> : null}
      {totalPages > 1 ? <nav aria-label="Páginas das unidades" className="hca-pagination">
        <ActionButton disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>Anterior</ActionButton>
        <span>Página {currentPage} de {totalPages}</span>
        <ActionButton disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}>Próxima</ActionButton>
      </nav> : null}
      {patientId && writable ? <div>
        <button type="button" className="hca-guide-row" disabled={!canOpenPrecision} onClick={event => open("unit_configure", event.currentTarget)}>
          <span className="hca-guide-row-icon"><Icon name="settings" /></span>
          <span className="hca-guide-row-label"><strong>Precisão de um material</strong><small>Unidade de controle e casas decimais</small></span><Icon name="chevron" width={15} height={15} />
        </button>
        {products.error ? <FeedbackBanner tone="error">{products.error}<ActionButton onClick={products.refresh}>Consultar materiais novamente</ActionButton></FeedbackBanner> : null}
      </div> : null}
    </section>
    {patientId ? <PresentationManagement userId={context.userId} patientId={patientId} writable={writable} /> : null}
    <p className="hca-residence-admin-note"><Icon name="history" width={16} height={16} />O fator descreve uma embalagem. Movimentos já registrados preservam a equivalência usada na ocasião.</p>
    {detail ? <RecordDrawer title="Unidade de medida" subtitle={detail.unit.name} kicker="Organização da residência" headingIcon="box"
      onClose={() => setDetail(null)} trackChanges={false} restoreFocusTo={detail.opener}
      popupClassName="hca-preference-sheet hca-residence-settings-sheet" footer={close => <>
        <ActionButton onClick={close}>Voltar</ActionButton>
        {canOpenPrecision ? <ActionButton onClick={() => open("unit_configure", detail.opener)}>Precisão de um material</ActionButton> : null}
      </>}>
      <div className="hca-form-stack">
        <DefinitionGrid items={[
          { label: "Código", value: detail.unit.code },
          { label: "Dimensão", value: dimensionLabel(detail.unit.dimension) },
          { label: "Precisão", value: precisionLabel(detail.unit.decimals) },
          { label: "Âmbito", value: detail.unit.care_recipient_id ? "Esta residência" : "Unidade global" },
        ]} />
        <p className="hca-residence-admin-note"><Icon name="history" width={16} height={16} />Cadastros e movimentos existentes preservam suas referências.</p>
      </div>
    </RecordDrawer> : null}
    {editor && writable ? <UnitPreparationEditor key={editor.purpose}
      scope={{ patientId, mode, purpose: editor.purpose, targetId: null }}
      products={products.data?.data ?? []} opener={editor.opener} onClose={() => setEditor(null)}
      operation={operation} revision={revision} refreshReference={refreshReference} /> : null}
    <ReviewedCatalogueFeedback operation={operation} showPending={!editor || !writable}
      onFinish={result => {
        if (result.state === "recorded") { setEditor(null); units.refresh(); products.refresh(); }
      }}
      onReview={editor && writable ? () => { operation.closeFailure(); refreshReference(); } : undefined} />
  </div>;
}
