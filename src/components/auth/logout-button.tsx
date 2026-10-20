"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const router = useRouter();
  const [error, setError] = useState("");
  async function logout() {
    setError("");
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setError("Não foi possível encerrar a sessão neste ambiente.");
      return;
    }
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      setError("Não foi possível encerrar a sessão. Tente novamente.");
      return;
    }
    router.replace("/login");
    router.refresh();
  }
  return <span className="inline-flex items-center gap-2">{error && <span role="alert" className="text-xs text-red-700">{error}</span>}<button type="button" onClick={logout} className="rounded-lg border border-(--line) px-3 py-2 text-sm font-semibold">Sair</button></span>;
}
