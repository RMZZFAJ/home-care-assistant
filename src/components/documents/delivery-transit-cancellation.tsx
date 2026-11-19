"use client";

import { useState, type ReactNode, type RefObject } from "react";
import { ActionButton, DefinitionGrid, FormField, TextAreaField } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { Dialog } from "@/components/ui/overlays";
import { Notice } from "@/components/workspace";
import { cancelledTransitReturn } from "@/lib/documents/delivery-receipt";
import { deliveryTransit } from "@/lib/documents/family-fulfillment";
import { documentPatientName } from "@/lib/documents/presentation";
import { formatQuantity } from "@/lib/quantity";
import { formatBrazilDate } from "@/lib/receipt";
import type { SupplyDocument } from "@/types/documents";

function origin(data: SupplyDocument) {
  return data.payload.source === "CARE_TEAM" ? "da equipe" : "da família";
}

export function DeliveryTransitCancellation({ data, patientName, actor, busy, blocked, uncertain, error, conflict, finalFocus, onSubmit, onRecover, onClose, onCloseUncertain }: {
  data: SupplyDocument;
  patientName: string;
  actor: string;
  busy: boolean;
  blocked: boolean;
  uncertain: boolean;
  error: string;
  conflict?: ReactNode;
  finalFocus: RefObject<HTMLButtonElement | null>;
  onSubmit: (body: { reason: string; transitReturned: true }) => void;
  onRecover: () => void;
  onClose: () => void;
  onCloseUncertain: () => void;
}) {
  const [reason, setReason] = useState("");
  const [discard, setDiscard] = useState(false);
  const lines = data.lines.filter(line => deliveryTransit(line).gt(0));
  const reference = data.events.find(event => event.version === data.version);
  const close = () => {
    if (uncertain) onCloseUncertain();
    else if (reason.trim()) setDiscard(true);
    else onClose();
  };
  return <>
    <Dialog open title="Revisar e cancelar" kicker={data.code ?? undefined}
      subtitle="Confira os efeitos desta decisão antes de confirmar."
      closeDisabled={busy} finalFocus={finalFocus} onClose={close} footer={<>
        <ActionButton disabled={busy || uncertain} onClick={close}>Voltar à ficha</ActionButton>
        <ActionButton variant={uncertain ? "primary" : "danger"} disabled={busy || !uncertain && (blocked || reason.trim().length < 3)}
          onClick={uncertain ? onRecover : () => onSubmit({ reason: reason.trim(), transitReturned: true })}>
          {uncertain ? "Conferir resultado" : <><Icon name="close" />Confirmar cancelamento</>}
        </ActionButton>
      </>}>
      <div className="hca-delivery-receipt hca-transit-cancellation">
        {error ? <Notice error>{error}</Notice> : null}
        {conflict}
        <DefinitionGrid items={[
          { label: "Ficha", value: data.code },
          { label: "Paciente", value: documentPatientName(data.canonical_snapshot, patientName) },
          { label: "Responsável pela ação", value: actor },
          { label: "Referência", value: formatBrazilDate(reference?.createdAt ?? data.created_at) },
        ]} />
        <ul className="hca-cancellation-checklist">
          <li><Icon name="check" /><div><strong>Vínculos e histórico</strong><p>Os registros anteriores serão preservados.</p></div></li>
          <li><Icon name="check" /><div><strong>Ainda sem recebimento</strong><p>{lines.length === 1 ? "Um material ainda está em trânsito." : `${lines.length} materiais ainda estão em trânsito.`}</p></div></li>
        </ul>
        {lines.map(line => {
          const amount = formatQuantity(deliveryTransit(line).toFixed(), line.unit_snapshot);
          return <article key={line.id} className="hca-receipt-line">
            <header><div><h3>{line.name_snapshot}</h3><p>{line.unit_snapshot}</p></div></header>
            <DefinitionGrid className="hca-transit-quantities" items={[
              { label: "Em trânsito", value: amount },
              { label: "Após cancelar", value: "0 em trânsito" },
              { label: "Retorno à origem", value: amount + " ao estoque " + origin(data) },
            ]} />
          </article>;
        })}
        {uncertain ? <Notice>Confira o resultado antes de tentar cancelar novamente.</Notice> : <>
          <p className="hca-muted">Confirme somente se a expedição foi interrompida e os materiais estão novamente com a origem.</p>
          <FormField label="Motivo do cancelamento" required>
            <TextAreaField rows={2} maxLength={1000} value={reason} readOnly={blocked}
              onChange={event => setReason(event.currentTarget.value)} />
          </FormField>
        </>}
      </div>
    </Dialog>
    {discard ? <Dialog open title="Sair sem cancelar a ficha?" onClose={() => setDiscard(false)} footer={<>
      <ActionButton onClick={() => setDiscard(false)}>Voltar à revisão</ActionButton>
      <ActionButton variant="primary" onClick={onClose}>Sair e descartar</ActionButton>
    </>}><p>A saída descarta o motivo digitado e mantém a ficha em acompanhamento.</p></Dialog> : null}
  </>;
}

export function DeliveryTransitCancellationResult({ data, onClose }: { data: SupplyDocument; onClose: () => void }) {
  return <Dialog open success title="Ficha cancelada" subtitle={`Os materiais retornaram ao estoque ${origin(data)}. O trânsito foi encerrado.`}
    onClose={onClose} footer={<ActionButton variant="primary" onClick={onClose}>Voltar à ficha</ActionButton>}>
    <div className="hca-delivery-receipt">
      {data.lines.map(line => {
        const returned = cancelledTransitReturn(line.metadata);
        return returned ? <article className="hca-receipt-line" key={line.id}>
          <h3>{line.name_snapshot}</h3><p>{formatQuantity(returned, line.unit_snapshot)} retornaram à origem.</p>
        </article> : null;
      })}
    </div>
  </Dialog>;
}
