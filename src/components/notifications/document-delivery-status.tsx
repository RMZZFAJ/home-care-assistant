"use client";

import { useEffect, useState } from "react";
import { api, buttonClass, Notice } from "@/components/workspace";
import {
  deliveryErrorLabels,
  deliveryLabels,
  recipientGroupLabels,
  type DeliveryStatus,
} from "@/lib/notifications/presentation";
import { formatBrazilDate } from "@/lib/receipt";
import { useLiveRevision } from "@/lib/use-live-revision";

export function DocumentDeliveryStatus({
  id,
  version = 0,
}: {
  id: string;
  version?: number;
}) {
  const [rows, setRows] = useState<DeliveryStatus[] | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const revision = useLiveRevision();
  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      if (document.hidden || controller.signal.aborted) return;
      try {
        const result = await api<{ data: DeliveryStatus[] }>(
          "/api/documents/" + id + "/notifications",
          undefined,
          controller.signal,
        );
        if (controller.signal.aborted) return;
        setRows(result.data);
        setError("");
      } catch (reason) {
        if (!controller.signal.aborted)
          setError(
            reason instanceof Error
              ? reason.message
              : "Não foi possível consultar os envios.",
          );
      }
    };
    void load();
    // WorkspaceSync recovers missed durable revisions every 30s and on reconnect.
    window.addEventListener("focus", load);
    document.addEventListener("visibilitychange", load);
    return () => {
      controller.abort();
      window.removeEventListener("focus", load);
      document.removeEventListener("visibilitychange", load);
    };
  }, [id, version, attempt, revision]);
  return (
    <section className="ui-card" aria-label="Notificações da ficha">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold">Notificações da ficha</h2>
        <button
          type="button"
          className={buttonClass}
          onClick={() => setAttempt((value) => value + 1)}
        >
          Atualizar envios
        </button>
      </div>
      <p className="mt-2 text-xs leading-5 text-(--muted)">
        O documento já está salvo. Envio ao provedor, entrega, leitura e ciência
        no aplicativo são estados independentes.
      </p>
      {error ? (
        <Notice error>{error}</Notice>
      ) : rows === null ? (
        <p role="status" className="mt-3 text-sm">
          Consultando notificações…
        </p>
      ) : rows.length ? (
        <ul className="mt-4 space-y-3">
          {rows.map((row) => (
            <li
              key={row.id}
              className="rounded-lg border border-(--line) p-3 text-sm"
            >
              <p>
                {recipientGroupLabels[row.recipient_group] ?? "Responsável"} ·{" "}
                {row.recipient_label} ·{" "}
                {row.channel === "internal"
                  ? "Aplicativo"
                  : row.channel === "whatsapp"
                    ? "WhatsApp"
                    : "E-mail"}
              </p>
              <p className="mt-1 font-semibold">
                {row.channel === "internal"
                  ? "Disponível no aplicativo"
                  : (deliveryLabels[row.state] ??
                    "Aguardando atualização")}{" "}
                · {row.attempts} tentativa(s)
              </p>
              {row.attempted_at ? (
                <p className="mt-1 text-xs text-(--muted)">
                  {formatBrazilDate(row.attempted_at)}
                </p>
              ) : null}
              {row.error_code ? (
                <p className="mt-2">
                  {deliveryErrorLabels[row.error_code] ??
                    deliveryErrorLabels.PROCESSING_FAILED}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-(--muted)">
          Nenhum envio autorizado para esta ficha. A gravação do documento está
          confirmada.
        </p>
      )}
    </section>
  );
}
