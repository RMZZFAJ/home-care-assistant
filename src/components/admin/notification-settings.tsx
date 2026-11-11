"use client";

import { formatBrazilDate } from "@/lib/receipt";
import { buttonClass, panelClass } from "@/components/workspace";

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
      {rows.map((row,index) => <li key={String(row.id ?? index)} className="ui-card p-3 text-sm">
        <p className="wrap-anywhere">{String(members.find(member => member.user_id===row.recipient_user_id)?.full_name ?? "Conta autorizada")} · {String(row.recipient_group)} · {String(row.channel)}</p>
        <p>{String(row.destination ?? "Interno")} · {row.is_enabled ? "Habilitado" : "Desabilitado"}</p>
      </li>)}
    </ul>
    {rows.length===0 ? <p className="mt-3 text-sm">Nenhum destinatário configurado.</p> : null}
  </section>;
}

export function NotificationQueue({ rows, execute, isGlobalAdmin, queried = true }: { rows: Row[]; execute: Execute; isGlobalAdmin: boolean; queried?: boolean }) {
  return <section className={panelClass} aria-label="Acompanhamento de notificações"><h2 className="font-bold">Acompanhamento de notificações</h2><p className="mt-2 text-sm">Mensagens com resultado externo incerto exigem conciliação com o provedor antes de nova tentativa.</p>{isGlobalAdmin && <button className={`${buttonClass} mt-4`} onClick={() => void execute({action:"process",limit:25},"Lote processado. Os estados abaixo refletem os resultados registrados.")}>Processar tarefas pendentes</button>}<ul className="mt-5 space-y-3">{rows.map((row,index) => <li key={String(row.id ?? index)} className="rounded border border-(--line) p-3 text-sm"><p className="font-semibold">{String(row.recipient_label ?? row.recipient_group ?? "Destinatário")} · {String(row.channel)}</p><p className="mt-1">Estado: {String(row.state)} · tentativas: {String(row.attempts ?? 0)}</p>{typeof row.attempted_at === "string" && <p className="mt-1">Última tentativa: {formatBrazilDate(row.attempted_at)}</p>}{typeof row.last_error === "string" && <p className="mt-1">Resultado: {row.last_error}</p>}{row.state === "failed" && <button className={`${buttonClass} mt-3`} onClick={() => void execute({action:"retry",notificationId:row.id},"Notificação recolocada na fila.")}>Tentar novamente</button>}{row.state === "uncertain" && <details className="mt-3"><summary className="cursor-pointer font-semibold">Conciliação de resultado incerto</summary><p className="mt-2">Confirme com o provedor que a mensagem não foi aceita antes de autorizar o reenvio.</p><button className={`${buttonClass} mt-3`} onClick={() => { if (window.confirm("Confirme: consultei o provedor, a mensagem não foi aceita e autorizo outra tentativa.")) void execute({action:"retry",notificationId:row.id,confirmUncertain:true},"Nova tentativa autorizada após conciliação."); }}>Confirmar conciliação e tentar novamente</button></details>}</li>)}</ul>{queried && rows.length === 0 && <p className="mt-3 text-sm">Nenhuma notificação neste paciente.</p>}</section>;
}
