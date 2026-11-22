"use client";

import { useState } from "react";
import { RelatedDocument } from "@/components/documents/related-document";
import { ActionButton, FormField, TextAreaField } from "@/components/ui/controls";
import { Dialog } from "@/components/ui/overlays";
import { formatBrazilDate } from "@/lib/receipt";
import type { ItemContext } from "@/types/documents";

const maximumRepeatReasonLength = 1000;

export function validRepeatReason(value?: string) {
  const length = value?.trim().length ?? 0;
  return length >= 3 && length <= maximumRepeatReasonLength;
}

export function RequisitionRepeatDialog({ material, pending, onClose, onKeep, onRemove }: {
  material: string;
  pending: ItemContext["pending"];
  onClose: () => void;
  onKeep: (reason: string) => void;
  onRemove?: () => void;
}) {
  const [reason, setReason] = useState("");
  const title = onRemove
    ? `Quer manter ${material} nesta requisição?`
    : "Este produto já está em uma requisição pendente";
  let subtitle = `Confira a necessidade anterior antes de reiterar ${material}. A nova linha não substitui o pedido anterior.`;
  if (onRemove) {
    const pendingRequest = pending.length === 1 ? `A ${pending[0].code} já solicita este material.` : "Há outras requisições pendentes para este material.";
    subtitle = pendingRequest + " Escolha se ele também deve ficar na sua requisição.";
  }

  return <Dialog
    open
    title={title}
    kicker={onRemove ? "Material já solicitado" : "Requisição"}
    subtitle={subtitle}
    headingIcon={onRemove ? undefined : "alert"}
    popupClassName={onRemove ? "hca-wizard-dialog hca-requisition-repeat-dialog" : undefined}
    onClose={onClose}
    footer={<>
      <ActionButton onClick={onRemove ?? onClose}>{onRemove ? "Retirar da ficha" : "Não incluir o item"}</ActionButton>
      <ActionButton variant="primary" disabled={!validRepeatReason(reason)} onClick={() => onKeep(reason.trim())}>
        {onRemove ? "Manter na ficha" : "Manter nova requisição"}
      </ActionButton>
    </>}
  >
    <ul className={onRemove ? "mb-4 flex flex-wrap justify-center gap-2" : "mb-3 space-y-2"}>
      {pending.map(row => <li key={row.lineId}>
        <RelatedDocument id={row.requisitionId} label={row.code} compact={Boolean(onRemove)}
          actionLabel={onRemove ? "Consultar" : undefined} />
        {onRemove ? null : <p className="doc-subtle">{formatBrazilDate(row.createdAt)} · Aguardando atendimento</p>}
      </li>)}
    </ul>
    <FormField label={onRemove ? "Motivo para manter" : "Justificativa da nova requisição"}>
      <TextAreaField
        rows={2}
        minLength={3}
        maxLength={maximumRepeatReasonLength}
        placeholder={onRemove ? "Preencha se quiser manter o material." : undefined}
        value={reason}
        onChange={event => setReason(event.currentTarget.value)}
      />
    </FormField>
  </Dialog>;
}
