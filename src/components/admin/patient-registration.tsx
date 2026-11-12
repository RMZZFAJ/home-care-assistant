"use client";
import type { FormEvent } from "react";
import Link from "next/link";
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
  destinations = [],
}: {
  patient?: PatientContext;
  globalMode: boolean;
  creating: boolean;
  onToggle: () => void;
  destinations?: { href: string; title: string }[];
  handle: (
    event: FormEvent<HTMLFormElement>,
    payload: (form: FormData) => Row,
    message?: string,
    refresh?: boolean,
  ) => void;
}) {
  if(globalMode&&(creating||!patient?.id))return <section className={`${panelClass} hca-admin-card`}><h2>Preparar nova residência</h2><p className="my-3">O roteiro reúne cadastro, administração inicial e tarefas de preparação. O início do atendimento exige a conferência das pessoas responsáveis.</p><Link className={primaryClass} href="/preparar-residencia">Preparar residência</Link>{patient?.id?<button type="button" className={buttonClass} onClick={onToggle}>Voltar ao paciente atual</button>:null}</section>;
  return (
    <div className="hca-administration-grid">
    <section className={`${panelClass} hca-admin-card`} aria-label="Cadastro do paciente">
      <h2 className="mb-4">Cadastro do paciente</h2>
      <form
        key={creating ? "new" : (patient?.id ?? "none")}
        className="grid min-w-0 gap-4 min-[501px]:grid-cols-2"
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
    {destinations.length ? <section className={`${panelClass} hca-admin-card`} aria-label="Acessos diretos do paciente">
      <h2>Acessos diretos</h2>
      <nav aria-label="Destinos autorizados do paciente" className="hca-admin-shortcuts">{destinations.map(destination => <Link key={destination.href} className={buttonClass} href={destination.href} prefetch={false}>{destination.title}</Link>)}</nav>
      <p className="hca-field-hint mt-4">Os acessos usam seu perfil atual. Alterar o cadastro não confirma ciência, recebimento nem movimentação de materiais.</p>
    </section> : null}
    </div>
  );
}
