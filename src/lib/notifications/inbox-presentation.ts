import type { IconName } from "@/components/ui/icon";
import type { InboxKind, InboxNotification } from "./inbox";

export const inboxKinds: Record<InboxKind, string> = {
  REQ: "Requisições", ENT: "Entregas e devoluções", COM: "Compras e doações", BAL: "Balanços",
};

export const inboxTaskLabels: Record<NonNullable<InboxNotification["task"]>, string> = {
  "req.science": "Confirmar ciência na requisição",
  "ent.receive": "Conferir materiais recebidos",
  "com.approve": "Revisar itens da compra ou doação",
  "bal.review": "Revisar o balanço",
};

export function inboxNoticeIcon(row: InboxNotification): IconName {
  const type = row.operational_documents?.type;
  if (type === "REQ" || row.requisition_id) return "forms";
  if (type === "ENT" || type === "COM") return "box";
  if (type === "BAL" || row.event_key?.startsWith("bal.")) return "checklist";
  if (row.alert_event_id) return "alert";
  if (row.event_key?.startsWith("schedule.")) return "clock";
  return "bell";
}
