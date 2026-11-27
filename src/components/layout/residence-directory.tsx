"use client";

import Link from "next/link";
import { useState } from "react";
import { ActionButton, TextInput } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { roleLabel } from "@/lib/role-labels";
import type { PatientContext } from "@/types/workspace";

export const residenceDirectoryPageSize = 20;
const normalizeName = (name: string) =>
  name.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("pt-BR");

export function ResidenceDirectory({ patients, onSelect, showRoles = false, currentId, disabled }: {
  patients: PatientContext[];
  onSelect?: (id: string) => void;
  showRoles?: boolean;
  currentId?: string;
  disabled?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [requestedPage, setRequestedPage] = useState(1);
  const query = normalizeName(search.trim());
  const matches = query ? patients.filter(patient => normalizeName(patient.display_name).includes(query)) : patients;
  const pageSize = residenceDirectoryPageSize;
  const totalPages = Math.max(1, Math.ceil(matches.length / pageSize));
  const page = Math.min(requestedPage, totalPages);
  const visible = matches.slice((page - 1) * pageSize, page * pageSize);

  return <>
    <div className="p-4">
      <TextInput type="search" disabled={disabled} aria-label={showRoles ? "Buscar perfil autorizado" : "Buscar paciente"} placeholder="Buscar paciente pelo nome" value={search} onChange={event => {
        setSearch(event.currentTarget.value);
        setRequestedPage(1);
      }} />
    </div>
    <div aria-label="Resultados da busca por paciente" role="region" className="hca-residence-directory-results">
      {visible.map(patient => {
        const details = <>
          <span className="hca-record-main">
            <strong>{patient.display_name}</strong>
            <small>{showRoles ? roleLabel(patient.role) : patient.is_active === false ? "Inativo · histórico preservado" : "Cadastro ativo"}
              {showRoles && patient.is_active === false ? " · Paciente inativo" : null}</small>
          </span>
          <Icon name="arrow" />
        </>;
        return onSelect
          ? <button key={patient.id} type="button" className="hca-record" disabled={disabled} aria-current={currentId === patient.id ? true : undefined} onClick={() => onSelect(patient.id)}>{details}</button>
          : <Link key={patient.id} href={"/admin?section=patient&careRecipientId=" + patient.id} className="hca-record" prefetch={false}>{details}</Link>;
      })}
      {!matches.length ? <p role="status" className="p-4 text-sm text-(--muted)">
        {patients.length ? "Nenhum paciente corresponde à busca." : "Nenhum paciente cadastrado."}
      </p> : null}
    </div>
    {totalPages > 1 ? <nav aria-label="Páginas de pacientes" className="flex flex-wrap items-center justify-between gap-2 p-4">
      <ActionButton compact disabled={disabled || page === 1} onClick={() => setRequestedPage(page - 1)}>Anterior</ActionButton>
      <span role="status" className="text-sm">Página {page} de {totalPages}</span>
      <ActionButton compact disabled={disabled || page === totalPages} onClick={() => setRequestedPage(page + 1)}>Próxima</ActionButton>
    </nav> : null}
  </>;
}
