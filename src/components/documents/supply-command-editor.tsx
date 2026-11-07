"use client";
import { useRef,useState } from "react";
import { Notice,buttonClass } from "@/components/workspace";
import { CreationDraftPanel } from "@/components/forms/creation-draft-panel";
import { useCreationDraft } from "@/components/forms/use-creation-draft";
import type { ReceiptDraftContent } from "@/lib/validation/supply-drafts";
import { CommandEditorFields,type CommandEditorProps,type ReceiptDraftHandle } from "./supply-command-fields";
export type {DocumentAction} from "./supply-command-fields";

export function CommandEditor(props:CommandEditorProps){
  return props.data.type==="ENT"&&(props.action==="receive"||props.action==="divergence")?<ReceiptEditor {...props} purpose={props.action}/>:<CommandEditorFields {...props}/>;
}
function ReceiptEditor(props:CommandEditorProps&{purpose:"receive"|"divergence"}){
  const captureRef=useRef<ReceiptDraftHandle|null>(null);
  const [initial,setInitial]=useState<ReceiptDraftContent|undefined>(),[formRevision,setFormRevision]=useState(0),[error,setError]=useState("");
  const empty:ReceiptDraftContent={documentVersion:props.data.version,fields:{},divergentIds:[],materials:props.data.lines.map(line=>({id:line.id,name:line.name_snapshot,unit:line.unit_snapshot,quantityDecimals:0}))};
  const [baseline,setBaseline]=useState(empty),[comparison,setComparison]=useState(false);
  const [current,setCurrent]=useState(empty);
  const draft=useCreationDraft({userId:props.context.userId,patientId:props.data.care_recipient_id,kind:"ENT",purpose:props.purpose,targetDocumentId:props.data.id,
    onResume:saved=>{if(!saved.content||!("fields" in saved.content))return false;setInitial(saved.content);setBaseline(saved.content);setCurrent(saved.content);setFormRevision(v=>v+1);setError("");return true;},
    onDiscard:()=>{setInitial(undefined);setBaseline(empty);setCurrent(empty);setFormRevision(v=>v+1);setError("");},
  });
  const snapshot=()=>({...captureRef.current!.snapshot(),documentVersion:baseline.documentVersion,materials:baseline.materials});
  const stale=baseline.documentVersion!==props.data.version;
  async function review(action:string,body:unknown,summary:string){
    if(stale||draft.blocked||props.reviewDisabled)return;setError("");
    try{const saved=await draft.save(snapshot());if(saved)props.onReview(action,structuredClone(body),summary,{id:saved.id,revision:saved.revision},baseline.documentVersion);}catch(reason){setError(reason instanceof Error?reason.message:"Não foi possível salvar a conferência.");}
  }
  if(draft.readDenied||draft.protectedReadPending)return <CreationDraftPanel draft={draft} current={baseline} patientName={props.context.patient?.display_name??"Paciente selecionado"} disabled={props.reviewDisabled}/>;
  return <section className="mt-4 space-y-4" aria-label="Conferência pessoal em preparação">
    <CreationDraftPanel draft={draft} current={{...current,documentVersion:baseline.documentVersion,materials:baseline.materials}} patientName={props.context.patient?.display_name??"Paciente selecionado"} disabled={props.reviewDisabled}/>
    <p>Este preenchimento pertence somente a você e a esta entrega. Recebimento exige confirmação própria.</p>
    {error?<Notice error>{error}</Notice>:null}
    {stale?<Notice>Esta conferência usa a versão {baseline.documentVersion}; a ficha vigente está na versão {props.data.version}.<button type="button" className={buttonClass} onClick={()=>setComparison(true)}>Comparar referência da conferência</button></Notice>:null}
    {comparison?<section className="ui-card" aria-label="Comparação da referência da entrega"><h3>Referência anterior e vigente</h3><p>Versão do preenchimento: {baseline.documentVersion}. Versão vigente: {props.data.version}.</p><h4>Materiais da referência anterior</h4><ul>{baseline.materials.map(m=><li key={m.id}>{m.name} · {m.unit}</li>)}</ul><h4>Materiais expedidos na versão vigente</h4><ul>{props.data.lines.map(line=><li key={line.id}>{line.name_snapshot} · {line.quantity} {line.unit_snapshot}</li>)}</ul><p>Pessoa indicada e destino devem ser conferidos nos fatos da expedição. Seus valores preenchidos serão preservados; nenhum recebimento será confirmado aqui.</p><button type="button" className={buttonClass} disabled={draft.blocked||props.reviewDisabled} onClick={()=>{setBaseline({...snapshot(),documentVersion:props.data.version,materials:empty.materials});setComparison(false);}}>Usar referência vigente e manter preenchimento</button></section>:null}
    {!draft.readDenied?<fieldset className="min-w-0" disabled={draft.blocked||props.reviewDisabled}>
      <button type="button" className={buttonClass} onClick={()=>void draft.save(snapshot())}>Salvar conferência privada</button>
      <CommandEditorFields key={formRevision} {...props} initialDraft={initial} snapshotRef={captureRef} onDraftChange={setCurrent} reviewDisabled={props.reviewDisabled||stale||draft.blocked} onReview={(action,body,summary)=>void review(action,body,summary)}/>
    </fieldset>:null}
  </section>;
}
