"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useSyncExternalStore } from "react";
import { Notice, Workspace } from "@/components/workspace";
import { useWorkspaceState } from "@/components/layout/workspace-context";
import { RequisitionDocumentContent } from "@/components/requisitions/requisition-detail";
import { Icon } from "@/components/ui/icon";
import { materialVisitParam, matchesMaterialVisit } from "@/lib/documents/material-visit";
import { SupplyDocumentContent } from "./supply-detail";
import { RequisitionOpening } from "@/components/requisitions/requisition-opening";

const noSubscription = () => () => {};
const noServerVisit = () => false;

/** All document URLs use the same frame; adapters retain their domain contracts. */
export function DocumentViewer({ id }: { id: string }) {
  const { data, loading } = useWorkspaceState();
  const router = useRouter();
  const visit = useSearchParams().get(materialVisitParam);
  const document =
    data?.documentContext?.id === id ? data.documentContext : null;
  const canReturn = useSyncExternalStore(noSubscription,
    () => Boolean(visit && document && matchesMaterialVisit(id, document.patientId, visit)),
    noServerVisit,
  );
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
          <>
            {canReturn ? <button className="hca-material-panel-back" type="button" onClick={() => router.back()}>
              <Icon name="back" width={14} height={14} />Voltar ao painel
            </button> : null}
            {document.type === "REQ" ? (
              <RequisitionOpening standalone key={id} id={id}>
                <RequisitionDocumentContent id={id} context={context} />
              </RequisitionOpening>
            ) : (
              <SupplyDocumentContent key={id} id={id} context={context} />
            )}
          </>
        ) : (
          <>
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
