"use client";

import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { BarcodeScanner } from "@/components/catalog/barcode-scanner";
import { ActionButton, CheckboxField, FormField, TextInput } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { Dialog } from "@/components/ui/overlays";
import { inputClass, Notice } from "@/components/workspace";
import { formatQuantity, quantity, validQuantity } from "@/lib/quantity";
import { useScopedRead } from "@/lib/use-scoped-read";
import type { PresentationSelection, ProductPresentation } from "@/types/catalogue";
import type { CatalogProduct } from "@/types/documents";
import { presentationTotal } from "./presentation-quantity";
import type { WizardState } from "./supply-wizard-step";

const readPresentations = z.object({
  data: z.array(z.object({
    id: z.uuid(),
    care_recipient_id: z.uuid(),
    product_id: z.string(),
    name: z.string(),
    barcode: z.string(),
    version: z.number().int().positive(),
    active: z.boolean(),
    base_quantity: z.union([z.string().max(32).regex(/^\d+(?:\.\d+)?$/), z.number().min(0).max(1_000_000_000)]),
  })),
}).parse;

type BarcodeApplication = { product: CatalogProduct; selections: PresentationSelection[]; manual: string };

export function SupplyBarcodeDialog({ patientId, catalog, presentations, form, onApply, onClose, finalFocus }: {
  patientId: string;
  catalog: readonly CatalogProduct[];
  presentations: readonly ProductPresentation[];
  form: WizardState;
  onApply: (application: BarcodeApplication) => void;
  onClose: () => void;
  finalFocus: () => HTMLElement | false;
}) {
  const [code, setCode] = useState("");
  const [correcting, setCorrecting] = useState(false);
  const [presentationId, setPresentationId] = useState("");
  const [packages, setPackages] = useState("1");
  const [factorOverride, setFactorOverride] = useState<string | null>(null);
  const [manualAmount, setManualAmount] = useState<string | null>(null);
  const resultActionRef = useRef<HTMLButtonElement>(null);
  const params = new URLSearchParams({ careRecipientId: patientId, barcode: code });
  const read = useScopedRead(code ? `/api/catalog/presentations?${params}` : null, "", readPresentations);
  const scanned = read.data?.data.find(row => row.active && row.care_recipient_id === patientId &&
    row.barcode === code && validQuantity(String(row.base_quantity), 6));
  const product = catalog.find(item => item.id === scanned?.product_id);
  const alternatives = presentations.filter(row => row.active && row.care_recipient_id === patientId &&
    row.product_id === product?.id && row.id !== scanned?.id && validQuantity(String(row.base_quantity), 6));
  const presentation = presentationId ? alternatives.find(row => row.id === presentationId) : scanned;
  const factor = factorOverride ?? (presentation ? quantity(presentation.base_quantity).toFixed() : "");
  const calculated = /^[1-9][0-9]{0,8}$/.test(packages) && validQuantity(factor, 6)
    ? quantity(packages).mul(quantity(factor)).toFixed() : "";
  const amount = manualAmount ?? calculated;
  const decimals = product?.quantity_decimals ?? 0;
  const validAmount = Boolean(calculated) && validQuantity(amount, decimals);
  const usesCatalogFactor = Boolean(presentation && validAmount &&
    quantity(factor).eq(presentation.base_quantity) && quantity(amount).eq(calculated));
  const currentSelections = product ? form.presentationSelections?.[product.id] ?? [] : [];
  const existing = currentSelections.find(row => row.id === presentation?.id);
  const versionConflict = Boolean(existing && existing.version !== presentation?.version);
  const currentManual = product ? (form.manualQuantities?.[product.id] ?? form.quantities[product.id]) || "0" : "0";
  const currentValid = validQuantity(currentManual, decimals, true) && currentSelections.every(row =>
    (row === existing && !row.packages) || /^[1-9][0-9]{0,8}$/.test(row.packages));
  const selections = currentSelections.slice();
  let manual = currentManual;
  if (product && currentValid && validAmount && !versionConflict) {
    if (presentation && usesCatalogFactor) {
      const entry = {
        id: presentation.id,
        version: presentation.version,
        packages: quantity(existing?.packages || "0").plus(packages).toFixed(),
        name: presentation.name,
        barcode: presentation.barcode,
        baseQuantity: quantity(presentation.base_quantity).toFixed(),
        unit: product.unit,
      };
      const index = selections.findIndex(row => row.id === entry.id);
      if (index < 0) selections.push(entry);
      else selections[index] = entry;
    } else {
      manual = quantity(currentManual).plus(amount).toFixed();
    }
  }
  const total = product && currentValid && validAmount ? presentationTotal(selections, manual) : "";
  const recognized = Boolean(product && scanned && !read.loading && !read.error);
  const unknown = Boolean(code && read.data && !recognized && !read.loading && !read.error);
  const canApply = recognized && !versionConflict && validQuantity(total, decimals);
  useEffect(() => {
    resultActionRef.current?.focus({ preventScroll: true });
  }, [recognized, unknown, read.error]);

  function chooseCode(next: string) {
    setCode(next);
    setCorrecting(false);
    setPresentationId("");
    setPackages("1");
    setFactorOverride(null);
    setManualAmount(null);
  }

  return <Dialog open title={unknown ? "Código não cadastrado" : "Ler código"}
    kicker="Identificação do material" subtitle={unknown
      ? "O código informado está indisponível para os materiais desta ficha."
      : "Confira o material e sua unidade padrão antes de incluir."}
    onClose={onClose} finalFocus={finalFocus} keyboardScrollable popupClassName="hca-supply-barcode"
    footer={unknown ? <>
      <ActionButton ref={resultActionRef} onClick={() => chooseCode("")}>Tentar outro código</ActionButton>
      <ActionButton variant="primary" onClick={onClose}>Selecionar na lista</ActionButton>
    </> : <>
      <ActionButton onClick={onClose}>Voltar</ActionButton>
      {recognized && product ? <ActionButton variant="primary" disabled={!canApply}
        onClick={() => onApply({ product, selections, manual })}>
        <Icon name="check" />Usar material
      </ActionButton> : null}
    </>}>
    <div className="hca-form-stack">
      {!code ? <BarcodeScanner onRead={chooseCode} /> : null}
      {read.loading ? <p role="status">Consultando o catálogo…</p> : null}
      {read.error ? <Notice error>{read.error} <ActionButton ref={resultActionRef} onClick={read.refresh}>Tentar novamente</ActionButton></Notice> : null}
      {unknown ? <Notice>Selecione o material pela lista ou leia outro código.</Notice> : null}
      {recognized && product && scanned ? <section className="hca-form-stack" aria-label="Conversão da apresentação">
        <div className="hca-source-summary hca-supply-barcode-material">
          <span className="hca-source-symbol"><Icon name="box" /></span>
          <div><strong>{product.name}</strong><small>{code} · Unidade do catálogo: {product.unit}</small></div>
          <ActionButton variant="quiet" compact aria-label="Ler outro código" onClick={() => chooseCode("")}>
            <Icon name="refresh" />
          </ActionButton>
        </div>
        <div className="hca-supply-barcode-presentation">
          <div><small>Apresentação</small><strong>{presentation?.name ?? "Outra apresentação"}</strong>
            <small>{validQuantity(factor, 6) ? formatQuantity(factor, product.unit) : "Confira o fator"} por embalagem</small></div>
          <ActionButton ref={resultActionRef} variant="quiet" compact aria-expanded={correcting} onClick={() => setCorrecting(value => !value)}>
            <Icon name="edit" />{correcting ? "Recolher" : "Corrigir"}
          </ActionButton>
        </div>
        {correcting ? <>
          <label className="hca-form-stack text-sm font-semibold">
            Tipo de apresentação
            <select className={inputClass} value={presentationId} onChange={event => {
              setPresentationId(event.currentTarget.value);
              setFactorOverride(null);
              setManualAmount(null);
            }}>
              <option value="">{scanned.name}</option>
              {alternatives.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}
              <option value="manual">Outra apresentação</option>
            </select>
          </label>
          <div className="grid grid-cols-2 items-end gap-3">
            <FormField label="Quantidade lida">
              <TextInput inputMode="numeric" maxLength={9} value={packages} onChange={event => setPackages(event.currentTarget.value)} />
            </FormField>
            <FormField label="Unidades por apresentação">
              <TextInput inputMode="decimal" maxLength={17} value={factor} onChange={event => setFactorOverride(event.currentTarget.value)} />
            </FormField>
          </div>
          <CheckboxField label="Corrigir o total convertido" checked={manualAmount !== null}
            onChange={event => setManualAmount(event.currentTarget.checked ? calculated : null)} />
          {manualAmount !== null ? <FormField label={`Total corrigido em ${product.unit}`}>
            <TextInput inputMode="decimal" maxLength={17} value={manualAmount} onChange={event => setManualAmount(event.currentTarget.value)} />
          </FormField> : null}
        </> : null}
        <div className="hca-supply-barcode-total" aria-live="polite">
          <strong>{validAmount ? formatQuantity(amount, product.unit) : "Confira os valores"}</strong>
          <small>Quantidade que entrará na ficha</small>
          {canApply && !quantity(total).eq(amount) ? <small>Total do material após incluir: <b>{formatQuantity(total, product.unit)}</b></small> : null}
        </div>
        {versionConflict ? <Notice error>O fator cadastrado mudou. Compare as versões em Editar embalagens do material antes de continuar.</Notice> : null}
        {validAmount && !versionConflict && !canApply ? <Notice error>Confira as quantidades que já estão no preenchimento.</Notice> : null}
        {canApply && !usesCatalogFactor ? <p className="hca-field-help">Este ajuste será incluído como quantidade manual em {product.unit}.</p> : null}
      </section> : null}
    </div>
  </Dialog>;
}
