"use client";
import { useOperationActivity } from "@/components/ui/operation-activity";
import { useState, useRef } from "react";
import { z } from "zod";
import { ActionButton } from "@/components/ui/controls";
import { Dialog } from "@/components/ui/overlays";
import { Notice } from "@/components/workspace";
import { api, ApiError } from "@/lib/client/api";
const attemptSchema = z.object({ mode: z.literal("express"), expectedVersion: z.number().int().positive(), materialIdentity: z.string().regex(/^[0-9a-f]{64}$/) }).strict();
type Attempt = z.infer<typeof attemptSchema>;
export function RequisitionScienceAction({ id, userId, version, materialIdentity, mayRecord, disabled, onRecorded }: { id: string; userId: string; version: number; materialIdentity: string; mayRecord: boolean; disabled: boolean; onRecorded: () => void ;}) {
  const storageKey = `hca:science:${userId}:${id}`;
  const [pending, setPending] = useState<Attempt | null>(() => { try { const parsed = attemptSchema.safeParse(JSON.parse(sessionStorage.getItem(storageKey) ?? "null")); return parsed.success ? parsed.data : null; } catch { return null; } });
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false), [progress, setProgress] = useState(""), [error, setError] = useState(""), [confirmedIdentity, setConfirmedIdentity] = useState<string | null>(null);
  const done = confirmedIdentity === materialIdentity;
  const [reviewing, setReviewing] = useState(false), [stage, setStage] = useState(0);
  useOperationActivity(busy, { title: "Confirmação de ciência", detail: progress || "Aguarde a confirmação do registro.", stage, steps: [{ label: "Confirmando sua leitura", icon: "user" }, { label: "Registrando sua ciência", icon: "file" }, { label: "Conferindo a resposta", icon: "check" }] });
  const busyRef = useRef(false);
  function retire() { setPending(null); try { sessionStorage.removeItem(storageKey); } catch {/* The page retains the settled outcome. */ } }
  function confirmed(attempt: Attempt) { retire(); setOpen(false); setConfirmedIdentity(attempt.materialIdentity); setError(""); onRecorded(); }
  async function verify(attempt: Attempt, rejected = false) {
    setStage(2);
    for (let number = 1; number <= 2; number++) {
      setProgress(`Verificando se esta ciência foi registrada (${number}/2)…`);
      try {
const result = z.object({ documentId: z.uuid(), actorId: z.uuid(), materialIdentity: z.string(), confirmed: z.boolean(), recordedAt: z.string().nullable() }).parse(await api(`/api/requisitions/${id}/science?materialIdentity=${attempt.materialIdentity}`));
        if (result.documentId !== id || result.actorId !== userId || result.materialIdentity !== attempt.materialIdentity) throw new Error("A consulta não corresponde a esta tentativa.");
        if (result.confirmed && result.recordedAt) { confirmed(attempt); return true; }
        if (!result.confirmed && (attempt.materialIdentity !== materialIdentity || rejected)) {
          retire(); setProgress(""); setConfirmedIdentity(null);
          setError("A tentativa anterior não foi registrada e sua referência já não pode ser usada. Confira o conteúdo atual antes de dar ciência novamente.");
          return false;
        }
      } catch (cause) { if (cause instanceof ApiError && [401, 403, 404].includes(cause.status)) break; }
    }
    setProgress(""); setError("Ainda não foi possível confirmar o resultado. Esta tentativa continua preservada. Verifique novamente antes de iniciar outra ciência."); return false;
  }
  async function execute(retry = false) {
    if (busyRef.current || disabled || !pending && !mayRecord) return;
    busyRef.current = true; setBusy(true); setOpen(true); setError("");
    setReviewing(false); setStage(1);
    const recovering = Boolean(pending), attempt = pending ?? { mode: "express" as const, expectedVersion: version, materialIdentity };
    setPending(attempt); try { sessionStorage.setItem(storageKey, JSON.stringify(attempt)); } catch {/* The open page still retains the same content identity. */ }
    try {
      if (recovering && !retry) { await verify(attempt); return; }
      setProgress("Registrando sua ciência para este conteúdo…");
      try { await api(`/api/requisitions/${id}/science`, attempt); } catch (cause) {
        if (cause instanceof ApiError && [400, 409].includes(cause.status)) { await verify(attempt, true); return; }
        if (!recovering && cause instanceof ApiError && cause.status >= 400 && cause.status < 500) { retire(); setProgress(""); setError(cause.message); return; }
      }
      await verify(attempt);
    } finally { busyRef.current = false; setBusy(false); }
  }
  if (!mayRecord && !pending && !error && !done) return null;
  return <>{mayRecord || pending ? <ActionButton variant={pending ? "secondary" : "primary"} disabled={disabled || busy} onClick={() => { if (pending) void execute(); else { setReviewing(true); setOpen(true); } }}>{pending ? "Verificar ciência pendente" : "Dar ciência"}</ActionButton> : null}{done ? <span role="status" className="hca-field-help">Ciência registrada para o conteúdo confirmado.</span> : null}<Dialog open={open && !busy} title={reviewing ? "Confirmar ciência da requisição" : "Resultado da ciência"} onClose={() => setOpen(false)}><div className="hca-form-stack">{reviewing ? <><p>Li esta requisição e confirmo minha ciência.</p><Notice>Esta confirmação registra sua ciência. Não confirma recebimento de materiais nem altera o atendimento ou o estoque.</Notice><div className="hca-toolbar"><ActionButton onClick={() => setOpen(false)}>Voltar sem confirmar</ActionButton><ActionButton variant="primary" disabled={disabled || !mayRecord} onClick={() => void execute()}>Confirmar minha ciência</ActionButton></div></> : <>{progress ? <p role="status">{progress}</p> : null}{error ? <Notice error>{error}</Notice> : null}{pending ? <p>A confirmação pertence ao conteúdo que você leu. Fechar por enquanto preserva a referência desta tentativa; verificar consulta o mesmo resultado.</p> : null}<div className="hca-toolbar"><ActionButton onClick={() => setOpen(false)}>Fechar por enquanto</ActionButton>{pending ? <><ActionButton disabled={disabled} onClick={() => void execute()}>Verificar resultado</ActionButton>{mayRecord ? <ActionButton disabled={disabled} onClick={() => void execute(true)}>Confirmar a mesma ciência</ActionButton> : null}</> : null}</div></>}</div></Dialog></>;
}
