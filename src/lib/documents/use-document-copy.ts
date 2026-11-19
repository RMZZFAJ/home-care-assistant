"use client";
import { useCallback, useRef, useState, type SetStateAction } from "react";

/** Detect a real change from an authorized read; global invalidation alone is not a change. */
export function useDocumentCopy<T>(identity: (value: T) => string) {
  const [storedData, setStoredData] = useState<T | null>(null);
  const [observedData, setObservedData] = useState<T | null>(null);
  const currentRef = useRef<T | null>(null), acceptedReadRef = useRef<string | null>(null);
  const setData = useCallback((value: SetStateAction<T | null>) => {
    const next = typeof value === "function" ? (value as (before: T | null) => T | null)(currentRef.current) : value;
    currentRef.current = next;
    setStoredData(next);
    setObservedData(null);
  }, []);
  const acceptRead = useCallback((next: T, key: string, preserveOperation = false) => {
    const changed = currentRef.current !== null && identity(currentRef.current) !== identity(next);
    if (changed && (acceptedReadRef.current === key || preserveOperation)) {
      setObservedData(next);
      return;
    }
    acceptedReadRef.current = key;
    setData(next);
  }, [identity, setData]);
  return { data: storedData, observedData, setData, acceptRead, stale: observedData !== null };
}
