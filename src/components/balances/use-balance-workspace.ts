"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client/api";
import { useLiveRevision } from "@/lib/use-live-revision";
import type { BalanceWorkspace } from "@/types/balances";
export function useBalanceWorkspace(patientId: string) {
  const [data, setData] = useState<BalanceWorkspace | null>(null), [error, setError] = useState(""), [attempt, setAttempt] = useState(0);
  const [hasBeenEligible,setHasBeenEligible]=useState(false);
  const live = useLiveRevision();
  useEffect(() => {
    const controller = new AbortController();
    api<{ data: BalanceWorkspace }>("/api/balances?careRecipientId=" + patientId, undefined, controller.signal)
      .then(result => { if (!controller.signal.aborted) { setData(result.data);setHasBeenEligible(value=>value||result.data.eligibility.available); setError(""); } })
      .catch(reason => { if (!controller.signal.aborted) setError(reason.message); });
    return () => controller.abort();
  }, [patientId, live, attempt]);
  useEffect(()=>{
    const update=()=>{if(!document.hidden)setAttempt(v=>v+1);};
    const timer=window.setInterval(update,30_000);window.addEventListener("focus",update);document.addEventListener("visibilitychange",update);
    return()=>{window.clearInterval(timer);window.removeEventListener("focus",update);document.removeEventListener("visibilitychange",update);};
  },[]);
  return { data, error, hasBeenEligible, reload: () => setAttempt(v => v + 1) };
}
