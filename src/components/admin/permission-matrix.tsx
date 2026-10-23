"use client";
import { useState } from "react";
import { capabilityLabels } from "@/lib/capability-labels";
import { inputClass } from "@/components/workspace";
import { roles } from "./admin-fields";
type Definition = { code: string; default_roles: string[]; critical: boolean };
type Override = {
  capability: string;
  subject_role: string | null;
  subject_user: string | null;
  enabled: boolean;
};
export function PermissionMatrix({
  definitions,
  overrides,
  directory,
  busy,
  configure,
}: {
  definitions: Definition[];
  overrides: Override[];
  directory: { id: string; name: string; role: string }[];
  busy: boolean;
  configure: (
    kind: string,
    change: Record<string, unknown>,
  ) => Promise<boolean>;
}) {
  const [person, setPerson] = useState("");
  const columns = person
    ? [[person, directory.find((row) => row.id === person)?.name ?? "Pessoa"]]
    : Object.entries(roles);
  return (
    <section className="ui-card" aria-label="Matriz de permissões">
      <h2 className="font-semibold">
        Permissões por função e exceções pessoais
      </h2>
      <label className="my-4 block max-w-md text-sm font-semibold">
        Visualizar
        <select
          className={inputClass}
          value={person}
          onChange={(event) => setPerson(event.target.value)}
        >
          <option value="">Todas as funções</option>
          {directory.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
            </option>
          ))}
        </select>
      </label>
      <p className="mb-4 text-xs text-(--muted)">
        Herdar usa a regra da função, ou o padrão do sistema. Exceções pessoais
        prevalecem. Administração do paciente é própria do vínculo e não pode
        ser concedida por uma exceção.
      </p>
      <div className="space-y-0 divide-y divide-(--line)">
        {definitions.map((def) => (
          <div key={def.code} className="py-4">
            <h3 className="mb-2 text-sm font-semibold">
              {capabilityLabels[def.code] ?? def.code}
              {def.critical ? " · crítica" : ""}
            </h3>
            <div
              className={
                "grid gap-3 " +
                (person ? "" : "grid-cols-2 sm:grid-cols-3 xl:grid-cols-5")
              }
            >
              {columns.map(([id, name]) => {
                const override = overrides.find(
                  (row) =>
                    row.capability === def.code &&
                    (person
                      ? row.subject_user === id
                      : row.subject_role === id),
                );
                const role = person
                  ? directory.find((row) => row.id === person)?.role
                  : id;
                const inherited = person
                  ? (overrides.find(
                      (row) =>
                        row.capability === def.code &&
                        row.subject_role === role,
                    )?.enabled ?? def.default_roles.includes(role ?? ""))
                  : def.default_roles.includes(id);
                return (
                  <label key={id} className="min-w-0 text-xs">
                    <span>{name}</span>
                    <select
                      className={inputClass}
                      aria-label={`${capabilityLabels[def.code] ?? def.code} · ${name}`}
                      disabled={busy || def.code === "access.manage"}
                      value={override ? String(override.enabled) : "inherit"}
                      onChange={(event) =>
                        void configure("capability", {
                          capability: def.code,
                          [person ? "subjectUser" : "subjectRole"]: id,
                          enabled:
                            event.target.value === "inherit"
                              ? null
                              : event.target.value === "true",
                        })
                      }
                    >
                      <option value="inherit">
                        Herdar · {inherited ? "permitido" : "restrito"}
                      </option>
                      <option value="true">Permitir</option>
                      <option value="false">Restringir</option>
                    </select>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
