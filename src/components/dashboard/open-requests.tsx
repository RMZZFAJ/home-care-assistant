"use client";
import Link from "next/link";
import { useCallback } from "react";
import { ActionButton } from "@/components/ui/controls";
import { Notice } from "@/components/workspace";
import { DocumentRow } from "@/components/documents/document-history";
import { useScopedRead } from "@/lib/use-scoped-read";
import { useLiveRevision } from "@/lib/use-live-revision";
import { parseDocumentListRead } from "@/lib/validation/document-list";
export function OpenRequests({ patientId }: { patientId: string ;}) {
  const revision = useLiveRevision();
  const decode = useCallback((raw: unknown) => parseDocumentListRead(raw, { careRecipientId: patientId, page: 1, pageSize: 3, search: "", type: "REQ", status: "open", from: "", to: "" }), [patientId]);
  const read = useScopedRead("/api/documents?" + new URLSearchParams({ careRecipientId: patientId, type: "REQ", status: "open", page: "1", pageSize: "3" }), String(revision), decode);
  return <section className="ui-card hca-home-requests"><div className="hca-section-heading"><h2>Requisições em aberto</h2><Link href="/historico?type=REQ&status=open" prefetch={false}>Ver todas</Link></div>{read.loading ? <p role="status">Consultando requisições…</p> : read.error ? <Notice error>{read.error}<ActionButton onClick={read.refresh}>Tentar novamente</ActionButton></Notice> : read.data?.data.length ? <>{read.data.data.map(row => <DocumentRow key={row.id} row={row} />)}<p className="hca-field-help">{read.data.total} requisição(ões) em aberto neste paciente.</p></> : <p>Nenhuma requisição em aberto neste contexto.</p>}</section>;
}
