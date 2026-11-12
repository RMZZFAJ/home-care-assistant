"use client";

import { useRef, useState } from "react";
import { ActionButton, Pill } from "@/components/ui/controls";
import { Dialog, Icon } from "@/components/ui/primitives";
import "./operations.css";

import { formatBrazilDate } from "@/lib/receipt";
import { panelClass } from "@/components/workspace";

import { AdministrativePreparationEditor } from "./administrative-preparation-editor";
import type { AdministrativeOutcome } from "@/lib/validation/administrative-preparation";

type Row = Record<string,unknown>;
type Execute = (payload: Row, success: string) => Promise<unknown>;
export function NotificationSettings({ rows, members, patientId, userId, globalMode, onConfirmed }: {
  rows: Row[]; members: Row[]; patientId: string; userId: string; globalMode: boolean;
  onConfirmed: (outcome: AdministrativeOutcome) => void;
}) {
  return <section className={panelClass}>
    <h2 className="font-bold">Destinatários de notificações</h2>
    <p className="mt-2 text-sm">Selecione contas com vínculo autorizado neste paciente. Canais externos dependem de configuração do provedor.</p>
    <AdministrativePreparationEditor
      scope={{patientId,mode:globalMode ? "global" : "patient",purpose:"notificationRecipient",targetId:null}}
      userId={userId} people={members} onConfirmed={onConfirmed}
    />
    <ul className="mt-5 space-y-3">
      {rows.map(row => <li key={String(row.id)} className="ui-card p-3 text-sm">
        <p className="wrap-anywhere">{String(members.find(member => member.user_id===row.recipient_user_id)?.full_name ?? "Conta autorizada")} · {String(row.recipient_group)} · {String(row.channel)}</p>
        <p>{String(row.destination ?? "Interno")} · {row.is_enabled ? "Habilitado" : "Desabilitado"}</p>
      </li>)}
    </ul>
    {rows.length===0 ? <p className="mt-3 text-sm">Nenhum destinatário configurado.</p> : null}
  </section>;
}

export function NotificationQueue({ rows, execute, isGlobalAdmin, queried = true, blocked = false }: { rows: Row[]; execute: Execute; isGlobalAdmin: boolean; queried?: boolean; blocked?: boolean }) {
  return <section className={panelClass + " hca-operations-card hca-notification-queue"} aria-label="Acompanhamento de notificações">
    <h2>Acompanhamento de notificações</h2><p>Mensagens com resultado externo incerto exigem conciliação com o provedor antes de nova tentativa.</p>
    {isGlobalAdmin ? <div className="hca-toolbar"><ActionButton disabled={blocked} onClick={() => { if (!blocked) void execute({action:"process",limit:25},"Lote processado. Os estados abaixo refletem os resultados registrados."); }}>Processar tarefas pendentes</ActionButton></div> : null}
    <ul className="ui-card hca-technical-list mt-4">{rows.map(row => <NotificationRow key={String(row.id)} row={row} execute={execute} blocked={blocked} />)}</ul>
    {queried && rows.length === 0 ? <p className="mt-3 text-sm">Nenhuma notificação neste paciente.</p> : null}
  </section>;
}

function NotificationRow({row,execute,blocked}:{row:Row;execute:Execute;blocked:boolean}) {
  const [review,setReview]=useState(false), [sending,setSending]=useState(false);
  const triggerRef=useRef<HTMLButtonElement>(null);
  const recordRef=useRef<HTMLLIElement>(null);
  const returnToRecordRef=useRef(false);
  const disabled=blocked || sending;
  const state=String(row.state);
  const label=({pending:"Pendente",processing:"Em processamento",sent:"Enviada",delivered:"Entregue",read:"Vista",failed:"Falha",uncertain:"Resultado incerto",cancelled:"Cancelada"} as Record<string,string>)[state] ?? state;
  async function retryUncertain() {
    if(disabled || state!=="uncertain")return;
    returnToRecordRef.current=true;
    setSending(true);
    try { await execute({action:"retry",notificationId:row.id,confirmUncertain:true},"Nova tentativa autorizada após conciliação."); setReview(false); }
    finally { setSending(false); }
  }
  return <li ref={recordRef} tabIndex={-1} className="hca-technical-record">
    <span className="hca-technical-record-icon"><Icon name="bell" /></span>
    <div className="hca-technical-record-main"><h3>{String(row.recipient_label ?? row.recipient_group ?? "Destinatário")} · {String(row.channel)}</h3>
      <p>Estado: {label} · tentativas: {String(row.attempts ?? 0)}</p>
      {typeof row.attempted_at === "string" ? <p>Última tentativa: {formatBrazilDate(row.attempted_at)}</p> : null}
      {typeof row.last_error === "string" ? <p>Resultado: {row.last_error}</p> : null}
      {state === "uncertain" ? <details className="mt-3"><summary>Conciliação de resultado incerto</summary><p className="mt-2">Confirme com o provedor que a mensagem não foi aceita antes de autorizar o reenvio.</p><ActionButton ref={triggerRef} className="mt-3" disabled={disabled} onClick={()=>{returnToRecordRef.current=false;setReview(true);}}>Revisar conciliação e nova tentativa</ActionButton></details> : null}
    </div>
    <Pill tone={state==="uncertain"?"warning":state==="failed"?"danger":"neutral"}>{label}</Pill>
    {state === "failed" ? <ActionButton disabled={disabled} onClick={() => { if(!disabled)void execute({action:"retry",notificationId:row.id},"Notificação recolocada na fila."); }}>Tentar novamente</ActionButton> : null}
    <Dialog open={review && state === "uncertain"} title="Autorizar nova tentativa" onClose={()=>setReview(false)} closeDisabled={sending} finalFocus={()=>!returnToRecordRef.current&&triggerRef.current?.isConnected&&!triggerRef.current.disabled?triggerRef.current:recordRef.current??false}>
      <p>Confirme: consultei o provedor, a mensagem não foi aceita e autorizo outra tentativa.</p><p className="mt-3">Destinatário: {String(row.recipient_label ?? row.recipient_group ?? "Destinatário")} · canal {String(row.channel)}. Esta confirmação não registra ciência ou recebimento.</p>
      {blocked ? <p role="status" className="mt-3">Aguarde uma consulta válida antes de confirmar.</p> : null}
      <div className="hca-toolbar mt-4"><ActionButton disabled={sending} onClick={()=>setReview(false)}>Voltar sem autorizar</ActionButton><ActionButton variant="primary" disabled={disabled} onClick={()=>void retryUncertain()}>Confirmar conciliação e tentar novamente</ActionButton></div>
    </Dialog>
  </li>;
}
