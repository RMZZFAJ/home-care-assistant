"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { formatBrazilDate } from "@/lib/receipt";
import { LogoutButton } from "@/components/auth/logout-button";

type HistoryRow = {
  id: string;
  protocol: string;
  status: string;
  created_at: string;
  profiles?: { full_name?: string } | { full_name?: string }[];
  care_recipients?: { display_name?: string } | { display_name?: string }[];
};

type HistoryResponse = { data: HistoryRow[]; page: number; pageSize: number; total: number };

export function RequisitionHistory() {
  const [rows, setRows] = useState<HistoryResponse | null>(null);
  const [protocol, setProtocol] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "20" });
      if (protocol.trim()) params.set("protocol", protocol.trim());
      if (status) params.set("status", status);
      const response = await fetch(`/api/requisitions?${params}`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Não foi possível carregar o histórico.");
      setRows(body);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível carregar o histórico.");
    } finally {
      setLoading(false);
    }
  }, [page, protocol, status]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  return (
    <main className="min-h-screen">
      <header className="border-b border-(--line) bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-4">
          <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-(--brand)">Home Care Assistant</p><h1 className="mt-1 text-2xl font-semibold">Histórico de requisições</h1></div>
          <div className="flex items-center gap-2"><Link href="/" className="rounded-lg border border-(--line) px-3 py-2 text-sm font-semibold">Nova requisição</Link><LogoutButton /></div>
        </div>
      </header>
      <div className="mx-auto max-w-5xl space-y-5 px-4 py-6">
        <form className="grid gap-3 rounded-xl border border-(--line) bg-white p-4 sm:grid-cols-[1fr_180px_auto]" onSubmit={(event) => { event.preventDefault(); setPage(1); void load(); }}>
          <label className="text-sm font-semibold">Buscar protocolo<input value={protocol} onChange={(event) => setProtocol(event.target.value)} placeholder="HC-000012" className="mt-1 min-h-11 w-full rounded-lg border border-(--line) p-3" /></label>
          <label className="text-sm font-semibold">Status<select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="mt-1 min-h-11 w-full rounded-lg border border-(--line) p-3"><option value="">Todos</option><option value="submitted">Enviada</option><option value="under_review">Em análise</option><option value="approved">Aprovada</option><option value="cancelled">Cancelada</option></select></label>
          <button type="submit" className="self-end rounded-lg bg-(--brand) px-4 py-3 text-sm font-bold text-white">Buscar</button>
        </form>
        {loading && <p role="status" className="rounded-xl border border-(--line) bg-white p-6 text-sm text-(--muted)">Carregando histórico...</p>}
        {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><p>{error}</p><button type="button" onClick={() => void load()} className="mt-3 font-bold underline">Tentar novamente</button></div>}
        {!loading && !error && rows?.data.length === 0 && <p className="rounded-xl border border-(--line) bg-white p-6 text-sm text-(--muted)">Nenhuma requisição encontrada.</p>}
        {!loading && !error && rows && rows.data.length > 0 && <div className="overflow-hidden rounded-xl border border-(--line) bg-white"><ul className="divide-y divide-(--line)">{rows.data.map((row) => <li key={row.id} className="p-4"><Link href={`/historico/${row.id}`} className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-bold text-(--brand)">{row.protocol}</p><p className="mt-1 text-sm">{displayName(row.care_recipients)} · {displayName(row.profiles)}</p><p className="mt-1 text-xs text-(--muted)">{formatBrazilDate(row.created_at)}</p></div><span className="rounded-full bg-[#edf5f1] px-3 py-1 text-xs font-semibold">{row.status}</span></Link></li>)}</ul></div>}
        {rows && rows.total > rows.pageSize && <div className="flex items-center justify-between"><button type="button" disabled={page <= 1 || loading} onClick={() => setPage((current) => current - 1)} className="rounded-lg border border-(--line) px-4 py-2 text-sm font-semibold disabled:opacity-40">Anterior</button><span className="text-sm text-(--muted)">Página {rows.page}</span><button type="button" disabled={page * rows.pageSize >= rows.total || loading} onClick={() => setPage((current) => current + 1)} className="rounded-lg border border-(--line) px-4 py-2 text-sm font-semibold disabled:opacity-40">Próxima</button></div>}
      </div>
    </main>
  );
}

function displayName(value: HistoryRow["profiles"] | HistoryRow["care_recipients"]) {
  const item = Array.isArray(value) ? value[0] : value;
  if (!item) return "Sem nome";
  const record = item as { full_name?: string; display_name?: string };
  return record.full_name ?? record.display_name ?? "Sem nome";
}
