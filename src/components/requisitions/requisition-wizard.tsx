"use client";

import { useMemo, useState } from "react";
import { CATALOG, CATEGORY_LABELS } from "@/lib/catalog";
import { buildWhatsAppSummary, formatBrazilDate } from "@/lib/receipt";
import type { ExtraItem, RequisitionFormData, RequisitionLine, RequisitionReceipt } from "@/types/requisition";

const steps = ["Identificação", "Medicamentos", "Higiene e materiais", "Dieta", "Itens fora da lista", "Observações", "Revisão"];
const emptyExtra = (id = "extra-initial"): ExtraItem => ({ id, name: "", currentStock: 0, requestedQuantity: 1, urgent: false });

export function RequisitionWizard() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<RequisitionFormData>({ lines: [], extraItems: [emptyExtra()], observations: [""] });
  const [receipt, setReceipt] = useState<RequisitionReceipt | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const currentCategory = (["medicamentos", "higiene", "dieta"] as const)[step - 1];
  const categoryItems = useMemo(() => CATALOG.filter((item) => item.category === currentCategory), [currentCategory]);
  const selected = (id: string) => form.lines.find((line) => line.productId === id);

  function updateLine(item: (typeof CATALOG)[number], patch: Partial<RequisitionLine>) {
    setForm((current) => {
      const existing = current.lines.find((line) => line.productId === item.id);
      if (!existing) return { ...current, lines: [...current.lines, { productId: item.id, productName: item.name, category: item.category, currentStock: 0, requestedQuantity: 1, urgent: false, ...patch }] };
      return { ...current, lines: current.lines.map((line) => line.productId === item.id ? { ...line, ...patch } : line) };
    });
  }

  function removeLine(id: string) {
    setForm((current) => ({ ...current, lines: current.lines.filter((line) => line.productId !== id) }));
  }

  function validateStep() {
    if (step >= 1 && step <= 3 && form.lines.filter((line) => line.category === currentCategory).some((line) => line.requestedQuantity < 1 || line.currentStock < 0)) return "Revise as quantidades informadas.";
    if (step === 4 && form.extraItems.some((item) => !item.name.trim() || item.currentStock < 0 || item.requestedQuantity < 1)) return "Preencha ou remova os itens fora da lista antes de continuar.";
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
    try {
      const response = await fetch("/api/requisitions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, extraItems: form.extraItems.filter((item) => item.name.trim()), observations: form.observations.filter((item) => item.trim()), idempotencyKey: crypto.randomUUID() }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Não foi possível registrar a requisição.");
      setReceipt(body.receipt);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível registrar a requisição."); }
    finally { setSaving(false); }
  }

  if (receipt) return <Receipt receipt={receipt} />;

  return (
    <main className="min-h-screen">
      <header className="border-b border-[var(--line)] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5">
          <div><p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--brand)]">Home Care Assistant</p><h1 className="mt-1 text-xl font-semibold">Requisição de insumos</h1></div>
          <span className="rounded-full bg-[#e8f3f4] px-3 py-1 text-xs font-semibold text-[var(--brand-dark)]">Ambiente de desenvolvimento</span>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-8 lg:grid-cols-[240px_1fr]">
        <nav aria-label="Etapas da requisição" className="rounded-2xl border border-[var(--line)] bg-white p-4 lg:h-fit">
          <p className="mb-4 text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Nova requisição</p>
          <ol className="space-y-1">{steps.map((label, index) => <li key={label}><button type="button" onClick={() => index <= step && setStep(index)} className={`w-full rounded-lg px-3 py-2 text-left text-sm ${index === step ? "bg-[#e8f3f4] font-bold text-[var(--brand-dark)]" : index < step ? "text-[var(--brand)]" : "text-[var(--muted)]"}`} aria-current={index === step ? "step" : undefined}><span className="mr-2">{index + 1}.</span>{label}</button></li>)}</ol>
        </nav>
        <section className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm sm:p-8">
          <div className="mb-8"><p className="text-sm font-semibold text-[var(--brand)]">Etapa {step + 1} de {steps.length}</p><h2 className="mt-1 text-2xl font-semibold">{steps[step]}</h2></div>
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
  return <div className="space-y-4"><p className="text-sm font-semibold text-[var(--brand)]">{category ? CATEGORY_LABELS[category] : "Catálogo"}</p><p className="text-sm text-[var(--muted)]">Catálogo de desenvolvimento. Não contém prescrição ou orientação clínica.</p>{items.map((item) => { const line = selected(item.id); return <div key={item.id} className="rounded-xl border border-[var(--line)] p-4"><div className="flex items-start justify-between gap-3"><label className="flex items-center gap-3 font-semibold"><input type="checkbox" checked={Boolean(line)} onChange={(event) => event.target.checked ? updateLine(item, {}) : removeLine(item.id)} />{item.name}</label><span className="text-xs text-[var(--muted)]">{item.unit}</span></div>{line && <div className="mt-4 grid gap-3 sm:grid-cols-3"><label className="text-sm">Estoque atual<input type="number" min="0" value={line.currentStock} onChange={(event) => updateLine(item, { currentStock: Number(event.target.value) })} className="mt-1 w-full rounded-lg border border-[var(--line)] p-2" /></label><label className="text-sm">Quantidade solicitada<input type="number" min="1" step="1" value={line.requestedQuantity} onChange={(event) => updateLine(item, { requestedQuantity: Number(event.target.value) })} className="mt-1 w-full rounded-lg border border-[var(--line)] p-2" /></label><label className="mt-6 flex items-center gap-2 text-sm"><input type="checkbox" checked={line.urgent} onChange={(event) => updateLine(item, { urgent: event.target.checked })} />Reposição urgente</label></div>}</div>})}</div>;
}
function Extras({ items, setItems }: { items: ExtraItem[]; setItems: (items: ExtraItem[]) => void }) { return <div className="space-y-4"><p className="text-sm text-[var(--muted)]">Adicione somente materiais não disponíveis no catálogo. Quantidades são unidades inteiras.</p>{items.map((item, index) => <div key={item.id} className="grid gap-3 rounded-xl border border-[var(--line)] p-4 sm:grid-cols-[1fr_140px_160px_auto]"><label className="text-sm sm:col-span-2">Nome<input value={item.name} onChange={(e) => setItems(items.map((current) => current.id === item.id ? { ...current, name: e.target.value } : current))} className="mt-1 w-full rounded-lg border border-[var(--line)] p-2" /></label><label className="text-sm">Estoque<input type="number" min="0" value={item.currentStock} onChange={(e) => setItems(items.map((current) => current.id === item.id ? { ...current, currentStock: Number(e.target.value) } : current))} className="mt-1 w-full rounded-lg border border-[var(--line)] p-2" /></label><label className="text-sm">Solicitar<input type="number" min="1" step="1" value={item.requestedQuantity} onChange={(e) => setItems(items.map((current) => current.id === item.id ? { ...current, requestedQuantity: Number(e.target.value) } : current))} className="mt-1 w-full rounded-lg border border-[var(--line)] p-2" /></label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={item.urgent} onChange={(e) => setItems(items.map((current) => current.id === item.id ? { ...current, urgent: e.target.checked } : current))} />Urgente</label><button type="button" onClick={() => setItems(items.filter((current) => current.id !== item.id))} className="text-left text-sm font-semibold text-red-700 sm:col-start-4">Remover item {index + 1}</button></div>)}<button type="button" onClick={() => setItems([...items, emptyExtra()])} className="rounded-lg border border-[var(--brand)] px-4 py-2 text-sm font-bold text-[var(--brand)]">+ Incluir novo item</button></div>; }
function Observations({ observations, setObservations }: { observations: string[]; setObservations: (observations: string[]) => void }) { return <div className="space-y-4"><p className="text-sm text-[var(--muted)]">Registre apenas informações operacionais necessárias.</p>{observations.map((observation, index) => <div key={index} className="flex gap-2"><textarea rows={3} value={observation} onChange={(e) => setObservations(observations.map((current, i) => i === index ? e.target.value : current))} className="w-full rounded-lg border border-[var(--line)] p-3" placeholder="Digite uma observação" /><button type="button" onClick={() => setObservations(observations.filter((_, i) => i !== index))} className="self-start text-sm font-semibold text-red-700">Remover</button></div>)}<button type="button" onClick={() => setObservations([...observations, ""])} className="rounded-lg border border-[var(--brand)] px-4 py-2 text-sm font-bold text-[var(--brand)]">+ Incluir nova observação</button></div>; }
function Review({ form }: { form: RequisitionFormData }) { const lines = form.lines; const extras = form.extraItems.filter((item) => item.name.trim()); return <div className="space-y-6"><div><p className="text-sm text-[var(--muted)]">Solicitante</p><p className="font-semibold">Sessão autenticada no servidor</p><p className="mt-4 text-sm text-[var(--muted)]">Pessoa assistida</p><p className="font-semibold">Cadastro configurado no servidor</p></div><Summary title="Itens do catálogo" rows={lines.map((item) => `${item.productName} — estoque: ${item.currentStock}, solicitar: ${item.requestedQuantity}${item.urgent ? " (urgente)" : ""}`)} /><Summary title="Itens fora da lista" rows={extras.map((item) => `${item.name} — estoque: ${item.currentStock}, solicitar: ${item.requestedQuantity}${item.urgent ? " (urgente)" : ""}`)} /><Summary title="Observações" rows={form.observations.filter((item) => item.trim())} /></div>; }
function Summary({ title, rows }: { title: string; rows: string[] }) { return <div><h3 className="font-bold">{title}</h3>{rows.length ? <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{rows.map((row) => <li key={row}>{row}</li>)}</ul> : <p className="mt-2 text-sm text-[var(--muted)]">Nenhum registro.</p>}</div>; }
function Receipt({ receipt }: { receipt: RequisitionReceipt }) { const share = () => window.open(`https://wa.me/?text=${encodeURIComponent(buildWhatsAppSummary(receipt))}`, "_blank", "noopener,noreferrer"); return <main className="min-h-screen p-5"><section className="mx-auto max-w-3xl rounded-2xl border border-[var(--line)] bg-white p-6 shadow-sm sm:p-10"><p className="text-sm font-bold uppercase tracking-wider text-emerald-700">Requisição registrada</p><h1 className="mt-2 text-3xl font-semibold">Comprovante oficial</h1><div className="mt-6 grid gap-4 rounded-xl bg-[#f1f7f7] p-5 sm:grid-cols-2"><div><p className="text-sm text-[var(--muted)]">Protocolo</p><p className="text-xl font-bold">{receipt.protocol}</p></div><div><p className="text-sm text-[var(--muted)]">Data e hora</p><p className="font-semibold">{formatBrazilDate(receipt.createdAt)}</p></div></div><p className="mt-6 text-sm">Solicitante: <strong>{receipt.requesterName}</strong><br />Pessoa assistida: <strong>{receipt.recipientName}</strong></p><Summary title="Itens" rows={[...receipt.lines.map((item) => `${item.productName} — ${item.requestedQuantity}${item.urgent ? " (urgente)" : ""}`), ...receipt.extraItems.map((item) => `${item.name} — ${item.requestedQuantity}${item.urgent ? " (urgente)" : ""}`)]} /><Summary title="Observações" rows={receipt.observations} /><div className="mt-8 flex flex-wrap gap-3 border-t border-[var(--line)] pt-5"><button type="button" onClick={() => window.print()} className="rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-bold text-white">Gerar / baixar PDF</button><button type="button" onClick={share} className="rounded-lg border border-[var(--brand)] px-4 py-2 text-sm font-bold text-[var(--brand)]">Compartilhar resumo pelo WhatsApp</button></div><p className="mt-4 text-xs text-[var(--muted)]">O compartilhamento abre uma conversa com texto pré-preenchido; nenhum PDF é anexado automaticamente.</p></section></main>; }
