"use client";

import type { RefObject } from "react";
import { ActionButton } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { Dialog } from "@/components/ui/overlays";
import { operationRecoveryLimit } from "./document-operation-failure-dialog";
import { useOperationSupport } from "./use-operation-support";

export function FileArchiveReadFailure({ open, title, denied, message, cause, attempts, loading, returnFocus, onClose, onRetry }: {
  open: boolean;
  title: string;
  denied: boolean;
  message: string;
  cause: unknown;
  attempts: number;
  loading: boolean;
  returnFocus: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  onRetry: () => void;
}) {
  const exhausted = !denied && attempts >= operationRecoveryLimit;
  const { copy, details } = useOperationSupport({
    cause, operation: "Consultar arquivos da ficha", result: title,
    fallbackCode: "ARQUIVOS_CONSULTA_INDISPONIVEL", attempts,
    attemptLabel: "Tentativas de consulta",
  });
  return <Dialog open={open} title={denied ? "Acesso indisponível" : title}
    headingIcon={denied ? "lock" : undefined} failure={denied ? undefined : "rejected"}
    subtitle={message} onClose={onClose} finalFocus={returnFocus}
    footer={<>
      <ActionButton onClick={onClose}>Voltar aos arquivos</ActionButton>
      {exhausted && !loading
        ? <ActionButton variant="primary" onClick={() => void copy()}><Icon name="copy" />Copiar detalhes</ActionButton>
        : <ActionButton variant="primary" disabled={loading} onClick={onRetry}><Icon name="refresh" />Consultar novamente</ActionButton>}
    </>}>
    {!denied ? <>
      {exhausted && !loading
        ? <p className="hca-issuance-retry-limit">O problema persiste. Copie os detalhes e envie ao responsável pelo sistema.</p>
        : <p className="hca-issuance-draft-saved"><Icon name="refresh" />Você pode voltar ou consultar novamente. Os arquivos registrados permanecem preservados.</p>}
      {details}
    </> : null}
    {loading ? <p role="status">Consultando arquivos…</p> : null}
  </Dialog>;
}
