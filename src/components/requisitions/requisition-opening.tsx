"use client";
import Link from "next/link";
import { createContext, use, useEffect, useState, type ReactNode } from "react";
import { api, buttonClass, Notice, primaryClass } from "@/components/workspace";
import { Dialog } from "@/components/ui/primitives";

type Opening = { code: string; protocol: string; version: number; materialIdentity: string; requiresDialog: boolean };
const OpeningReferenceContext = createContext<Opening | null>(null);
export function useRequisitionOpeningReference() { return use(OpeningReferenceContext); }
export function RequisitionOpening({ id, onCancel, withinDialog = false, children }: { id: string; onCancel?: () => void; withinDialog?: boolean; children: ReactNode }) {
  const [opening, setOpening] = useState<Opening | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [confirmed, setConfirmed] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    void api<{ data: Opening }>(`/api/requisitions/${id}/opening`, undefined, controller.signal).then(result => {
      if (!controller.signal.aborted) { setOpening(result.data); setError(""); }
    }).catch(cause => { if (!controller.signal.aborted) setError(cause.message); });
    return () => controller.abort();
  }, [id, attempt]);
  async function confirm() {
    if (!opening || busy) return;
    setBusy(true); setError("");
    try {
      await api(`/api/requisitions/${id}/science`, { mode: "dialog", expectedVersion: opening.version, materialIdentity: opening.materialIdentity });
      setConfirmed(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível confirmar. Consulte novamente esta prévia."); }
    finally { setBusy(false); }
  }
  if (cancelled) return <div className="space-y-3"><Notice>Consulta cancelada. Voltar não registra nova ciência.</Notice><Link className={buttonClass} href="/historico">Voltar ao histórico</Link><button type="button" className={buttonClass} onClick={() => { setCancelled(false); setOpening(null); setAttempt(value => value + 1); }}>Abrir novamente</button></div>;
  if (!opening) return <div className="space-y-3"><Notice error={Boolean(error)}>{error || "Consultando referência e preferência de abertura…"}</Notice>{error ? <button type="button" className={buttonClass} onClick={() => setAttempt(value => value + 1)}>Tentar novamente</button> : null}</div>;
  if (!opening.requiresDialog || confirmed) return <OpeningReferenceContext value={opening}>{confirmed ? <Notice>Sua ciência foi registrada pela confirmação do diálogo. A consulta do conteúdo é a etapa seguinte; se falhar, tente abrir novamente.</Notice> : null}{children}</OpeningReferenceContext>;
  const content = <div className="space-y-4">
      <p>Requisição <strong>{opening.code ?? opening.protocol}</strong></p>
      <p>Sua preferência pede uma confirmação antes de abrir. Confirmar registra sua ciência pessoal do conteúdo emitido. Não declara leitura integral nem recebimento de materiais.</p>
      {error ? <Notice error>{error}</Notice> : null}
      <div className="ui-form-actions"><button type="button" className={buttonClass} disabled={busy} onClick={() => { onCancel?.(); setCancelled(true); }}>Voltar</button><button type="button" className={primaryClass} disabled={busy} onClick={() => void confirm()}>{busy ? "Confirmando…" : "Confirmar ciência e abrir"}</button></div>
      {error ? <button type="button" className={buttonClass} disabled={busy} onClick={() => { setOpening(null); setAttempt(value => value + 1); }}>Consultar preferência e referência novamente</button> : null}
    </div>;
  return withinDialog ? content : <Dialog open title="Ciência antes de abrir a requisição" onClose={() => { if (!busy) { onCancel?.(); setCancelled(true); } }}>{content}</Dialog>;
}
