"use client";
import { ActionButton } from "@/components/ui/controls";
import { Icon } from "@/components/ui/primitives";
export function DocumentFreshness({ stale, loading, onRefresh }: { stale: boolean; loading: boolean; onRefresh: () => void; }) {
  return stale ? <aside className="hca-document-freshness" role="status"><Icon name="refresh" /><div><strong>Esta ficha recebeu alterações</strong><p>Atualize para consultar o estado atual. Seu preenchimento permanece preservado; novos PDFs aguardam a atualização.</p></div><ActionButton disabled={loading} onClick={onRefresh}>{loading ? "Atualizando…" : "Atualizar agora"}</ActionButton></aside> : null;
}
