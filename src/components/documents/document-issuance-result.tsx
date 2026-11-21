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
import { useOperationSupport } from "./use-operation-support";

export { issuanceSteps } from "./document-issuance-navigation";
const titles = {
  REQ: "Requisição emitida",
  COM: "Compra emitida",
  ENT: "Entrega expedida",
  DEV: "Devolução expedida",
};
type ResultProps = { id: string; userId: string; patientId: string; code: string; patientName?: string; kind: keyof typeof titles; donation?: boolean };
const phases = {
  lookup: { operation: "Consultar emissão inicial", message: "Ainda não foi possível consultar o PDF e os avisos desta emissão." },
  notices: { operation: "Processar avisos da emissão", message: "O processamento dos avisos e o PDF de emissão ainda precisam ser confirmados." },
  pdf: { operation: "Gerar PDF de emissão", message: "O PDF de emissão ainda precisa ser confirmado." },
};
type Phase = keyof typeof phases;
type PdfResult = ({ state: "ready"; issuanceId: string } | { state: "unavailable" } |
  { state: "pending"; phase: Phase; cause?: unknown; lastError?: string | null }) & {
  noticesNeedAttention?: boolean;
};

function checkedPdf(value: unknown, documentId: string): InitialPdfStatus {
  const status = initialPdfStatusSchema.parse(value);
  if (status && status.documentId !== documentId)
    throw new Error("O PDF retornado não corresponde à ficha emitida.");
  return status;
}

function accessUnavailable(error: unknown) {
  return error instanceof ApiError && [401, 403, 404].includes(error.status);
}

function noticesPending(status: NonNullable<InitialPdfStatus>) {
  return status.state !== "ready" && status.noticesPrepared === false && !status.issuanceId;
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
    async function advance(requestId: string, phase: "notices" | "pdf") {
      const noticeStep = phase === "notices";
      try {
        // The signing endpoint has a 60-second execution budget.
        const status = checkedPdf(await api(endpoint + (noticeStep ? "?phase=notices" : ""),
          undefined, signal, "POST", { timeoutMs: noticeStep ? 30_000 : 65_000 }), id);
        if (!status || requestId !== status.id) throw new Error("A solicitação do PDF inicial mudou.");
        return status;
      } catch (cause) {
        if (signal.aborted || accessUnavailable(cause)) throw cause;
        // A response can be lost after the notice or signing step was persisted.
        const current = await api(endpoint, undefined, signal)
          .then(value => checkedPdf(value, id))
          .catch(readError => { if (accessUnavailable(readError)) throw readError; return null; });
        if (current?.id === requestId) {
          if (current.state === "ready" && current.issuanceId) return current;
          if (noticeStep && (current.noticesPrepared || current.issuanceId)) return current;
        }
        throw cause;
      }
    }
    async function confirmPdf() {
      let phase: Phase = "lookup";
      let noticesNeedAttention = false;
      try {
        let status = checkedPdf(await api(endpoint, undefined, signal), id);
        if (signal.aborted) return;
        if (!status) { finish({ state: "unavailable" }); return; }
        noticesNeedAttention = status.noticesNeedAttention ?? false;
        const requestId = status.id;
        if (noticesPending(status)) {
          phase = "notices";
          setStage(2);
          status = await advance(requestId, phase);
          noticesNeedAttention = status.noticesNeedAttention ?? false;
          if (noticesPending(status)) {
            finish({ state: "pending", phase, lastError: status.lastError, noticesNeedAttention });
            return;
          }
        }
        if (status.state !== "ready") {
          phase = "pdf";
          setStage(3);
          status = await advance(requestId, phase);
          noticesNeedAttention = status.noticesNeedAttention ?? noticesNeedAttention;
        }
        finish(status.state === "ready" && status.issuanceId
          ? { state: "ready", issuanceId: status.issuanceId, noticesNeedAttention }
          : { state: "pending", phase: "pdf", lastError: status.lastError, noticesNeedAttention });
      } catch (cause) {
        if (signal.aborted) return;
        if (accessUnavailable(cause)) {
          onClose();
          void load();
        } else finish({ state: "pending", phase, cause, noticesNeedAttention });
      }
    }
    void confirmPdf();
    return () => controller.abort();
  }, [id, attempt, load, onClose]);
  const pending = result?.state === "pending" ? result : null;
  const phase = phases[pending?.phase ?? "pdf"];
  const { copy: copySupport, details: support } = useOperationSupport({
    cause: pending?.cause, operation: phase.operation, result: "Ficha registrada. " + phase.message,
    fallbackCode: pending?.lastError ?? "EMISSAO_INICIAL_SEM_CONFIRMACAO", attempts: attempt,
    attemptLabel: "Tentativas de recuperação",
  });
  if (!result) return null;
  const title = kind === "COM" && donation ? "Doação emitida" : titles[kind];
  const copy = result.state === "ready" ? "O PDF de emissão está disponível."
    : pending ? phase.message
      : "Consulte os arquivos disponíveis na ficha.";
  return (
    <Dialog open success title={title} subtitle={`${code} · ${copy}`} onClose={onClose}
      finalFocus={() => document.querySelector<HTMLElement>("[data-document-heading]") ?? false}
      footer={<div className="hca-issuance-actions">
        {result.state === "ready" ? (
          <ActionLink href={`/api/documents/${id}/pdf?issuance=${result.issuanceId}`} download>
            <Icon name="download" />Baixar PDF
          </ActionLink>
        ) : pending ? (
          attempt < 2 ? <ActionButton onClick={() => { setStage(1); setAttempt(value => value + 1); }}>
            <Icon name="refresh" />{pending.phase === "notices" ? "Recuperar avisos e PDF" : "Recuperar PDF"}
          </ActionButton> : <ActionButton onClick={() => void copySupport()}><Icon name="copy" />Copiar detalhes</ActionButton>
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
      {pending ? <>
        {attempt >= 2 ? <p className="hca-issuance-retry-limit">A ficha está registrada. Copie o diagnóstico para solicitar ajuda com esta etapa.</p> : null}
        {support}
      </> : null}
      {sharing ? <DocumentShareDialog id={id} code={code} patientName={patientName} onClose={() => setSharing(false)} finalFocus={shareRef} /> : null}
    </Dialog>
  );
}
