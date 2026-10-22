"use client";

import { useEffect, useId, useRef, type ReactNode, type SVGProps } from "react";
import { documentStatuses } from "@/types/documents";

export type IconName =
  | "menu"
  | "close"
  | "home"
  | "forms"
  | "history"
  | "stock"
  | "settings"
  | "bell"
  | "user"
  | "search"
  | "chevron"
  | "arrow"
  | "check"
  | "camera"
  | "upload"
  | "plus";
const paths: Record<IconName, ReactNode> = {
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  home: (
    <>
      <path d="m3 10 9-7 9 7v10H3ZM9 21v-8h6v8" />
    </>
  ),
  forms: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 8h6M9 12h6M9 16h4" />
    </>
  ),
  history: (
    <>
      <path d="M3 11a9 9 0 1 1 2.4 7M3 4v7h7M12 7v5l3 2" />
    </>
  ),
  stock: <path d="m3 7 9-4 9 4v10l-9 4-9-4ZM3 7l9 4 9-4M12 11v10M7.5 5l9 4" />,
  settings: (
    <>
      <path d="m9 3-1 3-3 1-2 4 2 3 1 4 4 1 3 2 4-2 1-4 3-3-2-4-3-1-1-3Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  bell: <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />,
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
    </>
  ),
  search: (
    <>
      <circle cx="10" cy="10" r="6" />
      <path d="m15 15 6 6" />
    </>
  ),
  chevron: <path d="m6 9 6 6 6-6" />,
  arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
  check: <path d="m5 12 4 4L19 6" />,
  camera: (
    <>
      <path d="M3 7h4l2-3h6l2 3h4v13H3Z" />
      <circle cx="12" cy="13" r="4" />
    </>
  ),
  upload: <path d="M4 16v5h16v-5M12 16V3m-5 5 5-5 5 5" />,
  plus: <path d="M12 4v16M4 12h16" />,
};
export function Icon({
  name,
  ...props
}: SVGProps<SVGSVGElement> & { name: IconName }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
export function StatusBadge({ status }: { status: string }) {
  const tone = [
    "approved",
    "confirmed",
    "received",
    "delivered",
    "read",
  ].includes(status)
    ? "success"
    : ["disputed", "rejected", "failed", "cancelled"].includes(status)
      ? "danger"
      : ["draft", "reported"].includes(status)
        ? "neutral"
        : "pending";
  return (
    <span className={"ui-badge ui-badge-" + tone}>
      {documentStatuses[status] ?? status}
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
export function Dialog({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const node = dialogRef.current;
    if (open) node?.showModal();
    else node?.close();
    return () => node?.close();
  }, [open]);
  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={id}
      className="ui-dialog"
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div>
        <div className="ui-dialog-heading">
          <h2 id={id}>{title}</h2>
          <button
            type="button"
            className="ui-icon-button"
            aria-label="Fechar diálogo"
            onClick={onClose}
          >
            <Icon name="close" />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
