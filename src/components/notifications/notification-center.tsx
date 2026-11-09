"use client";
import { CheckboxField, Pill } from "@/components/ui/controls";
import Link from "next/link";
import { useState } from "react";
import { api, buttonClass, Notice, Workspace } from "../workspace";
import { formatBrazilDate } from "@/lib/receipt";
import { deliveryLabels } from "@/lib/notifications/presentation";
import { documentEventLabel } from "@/lib/notifications/event-labels";

import { notificationHref,notificationTargetLabel } from "@/lib/notifications/navigation";
import { useInbox } from "@/lib/notifications/use-inbox";
import { PushArrival } from "./push-arrival";
import { DeliveryImpact } from "./delivery-impact";
export function NotificationCenter() {
  return (
    <Workspace title="Central de notificações">
      {(context) => (
        <><PushArrival />{context.activeContext?.mode === "patient" && context.patient ? <DeliveryImpact key={context.patient.id} patientId={context.patient.id} /> : null}<Center
          key={`${context.activeContext?.mode}:${context.patient?.id ?? "none"}`}
          patientId={context.activeContext?.mode === "patient" ? context.patient?.id : undefined}
        /></>
      )}
    </Workspace>
  );
}
function Center({ patientId }: { patientId?: string }) {
  const [page, setPage] = useState(1);
  const [writeError, setWriteError] = useState("");
  const [unread, setUnread] = useState(false);
  const inbox = useInbox({ patientId, page, unread });
  const rows = inbox.data?.data ?? [], total = inbox.data?.total ?? 0;
  return (
    <section className="ui-card" aria-label="Acompanhamento pessoal">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold">Acompanhamento pessoal</h2>
        <button
          className={buttonClass}
          type="button"
          disabled={inbox.loading || inbox.scopeRequired}
          onClick={inbox.refresh}
        >
          Atualizar
        </button>
      </div>
      <div className="hca-toolbar"><CheckboxField
          checked={unread}
          label="Somente não vistas"
          onChange={controlEvent => { const controlValue = controlEvent.currentTarget.checked;
            setUnread(controlValue === true);
            setPage(1);
           }}
        /></div>
      {inbox.scopeRequired ? <Notice>Selecione um vínculo com paciente em Mudar perfil para consultar suas notificações.</Notice> : null}
      {inbox.error ? <Notice error>{inbox.error} <button type="button" className={buttonClass} onClick={inbox.refresh}>Consultar notificações novamente</button></Notice> : null}
      {writeError ? <Notice error>{writeError}</Notice> : null}
      {inbox.loading ? (
        <p className="my-3 text-sm" role="status">
          Consultando notificações…
        </p>
      ) : null}
      {rows.length > 0 && !inbox.fresh ? <p className="my-3 text-sm text-(--muted)">Última consulta confirmada; aguardando atualização.</p> : null}
      <ul className="hca-notification-list">
        {rows.map((row) => (
          <li
            key={row.id}
            className={
              "hca-notification-row " +
              (row.seen_at
                ? ""
                : "hca-notification-unread")
            }
          >
            <div className="text-sm font-semibold">
              <span>{row.operational_documents?.code ?? "Atualização operacional"}</span>
              {!row.seen_at ? <Pill className="ml-3"  tone="neutral">Não vista</Pill> : null}
            </div>
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
                  {notificationTargetLabel(row)}
                </Link>
              ) : null}
              {!row.seen_at ? (
                <button
                  className={buttonClass}
                  type="button"
                  onClick={async () => {
                    setWriteError("");
                    try {
                      await api("/api/notifications", { id: row.id });
                      inbox.refresh();
                    } catch (reason) {
                      setWriteError(
                        reason instanceof Error
                          ? reason.message
                          : "Não foi possível confirmar a marcação como vista. Consulte novamente para conferir.",
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
      {inbox.fresh && !rows.length ? (
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
            type="button"
            disabled={page === 1 || inbox.loading}
            onClick={() => {
              setPage((value) => value - 1);
            }}
          >
            Anterior
          </button>
          <span className="text-sm">
            {page} / {Math.ceil(total / 20)}
          </span>
          <button
            className={buttonClass}
            type="button"
            disabled={page * 20 >= total || inbox.loading}
            onClick={() => {
              setPage((value) => value + 1);
            }}
          >
            Próxima
          </button>
        </nav>
      ) : null}
      <p className="mt-4 text-xs leading-5 text-(--muted)">
        Vista no aplicativo é independente da entrega ou leitura confirmada pelo
        provedor externo e não registra ciência ou aceite do documento.
      </p>
    </section>
  );
}
