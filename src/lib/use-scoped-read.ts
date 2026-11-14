"use client";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/client/api";

/** Independent reads retain only an authorized result of the same scope. */
export function useScopedRead<T>(url: string | null, revision = "", decode?: (value: unknown) => T) {
  const [attempt, setAttempt] = useState(0);
  const key = JSON.stringify([url, revision, attempt]);
  const [result, setResult] = useState<{
    key: string;
    url: string | null;
    data: T | null;
    queriedAt: string | null;
    error: string;
  } | null>(null);
  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();
    api<unknown>(url, undefined, controller.signal)
      .then((value) => {
        const data = decode ? decode(value) : value as T;
        if (!controller.signal.aborted)
          setResult({
            key,
            url,
            data,
            queriedAt: new Date().toISOString(),
            error: "",
          });
      })
      .catch((reason) => {
        if (controller.signal.aborted) return;
        const mayRetain = !(
          reason instanceof ApiError && [401, 403, 404].includes(reason.status)
        );
        setResult((previous) => ({
          key,
          url,
          data: mayRetain && previous?.url === url ? previous.data : null,
          queriedAt:
            mayRetain && previous?.url === url ? previous.queriedAt : null,
          error:
            reason instanceof Error
              ? reason.message
              : "Consulta indisponível. Tente novamente.",
        }));
      });
    return () => controller.abort();
  }, [url, key, decode]);
  const sameScope = url !== null && result?.url === url;
  return {
    data: sameScope ? result.data : null,
    queriedAt: sameScope ? result.queriedAt : null,
    error: sameScope ? result.error : "",
    loading: url !== null && result?.key !== key,
    refresh: () => setAttempt((value) => value + 1),
  };
}
