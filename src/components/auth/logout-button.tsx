"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function logout() {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
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
    for (const key of Object.keys(sessionStorage)) if (key.startsWith("hca:")) sessionStorage.removeItem(key);
    router.replace("/login");
    router.refresh();
    } catch { setError("Não foi possível conectar para encerrar a sessão. Tente novamente."); }
    finally { setLoading(false); }
  }
  return <span className="inline-flex items-center gap-2">{error && <span role="alert" className="text-xs text-red-700">{error}</span>}<button type="button" onClick={logout} disabled={loading} className="rounded-lg border border-(--line) px-3 py-2 text-sm font-semibold disabled:opacity-50">{loading ? "Saindo..." : "Sair"}</button></span>;
}
