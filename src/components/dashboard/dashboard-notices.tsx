"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { useInbox } from "@/lib/notifications/use-inbox";
import { documentEventLabel } from "@/lib/notifications/event-labels";
import { ActionButton } from "@/components/ui/controls";
import { Notice } from "@/components/workspace";
import { Icon } from "@/components/ui/primitives";
import { ModelSectionHead } from "@/components/ui/model-section";
import { formatBrazilDate } from "@/lib/receipt";
import { InboxNoticeDetails } from "@/components/notifications/inbox-notice-details";

export function DashboardNotices({ patientId, patientName }: { patientId: string; patientName: string }) {
  const inbox = useInbox({ patientId, page: 1, pageSize: 3, surface: "center" });
  const [selected, setSelected] = useState<{ patientId: string; noticeId: string } | null>(null);
  const noticeTriggerRef = useRef<HTMLButtonElement>(null);
  return <section className="card notices-card hca-dashboard-notices">
    <ModelSectionHead title="Avisos" icon="bell" action={<Link className="btn btn-ghost" href="/notificacoes" prefetch={false}>Ver todos<Icon name="arrow" /></Link>} />
    {inbox.loading ? <p className="card-body" role="status">Consultando avisos…</p> : inbox.error ? <Notice error>{inbox.error}<ActionButton onClick={inbox.refresh}>Tentar novamente</ActionButton></Notice> : inbox.data?.data.length ? <div>
      {inbox.data.data.map(row => <button type="button" className="av-notification" key={row.id} onClick={event => {
        noticeTriggerRef.current = event.currentTarget;
        setSelected({ patientId, noticeId: row.id });
      }}>
        <span className="notice-icon"><Icon name="bell" width={17} height={17} /></span>
        <span>
          <strong>{documentEventLabel(row.event_key ?? row.document_events?.action)}</strong>
          <span>{row.reference_code ?? "Atualização do paciente"}</span>
          <small>{formatBrazilDate(row.created_at)}</small>
        </span>
        <Icon name="chevron" width={16} height={16} />
      </button>)}
    </div> : <p className="card-body">Nenhum aviso disponível neste paciente.</p>}
    {selected?.patientId === patientId ? <InboxNoticeDetails key={selected.noticeId} patientId={patientId} patientName={patientName}
      noticeId={selected.noticeId} onClose={() => setSelected(null)} onUnavailable={inbox.invalidate} finalFocus={noticeTriggerRef} /> : null}
  </section>;
}
