"use client";

import { useMemo, useRef, useState } from "react";
import { CATALOG, CATEGORY_LABELS } from "@/lib/catalog";
import { buildWhatsAppSummary, formatBrazilDate } from "@/lib/receipt";
import { LogoutButton } from "@/components/auth/logout-button";
import type { ExtraItem, RequisitionFormData, RequisitionLine, RequisitionReceipt } from "@/types/requisition";
import Link from "next/link";

const steps = ["Identificação", "Medicamentos", "Higiene", "Dieta", "Itens extras", "Observações", "Revisão"];
const emptyExtra = (): ExtraItem => ({ id: `extra-${crypto.randomUUID()}`, name: "", currentStock: 0, urgent: false });

export function RequisitionWizard({ canAccessAdmin = false }: { canAccessAdmin?: boolean }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<RequisitionFormData>({ lines: [], extraItems: [], observations: [] });
  const [receipt, setReceipt] = useState<RequisitionReceipt | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const idempotencyKey = useRef<string | null>(null);

  const currentCategory = (["medicamentos", "higiene", "dieta"] as const)[step - 1];
  const categoryItems = useMemo(() => CATALOG.filter((item) => item.category === currentCategory), [currentCategory]);
  const selected = (id: string) => form.lines.find((line) => line.productId === id);

  function updateLine(item: (typeof CATALOG)[number], patch: Partial<RequisitionLine>) {
    setForm((current) => {
      const existing = current.lines.find((line) => line.productId === item.id);
      if (!existing) return { ...current, lines: [...current.lines, { productId: item.id, productName: item.name, category: item.category, currentStock: 0, urgent: false, ...patch }] };
      return { ...current, lines: current.lines.map((line) => line.productId === item.id ? { ...line, ...patch } : line) };
    });
  }

  function removeLine(id: string) {
    setForm((current) => ({ ...current, lines: current.lines.filter((line) => line.productId !== id) }));
  }

  function validateStep() {
    if (step >= 1 && step <= 3 && form.lines.filter((line) => line.category === currentCategory).some((line) => line.currentStock < 0)) return "Revise o estoque informado.";
    if (step === 4 && form.extraItems.some((item) => !item.name.trim() || item.currentStock < 0)) return "Preencha ou remova os itens extras antes de continuar.";
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
    if (!idempotencyKey.current) idempotencyKey.current = crypto.randomUUID();
    try {
      const response = await fetch("/api/requisitions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, extraItems: form.extraItems.filter((item) => item.name.trim()), observations: form.observations.filter((item) => item.trim()), idempotencyKey: idempotencyKey.current }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Não foi possível registrar a requisição.");
      setReceipt(body.receipt);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível registrar a requisição."); }
    finally { setSaving(false); }
  }

  if (receipt) return <Receipt receipt={receipt} />;

  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-[color:var(--background)]/95 backdrop-blur">
        <div className="mx-auto max-w-5xl px-3 pb-2 pt-3 sm:px-5 sm:pt-5">
          <div className="flex items-center justify-between gap-3">
            <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--brand)] sm:text-xs">Home Care Assistant</p><h1 className="mt-1 text-lg font-semibold sm:text-xl">Requisição de insumos</h1></div>
            <div className="flex shrink-0 items-center gap-2"><Link href="/historico" className="rounded-lg border border-[var(--line)] px-3 py-2 text-xs font-semibold">Histórico</Link>{canAccessAdmin && <Link href="/admin" className="rounded-lg border border-[var(--line)] px-3 py-2 text-xs font-semibold">Configurações</Link>}<span className="hidden rounded-full bg-[#e8f3f4] px-3 py-1 text-xs font-semibold text-[var(--brand-dark)] sm:inline">Ambiente configurado</span><LogoutButton /></div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-[var(--muted)]"><span>Etapa {step + 1} de {steps.length}</span><span>{steps[step]}</span></div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#dfe8e4]"><span className="block h-full rounded-full bg-[var(--brand)] transition-all" style={{ width: `${((step + 1) / steps.length) * 100}%` }} /></div>
          <nav aria-label="Etapas da requisição" className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
            {steps.map((label, index) => <button key={label} type="button" onClick={() => index <= step && setStep(index)} className={`shrink-0 rounded-lg border px-2.5 py-1.5 text-xs font-semibold sm:px-3 ${index === step ? "border-[var(--brand)] bg-[var(--brand)] text-white" : index < step ? "border-[#b7d1c7] bg-[#edf5f1] text-[var(--brand)]" : "border-[var(--line)] bg-white text-[var(--muted)]"}`} aria-current={index === step ? "step" : undefined}>{index + 1}. {label}</button>)}
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-3 py-4 sm:px-5 sm:py-8">
        <section className="rounded-2xl border border-[var(--line)] bg-white p-4 shadow-sm sm:p-8">
          <div className="mb-6"><p className="text-sm font-semibold text-[var(--brand)]">Preencha o estoque atual</p><h2 className="mt-1 text-2xl font-semibold">{steps[step]}</h2></div>
          {step === 0 && <Identity />}
          {step >= 1 && step <= 3 && <CatalogStep items={categoryItems} selected={selected} updateLine={updateLine} removeLine={removeLine} />}
          {step === 4 && <Extras items={form.extraItems} setItems={(items) => setForm({ ...form, extraItems: items })} />}
          {step === 5 && <Observations observations={form.observations} setObservations={(observations) => setForm({ ...form, observations })} />}
          {step === 6 && <Review form={form} />}
          {error && <p role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
          <div className="mt-8 flex justify-between gap-3 border-t border-[var(--line)] pt-5"><button type="button" onClick={previous} disabled={step === 0} className="rounded-lg border border-[var(--line)] px-4 py-2 text-sm font-semibold disabled:opacity-40">Voltar</button>{step < 6 ? <button type="button" onClick={next} className="rounded-lg bg-[var(--brand)] px-5 py-2 text-sm font-bold text-white hover:bg-[var(--brand-dark)]">Continuar</button> : <button type="button" onClick={submit} disabled={saving} className="rounded-lg bg-[var(--brand)] px-5 py-2 text-sm font-bold text-white disabled:opacity-50">{saving ? "Registrando..." : "Confirmar e registrar"}</button>}</div>
        </section>
      </div>
    </main>
  );
}

function Identity() { return <div className="space-y-5"><div className="rounded-xl bg-[#f1f7f7] p-5"><p className="text-sm text-[var(--muted)]">Pessoa assistida</p><p className="mt-1 text-lg font-bold">Paciente configurada no ambiente</p><p className="mt-2 text-sm text-[var(--muted)]">O nome da paciente será exibido após a configuração segura do cadastro no servidor.</p></div><div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">O solicitante será identificado pela sessão autenticada no servidor. Não informe nomes ou credenciais neste formulário.</div></div>; }
function CatalogStep({ items, selected, updateLine, removeLine }: { items: typeof CATALOG; selected: (id: string) => RequisitionLine | undefined; updateLine: (item: (typeof CATALOG)[number], patch: Partial<RequisitionLine>) => void; removeLine: (id: string) => void }) {
  const category = items[0]?.category;
  function toggle(item: (typeof CATALOG)[number]) {
    if (selected(item.id)) removeLine(item.id);
    else updateLine(item, {});
  }
  return <div className="space-y-4"><p className="text-sm font-semibold text-[var(--brand)]">{category ? CATEGORY_LABELS[category] : "Catálogo"}</p><p className="text-sm text-[var(--muted)]">Selecione os itens e informe somente o estoque atual. Não contém prescrição ou orientação clínica.</p>{items.map((item) => { const line = selected(item.id); return <div key={item.id} role="button" tabIndex={0} onClick={() => toggle(item)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); toggle(item); } }} className={`cursor-pointer rounded-xl border p-4 transition-colors ${line ? "border-[#7da99a] bg-[#f8fbf9]" : "border-[var(--line)] bg-white hover:border-[#7da99a]"}`}><div className="flex items-start justify-between gap-3"><label className="flex min-w-0 items-center gap-3 font-semibold" onClick={(event) => event.stopPropagation()}><input className="h-5 w-5 shrink-0 accent-[var(--brand)]" type="checkbox" checked={Boolean(line)} onClick={(event) => event.stopPropagation()} onChange={() => toggle(item)} />{item.name}</label><span className="shrink-0 rounded-full bg-[#edf5f1] px-2 py-1 text-xs text-[var(--brand)]">{item.unit}</span></div>{line && <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"><label className="text-sm font-semibold" onClick={(event) => event.stopPropagation()}>Estoque atual<input type="number" min="0" step="1" value={line.currentStock} onClick={(event) => event.stopPropagation()} onChange={(event) => updateLine(item, { currentStock: Number(event.target.value) })} className="mt-1 min-h-12 w-full rounded-lg border border-[var(--line)] p-3 text-base" /></label><label className="flex min-h-12 items-center gap-2 text-sm font-semibold text-[#754c15]" onClick={(event) => event.stopPropagation()}><input className="h-5 w-5 accent-[#c48a36]" type="checkbox" checked={line.urgent} onClick={(event) => event.stopPropagation()} onChange={(event) => updateLine(item, { urgent: event.target.checked })} />Reposição urgente</label></div>}</div>})}</div>;
}
function Extras({ items, setItems }: { items: ExtraItem[]; setItems: (items: ExtraItem[]) => void }) { return <div className="space-y-4"><p className="text-sm text-[var(--muted)]">Adicione materiais não disponíveis no catálogo e informe somente o estoque atual.</p>{items.map((item, index) => <div key={item.id} className="grid gap-3 rounded-xl border border-[var(--line)] p-4 sm:grid-cols-[1fr_auto_auto]"><label className="text-sm font-semibold">Nome<input value={item.name} onChange={(e) => setItems(items.map((current) => current.id === item.id ? { ...current, name: e.target.value } : current))} className="mt-1 min-h-12 w-full rounded-lg border border-[var(--line)] p-3" /></label><label className="text-sm font-semibold">Estoque atual<input type="number" min="0" step="1" value={item.currentStock} onChange={(e) => setItems(items.map((current) => current.id === item.id ? { ...current, currentStock: Number(e.target.value) } : current))} className="mt-1 min-h-12 w-full rounded-lg border border-[var(--line)] p-3" /></label><div className="flex items-end"><button type="button" onClick={() => setItems(items.filter((current) => current.id !== item.id))} className="min-h-12 w-full rounded-lg border border-red-200 px-3 text-left text-sm font-semibold text-red-700 sm:w-auto">Remover item {index + 1}</button></div></div>)}<button type="button" onClick={() => setItems([...items, emptyExtra()])} className="min-h-12 rounded-lg border border-[var(--brand)] px-4 py-2 text-sm font-bold text-[var(--brand)]">+ Incluir novo item</button></div>; }
function Observations({ observations, setObservations }: { observations: string[]; setObservations: (observations: string[]) => void }) { return <div className="space-y-4"><p className="text-sm text-[var(--muted)]">Registre apenas informações operacionais necessárias.</p>{observations.map((observation, index) => <div key={index} className="flex gap-2"><textarea rows={3} value={observation} onChange={(e) => setObservations(observations.map((current, i) => i === index ? e.target.value : current))} className="w-full rounded-lg border border-[var(--line)] p-3" placeholder="Digite uma observação" /><button type="button" onClick={() => setObservations(observations.filter((_, i) => i !== index))} className="self-start text-sm font-semibold text-red-700">Remover</button></div>)}<button type="button" onClick={() => setObservations([...observations, ""])} className="rounded-lg border border-[var(--brand)] px-4 py-2 text-sm font-bold text-[var(--brand)]">+ Incluir nova observação</button></div>; }
function Review({ form }: { form: RequisitionFormData }) { const lines = form.lines; const extras = form.extraItems.filter((item) => item.name.trim()); return <div className="space-y-6"><div><p className="text-sm text-[var(--muted)]">Solicitante</p><p className="font-semibold">Sessão autenticada no servidor</p><p className="mt-4 text-sm text-[var(--muted)]">Pessoa assistida</p><p className="font-semibold">Cadastro configurado no servidor</p></div><Summary title="Itens do catálogo" rows={lines.map((item) => `${item.productName} — estoque atual: ${item.currentStock}${item.urgent ? " (urgente)" : ""}`)} /><Summary title="Itens extras" rows={extras.map((item) => `${item.name} — estoque atual: ${item.currentStock}${item.urgent ? " (urgente)" : ""}`)} /><Summary title="Observações" rows={form.observations.filter((item) => item.trim())} /></div>; }
function Summary({ title, rows }: { title: string; rows: string[] }) { return <div><h3 className="font-bold">{title}</h3>{rows.length ? <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{rows.map((row) => <li key={row}>{row}</li>)}</ul> : <p className="mt-2 text-sm text-[var(--muted)]">Nenhum registro.</p>}</div>; }
function Receipt({ receipt }: { receipt: RequisitionReceipt }) { const share = () => window.open(`https://wa.me/?text=${encodeURIComponent(buildWhatsAppSummary(receipt))}`, "_blank", "noopener,noreferrer"); return <main className="min-h-screen p-3 sm:p-5"><section className="mx-auto max-w-3xl rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm sm:p-10"><p className="text-sm font-bold uppercase tracking-wider text-emerald-700">Requisição registrada</p><h1 className="mt-2 text-3xl font-semibold">Comprovante oficial</h1><div className="mt-6 grid gap-4 rounded-xl bg-[#f1f7f7] p-5 sm:grid-cols-2"><div><p className="text-sm text-[var(--muted)]">Protocolo</p><p className="text-xl font-bold">{receipt.protocol}</p></div><div><p className="text-sm text-[var(--muted)]">Data e hora</p><p className="font-semibold">{formatBrazilDate(receipt.createdAt)}</p></div></div><p className="mt-6 text-sm">Solicitante: <strong>{receipt.requesterName}</strong><br />Pessoa assistida: <strong>{receipt.recipientName}</strong></p><Summary title="Itens" rows={[...receipt.lines.map((item) => `${item.productName} — estoque atual: ${item.currentStock}${item.urgent ? " (urgente)" : ""}`), ...receipt.extraItems.map((item) => `${item.name} — estoque atual: ${item.currentStock}${item.urgent ? " (urgente)" : ""}`)]} /><Summary title="Observações" rows={receipt.observations} /><div className="mt-8 flex flex-col gap-3 border-t border-[var(--line)] pt-5 sm:flex-row"><button type="button" onClick={() => window.print()} className="min-h-12 rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-bold text-white">Gerar / baixar PDF</button><button type="button" onClick={share} className="min-h-12 rounded-lg border border-[var(--brand)] px-4 py-2 text-sm font-bold text-[var(--brand)]">Compartilhar resumo pelo WhatsApp</button></div><p className="mt-4 text-xs text-[var(--muted)]">O compartilhamento abre uma conversa com texto pré-preenchido; nenhum PDF é anexado automaticamente.</p></section></main>; }
