"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Popover } from "@base-ui/react/popover";
import { PopoverPopup } from "@/components/ui/floating";
import { Icon } from "@/components/ui/primitives";
import { documentEventLabel } from "@/lib/notifications/event-labels";
import { formatBrazilDate } from "@/lib/receipt";
import { useInbox } from "@/lib/notifications/use-inbox";
import { InboxNoticeDetails } from "./inbox-notice-details";

export function NotificationBell({ patientId, patientName, disabled = false }: { patientId?: string; patientName?: string; disabled?: boolean }) {
  const inbox = useInbox({ patientId, surface: "bell", pageSize: 8, poll: true, paused: disabled });
  const [open, setOpen] = useState(false);
  const [noticeId, setNoticeId] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const rows = inbox.data?.data ?? [], unread = inbox.data?.unreadCount;
  return (
    <div className="notification-bell">
      <Popover.Root modal="trap-focus" open={open} onOpenChange={setOpen}>
      <Popover.Trigger render={<button className="ui-icon-button"
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-label={
          "Notificações" + (inbox.fresh && unread ? ", " + unread + " não vistas" : "")
        }
        aria-expanded={open}
        aria-controls={open ? "notification-panel" : undefined}
        onClick={event => event.currentTarget.focus()} />}>
        <Icon name="bell" />
        {inbox.fresh && unread ? (
          <span className="notification-dot">{unread > 9 ? "9+" : unread}</span>
        ) : null}
      </Popover.Trigger>
      <PopoverPopup id="notification-panel" positionMethod="fixed" className="hca-notification-surface" aria-label="Notificações" >
        <section
          className="notification-panel"
          aria-label="Notificações recentes"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold">Notificações</h2>
            {inbox.fresh ? <span className="ui-badge ui-badge-pending">{unread} não vistas</span> : null}
            <Popover.Close type="button" className="ui-icon-button" aria-label="Fechar notificações"><Icon name="close" /></Popover.Close>
          </div>
          {inbox.scopeRequired ? <p className="py-5 text-sm">Selecione um vínculo com paciente em Mudar perfil para consultar suas notificações.</p> : null}
          {inbox.paused ? <p role="status">Atualizando vínculo…</p> : null}
          {inbox.loading ? <p role="status">Consultando notificações…</p> : null}
          {inbox.error ? <div><p role="alert">{inbox.error}</p><button type="button" className="notification-all" onClick={inbox.refresh}>Consultar notificações novamente</button></div> : null}
          {rows.length > 0 && !inbox.fresh ? <p className="text-sm text-(--muted)">Última consulta confirmada{inbox.receivedAt ? " em " + formatBrazilDate(inbox.receivedAt) : ""}. Aguardando atualização.</p> : null}
          {inbox.fresh && !rows.length ? (
            <p className="py-5 text-sm text-(--muted)">
              Você está em dia. As próximas atualizações aparecerão aqui.
            </p>
          ) : rows.length ? (
            <ul>
              {rows.slice(0, 8).map((row) => (
                <li
                  key={row.id}
                  className={!row.seen_at ? "notification-unread" : ""}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      setNoticeId(row.id);
                    }}
                  >
                    <strong>
                      {row.reference_code ??
                        "Atualização do paciente"}
                    </strong>
                    <span>
                      {documentEventLabel(
                        row.document_events?.action ?? row.event_key,
                      )}
                    </span>
                    <time dateTime={row.created_at}>{formatBrazilDate(row.created_at)}</time>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <Link
            href={"/notificacoes" + (patientId ? "?careRecipientId=" + patientId : "")}
            tabIndex={0}
            className="notification-all"
            onClick={() => setOpen(false)}
          >
            Consultar histórico completo <Icon name="arrow" width="16" />
          </Link>
        </section>
      </PopoverPopup>
      </Popover.Root>
      {patientId && noticeId && !disabled ? <InboxNoticeDetails key={noticeId} patientId={patientId} patientName={patientName} noticeId={noticeId} onClose={() => setNoticeId(null)} onUnavailable={inbox.invalidate} finalFocus={triggerRef} markOnOpen /> : null}
    </div>
  );
}
