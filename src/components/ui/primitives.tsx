"use client";

import {documentStatusLabel} from "@/lib/documents/presentation";
import { documentStatuses } from "@/types/documents";

import { useEffect, useRef, type ReactNode } from "react";
export { Dialog } from "./overlays";
import { Icon } from "./icon";
export { Icon, type IconName } from "./icon";

export function StatusBadge({ status }: { status: string }) {
  const tone = !Object.hasOwn(documentStatuses,status)?"neutral":[
    "approved",
    "confirmed",
    "received",
    "delivered",
    "read",
    "completed",
    "closed_below_quantity",
  ].includes(status)
    ? "success"
    : ["disputed", "rejected", "failed", "cancelled"].includes(status)
      ? "danger"
      : ["draft", "reported"].includes(status)
        ? "neutral"
        : "pending";
  return (
    <span className={`hca-status hca-status--${tone}`}>
      {documentStatusLabel(status)}
    </span>
  );
}
export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="ui-empty">
      <span className="ui-empty-icon">
        <Icon name="forms" />
      </span>
      <h2>{title}</h2>
      {children ? <p>{children}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
export function StepNavigator({
  steps,
  active,
  onChange,
  disabled = false,
  label = "Etapas da ficha",
}: {
  steps: string[];
  active: number;
  onChange: (step: number) => void;
  disabled?: boolean;
  label?: string;
}) {
  const containerRef = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const current = containerRef.current?.querySelector<HTMLButtonElement>(
      '[aria-current="step"]',
    );
    if (current && containerRef.current)
      containerRef.current.scrollTo({
        left:
          current.offsetLeft -
          containerRef.current.offsetLeft -
          containerRef.current.clientWidth / 2 +
          current.clientWidth / 2,
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      });
  }, [active]);
  return (
    <nav className="wizard-navigation" aria-label={label}>
      <div className="wizard-progress-label">
        <span>
          Etapa {active + 1} de {steps.length}
        </span>
        <strong>{steps[active]}</strong>
      </div>
      <ol
        ref={containerRef}
        className="wizard-steps"
        tabIndex={0}
        aria-label="Barra de etapas; use as setas do teclado para rolar"
      >
        {steps.map((step, index) => (
          <li key={step}>
            <button
              type="button"
              className="hca-step-control"
              aria-current={index === active ? "step" : undefined}
              disabled={disabled || index > active}
              onClick={() => onChange(index)}
            >
              <span>
                {index < active ? (
                  <Icon name="check" width="14" height="14" />
                ) : (
                  index + 1
                )}
              </span>
              {step}
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
