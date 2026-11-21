import { Icon } from "@/components/ui/icon";
import type { DocumentSummary } from "@/types/documents";
export function RequisitionScienceBadge({ state, compact = false }: { state: NonNullable<DocumentSummary["requisitionState"]>["scienceState"]; compact?: boolean }) {
  const label = { recorded: "Ciência registrada", pending: "Ciência pendente", waived: "Exigência dispensada", unavailable: "Ciência não comprovada" }[state];
  return <span className={compact ? `science-dot${state === "recorded" ? " is-done" : ""}` : `badge badge-${state === "recorded" ? "success" : state === "pending" ? "warning" : "neutral"}`}><Icon name={state === "recorded" ? "check" : state === "pending" ? "clock" : "info"} width={12} height={12} />{label}</span>;
}
