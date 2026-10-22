"use client";
import { useSyncExternalStore } from "react";
const subscribe = () => () => {};
const ready = () => true;
const server = () => false;
// Forms become interactive only after React can retain edits and handle submission.
export function useClientReady() {
  return useSyncExternalStore(subscribe, ready, server);
}
