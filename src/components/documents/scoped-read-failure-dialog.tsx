"use client";

import type { ComponentProps } from "react";
import { ActionButton } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { Dialog } from "@/components/ui/overlays";
import { operationRecoveryLimit } from "./document-operation-failure-dialog";
import { useOperationSupport } from "./use-operation-support";

const subjects = {
  files: {
    operation: "Consultar arquivos da ficha",
    code: "ARQUIVOS_CONSULTA_INDISPONIVEL",
    back: "Voltar aos arquivos",
    loading: "Consultando arquivos…",
    preserved: "Os arquivos registrados permanecem preservados.",
  },
  stock: {
    operation: "Consultar saldos do estoque",
    code: "ESTOQUE_CONSULTA_INDISPONIVEL",
    back: "Voltar ao estoque",
    loading: "Consultando saldos…",
    preserved: "As movimentações já registradas permanecem preservadas.",
  },
};

export function ScopedReadFailureDialog({ subject, open, title, denied, message, cause, attempts, loading, returnFocus, onClose, onRetry }: {
  subject: keyof typeof subjects;
  open: boolean;
  title: string;
  denied: boolean;
  message: string;
  cause: unknown;
  attempts: number;
  loading: boolean;
  returnFocus: ComponentProps<typeof Dialog>["finalFocus"];
  onClose: () => void;
  onRetry: () => void;
}) {
  const copyText = subjects[subject];
  const exhausted = !denied && attempts >= operationRecoveryLimit;
  const { copy, details } = useOperationSupport({
    cause, operation: copyText.operation, result: title,
    fallbackCode: copyText.code, attempts,
    attemptLabel: "Tentativas de consulta",
  });
  return <Dialog open={open} title={denied ? "Acesso indisponível" : title}
    headingIcon={denied ? "lock" : undefined} failure={denied ? undefined : "rejected"}
    subtitle={message} onClose={onClose} finalFocus={returnFocus}
    footer={<>
      <ActionButton onClick={onClose}>{copyText.back}</ActionButton>
      {exhausted && !loading
        ? <ActionButton variant="primary" onClick={() => void copy()}><Icon name="copy" />Copiar detalhes</ActionButton>
        : <ActionButton variant="primary" disabled={loading} onClick={onRetry}><Icon name="refresh" />Consultar novamente</ActionButton>}
    </>}>
    {!denied ? <>
      {exhausted && !loading
        ? <p className="hca-issuance-retry-limit">O problema persiste. Copie os detalhes e envie ao responsável pelo sistema.</p>
        : <p className="hca-issuance-draft-saved"><Icon name="refresh" />Você pode voltar ou consultar novamente. {copyText.preserved}</p>}
      {details}
    </> : null}
    {loading ? <p role="status">{copyText.loading}</p> : null}
  </Dialog>;
}
