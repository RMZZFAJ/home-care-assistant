import type { IconName } from "@/components/ui/icon";
import type { StockOperationHistory } from "@/lib/validation/stock-reads";

export const stockCustodyLabels = { FAMILY: "Família", CARE_TEAM: "Equipe", TRANSIT: "Em trânsito" };

export const stockOperationOrigins = {
  manual: { title: "Lançamento manual", icon: "edit" },
  COM: { title: "Compra e chegada", icon: "box" },
  CON: { title: "Consumo", icon: "note" },
  REQ: { title: "Requisição", icon: "file" },
  ENT: { title: "Entrega", icon: "truck" },
  DEV: { title: "Devolução", icon: "truck" },
  BAL: { title: "Balanço", icon: "check-circle" },
  inventory: { title: "Inventário", icon: "check-circle" },
  other: { title: "Movimentação", icon: "history" },
} satisfies Record<StockOperationHistory["origin"], { title: string; icon: IconName }>;
