"use client";
import { useId } from "react";
import { Checkbox, Field as FluentField, Input, Select, type InputProps } from "@fluentui/react-components";
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
}: {
  name: string;
  label: string;
  value?: string | number;
  type?: InputProps["type"];
  required?: boolean;
}) {
  const id = useId();
  return (
    <FluentField label={{ children: label, htmlFor: id }}>
      <Input
        id={id}
        name={name}
        defaultValue={String(value)}
        type={type}
        required={required}
      />
    </FluentField>
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
  return <Checkbox name={name} defaultChecked={checked} label={label} />;
}
export function RoleSelect({ value = "professional" }: { value?: string }) {
  return (
    <FluentField label="Função neste paciente">
      <Select name="role" defaultValue={value}>
        {Object.entries(roles).map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </Select>
    </FluentField>
  );
}
