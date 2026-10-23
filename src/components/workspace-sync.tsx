"use client";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function WorkspaceSync({
  userId,
  contextRevision,
}: {
  userId: string;
  contextRevision?: number;
}) {
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    const client = createSupabaseBrowserClient();
    if (!client) return;
    const controller = new AbortController();
    let revision = "";
    let selectedRevision = contextRevision;
    let ready = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let startupFirst: ReturnType<typeof setTimeout> | undefined;
    let startupSecond: ReturnType<typeof setTimeout> | undefined;
    let startupThird: ReturnType<typeof setTimeout> | undefined;
    const notify = () => {
      clearTimeout(timer);
      timer = setTimeout(
        () => window.dispatchEvent(new Event("hca:data-changed")),
        150,
      );
    };
    const resync = async () => {
      if (document.hidden || controller.signal.aborted) return;
      try {
        const response = await fetch("/api/sync", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) {
          if (response.status === 401 || response.status === 403)
            window.dispatchEvent(new Event("hca:profile-updated"));
          return;
        }
        const data = (await response.json()) as {
          revision: string;
          activeContext?: { revision: number };
        };
        if (controller.signal.aborted) return;
        if (
          selectedRevision !== undefined &&
          data.activeContext?.revision !== selectedRevision
        )
          window.dispatchEvent(new Event("hca:profile-updated"));
        selectedRevision = data.activeContext?.revision;
        if (revision && data.revision !== revision) notify();
        revision = data.revision;
      } catch {
        /* Reconnect and the visible fallback recover missed invalidations. */
      }
    };
    const channel = client
      .channel("hca:user:" + userId, { config: { private: true } })
      .on("broadcast", { event: "invalidate" }, () => {
        notify();
        void resync();
      })
      .subscribe((status) => {
        ready = status === "SUBSCRIBED";
        setConnected(ready);
        if (ready) {
          notify();
          void resync();
          // Channel join can finish before the database broadcast stream catches up.
          clearTimeout(startupFirst);
          clearTimeout(startupSecond);
          clearTimeout(startupThird);
          startupFirst = setTimeout(() => void resync(), 500);
          startupSecond = setTimeout(() => void resync(), 2500);
          startupThird = setTimeout(() => void resync(), 6500);
        }
      });
    void resync();
    const recover = () => {
      void resync();
    };
    const fallback = setInterval(recover, 30_000);
    window.addEventListener("focus", recover);
    window.addEventListener("online", recover);
    document.addEventListener("visibilitychange", recover);
    const { data: authListener } = client.auth.onAuthStateChange((event) => {
      if (event === "TOKEN_REFRESHED" || event === "SIGNED_IN") void resync();
      if (event === "SIGNED_OUT") {
        void client.removeChannel(channel);
        setConnected(false);
      }
    });
    return () => {
      controller.abort();
      clearInterval(fallback);
      clearTimeout(timer);
      clearTimeout(startupFirst);
      clearTimeout(startupSecond);
      clearTimeout(startupThird);
      window.removeEventListener("focus", recover);
      window.removeEventListener("online", recover);
      document.removeEventListener("visibilitychange", recover);
      authListener.subscription.unsubscribe();
      void client.removeChannel(channel);
    };
  }, [userId, contextRevision]);
  return (
    <span className="sr-only" role="status">
      {connected
        ? "Atualização ao vivo conectada"
        : "Reconectando atualização ao vivo"}
    </span>
  );
}
