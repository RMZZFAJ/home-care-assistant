"use client";
import { ActionButton } from "@/components/ui/controls";
import Link from "next/link";
import {useRef,useState} from "react";

import {Notice,type WorkspaceContext} from "@/components/workspace";
import {StatusBadge} from "@/components/ui/primitives";
import {formatBrazilDate} from "@/lib/receipt";
import {formatZonedDate} from "@/lib/schedules/time";
import {formatQuantity} from "@/lib/quantity";
import {scheduleEventLabel} from "@/lib/schedules/presentation";
import {documentEventLabel} from "@/lib/notifications/event-labels";
import {useCommandIntent} from "@/lib/client/use-command-intent";
import {noIssuesCommand,noIssuesConfirmed,type NoIssuesCommand,type NoIssuesResult,type NotificationReference as Target} from "@/lib/validation/notification-reference";
import type {NotificationReferenceRead} from "@/lib/notifications/use-notification-reference";
export type ReminderOrigin={id:string;period:string;expectedAt:string};
const date=(value:string)=>value.split("-").reverse().join("/");
const when=(value:string|null)=>value?formatBrazilDate(value):"Não preservado";
const zoned=(value:string|null,zone:string|null)=>zone?formatZonedDate(value,zone):when(value)+" (Brasília; fuso original não preservado)";
const href=(path:string,patient:string,values:Record<string,string>={})=>path+"?"+new URLSearchParams({careRecipientId:patient,...values});
export function NotificationReference({read,context,onReport,onStockFilter}:{read:NotificationReferenceRead;context:WorkspaceContext;onReport?:(origin:ReminderOrigin,opener:HTMLElement)=>void;onStockFilter?:(productId:string,location:string)=>void}){
 const reference=read.reference,patient=context.patient!.id,storageKey=`hca:notice-intent:${context.userId}:${patient}:${reference}`;
 const [pending,setPending]=useState<NoIssuesCommand|null>(()=>{
  if(typeof window==="undefined"||read.area!=="consumption")return null;
  try{const parsed=noIssuesCommand.safeParse(JSON.parse(sessionStorage.getItem(storageKey)??"null"));return parsed.success&&parsed.data.careRecipientId===patient&&parsed.data.ref===reference?parsed.data:null;}catch{return null;}
 });
 const [review,setReview]=useState(false),[message,setMessage]=useState(""),[error,setError]=useState("");
 const command=useCommandIntent<NoIssuesCommand,NoIssuesResult>(noIssuesConfirmed);
 const transmittingRef=useRef(false);
 function retain(packet:NoIssuesCommand|null){setPending(packet);try{if(packet)sessionStorage.setItem(storageKey,JSON.stringify(packet));else sessionStorage.removeItem(storageKey);}catch{/* Opaque key survives in memory; no clinical payload is cached. */}}
 async function send(){
  if(!reference||transmittingRef.current||read.area!=="consumption")return;
  transmittingRef.current=true;
  const recovering=Boolean(pending),packet=pending??{careRecipientId:patient,ref:reference,action:"no_issues" as const,idempotencyKey:crypto.randomUUID()};retain(packet);setError("");
  try{const result=command.uncertain?await command.recover():await command.send("/api/notifications/target",packet);retain(null);setReview(false);setMessage(result.data.replayed?"Confirmação anterior recuperada. Confira os registros atuais.":result.data.recorded?"Confirmação pessoal registrada para este lembrete. Estoque e ciência não foram alterados.":"Este lembrete já tinha uma resposta. Consulte os registros vinculados.");read.refresh();window.dispatchEvent(new Event("hca:data-changed"));}
  catch(reason){if(!recovering&&!command.uncertain&&reason instanceof Error&&"status" in reason&&typeof reason.status==="number"&&reason.status>0&&reason.status<500)retain(null);setError(reason instanceof Error?reason.message:"Não foi possível confirmar a resposta.");read.refresh();}
  finally{transmittingRef.current=false;}
 }
 if(!reference)return null;
 const target=read.data;
 return <section className="ui-card space-y-4" aria-label="Referência selecionada" aria-busy={read.loading}>
  <h2 className="font-semibold">Referência selecionada</h2>
  {read.loading?<p role="status">Consultando a referência autorizada…</p>:null}
  {read.error?<Notice error>{read.error} <ActionButton type="button" onClick={read.refresh}>Consultar referência novamente</ActionButton></Notice>:null}
  {error?<Notice error>{error}</Notice>:null}{message?<Notice>{message}</Notice>:null}
  {target&&!read.loading?<Facts target={target} patient={patient} onStockFilter={onStockFilter}/>:null}
  {command.busy?<p role="status">Confirmando sua resposta…</p>:null}
  {pending&&!read.loading&&!command.busy&&read.area==="consumption"?<Notice>A resposta desta tentativa ainda precisa ser recuperada. A mesma chave foi preservada.<ActionButton type="button" variant="primary" onClick={()=>void send()}>Recuperar resposta do lembrete</ActionButton></Notice>:null}
  {!pending&&target?.kind==="shift_reminder"&&!read.loading?<>
   <p>Este lembrete é uma referência de registro. Ele não comprova presença ou execução de um plantão.</p>
   {review?<div className="space-y-3" aria-label="Confira a resposta do lembrete"><h3 className="font-semibold">Confira sua declaração pessoal</h3><p>Sem ocorrências para a referência de {date(target.period)}. Isso não altera estoque, aceite de materiais ou ciência de requisição.</p><div className="hca-toolbar"><ActionButton type="button" disabled={command.busy} onClick={()=>setReview(false)}>Voltar à referência</ActionButton><ActionButton type="button" variant="primary" disabled={command.busy||!target.canAcknowledge} onClick={()=>void send()}>Confirmar ausência de ocorrências</ActionButton></div></div>:<div className="hca-toolbar">
    {target.canAcknowledge?<ActionButton type="button" onClick={()=>setReview(true)}>Declarar que não houve ocorrências</ActionButton>:null}
    {target.canReport&&onReport?<ActionButton type="button" variant="primary" onClick={event=>onReport({id:target.referenceId,period:target.period,expectedAt:target.expectedAt},event.currentTarget)}>Registrar ocorrência deste lembrete</ActionButton>:null}
   </div>}
  </>:null}
  <Link className="ui-button ui-button-secondary inline-flex items-center" href={href("/notificacoes",patient)}>Voltar aos avisos deste paciente</Link>
 </section>;
}
function Facts({target,patient,onStockFilter}:{target:Target;patient:string;onStockFilter?:(productId:string,location:string)=>void}){
 if(target.kind==="report")return <p>Referência de relato autorizada. O detalhe abaixo preserva autoria, versões e conferência.</p>;
 if(target.kind==="stock_alert")return <><h3 className="font-semibold">{target.productName??"Nome atual do material não disponível"}</h3><p>Alerta registrado: {target.severity==="critical"?"nível crítico":"saldo baixo"} · {target.state==="resolved"?"resolvido":"aberto"} · {target.location==="FAMILY"?"família":"equipe"}</p><dl className="hca-detail-list"><dt>Criação do alerta</dt><dd>{when(target.createdAt)}</dd><dt>Última observação preservada</dt><dd>{when(target.observedAt)}</dd><dt>Saldo observado no alerta</dt><dd>{formatQuantity(target.balance,target.unit??undefined)}</dd><dt>Saldo oficial consultado agora</dt><dd>{formatQuantity(target.currentBalance,target.unit??undefined)}</dd>{target.resolvedAt?<><dt>Resolução registrada</dt><dd>{when(target.resolvedAt)}</dd></>:null}</dl><p>O nome e a unidade vêm do catálogo atual. O saldo do alerta corresponde à observação registrada; consultar não altera o alerta nem o estoque.</p>{onStockFilter?<ActionButton type="button" onClick={()=>onStockFilter(target.productId,target.location)}>Consultar movimentos deste material</ActionButton>:null}</>;
 if(target.kind==="schedule")return <><h3 className="font-semibold">{scheduleEventLabel(target.action)}</h3><p className="whitespace-pre-wrap wrap-break-word">{target.reason}</p><p>Registrado em {when(target.recordedAt)} por {target.actorName??"autoria nominal não preservada"}.</p><p>Período localizado na agenda: {date(target.referenceDay)}.</p>{target.originalStartsAt?<p>Janela preservada no aviso: {zoned(target.originalStartsAt,target.originalTimezone)} a {zoned(target.originalEndsAt,target.originalTimezone)}.</p>:null}{target.current?<div><h3 className="font-semibold">Referência atual autorizada</h3><p>{target.current.professionalName??"Nome atual indisponível"} · {target.current.typeName??"Tipo atual indisponível"} · revisão {target.current.version}</p><p>Situação: {({published:"Publicado",proposed:"Proposta",cancelled:"Cancelado",rejected:"Recusado",obsolete:"Obsoleto"} as Record<string,string>)[target.current.status]??"Situação não reconhecida"}</p>{target.current.startsAt?<p>{zoned(target.current.startsAt,target.current.timezone)} a {zoned(target.current.endsAt,target.current.timezone)} · {target.current.timezone}</p>:null}</div>:<Notice>A referência atual não está disponível para este vínculo. Os fatos preservados do aviso não foram substituídos por outro plantão.</Notice>}</>;
 if(target.kind==="legacy_balance")return <><h3 className="font-semibold">Lembrete anterior de balanço</h3><p>Referência de {date(target.period)} · horário previsto {when(target.expectedAt)}.</p><p>Este lembrete não é uma contagem física e não cria uma obrigação retroativa. Uma contagem iniciada agora registra o momento atual.</p>{target.acknowledgedAt?<p>Resposta registrada em {when(target.acknowledgedAt)}.</p>:null}{target.canCountNow?<Link href={href("/fichas/bal",patient)}>Abrir contagem do momento atual</Link>:null}</>;
 if(target.kind==="balance")return <><h3 className="font-semibold">{documentEventLabel(target.action)}</h3><p>Registrado em {when(target.recordedAt)}.</p><p className="whitespace-pre-wrap wrap-break-word">{target.reason}</p>{target.weeks.count?<p>{target.weeks.count} semana(s) vinculada(s), de {date(target.weeks.first!)} a {date(target.weeks.last!)}.</p>:<p>Este evento não possui obrigação semanal vinculada.</p>}{target.assignment?<div><h3 className="font-semibold">Atribuição indicada pelo aviso</h3><p>{target.assignment.professionalName??"Nome atual indisponível"} · {zoned(target.assignment.startsAt,target.assignment.timezone)} a {zoned(target.assignment.endsAt,target.assignment.timezone)}</p><p>Revisão {target.assignment.version} · {({assigned:"Designada",active:"Ativa",counted:"Contagem registrada",missed:"Prazo não cumprido",superseded:"Substituída",cancelled:"Cancelada"} as Record<string,string>)[target.assignment.status]??"Situação não reconhecida"}</p></div>:null}{target.documentId?<Link href={href("/documentos/"+target.documentId,patient)}>Consultar BAL desta referência</Link>:<p>Não há ficha física vinculada a este evento.</p>}</>;
 return <><h3 className="font-semibold">Lembrete de registro de ocorrências</h3><p>Referência: {date(target.period)} · horário previsto {when(target.expectedAt)}.</p><p>{target.acknowledgedAt?"Resposta registrada em "+when(target.acknowledgedAt)+".":"Ainda não há resposta registrada para este lembrete."}</p>{target.reportCount?<><p>{target.reportCount} relato(s) vinculado(s).</p><ul>{target.reports.map(report=><li key={report.id}><Link href={href("/consumo",patient,{ref:report.id,refKind:"report"})}>{report.kind==="shortage"?"Relato de falta":"Consumo extraordinário"} · {when(report.createdAt)}</Link> <StatusBadge status={report.status}/></li>)}</ul><a href={href("/consumo",patient,{sourceReminder:target.referenceId})}>Consultar todos os relatos deste lembrete</a></>:null}</>;
}
