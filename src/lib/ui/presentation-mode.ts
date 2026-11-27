"use client";
import { useCallback, useSyncExternalStore } from "react";
type PresentationMode = "simple" | "complete";
const event = "hca:presentation-changed";
function subscribe(listener: () => void) { window.addEventListener(event, listener); window.addEventListener("storage", listener); return () => { window.removeEventListener(event, listener); window.removeEventListener("storage", listener); }; }
export function usePresentationMode(userId: string) {
  const key = "hca:presentation:" + userId;
  const snapshot = useCallback((): PresentationMode => { try { return localStorage.getItem(key) === "simple" ? "simple" : "complete"; } catch { return "complete"; } }, [key]);
  const mode = useSyncExternalStore<PresentationMode>(subscribe, snapshot, () => "complete");
  return { mode, setMode(value: PresentationMode) {
    try { localStorage.setItem(key, value); }
    catch { return false; }
    window.dispatchEvent(new Event(event));
    return true;
  } };
}
