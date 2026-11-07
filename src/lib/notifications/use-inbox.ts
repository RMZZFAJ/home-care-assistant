"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/client/api";
import { useLiveRevision } from "@/lib/use-live-revision";
import { parseInboxPage, type InboxPage } from "./inbox";

export function useInbox({ patientId, page = 1, pageSize = 20, unread = false, surface = "center", poll = false, paused = false }: {
  patientId?: string; page?: number; pageSize?: number; unread?: boolean; surface?: "bell" | "center"; poll?: boolean; paused?: boolean;
}) {
  const live = useLiveRevision(), [attempt, setAttempt] = useState(0);
  const selection = JSON.stringify([patientId, page, pageSize, unread, surface]);
  const key = JSON.stringify([selection, attempt, live, paused]);
  const [result, setResult] = useState<{ key: string; selection: string; data: InboxPage; receivedAt: string } | null>(null);
  const [failure, setFailure] = useState<{ key: string; selection: string; message: string; unavailable: boolean } | null>(null);
  const url = "/api/notifications?" + new URLSearchParams({ ...(patientId ? { careRecipientId: patientId } : {}), page: String(page), pageSize: String(pageSize), unread: String(unread), surface });
  useEffect(() => {
    if (!patientId || paused) return;
    const controller = new AbortController();
    void api<unknown>(url, undefined, controller.signal).then(value => parseInboxPage(value, patientId)).then(data => {
      if (!controller.signal.aborted) { setResult({ key, selection, data, receivedAt: new Date().toISOString() }); setFailure(null); }
    }).catch(reason => {
      if (!controller.signal.aborted) setFailure({ key, selection, message: reason instanceof Error ? reason.message : "Não foi possível consultar as notificações.", unavailable: reason instanceof ApiError && [401, 403, 404, 409].includes(reason.status) });
    });
    return () => controller.abort();
  }, [key, selection, url, patientId, paused]);
  useEffect(() => {
    if (!poll || !patientId || paused) return;
    const update = () => { if (!document.hidden) setAttempt(value => value + 1); };
    const timer = window.setInterval(update, 30_000);
    document.addEventListener("visibilitychange", update);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", update); };
  }, [poll, patientId, paused]);
  const unavailable = failure?.selection === selection && failure.unavailable;
  const current = result?.selection === selection && !unavailable ? result : null;
  const required = !patientId || current?.data.availability === "patient_context_required";
  const loading = !paused && !required && result?.key !== key && failure?.key !== key;
  const fresh = !paused && !required && result?.key === key;
  return {
    data: !paused && !required ? current?.data ?? null : null,
    receivedAt: current?.receivedAt ?? null,
    scopeRequired: required,
    paused,
    loading,
    fresh,
    error: failure?.selection === selection ? failure.message : "",
    refresh: () => setAttempt(value => value + 1),
  };
}
