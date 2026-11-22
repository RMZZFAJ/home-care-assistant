"use client";
import type { WorkspaceContext } from "@/components/workspace";
import type { CatalogProduct } from "@/types/documents";
import type { ConsumptionReport } from "@/types/consumption";
import type { ReminderOrigin } from "@/components/notifications/notification-reference";
import { ConsumptionPreparation } from "./consumption-preparation";
export function ConsumptionEditor(props: {
  context: WorkspaceContext;
  report?: ConsumptionReport;
  products: CatalogProduct[];
  catalogError: string;
  catalogLoading: boolean;
  onCatalogRetry: () => void;
  onClose: () => void;
  onSaved: (id: string, data?: ConsumptionReport) => void;
  restoreFocusTo?: HTMLElement | null;
  sourceReminder?: ReminderOrigin;
}) {
  return <ConsumptionPreparation {...props} />;
}
