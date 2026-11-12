"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { z } from "zod";
import { complementType } from "@/lib/documents/document-complements";
import { Notice, buttonClass } from "@/components/workspace";

/** Navigation context only: the actual relation still requires its authorized act. */
export function ComplementOriginHint() {
  const params = useSearchParams(), id = z.string().uuid().safeParse(params.get("complementOf"));
  const type = complementType.safeParse(params.get("complementType"));
  if (!id.success || !type.success) return null;
  return <Notice><p>Esta é uma nova ficha. Depois de emiti-la, volte à ficha original para conferir e registrar o vínculo complementar. Nenhum vínculo será criado automaticamente.</p>
    <Link className={buttonClass} href={(type.data === "REQ" ? "/historico/" : "/fichas/") + id.data}>Voltar à ficha original para vincular</Link></Notice>;
}
