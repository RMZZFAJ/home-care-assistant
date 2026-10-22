"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { api } from "@/components/workspace";
import { Icon } from "@/components/ui/primitives";
import { documentEventLabel } from "@/lib/notifications/event-labels";
import { formatBrazilDate } from "@/lib/receipt";

export type InboxNotification = {
  id: string;
  document_id?: string;
  requisition_id?: string;
  state: string;
  seen_at: string | null;
  created_at: string;
  operational_documents?: { code: string; type: string; status: string } | null;
  document_events?: { action: string } | null;
};
export function NotificationBell({ patientId }: { patientId?: string }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<InboxNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    const load = () => {
      if (!document.hidden)
        void api<{ data: InboxNotification[]; unreadCount: number }>(
          "/api/notifications" +
            (patientId ? "?careRecipientId=" + patientId : ""),
          undefined,
          controller.signal,
        ).then(
          (result) => {
            setRows(result.data);
            setUnread(result.unreadCount);
            setError("");
          },
          () => {
            if (!controller.signal.aborted)
              setError("Não foi possível atualizar as notificações.");
          },
        );
    };
    load();
    const timer = window.setInterval(load, 30_000);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [patientId]);
  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        rootRef.current?.querySelector("button")?.focus();
      }
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  return (
    <div ref={rootRef} className="notification-bell">
      <button
        className="ui-icon-button"
        type="button"
        aria-label={
          "Notificações" + (unread ? ", " + unread + " não lidas" : "")
        }
        aria-expanded={open}
        aria-controls="notification-panel"
        onClick={() => setOpen((current) => !current)}
      >
        <Icon name="bell" />
        {unread ? (
          <span className="notification-dot">{unread > 9 ? "9+" : unread}</span>
        ) : null}
      </button>
      {open ? (
        <section
          id="notification-panel"
          className="header-popover notification-panel"
          aria-label="Notificações recentes"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold">Notificações</h2>
            <span className="ui-badge ui-badge-pending">{unread} novas</span>
          </div>
          {error ? <p role="alert">{error}</p> : null}
          {!rows.length ? (
            <p className="py-5 text-sm text-(--muted)">
              Você está em dia. As próximas atualizações aparecerão aqui.
            </p>
          ) : (
            <ul>
              {rows.slice(0, 8).map((row) => (
                <li
                  key={row.id}
                  className={!row.seen_at ? "notification-unread" : ""}
                >
                  <Link
                    href={
                      row.document_id
                        ? "/fichas/" + row.document_id
                        : row.requisition_id
                          ? "/historico/" + row.requisition_id
                          : "/notificacoes"
                    }
                    onClick={() => {
                      setOpen(false);
                      void api("/api/notifications", { id: row.id }).then(
                        () =>
                          setRows((current) =>
                            current.map((item) =>
                              item.id === row.id
                                ? { ...item, seen_at: new Date().toISOString() }
                                : item,
                            ),
                          ),
                        () =>
                          setError(
                            "Não foi possível marcar a notificação como lida.",
                          ),
                      );
                    }}
                  >
                    <strong>
                      {row.operational_documents?.code ??
                        "Atualização do paciente"}
                    </strong>
                    <span>
                      {documentEventLabel(row.document_events?.action)}
                    </span>
                    <time>{formatBrazilDate(row.created_at)}</time>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/notificacoes"
            className="notification-all"
            onClick={() => setOpen(false)}
          >
            Consultar histórico completo <Icon name="arrow" width="16" />
          </Link>
        </section>
      ) : null}
    </div>
  );
}
