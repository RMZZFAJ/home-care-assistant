"use client";
import { useLiveRevision } from "@/lib/use-live-revision";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, buttonClass, Notice, Workspace } from "../workspace";
import { formatBrazilDate } from "@/lib/receipt";
import { deliveryLabels } from "@/lib/notifications/presentation";
import { documentEventLabel } from "@/lib/notifications/event-labels";
import {
  notificationHref,
  type NotificationTarget,
} from "@/lib/notifications/navigation";
type Notification = NotificationTarget & {
  id: string;
  seen_at: string | null;
  state: string;
  channel: string;
  created_at: string;
  document_id: string | null;
  requisition_id: string | null;
  operational_documents: { code: string; type: string } | null;
  document_events: { action: string } | null;
};
export function NotificationCenter() {
  return (
    <Workspace title="Central de notificações">
      {(context) => (
        <Center
          key={context.patient?.id ?? "all"}
          patientId={context.patient?.id}
        />
      )}
    </Workspace>
  );
}
function Center({ patientId }: { patientId?: string }) {
  const [rows, setRows] = useState<Notification[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const liveRevision = useLiveRevision();
  const [unread, setUnread] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    api<{ data: Notification[]; total: number }>(
      "/api/notifications?" +
        new URLSearchParams({
          ...(patientId ? { careRecipientId: patientId } : {}),
          page: String(page),
          pageSize: "20",
          unread: String(unread),
        }),
      undefined,
      controller.signal,
    )
      .then((result) => {
        if (!controller.signal.aborted) {
          setRows(result.data);
          setTotal(result.total);
          setError("");
        }
      })
      .catch((reason) => {
        if (!controller.signal.aborted) setError(reason.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [patientId, page, unread, attempt, liveRevision]);
  return (
    <section className="ui-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold">Acompanhamento pessoal</h2>
        <button
          className={buttonClass}
          disabled={loading}
          onClick={() => {
            setLoading(true);
            setAttempt((value) => value + 1);
          }}
        >
          Atualizar
        </button>
      </div>
      <label className="my-4 flex min-h-11 items-center gap-3 text-sm">
        <input
          type="checkbox"
          checked={unread}
          onChange={(event) => {
            setUnread(event.target.checked);
            setPage(1);
            setLoading(true);
          }}
        />
        Somente não vistas
      </label>
      {error ? <Notice error>{error}</Notice> : null}
      {loading ? (
        <p className="my-3 text-sm" role="status">
          Consultando notificações…
        </p>
      ) : null}
      <ul className="space-y-3">
        {rows.map((row) => (
          <li
            key={row.id}
            className={
              "rounded-lg border p-4 " +
              (row.seen_at
                ? "border-(--line)"
                : "border-teal-600 bg-teal-50/30")
            }
          >
            <p className="text-sm font-semibold">
              {row.operational_documents?.code ?? "Atualização operacional"}
            </p>
            <p className="mt-1 text-sm">
              {documentEventLabel(row.event_key ?? row.document_events?.action)}
            </p>
            <p className="mt-1 text-xs text-(--muted)">
              {formatBrazilDate(row.created_at)} ·{" "}
              {row.channel === "internal"
                ? "Disponível no aplicativo"
                : (row.channel === "whatsapp" ? "WhatsApp" : "E-mail") +
                  " · " +
                  (deliveryLabels[row.state] ?? "Aguardando atualização")}
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              {row.document_id ||
              row.requisition_id ||
              row.reminder_id ||
              row.consumption_report_id ||
              row.alert_event_id ? (
                <Link className={buttonClass} href={notificationHref(row)}>
                  Abrir documento
                </Link>
              ) : null}
              {!row.seen_at ? (
                <button
                  className={buttonClass}
                  onClick={async () => {
                    try {
                      await api("/api/notifications", { id: row.id });
                      setAttempt((value) => value + 1);
                    } catch (reason) {
                      setError(
                        reason instanceof Error
                          ? reason.message
                          : "Não foi possível marcar.",
                      );
                    }
                  }}
                >
                  Marcar como vista
                </button>
              ) : (
                <span className="ui-badge ui-badge-neutral">
                  Vista no aplicativo
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
      {!loading && !rows.length ? (
        <p className="my-4 text-sm text-(--muted)">
          Nenhuma notificação neste filtro.
        </p>
      ) : null}
      {total > 20 ? (
        <nav
          className="mt-5 flex items-center justify-between gap-3"
          aria-label="Páginas das notificações"
        >
          <button
            className={buttonClass}
            disabled={page === 1 || loading}
            onClick={() => {
              setPage((value) => value - 1);
              setLoading(true);
            }}
          >
            Anterior
          </button>
          <span className="text-sm">
            {page} / {Math.ceil(total / 20)}
          </span>
          <button
            className={buttonClass}
            disabled={page * 20 >= total || loading}
            onClick={() => {
              setPage((value) => value + 1);
              setLoading(true);
            }}
          >
            Próxima
          </button>
        </nav>
      ) : null}
      <p className="mt-4 text-xs leading-5 text-(--muted)">
        Vista no aplicativo é independente da entrega ou leitura confirmada pelo
        provedor externo.
      </p>
    </section>
  );
}
