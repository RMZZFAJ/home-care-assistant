"use client";

import type { ReactNode } from "react";
import { Icon } from "@/components/ui/icon";

export function DashboardComplements({ simple, title, children }: { simple: boolean; title: string; children: ReactNode }) {
  if (!simple) return children;
  return <details className="card hca-home-complement" style={{ width: "100%" }}>
    <summary className="card-body flex cursor-pointer list-none items-center justify-between gap-2 font-semibold">
      {title}<Icon name="down" />
    </summary>
    <div className="card-body space-y-3">{children}</div>
  </details>;
}
