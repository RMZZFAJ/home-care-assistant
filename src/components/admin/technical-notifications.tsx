"use client";

import { useCallback, useState } from "react";
import { ActionButton, DefinitionGrid, FormField, SelectField } from "@/components/ui/controls";
import { Notice } from "@/components/workspace";
import { useScopedRead } from "@/lib/use-scoped-read";
import { formatBrazilDate } from "@/lib/receipt";
import { parseTechnicalNotifications, type TechnicalNotificationSource } from "@/lib/operations/notification-attempts";

const labels={pending:"Pendente",processing:"Em processamento",sent:"Enviada",accepted:"Aceita pelo transporte",delivered:"Entrega registrada",read:"Visualização registrada",failed:"Falha",uncertain:"Resultado incerto",cancelled:"Cancelada",expired:"Expirada"};
export function TechnicalNotifications(){
  const [source,setSource]=useState<TechnicalNotificationSource>("web_push");
  return <section className="ui-card hca-operations-card space-y-4" aria-label="Tentativas de avisos no banco compartilhado">
    <h3>Tentativas de avisos</h3>
    <p>Este recorte pertence ao banco compartilhado. A aplicação de origem não é presumida pelo ambiente selecionado no painel.</p>
    <FormField label="Fonte das tentativas"><SelectField value={source} onChange={event=>setSource(event.currentTarget.value as TechnicalNotificationSource)}><option value="web_push">Web Push</option><option value="notices">Fila de avisos</option></SelectField></FormField>
    <AttemptList key={source} source={source}/>
  </section>;
}
function AttemptList({source}:{source:TechnicalNotificationSource}){
  const [page,setPage]=useState(1);
  const decode=useCallback((value:unknown)=>parseTechnicalNotifications(value,source,page),[source,page]);
  const read=useScopedRead(`/api/operations/notifications?source=${source}&page=${page}`,"",decode);
  const fresh=Boolean(read.data && !read.loading && !read.error);
  return <>
    <div className="hca-toolbar"><ActionButton aria-disabled={read.loading} onClick={()=>{if(!read.loading)read.refresh();}}>Atualizar tentativas</ActionButton></div>
    {read.loading?<p role="status">Consultando tentativas registradas…</p>:null}
    {read.error?<Notice error>{read.error} <ActionButton onClick={read.refresh}>Consultar tentativas novamente</ActionButton></Notice>:null}
    {read.data?<>
      {!fresh?<p>Última consulta confirmada preservada; estes resultados aguardam atualização.</p>:null}
      <p role="status">{read.data.total} registros nesta fonte · página {read.data.page} · consulta {formatBrazilDate(read.data.consultedAt)}</p>
      {fresh && !read.data.data.length?<p>Nenhum registro nesta fonte e página. Isso não comprova ausência de envio em outro canal.</p>:null}
      <ul className="ui-card hca-technical-list">{read.data.data.map(row=><li key={row.id} className="hca-technical-record hca-audit-event" data-technical-notification={row.id}>
        <h4>{row.channel==="web_push"?"Web Push":row.channel==="internal"?"Aviso interno":row.channel==="whatsapp"?"WhatsApp":"E-mail"} · {labels[row.state]}</h4>
        <DefinitionGrid className="mt-3" items={[
          {label:"Referência técnica",value:row.id},
          {label:"Registro criado",value:formatBrazilDate(row.createdAt)},
          {label:"Tentativas informadas na fonte",value:row.recordedAttemptCount},
          {label:"Última tentativa informada",value:row.attemptedAt?formatBrazilDate(row.attemptedAt):"Instante não registrado; não comprova ausência de envio"},
          {label:"Referência do provedor",value:row.providerReferenceRecorded?"Presença registrada; conteúdo restrito":"Não registrada neste recorte; resultado pode continuar desconhecido"},
          {label:"Diagnóstico de erro",value:row.errorRecorded?"Há erro registrado; conteúdo restrito":"Nenhum erro registrado neste recorte"},
        ]}/>
        {row.historyCoverage==="last_result_only"?<p>A fonte legada conserva seu resultado atual, sem histórico individual completo de tentativas. Registros anteriores ausentes não são reconstruídos.</p>:<><p>Histórico de tentativas efetivamente registradas:</p><ol>{row.attempts.map(attempt=><li key={attempt.id} className="mt-3"><DefinitionGrid items={[
          {label:"Referência da tentativa",value:attempt.id},{label:"Ordem registrada",value:attempt.ordinal},
          {label:"Início",value:formatBrazilDate(attempt.startedAt)},
          {label:"Conclusão",value:attempt.completedAt?formatBrazilDate(attempt.completedAt):"Sem conclusão registrada"},
          {label:"Resultado",value:labels[attempt.outcome]},
          {label:"Erro",value:attempt.errorRecorded?"Erro registrado; conteúdo restrito":"Sem erro registrado"},
        ]}/></li>)}</ol>{!row.attempts.length?<p>Nenhuma tentativa individual registrada nesta fonte. Não é confirmação de que nada foi enviado.</p>:null}</>}
      </li>)}</ul>
      <nav className="hca-toolbar" aria-label="Páginas das tentativas"><ActionButton disabled={!fresh || page===1} onClick={()=>setPage(value=>value-1)}>Tentativas anteriores</ActionButton><ActionButton disabled={!fresh || page*read.data!.pageSize>=read.data!.total} onClick={()=>setPage(value=>value+1)}>Próximas tentativas</ActionButton></nav>
    </>:null}
    <Notice>Resultado de transporte não comprova leitura integral, ciência ou recebimento de material. Incerteza continua incerta até conciliação pertinente. Esta consulta não autoriza reenvio. Encaminhe a referência ao responsável pelo canal; a administração local conserva suas próprias ações autorizadas na fila. Canais postergados permanecem sem ativação.</Notice>
  </>;
}
