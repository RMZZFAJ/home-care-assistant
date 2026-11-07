"use client";

import Link from "next/link";
import { useState } from "react";
import { Popover, PopoverSurface, PopoverTrigger } from "@fluentui/react-components";
import { api } from "@/components/workspace";
import { Icon } from "@/components/ui/primitives";
import { documentEventLabel } from "@/lib/notifications/event-labels";
import { formatBrazilDate } from "@/lib/receipt";
import { notificationHref } from "@/lib/notifications/navigation";
import { useInbox } from "@/lib/notifications/use-inbox";

export function NotificationBell({ patientId, disabled = false }: { patientId?: string; disabled?: boolean }) {
  const inbox = useInbox({ patientId, surface: "bell", pageSize: 8, poll: true, paused: disabled });
  const [open, setOpen] = useState(false);
  const [writeError, setWriteError] = useState("");
  const rows = inbox.data?.data ?? [], unread = inbox.data?.unreadCount;
  return (
    <div className="notification-bell">
      <Popover open={open} onOpenChange={(_, next) => setOpen(next.open)} trapFocus positioning={{ position: "below", align: "end" }}>
      <PopoverTrigger disableButtonEnhancement>
      <button
        className="ui-icon-button"
        type="button"
        disabled={disabled}
        aria-label={
          "Notificações" + (inbox.fresh && unread ? ", " + unread + " não vistas" : "")
        }
        aria-expanded={open}
        aria-controls="notification-panel"
        onClick={event => event.currentTarget.focus()}
      >
        <Icon name="bell" />
        {inbox.fresh && unread ? (
          <span className="notification-dot">{unread > 9 ? "9+" : unread}</span>
        ) : null}
      </button>
      </PopoverTrigger>
      <PopoverSurface className="hca-notification-surface" aria-label="Notificações" >
        <section
          id="notification-panel"
          className="notification-panel"
          aria-label="Notificações recentes"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold">Notificações</h2>
            {inbox.fresh ? <span className="ui-badge ui-badge-pending">{unread} não vistas</span> : null}
            <button type="button" className="ui-icon-button" aria-label="Fechar notificações" onClick={() => setOpen(false)}><Icon name="close" /></button>
          </div>
          {inbox.scopeRequired ? <p className="py-5 text-sm">Selecione um vínculo com paciente em Mudar perfil para consultar suas notificações.</p> : null}
          {inbox.paused ? <p role="status">Atualizando vínculo…</p> : null}
          {inbox.loading ? <p role="status">Consultando notificações…</p> : null}
          {inbox.error ? <div><p role="alert">{inbox.error}</p><button type="button" className="notification-all" onClick={inbox.refresh}>Consultar notificações novamente</button></div> : null}
          {writeError ? <p role="alert">{writeError}</p> : null}
          {rows.length > 0 && !inbox.fresh ? <p className="text-sm text-(--muted)">Última consulta confirmada; aguardando atualização.</p> : null}
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
                  <Link
                    href={notificationHref(row)}
                    tabIndex={0}
                    onClick={() => {
                      setOpen(false);
                      setWriteError("");
                      void api("/api/notifications", { id: row.id }).then(
                        inbox.refresh,
                        () =>
                          setWriteError(
                            "Não foi possível confirmar a marcação como vista. Consulte novamente para conferir.",
                          ),
                      );
                    }}
                  >
                    <strong>
                      {row.operational_documents?.code ??
                        "Atualização do paciente"}
                    </strong>
                    <span>
                      {documentEventLabel(
                        row.document_events?.action ?? row.event_key,
                      )}
                    </span>
                    <time>{formatBrazilDate(row.created_at)}</time>
                  </Link>
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
      </PopoverSurface>
      </Popover>
    </div>
  );
}
