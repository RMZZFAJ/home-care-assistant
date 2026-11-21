"use client";
import { useCallback, useSyncExternalStore } from "react";
const event = "hca:presentation-changed";
function subscribe(listener: () => void) { window.addEventListener(event, listener); window.addEventListener("storage", listener); return () => { window.removeEventListener(event, listener); window.removeEventListener("storage", listener); }; }
export function usePresentationMode(userId: string) {
  const key = "hca:presentation:" + userId;
  const snapshot = useCallback(() => { try { return localStorage.getItem(key) === "simple" ? "simple" : "complete"; } catch { return "complete"; } }, [key]);
  const mode = useSyncExternalStore(subscribe, snapshot, () => "complete");
  return { mode, setMode: (value: "simple" | "complete") => { try { localStorage.setItem(key, value); } catch {/* Optional presentation preference. */ } window.dispatchEvent(new Event(event)); } };
}
