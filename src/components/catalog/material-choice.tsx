import type { ReactNode } from "react";

export function MaterialChoice({ selected, quantity = false, className = "", children }: {
  selected: boolean; quantity?: boolean; className?: string; children: ReactNode;
}) {
  return <article className={["hca-material-choice", selected ? "is-selected" : "", quantity ? "hca-material-choice-with-quantity" : "", className].filter(Boolean).join(" ")}>{children}</article>;
}
