import type { ReactNode } from "react";

/** Canonical table surface with a keyboard-accessible local scroll boundary. */
export function TableFrame({ label, children }: { label: string; children: ReactNode }) {
  return <div className="hca-table-frame" tabIndex={0} role="region" aria-label={label + "; rolagem horizontal quando necessária"}>{children}</div>;
}
