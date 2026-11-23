"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef } from "react";
import { ActionButton, DefinitionGrid, LoadingIndicator, Pill } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { documentIssuerName, documentStatusLabel } from "@/lib/documents/presentation";
import { formatQuantity } from "@/lib/quantity";
import { formatBrazilDate } from "@/lib/receipt";
import { formatStockObservation } from "@/lib/stock-observation";
import { useScopedRead } from "@/lib/use-scoped-read";
import { parseRelatedRequisitionRead, parseRelatedSupplyRead, relatedRequisitionOpening } from "@/lib/validation/related-document";
import type { LinkedMaterialDocument } from "./document-material-panel";
import type { MaterialVisitTarget } from "./material-full-visit";
import { relatedDocumentLabel } from "./related-document";

type LinkedRecord = LinkedMaterialDocument & {
  status: string;
  createdAt: string;
  archived: boolean;
};

type Visit = (href: string, target: MaterialVisitTarget, event: { preventDefault: () => void },
  opener: HTMLElement | null, entryId: string) => void;

export function MaterialLinkedRecord({ record, expanded, onToggle, ...facts }: {
  record: LinkedRecord;
  expanded: boolean;
  onToggle: () => void;
  patientId: string;
  productId: string | null;
  sourceLineId: string;
  revision: string;
  onVisit: Visit;
  onRead: (id: string) => void;
}) {
  const regionId = useId();
  const kind = record.kind ?? record.type;
  const label = record.code ?? kind;
  const status = record.archived ? "Arquivada" : documentStatusLabel(record.status);
  const attention = !record.archived && ["fulfillment_partial", "partially_received", "disputed"].includes(record.status);
  return <article className="hca-material-linked-record" data-related-record={record.id}>
    <button type="button" className="hca-material-linked-summary" aria-label={label}
      aria-describedby={regionId + "-description"} aria-expanded={expanded} aria-controls={regionId}
      data-material-link-summary={record.id} onClick={onToggle}>
      <span className="hca-material-linked-kind">{kind}</span>
      <span>
        <strong>{label}</strong>
        <span id={regionId + "-description"} className="hca-material-linked-description">
          <small>{relatedDocumentLabel(kind)} · <time dateTime={record.createdAt}>{formatBrazilDate(record.createdAt)}</time></small>
          <Pill tone={attention ? "warning" : "neutral"}>{status}</Pill>
        </span>
      </span>
      <Icon name="down" width={17} height={17} />
    </button>
    <div id={regionId} hidden={!expanded}>
      {expanded ? <MaterialLinkedFacts record={record} {...facts} /> : null}
    </div>
  </article>;
}

function MaterialLinkedFacts({ record, patientId, productId, sourceLineId, revision, onVisit, onRead }: {
  record: LinkedRecord;
  patientId: string;
  productId: string | null;
  sourceLineId: string;
  revision: string;
  onVisit: Visit;
  onRead: (id: string) => void;
}) {
  const { id, type } = record;
  const openerRef = useRef<HTMLAnchorElement>(null);
  const decode = useCallback((value: unknown) => type === "REQ"
    ? parseRelatedRequisitionRead(value, id, patientId).data
    : parseRelatedSupplyRead(value, id, type, patientId).data, [id, type, patientId]);
  const endpoint = (type === "REQ" ? "/api/requisitions/" : "/api/documents/") + id;
  const opening = useScopedRead(type === "REQ" ? endpoint + "/opening" : null, revision, relatedRequisitionOpening.parse);
  const read = useScopedRead(type !== "REQ" || (!opening.loading && !opening.error && opening.data?.data.requiresDialog === false)
    ? endpoint : null, revision, decode);
  const loading = opening.loading || read.loading;
  const error = opening.error || read.error;
  useEffect(() => {
    if (!loading) onRead(id);
  }, [id, onRead, loading]);
  const data = loading || error ? null : read.data;
  const supply = data && "lines" in data ? data : null;
  const requisition = data && "requisition_items" in data ? data : null;
  const supplyLines = supply?.lines.filter(line => productId
    ? line.product_id === productId : line.requisitionItemIds.includes(sourceLineId)) ?? [];
  const requisitionLines = requisition?.requisition_items.filter(line => productId &&
    (line.resolution?.product_id ?? line.product_id) === productId) ?? [];
  const author = supply ? documentIssuerName(supply.canonical_snapshot ?? {}) : requisition?.requester_name_snapshot;
  const href = "/fichas/" + id + "?documentTab=materials";
  return <div className="hca-material-linked-content" aria-busy={loading}>
    {loading ? <LoadingIndicator label="Consultando dados do material nesta ficha" /> : null}
    {error && !loading ? <div role="alert">
      <p><strong>Não foi possível consultar o material nesta ficha.</strong></p>
      <p>{error}</p>
      <ActionButton compact onClick={opening.error ? opening.refresh : read.refresh}>Tentar novamente</ActionButton>
    </div> : null}
    {!loading && !error && opening.data?.data.requiresDialog ? <p>Use Ver ficha para confirmar a ciência antes de consultar os dados da requisição.</p> : null}
    {supplyLines.map(line => {
      const amount = (value: string | number) => formatQuantity(value, line.unit_snapshot);
      const items = type === "COM" ? [
        { label: "Aprovado", value: amount(line.approved_quantity) },
        { label: "Recebimento validado", value: amount(line.accepted_quantity) },
      ] : type === "BAL" ? [{ label: "Contado", value: amount(line.quantity) }]
        : supply?.transfer && supply.transfer.state !== "dispatched" ? [{ label: "Declarado", value: amount(line.quantity) }]
          : [{ label: "Expedido", value: amount(line.quantity) }, { label: "Recebido", value: amount(line.accepted_quantity) }];
      return <DefinitionGrid key={line.id} aria-label={line.name_snapshot} items={items} />;
    })}
    {requisitionLines.map(line => <DefinitionGrid key={line.id} items={[{
      label: "Estoque da equipe informado",
      value: formatStockObservation(line.current_stock, line.stock_observation ?? undefined, line.unit_snapshot ?? undefined),
    }]} />)}
    {data && !supplyLines.length && !requisitionLines.length ? <p>Esta ficha está vinculada ao material. Os dados da linha estão indisponíveis.</p> : null}
    {data ? <p className="hca-material-linked-author">
      <Icon name="users" width={14} height={14} />
      {author ?? "Autoria indisponível"} · <time dateTime={data.created_at}>{formatBrazilDate(data.created_at)}</time>
    </p> : null}
    <div className="hca-material-linked-actions">
      <Link ref={openerRef} href={href} prefetch={false} className="hca-control hca-control--compact"
        aria-label={"Ver ficha " + (record.code ?? record.kind ?? type)} data-material-link-entry={id}
        onNavigate={event => {
          const material = productId ?? supplyLines[0]?.product_id ?? null;
          onVisit(href, { kind: "document", reference: record, productId: material }, event, openerRef.current, id);
        }}>
        <Icon name="file" width={16} height={16} />Ver ficha
      </Link>
    </div>
  </div>;
}
