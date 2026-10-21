"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { deliveryLabels, recipientGroupLabels, deliveryErrorLabels, type DeliveryStatus } from "@/lib/notifications/presentation";
import { textRows } from "@/lib/text-rows";
import { CATEGORY_LABELS } from "@/lib/catalog";
import { matchCatalog, normalizeCatalogText as normalize } from "@/lib/catalog-match";
import { buildWhatsAppSummary, formatBrazilDate } from "@/lib/receipt";
import type { ExtraItem, RequisitionFormData, RequisitionLine, RequisitionReceipt } from "@/types/requisition";
import Link from "next/link";
import { api, ApiError, buttonClass, Notice, may, Workspace, type WorkspaceContext } from "@/components/workspace";

const steps = ["Identificação", "Medicamentos", "Higiene", "Dieta", "Itens extras", "Observações", "Revisão"];
const emptyExtra = (): ExtraItem => ({ id: `extra-${crypto.randomUUID()}`, name: "", currentStock: 0, urgent: false });

type Product = { id: string; name: string; category: RequisitionLine["category"]; unit: string; aliases?: string[]; active?: boolean; is_active?: boolean };
type Balance = { product_id:string; location:string; balance:number };
type SavedReceipt = RequisitionReceipt & { id?: string; requisitionId?: string };

export function RequisitionWizard() {
  return <Workspace title="Requisição de insumos">{(context) => context.patient ? <PatientRequisition context={context} /> : <Notice>Cadastre um paciente na administração para iniciar.</Notice>}</Workspace>;
}

function PatientRequisition({ context }: { context: WorkspaceContext }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<RequisitionFormData>({ lines: [], extraItems: [], observations: [] });
  const [receipt, setReceipt] = useState<SavedReceipt | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const idempotencyKeyRef = useRef<string | null>(null);
  const frozenRef = useRef<Record<string, unknown> | null>(null);
  const [uncertain, setUncertain] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [balances,setBalances] = useState<Balance[]>([]);
  const [stockUpdatedAt,setStockUpdatedAt] = useState<string|null>(null);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const [catalogAttempt, setCatalogAttempt] = useState(0);
  const storageKey = `hca:v1:requisition:${context.userId}:${context.patient!.id}`;
  useEffect(() => {
    let restore: Record<string, unknown> | null = null;
    try { const stored = sessionStorage.getItem(storageKey); if (stored) { const envelope = JSON.parse(stored); if (typeof envelope.savedAt === "number" && Date.now() - envelope.savedAt >= 0 && Date.now() - envelope.savedAt <= 86_400_000) restore = envelope.intent; else sessionStorage.removeItem(storageKey); } } catch { /* recuperação em memória permanece disponível */ }
    if (!restore || restore.careRecipientId !== context.patient!.id || typeof restore.idempotencyKey !== "string" || !Array.isArray(restore.lines) || !Array.isArray(restore.extraItems) || !Array.isArray(restore.observations)) return;
    const pending = restore;
    const timer = window.setTimeout(() => { frozenRef.current = pending; idempotencyKeyRef.current = String(pending.idempotencyKey); setForm({ lines: pending.lines as RequisitionLine[], extraItems: pending.extraItems as ExtraItem[], observations: pending.observations as string[] }); setStep(6); setUncertain(true); },0);
    return () => window.clearTimeout(timer);
  }, [storageKey, context.patient]);
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([api<{data:Product[]}>(`/api/catalog?careRecipientId=${context.patient!.id}`,undefined,controller.signal),api<{data:Balance[];updatedAt:string|null}>(`/api/stock/balances?careRecipientId=${context.patient!.id}`,undefined,controller.signal)]).then(([body,stock]) => { if(controller.signal.aborted)return; setProducts(body.data.filter((item) => item.active !== false && item.is_active !== false)); setBalances(stock.data); setStockUpdatedAt(stock.updatedAt); setCatalogError(""); }).catch((reason) => { if (!controller.signal.aborted) setCatalogError(reason instanceof Error ? reason.message : "Não foi possível carregar o catálogo."); }).finally(() => { if (!controller.signal.aborted) setLoadingCatalog(false); });
    return () => controller.abort();
  }, [context.patient, catalogAttempt]);

  const currentCategory = (["medicamentos", "higiene", "dieta"] as const)[step - 1];
  const categoryItems = useMemo(() => products.filter((item) => item.category === currentCategory), [products, currentCategory]);
  const selected = (id: string) => form.lines.find((line) => line.productId === id);

  function updateLine(item: Product, patch: Partial<RequisitionLine>) {
    setForm((current) => {
      const existing = current.lines.find((line) => line.productId === item.id);
      if (!existing) return { ...current, lines: [...current.lines, { productId: item.id, productName: item.name, category: item.category, unit: item.unit, currentStock: 0, urgent: false, ...patch }] };
      return { ...current, lines: current.lines.map((line) => line.productId === item.id ? { ...line, ...patch } : line) };
    });
  }

  function removeLine(id: string) {
    setForm((current) => ({ ...current, lines: current.lines.filter((line) => line.productId !== id) }));
  }

  function validateStep() {
    if (!context.patient || !may(context, "request")) return "Seu vínculo não permite registrar requisições neste paciente.";
    if (loadingCatalog || catalogError) return "Aguarde o carregamento do catálogo autorizado.";
    if (step >= 1 && step <= 3 && form.lines.filter((line) => line.category === currentCategory).some((line) => !Number.isSafeInteger(line.currentStock) || line.currentStock < 0 || line.currentStock > 100000)) return "Revise o estoque informado.";
    if (step === 4 && form.extraItems.some((item) => !item.name.trim() || !Number.isSafeInteger(item.currentStock) || item.currentStock < 0 || item.currentStock > 100000)) return "Preencha ou remova os itens extras antes de continuar.";
    if (step === 5 && form.observations.some((observation) => !observation.trim())) return "Preencha ou remova as observações vazias antes de continuar.";
    if (step === 6 && form.lines.length === 0 && form.extraItems.every((item) => !item.name.trim())) return "Selecione ou informe ao menos um item.";
    return "";
  }

  function next() {
    const validationError = validateStep();
    if (validationError) { setError(validationError); return; }
    setError("");
    setStep((current) => Math.min(current + 1, steps.length - 1));
  }

  function previous() { setError(""); setStep((current) => Math.max(current - 1, 0)); }

  async function submit() {
    const validationError = validateStep();
    if (validationError) { setError(validationError); return; }
    setSaving(true); setError("");
    if (!idempotencyKeyRef.current) idempotencyKeyRef.current = crypto.randomUUID();
    if (!frozenRef.current) frozenRef.current = { ...form, careRecipientId: context.patient!.id, extraItems: form.extraItems.filter((item) => item.name.trim()), observations: form.observations.filter((item) => item.trim()), idempotencyKey: idempotencyKeyRef.current };
    try { sessionStorage.setItem(storageKey, JSON.stringify({ savedAt: Date.now(), intent: frozenRef.current })); } catch { /* a tentativa permanece congelada em memória */ }
    try {
      const body = await api<{ receipt: SavedReceipt; id?: string }>("/api/requisitions", frozenRef.current);
      if (!body.receipt) throw new Error("A resposta não incluiu o comprovante. Consulte o histórico e repita a mesma tentativa para recuperar o resultado.");
      setReceipt(body.receipt);
      sessionStorage.removeItem(storageKey);
    } catch (reason) {
      const rejected = reason instanceof ApiError && [400, 403, 413, 422].includes(reason.status);
      if (rejected) { frozenRef.current = null; idempotencyKeyRef.current = null; sessionStorage.removeItem(storageKey); }
      setUncertain(!rejected); setError(reason instanceof Error ? reason.message : "Não foi possível registrar a requisição.");
    }
    finally { setSaving(false); }
  }

  if (receipt) return <Receipt receipt={receipt} />;
  if (!may(context, "request")) return <Notice>Seu vínculo permite consultar este paciente. Acesse o histórico, o estoque e os inventários pela navegação.</Notice>;

  return (
    <div>
      <header className="sticky top-0 z-20 border-b border-(--line) bg-(--background)/95 backdrop-blur">
        <div className="mx-auto max-w-5xl px-3 pb-2 pt-3 sm:px-5 sm:pt-5">
          <div className="flex items-center justify-between gap-3">
            <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-(--brand) sm:text-xs">Home Care Assistant</p><h1 className="mt-1 text-lg font-semibold sm:text-xl">Requisição de insumos</h1></div>
            <p className="text-sm text-(--muted)">{context.patient?.display_name}</p>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-(--muted)"><span>Etapa {step + 1} de {steps.length}</span><span>{steps[step]}</span></div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#dfe8e4]"><span className="block h-full rounded-full bg-(--brand) transition-all" style={{ width: `${((step + 1) / steps.length) * 100}%` }} /></div>
          <nav aria-label="Etapas da requisição" className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
            {steps.map((label, index) => <button key={label} type="button" disabled={uncertain || saving || index > step} onClick={() => index <= step && setStep(index)} className={`shrink-0 rounded-lg border px-2.5 py-1.5 text-xs font-semibold sm:px-3 ${index === step ? "border-(--brand) bg-(--brand) text-white" : index < step ? "border-[#b7d1c7] bg-[#edf5f1] text-(--brand)" : "border-(--line) bg-white text-(--muted)"}`} aria-current={index === step ? "step" : undefined}>{index + 1}. {label}</button>)}
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-3 py-4 sm:px-5 sm:py-8">
        <section className="rounded-2xl border border-(--line) bg-white p-4 shadow-sm sm:p-8">
          <div className="mb-6"><p className="text-sm font-semibold text-(--brand)">Preencha o estoque atual</p><h2 className="mt-1 text-2xl font-semibold">{steps[step]}</h2></div>
          {loadingCatalog && <Notice>Carregando catálogo do paciente…</Notice>}
          {catalogError && <Notice error>{catalogError}<button className={`${buttonClass} ml-3`} onClick={() => setCatalogAttempt((value) => value + 1)}>Recarregar catálogo</button></Notice>}
          <fieldset disabled={saving || uncertain} className="min-w-0">
          {step === 0 && <Identity name={context.patient!.display_name} requesterName={context.fullName} />}
          {step >= 1 && step <= 3 && <CatalogStep balances={balances} stockUpdatedAt={stockUpdatedAt} items={categoryItems} selected={selected} updateLine={updateLine} removeLine={removeLine} />}
          {step === 4 && <Extras items={form.extraItems} setItems={(items) => setForm({ ...form, extraItems: items })} products={products} adopt={(product, extra) => { updateLine(product, { currentStock: extra.currentStock, urgent: extra.urgent }); setForm((current) => ({ ...current, extraItems: current.extraItems.filter((item) => item.id !== extra.id) })); }} />}
          {step === 5 && <Observations observations={form.observations} setObservations={(observations) => setForm({ ...form, observations })} />}
          {step === 6 && <Review form={form} recipientName={context.patient!.display_name} requesterName={context.fullName} />}
          </fieldset>
          {error && <p role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
          {uncertain && <Notice>O resultado da tentativa precisa ser confirmado. Os dados foram preservados nesta tela. Repita a mesma tentativa para recuperar o comprovante; consulte também o histórico antes de iniciar outra requisição.</Notice>}
          <div className="mt-8 flex justify-between gap-3 border-t border-(--line) pt-5"><button type="button" onClick={previous} disabled={step === 0 || saving || uncertain} className="rounded-lg border border-(--line) px-4 py-2 text-sm font-semibold disabled:opacity-40">Voltar</button>{step < 6 ? <button type="button" onClick={next} disabled={loadingCatalog || Boolean(catalogError)} className="rounded-lg bg-(--brand) px-5 py-2 text-sm font-bold text-white hover:bg-(--brand-dark) disabled:opacity-40">Continuar</button> : <button type="button" onClick={submit} disabled={saving} className="rounded-lg bg-(--brand) px-5 py-2 text-sm font-bold text-white disabled:opacity-50">{saving ? "Registrando..." : uncertain ? "Recuperar esta tentativa" : "Confirmar e registrar"}</button>}</div>
        </section>
      </div>
    </div>
  );
}

function Identity({ name, requesterName }: { name: string; requesterName: string }) { return <div className="space-y-5"><div className="rounded-xl bg-[#f1f7f7] p-5"><p className="text-sm text-(--muted)">Pessoa assistida</p><p className="mt-1 text-lg font-bold">{name}</p></div><div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Solicitante: <strong>{requesterName}</strong>. A identidade é confirmada pela sessão no servidor. Informe apenas o estoque atual e observações operacionais.</div></div>; }
function CatalogStep({ items, selected, updateLine, removeLine, balances, stockUpdatedAt }: { balances:Balance[]; stockUpdatedAt:string|null; items: Product[]; selected: (id: string) => RequisitionLine | undefined; updateLine: (item: Product, patch: Partial<RequisitionLine>) => void; removeLine: (id: string) => void }) {
  const [search, setSearch] = useState("");
  const category = items[0]?.category;
  const visible = items.filter((item) => [item.name, ...(item.aliases ?? [])].some((name) => normalize(name).includes(normalize(search))));
  function toggle(item: Product) {
    if (selected(item.id)) removeLine(item.id);
    else updateLine(item, {});
  }
  return <div className="space-y-4"><p className="text-sm font-semibold text-(--brand)">{category ? CATEGORY_LABELS[category] : "Catálogo"}</p><p className="text-sm text-(--muted)">Selecione os itens e informe somente o estoque atual. Não contém prescrição ou orientação clínica.</p><label className="block text-sm font-semibold">Buscar no catálogo<input value={search} onChange={(event) => setSearch(event.target.value)} className="mt-1 w-full rounded-lg border border-(--line) p-3" placeholder="Nome ou nome alternativo" /></label>{!visible.length && <p className="text-sm text-(--muted)">Nenhum item encontrado nesta categoria.</p>}{visible.map((item) => { const line = selected(item.id); return <div key={item.id} className={`cursor-pointer rounded-xl border p-4 transition-colors ${line ? "border-[#7da99a] bg-[#f8fbf9]" : "border-(--line) bg-white hover:border-[#7da99a]"}`}><div className="flex items-start justify-between gap-3"><label className="flex min-w-0 items-center gap-3 font-semibold" onClick={(event) => event.stopPropagation()}><input className="h-5 w-5 shrink-0 accent-(--brand)" type="checkbox" checked={Boolean(line)} onClick={(event) => event.stopPropagation()} onChange={() => toggle(item)} />{item.name}</label><span className="shrink-0 rounded-full bg-[#edf5f1] px-2 py-1 text-xs text-(--brand)">{item.unit}</span></div><div className="mt-3 grid gap-2 rounded bg-slate-50 p-3 text-sm sm:grid-cols-2"><p><strong>Em posse da equipe:</strong> {balances.find((row) => row.product_id===item.id && row.location==="CARE_TEAM")?.balance ?? 0}</p><p><strong>Em posse da família:</strong> {balances.find((row) => row.product_id===item.id && row.location==="FAMILY")?.balance ?? 0}</p><p className="text-xs text-(--muted) sm:col-span-2">Última movimentação do paciente: {stockUpdatedAt ? formatBrazilDate(stockUpdatedAt) : "Nenhuma registrada"}. O estoque informado abaixo é uma observação; não altera estes saldos.</p></div>{line && <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"><label className="text-sm font-semibold" onClick={(event) => event.stopPropagation()}>Estoque atual<input type="number" min="0" step="1" value={line.currentStock} onClick={(event) => event.stopPropagation()} onChange={(event) => updateLine(item, { currentStock: Number(event.target.value) })} className="mt-1 min-h-12 w-full rounded-lg border border-(--line) p-3 text-base" /></label><label className="flex min-h-12 items-center gap-2 text-sm font-semibold text-[#754c15]" onClick={(event) => event.stopPropagation()}><input className="h-5 w-5 accent-[#c48a36]" type="checkbox" checked={line.urgent} onClick={(event) => event.stopPropagation()} onChange={(event) => updateLine(item, { urgent: event.target.checked })} />Reposição urgente</label></div>}</div>})}</div>;
}
function Extras({ items, setItems, products, adopt }: { items: ExtraItem[]; setItems: (items: ExtraItem[]) => void; products: Product[]; adopt: (product: Product, extra: ExtraItem) => void }) {
  const classificationLabels = { exact: "Correspondência exata no catálogo.", alias: "Nome alternativo reconhecido no catálogo.", approximate: "Correspondência aproximada. Confira nome e unidade antes de escolher.", ambiguous: "Correspondência ambígua: há mais de um item possível. Escolha explicitamente o correto.", absent: "Nenhuma correspondência no catálogo deste paciente." };
  const candidateLabels = { exact: "Nome exato", alias: "Nome alternativo", approximate: "Grafia aproximada" };
  return <div className="space-y-4">
    <p className="text-sm text-(--muted)">Adicione materiais não disponíveis no catálogo e informe somente o estoque atual. As sugestões exigem sua escolha antes de vincular um item.</p>
    {items.map((item, index) => {
      const result = matchCatalog(item.name, products);
      return <div key={item.id} className="grid gap-3 rounded-xl border border-(--line) p-4 sm:grid-cols-[1fr_auto_auto]">
        <label className="text-sm font-semibold">Nome<input value={item.name} maxLength={200} onChange={(event) => setItems(items.map((current) => current.id === item.id ? { ...current, name: event.target.value } : current))} className="mt-1 min-h-12 w-full rounded-lg border border-(--line) p-3" /></label>
        <label className="text-sm font-semibold">Estoque atual<input type="number" min="0" step="1" value={item.currentStock} onChange={(event) => setItems(items.map((current) => current.id === item.id ? { ...current, currentStock: Number(event.target.value) } : current))} className="mt-1 min-h-12 w-full rounded-lg border border-(--line) p-3" /></label>
        <div className="flex items-end"><button type="button" onClick={() => setItems(items.filter((current) => current.id !== item.id))} className="min-h-12 w-full rounded-lg border border-red-200 px-3 text-left text-sm font-semibold text-red-700 sm:w-auto">Remover item {index + 1}</button></div>
        <label className="flex items-center gap-2 text-sm sm:col-span-3"><input type="checkbox" className="h-5 w-5" checked={item.urgent} onChange={(event) => setItems(items.map((current) => current.id === item.id ? { ...current, urgent: event.target.checked } : current))} />Reposição urgente</label>
        {normalize(item.name) && <div className="space-y-2 rounded-lg bg-slate-50 p-3 sm:col-span-3">
          <p role="status" className="text-sm font-semibold">{classificationLabels[result.classification]}</p>
          {result.candidates.slice(0, 5).map((candidate) => <button key={candidate.product.id} type="button" className="block min-h-11 w-full rounded border border-(--brand) p-2 text-left text-sm" onClick={() => adopt(candidate.product,item)}>Usar item do catálogo: {candidate.product.name} ({candidate.product.unit})<span className="mt-1 block text-xs text-(--muted)">{candidateLabels[candidate.kind]}{candidate.kind === "alias" ? `: ${candidate.matchedName}` : ""}</span></button>)}
          {result.candidates.length > 5 && <p className="text-xs text-(--muted)">Mostrando 5 de {result.candidates.length} possibilidades. Refine o nome para localizar o item correto.</p>}
        </div>}
      </div>;
    })}
    <button type="button" onClick={() => setItems([...items, emptyExtra()])} className="min-h-12 rounded-lg border border-(--brand) px-4 py-2 text-sm font-bold text-(--brand)">+ Incluir novo item</button>
  </div>;
}
function Observations({ observations, setObservations }: { observations: string[]; setObservations: (observations: string[]) => void }) {
  const [rows,setRows] = useState(() => observations.map((value) => ({id:crypto.randomUUID(),value})));
  function update(next: typeof rows) { setRows(next); setObservations(next.map((row) => row.value)); }
  return <div className="space-y-4"><p className="text-sm text-(--muted)">Registre apenas informações operacionais necessárias.</p>{rows.map((row,index) => <div key={row.id} className="flex gap-2"><textarea aria-label={`Observação ${index+1}`} rows={3} value={row.value} onChange={(event) => update(rows.map((item) => item.id===row.id ? {...item,value:event.target.value} : item))} className="w-full rounded-lg border border-(--line) p-3"/><button type="button" onClick={() => update(rows.filter((item) => item.id!==row.id))} className="self-start text-sm font-semibold text-red-700">Remover</button></div>)}<button type="button" onClick={() => update([...rows,{id:crypto.randomUUID(),value:""}])} className="rounded-lg border border-(--brand) px-4 py-2 text-sm font-bold text-(--brand)">+ Incluir nova observação</button></div>;
}
function Review({ form, recipientName, requesterName }: { form: RequisitionFormData; recipientName: string; requesterName: string }) { const lines = form.lines; const extras = form.extraItems.filter((item) => item.name.trim()); return <div className="space-y-6"><div><p className="text-sm text-(--muted)">Solicitante</p><p className="font-semibold">{requesterName}</p><p className="mt-4 text-sm text-(--muted)">Pessoa assistida</p><p className="font-semibold">{recipientName}</p></div><Summary title="Itens do catálogo" rows={lines.map((item) => `${item.productName} — estoque atual: ${item.currentStock ?? "desconhecido"}${item.urgent ? " (urgente)" : ""}`)} /><Summary title="Itens extras" rows={extras.map((item) => `${item.name} — estoque atual: ${item.currentStock ?? "desconhecido"}${item.urgent ? " (urgente)" : ""}`)} /><Summary title="Observações" rows={form.observations.filter((item) => item.trim())} /></div>; }
function Summary({ title, rows }: { title: string; rows: string[] }) { return <div><h3 className="font-bold">{title}</h3>{rows.length ? <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{textRows(rows).map((row) => <li key={row.key}>{row.value}</li>)}</ul> : <p className="mt-2 text-sm text-(--muted)">Nenhum registro.</p>}</div>; }
function Receipt({ receipt }: { receipt: SavedReceipt }) { const share = () => window.open(`https://wa.me/?text=${encodeURIComponent(buildWhatsAppSummary(receipt))}`, "_blank", "noopener,noreferrer"); return <div className="p-3 sm:p-5"><section className="mx-auto max-w-3xl rounded-2xl border border-(--line) bg-white p-5 shadow-sm sm:p-10"><p className="text-sm font-bold uppercase tracking-wider text-emerald-700">Requisição registrada</p><h1 className="mt-2 text-3xl font-semibold">Comprovante oficial</h1><div className="mt-6 grid gap-4 rounded-xl bg-[#f1f7f7] p-5 sm:grid-cols-2"><div><p className="text-sm text-(--muted)">Protocolo</p><p className="text-xl font-bold">{receipt.protocol}</p></div><div><p className="text-sm text-(--muted)">Data e hora</p><p className="font-semibold">{formatBrazilDate(receipt.createdAt)}</p></div></div><p className="mt-6 text-sm">Solicitante: <strong>{receipt.requesterName}</strong><br />Pessoa assistida: <strong>{receipt.recipientName}</strong></p><Summary title="Itens" rows={[...receipt.lines.map((item) => `${item.productName} — estoque atual: ${item.currentStock ?? "desconhecido"}${item.urgent ? " (urgente)" : ""}`), ...receipt.extraItems.map((item) => `${item.name} — estoque atual: ${item.currentStock ?? "desconhecido"}${item.urgent ? " (urgente)" : ""}`)]} /><Summary title="Observações" rows={receipt.observations} /><ReceiptNotifications id={receipt.id ?? receipt.requisitionId} /><div className="mt-8 flex flex-col gap-3 border-t border-(--line) pt-5 sm:flex-row"><button type="button" onClick={() => window.print()} className="min-h-12 rounded-lg bg-(--brand) px-4 py-2 text-sm font-bold text-white">Imprimir / salvar como PDF</button><button type="button" onClick={share} className="min-h-12 rounded-lg border border-(--brand) px-4 py-2 text-sm font-bold text-(--brand)">Compartilhar resumo pelo WhatsApp</button></div><div className="mt-5 flex flex-wrap gap-3 print:hidden"><Link className={buttonClass} href={receipt.id || receipt.requisitionId ? `/historico/${receipt.id ?? receipt.requisitionId}` : "/historico"}>Consultar registro e notificações</Link><Link className={buttonClass} href="/">Nova requisição</Link></div><p className="mt-4 text-xs text-(--muted)">O compartilhamento abre uma conversa com texto pré-preenchido; nenhum PDF é anexado automaticamente.</p></section></div>; }

function ReceiptNotifications({ id }: { id?: string }) {
  const [states,setStates] = useState<DeliveryStatus[] | null>(null);
  const [error,setError] = useState("");
  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    let timer: number | undefined;
    function update() {
      if (document.hidden) { timer = window.setTimeout(update,5000); return; }
      api<{ data: { requisition_notifications: DeliveryStatus[] } }>(`/api/requisitions/${id}`,undefined,controller.signal).then((body) => {
        if (controller.signal.aborted) return;
        setStates(body.data.requisition_notifications); setError("");
        if (body.data.requisition_notifications.some((item) => ["pending","processing","accepted","sent","delivered"].includes(item.state))) timer = window.setTimeout(update,5000);
      },() => { if (!controller.signal.aborted) { setError("Consulte o acompanhamento para verificar as notificações."); timer = window.setTimeout(update,15000); } });
    }
    update();
    return () => { controller.abort(); window.clearTimeout(timer); };
  },[id]);
  if (!id) return null;
  return <section className="mt-6"><h2 className="font-bold">Notificações</h2>{error ? <p className="mt-2 text-sm">{error}</p> : states === null ? <p className="mt-2 text-sm">Consultando estados registrados…</p> : states.length === 0 ? <p className="mt-2 text-sm">Nenhuma notificação configurada.</p> : <ul className="mt-2 space-y-2 text-sm">{states.map((item) => <li key={item.id}>{recipientGroupLabels[item.recipient_group] ?? item.recipient_group} · {item.recipient_label} · {item.channel} · {deliveryLabels[item.state] ?? item.state}<p className="text-xs text-(--muted)">{item.attempts} tentativa(s){item.attempted_at ? ` · Última tentativa: ${formatBrazilDate(item.attempted_at)}` : " · Ainda não processada"}</p>{item.error_code && <p>{deliveryErrorLabels[item.error_code] ?? deliveryErrorLabels.PROCESSING_FAILED}</p>}</li>)}</ul>}<p className="mt-2 text-xs text-(--muted)">A requisição foi persistida. O acompanhamento mostra os eventos de entrega confirmados separadamente.</p></section>;
}
