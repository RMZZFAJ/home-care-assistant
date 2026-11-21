"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { z } from "zod";
import { BarcodeScanner } from "@/components/catalog/barcode-scanner";
import { ActionButton, CheckboxField, FormField, TextInput } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { Dialog } from "@/components/ui/overlays";
import { inputClass, Notice } from "@/components/workspace";
import { formatQuantity, quantity, validQuantity } from "@/lib/quantity";
import { useScopedRead } from "@/lib/use-scoped-read";
import type { ProductPresentation } from "@/types/catalogue";

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

type Material = { id: string; name: string; unit: string };
type Presentation = ReturnType<typeof readPresentations>["data"][number];

export type MaterialBarcodeConversion<Product extends Material> = {
  product: Product;
  presentation: Presentation | undefined;
  packages: string;
  amount: string;
  valid: boolean;
  usesCatalogFactor: boolean;
};

type Application = {
  apply?: () => void;
  label?: string;
  summary?: ReactNode;
  details?: ReactNode;
};

const standardPresentations = [
  { value: "box", name: "Caixa", factor: "" },
  { value: "package", name: "Pacote", factor: "" },
  { value: "pair", name: "Par", factor: "2" },
  { value: "unit", name: "Unidade", factor: "1" },
];
const otherPresentation = { value: "manual", name: "Outra apresentação", factor: "" };
const manualPresentations = [...standardPresentations, otherPresentation];
const arrivalPresentations = [
  ...standardPresentations,
  { value: "bottle", name: "Frasco", factor: "" },
  { value: "tube", name: "Tubo", factor: "" },
  { value: "roll", name: "Rolo", factor: "" },
  otherPresentation,
];

export function MaterialBarcodeDialog<Product extends Material>({
  patientId, products, presentations = [], precision, maxPackageDigits = 9, arrival = false, prepareApplication, onClose, finalFocus,
}: {
  patientId: string;
  products: readonly Product[];
  presentations?: readonly ProductPresentation[];
  precision: (product: Product) => number;
  maxPackageDigits?: number;
  arrival?: boolean;
  prepareApplication: (conversion: MaterialBarcodeConversion<Product>) => Application;
  onClose: () => void;
  finalFocus?: () => HTMLElement | false;
}) {
  const [code, setCode] = useState("");
  const [correcting, setCorrecting] = useState(false);
  const [presentationChoice, setPresentationChoice] = useState("");
  const [packages, setPackages] = useState("1");
  const [factorOverride, setFactorOverride] = useState<string | null>(null);
  const [manualAmount, setManualAmount] = useState<string | null>(null);
  const resultActionRef = useRef<HTMLButtonElement>(null);
  const params = new URLSearchParams({ careRecipientId: patientId, barcode: code });
  const read = useScopedRead(code ? `/api/catalog/presentations?${params}` : null, "", readPresentations);
  const scanned = read.data?.data.find(row => row.active && row.care_recipient_id === patientId &&
    row.barcode === code && validQuantity(String(row.base_quantity), 6));
  const product = products.find(item => item.id === scanned?.product_id);
  const alternatives = presentations.filter(row => row.active && row.care_recipient_id === patientId &&
    row.product_id === product?.id && row.id !== scanned?.id && validQuantity(String(row.base_quantity), 6));
  const presentation = presentationChoice ? alternatives.find(row => row.id === presentationChoice) : scanned;
  const manualOptions = arrival ? arrivalPresentations : manualPresentations;
  const manualPresentation = manualOptions.find(option => option.value === presentationChoice);
  const presentationName = presentation?.name ?? manualPresentation?.name ?? "Outra apresentação";
  const defaultFactor = presentation ? quantity(presentation.base_quantity).toFixed() : manualPresentation?.factor ?? "";
  const factor = factorOverride ?? defaultFactor;
  const calculated = /^[1-9][0-9]*$/.test(packages) && packages.length <= maxPackageDigits &&
    validQuantity(packages, 0) && validQuantity(factor, 6)
    ? quantity(packages).mul(quantity(factor)).toFixed() : "";
  const amount = manualAmount ?? calculated;
  const validAmount = Boolean(product && calculated && validQuantity(amount, precision(product)));
  const usesCatalogFactor = Boolean(presentation && validAmount &&
    quantity(factor).eq(presentation.base_quantity) && quantity(amount).eq(calculated));
  const result = product && scanned && !read.loading && !read.error
    ? prepareApplication({ product, presentation, packages, amount, valid: validAmount, usesCatalogFactor }) : null;
  const recognized = Boolean(result);
  const unknown = Boolean(code && read.data && !result && !read.loading && !read.error);
  useEffect(() => {
    resultActionRef.current?.focus({ preventScroll: true });
  }, [recognized, unknown, read.error]);

  function chooseCode(next: string) {
    setCode(next);
    setCorrecting(false);
    setPresentationChoice("");
    setPackages("1");
    setFactorOverride(null);
    setManualAmount(null);
  }

  const title = arrival ? "Ler código da chegada" : "Ler código";
  const subtitle = arrival ? "Confira a apresentação e a quantidade que serão usadas neste lançamento."
    : "Confira o material e sua unidade padrão antes de incluir.";
  const unknownSubtitle = arrival ? "O código informado não corresponde a um material disponível nesta chegada."
    : "O código informado está indisponível para os materiais desta ficha.";
  return <Dialog open title={unknown ? "Código não cadastrado" : title}
    kicker={arrival ? undefined : "Identificação do material"} subtitle={unknown ? unknownSubtitle : subtitle}
    onClose={onClose} finalFocus={finalFocus} keyboardScrollable popupClassName="hca-supply-barcode"
    footer={unknown ? <>
      <ActionButton ref={resultActionRef} onClick={() => chooseCode("")}>Tentar outro código</ActionButton>
      <ActionButton variant="primary" onClick={onClose}>Selecionar na lista</ActionButton>
    </> : <>
      <ActionButton onClick={onClose}>{arrival ? "Voltar à chegada" : "Voltar"}</ActionButton>
      {result ? <ActionButton variant="primary" disabled={!validAmount || !result.apply} onClick={result.apply}>
        <Icon name="check" />{result.label ?? (arrival ? "Usar esta quantidade" : "Usar material")}
      </ActionButton> : null}
    </>}>
    <div className="hca-form-stack">
      {!code ? <BarcodeScanner onRead={chooseCode} /> : null}
      {read.loading ? <p role="status">Consultando o catálogo…</p> : null}
      {read.error ? <Notice error>{read.error} <ActionButton ref={resultActionRef} onClick={read.refresh}>Tentar novamente</ActionButton></Notice> : null}
      {unknown ? <Notice>Selecione o material pela lista ou leia outro código.</Notice> : null}
      {result && product && scanned ? <section className={arrival ? "hca-purchase-line hca-arrival-barcode-result" : "hca-form-stack"}
        aria-label="Conversão da apresentação">
        <div className="hca-source-summary hca-supply-barcode-material">
          {!arrival ? <span className="hca-source-symbol"><Icon name="box" /></span> : null}
          <div><strong>{product.name}</strong><small>{arrival ? `Unidade do estoque · ${product.unit}` : `${code} · Unidade do catálogo: ${product.unit}`}</small></div>
          <ActionButton ref={arrival ? resultActionRef : undefined} variant="quiet" compact aria-label="Ler outro código" onClick={() => chooseCode("")}>
            <Icon name="refresh" />
          </ActionButton>
        </div>
        {!arrival ? <div className="hca-supply-barcode-presentation">
          <div><small>Apresentação</small><strong>{presentationName}{validQuantity(factor, 6)
            ? ` · ${formatQuantity(factor, product.unit)}` : " · Informe o fator"}</strong></div>
          <ActionButton ref={resultActionRef} variant="quiet" compact aria-expanded={correcting} onClick={() => setCorrecting(value => !value)}>
            <Icon name="edit" />{correcting ? "Recolher" : "Corrigir"}
          </ActionButton>
        </div> : null}
        {arrival || correcting ? <>
          <label className="hca-form-stack text-sm font-semibold">
            {arrival ? "Apresentação lida" : "Tipo de apresentação"}
            <select className={inputClass} value={presentationChoice} onChange={event => {
              setPresentationChoice(event.currentTarget.value);
              setFactorOverride(null);
              setManualAmount(null);
            }}>
              <optgroup label="Apresentações do catálogo">
                <option value="">{scanned.name}</option>
                {alternatives.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}
              </optgroup>
              <optgroup label="Conversão manual">
                {manualOptions.map(option => <option key={option.value} value={option.value}>{option.name}</option>)}
              </optgroup>
            </select>
          </label>
          <div className={arrival ? "hca-arrival-barcode-quantities" : "grid grid-cols-2 items-end gap-3"}>
            <FormField label={arrival ? "Embalagens recebidas" : "Quantidade lida"}>
              <span className={arrival ? "hca-purchase-quantity" : "contents"}>
                <TextInput inputMode="numeric" maxLength={maxPackageDigits} value={packages} onChange={event => setPackages(event.currentTarget.value)} />
                {arrival ? <span aria-hidden="true">emb.</span> : null}
              </span>
            </FormField>
            <FormField label={arrival ? "Por embalagem" : "Unidades por apresentação"}>
              <span className={arrival ? "hca-purchase-quantity" : "contents"}>
                <TextInput inputMode="decimal" maxLength={17} value={factor} onChange={event => setFactorOverride(event.currentTarget.value)} />
                {arrival ? <span aria-hidden="true">{product.unit}</span> : null}
              </span>
            </FormField>
          </div>
          <CheckboxField label="Corrigir o total convertido" checked={manualAmount !== null}
            onChange={event => setManualAmount(event.currentTarget.checked ? calculated : null)} />
          {manualAmount !== null ? <FormField label={`Total corrigido em ${product.unit}`}>
            <TextInput inputMode="decimal" maxLength={17} value={manualAmount} onChange={event => setManualAmount(event.currentTarget.value)} />
          </FormField> : null}
        </> : null}
        <div className="hca-supply-barcode-total" aria-live="polite">
          {arrival ? <span className="hca-arrival-barcode-increment">
            <Icon name={validAmount ? "check" : "info"} width={14} height={14} />
            {validAmount ? `${formatQuantity(amount, product.unit)} nesta leitura` : "Confira os valores"}
          </span> : <>
            <strong>{validAmount ? formatQuantity(amount, product.unit) : "Confira os valores"}</strong>
            <small>Quantidade que entrará na ficha</small>
          </>}
          {result.summary}
        </div>
        {result.details}
      </section> : null}
    </div>
  </Dialog>;
}
