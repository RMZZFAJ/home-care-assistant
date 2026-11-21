"use client";

import { useEffect, useRef, useState } from "react";
import { ActionButton } from "@/components/ui/controls";
import { Notice } from "@/components/workspace";
import { api } from "@/lib/client/api";
import { administrativeAttempt, verifyAdministrativeReceipt, type AdministrativeAttempt } from "@/lib/validation/administrative-preparation";
import { administrativeOutcomeText, administrativePreparationUrl } from "./administrative-preparation-editor";

const prefix = "hca:administrative-preparation:";
function storageKey(userId: string, attempt: AdministrativeAttempt) {
  return prefix + JSON.stringify([userId,attempt.patientId,attempt.mode,attempt.purpose,attempt.targetId]);
}
const purposeNames = { alertRule:"Regra de alerta",notificationRecipient:"Destinatário",membership:"Vínculo",membershipStatus:"Estado do vínculo" };

export function AdministrativePendingRecovery({ userId }: { userId: string }) {
  const [attempts,setAttempts] = useState<AdministrativeAttempt[]>([]);
  const [result,setResult] = useState<{key:string;text:string;error:boolean}|null>(null);
  const [selected,setSelected] = useState<string|null>(null);
  const controllerRef = useRef<AbortController|null>(null);
  useEffect(() => {
    let active=true;
    void Promise.resolve().then(() => {
      const retained:AdministrativeAttempt[]=[];
      try {
        for (const key of Object.keys(sessionStorage)) {
          if (!key.startsWith(prefix)) continue;
          try {
            const parsed=administrativeAttempt.safeParse(JSON.parse(sessionStorage.getItem(key) ?? "null"));
            if (parsed.success && key===storageKey(userId,parsed.data)) retained.push(parsed.data);
          } catch { /* Keep other readable attempts available. */ }
        }
      } catch { /* Browser retention may be unavailable. */ }
      if (active) setAttempts(retained);
    });
    return () => { active=false;controllerRef.current?.abort(); };
  },[userId]);
  async function consult(attempt:AdministrativeAttempt) {
    if (controllerRef.current) return;
    const controller=new AbortController();
    controllerRef.current=controller;
    setSelected(attempt.key);
    setResult(null);
    try {
      const response=await api<{receipt:unknown}>(administrativePreparationUrl(attempt,{key:attempt.key}),undefined,controller.signal);
      if (controller.signal.aborted) return;
      if (response.receipt===null) {
        setResult({key:attempt.key,text:"O comprovante ainda não foi localizado. A tentativa foi preservada para nova consulta.",error:false});
        return;
      }
      const receipt=verifyAdministrativeReceipt(userId,attempt,response.receipt);
      const text=receipt.action==="commit" && receipt.outcome ? administrativeOutcomeText(receipt.outcome)
        : {save:"Preenchimento privado salvo.",discard:"Descarte privado confirmado.",acknowledge:"Comprovante anterior reconhecido.",commit:"Alteração confirmada."}[receipt.action];
      try {
        const retained=administrativeAttempt.safeParse(JSON.parse(sessionStorage.getItem(storageKey(userId,attempt)) ?? "null"));
        if (retained.success && retained.data.key===attempt.key) sessionStorage.removeItem(storageKey(userId,attempt));
      } catch { /* The server retains the confirmed receipt. */ }
      setAttempts(current=>current.filter(row=>row.key!==attempt.key));
      setResult({key:attempt.key,text,error:false});
    } catch (reason) {
      if (!controller.signal.aborted) setResult({key:attempt.key,text:reason instanceof Error?reason.message:"A consulta não foi concluída.",error:true});
    } finally {
      if (!controller.signal.aborted) {controllerRef.current=null;setSelected(null);}
    }
  }
  if (!attempts.length && !result) return null;
  return <section className="ui-card hca-form-stack" aria-label="Recuperar alterações administrativas">
    <h2>Confirmações de alterações</h2>
    <p>Consulte tentativas guardadas neste navegador, inclusive depois de uma alteração do seu vínculo.</p>
    {attempts.map(attempt=><div key={attempt.key} className="hca-toolbar">
      <strong>{purposeNames[attempt.purpose]}</strong>
      <ActionButton type="button" disabled={selected!==null} onClick={()=>void consult(attempt)}>
        {selected===attempt.key?"Consultando…":"Consultar confirmação administrativa"}
      </ActionButton>
      {result?.key===attempt.key?<Notice error={result.error}>{result.text}</Notice>:null}
    </div>)}
    {result && !attempts.some(row=>row.key===result.key)?<Notice error={result.error}>{result.text}</Notice>:null}
  </section>;
}
