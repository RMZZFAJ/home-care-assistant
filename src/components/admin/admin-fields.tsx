"use client";
import { CheckboxField, FormField, SelectField, TextInput, type TextInputProps } from "@/components/ui/controls";
import { useId } from "react";

export type Row = Record<string, unknown>;

import {roleLabels as roles} from "@/lib/role-labels";
export {roles};
export function text(row: Row, key: string) {
  return row[key] == null ? "" : String(row[key]);
}
export function bool(row: Row, key: string, fallback = false) {
  return typeof row[key] === "boolean" ? (row[key] as boolean) : fallback;
}
export function Field({
  name,
  label,
  value = "",
  type = "text",
  required = false,
  min,
  max,
  step,
}: {
  name: string;
  label: string;
  value?: string | number;
  type?: TextInputProps["type"];
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
}) {
  const id = useId();
  return (
    <FormField label={label} htmlFor={id}>
      <TextInput
        id={id}
        name={name}
        defaultValue={String(value)}
        type={type}
        required={required}
        min={min}
        max={max}
        step={step}
      />
    </FormField>
  );
}
export function Check({
  name,
  label,
  checked = false,
}: {
  name: string;
  label: string;
  checked?: boolean;
}) {
  return <CheckboxField name={name} defaultChecked={checked} label={label} />;
}
export function RoleSelect({ value = "professional" }: { value?: string }) {
  return (
    <FormField label="Função neste paciente">
      <SelectField name="role" defaultValue={value}>
        {Object.entries(roles).map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </SelectField>
    </FormField>
  );
}
