"use client";
import Link from "next/link";
import { useCallback } from "react";
import { ActionButton } from "@/components/ui/controls";
import { Notice } from "@/components/workspace";
import { Icon, StatusBadge } from "@/components/ui/primitives";
import { ModelSectionHead } from "@/components/ui/model-section";
import { RequisitionScienceBadge } from "@/components/requisitions/requisition-science-badge";
import { useScopedRead } from "@/lib/use-scoped-read";
import { useLiveRevision } from "@/lib/use-live-revision";
import { parseDocumentListRead } from "@/lib/validation/document-list";
export function OpenRequests({ patientId }: { patientId: string ;}) {
  const revision = useLiveRevision();
  const decode = useCallback((raw: unknown) => parseDocumentListRead(raw, { careRecipientId: patientId, page: 1, pageSize: 4, search: "", type: "REQ", status: "open", from: "", to: "" }), [patientId]);
  const read = useScopedRead("/api/documents?" + new URLSearchParams({ careRecipientId: patientId, type: "REQ", status: "open", page: "1", pageSize: "4" }), String(revision), decode);
  return <section className="card request-overview hca-home-requests"><ModelSectionHead title="Requisições em aberto" icon="file" action={<Link className="btn btn-ghost" href="/historico?type=REQ&status=open" prefetch={false}>Ver todas<Icon name="arrow" /></Link>} />{read.loading ? <p className="card-body" role="status">Consultando requisições…</p> : read.error ? <Notice error>{read.error}<ActionButton onClick={read.refresh}>Tentar novamente</ActionButton></Notice> : read.data?.data.length ? <div>{read.data.data.map(row => <Link className="request-progress-row" key={row.id} href={"/documentos/" + row.id} prefetch={false}>
    <span className="request-progress-heading"><strong>{row.code ?? "Requisição"}</strong><span>{row.fulfillment ? `${row.fulfillment.fulfilled} de ${row.fulfillment.total} itens atendidos` : "Atendimento a consultar"}</span><Icon name="chevron" width={16} height={16} /></span>
    {row.fulfillment ? <span className="progress-track" role="progressbar" aria-label={"Itens atendidos de " + row.code} aria-valuemin={0} aria-valuemax={row.fulfillment.total || 1} aria-valuenow={row.fulfillment.fulfilled}><span className="progress-fill" style={{width: `${row.fulfillment.total ? row.fulfillment.fulfilled / row.fulfillment.total * 100 : 0}%`}} /></span> : null}
    <span className="request-progress-foot"><StatusBadge status={row.requisitionState?.serviceStatus ?? row.status} />{row.requisitionState ? <RequisitionScienceBadge state={row.requisitionState.scienceState} compact /> : null}</span>
  </Link>)}</div> : <p className="card-body">Nenhuma requisição em aberto neste paciente.</p>}</section>;
}
