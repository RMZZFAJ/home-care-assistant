"use client";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { WorkspaceSync } from "./workspace-sync";

/** One connection survives navigation; clinical reads remain in authorized APIs. */
export function LiveSession() {
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    const client = createSupabaseBrowserClient();
    if (!client) return;
    let active = true;
    void client.auth.getUser().then(({ data }) => {
      if (active) setUserId(data.user?.id ?? null);
    });
    const { data } = client.auth.onAuthStateChange((_event, session) => {
      if (active) setUserId(session?.user.id ?? null);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);
  return userId ? <WorkspaceSync userId={userId} /> : null;
}
