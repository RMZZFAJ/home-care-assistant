"use client";
import { ActionButton } from "@/components/ui/controls";
import { useEffect,useRef,useState } from "react";
import { Combobox, Option } from "@fluentui/react-components";
import { api,ApiError } from "@/lib/client/api";
import { useCommandIntent } from "@/lib/client/use-command-intent";
import { Notice,inputClass } from "@/components/workspace";
import { RecordDrawer } from "@/components/forms/record-drawer";
import { parseSelectionLibrary,selectionCommandSchema,selectionConfirmed,type MaterialSelection,type SelectionCommand } from "@/lib/validation/recurring-selection";
import type { RequisitionLine } from "@/types/requisition";
import type { SelectionProduct } from "@/lib/requisitions/recurring-selection";

export function RecurringSelection({userId,patientId,catalogue,lines,disabled,canSave,onApply,onRefresh,cataloguePending,catalogueError}:{
  userId:string;patientId:string;catalogue:SelectionProduct[];lines:RequisitionLine[];disabled:boolean;canSave:boolean;onApply:(ids:string[])=>void;
  onRefresh:()=>void;cataloguePending:boolean;catalogueError:string;
}){
  const [open,setOpen]=useState(false),[trigger,setTrigger]=useState<HTMLElement|null>(null);
  const [rows,setRows]=useState<MaterialSelection[]>([]),[loading,setLoading]=useState(true),[readError,setReadError]=useState("");
  const [attempt,setAttempt]=useState(0),[ready,setReady]=useState(false);
  const [query,setQuery]=useState(""),[chosen,setChosen]=useState<string|null>(null),[checked,setChecked]=useState<string[]>([]);
  const [name,setName]=useState(""),[nameError,setNameError]=useState(""),[error,setError]=useState(""),[message,setMessage]=useState("");
  const [pending,setPending]=useState<SelectionCommand|null>(null),[hydrated,setHydrated]=useState(false);
  const [referenceError,setReferenceError]=useState(""),[referenceAttempt,setReferenceAttempt]=useState(0);
  const key=`hca:recurring-selection:${userId}:${patientId}`;
  const memoryIntentRef=useRef(false),mountedRef=useRef(false),nameRef=useRef<HTMLInputElement>(null);
  const command=useCommandIntent<SelectionCommand,{data:{selection:MaterialSelection;replayed:boolean}}>((value,packet)=>selectionConfirmed(value,packet,userId));
  useEffect(()=>{mountedRef.current=true;const timer=setTimeout(()=>{
    setReferenceError("");
    try{const raw=sessionStorage.getItem(key);if(raw){const parsed=selectionCommandSchema.safeParse(JSON.parse(raw));if(parsed.success&&parsed.data.careRecipientId===patientId)setPending(parsed.data);else setReferenceError("A referência local desta lista não pôde ser conferida. O preenchimento da requisição foi preservado.");}}catch{setReferenceError("Não foi possível consultar a referência local. Preserve a aba antes de tentar salvar outra lista.");}
    setHydrated(true);
  },0);return()=>{mountedRef.current=false;clearTimeout(timer);};},[key,patientId,referenceAttempt]);
  useEffect(()=>{
    if(!open)return;
    const controller=new AbortController(),timer=setTimeout(()=>{
      setLoading(true);setReady(false);setReadError("");
      api<{data:unknown}>(`/api/requisitions/selections?careRecipientId=${patientId}`,undefined,controller.signal)
        .then(body=>{if(!controller.signal.aborted){setRows(parseSelectionLibrary(body.data,userId,patientId));setReady(true);}})
        .catch(reason=>{if(!controller.signal.aborted){setRows([]);setMessage("");setReadError(reason instanceof Error?reason.message:"Não foi possível consultar suas listas.");}})
        .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    },0);
    return()=>{clearTimeout(timer);controller.abort();};
  },[open,attempt,userId,patientId]);

  function preserve(packet:SelectionCommand|null){
    setPending(packet);
    try{if(packet)sessionStorage.setItem(key,JSON.stringify(packet));else sessionStorage.removeItem(key);}catch{/* Memory keeps this intention while the tab remains open. */}
  }
  async function transmit(packet:SelectionCommand,recovering:boolean){
    setError("");setMessage("");preserve(packet);
    const alreadyInMemory=memoryIntentRef.current;memoryIntentRef.current=true;
    try{
      const result=await (recovering&&alreadyInMemory?command.recover():command.send("/api/requisitions/selections",packet));
      if(!mountedRef.current)return;
      preserve(null);memoryIntentRef.current=false;setName("");setNameError("");
      setChosen(result.data.selection.id);setQuery(result.data.selection.name);setChecked([]);
      setMessage(`Lista “${result.data.selection.name}” salva. A requisição continua sem emissão.`);
      setAttempt(value=>value+1);
    }catch(reason){
      if(!mountedRef.current)return;
      const known=reason instanceof ApiError&&[400,401,403,404,409,413,422].includes(reason.status);
      if(known&&!recovering){preserve(null);memoryIntentRef.current=false;}
      if(known&&recovering&&!alreadyInMemory)memoryIntentRef.current=false;
      const cause=reason instanceof Error&&reason.cause instanceof ApiError?reason.cause:reason;
      if(cause instanceof ApiError&&[401,403,404].includes(cause.status)){setReady(false);setRows([]);setReadError("Revalide o acesso antes de exibir as listas ou recuperar o salvamento.");}
      setError(reason instanceof Error?reason.message:"Não foi possível confirmar o salvamento da lista.");
    }
  }
  function save(){
    const productIds=[...new Set(lines.filter(line=>catalogue.some(p=>p.id===line.productId&&p.active!==false&&p.is_active!==false)).map(line=>line.productId))];
    const parsed=selectionCommandSchema.safeParse({careRecipientId:patientId,name,productIds,idempotencyKey:crypto.randomUUID()});
    if(!parsed.success){setNameError("Informe um nome entre2 e80 caracteres e selecione ao menos um material ativo na requisição.");nameRef.current?.focus();return;}
    setNameError("");void transmit(parsed.data,false);
  }
  const selected=rows.find(row=>row.id===chosen),visible=rows.filter(row=>row.name.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR")));
  const eligible=(id:string)=>catalogue.find(item=>item.id===id&&item.active!==false&&item.is_active!==false);
  const applicable=checked.filter(id=>eligible(id)&&!lines.some(line=>line.productId===id));
  return <section aria-label="Listas frequentes" className="hca-form-stack">
    <div className="hca-toolbar"><ActionButton onClick={event=>{setTrigger(event.currentTarget);setOpen(true);setReady(false);onRefresh();}} disabled={!hydrated}>Usar lista frequente</ActionButton>
      {pending?<span role="status">Há um salvamento de lista para recuperar.</span>:null}</div>
    {!open&&message?<p role="status">{message}</p>:null}
    {open?<RecordDrawer title="Usar lista frequente" busy={command.busy} trackChanges={false} onClose={()=>setOpen(false)} restoreFocusTo={trigger}>
      <p>Paciente atual. A lista guarda somente materiais; não traz estoque, urgência ou justificativas anteriores.</p>
      {cataloguePending?<Notice>Atualizando disponibilidade dos materiais…</Notice>:null}
      {catalogueError?<Notice error>{catalogueError}<ActionButton onClick={onRefresh}>Reconsultar disponibilidade</ActionButton></Notice>:null}
      {referenceError?<Notice error>{referenceError}<ActionButton onClick={()=>setReferenceAttempt(value=>value+1)}>Consultar referência local novamente</ActionButton></Notice>:null}
      {loading?<Notice>Consultando suas listas neste paciente…</Notice>:null}
      {readError?<Notice error>{readError}<ActionButton onClick={()=>setAttempt(value=>value+1)}>Consultar listas novamente</ActionButton></Notice>:null}
      {ready&&!loading?<>
        {error?<Notice error>{error}</Notice>:null}{message?<p role="status">{message}</p>:null}
        {pending?<section aria-label="Salvamento de lista pendente"><p>O resultado desta tentativa ainda não foi confirmado. Recupere o mesmo comando antes de salvar outra lista.</p><dl><dt>Nome preservado</dt><dd>{pending.name}</dd><dt>Materiais preservados</dt><dd>{pending.productIds.length}</dd></dl><ActionButton onClick={()=>void transmit(pending,true)}>Recuperar salvamento da lista</ActionButton></section>:null}
        <label className="hca-form-stack"><span>Buscar lista frequente</span>
          <Combobox value={query} selectedOptions={chosen?[chosen]:[]} onChange={event=>{setQuery(event.target.value);setChosen(null);setChecked([]);}} onOptionSelect={(_,data)=>{setChosen(data.optionValue??null);setQuery(data.optionText??"");setChecked([]);}} placeholder="Nome da lista" aria-label="Buscar lista frequente">
            {visible.map(row=><Option key={row.id} value={row.id}>{row.name}</Option>)}
          </Combobox>
        </label>
        <p role="status">{visible.length} lista(s) encontrada(s).</p>
        {!rows.length?<p>Você ainda não tem uma lista frequente neste paciente. Selecione materiais na requisição para salvar uma lista.</p>:null}
        {selected?<section aria-label="Materiais da lista escolhida"><h3>{selected.name}</h3><ul className="hca-form-stack">{selected.productIds.map(id=>{
          const product=eligible(id),duplicate=lines.some(line=>line.productId===id);
          return <li key={id}><label className="flex min-h-11 items-center gap-2"><input className="h-5 w-5" type="checkbox" checked={checked.includes(id)} disabled={!product||duplicate||disabled} onChange={event=>setChecked(value=>event.target.checked?[...value,id]:value.filter(item=>item!==id))}/> {product?.name??"Material indisponível no catálogo atual"}{product?` · ${product.unit}`:""}</label>{!product?<p>Fora da nova inclusão; a lista original permanece preservada.</p>:duplicate?<p>Já selecionado; seus valores atuais serão mantidos.</p>:null}</li>;
        })}</ul><ActionButton variant="primary" disabled={disabled||!applicable.length} onClick={()=>{onApply(applicable);setChecked([]);setMessage("Materiais selecionados adicionados ao preenchimento. Confira a observação e a urgência de cada item.");setOpen(false);}}>Adicionar materiais selecionados</ActionButton></section>:null}
        <section aria-label="Salvar seleção como lista"><h3>Salvar seleção como lista</h3><p>Guarda os materiais ativos selecionados na requisição. Itens extras não catalogados e valores preenchidos não serão copiados.</p>
          {canSave?<><label className="hca-form-stack"><span>Nome da seleção recorrente</span><input ref={nameRef} className={inputClass} value={name} onChange={event=>{setName(event.target.value);setNameError("");}} minLength={2} maxLength={80} autoComplete="off" required aria-invalid={Boolean(nameError)} aria-describedby="selection-name-help selection-name-error" disabled={Boolean(pending)||disabled}/></label>
          <p id="selection-name-help">De2 a80 caracteres. {name.length}/80.</p>{nameError?<p id="selection-name-error" className="ui-field-error">{nameError}</p>:<span id="selection-name-error"/>}
          <ActionButton disabled={Boolean(pending)||Boolean(referenceError)||disabled||!lines.some(line=>eligible(line.productId))} onClick={save}>Salvar seleção como lista</ActionButton></>:<p>Seu acesso permite consultar as listas preservadas; salvar uma nova exige permissão para preparar requisição.</p>}
        </section>
      </>:null}
      <ActionButton onClick={()=>setOpen(false)} disabled={command.busy}>Voltar à requisição</ActionButton>
    </RecordDrawer>:null}
  </section>;
}
