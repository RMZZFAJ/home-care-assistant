"use client";

import { useCallback, useEffect, useRef, useState, type ComponentProps } from "react";
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
import "./inbox-notice-details.css";

const unavailable = (status?: number) => status === 401 || status === 403 || status === 404 || status === 409;

export function InboxNoticeDetails({ patientId, patientName, noticeId, onClose, onUnavailable, finalFocus, markOnOpen = false }: {
  patientId: string;
  patientName?: string;
  noticeId: string;
  onClose: () => void;
  onUnavailable: () => void;
  finalFocus?: ComponentProps<typeof Drawer>["finalFocus"];
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
  const eventTitle = row ? documentEventLabel(row.event_key ?? row.document_events?.action) : null;

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
    popupClassName="hca-preference-sheet hca-inbox-notice-sheet" keyboardScrollable
    title={denied ? "Aviso indisponível" : row?.reference_code ?? eventTitle ?? "Aviso"}
    kicker={row && patientName ? `Avisos · ${patientName}` : undefined}
    footer={<>
      <ActionButton onClick={onClose}>{denied ? "Voltar aos avisos" : "Voltar"}</ActionButton>
      {detail.error && !denied ? <ActionButton onClick={detail.refresh}>Consultar novamente</ActionButton> : null}
      {row ? <ActionButton variant="primary" disabled={opening} onClick={() => { void openDestination(); }}>
        {notificationTargetLabel(row)}<Icon name="arrow" width={16} height={16} />
      </ActionButton> : null}
    </>}
  >
    {denied ? <p role="alert">Este aviso não está disponível no vínculo selecionado.</p> : null}
    {!denied && detail.loading ? <p role="status">Consultando aviso…</p> : null}
    {!denied && (openingError?.message || detail.error) ? <p role="alert">{openingError?.message ?? detail.error}</p> : null}
    {row ? <>
      <div className="hca-inbox-notice-detail">
        <div className="hca-inbox-notice-meta">
          <Pill tone={row.seen_at ? "neutral" : "info"}>{row.seen_at ? "Vista no aplicativo" : "Não vista"}</Pill>
          <time dateTime={row.created_at}>{formatBrazilDate(row.created_at)}</time>
        </div>
        {row.reference_code ? <h3>{eventTitle}</h3> : null}
        {row.document_events?.actorName ? <p><Icon name="user" width={16} height={16} />{row.document_events.actorName}</p> : null}
      </div>
      {row.task ? <section aria-label="Ação na ficha" className="ui-card hca-inbox-notice-task">
        <h3>Na ficha</h3>
        <div className="hca-inbox-notice-task-status">
          <span className="hca-inbox-notice-task-icon"><Icon name="clock" width={17} height={17} /></span>
          <div><strong>{inboxTaskLabels[row.task]}</strong><p>Esta ação ainda precisa ser concluída.</p></div>
          <Pill tone="warning">Pendente</Pill>
        </div>
      </section> : null}
      {row.task && row.seen_at ? <p className="hca-inbox-notice-seen"><Icon name="eye" width={16} height={16} />
        Você já viu o aviso. A ação continua pendente na ficha.
      </p> : null}
      {opening ? <p role="status">Conferindo acesso ao destino…</p> : null}
    </> : null}
  </Drawer>;
}
