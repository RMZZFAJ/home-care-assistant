"use client";
import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/client/api";

/** Independent reads retain only an authorized result of the same scope. */
export function useScopedRead<T>(url: string | null, revision = "", decode?: (value: unknown) => T) {
  const [attempt, setAttempt] = useState(0);
  const refresh = useCallback(() => setAttempt(value => value + 1), []);
  const key = JSON.stringify([url, revision, attempt]);
  const [result, setResult] = useState<{
    key: string;
    revision: string;
    url: string | null;
    data: T | null;
    queriedAt: string | null;
    error: string;
    errorStatus?: number;
    errorCause?: unknown;
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
            revision,
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
          revision,
          url,
          data: mayRetain && previous?.url === url ? previous.data : null,
          queriedAt:
            mayRetain && previous?.url === url ? previous.queriedAt : null,
          error:
            reason instanceof Error
              ? reason.message
              : "Consulta indisponível. Tente novamente.",
          errorStatus: reason instanceof ApiError ? reason.status : undefined,
          errorCause: reason,
        }));
      });
    return () => controller.abort();
  }, [url, key, revision, decode]);
  const sameScope = url !== null && result?.url === url;
  return {
    data: sameScope ? result.data : null,
    queriedAt: sameScope ? result.queriedAt : null,
    error: sameScope ? result.error : "",
    errorStatus: sameScope ? result.errorStatus : undefined,
    errorCause: sameScope ? result.errorCause : undefined,
    settledRevision: sameScope ? result.revision : null,
    loading: url !== null && result?.key !== key,
    refresh,
  };
}
