"use client";

import { useCallback, useRef, useState, useSyncExternalStore, type RefObject } from "react";
import { ActionButton, ActionLink, DefinitionGrid, FormField, Pill, SelectField, TextAreaField } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { useOperationActivity } from "@/components/ui/operation-activity";
import { Dialog } from "@/components/ui/overlays";
import { ApiError, Notice } from "@/components/workspace";
import { api } from "@/lib/client/api";
import { documentArchiveAttempt, documentArchiveCommand, documentArchiveIdentity, documentArchiveRecovery, documentArchiveReference, type DocumentArchiveAttempt, type DocumentArchiveIdentity } from "@/lib/documents/document-archive";
import { formatBrazilDate } from "@/lib/receipt";
import { useScopedRead } from "@/lib/use-scoped-read";
import { DocumentOperationFailureDialog, operationRecoveryLimit } from "./document-operation-failure-dialog";

export type ArchiveDialogMode = "archive" | "review" | "recovery";
type View = "archive" | "review" | "reverse";
type ArchiveScope = { id: string; patientId: string; userId: string };
const descriptions = {
  archive: ["Arquivar ficha", "O PDF consolidado será preservado para consulta."],
  review: ["Confirmar encerramento", "A ficha já foi arquivada. Falta sua decisão para encerrar definitivamente."],
  reverse: ["Reverter arquivamento", "A ficha voltará à condição anterior ao arquivo."],
};
const resultTitles = { archive: "Ficha arquivada", confirm: "Encerramento confirmado", reverse: "Arquivamento revertido" };
const resultDetails = {
  archive: "O sistema gerou o PDF consolidado. O encerramento definitivo aguarda a confirmação do administrador do paciente.",
  confirm: "A ficha está encerrada e o PDF consolidado está disponível.",
  reverse: "A condição anterior foi restaurada. O PDF daquela versão está preservado nos arquivos da ficha.",
};
const archiveFailureTitles = {
  archive: "Não foi possível arquivar a ficha",
  confirm: "Não foi possível confirmar o encerramento",
  reverse: "Não foi possível reverter o arquivamento",
};
const recoveryEvent = "hca:document-archive-recovery";

type ArchiveFailure = {
  action: DocumentArchiveIdentity["action"];
  outcome: "rejected" | "uncertain";
  description: string;
  cause?: unknown;
};

function archiveStorageKey({ id, patientId, userId }: ArchiveScope) {
  return `hca:official-archive:${userId}:${patientId}:${id}`;
}

function readArchiveStorage(key: string) {
  try { return sessionStorage.getItem(key); } catch { return null; }
}

function parseArchiveIdentity(value: string | null): DocumentArchiveIdentity | null {
  if (!value) return null;
  try { return documentArchiveIdentity.parse(JSON.parse(value)); } catch { return null; }
}

function writeArchiveStorage(key: string, identity: DocumentArchiveIdentity | null) {
  try {
    if (identity) sessionStorage.setItem(key, JSON.stringify(identity));
    else sessionStorage.removeItem(key);
    window.dispatchEvent(new Event(recoveryEvent));
  } catch { /* The current review retains its identity in memory. */ }
}

function subscribeToArchiveRecovery(callback: () => void) {
  window.addEventListener(recoveryEvent, callback);
  return () => window.removeEventListener(recoveryEvent, callback);
}

export function DocumentArchiveRecoveryAction({ id, patientId, userId, disabled, onOpen }: ArchiveScope & {
  disabled?: boolean; onOpen: () => void;
}) {
  const key = archiveStorageKey({ id, patientId, userId });
  const stored = useSyncExternalStore(subscribeToArchiveRecovery, () => readArchiveStorage(key), () => null);
  return parseArchiveIdentity(stored) ? <ActionButton disabled={disabled} onClick={onOpen}>
    <Icon name="refresh" />Conferir tentativa de arquivamento
  </ActionButton> : null;
}

function archiveUncertain(action: DocumentArchiveIdentity["action"], cause?: unknown): ArchiveFailure {
  return { action, outcome: "uncertain", description: "A ação ainda está sem confirmação. Confira o resultado desta mesma tentativa.", cause };
}

function ArchiveFailureDialog({ failure, attempts, onClose, onRecover }: {
  failure: ArchiveFailure; attempts: number; onClose: () => void; onRecover?: () => void;
}) {
  const exhausted = failure.outcome === "uncertain" && attempts >= operationRecoveryLimit;
  return <DocumentOperationFailureDialog {...failure} title={archiveFailureTitles[failure.action]}
    operation={descriptions[failure.action === "confirm" ? "review" : failure.action][0]}
    fallbackCode="ARQUIVO_SEM_CONFIRMACAO" attempts={attempts} onClose={onClose}
    closeLabel={failure.outcome === "uncertain" ? "Voltar à ficha" : "Voltar à revisão"}
    action={onRecover && !exhausted ? { label: "Conferir resultado", onClick: onRecover } : undefined}
    exhaustedMessage={exhausted ? "O resultado ainda está sem confirmação. Copie os detalhes para o responsável pelo sistema antes de tentar arquivar ou decidir novamente." : undefined} />;
}

function DownloadConsolidated({ archive, compactLabel = false }: { archive: DocumentArchiveAttempt; compactLabel?: boolean }) {
  return archive.issuanceId ? <ActionLink href={`/api/documents/${archive.documentId}/pdf?issuance=${archive.issuanceId}`} download
    aria-label={compactLabel ? "Baixar PDF consolidado" : undefined}>
    <Icon name="download" />{compactLabel ? "Baixar PDF" : "Baixar PDF consolidado"}
  </ActionLink> : null;
}

export function DocumentArchiveActions({ archive, onReview, reviewRef }: {
  archive: DocumentArchiveAttempt; onReview?: () => void; reviewRef?: RefObject<HTMLButtonElement | null>;
}) {
  return <>
    <DownloadConsolidated archive={archive} />
    {onReview && !archive.decision ? <ActionButton ref={reviewRef} variant="primary" onClick={onReview}><Icon name="lock" />Revisar encerramento</ActionButton> : null}
  </>;
}

function ArchiveCheck({ title, detail, attention = false }: { title: string; detail: string; attention?: boolean }) {
  return <li className={attention ? "hca-archive-attention" : undefined}>
    <Icon name={attention ? "alert" : "check-circle"} /><div><strong>{title}</strong><p>{detail}</p></div>
  </li>;
}

export function DocumentArchiveDialog({ id, patientId, code, patientName, actor, userId, initial, onClose, onUpdated, finalFocus }: {
  id: string; patientId: string; code: string; patientName: string; actor: string; userId: string;
  initial: ArchiveDialogMode; onClose: () => void; onUpdated: () => void;
  finalFocus?: RefObject<HTMLButtonElement | null>;
}) {
  const storageKey = archiveStorageKey({ id, patientId, userId });
  const [pending, setPending] = useState(() => parseArchiveIdentity(readArchiveStorage(storageKey)));
  const [view, setView] = useState<View>(() => pending?.action === "archive" || initial === "archive" ? "archive" : "review");
  const [mode, setMode] = useState("policy");
  const [reason, setReason] = useState("");
  const [discard, setDiscard] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [failure, setFailure] = useState<ArchiveFailure | null>(() => pending ? archiveUncertain(pending.action) : null);
  const [recoveryAttempts, setRecoveryAttempts] = useState(0);
  const [result, setResult] = useState<{ action: DocumentArchiveIdentity["action"]; archive: DocumentArchiveAttempt } | null>(null);
  const sendingRef = useRef(false);
  const endpoint = `/api/documents/${id}/lifecycle/archive`;
  const decode = useCallback((payload: unknown) => {
    const resolved = documentArchiveReference.parse(payload);
    if (resolved.documentId !== id || resolved.patientId !== patientId)
      throw new Error("A referência pertence a outro contexto. Consulte a ficha novamente.");
    return resolved;
  }, [id, patientId]);
  const reference = useScopedRead(result ? null : endpoint, userId, decode);
  const facts = reference.loading || reference.error ? null : reference.data;
  const archive = facts?.archive;
  const previous = (archive?.previousState ?? facts?.condition) === "cancelled" ? "Cancelada" : "Concluída";
  const permission = view === "archive" ? facts?.canArchive : facts?.canDecide;
  const incomplete = (view === "reverse" || view === "archive" && mode === "other") && reason.trim().length < 3;
  const disabled = busy || Boolean(pending) || !permission || incomplete;
  const [title, subtitle] = descriptions[view];

  useOperationActivity(reference.loading && !busy && !pending, { title: "Conferindo situação da ficha" });
  useOperationActivity(busy, recoveryAttempts > 0 ? { title: "Conferindo o resultado da tentativa" } : view === "archive" ? {
    title: "Arquivando ficha",
    detail: "A ficha será arquivada após a conferência do PDF consolidado.",
    stage: 1,
    steps: [{ label: "Conferindo a situação da ficha", icon: "file" }, { label: "Gerando e assinando o PDF consolidado", icon: "shield" }, { label: "Confirmando o arquivamento", icon: "archive" }],
  } : { title: view === "reverse" ? "Revertendo arquivamento" : "Confirmando encerramento" });

  function close() {
    if (busy) return;
    if (pending || reason.trim() || mode !== "policy") setDiscard(true);
    else { onUpdated(); onClose(); }
  }

  function clearPending() {
    setPending(null);
    writeArchiveStorage(storageKey, null);
  }

  async function apply(action: DocumentArchiveIdentity["action"]) {
    if (sendingRef.current || disabled || !facts) return;
    const outstanding = parseArchiveIdentity(readArchiveStorage(storageKey));
    if (outstanding) {
      setPending(outstanding);
      setFailure(archiveUncertain(outstanding.action));
      return;
    }
    const input = {
      key: crypto.randomUUID(), version: facts!.version, referenceHash: facts!.referenceHash, action,
      ...(action === "archive" ? { mode, ...(mode === "other" ? { reason } : {}) } : action === "reverse" ? { reason } : {}),
    };
    const parsed = documentArchiveCommand.safeParse(input);
    if (!parsed.success) { setError("Confira os campos antes de confirmar."); return; }
    sendingRef.current = true;
    setBusy(true);
    setError("");
    setFailure(null);
    setRecoveryAttempts(0);
    const identity = { key: parsed.data.key, action };
    setPending(identity);
    writeArchiveStorage(storageKey, identity);
    try {
      const applied = documentArchiveAttempt.parse(await api(endpoint, parsed.data));
      if (applied.documentId !== id || action !== "archive" && applied.decision !== action)
        throw new Error("A resposta ainda não confirmou esta decisão.");
      if (!applied.archivedAt) {
        setFailure({ action, outcome: "uncertain", description: "O PDF consolidado ainda está em processamento. Confira o resultado desta mesma tentativa." });
        return;
      }
      clearPending();
      setResult({ action, archive: applied });
    } catch (cause) {
      if (cause instanceof ApiError && cause.code !== "PERSISTENCE_UNCONFIRMED" && [400, 401, 403, 404, 409].includes(cause.status)) {
        clearPending();
        reference.refresh();
        setFailure({ action, cause, outcome: "rejected", description: cause.status === 409
          ? "A referência mudou. Confira a situação atual da ficha antes de confirmar novamente."
          : "O sistema recusou esta solicitação. Confira a referência e seu acesso antes de continuar." });
      } else {
        setFailure(archiveUncertain(action, cause));
      }
    } finally {
      sendingRef.current = false;
      setBusy(false);
    }
  }

  async function recover() {
    if (sendingRef.current || !pending || recoveryAttempts >= operationRecoveryLimit) return;
    const { action, key } = pending;
    sendingRef.current = true;
    setBusy(true);
    setRecoveryAttempts(count => count + 1);
    setFailure(null);
    try {
      const recovered = documentArchiveRecovery.parse(await api(`${endpoint}/reconcile`, { action, key }));
      if (recovered.documentId !== id || recovered.key !== key || recovered.action !== action)
        throw new Error("A resposta ainda não confirmou esta decisão.");
      if (recovered.state === "prepared") {
        setFailure({ action, outcome: "uncertain", description: "O PDF consolidado ainda está em processamento. Confira o resultado desta mesma tentativa." });
        return;
      }
      clearPending();
      if (recovered.state === "applied") setResult({ action, archive: recovered.archive });
      else {
        reference.refresh();
        setFailure({ action, outcome: "rejected", description: "A conferência confirmou que esta tentativa não alterou a ficha. Revise a situação atual antes de confirmar outra ação." });
      }
    } catch (cause) {
      setFailure(archiveUncertain(action, cause));
    } finally {
      sendingRef.current = false;
      setBusy(false);
    }
  }

  function finish() { onUpdated(); onClose(); }
  return <>
    <Dialog open={!result && !discard && !failure} title={title} subtitle={archive?.decision === "confirm" ? "A confirmação já foi registrada. Consulte o PDF consolidado." : subtitle} kicker={`${code} · ${patientName}`}
      onClose={close} closeDisabled={busy} finalFocus={finalFocus}
      footer={<>
        <ActionButton variant="quiet" disabled={busy} onClick={close}><Icon name="back" />Voltar à ficha</ActionButton>
        {view === "review" ? <>
          <ActionButton disabled={disabled} onClick={() => { setView("reverse"); setError(""); }}><Icon name="undo" />Reverter arquivamento</ActionButton>
          <ActionButton variant="primary" disabled={disabled} onClick={() => void apply("confirm")}><Icon name="lock" />Confirmar encerramento definitivo</ActionButton>
        </> : <ActionButton variant="primary" disabled={disabled} onClick={() => void apply(view)}>
          <Icon name={view === "archive" ? "archive" : "undo"} />{view === "archive" ? "Arquivar e consolidar PDF" : "Reverter arquivamento"}
        </ActionButton>}
      </>}>
      <div className="hca-delivery-receipt hca-document-follow-up hca-document-archive" data-archive-view={view}>
        {error ? <Notice error>{error}</Notice> : null}
        {reference.error ? <Notice error>{reference.error}<ActionButton compact onClick={reference.refresh}>Consultar novamente</ActionButton></Notice> : null}
        {view === "review" && archive && !archive.decision ? <>
          <div className="hca-follow-up-prior">
            <Icon name="archive" /><div><h3>Arquivada</h3><p>{archive.automatic ? "Arquivamento automático pelo prazo da residência" : "Arquivamento manual por " + archive.actorName}</p></div>
            <Pill tone="warning">Aguardando sua confirmação</Pill>
          </div>
          <DefinitionGrid items={[
            { label: "Condição anterior", value: previous }, { label: "Arquivada em", value: formatBrazilDate(archive.archivedAt) },
            { label: "Motivo", value: archive.reason }, { label: "Administrador do paciente", value: actor },
          ]} />
          <div className="hca-follow-up-prior">
            <Icon name="file" /><div><h3>{code} · PDF consolidado</h3><p>Gerado no arquivamento · {formatBrazilDate(archive.archivedAt)}</p></div>
            <DownloadConsolidated archive={archive} compactLabel />
          </div>
          <ul className="hca-cancellation-checklist">
            <ArchiveCheck title="PDF consolidado preservado" detail="A versão foi gerada no arquivamento e já pode ser baixada." />
            <ArchiveCheck title="Ficha em consulta" detail="As alterações ficam suspensas enquanto você decide." />
          </ul>
          <Notice><strong>Encerramento definitivo</strong><p>Ao confirmar, a ficha permanecerá disponível para consulta e download do PDF preservado.</p></Notice>
        </> : <>
          <DefinitionGrid items={[
            { label: "Ficha", value: code }, { label: "Paciente", value: patientName },
            { label: "Responsável pela ação", value: actor }, { label: "Referência", value: facts ? "Versão " + facts.version : "Em consulta" },
          ]} />
          {view === "archive" && permission ? <>
            <ul className="hca-cancellation-checklist">
              <ArchiveCheck title="Ficha concluída ou cancelada" detail="O acompanhamento operacional já foi encerrado." />
              <ArchiveCheck title="PDF consolidado" detail="Será produzido com o estado atual da ficha e o status Arquivada." />
              <ArchiveCheck title="Confirmação do administrador" detail="Após arquivar, você poderá encerrar definitivamente ou reverter o arquivamento." attention />
            </ul>
            <FormField label="Motivo do arquivamento">
              <SelectField value={mode} disabled={busy || Boolean(pending)} onChange={event => { setMode(event.currentTarget.value); setReason(""); }}>
                <option value="policy">Política padrão</option><option value="early">Arquivamento antecipado</option><option value="other">Outro motivo</option>
              </SelectField>
            </FormField>
            {mode === "other" ? <FormField label="Descreva o motivo" required><TextAreaField rows={3} maxLength={1000} readOnly={busy || Boolean(pending)} value={reason} onChange={event => setReason(event.currentTarget.value)} /></FormField>
              : <p className="hca-muted">{mode === "policy" ? `A residência está configurada para arquivar em ${facts?.archiveDays} dias. Você está antecipando essa etapa manualmente.` : "A antecipação ficará registrada com sua autoria."}</p>}
          </> : view === "reverse" && archive ? <>
            <div className="hca-follow-up-prior"><Icon name="undo" /><div><h3>Condição restaurada</h3><p>{previous}</p></div><Pill>Acompanhamento do registro</Pill></div>
            <ul className="hca-cancellation-checklist">
              <ArchiveCheck title="Arquivamento anterior preservado" detail="A ocorrência e o PDF daquela versão continuam no histórico." />
              <ArchiveCheck title="Estoque preservado" detail="A reversão do arquivo mantém o estoque como está." />
            </ul>
            <FormField label="Motivo da reversão" required><TextAreaField rows={3} maxLength={1000} readOnly={busy || Boolean(pending)} value={reason} onChange={event => setReason(event.currentTarget.value)} /></FormField>
          </> : null}
        </>}
        {facts && !permission && !pending ? <Notice>Esta decisão está indisponível para a situação atual da ficha e este acesso.</Notice> : null}
        {archive?.decision === "confirm" ? <DownloadConsolidated archive={archive} /> : null}
      </div>
    </Dialog>
    {discard ? <Dialog open title={pending ? "Sair antes de conferir o resultado?" : "Sair sem concluir?"}
      onClose={() => setDiscard(false)} footer={<>
        <ActionButton onClick={() => setDiscard(false)}>Voltar à revisão</ActionButton>
        <ActionButton variant="primary" onClick={finish}>{pending ? "Voltar à ficha" : "Sair e descartar"}</ActionButton>
      </>}><p>{pending ? "A ficha mostrará a situação confirmada pelo sistema ao voltar." : "Os valores digitados nesta decisão serão descartados."}</p></Dialog> : null}
    {result ? <Dialog open success title={resultTitles[result.action]} subtitle={resultDetails[result.action]} onClose={finish}
      finalFocus={finalFocus} footer={<ActionButton variant="primary" onClick={finish}>Concluir</ActionButton>}>
      <DownloadConsolidated archive={result.archive} />
    </Dialog> : null}
    {failure && !discard ? <ArchiveFailureDialog failure={failure} attempts={recoveryAttempts}
      onClose={pending ? close : () => setFailure(null)}
      onRecover={pending ? () => void recover() : undefined} /> : null}
  </>;
}
