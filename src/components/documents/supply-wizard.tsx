"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api, ApiError, buttonClass, can, inputClass, Notice, primaryClass, Workspace, type WorkspaceContext } from "@/components/workspace";
import { StepNavigator, Icon } from "@/components/ui/primitives";
import { BarcodeScanner } from "@/components/catalog/barcode-scanner";
import { formatQuantity, quantity, validQuantity } from "@/lib/quantity";
import { documentLabels, type CatalogProduct, type DraftLine, type PatientPerson, type SupplyDocument, type SupplyPayload, type SupplyType } from "@/types/documents";

const steps = ["Identificação", "Medicamentos", "Higiene", "Dieta", "Observações", "Revisão"];
type WizardState = { quantities: Record<string, string>; notes: string; origin: "purchase" | "donation"; source: "FAMILY" | "CARE_TEAM"; recipientId: string };
type SourceRequest = { care_recipient_id: string; requisition_items: { id: string; product_id: string | null }[] };
export function SupplyWizard({ type }: { type: SupplyType }) {
  const params = useSearchParams();
  return <Workspace title={documentLabels[type]}>{(context) => context.patient ? <PatientSupplyWizard key={context.patient.id + params.toString()} context={context} type={type} requisitionId={params.get("requisitionId")} documentId={params.get("documentId")} recount={params.get("recount") === "true"} /> : <Notice>Selecione um paciente para abrir uma ficha.</Notice>}</Workspace>;
}
function PatientSupplyWizard({ context, type, requisitionId, documentId, recount }: { context: WorkspaceContext; type: SupplyType; requisitionId: string | null; documentId: string | null; recount: boolean }) {
  const [step, setStep] = useState(0); const [catalog, setCatalog] = useState<CatalogProduct[]>([]); const [people, setPeople] = useState<PatientPerson[]>([]);
  const [form, setForm] = useState<WizardState>({ quantities: {}, notes: "", origin: "purchase", source: "FAMILY", recipientId: "" });
  const [links, setLinks] = useState<Record<string, string[]>>({}); const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [message, setMessage] = useState("");
  const [editing, setEditing] = useState<SupplyDocument | null>(null);
  const [saved, setSaved] = useState<SupplyDocument | null>(null); const [uncertain, setUncertain] = useState(false); const [attempt, setAttempt] = useState(0);
  const frozen = useRef<{ payload: SupplyPayload; key: string; draft: boolean; submissionKey: string; expectedVersion?: number } | null>(null);
  const storageKey = "hca:v2:draft:" + type + ":" + context.userId + ":" + context.patient!.id + ":" + (documentId ?? "new");
  const allowed = can(context, type === "BAL" ? "bal.count" : type.toLowerCase() + ".create");
  useEffect(() => {
    const controller = new AbortController();
    const patientId = context.patient!.id;
    Promise.all([api<{ data: CatalogProduct[] }>("/api/catalog?careRecipientId=" + patientId, undefined, controller.signal), api<{ directory: PatientPerson[] }>("/api/patient-settings?careRecipientId=" + patientId, undefined, controller.signal), requisitionId ? api<{ data: SourceRequest }>("/api/requisitions/" + requisitionId, undefined, controller.signal) : Promise.resolve(null)]).then(async ([products, settings, source]) => {
      if (controller.signal.aborted) return;
      setCatalog(products.data); setPeople(settings.directory);
      if (source && source.data.care_recipient_id !== patientId) throw new Error("A requisição pertence a outro paciente. Selecione o contexto correspondente.");
      const sourceLinks: Record<string, string[]> = {};
      for (const item of source?.data.requisition_items ?? []) if (item.product_id) (sourceLinks[item.product_id] ??= []).push(item.id);
      setLinks(sourceLinks);
      let restored: WizardState | undefined; let preserved: typeof frozen.current = null;
      try { const raw = sessionStorage.getItem(storageKey); if (raw) { const envelope = JSON.parse(raw); if (Date.now() - envelope.savedAt < 86_400_000 && envelope.form && typeof envelope.form.quantities === "object") {restored = envelope.form; if (envelope.intent?.key && envelope.intent?.payload) preserved = envelope.intent;} else sessionStorage.removeItem(storageKey); } } catch { /* A damaged optional draft cannot change authority or catalogue data. */ }
      if (documentId) {
        const existing = (await api<{data: SupplyDocument}>("/api/documents/" + documentId, undefined, controller.signal)).data;
        if (existing.type !== type || existing.care_recipient_id !== patientId || !(existing.status === "draft" || recount && type === "BAL" && existing.status === "submitted")) throw new Error("Esta ficha não permite edição neste contexto.");
        setEditing(existing); setLinks(Object.fromEntries(existing.lines.map((line) => [line.product_id, line.requisitionItemIds])));
        setForm({quantities:Object.fromEntries(existing.lines.map((line) => [line.product_id,recount ? "" : String(line.quantity)])),notes:existing.payload.notes ?? "",origin:existing.payload.origin ?? "purchase",source:existing.payload.source ?? "FAMILY",recipientId:existing.recipient_id ?? ""});
      }
      else if (restored) { setForm(restored); setMessage("Rascunho deste dispositivo recuperado."); if(preserved) {frozen.current = preserved; setUncertain(true); setStep(5);} }
      else if (type === "BAL") setForm((current) => ({ ...current, quantities: Object.fromEntries(products.data.map((product) => [product.id, ""])) }));
      else if (source) setForm((current) => ({ ...current, quantities: Object.fromEntries(Object.keys(sourceLinks).map((id) => [id, ""])) }));
      setLoading(false); setError("");
    }).catch((reason) => { if (!controller.signal.aborted) { setLoading(false); setError(reason instanceof Error ? reason.message : "Não foi possível carregar o formulário."); } });
    return () => controller.abort();
  }, [context.patient, requisitionId, storageKey, type, attempt, documentId, recount]);
  useEffect(() => {
    if (loading || saved || uncertain) return;
    const timer = window.setTimeout(() => { try { sessionStorage.setItem(storageKey, JSON.stringify({ savedAt: Date.now(), form })); } catch { /* The form remains in memory. */ } }, 500);
    return () => window.clearTimeout(timer);
  }, [form, loading, saved, storageKey, uncertain]);
  function validate(all = false) {
    const errors: Record<string, string> = {};
    const category = ["medicamentos", "higiene", "dieta"][step - 1];
    if (type === "ENT" && (all || step === 0) && !form.recipientId) errors.recipientId = "Selecione quem receberá esta entrega.";
    const relevant = catalog.filter((product) => (all || product.category === category) && (type === "BAL" || Object.hasOwn(form.quantities, product.id)));
    for (const product of relevant) if (!validQuantity(form.quantities[product.id] ?? "", product.quantity_decimals ?? 0, type === "BAL")) errors[product.id] = "Informe " + ((product.quantity_decimals ?? 0) ? "quantidade válida" : "unidades inteiras") + (type === "BAL" ? ", inclusive zero." : " acima de zero.");
    if (all && !Object.keys(form.quantities).length) errors.lines = "Selecione ao menos um produto.";
    setFieldErrors(errors);
    if (Object.keys(errors).length) { setError("Confira os campos destacados."); window.setTimeout(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(), 0); return false; }
    setError(""); return true;
  }
  function next() { if (validate()) setStep((current) => Math.min(steps.length - 1, current + 1)); }
  async function persist(draft: boolean) {
    if (!frozen.current) {
      if (!validate(true)) {
        if (draft) { try { sessionStorage.setItem(storageKey, JSON.stringify({ savedAt: Date.now(), form })); setMessage("Rascunho salvo neste dispositivo. Complete os campos para emitir a ficha."); } catch { setError("Não foi possível salvar o rascunho neste dispositivo."); } }
        return;
      }
      const lines: DraftLine[] = catalog.filter((product) => Object.hasOwn(form.quantities, product.id)).map((product) => ({ productId: product.id, quantity: quantity(form.quantities[product.id]).toFixed(), ...(links[product.id]?.length ? { requisitionItemIds: links[product.id] } : {}) }));
      const payload: SupplyPayload = { lines, notes: form.notes, ...(type === "COM" ? { origin: form.origin } : type === "ENT" ? { source: form.source, destination: form.source === "FAMILY" ? "CARE_TEAM" : "FAMILY", recipientId: form.recipientId } : {}) };
      frozen.current = { payload, key: crypto.randomUUID(), submissionKey: crypto.randomUUID(), draft, expectedVersion: editing?.version };
    }
    setBusy(true); setError("");
    try { sessionStorage.setItem(storageKey, JSON.stringify({savedAt:Date.now(),form,intent:frozen.current})); } catch { /* Attempt retained in memory. */ }
    try { const result = await api<{ data: SupplyDocument }>(editing ? "/api/documents/" + editing.id + "/revise" : "/api/documents", editing ? {payload:frozen.current.payload,idempotencyKey:frozen.current.key,submissionKey:frozen.current.submissionKey,expectedVersion:frozen.current.expectedVersion,recount,submit:!frozen.current.draft} : { careRecipientId: context.patient!.id, type, payload: frozen.current.payload, idempotencyKey: frozen.current.key, draft: frozen.current.draft }); setSaved(result.data); sessionStorage.removeItem(storageKey); setUncertain(false); }
    catch (reason) { const known = reason instanceof ApiError && [400, 403, 404, 413].includes(reason.status); if (known) frozen.current = null; setUncertain(!known); setError(reason instanceof Error ? reason.message : "Não foi possível confirmar a gravação."); }
    finally { setBusy(false); }
  }
  async function scan(code: string) {
    const result = await api<{ data: { product_id: string; name: string; base_quantity: string }[] }>("/api/catalog/presentations?careRecipientId=" + context.patient!.id + "&barcode=" + encodeURIComponent(code));
    const presentation = result.data[0];
    if (!presentation) { setError("Código desconhecido. Associe uma apresentação no catálogo ou selecione o produto manualmente. Nenhum item foi criado."); return; }
    setForm((current) => ({ ...current, quantities: { ...current.quantities, [presentation.product_id]: quantity(current.quantities[presentation.product_id] || "0").plus(presentation.base_quantity).toFixed() } }));
    const product = catalog.find((item) => item.id === presentation.product_id);
    setMessage(presentation.name + ": adicionados " + formatQuantity(presentation.base_quantity, product?.unit));
    if (product) setStep(["medicamentos", "higiene", "dieta"].indexOf(product.category) + 1);
  }
  if (!allowed) return <Notice>Seu vínculo não permite emitir esta ficha. Consulte as fichas autorizadas no histórico.</Notice>;
  if (saved) return <section className="ui-card mx-auto max-w-3xl"><span className="ui-badge ui-badge-success">Documento persistido</span><h2 className="mt-4 text-2xl font-semibold">{saved.code ?? "Rascunho salvo"}</h2><p className="mt-2 break-all text-xs text-(--muted)">{saved.protocol}</p><p className="my-5 text-sm leading-6">{saved.status === "draft" ? "A ficha está salva como rascunho e ainda não foi expedida." : type === "ENT" ? "Entrega registrada. O recebimento depende da confirmação do destinatário designado." : type === "COM" ? "Compra registrada. Acompanhe a aprovação, aquisição e validação do recebimento." : saved.status === "approved" ? "Balanço concluído e estoque reconciliado." : "Balanço registrado e aguardando as revisões configuradas."}</p><div className="flex flex-wrap gap-3"><Link className={primaryClass} href={"/fichas/" + saved.id}>Acompanhar ficha <Icon name="arrow" /></Link><Link className={buttonClass} href="/fichas">Voltar à central</Link></div><p className="mt-4 text-xs text-(--muted)">Comprovantes e notificações podem ser acompanhados no detalhamento. A navegação está liberada.</p></section>;
  const category = ["medicamentos", "higiene", "dieta"][step - 1];
  const selected = catalog.filter((product) => Object.hasOwn(form.quantities, product.id));
  const destination = form.source === "FAMILY" ? "CARE_TEAM" : "FAMILY";
  const recipients = people.filter((person) => person.id !== context.userId && (person.role === "admin" || (destination === "FAMILY" ? person.role === "family" : ["professional", "supervisor"].includes(person.role))));
  return <div className="mx-auto max-w-4xl"><StepNavigator steps={steps} active={step} onChange={setStep} disabled={busy || uncertain || loading} label={"Etapas da " + type} />{message ? <Notice>{message}</Notice> : null}{error ? <Notice error>{error}{loading ? null : <button type="button" className={buttonClass} onClick={() => { setLoading(true); setAttempt((value) => value + 1); }}>Recarregar dados</button>}</Notice> : null}{loading ? <Notice>Carregando catálogo e vínculos…</Notice> : <section className="ui-card"><div className="mb-6"><p className="eyebrow">{type} · {context.patient?.display_name}</p><h2 className="mt-2 text-xl font-semibold">{steps[step]}</h2></div><fieldset disabled={busy || uncertain} className="min-w-0 space-y-5">
    {step === 0 ? <><p className="text-sm leading-6 text-(--muted)">{type === "COM" ? "Solicite os itens necessários à família. Compra ou doação entram pela mesma ficha, sem comprovante de pagamento obrigatório." : type === "ENT" ? "Selecione as custódias e a pessoa que confirmará o recebimento. A expedição deixa os materiais em trânsito." : "Conte todos os produtos sob responsabilidade familiar que estão com a equipe. Materiais de terceiros ficam fora deste controle."}</p>{type === "COM" ? <label className="block text-sm font-semibold">Forma de aquisição<select className={inputClass} value={form.origin} onChange={(event) => setForm({ ...form, origin: event.target.value as "purchase" | "donation" })}><option value="purchase">Compra pela família</option><option value="donation">Doação / incorporação sem pagamento</option></select></label> : null}{type === "ENT" ? <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold">Origem<select className={inputClass} value={form.source} onChange={(event) => setForm({ ...form, source: event.target.value as "FAMILY" | "CARE_TEAM", recipientId: "" })}><option value="FAMILY">Família → Equipe</option><option value="CARE_TEAM">Equipe → Família (devolução)</option></select></label><label className="text-sm font-semibold">Destinatário designado<select className={inputClass} value={form.recipientId} aria-invalid={Boolean(fieldErrors.recipientId)} onChange={(event) => setForm({ ...form, recipientId: event.target.value })}><option value="">Selecione quem receberá</option>{recipients.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select>{fieldErrors.recipientId ? <span className="ui-field-error">{fieldErrors.recipientId}</span> : null}</label></div> : null}{requisitionId ? <Notice>Produtos vinculados à REQ de origem. Informe as quantidades deste ato; a requisição não define quantidade solicitada.</Notice> : null}</> : null}
    {step >= 1 && step <= 3 ? <>{type !== "BAL" ? <BarcodeScanner onRead={scan} /> : null}<div className="space-y-3">{catalog.filter((product) => product.category === category).map((product) => { const checked = Object.hasOwn(form.quantities, product.id); return <div className={"product-choice " + (checked ? "product-choice-selected" : "")} key={product.id}><label className="flex min-w-0 flex-1 items-start gap-3">{type !== "BAL" ? <input type="checkbox" checked={checked} onChange={(event) => setForm((current) => { const quantities = { ...current.quantities }; if (event.target.checked) quantities[product.id] = ""; else delete quantities[product.id]; return { ...current, quantities }; })} /> : null}<span><strong className="block text-sm">{product.name}</strong><span className="mt-1 block text-xs text-(--muted)">{product.unit}{links[product.id]?.length ? " · Vinculado à REQ" : ""}</span></span></label>{checked ? <label className="product-quantity text-xs font-semibold">{type === "BAL" ? "Contagem física" : type === "COM" ? "Quantidade a adquirir" : "Quantidade expedida"}<input className={inputClass} inputMode="decimal" value={form.quantities[product.id]} aria-label={"Quantidade — " + product.name} aria-invalid={Boolean(fieldErrors[product.id])} onChange={(event) => setForm((current) => ({ ...current, quantities: { ...current.quantities, [product.id]: event.target.value } }))} />{fieldErrors[product.id] ? <span className="ui-field-error">{fieldErrors[product.id]}</span> : null}</label> : null}</div>; })}</div></> : null}
    {step === 4 ? <><label className="block text-sm font-semibold">Observações e contexto<textarea className={inputClass} rows={4} maxLength={2000} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Registre apenas exceções e informações necessárias." /></label><p className="text-xs leading-5 text-(--muted)">Fotos e anexos poderão ser adicionados no detalhamento após salvar a ficha.</p></> : null}
    {step === 5 ? <><div className="rounded-xl bg-(--background) p-4 text-sm"><strong>{context.patient?.display_name}</strong><p className="mt-1 text-xs text-(--muted)">Responsável: {context.fullName}</p>{type === "ENT" ? <p className="mt-2">{form.source === "FAMILY" ? "Família → Equipe" : "Equipe → Família"} · Recebedor: {people.find((person) => person.id === form.recipientId)?.name}</p> : null}</div><ul className="divide-y divide-(--line)">{selected.map((product) => <li key={product.id} className="flex items-start justify-between gap-4 py-3 text-sm"><span>{product.name}</span><strong>{form.quantities[product.id] ? formatQuantity(form.quantities[product.id], product.unit) : "Quantidade pendente"}</strong></li>)}</ul>{form.notes ? <p className="whitespace-pre-wrap text-sm">{form.notes}</p> : null}<Notice>{type === "ENT" ? "Ao concluir, as quantidades serão expedidas e aguardarão recebimento. Confira origem, destinatário e materiais." : type === "BAL" ? "Ao concluir, os ajustes seguirão a política de aprovação do paciente. Confira todas as contagens." : "A aprovação dos itens e o recebimento serão acompanhados nesta ficha. Nenhum pagamento é necessário para registrar uma doação."}</Notice></> : null}
    </fieldset>{uncertain ? <Notice>A confirmação da gravação está pendente. Recupere a mesma tentativa antes de iniciar outra.</Notice> : null}<div className="wizard-actions"><button className={buttonClass} type="button" disabled={step === 0 || busy || uncertain} onClick={() => { setStep((current) => current - 1); setError(""); }}>Voltar</button><div className="flex flex-wrap gap-2"><button className={buttonClass} type="button" disabled={busy || uncertain} onClick={() => void persist(true)}>Salvar rascunho</button>{step < 5 ? <button className={primaryClass} type="button" disabled={busy || uncertain} onClick={next}>Continuar <Icon name="arrow" width="16" /></button> : <button className={primaryClass} type="button" disabled={busy} onClick={() => void persist(false)}>{busy ? "Registrando…" : uncertain ? "Recuperar esta tentativa" : "Confirmar e concluir"}</button>}</div></div></section>}</div>;
}
