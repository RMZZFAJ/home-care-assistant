"use client";

import { Notice } from "@/components/workspace";
import { formatQuantity, quantity, validQuantity } from "@/lib/quantity";
import type { PresentationSelection, ProductPresentation } from "@/types/catalogue";
import type { CatalogProduct } from "@/types/documents";
import { MaterialBarcodeDialog, type MaterialBarcodeConversion } from "./material-barcode-dialog";
import { presentationTotal } from "./presentation-quantity";
import type { WizardState } from "./supply-wizard-step";

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
  function prepareApplication({ product, presentation, packages, amount, valid, usesCatalogFactor }: MaterialBarcodeConversion<CatalogProduct>) {
    const decimals = product.quantity_decimals ?? 0;
    const currentSelections = form.presentationSelections?.[product.id] ?? [];
    const existing = currentSelections.find(row => row.id === presentation?.id);
    const versionConflict = Boolean(existing && existing.version !== presentation?.version);
    const currentManual = (form.manualQuantities?.[product.id] ?? form.quantities[product.id]) || "0";
    const currentValid = validQuantity(currentManual, decimals, true) && currentSelections.every(row =>
      (row === existing && !row.packages) || /^[1-9][0-9]{0,8}$/.test(row.packages));
    const selections = currentSelections.slice();
    let manual = currentManual;
    if (currentValid && valid && !versionConflict) {
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
    const total = currentValid && valid ? presentationTotal(selections, manual) : "";
    const canApply = !versionConflict && validQuantity(total, decimals);
    return {
      apply: canApply ? () => onApply({ product, selections, manual }) : undefined,
      summary: canApply && !quantity(total).eq(amount)
        ? <small>Total do material após incluir: <b>{formatQuantity(total, product.unit)}</b></small> : null,
      details: <>
        {versionConflict ? <Notice error>O fator cadastrado mudou. Compare as versões em Editar embalagens do material antes de continuar.</Notice> : null}
        {valid && !versionConflict && !canApply ? <Notice error>Confira as quantidades que já estão no preenchimento.</Notice> : null}
        {canApply && !usesCatalogFactor ? <p className="hca-field-help">Este ajuste será incluído como quantidade manual em {product.unit}.</p> : null}
      </>,
    };
  }

  return <MaterialBarcodeDialog patientId={patientId} products={catalog} presentations={presentations}
    precision={product => product.quantity_decimals ?? 0} prepareApplication={prepareApplication}
    onClose={onClose} finalFocus={finalFocus} />;
}
