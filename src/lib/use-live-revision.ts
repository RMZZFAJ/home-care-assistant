"use client";
import { useEffect, useState } from "react";

/** Read models subscribe; form drafts deliberately do not. */
export function useLiveRevision() {
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const update = () => setRevision((value) => value + 1);
    window.addEventListener("hca:data-changed", update);
    return () => window.removeEventListener("hca:data-changed", update);
  }, []);
  return revision;
}
