"use client";
import Link from "next/link";
import { RelatedDocument } from "./related-document";
import type { z } from "zod";
import { progressReferenceRow } from "@/lib/validation/document-progress";
import { progressReferencePage } from "@/lib/validation/document-progress";
import { useCallback } from "react";
import { useScopedRead } from "@/lib/use-scoped-read";
export function ProgressReference({ reference }: { reference: z.infer<typeof progressReferenceRow>; }) {
  if (reference.kind !== "progress" || !reference.documentId) return <RelatedDocument id={reference.id} type={reference.type} label={reference.code ?? "Ficha vinculada"} />;
  return <Link className="hca-progress-reference" prefetch={false} href={"/documentos/" + reference.documentId + "?documentTab=overview&progressRecord=" + reference.id + "#andamento-" + reference.id}><strong>Andamento · {reference.code ?? "Ficha"}</strong><span>{reference.excerpt}</span></Link>;
}
export function SavedProgressReference({ documentId, id }: { documentId: string; id: string ;}) {
  const decode = useCallback((raw: unknown) => { const page = progressReferencePage.parse(raw); if (page.documentId !== documentId || page.search !== id) throw new Error("Referência indisponível."); return page.data.find(row => row.id === id) ?? null; }, [documentId, id]);
  const read = useScopedRead(`/api/documents/${documentId}/progress/references?search=${encodeURIComponent(id)}`, "", decode);
  return read.loading ? <span>Conferindo referência autorizada…</span> : read.error || !read.data ? <span>Referência sem leitura autorizada neste contexto.</span> : <ProgressReference reference={read.data} />;
}
