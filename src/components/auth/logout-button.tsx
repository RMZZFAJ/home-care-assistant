"use client";

import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const router = useRouter();
  async function logout() {
    const supabase = createSupabaseBrowserClient();
    if (supabase) await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }
  return <button type="button" onClick={logout} className="rounded-lg border border-[var(--line)] px-3 py-2 text-sm font-semibold">Sair</button>;
}
