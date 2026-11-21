"use client";
import Link from "next/link";
import { useInbox } from "@/lib/notifications/use-inbox";
import { notificationHref } from "@/lib/notifications/navigation";
import { documentEventLabel } from "@/lib/notifications/event-labels";
import { ActionButton } from "@/components/ui/controls";
import { Notice } from "@/components/workspace";
import { Icon } from "@/components/ui/primitives";
import { ModelSectionHead } from "@/components/ui/model-section";
import { formatBrazilDate } from "@/lib/receipt";
export function DashboardNotices({ patientId }: { patientId: string ;}) {
  const inbox = useInbox({ patientId, page: 1, pageSize: 3, surface: "center" });
  return <section className="card notices-card hca-dashboard-notices"><ModelSectionHead title="Avisos" icon="bell" action={<Link className="btn btn-ghost" href="/notificacoes" prefetch={false}>Ver todos<Icon name="arrow" /></Link>} />{inbox.loading ? <p className="card-body" role="status">Consultando avisos…</p> : inbox.error ? <Notice error>{inbox.error}<ActionButton onClick={inbox.refresh}>Tentar novamente</ActionButton></Notice> : inbox.data?.data.length ? <div>{inbox.data.data.map(row => <Link className="av-notification" key={row.id} href={notificationHref(row)} prefetch={false}><span className="notice-icon"><Icon name="bell" width={17} height={17} /></span><span><strong>{documentEventLabel(row.document_events?.action ?? row.event_key)}</strong><span>{row.operational_documents?.code ?? "Atualização do paciente"}</span><small>{formatBrazilDate(row.created_at)}</small></span><Icon name="chevron" width={16} height={16} /></Link>)}</div> : <p className="card-body">Nenhum aviso disponível neste paciente.</p>}</section>;
}
