"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { MenuItem } from "@fluentui/react-components";

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
  return <MenuItem persistOnClick onClick={logout} disabled={loading}>{loading ? "Saindo..." : "Sair"}{error ? <span role="alert">{error}</span> : null}</MenuItem>;
}
