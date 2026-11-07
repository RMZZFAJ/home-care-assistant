export type ConsumptionLine = {
  productId: string;
  quantity: string;
  unit: string;
  name?: string;
};
export type ConsumptionSummary = {
  id: string;
  care_recipient_id: string;
  kind: "consumption" | "shortage";
  location: "FAMILY" | "CARE_TEAM";
  status: "reported" | "confirmed" | "rejected";
  body: string;
  created_at: string;
  version: number;
  reported_by: string;
  reported_name: string | null;
};
export type ConsumptionReport = ConsumptionSummary & {
  source_reminder_id?:string|null;
  lines: ConsumptionLine[];
  current_lines: ConsumptionLine[];
  confirmed_by: string | null;
  confirmed_at: string | null;
  revisions: {
    id: string;
    version: number;
    actor_id: string;
    actor_name: string | null;
    body: string;
    lines: ConsumptionLine[];
    created_at: string;
  }[];
  decision: {
    id: string;
    version: number;
    actor_id: string;
    actor_name: string | null;
    accepted: boolean;
    reason: string | null;
    created_at: string;
  } | null;
  movements: {
    id: string;
    productId: string;
    quantity: string;
    source: string;
    destination: string | null;
    createdAt: string;
  }[];
  replayed?: boolean;
};
