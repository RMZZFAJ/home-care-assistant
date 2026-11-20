"use client";

import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { BarcodeScanner } from "@/components/catalog/barcode-scanner";
import { ActionButton, CheckboxField, FormField, TextInput } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { Dialog } from "@/components/ui/overlays";
import { Notice } from "@/components/workspace";
import { formatQuantity, quantity, validQuantity } from "@/lib/quantity";
import { useScopedRead } from "@/lib/use-scoped-read";
import type { TransferPreparation } from "@/types/transfers";

const readPresentations = z.object({
  data: z.array(z.object({
    care_recipient_id: z.uuid(),
    product_id: z.string(),
    name: z.string(),
    barcode: z.string(),
    active: z.boolean(),
    base_quantity: z.union([z.string().max(32).regex(/^\d+(?:\.\d+)?$/), z.number().min(0).max(1_000_000_000)]),
  })),
}).parse;
type Product = TransferPreparation["products"][number];

export function ReturnBarcodeDialog({ patientId, products, amounts, onApply, onClose }: {
  patientId: string;
  products: readonly Product[];
  amounts: ReadonlyMap<string, { quantity: string }>;
  onApply: (product: Product, amount: string) => void;
  onClose: () => void;
}) {
  const [code, setCode] = useState("");
  const [packs, setPacks] = useState("1");
  const [editedFactor, setEditedFactor] = useState<string | null>(null);
  const [manualAmount, setManualAmount] = useState<string | null>(null);
  const packsRef = useRef<HTMLInputElement>(null);
  const params = new URLSearchParams({ careRecipientId: patientId, barcode: code });
  const read = useScopedRead(code ? "/api/catalog/presentations?" + params : null, "", readPresentations);
  const presentation = read.data?.data.find(row => row.active && row.barcode === code && row.care_recipient_id === patientId);
  const product = products.find(item => item.id === presentation?.product_id);
  const savedFactor = presentation ? quantity(presentation.base_quantity) : null;
  const recognized = Boolean(product && savedFactor?.gt(0));
  const factor = editedFactor ?? savedFactor?.toFixed() ?? "";
  const conversion = validQuantity(packs, 0) && validQuantity(factor, 6)
    ? quantity(packs).mul(quantity(factor)).toFixed() : "";
  const amount = manualAmount ?? conversion;
  const valid = product ? validQuantity(amount, product.quantityDecimals) : false;
  const inStock = Boolean(product && valid && quantity(amount).lte(product.available));
  const replacing = Boolean(product && amounts.get(product.id)?.quantity);
  useEffect(() => {
    if (recognized) packsRef.current?.focus({ preventScroll: true });
  }, [recognized]);
  function chooseCode(next: string) {
    setCode(next);
    setPacks("1");
    setEditedFactor(null);
    setManualAmount(null);
  }
  return <Dialog open title="Ler código do material" kicker="Devolução"
    subtitle="Confira a apresentação e a quantidade na unidade de estoque."
    onClose={onClose} keyboardScrollable
    footer={<>
      <ActionButton onClick={onClose}>Voltar ao preenchimento</ActionButton>
      {recognized && product ? <ActionButton variant="primary" disabled={!inStock}
        onClick={() => onApply(product, quantity(amount).toFixed())}>
        <Icon name="check" />{replacing ? "Atualizar quantidade" : "Usar quantidade"}
      </ActionButton> : null}
    </>}>
    <div className="hca-form-stack">
      {!recognized ? <BarcodeScanner onRead={chooseCode} /> : null}
      {read.loading ? <p role="status">Consultando o catálogo…</p> : null}
      {read.error ? <Notice error>{read.error} <ActionButton onClick={read.refresh}>Tentar novamente</ActionButton></Notice> : null}
      {code && read.data && !recognized ? <Notice>
        Este código está indisponível para os materiais desta devolução. Você pode selecionar o material na lista.
      </Notice> : null}
      {recognized && product && presentation ? <section className="hca-form-stack" aria-label="Conversão da apresentação">
        <div className="hca-source-summary">
          <span className="hca-source-symbol"><Icon name="box" /></span>
          <div><strong>{product.name}</strong><small>{presentation.name} · {code}</small></div>
          <ActionButton compact variant="quiet" className="hca-control-icon" aria-label="Ler outro código"
            onClick={() => chooseCode("")}><Icon name="refresh" /></ActionButton>
        </div>
        <div className="grid grid-cols-2 items-end gap-3">
          <FormField label="Embalagens">
            <TextInput ref={packsRef} inputMode="numeric" value={packs} onChange={event => setPacks(event.currentTarget.value)} />
          </FormField>
          <FormField label={`Quantidade por embalagem em ${product.unit}`}>
            <TextInput inputMode="decimal" value={factor} onChange={event => setEditedFactor(event.currentTarget.value)} />
          </FormField>
        </div>
        <CheckboxField label="Ajustar quantidade final" checked={manualAmount !== null}
          onChange={event => setManualAmount(event.currentTarget.checked ? conversion : null)} />
        {manualAmount !== null ? <FormField label={`Quantidade final em ${product.unit}`}>
          <TextInput inputMode="decimal" value={manualAmount} onChange={event => setManualAmount(event.currentTarget.value)} />
        </FormField> : null}
        <div className="hca-wizard-return-source">
          <span>Quantidade para a ficha</span>
          <strong>{valid ? formatQuantity(amount, product.unit) : "Confira os valores"}</strong>
          <span>Estoque atual da equipe</span><strong>{formatQuantity(product.available, product.unit)}</strong>
        </div>
        {valid && !inStock ? <Notice error>A quantidade excede o estoque disponível para devolução.</Notice> : null}
        {replacing ? <p className="hca-field-help">A quantidade atual deste material será atualizada.</p> : null}
      </section> : null}
    </div>
  </Dialog>;
}
