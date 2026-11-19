"use client";

import { useCallback } from "react";
import { ActionButton, LoadingIndicator } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { Drawer } from "@/components/ui/overlays";
import { RequisitionOpening } from "@/components/requisitions/requisition-opening";
import { RequisitionDocumentContent } from "@/components/requisitions/requisition-detail";
import { useScopedRead } from "@/lib/use-scoped-read";
import { unlinkedArrivalDetails } from "@/lib/validation/unlinked-arrival";
import type { WorkspaceContext } from "@/types/workspace";
import type { LinkedMaterialDocument } from "./document-material-panel";
import { MaterialVisitContext } from "./material-visit-context";
import { SupplyDocumentContent } from "./supply-detail";
import { UnlinkedArrivalFacts } from "./unlinked-arrival";

export type MaterialVisitTarget = { kind: "document"; reference: LinkedMaterialDocument }
  | { kind: "arrival"; reference: { id: string; code: string } };

export function MaterialFullVisit({ target, context, onClose, finalFocus }: {
  target: MaterialVisitTarget;
  context: WorkspaceContext;
  onClose: () => void;
  finalFocus: () => HTMLElement | false;
}) {
  const { id, code } = target.reference;
  return <Drawer open title={code ?? "Ficha completa"} popupClassName="hca-material-full"
    onClose={onClose} closeLabel="Voltar ao painel de material" finalFocus={finalFocus}
    navigation={<button type="button" className="hca-material-panel-back" onClick={onClose}>
      <Icon name="back" width={14} height={14} />Voltar ao painel
    </button>}>
    <MaterialVisitContext value={context}>
      <div onSubmit={event => event.stopPropagation()}>
        {target.kind === "arrival" ? <MaterialArrival id={id} patientId={context.patient!.id} />
          : target.reference.type === "REQ" ? <RequisitionOpening id={id} withinDialog onCancel={onClose}>
            <RequisitionDocumentContent id={id} context={context} />
          </RequisitionOpening> : <SupplyDocumentContent id={id} context={context} />}
      </div>
    </MaterialVisitContext>
  </Drawer>;
}

function MaterialArrival({ id, patientId }: { id: string; patientId: string }) {
  const decode = useCallback((raw: unknown) => {
    if (typeof raw !== "object" || raw === null || !("data" in raw)
      || !("careRecipientId" in raw) || raw.careRecipientId !== patientId)
      throw new Error("A resposta não corresponde ao paciente selecionado.");
    const data = unlinkedArrivalDetails.parse(raw.data);
    if (data.id !== id) throw new Error("A resposta não corresponde à chegada selecionada.");
    return data;
  }, [id, patientId]);
  const read = useScopedRead("/api/purchases/arrivals/unlinked?" + new URLSearchParams({ careRecipientId: patientId, id }), "", decode);
  if (read.loading) return <LoadingIndicator label="Consultando a chegada" />;
  if (read.error) return <div role="alert"><p>{read.error}</p><ActionButton onClick={read.refresh}>Consultar novamente</ActionButton></div>;
  return read.data ? <UnlinkedArrivalFacts arrival={read.data} /> : null;
}
