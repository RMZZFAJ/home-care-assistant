"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, ApiError, buttonClass, can, Notice, primaryClass, Workspace } from "@/components/workspace";
import { useWorkspaceState, roleLabels } from "@/components/layout/workspace-context";
import { useCommandIntent } from "@/lib/client/use-command-intent";
import { guideProgressConfirmed, guideConfigurationConfirmed, parseGuide, type GuideCommand, type GuideContext } from "@/lib/validation/guides";
import { guideSteps } from "@/lib/guide-content";

function useGuide() {
  const {value}=useWorkspaceState(),scopeKey=`${value?.activeContext?.mode}:${value?.activeContext?.care_recipient_id??""}:${value?.patient?.role??""}`;
  const [attempt,setAttempt]=useState(0),[result,setResult]=useState<{scope:string;data:GuideContext}|null>(null),[failure,setFailure]=useState<{scope:string;message:string}|null>(null);
  useEffect(()=>{
    const controller=new AbortController();
    void api<{data:unknown}>("/api/guides",undefined,controller.signal).then(r=>parseGuide(r.data)).then(data=>{if(!controller.signal.aborted){setResult({scope:scopeKey,data});setFailure(null);}}).catch(reason=>{if(!controller.signal.aborted)setFailure({scope:scopeKey,message:reason instanceof Error?reason.message:"Não foi possível consultar o guia."});});
    return()=>controller.abort();
  },[scopeKey,attempt]);
  return {context:value,data:result?.scope===scopeKey?result.data:null,error:failure?.scope===scopeKey?failure.message:"",refresh:()=>setAttempt(v=>v+1),adopt:(data:GuideContext)=>{setResult({scope:scopeKey,data});setFailure(null);}};
}
export function GuideOnboarding() {
  const guide=useGuide(),[dismissed,setDismissed]=useState(false);
  const command=useCommandIntent<GuideCommand,{data:GuideContext}>(guideProgressConfirmed),[error,setError]=useState("");
  if(dismissed||!guide.data||!guide.data.showOnFirstAccess||guide.data.progress.status!==null)return null;
  const skip=async()=>{try{const data=guide.data!;await command.send("/api/guides",{action:"progress",expectedScope:data.scope,expectedRevision:data.progress.revision,step:0,status:"skipped",idempotencyKey:crypto.randomUUID()});setDismissed(true);}catch(reason){setError(reason instanceof Error?reason.message:"Não foi possível guardar sua escolha.");}};
  return <div className="workspace-content pb-0"><section className="ui-notice" aria-label="Apresentação opcional"><h2 className="font-semibold">Conheça seu guia de tarefas</h2><p>Orientações para seu perfil. Você pode pular e reabrir no perfil pessoal; isso não registra ciência.</p><div className="hca-toolbar"><Link className={primaryClass} href="/guias">Conhecer o guia</Link><button type="button" className={buttonClass} disabled={command.busy||command.uncertain} onClick={()=>void skip()}>Pular apresentação</button><button type="button" className={buttonClass} onClick={()=>setDismissed(true)}>Fechar por agora</button></div>{error?<p role="alert">{error}</p>:null}{command.uncertain?<button type="button" className={buttonClass} disabled={command.busy} onClick={()=>void command.recover().then(()=>setDismissed(true)).catch(reason=>setError(reason.message))}>Recuperar minha escolha</button>:null}</section></div>;
}
export function GuidesPage(){return <Workspace title="Guias e ajuda">{()=> <UserGuide/>}</Workspace>;}
export function UserGuide() {
  const guide=useGuide(),data=guide.data;
  const [step,setStep]=useState<{scope:string;value:number}|null>(null),[error,setError]=useState(""),[message,setMessage]=useState("");
  const command=useCommandIntent<GuideCommand,{data:GuideContext}>(guideProgressConfirmed);
  const index=step&&step.scope===data?.scope?step.value:data?.progress.step??0,steps=guideSteps(data?.role??"reader"),locked=command.busy||command.uncertain;
  async function save(status:"started"|"skipped"|"completed",next=index){
    if(!data)return;setError("");setMessage("");
    try{const saved=await command.send("/api/guides",{action:"progress",expectedScope:data.scope,expectedRevision:data.progress.revision,step:next,status,idempotencyKey:crypto.randomUUID()});guide.adopt(parseGuide(saved.data));setStep({scope:data.scope,value:next});setMessage(status==="completed"?"Guia percorrido. Nenhum ato operacional foi confirmado.":"Seu progresso foi guardado.");}
    catch(reason){setError(reason instanceof Error?reason.message:"Não foi possível guardar seu progresso.");if(reason instanceof ApiError&&reason.status===409)guide.refresh();}
  }
  return <section aria-label="Guia do seu perfil" className="ui-card"><h2 className="font-semibold">{data?.role==="global"?"Administração global":roleLabels[data?.role??""]??"Orientações de consulta"}</h2>
    <p className="mt-2 text-sm">Guia opcional · versão 2026-11-D3 · seu progresso não altera permissões, ciência ou recebimentos.</p>
    {guide.error?<Notice error>{guide.error}<button type="button" className={buttonClass} onClick={guide.refresh}>Consultar guia novamente</button></Notice>:!data?<p role="status">Consultando seu guia…</p>:null}
    {error?<Notice error>{error}</Notice>:null}{message?<Notice>{message}</Notice>:null}
    {data?<><p className="mt-4 text-sm" aria-live="polite">Etapa {index+1} de {steps.length}</p><h3 className="mt-3 font-semibold">{steps[index].title}</h3><p className="mt-2 leading-7">{steps[index].text}</p>{steps[index].href?<Link className={buttonClass+" mt-3"} href={steps[index].href!}>{steps[index].action}</Link>:null}
      <div className="hca-toolbar mt-4"><button type="button" className={buttonClass} disabled={locked||index===0} onClick={()=>void save("started",index-1)}>Etapa anterior do guia</button><button type="button" className={primaryClass} disabled={locked} onClick={()=>void save(index===steps.length-1?"completed":"started",Math.min(index+1,steps.length-1))}>{index===steps.length-1?"Concluir guia":"Próxima etapa do guia"}</button><button type="button" className={buttonClass} disabled={locked} onClick={()=>void save("skipped")}>Pular e guardar progresso</button><button type="button" className={buttonClass} disabled={locked} onClick={()=>void save("started",0)}>Recomeçar guia</button></div>
      {command.uncertain?<button type="button" className={primaryClass} disabled={command.busy} onClick={()=>void command.recover().then(()=>{setMessage("Progresso recuperado.");guide.refresh();}).catch(reason=>setError(reason.message))}>Recuperar progresso do guia</button>:null}
      {guide.context&&data.patientId&&can(guide.context,"access.manage")?<GuideSetting data={data} refresh={guide.refresh}/>:null}</>:null}
  </section>;
}
function GuideSetting({data,refresh}:{data:GuideContext;refresh:()=>void}) {
  const command=useCommandIntent<GuideCommand,unknown>(guideConfigurationConfirmed),[error,setError]=useState("");
  return <section className="mt-5 border-t border-(--line) pt-4" aria-label="Apresentação do guia neste paciente"><h3 className="font-semibold">Guia no primeiro acesso</h3><p className="my-2 text-sm">Apresentação inicial {data.showOnFirstAccess?"habilitada":"desabilitada"}. Cada pessoa pode pular ou reabrir.</p><button type="button" className={buttonClass} disabled={command.busy||command.uncertain} onClick={()=>{setError("");void command.send("/api/guides",{action:"configure",careRecipientId:data.patientId!,expectedRevision:data.configurationRevision,showOnFirstAccess:!data.showOnFirstAccess,idempotencyKey:crypto.randomUUID()}).then(refresh).catch(reason=>setError(reason.message));}}>{data.showOnFirstAccess?"Desabilitar apresentação inicial":"Habilitar apresentação inicial"}</button>{error?<p role="alert">{error}</p>:null}{command.uncertain?<button type="button" className={buttonClass} disabled={command.busy} onClick={()=>void command.recover().then(refresh).catch(reason=>setError(reason.message))}>Recuperar configuração do guia</button>:null}</section>;
}
