"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { formatBrazilDate } from "@/lib/receipt";
import { api, buttonClass, inputClass, may, Notice, panelClass, primaryClass, Workspace, type WorkspaceContext } from "@/components/workspace";

type Product = { id: string; name: string; unit: string; is_active?: boolean; active?: boolean };
type Balance = { product_id: string; location: string; balance: number };
type Movement = { id: string; product_id: string; quantity: number; movement_type: string; source_location: string | null; destination_location: string | null; justification: string; created_at: string; reference_type?: string | null; source_balance_before?: number; source_balance_after?: number; destination_balance_before?: number; destination_balance_after?: number };
type Alert = { id: string; product_id: string; location: string; severity?: string; state?: string };
type StockResponse = { data: Movement[]; balances: Balance[]; alerts?: Alert[]; page: number; pageSize: number; total: number };
const custody = { CARE_TEAM: "Equipe de cuidado", FAMILY: "Família" };
const movementLabels: Record<string,string> = { inbound: "Entrada", outbound: "Saída", transfer: "Transferência", adjustment: "Ajuste compensatório", exceptionalAdjustment: "Ajuste extraordinário" };
const emptyHistoryFilter = { productId: "", location: "", from: "", to: "" };

export function StockConsole() { return <Workspace title="Estoque por custódia">{(context) => context.patient ? <PatientStock context={context} /> : <Notice>Cadastre ou selecione um paciente para consultar o estoque.</Notice>}</Workspace>; }
function PatientStock({ context }: { context: WorkspaceContext }) {
  const [products,setProducts] = useState<Product[]>([]);
  const [balances,setBalances] = useState<Balance[]>([]);
  const [movements,setMovements] = useState<Movement[]>([]);
  const [alerts,setAlerts] = useState<Alert[]>([]);
  const [loading,setLoading] = useState(true);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  const [message,setMessage] = useState("");
  const [attempt,setAttempt] = useState(0);
  const [movementType,setMovementType] = useState("inbound");
  const [filter,setFilter] = useState({productId:"",location:""});
  const [historyDraft,setHistoryDraft] = useState(emptyHistoryFilter);
  const [historyFilter,setHistoryFilter] = useState(emptyHistoryFilter);
  const [page,setPage] = useState(1);
  const [pagination,setPagination] = useState({ page: 1, pageSize: 20, total: 0 });
  const [uncertain,setUncertain] = useState(false);
  const pendingRef = useRef<Record<string,unknown> | null>(null);
  const patientId = context.patient!.id;
  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ careRecipientId: patientId, page: String(page), pageSize: "20" });
    for (const [key,value] of Object.entries(historyFilter)) if (value) params.set(key,value);
    Promise.all([api<{data:Product[]}>(`/api/catalog?careRecipientId=${patientId}&includeInactive=true`,undefined,controller.signal),api<StockResponse>(`/api/stock/movements?${params}`,undefined,controller.signal)]).then(([catalog,stock]) => {
      if (controller.signal.aborted) return;
      setProducts(catalog.data); setBalances(stock.balances ?? []); setMovements(stock.data); setAlerts(stock.alerts ?? []); setPagination({ page: stock.page, pageSize: stock.pageSize, total: stock.total }); setError("");
    }).catch((reason) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Não foi possível carregar o estoque."); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  },[patientId,attempt,page,historyFilter]);
  function searchHistory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (historyDraft.from && historyDraft.to && historyDraft.from > historyDraft.to) { setError("A data inicial precisa ser anterior ou igual à final."); return; }
    setError(""); setLoading(true); setPage(1); setHistoryFilter({...historyDraft});
  }
  async function save(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault(); setError(""); setMessage("");
    const formElement = event?.currentTarget;
    if (!pendingRef.current && event) {
      const form = new FormData(event.currentTarget); const location = String(form.get("location")); const quantity = Number(form.get("quantity"));
      if (!Number.isSafeInteger(quantity) || quantity === 0 || (movementType !== "exceptionalAdjustment" && quantity < 0)) { setError("Informe uma quantidade inteira válida."); return; }
      const base = { careRecipientId:context.patient!.id,productId:form.get("productId"),quantity,justification:form.get("justification"),idempotencyKey:crypto.randomUUID() };
      pendingRef.current = movementType === "exceptionalAdjustment" ? { ...base,action:"exceptionalAdjustment",location,confirmation:form.has("confirmation") } : { ...base,movementType:movementType === "adjustmentIn" || movementType === "adjustmentOut" ? "adjustment" : movementType,sourceLocation:movementType === "outbound" || movementType === "adjustmentOut" || movementType === "transfer" ? location : null,destinationLocation:movementType === "inbound" || movementType === "adjustmentIn" ? location : movementType === "transfer" ? form.get("destinationLocation") : null,referenceType:null,referenceId:null };
    }
    if (!pendingRef.current) return;
    setBusy(true);
    try { await api("/api/stock/movements",pendingRef.current); pendingRef.current = null; setUncertain(false); setMessage("Movimentação registrada. Saldos atualizados."); formElement?.reset(); setLoading(true); setPage(1); setAttempt((value) => value + 1); }
    catch(reason) { setUncertain(true); setError(reason instanceof Error ? reason.message : "Não foi possível confirmar a movimentação."); }
    finally { setBusy(false); }
  }
  const productName = (id:string) => products.find((item) => item.id === id) ? `${products.find((item) => item.id === id)!.name}${products.find((item) => item.id === id)!.is_active === false ? " (inativo)" : ""}` : id;
  const visibleProducts = products.filter((item) => !filter.productId || item.id === filter.productId);
  return <div className="space-y-5">
    {loading && <Notice>Carregando catálogo, saldos e movimentações…</Notice>}
    {error && <Notice error>{error}<button className={`${buttonClass} ml-3`} onClick={() => { setLoading(true); setAttempt((value) => value + 1); }}>Atualizar consulta</button></Notice>}{message && <Notice>{message}</Notice>}
    <section className={panelClass}><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold">Saldos atuais</h2><button className={buttonClass} disabled={loading} onClick={() => { setLoading(true); setAttempt((value) => value + 1); }}>Atualizar saldos</button></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-sm font-semibold">Produto<select className={inputClass} value={filter.productId} onChange={(event) => setFilter({...filter,productId:event.target.value})}><option value="">Todos</option>{products.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="text-sm font-semibold">Custódia<select className={inputClass} value={filter.location} onChange={(event) => setFilter({...filter,location:event.target.value})}><option value="">Todas</option>{Object.entries(custody).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></label></div><div role="region" aria-label="Saldos por produto e custódia" tabIndex={0} className="mt-5 overflow-x-auto focus-visible:outline-2 focus-visible:outline-(--brand)"><table className="min-w-full text-left text-sm"><caption className="sr-only">Saldos separados da equipe e da família</caption><thead><tr><th className="p-3">Item</th>{Object.entries(custody).filter(([key]) => !filter.location || key === filter.location).map(([key,label]) => <th className={`p-3 ${key === "CARE_TEAM" ? "bg-teal-50" : ""}`} key={key}>{label}</th>)}<th className="p-3">Total (ambas custódias)</th></tr></thead><tbody>{visibleProducts.map((item) => <tr key={item.id} className="border-t border-(--line)"><th className="p-3 font-semibold">{item.name}{item.is_active === false && " (inativo)"}<span className="block text-xs font-normal text-(--muted)">{item.unit}</span></th>{Object.keys(custody).filter((key) => !filter.location || key === filter.location).map((key) => <td key={key} className={`p-3 font-bold ${key === "CARE_TEAM" ? "bg-teal-50" : ""}`}>{balances.find((balance) => balance.product_id === item.id && balance.location === key)?.balance ?? 0}</td>)}<td className="p-3 font-semibold">{balances.filter((balance) => balance.product_id === item.id).reduce((sum,balance) => sum+balance.balance,0)}</td></tr>)}</tbody></table></div>{!loading && products.length === 0 && <p className="mt-3 text-sm">O catálogo deste paciente está vazio.</p>}</section>
    {alerts.length > 0 && <section className={panelClass}><h2 className="font-bold">Alertas de estoque</h2><ul className="mt-3 space-y-2 text-sm">{alerts.map((item) => <li key={item.id}>{productName(item.product_id)} · {custody[item.location as keyof typeof custody] ?? item.location} · {item.severity ?? item.state}</li>)}</ul></section>}
    {may(context,"manageStock") && <section className={panelClass}><h2 className="mb-4 text-lg font-bold">Registrar movimentação</h2><form onSubmit={save} className="space-y-4"><fieldset disabled={busy || uncertain || loading} className="grid min-w-0 gap-4 sm:grid-cols-2"><label className="text-sm font-semibold">Operação<select className={inputClass} value={movementType} onChange={(event) => setMovementType(event.target.value)}><option value="inbound">Entrada</option><option value="outbound">Saída</option><option value="transfer">Transferência</option><option value="adjustmentIn">Ajuste compensatório de entrada</option><option value="adjustmentOut">Ajuste compensatório de saída</option>{context.isGlobalAdmin && <option value="exceptionalAdjustment">Ajuste extraordinário global</option>}</select></label><label className="text-sm font-semibold">Item<select name="productId" required className={inputClass}><option value="">Selecione</option>{products.filter((item) => item.is_active !== false && item.active !== false).map((item) => <option key={item.id} value={item.id}>{item.name} · {item.unit}</option>)}</select></label><label className="text-sm font-semibold">{movementType === "transfer" ? "Custódia de origem" : "Custódia"}<select name="location" className={inputClass}>{Object.entries(custody).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></label>{movementType === "transfer" && <label className="text-sm font-semibold">Custódia de destino<select name="destinationLocation" className={inputClass}><option value="FAMILY">Família</option><option value="CARE_TEAM">Equipe de cuidado</option></select></label>}<label className="text-sm font-semibold">{movementType === "exceptionalAdjustment" ? "Variação do saldo (+ entrada / − saída)" : "Quantidade"}<input name="quantity" type="number" required step="1" min={movementType === "exceptionalAdjustment" ? undefined : 1} max="1000000" className={inputClass} /></label><label className="text-sm font-semibold sm:col-span-2">Justificativa<textarea name="justification" required minLength={3} maxLength={1000} className={inputClass} rows={3} /></label>{movementType === "exceptionalAdjustment" && <label className="flex items-start gap-3 rounded border border-amber-300 bg-amber-50 p-3 text-sm sm:col-span-2"><input type="checkbox" name="confirmation" required className="mt-1 h-5 w-5 shrink-0" />Confirmo o ajuste extraordinário e autorizo saldo negativo se necessário. A operação será auditada com esta justificativa.</label>}</fieldset><button disabled={busy || uncertain || loading} type="submit" className={primaryClass}>{busy ? "Registrando…" : "Confirmar movimentação"}</button></form>{uncertain && <div className="mt-4"><Notice>Esta tentativa ainda precisa de confirmação. Os dados e a chave foram preservados. Atualizar a consulta não inicia outra movimentação.</Notice><button className={`${primaryClass} mt-3`} disabled={busy} onClick={() => void save()}>{busy ? "Recuperando…" : "Recuperar esta movimentação"}</button></div>}</section>}
    <section className={panelClass} aria-busy={loading}>
      <h2 className="font-bold">Histórico de movimentações</h2>
      <form onSubmit={searchHistory} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <label className="text-sm font-semibold">Produto do histórico<select className={inputClass} value={historyDraft.productId} onChange={(event) => setHistoryDraft({...historyDraft,productId:event.target.value})}><option value="">Todos</option>{products.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="text-sm font-semibold">Custódia do histórico<select className={inputClass} value={historyDraft.location} onChange={(event) => setHistoryDraft({...historyDraft,location:event.target.value})}><option value="">Todas</option>{Object.entries(custody).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        <label className="text-sm font-semibold">De<input type="date" className={inputClass} value={historyDraft.from} max={historyDraft.to || undefined} onChange={(event) => setHistoryDraft({...historyDraft,from:event.target.value})} /></label>
        <label className="text-sm font-semibold">Até<input type="date" className={inputClass} value={historyDraft.to} min={historyDraft.from || undefined} onChange={(event) => setHistoryDraft({...historyDraft,to:event.target.value})} /></label>
        <button type="submit" disabled={loading} className={`${primaryClass} self-end`}>Buscar movimentações</button>
        <p className="text-xs text-(--muted) sm:col-span-2 lg:col-span-5">O período considera dias completos no fuso de São Paulo. Os filtros do histórico não alteram os saldos atuais.</p>
      </form>
      {!loading && !error && <><p className="mt-5 text-sm text-(--muted)">{pagination.total} movimentação(ões) encontrada(s).</p><ul className="mt-4 space-y-3">{movements.map((item) => <li key={item.id} className="rounded border border-(--line) p-3 text-sm"><p className="font-semibold">{productName(item.product_id)} · {item.reference_type === "extraordinary_adjustment" ? movementLabels.exceptionalAdjustment : item.source_location && item.destination_location ? movementLabels.transfer : movementLabels[item.movement_type] ?? item.movement_type} · {item.quantity}</p><p className="mt-1">{item.source_location ? custody[item.source_location as keyof typeof custody] : "Origem externa"} → {item.destination_location ? custody[item.destination_location as keyof typeof custody] : "Saída externa"}</p>{item.source_balance_before != null && <p>Saldo de origem: {item.source_balance_before} → {item.source_balance_after}</p>}{item.destination_balance_before != null && <p>Saldo de destino: {item.destination_balance_before} → {item.destination_balance_after}</p>}<p className="mt-1">{item.justification}</p><p className="mt-2 text-xs text-(--muted)">{formatBrazilDate(item.created_at)}</p></li>)}</ul>{movements.length === 0 && <p className="mt-3 text-sm">Nenhuma movimentação encontrada para os filtros selecionados.</p>}</>}
      {pagination.total > pagination.pageSize && <nav aria-label="Páginas das movimentações" className="mt-5 flex flex-wrap items-center justify-between gap-3"><button type="button" disabled={page <= 1 || loading} className={buttonClass} onClick={() => { setLoading(true); setPage((value) => value - 1); }}>Anterior</button><span className="text-sm">Página {pagination.page} de {Math.ceil(pagination.total / pagination.pageSize)}</span><button type="button" disabled={page * pagination.pageSize >= pagination.total || loading} className={buttonClass} onClick={() => { setLoading(true); setPage((value) => value + 1); }}>Próxima</button></nav>}
    </section>
  </div>;
}
