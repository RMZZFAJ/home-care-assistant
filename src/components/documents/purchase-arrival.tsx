"use client";

import { useId, useRef, useState } from "react";
import { BarcodeScanner } from "@/components/catalog/barcode-scanner";
import { ActionButton, SelectField, TextInput } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { Dialog } from "@/components/ui/overlays";
import { api, Notice } from "@/components/workspace";
import { arrivalRemaining } from "@/lib/documents/purchase";
import { formatQuantity, quantity, validQuantity } from "@/lib/quantity";
import type { PresentationsRead } from "@/types/catalogue";
import type { PurchaseReceipt, SupplyDocument, SupplyLine } from "@/types/documents";
import type { ProductStock } from "@/types/stock";
import { SupplyLineSummary } from "./supply-line-summary";
import { PurchaseCoverageFields, restoreArrivalPlanning, type ArrivalPlanningChoices } from "./purchase-coverage-fields";

type ArrivalField = { selected: boolean; value: string; remaining: string; excess: boolean; };
type ScannedArrival = { id: string; label: string; factor: string; unit: string; };

export function PurchaseArrivalResult({ receipt, lines, onClose }: {
  receipt: PurchaseReceipt; lines: SupplyLine[]; onClose: () => void;
}) {
  const approved = receipt.state === "approved";
  const hasReceivedQuantity = receipt.lines.some(row => quantity(row.quantity).gt(0));
  let title = "Chegada enviada para aprovação";
  let subtitle = "As quantidades recebidas ficam disponíveis após a aprovação do administrador.";
  if (approved) {
    title = hasReceivedQuantity ? "Entrada confirmada" : "Conferência registrada";
    subtitle = hasReceivedQuantity ? "A entrada das quantidades recebidas foi validada."
      : "A conferência foi registrada sem movimentação de estoque.";
  } else if (!hasReceivedQuantity) {
    subtitle = "A declaração aguarda a conferência do administrador.";
  }
  return <Dialog open success title={title} subtitle={subtitle}
    onClose={onClose} footer={<ActionButton variant="primary" onClick={onClose}><Icon name="check" />Concluir</ActionButton>}>
    <ul className="hca-purchase-list">{receipt.lines.map(row => {
      const line = lines.find(item => item.id === row.lineId);
      return <li className="hca-purchase-line" key={row.lineId}>
        <div className="hca-purchase-line-heading">
          <strong>{line?.name_snapshot ?? "Material da chegada"}</strong>
          <span>{formatQuantity(row.quantity, line?.unit_snapshot)}</span>
        </div>
        {row.remainingAction === "short" ? <p className="hca-purchase-limit">
          {approved ? "Falta registrada" : "Falta informada para conferência"}
        </p> : row.remainingAction === "wait" ? <p className="hca-purchase-limit">Aguardando nova entrega</p> : null}
      </li>;
    })}</ul>
  </Dialog>;
}

export function PurchaseArrivalFields({ data, lines, fields, directCredit, mayReadStock }: {
  data: SupplyDocument; lines: SupplyLine[]; fields?: Record<string, string>; directCredit: boolean; mayReadStock: boolean;
}) {
  const quantityGroupId = useId();
  const quantityLabel = "Recebidos agora";
  const [values, setValues] = useState<Record<string, ArrivalField>>(() => Object.fromEntries(lines.map(line => [line.id, {
    selected: fields ? fields[line.id + ":selected"] === "on" : lines.length === 1,
    value: fields?.[line.id] ?? "",
    remaining: fields?.[line.id + ":remainingAction"] ?? "wait",
    excess: fields?.[line.id + ":excess"] === "on",
  }])));
  const [scanner, setScanner] = useState(false);
  const [scanned, setScanned] = useState<ScannedArrival | null>(null);
  const [packages, setPackages] = useState("1");
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [scanError, setScanError] = useState("");
  const [planning, setPlanning] = useState<Record<string, ArrivalPlanningChoices>>(() =>
    Object.fromEntries(lines.map(line => [line.id, restoreArrivalPlanning(fields, line.id)])));
  const scanRevisionRef = useRef(0);
  const readingStockRef = useRef(false);
  const [stock, setStock] = useState<ProductStock[] | null>(null);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockError, setStockError] = useState(false);
  const details = lines.find(line => line.id === detailsId);

  function update(id: string, patch: Partial<ArrivalField>) {
    setValues(old => ({ ...old, [id]: { ...old[id], ...patch } }));
  }
  async function readCode(code: string) {
    const revision = ++scanRevisionRef.current;
    setScanned(null);
    setScanError("");
    const query = new URLSearchParams({ careRecipientId: data.care_recipient_id, barcode: code });
    const response = await api<PresentationsRead>("/api/catalog/presentations?" + query);
    if (scanRevisionRef.current !== revision) return;
    const match = response.data.find(item => item.active);
    const line = match && lines.find(item => item.product_id === match.product_id);
    if (!match || !line || !quantity(match.base_quantity).gt(0)) {
      setScanError("O código não corresponde a um material que ainda aguarda chegada nesta COM. Você pode preencher manualmente.");
      return;
    }
    setPackages("1");
    setScanned({ id: line.id, label: match.name, factor: quantity(match.base_quantity).toFixed(), unit: line.unit_snapshot });
  }
  function closeScanner() {
    scanRevisionRef.current++;
    setScanner(false);
  }
  function applyScan() {
    if (!scanned || !/^[1-9][0-9]{0,8}$/.test(packages)) return;
    const value = values[scanned.id]?.value || "0";
    if (!validQuantity(value, 6, true)) {
      setScanError("Confira a quantidade que já foi digitada antes de acrescentar as embalagens.");
      return;
    }
    update(scanned.id, {
      selected: true,
      value: quantity(value).plus(quantity(scanned.factor).mul(packages)).toFixed(),
      excess: false,
    });
    closeScanner();
  }
  async function readStock() {
    if (!mayReadStock || stock || readingStockRef.current) return;
    readingStockRef.current = true;
    setStockLoading(true);
    setStockError(false);
    try {
      const query = new URLSearchParams({ careRecipientId: data.care_recipient_id, custody: "FAMILY" });
      const result = await api<{ careRecipientId: string; overview: ProductStock[] }>("/api/stock/balances?" + query);
      if (result.careRecipientId !== data.care_recipient_id) throw new Error("Saldo de outro paciente.");
      setStock(result.overview);
    } catch {
      setStockError(true);
    } finally {
      readingStockRef.current = false;
      setStockLoading(false);
    }
  }

  return <>
    {directCredit ? <p className="hca-purchase-administrator"><Icon name="shield" />Aprovação automática · administrador</p> : null}
    <div className="hca-purchase-line-heading">
      <span className="inline-flex items-center gap-2 text-sm"><Icon name="truck" />{data.code} · {lines.length} materiais</span>
      <ActionButton variant="quiet" compact onClick={() => { setScanned(null); setScanError(""); setScanner(true); }}>
        <Icon name="camera" />Ler código
      </ActionButton>
    </div>
    {lines.map(line => {
      const expected = arrivalRemaining(line, data);
      const field = values[line.id] ?? { selected: false, value: "", remaining: "wait", excess: false };
      const physical = validQuantity(field.value, 6, true) ? quantity(field.value) : null;
      const confirmed = mayReadStock ? stock?.find(row => row.productId === line.product_id)?.family?.confirmed : undefined;
      const short = physical && physical.lt(expected);
      const excess = physical && physical.gt(expected);
      const quantityId = `${quantityGroupId}-${line.id}`;
      return <article key={line.id} className="hca-purchase-line">
        <div className="hca-purchase-line-heading">
          <div><h3>{line.name_snapshot}</h3><p>Aguardando {formatQuantity(expected.toFixed(), line.unit_snapshot)}</p></div>
          <label className="hca-purchase-switch">
            <span>Chegou?</span>
            <input type="checkbox" role="switch" name={line.id + ":selected"} checked={field.selected}
              aria-label={"Chegou · " + line.name_snapshot} onChange={event => update(line.id, { selected: event.currentTarget.checked })} />
          </label>
          <ActionButton variant="quiet" compact className="hca-purchase-options" aria-label={"Detalhes de " + line.name_snapshot}
            onClick={() => setDetailsId(line.id)}><Icon name="more" /></ActionButton>
        </div>
        {field.selected ? <>
          <div className="hca-purchase-field"><label htmlFor={quantityId}>{quantityLabel}</label>
            <span className="hca-purchase-quantity">
              <TextInput id={quantityId} name={line.id} inputMode="decimal" maxLength={64} required
                aria-label={`${quantityLabel} · ${line.name_snapshot} · ${line.unit_snapshot}`}
                value={field.value} onChange={event => update(line.id, { value: event.currentTarget.value, excess: false })} />
              <span aria-hidden="true">{line.unit_snapshot}</span>
            </span>
          </div>
          {short ? <label className="hca-purchase-field hca-arrival-attention">
            <span>Restam {formatQuantity(expected.minus(physical).toFixed(), line.unit_snapshot)}</span>
            <SelectField name={line.id + ":remainingAction"} aria-label={"Destino da falta · " + line.name_snapshot}
              value={field.remaining} onChange={event => update(line.id, { remaining: event.currentTarget.value })}>
              <option value="wait">Aguardar nova entrega</option>
              <option value="short">Encerrar com falta</option>
            </SelectField>
          </label> : null}
          {excess ? <label className="hca-purchase-status hca-arrival-attention">
            <input type="checkbox" name={line.id + ":excess"} checked={field.excess}
              onChange={event => update(line.id, { excess: event.currentTarget.checked })} />
            <span>Conferi {formatQuantity(physical.minus(expected).toFixed(), line.unit_snapshot)} a mais.</span>
          </label> : null}
          <PurchaseCoverageFields patientId={data.care_recipient_id} productId={line.product_id} material={line.name_snapshot}
            unit={line.unit_snapshot} source={{ id: data.id, code: data.code }} received={field.value}
            formLineId={line.id} directCredit={directCredit}
            value={planning[line.id] ?? {}} onChange={value => setPlanning(previous => ({ ...previous, [line.id]: value }))} />
          <details className="hca-arrival-stock" onToggle={event => { if (event.currentTarget.open) void readStock(); }}>
            <summary><Icon name="stock" />Estoque familiar</summary>
            {stockLoading ? <p role="status">Consultando o saldo familiar…</p> : null}
            {mayReadStock && stockError ? <p>Não foi possível consultar o saldo agora.</p> : null}
            {confirmed != null ? <p>Disponíveis hoje: {formatQuantity(confirmed, line.unit_snapshot)}
              {physical ? <> · {directCredit ? "Com esta entrada" : "Após aprovação"}: {formatQuantity(quantity(confirmed).plus(physical).toFixed(), line.unit_snapshot)}</> : null}
            </p> : null}
            <p>{directCredit ? "A entrada confirma a quantidade recebida hoje." : "A quantidade recebida fica disponível após a aprovação."}</p>
          </details>
        </> : null}
      </article>;
    })}
    <Dialog open={Boolean(details)} title="Detalhes do material" onClose={() => setDetailsId(null)}>
      {details ? <SupplyLineSummary line={details} type="COM" status={data.status}
        purchaseLine={data.purchaseProgress?.lines.find(row => row.lineId === details.id)} /> : null}
    </Dialog>
    <Dialog open={scanner} title="Ler código" subtitle="Identifique uma apresentação para acrescentar a quantidade à chegada."
      onClose={closeScanner}>
      <BarcodeScanner onRead={readCode} />
      {scanError ? <Notice error>{scanError}</Notice> : null}
      {scanned ? <div className="hca-purchase-line mt-3">
        <strong>{scanned.label}</strong><p>{formatQuantity(scanned.factor, scanned.unit)} por embalagem</p>
        <label className="hca-purchase-field"><span>Embalagens</span>
          <TextInput inputMode="numeric" value={packages} onChange={event => setPackages(event.currentTarget.value)} />
        </label>
        <ActionButton variant="primary" onClick={applyScan} disabled={!/^[1-9][0-9]{0,8}$/.test(packages)}>Usar quantidade</ActionButton>
      </div> : null}
    </Dialog>
  </>;
}
