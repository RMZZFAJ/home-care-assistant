"use client";
import { lazy, Suspense, useCallback, useState } from "react";
import type { MaterialVisitTarget } from "@/components/documents/material-full-visit";
import { EmptyState, Icon, StatusBadge } from "@/components/ui/primitives";
import { formatQuantity, quantity } from "@/lib/quantity";
import { formatBrazilDate } from "@/lib/receipt";
import type { WorkspaceContext } from "@/types/workspace";
import { ActionButton, LoadingIndicator } from "@/components/ui/controls";
import { FeedbackBanner } from "@/components/ui/feedback";
import { Drawer } from "@/components/ui/overlays";
import { Notice } from "@/components/workspace";
import { useScopedRead } from "@/lib/use-scoped-read";
import { parseStockBalances, type TransitDocument } from "@/lib/validation/stock-reads";

const MaterialFullVisit = lazy(() => import("@/components/documents/material-full-visit").then(module => ({ default: module.MaterialFullVisit })));

type Destination = TransitDocument["destination"];
const destinations: Destination[] = ["CARE_TEAM", "FAMILY"];
const routes = {
  CARE_TEAM: { label: "Entregas para o estoque da equipe", source: "Família", destination: "Equipe", from: "home", to: "users" },
  FAMILY: { label: "Devoluções para o estoque da família", source: "Equipe", destination: "Família", from: "users", to: "home" },
} as const;

export function StockTransitDrawer({ patientId, context, revision, search, productId, destination, onClose, finalFocus }: {
  patientId: string;
  context: WorkspaceContext;
  revision: string;
  search: string;
  productId?: string;
  destination?: Destination;
  onClose: () => void;
  finalFocus: () => HTMLElement | false;
}) {
  const [visit, setVisit] = useState<{ target: MaterialVisitTarget; opener: HTMLElement } | null>(null);
  const decode = useCallback((value: unknown) => parseStockBalances(value, {
    careRecipientId: patientId, custody: "TRANSIT",
  }), [patientId]);
  const read = useScopedRead("/api/stock/balances?" + new URLSearchParams({
    careRecipientId: patientId, custody: "TRANSIT",
  }), revision, decode);
  return <Drawer open title={destination === "FAMILY" ? "Devoluções em trânsito" : "Materiais em trânsito"}
    subtitle={destination ? routes[destination].label : undefined} headingIcon="truck" keyboardScrollable
    popupClassName="hca-stock-operation-sheet" closeLabel="Fechar painel de trânsito"
    onClose={onClose} finalFocus={finalFocus} footer={<ActionButton onClick={onClose}>Fechar</ActionButton>}>
    {read.loading ? <LoadingIndicator label="Consultando os materiais em trânsito" /> : null}
    {read.error ? <Notice error>{read.error}
      <ActionButton onClick={read.refresh}>Atualizar consulta</ActionButton>
    </Notice> : null}
    {read.data ? <TransitStock documents={read.data.transit} search={search} destination={destination}
      productId={productId} loading={read.loading} showEmpty={!read.error}
      onVisit={(document, materialId, opener) => setVisit({
        target: { kind: "document", productId: materialId, reference: { id: document.id, code: document.code, type: "ENT", kind: document.kind } },
        opener,
      })} /> : null}
    {visit ? <Suspense fallback={<LoadingIndicator label="Abrindo ficha completa" />}>
      <MaterialFullVisit context={context} target={visit.target} onClose={() => setVisit(null)}
        finalFocus={() => visit.opener.isConnected ? visit.opener : false} />
    </Suspense> : null}
  </Drawer>;
}

function TransitStock({
  documents,
  search,
  productId,
  destination,
  loading,
  showEmpty = true,
  onVisit,
}: {
  documents: TransitDocument[];
  search: string;
  productId?: string;
  destination?: Destination;
  loading: boolean;
  showEmpty?: boolean;
  onVisit: (document: TransitDocument, productId: string, opener: HTMLElement) => void;
}) {
  const term = search.trim().toLocaleLowerCase("pt-BR");
  type Entry = { document: TransitDocument; line: TransitDocument["lines"][number] };
  const groups = { CARE_TEAM: new Map<string, Entry[]>(), FAMILY: new Map<string, Entry[]>() };
  for (const document of documents) {
    if (destination && document.destination !== destination) continue;
    const materials = groups[document.destination];
    for (const line of document.lines) {
      const matches = productId ? line.productId === productId : line.name.toLocaleLowerCase("pt-BR").includes(term);
      if (!matches) continue;
      const group = materials.get(line.productId);
      const entry = { document, line };
      if (group) group.push(entry);
      else materials.set(line.productId, [entry]);
    }
  }
  const visibleRoutes = destinations.filter(place => groups[place].size > 0);
  const visibleItems = visibleRoutes.flatMap(place => [...groups[place].values()].flat());
  const hasDisputes = visibleItems.some(({ line }) => line.disputed);
  const hasPartialReceipt = visibleItems.some(({ line }) => quantity(line.accepted).gt(0) && quantity(line.pending).gt(0));
  const summary = hasDisputes ? "Divergências em avaliação" : hasPartialReceipt ? "Há recebimento parcial" : "Aguardando recebimento";
  return (
    <div className="hca-form-stack hca-transit-stock">
      {visibleRoutes.length ? <FeedbackBanner tone={hasDisputes ? "warning" : "info"}
        heading={summary}>
        <p>Somente as quantidades recebidas e confirmadas integram o estoque disponível.</p>
      </FeedbackBanner> : null}
      {visibleRoutes.map(place => {
        const route = routes[place];
        return <section key={place} aria-label={route.label} className="hca-transit-direction">
          <h3 className="sr-only">{route.label}</h3>
          <div className="hca-transit-route">
            <span><Icon name={route.from} width={16} height={16} />{route.source}</span>
            <span aria-hidden="true"><Icon name="truck" width={19} height={19} /></span>
            <span><span className="sr-only">para </span><Icon name={route.to} width={16} height={16} />{route.destination}</span>
          </div>
          {[...groups[place]].map(([id, entries]) => <section className="hca-transit-material" key={id} aria-label={entries[0].line.name}>
            <header className="hca-transit-material-heading">
              <span className="hca-stock-material-icon"><Icon name="box" width={20} height={20} /></span>
              <div><h4>{entries[0].line.name}</h4>
                <small>{entries.length} {entries.length === 1 ? "ficha vinculada" : "fichas vinculadas"}</small>
              </div>
            </header>
            {entries.map(({ document, line }) => <TransitRecord key={document.id} document={document} line={line}
              groupedName={entries[0].line.name} onVisit={onVisit} />)}
          </section>)}
        </section>
      })}
      {!loading && showEmpty && !visibleRoutes.length ? (
        <EmptyState title={destination === "FAMILY" ? "Nenhuma devolução em trânsito" : "Nenhuma transferência em trânsito"}>
          As conferências pendentes deste paciente aparecem aqui.
        </EmptyState>
      ) : null}
    </div>
  );
}

function TransitRecord({ document, line, groupedName, onVisit }: {
  document: TransitDocument;
  line: TransitDocument["lines"][number];
  groupedName: string;
  onVisit: (document: TransitDocument, productId: string, opener: HTMLElement) => void;
}) {
  const difference = line.disputed && line.reported !== null ? quantity(line.reported).minus(line.dispatched) : null;
  return <article className="hca-transit-record">
    <div className="hca-transit-record-heading">
      <ActionButton variant="quiet" compact onClick={event => onVisit(document, line.productId, event.currentTarget)}>
        <Icon name="file" width={15} height={15} />{document.code}
      </ActionButton>
      {document.dispatchedAt ? <time dateTime={document.dispatchedAt}>{formatBrazilDate(document.dispatchedAt)}</time>
        : <span>Hora de expedição indisponível</span>}
    </div>
    {line.name !== groupedName ? <p>Identificação na ficha · {line.name}</p> : null}
    {document.status === "cancellation_pending" ? <StatusBadge status={document.status} /> : null}
    <dl className="hca-transit-quantities">
      <div><dt><Icon name="truck" width={14} height={14} />Expedido</dt>
        <dd><strong>{formatQuantity(line.dispatched)} <small>{line.unit}</small></strong><span>Informado na saída</span></dd>
      </div>
      <div><dt><Icon name="check" width={14} height={14} />Recebido</dt>
        <dd><strong>{formatQuantity(line.accepted)} <small>{line.unit}</small></strong><span>Já aceito no estoque</span></dd>
      </div>
    </dl>
    {quantity(line.pending).gt(0) ? <div className="hca-transit-remaining">
      <span><Icon name={line.disputed ? "alert" : "clock"} width={16} height={16} />
        {line.disputed ? "Em avaliação" : "Ainda em trânsito"}</span>
      <strong>{formatQuantity(line.pending, line.unit)}</strong>
    </div> : null}
    {line.disputed ? <FeedbackBanner tone="warning" heading={difference?.isZero() === false
      ? `${difference.gt(0) ? "Excedente informado" : "Falta informada"} · ${formatQuantity(difference.abs().toFixed(), line.unit)}`
      : "Divergência em avaliação"}>
      <p>Consulte a ficha para acompanhar a decisão sobre a divergência.</p>
    </FeedbackBanner> : null}
    {quantity(line.reconciled).gt(0) ? <FeedbackBanner heading={`${formatQuantity(line.reconciled, line.unit)} · Conciliado`}>
      <p>Esta parte da diferença já foi resolvida na ficha.</p>
    </FeedbackBanner> : null}
  </article>;
}
