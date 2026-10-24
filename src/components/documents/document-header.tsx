"use client";
import type { ReactNode, Ref } from "react";
import { StatusBadge } from "@/components/ui/primitives";
import { DocumentActions } from "./document-actions";
import { formatBrazilDate } from "@/lib/receipt";
import { documentLabels, type DocumentType } from "@/types/documents";

export function DocumentHeader({ id, type, code, status, protocol, version, createdAt, dateLabel, patientName, children, observedRef }: {
  id: string; type: DocumentType; code: string; status: string; protocol: string | null; version: number; createdAt: string | null;
  dateLabel?: string; patientName?: string; children?: ReactNode; observedRef?: Ref<HTMLElement>;
}) {
  return <section className="ui-card hca-document-header" ref={observedRef}><div className="hca-document-identity"><span className="document-type">{type}</span><div><p className="eyebrow">{documentLabels[type]}</p><h2>{code}</h2></div><StatusBadge status={status} /></div><p className="hca-document-date">{dateLabel ?? formatBrazilDate(createdAt)} · Versão {version}</p>{patientName ? <p className="mt-3 text-sm">Paciente: {patientName}</p> : null}{children}<div className="hca-document-header-footer">{protocol ? <DocumentActions id={id} code={code} version={version} /> : null}<details><summary>Protocolo e identificação</summary><dl><dt>Protocolo</dt><dd>{protocol ?? "Rascunho ainda não emitido"}</dd><dt>Identificador</dt><dd>{id}</dd></dl></details></div></section>;
}
