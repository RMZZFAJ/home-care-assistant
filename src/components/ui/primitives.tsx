"use client";

import { useEffect, useRef, type ReactNode, type SVGProps } from "react";
import {
  Badge,
  Button,
  Dialog as FluentDialog,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
} from "@fluentui/react-components";
import { Navigation20Regular, Dismiss20Regular, Home20Regular, DocumentBulletList20Regular, History20Regular, Box20Regular, Settings20Regular, Alert20Regular, Person20Regular, Search20Regular, ChevronDown20Regular, ArrowRight20Regular, Checkmark20Regular, Camera20Regular, ArrowUpload20Regular, Add20Regular, Calendar20Regular, People20Regular, VehicleTruck20Regular, MoreHorizontal20Regular } from "@fluentui/react-icons";
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
  | "plus"
  | "calendar"
  | "team"
  | "truck"
  | "more";
const icons = {
  menu: Navigation20Regular, close: Dismiss20Regular, home: Home20Regular,
  forms: DocumentBulletList20Regular, history: History20Regular, stock: Box20Regular,
  settings: Settings20Regular, bell: Alert20Regular, user: Person20Regular,
  search: Search20Regular, chevron: ChevronDown20Regular, arrow: ArrowRight20Regular,
  check: Checkmark20Regular, camera: Camera20Regular, upload: ArrowUpload20Regular,
  plus: Add20Regular, calendar: Calendar20Regular, team: People20Regular,
  truck: VehicleTruck20Regular, more: MoreHorizontal20Regular,
};
export function Icon({ name, ...props }: SVGProps<SVGSVGElement> & { name: IconName }) {
  const Component = icons[name];
  return <Component width={20} height={20} aria-hidden="true" {...props} />;
}
export function StatusBadge({ status }: { status: string }) {
  const tone = [
    "approved",
    "confirmed",
    "received",
    "delivered",
    "read",
    "completed",
  ].includes(status)
    ? "success"
    : ["disputed", "rejected", "failed", "cancelled"].includes(status)
      ? "danger"
      : ["draft", "reported"].includes(status)
        ? "neutral"
        : "pending";
  return (
    <Badge appearance="tint" color={tone === "success" ? "success" : tone === "danger" ? "danger" : tone === "pending" ? "warning" : "informative"}>
      {documentStatuses[status] ?? status}
    </Badge>
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
            <Button
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
            </Button>
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
  return (
    <FluentDialog open={open} onOpenChange={(_, data) => { if (!data.open) onClose(); }}>
      <DialogSurface className="hca-dialog-surface">
        <DialogBody>
          <DialogTitle action={<Button appearance="subtle" aria-label="Fechar diálogo" icon={<Icon name="close" />} onClick={onClose} />}>
            {title}
          </DialogTitle>
          <DialogContent className="hca-dialog-content">{children}</DialogContent>
        </DialogBody>
      </DialogSurface>
    </FluentDialog>
  );
}
