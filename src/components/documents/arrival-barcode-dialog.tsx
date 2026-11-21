"use client";

import { Notice } from "@/components/workspace";
import { formatQuantity, quantity, validQuantity } from "@/lib/quantity";
import { MaterialBarcodeDialog, type MaterialBarcodeConversion } from "./material-barcode-dialog";

export function ArrivalBarcodeDialog<Product extends { id: string; name: string; unit: string }>({
  patientId, products, precision, currentAmount, onApply, onClose, finalFocus,
}: {
  patientId: string;
  products: readonly Product[];
  precision: (product: Product) => number;
  currentAmount: (product: Product) => string | undefined;
  onApply: (product: Product, amount: string) => void;
  onClose: () => void;
  finalFocus: () => HTMLElement | false;
}) {
  function prepareApplication({ product, amount, valid }: MaterialBarcodeConversion<Product>) {
    const decimals = precision(product);
    const before = currentAmount(product) || "0";
    const validBefore = validQuantity(before, decimals, true);
    const total = valid && validBefore ? quantity(before).plus(amount).toFixed() : "";
    const canApply = validQuantity(total, decimals);
    return {
      apply: canApply ? () => onApply(product, total) : undefined,
      summary: canApply && quantity(before).gt(0)
        ? <small>Total na chegada após incluir: <b>{formatQuantity(total, product.unit)}</b></small> : null,
      details: valid && !canApply ? <Notice error>{validBefore
        ? "O total excede o limite ou a precisão do material."
        : "Confira a quantidade já digitada antes de incluir esta leitura."}</Notice> : null,
    };
  }

  return <MaterialBarcodeDialog arrival patientId={patientId} products={products} precision={precision}
    prepareApplication={prepareApplication} onClose={onClose} finalFocus={finalFocus} />;
}
