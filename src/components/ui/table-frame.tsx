"use client";
import type { ReactNode } from "react";
import { useScrollableRegion } from "./use-scrollable-region";

/** Canonical table surface with a keyboard-accessible local scroll boundary. */
export function TableFrame({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  const scrollRegion = useScrollableRegion<HTMLDivElement>();
  return <div {...scrollRegion} className={className ?? "hca-table-frame"} role="region"
    aria-label={className ? label : label + "; rolagem horizontal quando necessária"}>{children}</div>;
}
