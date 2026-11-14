"use client";
import type { WorkspaceContext } from "@/components/workspace";
import type { CatalogProduct } from "@/types/documents";
import type { ConsumptionReport } from "@/types/consumption";
import { ConsumptionPreparation } from "./consumption-preparation";
export function ConsumptionDecision({
  report,
  accept,
  context,
  products,
  onClose,
  onSaved,
}: {
  report: ConsumptionReport;
  accept: boolean;
  context: WorkspaceContext;
  products: CatalogProduct[];
  onClose: () => void;
  onSaved: (report: ConsumptionReport) => void;
}) {
  return (
    <ConsumptionPreparation
      context={context}
      report={report}
      products={products}
      accept={accept}
      onClose={onClose}
      onSaved={(_, result) => {
        if (result) onSaved(result);
      }}
    />
  );
}
