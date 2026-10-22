"use client";
import { inputClass } from "@/components/workspace";
export type Row = Record<string, unknown>;

export const roles = {
  admin: "Administrador do paciente",
  supervisor: "Supervisor",
  professional: "Profissional",
  family: "Familiar",
  reader: "Leitor",
};
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
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-sm font-semibold">
      {label}
      <input
        name={name}
        defaultValue={value}
        type={type}
        required={required}
        className={inputClass}
      />
    </label>
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
  return (
    <label className="flex min-h-11 items-center gap-2 text-sm">
      <input
        type="checkbox"
        name={name}
        defaultChecked={checked}
        className="h-5 w-5 accent-(--brand)"
      />
      {label}
    </label>
  );
}
export function RoleSelect({ value = "professional" }: { value?: string }) {
  return (
    <label className="text-sm font-semibold">
      Função neste paciente
      <select name="role" defaultValue={value} className={inputClass}>
        {Object.entries(roles).map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}
