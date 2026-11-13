"use client";
import Link from "next/link";
import { useInbox } from "@/lib/notifications/use-inbox";
import { notificationHref } from "@/lib/notifications/navigation";
import { documentEventLabel } from "@/lib/notifications/event-labels";
import { ActionButton } from "@/components/ui/controls";
import { Notice } from "@/components/workspace";
export function DashboardNotices({ patientId }: { patientId: string ;}) {
  const inbox = useInbox({ patientId, page: 1, pageSize: 3, surface: "center" });
  return <section className="ui-card hca-dashboard-notices"><div className="hca-section-heading"><h2>Avisos</h2><Link href="/notificacoes" prefetch={false}>Ver todos</Link></div>{inbox.loading ? <p role="status">Consultando avisos…</p> : inbox.error ? <Notice error>{inbox.error}<ActionButton onClick={inbox.refresh}>Tentar novamente</ActionButton></Notice> : inbox.data?.data.length ? <ul className="hca-home-notices">{inbox.data.data.map(row => <li key={row.id}><Link href={notificationHref(row)} prefetch={false}><strong>{documentEventLabel(row.document_events?.action ?? row.event_key)}</strong><span>{row.operational_documents?.code ?? "Atualização do paciente"}</span></Link></li>)}</ul> : <p>Nenhum aviso disponível neste contexto.</p>}</section>;
}
