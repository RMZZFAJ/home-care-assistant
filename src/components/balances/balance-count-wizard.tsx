"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button, ProgressBar, Spinner } from "@fluentui/react-components";
import { api, ApiError, can, Notice, Workspace, type WorkspaceContext } from "@/components/workspace";
import { StepNavigator } from "@/components/ui/primitives";
import { PatientSupplyWizard } from "@/components/documents/supply-wizard";
import { WizardActions } from "@/components/forms/wizard-actions";
import { DocumentActions } from "@/components/documents/document-actions";
import { DocumentDeliveryStatus } from "@/components/notifications/document-delivery-status";
import { BarcodeScanner } from "@/components/catalog/barcode-scanner";
import { formatZonedDate } from "@/lib/schedules/time";
import { formatQuantity, quantity, validQuantity } from "@/lib/quantity";
import type { CatalogProduct, SupplyDocument, SupplyPayload } from "@/types/documents";
import type { BalanceWorkspace } from "@/types/balances";
import type { ProductStock } from "@/types/stock";
import { useBalanceWorkspace } from "./use-balance-workspace";
import { BalanceCountFields, BalanceReviewRows } from "./balance-count-fields";

type Attempt = { url: string; body: object; draft: boolean };
export function BalanceEntry() {
  const params = useSearchParams();
  return <Workspace title="Balanço semanal" compact>{context => context.patient && can(context,"bal.read") ? <Mode key={context.patient.id + params.toString()} context={context} documentId={params.get("documentId")} recount={params.get("recount") === "true"} /> : <Notice>Selecione um paciente com autorização para consultar o balanço.</Notice>}</Workspace>;
}
function Mode({ context, documentId, recount }: { context: WorkspaceContext; documentId: string | null; recount: boolean }) {
  const { data, error, reload,hasBeenEligible } = useBalanceWorkspace(context.patient!.id);
  const [recoverable,setRecoverable]=useState(false);
  useEffect(()=>{let active=true;void Promise.resolve().then(()=>{try{const cache=JSON.parse(sessionStorage.getItem(`hca:v2:bal-count:${context.userId}:${context.patient!.id}:${documentId??"new"}`)??"null");if(active)setRecoverable(Boolean(cache?.pending&&Date.now()-cache.savedAt<86_400_000));}catch{if(active)setRecoverable(false);}});return()=>{active=false;};},[context.userId,context.patient,documentId]);
  if (error) return <Notice error>{error}<Button onClick={reload}>Tentar novamente</Button></Notice>;
  if (!data) return <Spinner label="Verificando plantão e disponibilidade" />;
  if (!data.regime?.activated_at) return <PatientSupplyWizard context={context} type="BAL" requisitionId={null} documentId={documentId} recount={recount} />;
  if(!hasBeenEligible&&!recoverable)return <section className="ui-card hca-form-stack"><Notice>A contagem será disponibilizada à pessoa designada durante seu plantão. A disponibilidade se atualiza automaticamente.</Notice><p>{formatZonedDate(data.eligibility.assignment?.starts_at??null,data.regime.timezone)} → {formatZonedDate(data.eligibility.assignment?.ends_at??null,data.regime.timezone)}</p><Link href="/balancos" className="ui-button ui-button-primary" prefetch={false}>Consultar balanços e plantões</Link></section>;
  return <ScheduledCount context={context} balance={data} documentId={documentId} reload={reload} />;
}
function ScheduledCount({ context, balance, documentId, reload }: { context: WorkspaceContext; balance: BalanceWorkspace; documentId: string | null; reload: () => void }) {
  const [initial] = useState(balance), [products, setProducts] = useState<CatalogProduct[]>([]), [counts,setCounts] = useState<Record<string,string>>({}), [notes,setNotes] = useState("");
  const [step,setStep] = useState(0), [fieldErrors,setFieldErrors] = useState<Record<string,string>>({}), [reference,setReference] = useState<Record<string,string>>({});
  const [editing,setEditing] = useState<SupplyDocument | null>(null), [saved,setSaved] = useState<SupplyDocument | null>(null), [loading,setLoading] = useState(true), [busy,setBusy] = useState(false), [uncertain,setUncertain] = useState(false), [error,setError] = useState(""), [message,setMessage] = useState("");
  const [attempt,setAttempt] = useState(0), [referenceRevision,setReferenceRevision] = useState(initial.referenceRevision), [assignment,setAssignment] = useState(initial.eligibility.assignment);
  const [needsRecount,setNeedsRecount] = useState(false);
  const pendingRef = useRef<Attempt | null>(null);
  const formatBrazilDate=(value:string|null)=>formatZonedDate(value,initial.regime?.timezone);
  const storageKey = `hca:v2:bal-count:${context.userId}:${context.patient!.id}:${documentId ?? "new"}`;
  const eligible = balance.eligibility.available && balance.eligibility.assignment?.id === assignment?.id && balance.eligibility.assignment?.version === assignment?.version;
  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      const [catalog, state] = await Promise.all([
        api<{data: CatalogProduct[]}>("/api/catalog?careRecipientId=" + context.patient!.id,undefined,controller.signal),
        api<{data: BalanceWorkspace}>("/api/balances?careRecipientId=" + context.patient!.id,undefined,controller.signal),
      ]);
      const id = documentId ?? state.data.eligibility.documentId;
      const doc = id ? (await api<{data: SupplyDocument}>("/api/documents/" + id,undefined,controller.signal)).data : null;
      if (doc && doc.care_recipient_id !== context.patient!.id) throw new Error("A ficha pertence a outro paciente. Selecione o vínculo correspondente.");
      if (controller.signal.aborted) return;
      setProducts(catalog.data);setEditing(doc);setAssignment(state.data.eligibility.assignment);setReferenceRevision(state.data.referenceRevision);
      if (doc?.status === "draft" && doc.payload.balanceAssignment?.id === state.data.eligibility.assignment?.id && doc.payload.balanceAssignment?.referenceRevision === state.data.referenceRevision)
        { setCounts(Object.fromEntries(doc.lines.map(l => [l.product_id,l.quantity])));setNotes(doc.payload.notes ?? ""); }
      const raw = sessionStorage.getItem(storageKey);
      if (raw && attempt === 0) {
        const cache = JSON.parse(raw) as { savedAt: number; assignmentId?: string; referenceRevision?: string; counts?: Record<string,string>; notes?: string; pending?: Attempt };
        if (Date.now()-cache.savedAt < 86_400_000) {
          if (cache.assignmentId === state.data.eligibility.assignment?.id && cache.referenceRevision === state.data.referenceRevision) { setCounts(cache.counts ?? {});setNotes(cache.notes ?? ""); }
          if (cache.pending && /^\/api\/documents(?:\/[0-9a-f-]{36}\/revise)?$/.test(cache.pending.url)) { pendingRef.current=cache.pending;setUncertain(true);setMessage("Há uma tentativa pendente. Recupere o resultado antes de continuar."); }
        } else sessionStorage.removeItem(storageKey);
      }
    };
    load().catch(reason => { if (!controller.signal.aborted) setError(reason.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  },[context.patient,documentId,storageKey,attempt]);
  useEffect(() => {
    if (!loading && !saved) try { sessionStorage.setItem(storageKey,JSON.stringify({ savedAt:Date.now(),assignmentId:assignment?.id,referenceRevision,counts,notes,pending:pendingRef.current })); } catch { /* In-memory editing remains available. */ }
  },[loading,saved,storageKey,assignment?.id,referenceRevision,counts,notes]);
  function validate() {
    const errors: Record<string,string> = {};
    for (const p of products) if (!validQuantity(counts[p.id] ?? "",p.quantity_decimals ?? 0,true)) errors[p.id]="Informe a quantidade física, inclusive zero, na precisão da unidade.";
    setFieldErrors(errors);
    if (Object.keys(errors).length) { setError("Confira os campos destacados.");requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());return false; }
    return products.length>0;
  }
  function changeCount(id:string,value:string) {
    setCounts(current=>({...current,[id]:value}));
    const product=products.find(p=>p.id===id);
    if(validQuantity(value,product?.quantity_decimals??0,true)){
      setFieldErrors(current=>{const next={...current};delete next[id];return next;});
      if(error==="Confira os campos destacados.")setError("");
    }
  }
  async function review() {
    if (!validate()) return;setBusy(true);setError("");
    try {
      const [stock, state] = await Promise.all([api<{overview:ProductStock[]}>("/api/stock/balances?careRecipientId="+context.patient!.id),api<{data:BalanceWorkspace}>("/api/balances?careRecipientId="+context.patient!.id)]);
      if (state.data.referenceRevision!==referenceRevision) throw new Error("O estoque mudou durante a contagem. Inicie uma nova conferência antes de concluir.");
      if (!state.data.eligibility.available || state.data.eligibility.assignment?.id!==assignment?.id) throw new Error("O plantão ou a responsabilidade mudou. Consulte o acompanhamento antes de concluir.");
      setReference(Object.fromEntries(stock.overview.map(p => [p.productId,p.team?.confirmed ?? "0"])));setStep(1);
    } catch(reason) { setError((reason as Error).message);setNeedsRecount(true); } finally { setBusy(false); }
  }
  async function save(draft: boolean) {
    if (!pendingRef.current) {
      if (!validate()) { if (draft) setMessage("Rascunho incompleto salvo somente neste dispositivo. Nenhuma contagem foi emitida.");return; }
      if (draft && assignment?.kind === "recount") { setMessage("Rascunho do reconto salvo neste dispositivo. A versão oficial será registrada ao concluir.");return; }
      if (!eligible || !assignment) { setError("A contagem exige o plantão ativo e a profissional designada.");return; }
      const payload:SupplyPayload={lines:products.map(p => ({productId:p.id,quantity:quantity(counts[p.id]).toFixed()})),notes,balanceAssignment:{id:assignment.id,version:assignment.version,referenceRevision}};
      pendingRef.current={url:editing?`/api/documents/${editing.id}/revise`:"/api/documents",body:editing?{payload,idempotencyKey:crypto.randomUUID(),submissionKey:crypto.randomUUID(),expectedVersion:editing.version,recount:assignment.kind==="recount",submit:!draft}:{careRecipientId:context.patient!.id,type:"BAL",payload,idempotencyKey:crypto.randomUUID(),draft},draft};
    }
    setBusy(true);setError("");
    const intent=pendingRef.current;
    try {
      try { sessionStorage.setItem(storageKey,JSON.stringify({savedAt:Date.now(),assignmentId:assignment?.id,referenceRevision,counts,notes,pending:intent})); } catch { /* The same attempt remains in memory. */ }
      const result=await api<{data:SupplyDocument}>(intent.url,intent.body);
      pendingRef.current=null;setUncertain(false);sessionStorage.removeItem(storageKey);
      if (intent.draft) { setEditing(result.data);setMessage("Rascunho gravado no sistema. A obrigação continua pendente."); }
      else { setSaved(result.data);reload(); }
    } catch(reason) {
      if (reason instanceof ApiError && [400,403,404,409,422].includes(reason.status)) { pendingRef.current=null;setUncertain(false);if(["INVENTORY_CONFLICT","VERSION_CONFLICT"].includes(reason.code??""))setNeedsRecount(true); } else setUncertain(true);
      setError((reason as Error).message);
    } finally {setBusy(false);}
  }
  async function scan(code:string) {
    const result=await api<{data:{product_id:string;name:string;base_quantity:string}[]}>("/api/catalog/presentations?careRecipientId="+context.patient!.id+"&barcode="+encodeURIComponent(code));
    const presentation=result.data[0];if (!presentation || !products.some(p=>p.id===presentation.product_id)) throw new Error("Código não encontrado no catálogo ativo. Selecione o material manualmente.");
    const product=products.find(p=>p.id===presentation.product_id)!;
    if(!validQuantity(counts[product.id]||"0",product.quantity_decimals??0,true))throw new Error("Corrija a quantidade deste material antes de acrescentar uma apresentação.");
    changeCount(product.id,quantity(counts[product.id]||"0").plus(presentation.base_quantity).toFixed());setMessage(`${presentation.name}: ${formatQuantity(presentation.base_quantity)} acrescentados à contagem física.`);
    requestAnimationFrame(()=>document.querySelector<HTMLElement>(`[data-product="${CSS.escape(presentation.product_id)}"] input`)?.focus());
  }
  if (saved) return <section className="ui-card hca-form-stack"><Notice>{saved.status==="submitted"?"Contagem enviada para revisão. A aprovação ainda está pendente.":"Contagem registrada conforme a política de revisão do paciente."}</Notice><h2>{saved.code}</h2><p>{formatBrazilDate(saved.updated_at)} · {saved.lines.length} itens · {saved.lines.filter(l=>!quantity(l.quantity).eq(String(l.metadata.expectedQuantity??"0"))).length} diferenças · responsável: {saved.payload.balanceContext?.professionalName}</p><Link href={"/documentos/"+saved.id} className="ui-button ui-button-primary" prefetch={false}>Abrir ficha BAL</Link><DocumentActions id={saved.id} code={saved.code??"BAL"} version={saved.version}/><DocumentDeliveryStatus id={saved.id} version={saved.version} /></section>;
  if (loading) return <Spinner label="Preparando contagem física"/>;
  if (!initial.eligibility.available&&!uncertain) return <section className="ui-card hca-form-stack">{error?<Notice error>{error}</Notice>:null}<Notice>A contagem é disponibilizada exclusivamente à pessoa designada durante o plantão real. Consulte a programação e o acompanhamento.</Notice><p>{formatBrazilDate(balance.eligibility.assignment?.starts_at??null)} → {formatBrazilDate(balance.eligibility.assignment?.ends_at??null)}</p><Link className="ui-button ui-button-primary" href="/balancos" prefetch={false}>Consultar balanços e plantões</Link></section>;
  const progress=products.filter(p=>validQuantity(counts[p.id]??"",p.quantity_decimals??0,true)).length;
  return <div className="hca-form-stack">{error?<Notice error>{error}</Notice>:null}{message?<Notice>{message}</Notice>:null}
    <section className="hca-bal-context"><strong>{context.patient!.display_name}</strong><p>{balance.assignments.find(a=>a.id===assignment?.id)?.professional_name??"Profissional designado"} · {balance.assignments.find(a=>a.id===assignment?.id)?.type_name}</p><small>{formatBrazilDate(assignment?.starts_at??null)} → {formatBrazilDate(assignment?.ends_at??null)}</small></section>
    {!eligible&&!uncertain?<Notice>A contagem está indisponível fora do plantão ou para outro responsável. Os dados preenchidos permanecem visíveis.<Link href="/balancos" prefetch={false}>Consultar agendamento e pendências</Link></Notice>:null}
    {!products.length?<Notice>O catálogo ativo está vazio.</Notice>:null}
    <StepNavigator steps={["Contagem","Revisão"]} active={step} disabled={busy||uncertain} onChange={setStep}/>
    <fieldset disabled={busy||uncertain||!eligible} className="min-w-0 hca-form-stack">
      {step===0?<><div className="hca-toolbar"><strong>{progress}/{products.length} materiais contados</strong><Link href="/balancos" prefetch={false}>Acompanhar / solicitar adiamento</Link></div><ProgressBar value={progress} max={Math.max(products.length,1)} aria-label="Progresso da contagem física"/><p className="hca-muted">Informe o que está fisicamente com a equipe. Registre zero quando o material estiver ausente.</p><details className="ui-card"><summary>Contar por código de barras</summary><BarcodeScanner onRead={scan}/></details><BalanceCountFields products={products} counts={counts} errors={fieldErrors} notes={notes} onCount={changeCount} onNotes={setNotes}/></>:<><h2>Revisão da contagem</h2><p>Confira as quantidades físicas e as diferenças. A revisão seguirá a política do paciente.</p><BalanceReviewRows products={products} counts={counts} reference={reference}/>{notes?<p>{notes}</p>:null}</>}
    </fieldset>
    <WizardActions step={step} total={2} saving={busy} uncertain={uncertain} blocked={!eligible||!products.length} onBack={()=>setStep(0)} onDraft={()=>void save(true)} onNext={()=>void review()} onFinish={()=>void save(false)} finishLabel={assignment?.kind==="recount"?"Confirmar reconto":"Confirmar contagem"}/>
    {uncertain&&step===0?<Button disabled={busy} appearance="primary" onClick={()=>void save(false)}>Recuperar a mesma tentativa</Button>:null}
    {needsRecount&&!uncertain?<Button disabled={busy} onClick={()=>{setCounts({});setNotes("");setError("");setNeedsRecount(false);setStep(0);setAttempt(v=>v+1);reload();}}>Iniciar nova conferência e atualizar referência</Button>:null}
  </div>;
}
