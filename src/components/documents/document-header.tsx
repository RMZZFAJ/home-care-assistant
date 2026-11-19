"use client";
import { createContext, use, useEffect, useImperativeHandle, useRef, useState, type ComponentProps, type MouseEvent, type ReactNode, type Ref } from "react";
import { Menu } from "@base-ui/react/menu";
import Link from "next/link";
import { Dialog } from "@/components/ui/overlays";
import { StatusBadge, Icon, type IconName } from "@/components/ui/primitives";
import { ActionButton, Pill } from "@/components/ui/controls";
import { MenuPopup } from "@/components/ui/floating";
import { DocumentActions } from "./document-actions";
import { DocumentShareDialog, documentShareUrl } from "./document-share-dialog";
import { formatBrazilDate } from "@/lib/receipt";
import { documentLabels, type DocumentType } from "@/types/documents";

export const DocumentMoreActionContext = createContext<() => void>(() => {});
export function DocumentMoreButton({ children, icon = "edit", danger = false, ...props }: ComponentProps<"button"> & { icon?: IconName; danger?: boolean }) {
  const markAction = use(DocumentMoreActionContext);
  const { onClick, ...buttonProps } = props;
  // A menu row owns its appearance; toolbar button classes do not carry over.
  buttonProps.className = undefined;
  // Menu types its default div; this render is a native button.
  const activate: NonNullable<ComponentProps<typeof Menu.Item>["onClick"]> = event => { markAction(); onClick?.(event as unknown as MouseEvent<HTMLButtonElement>); };
  return <Menu.Item onClick={activate} render={<button type="button" {...buttonProps} />} nativeButton disabled={props.disabled} className={"hca-menu-item" + (danger ? " doc-menu-danger" : "")}><Icon name={icon} width={17} height={17} />{children}</Menu.Item>;
}
export function DocumentMoreLink({ children, icon = "link", ...props }: ComponentProps<typeof Link> & { icon?: IconName }) {
  const markAction = use(DocumentMoreActionContext);
  const { onClick, ...linkProps } = props;
  linkProps.className = undefined;
  // The custom render is the link whose event the caller receives.
  const activate: NonNullable<ComponentProps<typeof Menu.Item>["onClick"]> = event => { markAction(); onClick?.(event as unknown as MouseEvent<HTMLAnchorElement>); };
  return <Menu.Item onClick={activate} render={<Link {...linkProps} />} className="hca-menu-item"><Icon name={icon} width={17} height={17} />{children}</Menu.Item>;
}

export function DocumentHeader({
  id,
  type,
  typeLabel,
  code,
  status,
  statusLabel,
  protocol,
  version,
  createdAt,
  dateLabel,
  dateHeading = "Registro da ficha",
  patientName,
  children,
  observedRef,
  unissuedLabel,
  showFiles = true,
  nextStep,
  actions,
  secondaryActions,
  moreTriggerRef,
  metadata = [],
  milestones,
  badges,
  headingLevel = 2,
  contextLabel,
  fileActionRef,
  onRefresh,
  refreshDisabled = false,
  refreshing = false,
  refreshButtonRef,
}: {
  id: string;
  type: DocumentType;
  code: string;
  status: string;
  statusLabel?: string;
  protocol: string | null;
  version: number;
  createdAt: string | null;
  typeLabel?: string;
  dateLabel?: string;
  dateHeading?: string;
  patientName?: string;
  children?: ReactNode;
  observedRef?: Ref<HTMLElement>;
  unissuedLabel?: string;
  showFiles?: boolean;
  nextStep?: ReactNode;
  actions?: ReactNode;
  secondaryActions?: ReactNode;
  moreTriggerRef?: Ref<HTMLButtonElement>;
  metadata?: { label: string; value: ReactNode; }[];
  milestones?: ReactNode;
  badges?: ReactNode;
  headingLevel?: 1 | 2;
  contextLabel?: string;
  fileActionRef?: Ref<HTMLDivElement>;
  onRefresh?: () => void;
  refreshDisabled?: boolean;
  refreshing?: boolean;
  refreshButtonRef?: Ref<HTMLButtonElement>;
}) {
  const Heading = headingLevel === 1 ? "h1" : "h2";
  const [copyMessage, setCopyMessage] = useState("");
  const [moreOpen, setMoreOpen] = useState(false);
  const [identificationOpen, setIdentificationOpen] = useState(false);
  const [sharingOpen, setSharingOpen] = useState(false);
  useEffect(() => {
    if (!copyMessage || sharingOpen) return;
    const timer = setTimeout(() => setCopyMessage(""), 6000);
    return () => clearTimeout(timer);
  }, [copyMessage, sharingOpen]);
  const [compact, setCompact] = useState(false);
  const markerRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;
    const observer = new IntersectionObserver(([entry]) => setCompact(!entry.isIntersecting && entry.boundingClientRect.top < 115), { rootMargin: "-115px 0px 0px", threshold: 0 });
    observer.observe(marker);
    return () => observer.disconnect();
  }, [id]);
  const actionClosedRef = useRef(false);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  useImperativeHandle(moreTriggerRef, () => moreButtonRef.current!);
  const facts = [
    ...metadata.slice(0, 1),
    { label: dateHeading, value: dateLabel ?? (createdAt ? new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short" }).format(new Date(createdAt)) : formatBrazilDate(createdAt)) },
    ...metadata.slice(1),
    ...(patientName ? [{ label: "Paciente", value: patientName }] : []),
  ];
  const moreMenu = (
    <Menu.Root open={moreOpen} onOpenChange={open => { if (open) actionClosedRef.current = false; setMoreOpen(open); }}>
      <Menu.Trigger render={<ActionButton ref={moreButtonRef} className="btn-icon" aria-label="Mais opções da ficha" title="Mais ações"><Icon name="more" /></ActionButton>} />
      <MenuPopup sideOffset={8} className="hca-document-more-menu" aria-label="Ações da ficha" finalFocus={() => !actionClosedRef.current}>
        <div className="hca-document-more-title">Ações da ficha</div>
        <Menu.Item className="hca-menu-item" onClick={() => {
          const openShare = () => { setCopyMessage(""); setSharingOpen(true); };
          if (!navigator.clipboard?.writeText) { actionClosedRef.current = true; openShare(); return; }
          void navigator.clipboard.writeText(documentShareUrl(id)).then(() => setCopyMessage("Link da ficha copiado."), openShare);
        }}><Icon name="link" width={17} height={17} />Copiar link da ficha</Menu.Item>
        <Menu.Item className="hca-menu-item" onClick={() => {
          actionClosedRef.current = true; setCopyMessage(""); setSharingOpen(true);
        }}><Icon name="external" width={17} height={17} />Compartilhar link da ficha</Menu.Item>
        <Menu.Item className="hca-menu-item" onClick={() => {
          if (!navigator.clipboard?.writeText) { setCopyMessage("Não foi possível copiar. Selecione o código no cabeçalho."); return; }
          void navigator.clipboard.writeText(code).then(() => setCopyMessage("Referência copiada."), () => setCopyMessage("Não foi possível copiar. Selecione o código no cabeçalho."));
        }}><Icon name="copy" width={17} height={17} />Copiar referência</Menu.Item>
        <Menu.Item className="hca-menu-item" onClick={() => { actionClosedRef.current = true; setIdentificationOpen(true); }}><Icon name="shield" width={17} height={17} />Protocolo e identificação</Menu.Item>
        <Menu.Item className="hca-menu-item" render={<Link href={"/verificar?returnTo=" + encodeURIComponent("/fichas/" + id)} />}><Icon name="external" width={17} height={17} />Validação pública de documento</Menu.Item>
        <Menu.Item className="hca-menu-item" onClick={() => { const url = new URL(window.location.href); url.searchParams.set("documentTab", "history"); window.history.replaceState(null, "", url.pathname + url.search + url.hash); actionClosedRef.current = true; }}><Icon name="history" />Identificação e registros preservados</Menu.Item>
        {secondaryActions ? <><Menu.Separator className="hca-menu-separator" /><DocumentMoreActionContext value={() => { actionClosedRef.current = true; }}><Menu.Group>{secondaryActions}</Menu.Group></DocumentMoreActionContext></> : null}
      </MenuPopup>
    </Menu.Root>
  );
  return (
    <>
      <div className="hca-document-compact-slot">{compact ? <div className="hca-document-compact" aria-label="Identificação da ficha durante rolagem"><span className="hca-document-type">{code.startsWith("DEV-") ? "DEV" : type}</span><strong>{code}</strong><StatusBadge status={status} label={statusLabel} /><span className="hca-compact-badges">{badges}</span></div> : null}</div>
      <section
        className="hca-document-header"
        data-type={code.startsWith("DEV-") ? "DEV" : type}
        ref={observedRef}
        aria-label="Resumo da ficha"
      >
        <div className="hca-document-header-more">{moreMenu}</div>
        <div className="hca-document-identity">
          <div className="hca-document-name">
            <span className="hca-document-type">{code.startsWith("DEV-") ? "DEV" : type}</span>
            <div>
              <Heading tabIndex={-1} data-document-heading>
                {code}
              </Heading>
              <p>{typeLabel ?? documentLabels[type]}</p>
            </div>
          </div>
          <div className="hca-document-tags">
            <StatusBadge status={status} label={statusLabel} />
            {badges}
          </div>
        </div>
        <dl className="hca-document-meta">
          {facts.map((fact) => (
            <div key={fact.label}>
              <dt><Icon name={fact.label === "Materiais" ? "box" : fact.label === "Paciente" ? "home" : /Emissão|Registro|Data/.test(fact.label) ? "calendar" : "user"} width={13} height={13} />{fact.label}</dt>
              <dd>{fact.value}</dd>
            </div>
          ))}
        </dl>
        {children ? (
          <div className="hca-document-context">{children}</div>
        ) : null}
        {milestones}
        <span ref={markerRef} className="hca-compact-marker" aria-hidden="true" />
      </section>
      {nextStep}
      <div
        className="hca-document-action-bar"
        role="group"
        aria-label="Ações da ficha"
      >
        <div className="hca-document-action-row">
          {actions}
          <div ref={fileActionRef} className="hca-document-action-slot" />
        </div>
        <div className="hca-document-action-row">
          {onRefresh ? (
            <ActionButton
              ref={refreshButtonRef}
              onClick={() => {
                if (!refreshDisabled) onRefresh();
              }}
              aria-disabled={refreshDisabled}
              aria-busy={refreshing}
              aria-label="Atualizar ficha"
            >
              <Icon name="refresh" className={refreshing ? "motion-safe:animate-spin" : undefined} />
            </ActionButton>
          ) : null}
        </div>
      </div>
      {copyMessage && !sharingOpen ? <div className="hca-copy-toast" role="status"><Icon name={copyMessage.startsWith("Não") ? "alert" : "check"} />{copyMessage}</div> : null}
      {sharingOpen ? <DocumentShareDialog id={id} code={code} patientName={patientName} onClose={() => setSharingOpen(false)} finalFocus={moreButtonRef} /> : null}
      <Dialog open={identificationOpen} onClose={() => setIdentificationOpen(false)} title="Protocolo e identificação" finalFocus={moreButtonRef}>
        {contextLabel ? <Pill>Perfil: {contextLabel}</Pill> : null}
        <dl className="hca-document-identifiers">
          <div><dt>Código</dt><dd>{code}</dd></div>
          <div><dt>Protocolo</dt><dd>{protocol ?? unissuedLabel ?? "Rascunho ainda não emitido"}</dd></div>
          <div><dt>Identificador</dt><dd>{id}</dd></div>
          <div><dt>Revisão técnica</dt><dd>{version}</dd></div>
          <div><dt>Instante do registro</dt><dd>{formatBrazilDate(createdAt)}</dd></div>
        </dl>
      </Dialog>
      {protocol && showFiles ? (
        <DocumentActions id={id} code={code} version={version} />
      ) : null}
    </>
  );
}
