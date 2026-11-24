"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { useRouter } from "next/navigation";
import { ActionButton, Pill } from "@/components/ui/controls";
import { Drawer } from "@/components/ui/overlays";
import { Icon } from "@/components/ui/icon";
import { api, ApiError } from "@/lib/client/api";
import { documentEventLabel } from "@/lib/notifications/event-labels";
import { parseInboxNotice } from "@/lib/notifications/inbox";
import { inboxNoticeIcon, inboxTaskLabels } from "@/lib/notifications/inbox-presentation";
import { notificationHref, notificationTargetLabel } from "@/lib/notifications/navigation";
import { formatBrazilDate } from "@/lib/receipt";
import { useLiveRevision } from "@/lib/use-live-revision";
import { useScopedRead } from "@/lib/use-scoped-read";

const unavailable = (status?: number) => status === 401 || status === 403 || status === 404 || status === 409;

export function InboxNoticeDetails({ patientId, patientName, noticeId, onClose, onUnavailable, finalFocus, markOnOpen = false }: {
  patientId: string;
  patientName?: string;
  noticeId: string;
  onClose: () => void;
  onUnavailable: () => void;
  finalFocus?: RefObject<HTMLButtonElement | null>;
  markOnOpen?: boolean;
}) {
  const router = useRouter();
  const url = "/api/notifications?" + new URLSearchParams({ careRecipientId: patientId, noticeId });
  const decode = useCallback((value: unknown) => parseInboxNotice(value, patientId, noticeId), [patientId, noticeId]);
  const revision = useLiveRevision();
  const detail = useScopedRead(url, String(revision), decode);
  const navigationRef = useRef<AbortController | null>(null);
  const [opening, setOpening] = useState(false);
  const [openingError, setOpeningError] = useState<{ denied: boolean; message: string } | null>(null);
  const denied = unavailable(detail.errorStatus) || openingError?.denied === true;
  const row = denied || detail.loading || detail.error ? null : detail.data;

  useEffect(() => () => navigationRef.current?.abort(), []);
  useEffect(() => { if (denied) onUnavailable(); }, [denied, onUnavailable]);

  const openDestination = async () => {
    if (navigationRef.current) return;
    const controller = new AbortController();
    navigationRef.current = controller;
    setOpening(true);
    setOpeningError(null);
    try {
      const current = decode(await api(url, undefined, controller.signal));
      if (markOnOpen && !current.seen_at)
        await api("/api/notifications", { id: noticeId }, controller.signal);
      if (!controller.signal.aborted) {
        if (markOnOpen) onUnavailable();
        router.push(notificationHref(current));
        onClose();
      }
    } catch (reason) {
      if (!controller.signal.aborted) setOpeningError({
        denied: reason instanceof ApiError && unavailable(reason.status),
        message: "Não foi possível confirmar a abertura do aviso. Tente novamente.",
      });
    } finally {
      navigationRef.current = null;
      if (!controller.signal.aborted) setOpening(false);
    }
  };

  return <Drawer
    open onClose={onClose} finalFocus={finalFocus} headingIcon={row ? inboxNoticeIcon(row) : "bell"}
    title={denied ? "Aviso indisponível" : row?.reference_code ?? "Aviso"}
    kicker={row && patientName ? `Avisos · ${patientName}` : undefined}
    footer={<>
      <ActionButton onClick={onClose}>{denied ? "Voltar aos avisos" : "Fechar"}</ActionButton>
      {detail.error && !denied ? <ActionButton onClick={detail.refresh}>Consultar novamente</ActionButton> : null}
      {row ? <ActionButton variant="primary" disabled={opening} onClick={() => { void openDestination(); }}>{notificationTargetLabel(row)}</ActionButton> : null}
    </>}
  >
    {denied ? <p role="alert">Este aviso não está disponível no vínculo selecionado.</p> : null}
    {!denied && detail.loading ? <p role="status">Consultando aviso…</p> : null}
    {!denied && (openingError?.message || detail.error) ? <p role="alert">{openingError?.message ?? detail.error}</p> : null}
    {row ? <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <Pill tone={row.seen_at ? "neutral" : "info"}>{row.seen_at ? "Vista no aplicativo" : "Não vista"}</Pill>
        <time dateTime={row.created_at}>{formatBrazilDate(row.created_at)}</time>
      </div>
      <h3 className="font-semibold">{documentEventLabel(row.event_key ?? row.document_events?.action)}</h3>
      {row.document_events?.actorName ? <p className="flex items-center gap-2"><Icon name="users" width={16} height={16} />{row.document_events.actorName}</p> : null}
      {row.task ? <section aria-label="Ação na ficha" className="mt-3 grid gap-2 rounded-xl border border-(--hca-line) p-3">
        <span className="flex flex-wrap items-center justify-between gap-2"><strong>{inboxTaskLabels[row.task]}</strong><Pill tone="warning">Pendente</Pill></span>
        <p className="text-sm">{row.seen_at ? "Você já viu o aviso. A ação continua pendente na ficha." : "Abra a ficha para registrar a ação."}</p>
      </section> : null}
    </div> : null}
  </Drawer>;
}
