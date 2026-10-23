"use client";
import type { FormEvent } from "react";
import {
  buttonClass,
  panelClass,
  primaryClass,
  type PatientContext,
} from "../workspace";
import { Field, Check, bool, type Row } from "./admin-fields";
export function PatientRegistration({
  patient,
  globalMode,
  creating,
  onToggle,
  handle,
}: {
  patient?: PatientContext;
  globalMode: boolean;
  creating: boolean;
  onToggle: () => void;
  handle: (
    event: FormEvent<HTMLFormElement>,
    payload: (form: FormData) => Row,
    message?: string,
    refresh?: boolean,
  ) => void;
}) {
  return (
    <section className={panelClass}>
      <h2 className="mb-4 text-lg font-semibold">Cadastro do paciente</h2>
      <form
        key={creating ? "new" : (patient?.id ?? "none")}
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={(event) =>
          handle(
            event,
            (data) => ({
              action: "recipient",
              id: creating ? null : (patient?.id ?? null),
              displayName: data.get("displayName"),
              isActive: data.has("isActive"),
              isDevelopment: globalMode
                ? data.has("isDevelopment")
                : patient?.is_development === true,
              ...((creating || !patient?.id) && globalMode
                ? {
                    initialAdministratorEmail: data.get(
                      "initialAdministratorEmail",
                    ),
                  }
                : {}),
            }),
            "Paciente salvo.",
            true,
          )
        }
      >
        <Field
          name="displayName"
          label="Nome de exibição"
          value={creating ? "" : (patient?.display_name ?? "")}
          required
        />
        {(creating || !patient?.id) && globalMode ? (
          <div>
            <Field
              name="initialAdministratorEmail"
              label="E-mail da conta administradora inicial"
              type="email"
              required
            />
            <p className="mt-2 text-xs text-(--muted)">
              Conta ativa com e-mail confirmado. O vínculo inicial é explícito e
              auditado; a atuação global permanece separada.
            </p>
          </div>
        ) : null}
        <div>
          <Check
            name="isActive"
            label="Paciente ativo"
            checked={creating ? true : patient?.is_active !== false}
          />
          {globalMode && (
            <Check
              name="isDevelopment"
              label="Cadastro de desenvolvimento"
              checked={bool(
                (patient as unknown as Row) ?? {},
                "is_development",
              )}
            />
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          <button className={primaryClass} type="submit">
            {creating || !patient?.id ? "Criar paciente" : "Salvar paciente"}
          </button>
          {globalMode && patient?.id && (
            <button className={buttonClass} type="button" onClick={onToggle}>
              {creating ? "Editar atual" : "Novo paciente"}
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
