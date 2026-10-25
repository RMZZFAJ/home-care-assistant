"use client";
import { Notice, Workspace } from "@/components/workspace";
import { useWorkspaceState } from "@/components/layout/workspace-context";
import { RequisitionDocumentContent } from "@/components/requisitions/requisition-detail";
import { SupplyDocumentContent } from "./supply-detail";

/** All document URLs use the same frame; adapters retain their domain contracts. */
export function DocumentViewer({ id }: { id: string }) {
  const { data, loading } = useWorkspaceState();
  const document = data?.documentContext?.id === id ? data.documentContext : null;
  return <Workspace title={document?.type === "REQ" ? "Requisição e acompanhamento" : "Acompanhamento da ficha"}>{(context) => document ? document.type === "REQ" ? <RequisitionDocumentContent key={id} id={id} context={context} /> : <SupplyDocumentContent key={id} id={id} context={context} /> : <Notice error={!loading}>{loading ? "Identificando documento autorizado…" : "Documento não encontrado ou indisponível neste contexto."}</Notice>}</Workspace>;
}
