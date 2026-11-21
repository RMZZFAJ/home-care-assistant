import type { ReactNode } from "react";

export function MaterialChoice({ selected, quantity = false, urgent, className = "", materialId, children }: {
  selected: boolean; quantity?: boolean; urgent?: boolean; className?: string; materialId?: string; children: ReactNode;
}) {
  return <article data-wizard-material={materialId} data-urgent={urgent || undefined} className={["hca-material-choice", selected ? "is-selected" : "", quantity ? "hca-material-choice-with-quantity" : "", className].filter(Boolean).join(" ")}>{children}</article>;
}
