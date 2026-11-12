"use client";
import { useRef, useState, type ReactNode, type Ref } from "react";
import { Popover } from "@base-ui/react/popover";
import { StatusBadge, Icon } from "@/components/ui/primitives";
import { ActionButton, Pill } from "@/components/ui/controls";
import { PopoverPopup } from "@/components/ui/floating";
import { DocumentActions } from "./document-actions";
import { formatBrazilDate } from "@/lib/receipt";
import { documentLabels, type DocumentType } from "@/types/documents";

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
  actions,
  secondaryActions,
  moreTriggerRef,
  metadata = [],
  milestones,
  badges,
  headingLevel = 2,
  contextLabel,
  progressActionRef,
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
  actions?: ReactNode;
  secondaryActions?: ReactNode;
  moreTriggerRef?: Ref<HTMLButtonElement>;
  metadata?: { label: string; value: ReactNode }[];
  milestones?: ReactNode;
  badges?: ReactNode;
  headingLevel?: 1 | 2;
  contextLabel?: string;
  progressActionRef?: Ref<HTMLDivElement>;
  fileActionRef?: Ref<HTMLDivElement>;
  onRefresh?: () => void;
  refreshDisabled?: boolean;
  refreshing?: boolean;
  refreshButtonRef?: Ref<HTMLButtonElement>;
}) {
  const Heading = headingLevel === 1 ? "h1" : "h2";
  const [copyMessage, setCopyMessage] = useState("");
  const [moreOpen, setMoreOpen] = useState(false);
  const actionClosedRef = useRef(false);
  const facts = [
    ...metadata.slice(0, 1),
    { label: dateHeading, value: dateLabel ?? formatBrazilDate(createdAt) },
    ...metadata.slice(1),
    ...(patientName ? [{ label: "Paciente", value: patientName }] : []),
  ];
  return (
    <>
      <section
        className="hca-document-header"
        ref={observedRef}
        aria-label="Resumo da ficha"
      >
        <div className="hca-document-identity">
          <div className="hca-document-name">
            <span className="hca-document-type">{type}</span>
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
            <Pill>Versão {version}</Pill>
            {contextLabel ? <Pill>Perfil: {contextLabel}</Pill> : null}
          </div>
        </div>
        <dl className="hca-document-meta">
          {facts.map((fact) => (
            <div key={fact.label}>
              <dt>{fact.label}</dt>
              <dd>{fact.value}</dd>
            </div>
          ))}
        </dl>
        {children ? (
          <div className="hca-document-context">{children}</div>
        ) : null}
        {milestones}
      </section>
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
          <div ref={progressActionRef} className="hca-document-action-slot" />
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
          <Popover.Root
            open={moreOpen}
            onOpenChange={(open) => {
              if (open) actionClosedRef.current = false;
              setMoreOpen(open);
            }}
          >
            <Popover.Trigger
              render={
                <ActionButton ref={moreTriggerRef}>
                  <Icon name="more" />
                  Mais
                </ActionButton>
              }
            />
            <PopoverPopup
              className="hca-document-identifiers"
              aria-label="Mais opções da ficha"
              finalFocus={() => (actionClosedRef.current ? false : true)}
            >
              {secondaryActions ? (
                <div
                  className="hca-document-more-actions"
                  onClick={(event) => {
                    if (
                      event.target instanceof Element &&
                      event.target.closest("a,button:not(:disabled)")
                    ) {
                      actionClosedRef.current = true;
                      setMoreOpen(false);
                    }
                  }}
                >
                  {secondaryActions}
                </div>
              ) : null}
              <h2>Protocolo e identificação</h2>
              <dl>
                <div>
                  <dt>Código</dt>
                  <dd>{code}</dd>
                </div>
                <div>
                  <dt>Protocolo</dt>
                  <dd>
                    {protocol ?? unissuedLabel ?? "Rascunho ainda não emitido"}
                  </dd>
                </div>
                <div>
                  <dt>Identificador</dt>
                  <dd>{id}</dd>
                </div>
              </dl>
              <ActionButton
                onClick={() => {
                  if (!navigator.clipboard?.writeText) {
                    setCopyMessage(
                      "Não foi possível copiar. Selecione o código apresentado acima.",
                    );
                    return;
                  }
                  void navigator.clipboard.writeText(code).then(
                    () => setCopyMessage("Referência copiada."),
                    () =>
                      setCopyMessage(
                        "Não foi possível copiar. Selecione o código apresentado acima.",
                      ),
                  );
                }}
              >
                Copiar referência
              </ActionButton>
              {copyMessage ? <p role="status">{copyMessage}</p> : null}
            </PopoverPopup>
          </Popover.Root>
        </div>
      </div>
      {protocol && showFiles ? (
        <DocumentActions id={id} code={code} version={version} />
      ) : null}
    </>
  );
}
