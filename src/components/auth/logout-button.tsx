"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Menu } from "@base-ui/react/menu";
import { detachPushForLogout } from "@/lib/push/logout";

export function LogoutButton() {
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
    await detachPushForLogout();
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      setError("Não foi possível encerrar a sessão. Tente novamente.");
      return;
    }
    for (const key of Object.keys(sessionStorage)) if (key.startsWith("hca:")) sessionStorage.removeItem(key);
    // A fresh document releases modal accessibility and private client state.
    window.location.replace("/login");
    } catch { setError("Não foi possível conectar para encerrar a sessão. Tente novamente."); }
    finally { setLoading(false); }
  }
  return <Menu.Item className="hca-menu-item" closeOnClick={false} onClick={logout} disabled={loading}>{loading ? "Saindo..." : "Sair"}{error ? <span role="alert">{error}</span> : null}</Menu.Item>;
}
