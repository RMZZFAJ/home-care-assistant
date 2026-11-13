"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { completeEntry } from "@/lib/auth/complete-entry";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { AccessFrame } from "./access-frame";
import { ActionButton } from "@/components/ui/controls";

export function CompleteEntry() {
  const router = useRouter(), params = useSearchParams();
  const [error, setError] = useState(""), [retry, setRetry] = useState(0);
  const next = params.get("next");
  useEffect(() => {
    let active = true;
    async function enter() {
      try {
        const client = createSupabaseBrowserClient();
        if (!client) throw new Error("O serviço de acesso está indisponível.");
        const { data, error } = await client.auth.getUser();
        if (error || !data.user) { router.replace("/login?next=" + encodeURIComponent(next ?? "/")); return; }
        const destination = await completeEntry(next, data.user.id);
        if (active) { router.replace(destination); router.refresh(); }
      } catch { if (active) setError("Não foi possível confirmar seu contexto. Tente novamente."); }
    }
    void enter();
    return () => { active = false; };
  }, [next, retry, router]);
  return <AccessFrame active="login" title="Confirmando seu acesso">{error ? <div role="alert"><p>{error}</p><ActionButton onClick={() => { setError(""); setRetry(value => value + 1); }}>Tentar novamente</ActionButton></div> : <p role="status">Validando sua conta e o destino autorizado…</p>}</AccessFrame>;
}
