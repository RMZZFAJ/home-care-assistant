import type { DocumentSummary } from "./documents";

export type DashboardTask = {
  id: string;
  title: string;
  description: string;
  href: string;
  kind: "science" | "delivery" | "purchase" | "balance" | "archive" | "occurrence";
  priority: "normal" | "attention";
};
export type CriticalStock = { productId: string; name: string; unit: string; custody: string; confirmed: string; minimum: string };
export type DashboardData = {
  requests: number; receipts: number; teamReceipts: number; purchases: number;
  disputes: number; balances: number; recent: DocumentSummary[];
  balDay: number | null; balOverdue: boolean; balDue: string;
  drafts: number; consumptionPending: number; sciencePending: number; archivePending: number;
  pendingTasks: DashboardTask[];
  criticalStock: CriticalStock[];
  balanceEligibility?: { available: boolean; href: string; dueAt: string | null };
  nextShift?: { id: string; professionalName: string; professional_id: string; starts_at: string; ends_at: string; timezone: string; active: boolean; shift_types: {name:string} | null } | null;
};
