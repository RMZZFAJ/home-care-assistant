"use client";

import { useRef, useState } from "react";
import { Menu } from "@base-ui/react/menu";
import { MenuPopup } from "@/components/ui/floating";
import { Icon } from "@/components/ui/icon";
import { ActionButton, DefinitionGrid } from "@/components/ui/controls";
import { Dialog } from "@/components/ui/overlays";
import { formatQuantity, quantity } from "@/lib/quantity";
import { acquisitionRemaining, formatPurchaseDate } from "@/lib/documents/purchase";
import type { PurchaseSelection } from "@/lib/validation/purchase-command";
import { requirePurchaseEntryBalances, type PurchaseEntryBalances } from "@/lib/validation/purchase-entry-balances";
import type { PurchaseProgressLine, PurchaseReceipt, SupplyDocument, SupplyLine } from "@/types/documents";
import { SupplyLineSummary } from "./supply-line-summary";

export function PurchaseFormLine({ line, progress, status, fieldId, fields, mayReceive, directCredit }: {
  line: SupplyLine;
  progress?: PurchaseProgressLine;
  status: string;
  fieldId: string;
  fields?: Record<string, string>;
  mayReceive: boolean;
  directCredit: boolean;
}) {
  const [inHand, setInHand] = useState(fields?.[line.id + ":inHand"] === "on");
  const [showDetails, setShowDetails] = useState(false);
  const optionsRef = useRef<HTMLButtonElement>(null);
  const present = mayReceive && inHand;
  const label = line.name_snapshot + " · " + line.unit_snapshot;
  return <article className="hca-purchase-line">
    <div className="hca-purchase-line-heading">
      <div><h3>{line.name_snapshot}</h3><p>{present ? "Material disponível agora" : "Entrega prevista pela loja"}</p></div>
      {mayReceive ? <label className="hca-purchase-switch">
        <span>Em mãos?</span>
        <input type="checkbox" role="switch" name={line.id + ":inHand"}
          aria-label={"Já está em mãos · " + line.name_snapshot} checked={present}
          onChange={event => setInHand(event.currentTarget.checked)} />
      </label> : null}
      <Menu.Root modal={false}>
        <Menu.Trigger render={<ActionButton ref={optionsRef} variant="quiet" compact className="hca-purchase-options"
          aria-label={"Opções de " + line.name_snapshot}><Icon name="more" /></ActionButton>} />
        <MenuPopup aria-label={"Opções de " + line.name_snapshot} finalFocus={() => !showDetails}>
          <Menu.Item className="hca-menu-item" onClick={() => setShowDetails(true)}>
            <Icon name="eye" />Detalhes do material
          </Menu.Item>
        </MenuPopup>
      </Menu.Root>
    </div>
    <label className="hca-purchase-field">
      <span>Comprados</span>
      <span className="hca-purchase-quantity">
        <input id={fieldId} className="hca-text-input" type="text" inputMode="decimal"
          name={line.id} aria-label={label} aria-describedby={fieldId + "-limit"}
          maxLength={64} defaultValue={fields?.[line.id] ?? ""} />
        <span aria-hidden="true">{line.unit_snapshot}</span>
      </span>
    </label>
    <p id={fieldId + "-limit"} className="hca-purchase-limit">
      Disponível para compra {formatQuantity(acquisitionRemaining(line).toFixed(), line.unit_snapshot)}
    </p>
    <label className="hca-purchase-field" hidden={present}>
      <span>Previsão da loja</span>
      <input className="hca-text-input" type="date" disabled={present} name={line.id + ":expectedDate"}
        aria-label={"Previsão da loja · " + line.name_snapshot}
        defaultValue={fields?.[line.id + ":expectedDate"] ?? ""} />
    </label>
    {present ? <p className="hca-purchase-status" data-tone={directCredit ? "success" : "pending"}>
      <Icon name={directCredit ? "check" : "clock"} />
      <span>{directCredit ? "Entrada direta no estoque familiar." : "A chegada aguarda aprovação do administrador."}</span>
    </p> : null}
    <Dialog open={showDetails} title="Detalhes do material" onClose={() => setShowDetails(false)} finalFocus={optionsRef}>
      <SupplyLineSummary line={line} type="COM" status={status} purchaseLine={progress} />
    </Dialog>
  </article>;
}

type EntryStock = { before: string; entered: string; after: string } | "restricted" | "unavailable";

export type ConfirmedPurchase = {
  documentId: string;
  summary: string;
  materials: Array<{ id: string; name: string; amount: string; status: string; waitingForStore: boolean; entryStock?: EntryStock }>;
};

export function confirmedPurchase(document: SupplyDocument, lines: PurchaseSelection, receipt?: PurchaseReceipt): ConfirmedPurchase {
  const effects = {
    approved: "Os materiais já em mãos entraram no estoque familiar.",
    pending: "As chegadas dos materiais já em mãos aguardam o administrador.",
    rejected: "Uma chegada desta compra foi rejeitada.",
    correction_requested: "Uma chegada desta compra aguarda correção pelo autor.",
  };
  const waiting = lines.some(line => !line.inHand);
  const summary = [
    receipt ? effects[receipt.state] : null,
    waiting ? (receipt ? "Os demais materiais aguardam a entrega da loja." : "Os materiais aguardam a entrega da loja.") : null,
  ].filter(Boolean).join(" ");
  let balances: PurchaseEntryBalances = [];
  if (receipt?.state === "approved" && document.purchaseEntryBalances) {
    try {
      balances = requirePurchaseEntryBalances(document.purchaseEntryBalances, document);
    } catch {
      // An unavailable historical balance does not invalidate the confirmed purchase.
    }
  }
  const balanceByLine = new Map(balances.map(balance => [balance.lineId, balance]));
  return { documentId: document.id, summary, materials: lines.map(line => {
    const material = document.lines.find(item => item.id === line.lineId);
    const arrival = line.inHand ? receipt : undefined;
    const unit = material?.unit_snapshot;
    let status = line.expectedDate ? "Previsão da loja " + formatPurchaseDate(line.expectedDate) : "Aguardando entrega da loja";
    if (arrival?.state === "approved") status = "Chegada validada e incorporada ao estoque familiar";
    if (arrival?.state === "pending") status = "Chegada aguardando aprovação do administrador";
    if (arrival?.state === "rejected") status = "Chegada registrada e posteriormente rejeitada";
    if (arrival?.state === "correction_requested") status = "Chegada aguardando correção pelo autor";
    let entryStock: EntryStock | undefined;
    if (arrival?.state === "approved") {
      const balance = balanceByLine.get(line.lineId);
      entryStock = "unavailable";
      if (balance?.entry?.receiptId === arrival.id) {
        if (balance.state === "restricted") entryStock = "restricted";
        if (balance.state === "known") entryStock = {
          before: formatQuantity(quantity(balance.quantity).minus(balance.entry.enteredQuantity).toFixed(), unit),
          entered: formatQuantity(balance.entry.enteredQuantity, unit),
          after: formatQuantity(balance.quantity, unit),
        };
      }
    }
    return {
      id: line.lineId,
      name: material?.name_snapshot ?? "Material da compra",
      amount: formatQuantity(line.quantity, unit),
      status, waitingForStore: !line.inHand, entryStock,
    };
  }) };
}

export function PurchaseResult({ result, mayReadStock, onClose }: { result: ConfirmedPurchase; mayReadStock: boolean; onClose: () => void }) {
  return <Dialog open success title="Compra registrada" subtitle={result.summary} onClose={onClose}
    footer={<ActionButton variant="primary" onClick={onClose}><Icon name="check" />Concluir</ActionButton>}>
    <ul className="hca-purchase-list">
      {result.materials.map(line => <li className="hca-purchase-line" key={line.id}>
        <div className="hca-purchase-line-heading"><strong>{line.name}</strong><span>{line.amount}</span></div>
        <p className="hca-purchase-limit"><span>{line.status}</span>{line.waitingForStore ? " · Estoque sem alteração" : null}</p>
        {line.entryStock ? <details className="hca-arrival-stock">
          <summary><Icon name="stock" />Estoque familiar</summary>
          {!mayReadStock || line.entryStock === "restricted" ? <p>Acesso ao estoque familiar restrito.</p>
            : line.entryStock === "unavailable" ? <p>Saldo desta entrada indisponível.</p>
              : <DefinitionGrid items={[
                { label: "Antes da entrada", value: line.entryStock.before },
                { label: "Entrada confirmada", value: line.entryStock.entered },
                { label: "Depois da entrada", value: line.entryStock.after },
              ]} />}
        </details> : null}
      </li>)}
    </ul>
  </Dialog>;
}
