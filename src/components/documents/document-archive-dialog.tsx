"use client";

import { useCallback, useRef, useState, type RefObject } from "react";
import { ActionButton, ActionLink, DefinitionGrid, FormField, Pill, SelectField, TextAreaField } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { useOperationActivity } from "@/components/ui/operation-activity";
import { Dialog } from "@/components/ui/overlays";
import { ApiError, Notice } from "@/components/workspace";
import { api } from "@/lib/client/api";
import { documentArchiveAttempt, documentArchiveCommand, documentArchiveReference, type DocumentArchiveAttempt, type DocumentArchiveCommand } from "@/lib/documents/document-archive";
import { formatBrazilDate } from "@/lib/receipt";
import { useScopedRead } from "@/lib/use-scoped-read";

export type ArchiveDialogMode = "archive" | "review";
type View = ArchiveDialogMode | "reverse";
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
  const [view, setView] = useState<View>(initial);
  const [mode, setMode] = useState("policy");
  const [reason, setReason] = useState("");
  const [discard, setDiscard] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<DocumentArchiveCommand | null>(null);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ action: DocumentArchiveCommand["action"]; archive: DocumentArchiveAttempt } | null>(null);
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
  const disabled = busy || !pending && (!permission || incomplete);
  const [title, subtitle] = descriptions[view];

  useOperationActivity(reference.loading && !busy, { title: "Conferindo situação da ficha" });
  useOperationActivity(busy, view === "archive" ? {
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

  async function apply(action: DocumentArchiveCommand["action"]) {
    if (sendingRef.current || disabled) return;
    const input = pending ?? {
      key: crypto.randomUUID(), version: facts!.version, referenceHash: facts!.referenceHash, action,
      ...(action === "archive" ? { mode, ...(mode === "other" ? { reason } : {}) } : action === "reverse" ? { reason } : {}),
    };
    const parsed = documentArchiveCommand.safeParse(input);
    if (!parsed.success) { setError("Confira os campos antes de confirmar."); return; }
    sendingRef.current = true;
    setBusy(true);
    setError("");
    setPending(parsed.data);
    try {
      const applied = documentArchiveAttempt.parse(await api(endpoint, parsed.data));
      if (applied.documentId !== id || action !== "archive" && applied.decision !== action)
        throw new Error("A resposta ainda não confirmou esta decisão.");
      if (!applied.archivedAt) {
        setError("O PDF consolidado ainda está em processamento. Confira o resultado desta mesma tentativa.");
        return;
      }
      setResult({ action, archive: applied });
    } catch (failure) {
      if (failure instanceof ApiError && failure.code !== "PERSISTENCE_UNCONFIRMED" && [400, 401, 403, 404, 409].includes(failure.status)) {
        setPending(null);
        reference.refresh();
      }
      setError(failure instanceof Error ? failure.message : "Não foi possível confirmar o resultado.");
    } finally {
      sendingRef.current = false;
      setBusy(false);
    }
  }

  function finish() { onUpdated(); onClose(); }
  return <>
    <Dialog open={!result && !discard} title={title} subtitle={archive?.decision === "confirm" ? "A confirmação já foi registrada. Consulte o PDF consolidado." : subtitle} kicker={`${code} · ${patientName}`}
      onClose={close} closeDisabled={busy} finalFocus={finalFocus}
      footer={<>
        <ActionButton variant="quiet" disabled={busy} onClick={close}><Icon name="back" />Voltar à ficha</ActionButton>
        {pending ? <ActionButton variant="primary" disabled={busy} onClick={() => void apply(pending.action)}>
          <Icon name="refresh" />Conferir resultado
        </ActionButton> : view === "review" ? <>
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
  </>;
}
