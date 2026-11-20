"use client";

import { useState, type ReactNode, type RefObject } from "react";
import { ActionButton, DefinitionGrid, FormField, TextAreaField } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { Dialog } from "@/components/ui/overlays";
import { Notice } from "@/components/workspace";
import { documentPatientName } from "@/lib/documents/presentation";
import { formatBrazilDate } from "@/lib/receipt";
import type { SupplyDocument } from "@/types/documents";
import { DocumentArchivePolicy } from "./document-archive-policy";

export function DocumentCancellationReview({ data, patientName, actor, busy, blocked, uncertain, error, conflict, finalFocus, children, onConfirm, onRecover, onClose, onCloseUncertain }: {
  data: SupplyDocument; patientName: string; actor: string; busy: boolean; blocked: boolean; uncertain: boolean;
  error: string; conflict?: ReactNode; finalFocus: RefObject<HTMLButtonElement | null>; children: ReactNode;
  onConfirm: (reason: string) => void; onRecover: () => void; onClose: () => void; onCloseUncertain: () => void;
}) {
  const [reason, setReason] = useState("");
  const [discard, setDiscard] = useState(false);
  const patient = documentPatientName(data.canonical_snapshot, patientName);
  const reference = data.events.find(event => event.version === data.version);
  const close = () => {
    if (uncertain) onCloseUncertain();
    else if (reason.trim()) setDiscard(true);
    else onClose();
  };
  return <>
    <Dialog open title="Revisar e cancelar" kicker={`${data.code ?? data.type} · ${patient}`}
      subtitle="Confira os efeitos desta decisão antes de confirmar." popupClassName="hca-wizard-dialog hca-cancellation-review"
      keyboardScrollable closeDisabled={busy} finalFocus={finalFocus} onClose={close} footer={<>
        <ActionButton variant="quiet" disabled={busy || uncertain} onClick={close}><Icon name="back" />Voltar à ficha</ActionButton>
        <ActionButton variant={uncertain ? "primary" : "danger"} disabled={busy || !uncertain && (blocked || reason.trim().length < 3)}
          onClick={uncertain ? onRecover : () => onConfirm(reason.trim())}>
          {uncertain ? "Conferir resultado" : <><Icon name="close" />Confirmar cancelamento</>}
        </ActionButton>
      </>}>
      <div className="hca-delivery-receipt hca-transit-cancellation">
        {error ? <Notice error>{error}</Notice> : null}
        {conflict}
        <DefinitionGrid items={[
          { label: "Ficha", value: data.code }, { label: "Paciente", value: patient },
          { label: "Responsável pela ação", value: actor },
          { label: "Referência", value: formatBrazilDate(reference?.createdAt ?? data.created_at) },
        ]} />
        {children}
        {uncertain ? <Notice>Confira o resultado antes de tentar cancelar novamente.</Notice> : <>
          <FormField label="Motivo do cancelamento" required helpText="A justificativa ficará no histórico desta ficha.">
            <TextAreaField rows={2} maxLength={1000} value={reason} readOnly={busy || blocked}
              onChange={event => setReason(event.currentTarget.value)} />
          </FormField>
          {data.protocol ? <DocumentArchivePolicy id={data.id} patientId={data.care_recipient_id} version={data.version} /> : null}
        </>}
      </div>
    </Dialog>
    {discard ? <Dialog open title="Sair sem cancelar a ficha?" onClose={() => setDiscard(false)} footer={<>
      <ActionButton onClick={() => setDiscard(false)}>Voltar à revisão</ActionButton>
      <ActionButton variant="primary" onClick={onClose}>Sair e descartar</ActionButton>
    </>}><p>A saída descarta o motivo digitado e mantém a ficha em acompanhamento.</p></Dialog> : null}
  </>;
}
