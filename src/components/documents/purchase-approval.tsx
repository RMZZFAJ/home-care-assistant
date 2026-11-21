"use client";

import { useRef, useState } from "react";
import { Menu } from "@base-ui/react/menu";
import { ActionButton } from "@/components/ui/controls";
import { MenuPopup } from "@/components/ui/floating";
import { Icon } from "@/components/ui/icon";
import { Dialog } from "@/components/ui/overlays";
import { documentIssuerName } from "@/lib/documents/presentation";
import { formatQuantity, quantity, validQuantity } from "@/lib/quantity";
import { formatBrazilDate } from "@/lib/receipt";
import type { SupplyDocument, SupplyLine } from "@/types/documents";
import { RelatedDocument } from "./related-document";
import { SupplyLineSummary } from "./supply-line-summary";

export function purchaseApprovalSummary(data: SupplyDocument, form: FormData) {
  const explanations: string[] = [];
  let hasExcluded = false;
  const lines = data.lines.map(line => {
    if (!form.has(`${line.id}:selected`)) {
      hasExcluded = true;
      return { lineId: line.id, quantity: "0" };
    }
    const value = String(form.get(line.id) ?? "").trim();
    if (!validQuantity(value, 6) || quantity(value).gt(line.quantity))
      throw new Error(`Informe uma quantidade positiva até o total solicitado de ${line.name_snapshot}.`);
    if (!quantity(value).eq(line.quantity)) {
      const explanation = String(form.get(`${line.id}:reason`) ?? "").trim();
      if (explanation.length < 3) throw new Error(`Informe o motivo do ajuste de ${line.name_snapshot}.`);
      explanations.push(`${line.name_snapshot}: ${explanation}`);
    }
    return { lineId: line.id, quantity: quantity(value).toFixed() };
  });
  if (hasExcluded) {
    const explanation = String(form.get("excludedReason") ?? "").trim();
    if (explanation.length < 3) throw new Error("Informe o motivo da recusa dos materiais desmarcados.");
    explanations.push(`Materiais sem autorização: ${explanation}`);
  }
  const reason = explanations.join("\n");
  if (reason.length > 1000) throw new Error("As justificativas e a identificação dos materiais devem somar até 1.000 caracteres.");
  const summary = lines.map((entry, index) => {
    const line = data.lines[index];
    return `${line.name_snapshot} · ${quantity(entry.quantity).gt(0) ? formatQuantity(entry.quantity, line.unit_snapshot) : "Sem autorização"}`;
  }).join("\n");
  return { body: { lines, ...(reason ? { reason } : {}) }, summary };
}

export function PurchaseApprovalFields({ data, fields }: { data: SupplyDocument; fields?: Record<string, string> }) {
  const [excludedIds, setExcludedIds] = useState(() => data.lines.filter(line => fields?.[`${line.id}:selected`] === "").map(line => line.id));
  return <>
    <p className="hca-arrival-summary"><Icon name="file" />
      <span>{data.code ?? data.protocol} · {documentIssuerName(data.canonical_snapshot)} · <time dateTime={data.created_at}>{formatBrazilDate(data.created_at)}</time></span>
    </p>
    {data.lines.map(line => <PurchaseApprovalLine key={line.id} data={data} line={line} fields={fields}
      selected={!excludedIds.includes(line.id)} onSelect={selected => setExcludedIds(previous => selected
        ? previous.filter(id => id !== line.id) : [...previous, line.id])} />)}
    <label className="hca-approval-reason" hidden={!excludedIds.length}>
      Motivo dos materiais desmarcados
      <textarea className="hca-text-input" name="excludedReason" rows={2} maxLength={1000}
        disabled={!excludedIds.length} defaultValue={fields?.excludedReason ?? ""} placeholder="Explique por que esses materiais ficaram sem autorização" />
    </label>
  </>;
}

function PurchaseApprovalLine({ data, line, fields, selected, onSelect }: {
  data: SupplyDocument; line: SupplyLine; fields?: Record<string, string>; selected: boolean; onSelect: (selected: boolean) => void;
}) {
  const [value, setValue] = useState(() => fields?.[line.id] ?? formatQuantity(line.quantity));
  const [showDetails, setShowDetails] = useState(false);
  const optionsRef = useRef<HTMLButtonElement>(null);
  const changed = selected && validQuantity(value.trim(), 6) && !quantity(value.trim()).eq(line.quantity);
  const origins = data.originDocuments?.filter(origin => origin.productIds.includes(line.product_id)) ?? [];
  const legacyOrigins = data.linkedRequisitions?.filter(origin =>
    origin.itemIds.some(id => line.requisitionItemIds.includes(id)) && !origins.some(link => link.documentId === origin.id)) ?? [];
  return <article className="hca-purchase-line" data-inactive={!selected}>
    <div className="hca-purchase-line-heading">
      <div><h3>{line.name_snapshot}</h3><p>Solicitado: {formatQuantity(line.quantity, line.unit_snapshot)}</p></div>
      <label className="hca-purchase-switch">
        <input type="checkbox" role="switch" name={`${line.id}:selected`}
          aria-label={`Autorizar · ${line.name_snapshot}`} checked={selected} onChange={event => onSelect(event.currentTarget.checked)} />
      </label>
      <Menu.Root modal={false}>
        <Menu.Trigger render={<ActionButton ref={optionsRef} variant="quiet" compact className="hca-purchase-options"
          aria-label={`Opções de ${line.name_snapshot}`}><Icon name="more" /></ActionButton>} />
        <MenuPopup aria-label={`Opções de ${line.name_snapshot}`} finalFocus={() => !showDetails}>
          <Menu.Item className="hca-menu-item" onClick={() => setShowDetails(true)}>
            <Icon name="eye" />Detalhes do material
          </Menu.Item>
        </MenuPopup>
      </Menu.Root>
    </div>
    <label className="hca-purchase-field" hidden={!selected}>
      <span>Autorizar</span>
      <span className="hca-purchase-quantity">
        <input className="hca-text-input" type="text" inputMode="decimal" name={line.id} maxLength={64}
          aria-label={`${line.name_snapshot} · ${line.unit_snapshot}`} value={value} disabled={!selected}
          onChange={event => setValue(event.currentTarget.value)} />
        <span aria-hidden="true">{line.unit_snapshot}</span>
      </span>
    </label>
    <label className="hca-approval-reason" hidden={!changed}>
      Motivo do ajuste
      <input className="hca-text-input" name={`${line.id}:reason`} maxLength={1000} disabled={!changed}
        aria-label={`Motivo do ajuste · ${line.name_snapshot}`} defaultValue={fields?.[`${line.id}:reason`] ?? ""}
        placeholder="Explique a alteração da quantidade" />
    </label>
    {origins.length || legacyOrigins.length ? <div className="hca-approval-origins">
      {origins.map(origin => <RelatedDocument key={origin.documentId} id={origin.documentId} label={origin.code} type={origin.type} compact />)}
      {legacyOrigins.map(origin => <RelatedDocument key={origin.id} id={origin.id} label={origin.code} compact />)}
    </div> : null}
    <Dialog open={showDetails} title="Detalhes do material" onClose={() => setShowDetails(false)} finalFocus={optionsRef}>
      <SupplyLineSummary line={line} type="COM" status={data.status} purchaseLine={data.purchaseProgress?.lines.find(entry => entry.lineId === line.id)} />
    </Dialog>
  </article>;
}

export function PurchaseApprovalResult({ data, onClose }: { data: SupplyDocument; onClose: () => void }) {
  const approved = data.lines.filter(line => quantity(line.approved_quantity).gt(0));
  const title = approved.length ? "Compra autorizada" : data.status === "rejected" ? "Compra recusada" : "Decisão registrada";
  const subtitle = approved.length ? "A família já pode adquirir as quantidades autorizadas." : "Nenhum dos materiais avaliados foi autorizado para aquisição.";
  return <Dialog open success title={title} subtitle={subtitle} onClose={onClose}
    footer={<ActionButton variant="primary" onClick={onClose}><Icon name="check" />Concluir</ActionButton>}>
    {approved.length ? <ul className="hca-purchase-list">{approved.map(line => <li className="hca-purchase-line" key={line.id}>
      <div className="hca-purchase-line-heading"><strong>{line.name_snapshot}</strong>
        <span>{formatQuantity(line.approved_quantity, line.unit_snapshot)}</span></div>
    </li>)}</ul> : null}
  </Dialog>;
}
