"use client";
import { useEffect, useRef } from "react";
import type { CreationDraftContent } from "@/types/creation-drafts";
import type { CreationDraftController } from "./use-creation-draft";

/** Only opted-in long forms save their last edit, without interrupting typing. */
export function useLongDraftAutosave(draft: CreationDraftController, content: CreationDraftContent, enabled: boolean) {
  const saveRef = useRef(draft.save), attemptedRef = useRef("");
  useEffect(() => { saveRef.current = draft.save; }, [draft.save]);
  const serialized = JSON.stringify({ content, navigation: draft.navigation }), saved = JSON.stringify({ content: draft.base?.content ?? null, navigation: draft.base?.navigation ?? null });
  // After an explicit conflict choice the same edit belongs to a new base revision.
  const attempt = JSON.stringify([draft.kind, draft.purpose, draft.base?.id, draft.base?.revision, serialized]);
  useEffect(() => {
    if (!enabled || !draft.active || draft.blocked || draft.backgroundBusy || serialized === saved || attempt === attemptedRef.current) return;
    const timer = setTimeout(() => {
      attemptedRef.current = attempt;
      void saveRef.current((JSON.parse(serialized) as { content: CreationDraftContent }).content, { background: true });
    }, 900);
    return () => clearTimeout(timer);
  }, [enabled, draft.active, draft.blocked, draft.backgroundBusy, serialized, saved, attempt]);
}
