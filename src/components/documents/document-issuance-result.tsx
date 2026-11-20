"use client";

import { useEffect, useRef, useState } from "react";
import { ActionButton, ActionLink } from "@/components/ui/controls";
import { Dialog } from "@/components/ui/overlays";
import { Icon } from "@/components/ui/icon";
import { useOperationActivity } from "@/components/ui/operation-activity";
import { useWorkspaceState } from "@/components/layout/workspace-context";
import { api, ApiError } from "@/lib/client/api";
import { initialPdfStatusSchema, type InitialPdfStatus } from "@/lib/documents/pdf-issuance";
import { DocumentShareDialog } from "./document-share-dialog";
import { issuanceSteps, useIssuanceResult } from "./document-issuance-navigation";

export { issuanceSteps } from "./document-issuance-navigation";
const titles = {
  REQ: "Requisição emitida",
  COM: "Compra emitida",
  ENT: "Entrega expedida",
  DEV: "Devolução expedida",
};
type ResultProps = { id: string; userId: string; patientId: string; code: string; patientName?: string; kind: keyof typeof titles; donation?: boolean };
type PdfResult = ({ state: "ready"; issuanceId: string } | { state: "pending" | "unavailable" }) & {
  noticesNeedAttention?: boolean;
};

function checkedPdf(value: unknown, documentId: string): InitialPdfStatus {
  const status = initialPdfStatusSchema.parse(value);
  if (status && status.documentId !== documentId)
    throw new Error("O PDF retornado não corresponde à ficha emitida.");
  return status;
}

export function DocumentIssuanceResult(props: ResultProps) {
  const dismiss = useIssuanceResult(props);
  return dismiss ? (
    <IssuanceResult key={`${props.userId}:${props.patientId}:${props.id}`} {...props} onClose={dismiss} />
  ) : null;
}

function IssuanceResult({ id, code, patientName, kind, donation, onClose }: ResultProps & { onClose: () => void }) {
  const { load } = useWorkspaceState();
  const [attempt, setAttempt] = useState(0);
  const [stage, setStage] = useState(1);
  const [completed, setCompleted] = useState<{ attempt: number; result: PdfResult } | null>(null);
  const [sharing, setSharing] = useState(false);
  const shareRef = useRef<HTMLButtonElement>(null);
  const result = completed?.attempt === attempt ? completed.result : null;
  useOperationActivity(result === null, {
    title: "Emissão da ficha", stage, steps: issuanceSteps,
    detail: stage === 1
      ? kind === "REQ" ? "A requisição foi registrada. Estamos consultando a emissão e a ciência aplicável."
        : "A ficha foi registrada. Estamos consultando a emissão."
      : stage === 2 ? "Estamos conferindo a situação dos avisos desta ficha."
        : "O sistema está assinando e conferindo o exemplar desta emissão.",
  });
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    const endpoint = `/api/documents/${id}/issuances/initial`;
    function finish(pdf: PdfResult) {
      if (!signal.aborted) setCompleted({ attempt, result: pdf });
    }
    async function confirmPdf() {
      let noticesNeedAttention = false;
      try {
        let status = checkedPdf(await api(endpoint, undefined, signal), id);
        if (signal.aborted) return;
        if (!status) { finish({ state: "unavailable" }); return; }
        noticesNeedAttention = status.noticesNeedAttention ?? false;
        if (status.state !== "ready") {
          const requestId = status.id;
          if (status.noticesPrepared === false && !status.issuanceId) {
            setStage(2);
            status = checkedPdf(await api(endpoint + "?phase=notices", undefined, signal, "POST"), id);
            if (!status || requestId !== status.id) throw new Error("A solicitação do PDF inicial mudou.");
            noticesNeedAttention = status.noticesNeedAttention ?? false;
          }
          if (status.state !== "ready") {
            setStage(3);
            status = checkedPdf(await api(endpoint, undefined, signal, "POST"), id);
            if (!status || requestId !== status.id) throw new Error("A solicitação do PDF inicial mudou.");
            noticesNeedAttention = status.noticesNeedAttention ?? noticesNeedAttention;
          }
        }
        finish(status.state === "ready" && status.issuanceId
          ? { state: "ready", issuanceId: status.issuanceId, noticesNeedAttention }
          : { state: "pending", noticesNeedAttention });
      } catch (error) {
        if (signal.aborted) return;
        if (error instanceof ApiError && [401, 403, 404].includes(error.status)) {
          onClose();
          void load();
        } else finish({ state: "pending", noticesNeedAttention });
      }
    }
    void confirmPdf();
    return () => controller.abort();
  }, [id, attempt, load, onClose]);
  if (!result) return null;
  const title = kind === "COM" && donation ? "Doação emitida" : titles[kind];
  const copy = result.state === "ready" ? "O PDF de emissão está disponível."
    : result.state === "pending" ? "O PDF de emissão ainda precisa ser confirmado."
      : "Consulte os arquivos disponíveis na ficha.";
  return (
    <Dialog open success title={title} subtitle={`${code} · ${copy}`} onClose={onClose}
      finalFocus={() => document.querySelector<HTMLElement>("[data-document-heading]") ?? false}
      footer={<div className="hca-issuance-actions">
        {result.state === "ready" ? (
          <ActionLink href={`/api/documents/${id}/pdf?issuance=${result.issuanceId}`} download>
            <Icon name="download" />Baixar PDF
          </ActionLink>
        ) : result.state === "pending" && attempt < 2 ? (
          <ActionButton onClick={() => { setStage(1); setAttempt(value => value + 1); }}>
            <Icon name="refresh" />Recuperar PDF
          </ActionButton>
        ) : (
          <ActionButton disabled><Icon name="download" />Baixar PDF</ActionButton>
        )}
        <ActionButton ref={shareRef} onClick={() => setSharing(true)}><Icon name="link" />Compartilhar link</ActionButton>
        <ActionButton variant="primary" onClick={onClose}><Icon name="arrow" />Acompanhar ficha</ActionButton>
      </div>}>
      {result.noticesNeedAttention ? <div className="hca-issuance-notice-attention">
        <p>Alguns avisos da emissão precisam de atenção.</p>
        <ActionLink href={`/fichas/${id}?documentTab=communications`} onClick={onClose}>Consultar avisos</ActionLink>
      </div> : null}
      {sharing ? <DocumentShareDialog id={id} code={code} patientName={patientName} onClose={() => setSharing(false)} finalFocus={shareRef} /> : null}
    </Dialog>
  );
}
