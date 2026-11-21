"use client";

import type { ComponentProps, ReactNode } from "react";
import { Icon } from "./icon";

export function FeedbackBanner({ tone = "info", role, className, heading, children, ...props }: ComponentProps<"div"> & {
  tone?: "info" | "warning" | "error" | "success"; heading?: ReactNode;
}) {
  return <div {...props} role={role ?? (tone === "error" ? "alert" : "status")} className={["hca-banner", `hca-banner--${tone}`, className].filter(Boolean).join(" ")}>
    <Icon name={tone === "error" || tone === "warning" ? "alert" : tone === "success" ? "check" : "info"} />
    <div className="min-w-0">{heading ? <strong>{heading}</strong> : null}{children}</div>
  </div>;
}

export function ProgressMeter({ value, max = 1, ...props }: Omit<ComponentProps<"div">, "children"> & { value: number; max?: number }) {
  const ceiling = Number.isFinite(max) && max > 0 ? max : 1;
  const amount = Number.isFinite(value) ? Math.max(0, Math.min(value, ceiling)) : undefined;
  return <div {...props} className={["hca-progress-meter", props.className].filter(Boolean).join(" ")} role="progressbar" aria-valuemin={0} aria-valuemax={ceiling} aria-valuenow={amount}>
    <span style={{ width: amount === undefined ? "0%" : `${amount * 100 / ceiling}%` }} />
  </div>;
}
