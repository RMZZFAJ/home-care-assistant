"use client";
import { useOperationActivity } from "@/components/ui/operation-activity";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActionButton, Pill } from "@/components/ui/controls";
import { Drawer } from "@/components/ui/overlays";
import { Icon } from "@/components/ui/icon";
import { Notice, primaryClass } from "@/components/workspace";
import { useWorkspaceState } from "@/components/layout/workspace-context";
import { formatBrazilDate } from "@/lib/receipt";
import { RequisitionOpening } from "@/components/requisitions/requisition-opening";
import { RequisitionDisplay } from "@/components/requisitions/requisition-display";
import { formatStockObservation, formatStockObservationTime } from "@/lib/stock-observation";
import { documentLabels, type DocumentKind, type DocumentType, type SupplyType } from "@/types/documents";
import { documentIssuerName, documentPatientName, documentStatusLabel } from "@/lib/documents/presentation";
import { activeDocumentArchive, documentArchiveLabel } from "@/lib/documents/document-archive";
import { pendingPurchaseItems } from "@/lib/documents/pending-purchase-items";
import { formatQuantity } from "@/lib/quantity";
import { SupplyLineSummary } from "./supply-line-summary";
import { useScopedRead } from "@/lib/use-scoped-read";
import { parseRelatedRequisitionRead, parseRelatedSupplyRead } from "@/lib/validation/related-document";
import { consumeMaterialVisit, materialVisitParam, prepareMaterialVisit } from "@/lib/documents/material-visit";

export function relatedDocumentLabel(kind: DocumentKind) {
  if (kind === "DEV") return "Devolução de materiais";
  return kind === "ENT" ? "Entrega de materiais" : documentLabels[kind];
}

export function RelatedDocument({
  id,
  type = "REQ",
  label,
  actionLabel,
  origin,
  compact = false,
}: {
  id: string;
  type?: DocumentType;
  label: string;
  actionLabel?: string;
  origin?: { id: string; patientId: string; actorId: string };
  compact?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const originId = origin?.id;
  const patientId = origin?.patientId;
  const actorId = origin?.actorId;
  const returnKey = originId && patientId && actorId ? [originId, patientId, actorId, id].join(":") : null;
  useEffect(() => {
    if (!returnKey) return;
    const reopen = () => {
      if (window.history.state?.hcaRelatedReturn !== returnKey) return;
      window.history.replaceState({ ...window.history.state, hcaRelatedReturn: null }, "");
      consumeMaterialVisit();
      setOpen(true);
    };
    const timer = window.setTimeout(reopen, 0);
    window.addEventListener("popstate", reopen);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("popstate", reopen);
    };
  }, [returnKey]);
  const close = () => {
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  };
  const href = `/fichas/${id}`;
  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={actionLabel ? actionLabel + " " + label : label}
        className={actionLabel ? "hca-source-link hca-related-consult" : compact ? "hca-source-link" : "doc-linked-row"}
        onClick={(event) => { event.currentTarget.focus(); setOpen(true); }}
      >
        {actionLabel ? <><Icon name="link" width={16} height={16} />{actionLabel}{compact ? " " + label : null}</> : compact ? <>{label}<Icon name="external" width={13} height={13} /></> : (
          <><span className="doc-linked-kind" data-type={type}>{type}</span><span className="doc-linked-main"><strong>{label}</strong><small>Consultar ficha</small></span><Icon name="chevron" width={16} height={16} /></>
        )}
      </button>
      {open ? <Drawer open title={label ?? relatedDocumentLabel(type)} kicker="Ficha relacionada"
        popupClassName="hca-material-sheet" keyboardScrollable onClose={close}
        footer={<>
          <ActionButton onClick={close}><Icon name="back" />Voltar à origem</ActionButton>
          {returnKey && patientId ? <Link href={href} className={primaryClass} onClick={event => {
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            const token = prepareMaterialVisit(id, patientId);
            if (!token) return;
            window.history.replaceState({ ...window.history.state, hcaRelatedReturn: returnKey }, "");
            event.preventDefault();
            router.push(href + "?" + new URLSearchParams({ [materialVisitParam]: token }));
          }}>Abrir {label}<Icon name="external" /></Link> : null}
        </>}>
        <RelatedDocumentBody id={id} type={type} patientId={patientId} title={label} onClose={close} />
      </Drawer> : null}
    </>
  );
}
export function RelatedDocumentBody({ id, type, patientId, title, onClose }: {
  id: string; type: DocumentType; patientId?: string; title?: string; onClose: () => void;
}) {
  const patient = useWorkspaceState().value?.patient;
  const currentPatient = patientId ?? patient?.id;
  const patientName = patient?.id === currentPatient ? patient?.display_name : undefined;
  return type === "REQ"
    ? <RequisitionOpening id={id} key={id + ":" + currentPatient} withinDialog onCancel={onClose}>
      <RelatedRequisitionContent id={id} patientId={currentPatient} patientName={patientName} title={title} />
    </RequisitionOpening>
    : <RelatedSupplyContent key={id + type} id={id} type={type} patientId={currentPatient} patientName={patientName} title={title} />;
}

function RecordIdentity({ code, title, patient, author, createdAt, status }: {
  code: string | null; title?: string; patient?: string; author?: string | null; createdAt: string; status: string;
}) {
  return <section>
    <h3>Identificação do registro</h3>
    {code && code !== title ? <p className="hca-related-record-code">{code}</p> : null}
    <dl className="hca-related-record-identity">
      <div><dt>Paciente</dt><dd>{patient ?? "Identificação indisponível"}</dd></div>
      <div><dt>Registrado por</dt><dd>{author ?? "Nome histórico não preservado"}</dd></div>
      <div><dt>Data</dt><dd><time dateTime={createdAt}>{formatBrazilDate(createdAt)}</time></dd></div>
      <div><dt>Situação</dt><dd>{status}</dd></div>
    </dl>
  </section>;
}

function RelatedSupplyContent({ id, type, patientId, patientName, title }: {
  id: string; type: SupplyType; patientId?: string; patientName?: string; title?: string;
}) {
  const decode = useCallback((value: unknown) => parseRelatedSupplyRead(value, id, type, patientId), [id, type, patientId]);
  const read = useScopedRead(`/api/documents/${id}`, patientId, decode);
  useOperationActivity(read.loading, { title: "Consultando a ficha relacionada" });
  const data = !read.loading && !read.error ? read.data?.data : null;
  const pending = type === "COM" && data?.payload ? pendingPurchaseItems(data.payload, data.workflow_data) : [];
  const archive = activeDocumentArchive(data?.workflow_data?.documentArchive);
  return <div className="hca-material-sheet-body hca-related-record" aria-busy={read.loading}>
    {!read.loading && read.error ? <Notice error>{read.error}</Notice> : data ? <>
      <RecordIdentity code={data.code ?? data.protocol ?? null} title={title} createdAt={data.created_at}
        patient={documentPatientName(data.canonical_snapshot ?? {}, patientName ?? "Identificação indisponível")}
        author={documentIssuerName(data.canonical_snapshot ?? {})} status={archive ? documentArchiveLabel(archive) : documentStatusLabel(data.status)} />
      <section>
        <h3>{type === "COM" ? "Aquisição dos materiais" : type === "ENT" ? "Quantidades da movimentação" : "Materiais do registro"}</h3>
        <div className="hca-related-materials">
          {data.lines.map(line => <SupplyLineSummary key={line.id} line={line} type={type} status={data.status} declarationOnly={Boolean(data.transfer && data.transfer.state !== "dispatched")} />)}
          {!data.lines.length && !pending.length ? <p>Nenhum material neste registro.</p> : null}
        </div>
      </section>
      {pending.length ? <section><h3>Materiais com cadastro pendente</h3>
        <ul className="hca-related-materials">{pending.map(item => <li key={item.id}>
          <div className="hca-related-material-title"><strong>{item.name}</strong><Pill tone="warning">Cadastro pendente</Pill></div>
          <p>{formatQuantity(item.quantity, item.unit)}</p>
          {item.details ? <p className="whitespace-pre-wrap">{item.details}</p> : null}
        </li>)}</ul>
      </section> : null}
    </> : null}
    <ActionButton compact variant="quiet" className="hca-related-refresh" aria-disabled={read.loading}
      onClick={() => { if (!read.loading) read.refresh(); }}><Icon name="refresh" />Atualizar consulta</ActionButton>
  </div>;
}
function RelatedRequisitionContent({ id, patientId, patientName, title }: {
  id: string; patientId?: string; patientName?: string; title?: string;
}) {
  const decode = useCallback((value: unknown) => parseRelatedRequisitionRead(value, id, patientId), [id, patientId]);
  const read = useScopedRead(`/api/requisitions/${id}`, patientId, decode);
  useOperationActivity(read.loading, { title: "Consultando a ficha relacionada" });
  const data = !read.loading && !read.error ? read.data?.data : null;
  const archive = activeDocumentArchive(data?.documentArchive);
  return (
    <div className="hca-material-sheet-body hca-related-record" aria-busy={read.loading}>
      {!read.loading && read.error ? <>
        <Notice error>{read.error}</Notice><ActionButton onClick={read.refresh}>Tentar novamente</ActionButton>
      </> : data ? <>
        <RequisitionDisplay key={id} id={id} reference={data.progress ?? undefined} />
        <RecordIdentity code={data.code ?? data.protocol} title={title} createdAt={data.created_at}
          patient={data.recipient_name_snapshot ?? patientName} author={data.requester_name_snapshot}
          status={archive ? documentArchiveLabel(archive) : documentStatusLabel(data.status)} />
        <section><h3>Materiais do registro</h3>
          <ul className="hca-related-materials">
            {data.requisition_items.map(line => <li key={line.id}>
              <div className="hca-related-material-title">
                <strong>{line.product_name_snapshot ?? line.custom_name ?? "Material"}</strong>
                {line.urgent ? <Pill tone="danger">Urgente</Pill> : null}
              </div>
              <dl className="hca-related-record-identity"><div><dt>Estoque da equipe informado</dt>
                <dd>{formatStockObservation(line.current_stock, line.stock_observation ?? undefined, line.unit_snapshot ?? undefined)}</dd>
              </div><div><dt>Referência da contagem</dt>
                <dd>{formatStockObservationTime(line.stock_observation_at, line.stock_observation_time_source ?? "legacy_unknown")}</dd>
              </div></dl>
            </li>)}
          </ul>
        </section>
      </> : null}
    </div>
  );
}
