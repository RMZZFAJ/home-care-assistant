"use client";

import { useCallback } from "react";
import { ActionButton, Pill } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { documentArchiveReference } from "@/lib/documents/document-archive";
import { useScopedRead } from "@/lib/use-scoped-read";

export function DocumentArchivePolicy({ id, patientId, version }: { id: string; patientId: string; version: number }) {
  const decode = useCallback((value: unknown) => {
    const reference = documentArchiveReference.parse(value);
    if (reference.documentId !== id || reference.patientId !== patientId || reference.version !== version)
      throw new Error("Prazo indisponível para esta versão da ficha.");
    return reference;
  }, [id, patientId, version]);
  const policy = useScopedRead(`/api/documents/${id}/lifecycle/archive`, String(version), decode);
  const days = !policy.loading && !policy.error ? policy.data?.archiveDays : undefined;

  return <div className="hca-document-archive-policy">
    <span className="hca-wizard-material-icon"><Icon name="archive" /></span>
    <div>{days === undefined ? <>
      <strong>Prazo de arquivamento</strong>
      {policy.loading ? <p role="status">Consultando política da residência…</p> : <p>Prazo indisponível nesta consulta.</p>}
    </> : <>
      <strong>Arquivamento em {days} {days === 1 ? "dia" : "dias"}</strong>
      <p>Política da residência. Até o arquivamento, a ficha aceita andamentos e emissão de PDF conforme o acesso.</p>
    </>}</div>
    {days !== undefined ? <Pill tone="info">Política padrão</Pill> : policy.error && !policy.loading ?
      <ActionButton compact onClick={policy.refresh}>Consultar prazo novamente</ActionButton> : null}
  </div>;
}
