"use client";
import { IssuanceObservationList } from "@/components/forms/issuance-observations";
import { issuanceObservations } from "@/lib/documents/issuance-observations";

import { useId, useState, type FormEvent, type ReactNode, type RefObject } from "react";
import { ActionButton, DefinitionGrid, TextAreaField, TextInput } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { Dialog } from "@/components/ui/overlays";
import { can, Notice, type WorkspaceContext } from "@/components/workspace";
import { compareDeliveryQuantity, deliveryNeedRequest, readCountedDeliveryReceipt } from "@/lib/documents/delivery-receipt";
import { linkedDeliveryNeed } from "@/lib/documents/family-fulfillment";
import { formatQuantity, validQuantity } from "@/lib/quantity";
import { formatBrazilDate } from "@/lib/receipt";
import { useLiveRevision } from "@/lib/use-live-revision";
import { useScopedRead } from "@/lib/use-scoped-read";
import { countedDeliveryReceiptBody, type CountedDeliveryReceiptBody } from "@/lib/validation/delivery-receipt";
import type { SupplyDocument } from "@/types/documents";
import type { ProductStock } from "@/types/stock";
import { DeliveryMaterialMenu } from "./delivery-material-menu";

type ReceiptEditorProps = {
  data: SupplyDocument;
  context: WorkspaceContext;
  sender: string;
  review: CountedDeliveryReceiptBody | null;
  busy: boolean;
  blocked: boolean;
  uncertain: boolean;
  error: string;
  conflict?: ReactNode;
  finalFocus: RefObject<HTMLButtonElement | null>;
  onReview: (body: CountedDeliveryReceiptBody, different: boolean) => void;
  onEdit: () => void;
  onConfirm: () => void;
  onClose: () => void;
  onCloseUncertain: () => void;
};

export function CountedDeliveryReceipt(props: ReceiptEditorProps) {
  const { data, context, review, busy, blocked, uncertain } = props;
  const formId = useId();
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [requests, setRequests] = useState<Record<string, string>>({});
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [invalidId, setInvalidId] = useState<string | null>(null);
  const [discard, setDiscard] = useState(false);
  const [requestedStock, setRequestedStock] = useState(false);
  const revision = useLiveRevision();
  const family = data.payload.destination === "FAMILY";
  const custody = family ? "FAMILY" : "CARE_TEAM";
  const mayReadStock = context.patient?.id === data.care_recipient_id && can(context, family ? "stock.family.read" : "stock.team.read");
  const stockUrl = requestedStock && mayReadStock ? "/api/stock/balances?" + new URLSearchParams({
    careRecipientId: data.care_recipient_id,
    custody,
  }) : null;
  const stock = useScopedRead<{ careRecipientId: string; custody: string; overview: ProductStock[] }>(stockUrl, String(revision));
  const stockRows = stock.data?.careRecipientId === data.care_recipient_id && stock.data.custody === custody
    ? stock.data.overview : undefined;
  const shippedAt = data.transfer?.dispatchedAt ?? data.events.find(event => event.action === "ent.submit" || event.action === "ent.issued")?.createdAt ?? null;
  const rows = data.lines.map(line => ({ line, value: counts[line.id] ?? formatQuantity(line.quantity) }));
  const changed = rows.some(({ line, value }) => value !== formatQuantity(line.quantity));

  function prepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || blocked) return;
    const invalid = rows.find(({ line, value }) => !validQuantity(value, stockRows?.find(item => item.productId === line.product_id)?.decimals ?? 6, true));
    if (invalid) {
      setInvalidId(invalid.line.id);
      const input = event.currentTarget.elements.namedItem(invalid.line.id);
      if (input instanceof HTMLElement) input.focus();
      return;
    }
    setInvalidId(null);
    const lines = rows.map(({ line, value }) => ({
      lineId: line.id, receivedQuantity: value,
      ...(!family && linkedDeliveryNeed(data,line) && compareDeliveryQuantity(line.quantity,value).difference.isZero()
        && requests[line.id] !== undefined ? { reviewReason: requests[line.id].trim() } : {}),
    }));
    const invalidRequest = lines.find(line => line.reviewReason !== undefined && line.reviewReason.length < 3);
    if (invalidRequest) {
      setReasonError(invalidRequest.lineId);
      const field = event.currentTarget.elements.namedItem(invalidRequest.lineId + ":reason");
      if (field instanceof HTMLElement) field.focus();
      return;
    }
    setReasonError(null);
    const body = countedDeliveryReceiptBody.parse({ countedReceipt: { notes, lines } });
    props.onReview(body, rows.some(({ line, value }) => !compareDeliveryQuantity(line.quantity, value).difference.isZero()));
  }

  function close() {
    if (busy) return;
    if (uncertain) props.onCloseUncertain();
    else if (review) props.onEdit();
    else if (changed || notes.trim() || Object.keys(requests).length) setDiscard(true);
    else props.onClose();
  }

  const reviewRows = review?.countedReceipt.lines.flatMap(entry => {
    const line = data.lines.find(item => item.id === entry.lineId);
    return line ? [{ line, received: entry.receivedQuantity, ...compareDeliveryQuantity(line.quantity, entry.receivedQuantity) }] : [];
  }) ?? [];
  const differences = reviewRows.filter(row => !row.difference.isZero());
  const title = review
    ? differences.length ? "Confirmar diferença no recebimento" : "Confirmar recebimento"
    : "Conferir recebimento";

  return <>
    <Dialog open title={title} subtitle={review ? undefined : "Confira as quantidades. Altere apenas o que chegou diferente."}
      finalFocus={props.finalFocus} closeDisabled={busy} onClose={close} footer={<>
        <ActionButton disabled={busy || uncertain} onClick={close}>{review ? "Voltar e editar" : "Voltar"}</ActionButton>
        {review || uncertain
          ? <ActionButton variant="primary" disabled={busy || blocked && !uncertain} onClick={props.onConfirm}>
            {uncertain ? "Conferir resultado" : differences.length ? "Registrar diferença" : "Confirmar"}
          </ActionButton>
          : <ActionButton variant="primary" type="submit" form={formId} disabled={busy || blocked}>Confirmar recebimento</ActionButton>}
      </>}>
      <div className="hca-delivery-receipt">
        {props.error ? <Notice error>{props.error}</Notice> : null}
        {props.conflict}
        {uncertain ? <Notice>Confira o resultado da tentativa antes de registrar outro recebimento.</Notice> : null}
        {review ? <>
          {differences.map(({ line, received, difference, recognized, transit, excess }) => <article className="hca-receipt-line hca-receipt-difference" key={line.id}>
            <header>
              <h3>{line.name_snapshot}</h3>
              <strong className="hca-receipt-change">{formatQuantity(difference.abs().toFixed(), line.unit_snapshot)} {difference.gt(0) ? "a mais" : "a menos"}</strong>
            </header>
            <p className="hca-receipt-quantities">{formatQuantity(line.quantity)} expedidas <Icon name="arrow" width={14} height={14} /> <strong>{formatQuantity(received)} recebidas</strong></p>
            <p>{formatQuantity(recognized.toFixed(), line.unit_snapshot)} entram no {family ? "estoque familiar" : "estoque da equipe"}.
              {excess.gt(0) ? " O excedente aguarda regularização da origem." : ` ${formatQuantity(transit.toFixed())} ficam em conciliação.`}</p>
          </article>)}
          {review.countedReceipt.lines.filter(line => line.reviewReason).map(entry => <article key={entry.lineId} className="hca-receipt-line">
            <h3>{data.lines.find(line => line.id === entry.lineId)?.name_snapshot}</h3>
            <p><strong>Pedido de avaliação familiar</strong></p><p>{entry.reviewReason}</p>
          </article>)}
          {differences.some(({ line }) => !family && line.requisitionItemIds.length) ? <p className="hca-receipt-impact"><Icon name="clock" />
            <span>A família avaliará se a necessidade foi atendida.</span></p> : null}
        </> : <form id={formId} className="hca-delivery-receipt" onSubmit={prepare}>
          {rows.map(({ line, value }) => {
            const difference = validQuantity(value, 6, true) ? compareDeliveryQuantity(line.quantity, value).difference : null;
            const stockRow = stockRows?.find(item => item.productId === line.product_id);
            const confirmed = family ? stockRow?.family?.confirmed : stockRow?.team?.confirmed;
            const inputId = formId + "-" + line.id;
            return <article key={line.id} className="hca-receipt-line">
              <header><div><h3>{line.name_snapshot}</h3><p>Expedidas · {formatQuantity(line.quantity, line.unit_snapshot)}</p></div>
                <DeliveryMaterialMenu data={data} line={line} disabled={busy} />
              </header>
              <div className="hca-receipt-field">
                <label htmlFor={inputId}>Recebidas<span className="sr-only"> de {line.name_snapshot}</span></label>
                <div className="hca-receipt-quantity"><TextInput id={inputId} name={line.id} inputMode="decimal" required maxLength={64}
                  value={value} readOnly={blocked} aria-invalid={invalidId === line.id || undefined}
                  aria-describedby={invalidId === line.id ? inputId + "-error" : undefined}
                  onChange={event => {
                    const value = event.currentTarget.value;
                    setCounts(previous => ({ ...previous, [line.id]: value }));
                    if (invalidId === line.id) setInvalidId(null);
                  }} /><span>{line.unit_snapshot}</span></div>
              </div>
              {invalidId === line.id ? <p id={inputId + "-error"} role="alert">Confira a quantidade e a precisão permitida para este material.</p> : null}
              {difference && !difference.isZero() ? <p><span className="hca-receipt-change">{formatQuantity(difference.abs().toFixed(), line.unit_snapshot)} {difference.gt(0) ? "a mais" : "a menos"}</span></p> : null}
              {!family && linkedDeliveryNeed(data,line) ? difference?.isZero() ? <div className="hca-receipt-need">
                <label className="hca-purchase-switch">
                  <span>{line.family_fulfillment === "complete" ? "Necessidade suprida" : "Pedir nova avaliação"}</span>
                  <input type="checkbox" role="switch" disabled={blocked}
                    aria-label={(line.family_fulfillment === "complete" ? "Necessidade suprida · " : "Pedir nova avaliação · ") + line.name_snapshot}
                    checked={line.family_fulfillment === "complete" ? requests[line.id] === undefined : requests[line.id] !== undefined}
                    onChange={() => setRequests(previous => {
                      const next = { ...previous };
                      if (next[line.id] === undefined) next[line.id] = "";
                      else delete next[line.id];
                      return next;
                    })} />
                </label>
                {requests[line.id] !== undefined ? <>
                  <label htmlFor={inputId + "-review-reason"}>Motivo do pedido de reavaliação</label>
                  <TextAreaField id={inputId + "-review-reason"} name={line.id + ":reason"} rows={2} maxLength={1000}
                    readOnly={blocked} aria-invalid={reasonError === line.id || undefined}
                    aria-describedby={reasonError === line.id ? inputId + "-review-error" : undefined}
                    value={requests[line.id]} onChange={event => {
                      const reason = event.currentTarget.value;
                      setRequests(previous => ({ ...previous, [line.id]: reason }));
                      if (reasonError === line.id) setReasonError(null);
                    }} placeholder="O que ainda falta para atender à necessidade?" />
                  {reasonError === line.id ? <p id={inputId + "-review-error"} role="alert">Informe por que o material precisa de nova avaliação.</p> : null}
                </> : null}
              </div> : difference ? <p className="hca-receipt-family">A família avaliará a necessidade após a conferência da diferença.</p> : null : null}
              <details className="hca-receipt-fold" onToggle={event => {
                if (event.currentTarget.open) setRequestedStock(true);
              }}>
                <summary><Icon name="stock" />Consultar estoque<Icon name="down" /></summary>
                {!mayReadStock ? <p>Consulta de estoque indisponível para este acesso.</p> : stock.loading
                  ? <p role="status">Consultando estoque…</p> : stock.error
                    ? <p>Estoque indisponível. <ActionButton compact onClick={stock.refresh}>Consultar novamente</ActionButton></p>
                    : <p>{family ? "Estoque atual da família" : "Estoque atual da equipe"} · {confirmed == null ? "Sem saldo confirmado" : formatQuantity(confirmed, line.unit_snapshot)}</p>}
              </details>
            </article>;
          })}
          <details className="hca-receipt-fold">
            <summary><Icon name="truck" />Dados e observação da expedição<Icon name="down" /></summary>
            <DefinitionGrid items={[
              { label: family ? "Devolução" : "Entrega", value: data.code ?? "Ficha em conferência" },
              { label: "Expedição", value: formatBrazilDate(shippedAt) },
              { label: "Expedido por", value: props.sender, wide: true },
            ]} />
            <p><strong>Observação de quem expediu</strong></p>
            <IssuanceObservationList observations={issuanceObservations(data.payload)} empty="Sem observação na expedição." />
          </details>
          <details className="hca-receipt-fold">
            <summary><Icon name="note" />Adicionar observação ao recebimento<Icon name="down" /></summary>
            <label htmlFor={formId + "-notes"}>Sua observação no recebimento</label>
            <TextAreaField id={formId + "-notes"} rows={2} maxLength={1000} value={notes} readOnly={blocked}
              placeholder="Escreva uma observação, se houver." onChange={event => setNotes(event.currentTarget.value)} />
          </details>
        </form>}
      </div>
    </Dialog>
    {discard ? <Dialog open title="Sair sem confirmar o recebimento?" onClose={() => setDiscard(false)} footer={<>
      <ActionButton onClick={() => setDiscard(false)}>Continuar preenchendo</ActionButton>
      <ActionButton variant="primary" onClick={props.onClose}>Sair e descartar</ActionButton>
    </>}><p>Os valores desta conferência serão descartados.</p></Dialog> : null}
  </>;
}

export function CountedDeliveryReceiptResult({ data, onClose }: { data: SupplyDocument; onClose: () => void }) {
  const rows = data.lines.flatMap(line => {
    const counted = readCountedDeliveryReceipt(line.metadata);
    return counted ? [{ line, counted }] : [];
  });
  const excess = rows.some(row => Number(row.counted.excessQuantity) > 0);
  const transit = rows.some(row => Number(row.counted.remainingTransitQuantity) > 0);
  const different = excess || transit;
  const requested = rows.some(row => deliveryNeedRequest(row.line.metadata));
  return <Dialog open success title={different ? "Recebimento registrado com diferença" : requested ? "Recebimento confirmado · revisão solicitada" : "Recebimento confirmado"} onClose={onClose}
    footer={<ActionButton variant="primary" onClick={onClose}>Voltar à ficha</ActionButton>}>
    <p>As quantidades reconhecidas foram registradas no {data.payload.destination === "FAMILY" ? "estoque familiar" : "estoque da equipe"}.
      {excess ? " O excedente aguarda regularização da origem." : ""}
      {transit ? " O saldo ainda em trânsito aguarda conciliação." : ""}
      {requested ? " A família avaliará o pedido de reavaliação da equipe." : ""}</p>
    <div className="hca-delivery-receipt">
      {rows.map(({ line, counted }) => <article key={line.id} className="hca-receipt-line">
        <h3>{line.name_snapshot}</h3>
        <DefinitionGrid items={[
          { label: "Expedidas", value: formatQuantity(counted.expeditedQuantity, line.unit_snapshot) },
          { label: "Recebidas declaradas", value: formatQuantity(counted.receivedQuantity, line.unit_snapshot) },
          { label: "Reconhecidas no estoque", value: formatQuantity(counted.recognizedQuantity, line.unit_snapshot) },
          { label: "Em trânsito", value: formatQuantity(counted.remainingTransitQuantity, line.unit_snapshot) },
          ...(Number(counted.excessQuantity) > 0 ? [{ label: "Excedente em apuração", value: formatQuantity(counted.excessQuantity, line.unit_snapshot) }] : []),
        ]} />
      </article>)}
    </div>
  </Dialog>;
}
