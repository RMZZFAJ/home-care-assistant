"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState, type ReactNode, type RefObject } from "react";
import { ActionButton, DefinitionGrid, LoadingIndicator, Pill } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { Drawer } from "@/components/ui/overlays";
import { Notice } from "@/components/workspace";
import { holdDialogFocus } from "@/lib/forms/dialog-focus";
import { formatQuantity } from "@/lib/quantity";
import { formatBrazilDate } from "@/lib/receipt";
import { useLiveRevision } from "@/lib/use-live-revision";
import { useScopedRead } from "@/lib/use-scoped-read";
import { parseStockOperationDetail, type StockOperationHistory, type StockOperationMovement } from "@/lib/validation/stock-reads";
import { MovementOrigin } from "./movement-origin";
import { stockCustodyLabels, stockOperationOrigins } from "./stock-operation-labels";

function operationTitle(operation: StockOperationHistory) {
  if (operation.documentCode) return operation.documentCode;
  if (operation.origin !== "manual") return stockOperationOrigins[operation.origin].title;
  if (operation.rows.some(row => row.reference_id)) return "Correção de estoque";
  if (operation.rows.every(row => row.direction === "inbound")) return "Entrada avulsa";
  if (operation.rows.every(row => row.direction === "outbound")) return "Retirada avulsa";
  return "Movimentação manual";
}

export function StockOperationDetails({ patientId, operationId, opener, fallbackRef, onClose, renderDocumentLink }: {
  patientId: string;
  operationId: string;
  opener: HTMLElement;
  fallbackRef?: RefObject<HTMLElement | null>;
  onClose: () => void;
  renderDocumentLink?: (row: StockOperationMovement, operation: StockOperationHistory) => ReactNode;
}) {
  const [detail, setDetail] = useState<{ movementId: string; opener: HTMLElement } | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const effectsHeadingId = useId();
  const revision = useLiveRevision();
  const decode = useCallback((raw: unknown) => parseStockOperationDetail(raw, patientId, operationId), [patientId, operationId]);
  const read = useScopedRead("/api/stock/operations/" + encodeURIComponent(operationId) + "?" + new URLSearchParams({ careRecipientId: patientId }),
    String(revision), decode);
  const { refresh } = read;
  useEffect(() => {
    const visible = () => { if (!document.hidden) refresh(); };
    window.addEventListener("focus", visible);
    document.addEventListener("visibilitychange", visible);
    return () => {
      window.removeEventListener("focus", visible);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [refresh]);

  const operation = !read.loading && !read.error ? read.data : null;
  const denied = read.errorStatus === 401 || read.errorStatus === 403 || read.errorStatus === 404;
  const origin = operation && stockOperationOrigins[operation.origin];
  const custodies = new Set(operation?.rows.map(row => row.custody));
  const reasons = new Set(operation?.rows.map(row => row.justification));
  const sharedReason = reasons.size === 1 ? reasons.values().next().value : null;
  const selected = operation?.rows.find(row => row.id === detail?.movementId);
  const source = operation?.rows.find(row => row.reference_document_id);

  return <Drawer open title={operation ? operationTitle(operation) : "Detalhes da operação"}
    subtitle={operation?.origin === "manual" ? "Movimentação manual" : operation?.documentCode ? origin?.title : undefined}
    headingIcon="info" keyboardScrollable popupClassName="hca-stock-operation-sheet"
    onClose={onClose} closeLabel="Fechar detalhes da operação"
    finalFocus={() => opener.isConnected && opener.getClientRects().length ? opener : fallbackRef?.current ?? false}
    footer={<>
      <ActionButton onClick={onClose}>Voltar</ActionButton>
      {operation && source ? renderDocumentLink ? renderDocumentLink(source, operation)
        : <Link href={"/fichas/" + source.reference_document_id} className="ui-button ui-button-primary" prefetch={false}>
          {source.reference_type === "delivery_regularization" ? "Abrir dossiê administrativo" : "Ver ficha"}
        </Link> : null}
    </>}>
    {read.loading ? <LoadingIndicator label="Consultando operação de estoque" />
      : denied ? <div className="hca-form-stack"><strong>Acesso indisponível</strong><p>Esta operação não está disponível para o vínculo atual.</p></div>
        : read.error ? <Notice error>{read.error} <ActionButton onClick={event => {
          holdDialogFocus(event.currentTarget);
          refresh();
        }}>Tentar novamente</ActionButton></Notice>
          : operation ? <div className="hca-form-stack">
            <div className="hca-stock-operation-intro">
              <div>{Array.from(custodies, custody => <Pill key={custody} tone="accent">{stockCustodyLabels[custody]}</Pill>)}</div>
              {sharedReason ? <p>{sharedReason}</p> : null}
            </div>
            <DefinitionGrid items={[
              { label: "Registrado por", value: operation.actor ?? "Autoria indisponível" },
              { label: "Quando", value: formatBrazilDate(operation.recordedAt) },
              { label: "Origem", value: origin?.title },
            ]} />
            <section className="hca-stock-operation-effects" aria-labelledby={effectsHeadingId}>
              <h3 id={effectsHeadingId} ref={headingRef} tabIndex={-1}>Efeito em cada material</h3>
              {operation.rows.map(row => <OperationEffect key={row.id} row={row} showCustody={custodies.size > 1}
                showReason={!sharedReason} onOrigin={target => setDetail({ movementId: row.id, opener: target })} />)}
            </section>
            {selected && detail ? <MovementOrigin patientId={patientId} movementId={selected.id} effect={selected}
              opener={detail.opener} onClose={() => setDetail(null)} restoreFocusFallbackRef={headingRef} /> : null}
          </div> : null}
  </Drawer>;
}

function OperationEffect({ row, showCustody, showReason, onOrigin }: {
  row: StockOperationMovement;
  showCustody: boolean;
  showReason: boolean;
  onOrigin: (target: HTMLElement) => void;
}) {
  const name = row.name ?? "Nome do material indisponível";
  const unit = row.unit ?? undefined;
  const inbound = row.direction === "inbound";
  const quantity = (inbound ? "+" : "−") + formatQuantity(row.quantity, unit);
  return <article className="hca-stock-operation-effect">
    <div className="hca-stock-operation-effect-heading">
      <div><h4>{name}</h4>{showCustody ? <small>{stockCustodyLabels[row.custody]}</small> : null}</div>
      <Pill tone={inbound ? "success" : "danger"}>{quantity}</Pill>
    </div>
    <DefinitionGrid items={[
      { label: "Saldo anterior", value: row.before === null ? "Indisponível" : formatQuantity(row.before, unit) },
      { label: "Saldo após", value: row.after === null ? "Indisponível" : formatQuantity(row.after, unit) },
    ]} />
    {showReason && row.justification ? <p className="hca-stock-act-reason">{row.justification}</p> : null}
    <ActionButton variant="secondary" aria-label={"Detalhes deste item · " + name} onClick={event => onOrigin(event.currentTarget)}>
      <Icon name="info" width={15} height={15} /> Detalhes deste item
    </ActionButton>
  </article>;
}
