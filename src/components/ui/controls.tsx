"use client";

import {
  createContext,
  use,
  useId,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import { Icon } from "./icon";

type Variant = "primary" | "secondary" | "quiet" | "danger";
type ButtonStyle = { variant?: Variant; compact?: boolean; roomy?: boolean };
const classes = (...values: (string | undefined | false)[]) =>
  values.filter(Boolean).join(" ");
function buttonClasses(
  { variant = "secondary", compact, roomy }: ButtonStyle,
  className?: string,
) {
  return classes(
    "hca-control",
    "btn",
    variant === "primary" ? "btn-primary" : variant === "quiet" ? "btn-ghost" : variant === "danger" ? "btn-danger" : undefined,
    `hca-control--${variant}`,
    compact && "hca-control--compact",
    roomy && "hca-control--roomy",
    className,
  );
}

export function ActionButton({
  variant,
  compact,
  roomy,
  className,
  type = "button",
  ...props
}: ComponentProps<"button"> & ButtonStyle) {
  return (
    <button
      {...props}
      type={type}
      className={buttonClasses({ variant, compact, roomy }, className)}
    />
  );
}
export function ActionLink({
  variant,
  compact,
  roomy,
  className,
  ...props
}: ComponentProps<"a"> & ButtonStyle) {
  return (
    <a
      {...props}
      className={buttonClasses({ variant, compact, roomy }, className)}
    />
  );
}

type FieldMetadata = {
  id: string;
  required?: boolean;
  helpId?: string;
  errorId?: string;
};
/** Canonical key/value composition;values remain complete at every viewport. */
export function DefinitionGrid({
  items, className, ...props
}: {
  items: readonly { key?: string; label: string; value: ReactNode; wide?: boolean }[];
} & ComponentProps<"dl">) {
  return (
    <dl {...props} className={["hca-definition-grid", className].filter(Boolean).join(" ")}>
      {items.map((item) => (
        <div
          key={item.key ?? item.label}
          className={item.wide ? "hca-definition-wide" : undefined}
        >
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
const FieldContext = createContext<FieldMetadata | null>(null);

export function FormField({
  label,
  htmlFor,
  helpText,
  error,
  required,
  children,
}: {
  label: ReactNode;
  htmlFor?: string;
  helpText?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  children: ReactNode;
}) {
  const generatedId = useId(),
    id = htmlFor ?? generatedId;
  const helpId = helpText ? `${id}-help` : undefined,
    errorId = error ? `${id}-error` : undefined;
  return (
    <FieldContext value={{ id, helpId, errorId, required }}>
      <div className="hca-field field">
        <label className="field-label" htmlFor={id}>
          {label}
          {required ? <span aria-hidden="true"> *</span> : null}
        </label>
        {children}
        {helpId ? (
          <p id={helpId} className="hca-field-help">
            {helpText}
          </p>
        ) : null}
        {errorId ? (
          <p id={errorId} className="hca-field-error">
            {error}
          </p>
        ) : null}
      </div>
    </FieldContext>
  );
}

export function useFieldAttributes(props: {
  id?: string;
  required?: boolean;
  "aria-invalid"?: ComponentProps<"input">["aria-invalid"];
  "aria-describedby"?: string;
  "aria-errormessage"?: string;
}) {
  const field = use(FieldContext);
  const describedBy =
    [
      ...new Set(
        [props["aria-describedby"], field?.helpId, field?.errorId].filter(
          Boolean,
        ),
      ),
    ].join(" ") || undefined;
  return {
    id: props.id ?? field?.id,
    required: props.required ?? field?.required,
    "aria-invalid":
      props["aria-invalid"] ?? (field?.errorId ? true : undefined),
    "aria-describedby": describedBy,
    "aria-errormessage": props["aria-errormessage"] ?? field?.errorId,
  };
}

export type TextInputProps = ComponentProps<"input"> & {
  leading?: ReactNode;
  roomy?: boolean;
};
export function TextInput({
  leading,
  roomy,
  className,
  ...props
}: TextInputProps) {
  const field = useFieldAttributes(props);
  const input = (
    <input
      {...props}
      {...field}
      className={classes(
        "hca-text-input input",
        roomy && "hca-text-input--roomy",
        className,
      )}
    />
  );
  return leading ? (
    <span className="hca-input-adornment">
      <span aria-hidden="true">{leading}</span>
      {input}
    </span>
  ) : (
    input
  );
}
export function SelectField({ className, ...props }: ComponentProps<"select">) {
  const field = useFieldAttributes(props);
  return (
    <select
      {...props}
      {...field}
      className={classes("hca-text-input input", className)}
    />
  );
}

export function PasswordInput({ revealLabel = "senha", ...props }: Omit<TextInputProps, "type" | "leading"> & { revealLabel?: string }) {
  const [visible, setVisible] = useState(false);
  const field = useFieldAttributes(props);
  return <span className="password-control"><TextInput {...props} {...field} type={visible ? "text" : "password"} /><button className="password-eye" type="button" aria-label={(visible ? "Ocultar " : "Mostrar ") + revealLabel} aria-pressed={visible} disabled={props.disabled} onClick={() => setVisible(current => !current)}><Icon name="eye" width={17} height={17} /></button></span>;
}
export function TextAreaField({
  className,
  ...props
}: ComponentProps<"textarea">) {
  const field = useFieldAttributes(props);
  return (
    <textarea
      {...props}
      {...field}
      className={classes("hca-text-input hca-textarea", className)}
    />
  );
}
export function CheckboxField({
  label,
  className,
  ...props
}: Omit<ComponentProps<"input">, "type"> & { label?: ReactNode }) {
  return (
    <label className={classes("hca-check", className)}>
      <input {...props} type="checkbox" />
      <span>{label}</span>
    </label>
  );
}

export type PillTone =
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "accent";
export function Pill({
  tone = "neutral",
  className,
  ...props
}: ComponentProps<"span"> & { tone?: PillTone }) {
  return (
    <span
      {...props}
      className={classes(
        "hca-status",
        `hca-status--${tone === "warning" ? "pending" : tone}`,
        className,
      )}
    />
  );
}
export function LoadingIndicator({
  label,
  compact = false,
}: {
  label?: ReactNode;
  compact?: boolean;
}) {
  return (
    <span
      className="hca-loading"
      role={label ? "status" : undefined}
      aria-hidden={label ? undefined : true}
    >
      <span
        className={classes("hca-spinner", compact && "hca-spinner--compact")}
      />
      {label}
    </span>
  );
}

export function DataTable({ className, ...props }: ComponentProps<"table">) {
  return <table {...props} className={classes("hca-data-table", className)} />;
}
export function DataTableHead(props: ComponentProps<"thead">) {
  return <thead {...props} />;
}
export function DataTableBody(props: ComponentProps<"tbody">) {
  return <tbody {...props} />;
}
export function DataTableRow(props: ComponentProps<"tr">) {
  return <tr {...props} />;
}
export function DataTableHeading({
  scope = "col",
  ...props
}: ComponentProps<"th">) {
  return <th {...props} scope={scope} />;
}
export function DataTableCell(props: ComponentProps<"td">) {
  return <td {...props} />;
}
