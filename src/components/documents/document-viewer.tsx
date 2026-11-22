"use client";
import { Notice, Workspace } from "@/components/workspace";
import { useWorkspaceState } from "@/components/layout/workspace-context";
import { RequisitionDocumentContent } from "@/components/requisitions/requisition-detail";
import { SupplyDocumentContent } from "./supply-detail";
import { RequisitionOpening } from "@/components/requisitions/requisition-opening";
import { MaterialVisitReturn, useMaterialVisit } from "./material-visit-return";
import { MaterialVisitProductContext } from "./material-visit-context";

/** All document URLs use the same frame; adapters retain their domain contracts. */
export function DocumentViewer({ id }: { id: string }) {
  const { data, loading } = useWorkspaceState();
  const document =
    data?.documentContext?.id === id ? data.documentContext : null;
  const visit = useMaterialVisit(id, document?.patientId ?? "");
  return (
    <Workspace
      documentPage
      title={
        document?.type === "REQ"
          ? "Requisição e acompanhamento"
          : "Acompanhamento da ficha"
      }
    >
      {(context) =>
        document ? (
          <MaterialVisitProductContext value={visit || null}>
            <MaterialVisitReturn targetId={id} patientId={document.patientId} />
            {document.type === "REQ" ? (
              <RequisitionOpening standalone key={id} id={id}>
                <RequisitionDocumentContent id={id} context={context} />
              </RequisitionOpening>
            ) : (
              <SupplyDocumentContent key={id} id={id} context={context} />
            )}
          </MaterialVisitProductContext>
        ) : (
          <>
            {context.patient ? <MaterialVisitReturn targetId={id} patientId={context.patient.id} /> : null}
            <h1>Acompanhamento da ficha</h1>
            <Notice error={!loading}>
              {loading
                ? "Identificando documento autorizado…"
                : "Documento não encontrado ou indisponível neste contexto."}
            </Notice>
          </>
        )
      }
    </Workspace>
  );
}
