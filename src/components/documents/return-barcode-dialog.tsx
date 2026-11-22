"use client";

import { Notice } from "@/components/workspace";
import { formatQuantity, quantity } from "@/lib/quantity";
import type { TransferPreparation } from "@/types/transfers";
import { MaterialBarcodeDialog, type MaterialBarcodeConversion } from "./material-barcode-dialog";

type Product = TransferPreparation["products"][number];

export function ReturnBarcodeDialog({ patientId, products, amounts, onApply, onClose, finalFocus }: {
  patientId: string;
  products: readonly Product[];
  amounts: ReadonlyMap<string, { quantity: string }>;
  onApply: (product: Product, amount: string) => void;
  onClose: () => void;
  finalFocus: () => HTMLElement | false;
}) {
  function prepareApplication({ product, amount, valid }: MaterialBarcodeConversion<Product>) {
    const inStock = valid && quantity(amount).lte(product.available);
    const replacing = Boolean(amounts.get(product.id)?.quantity);
    return {
      apply: inStock ? () => onApply(product, quantity(amount).toFixed()) : undefined,
      label: replacing ? "Atualizar quantidade" : undefined,
      summary: <small>Estoque atual da equipe: <b>{formatQuantity(product.available, product.unit)}</b></small>,
      details: <>
        {valid && !inStock ? <Notice error>A quantidade excede o estoque disponível para devolução.</Notice> : null}
        {replacing ? <p className="hca-field-help">A quantidade atual deste material será atualizada.</p> : null}
      </>,
    };
  }

  return <MaterialBarcodeDialog patientId={patientId} products={products} precision={product => product.quantityDecimals}
    maxPackageDigits={10} prepareApplication={prepareApplication} onClose={onClose} finalFocus={finalFocus} />;
}
