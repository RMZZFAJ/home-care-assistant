"use client";
import Link from "next/link";
import { useCallback, type ReactNode } from "react";
import { Workspace, Notice, type WorkspaceContext } from "@/components/workspace";
import { ActionButton, DefinitionGrid, Pill } from "@/components/ui/controls";
import { Icon, type IconName } from "@/components/ui/primitives";
import { useScopedRead } from "@/lib/use-scoped-read";
import { can } from "@/lib/client/capabilities";
import { useLiveRevision } from "@/lib/use-live-revision";
import { formatBrazilDate } from "@/lib/receipt";
import { mayPrepareLocally, parseLocalPreparation } from "@/lib/validation/local-preparation";
import "./local-preparation.css";

export function LocalPreparationPage(){
  return <Workspace title="Preparação local">{context=>mayPrepareLocally(context)?<PreparationTasks key={context.userId+":"+context.patient!.id+":"+context.patient!.role} context={context}/>:<Notice>Abra um vínculo local autorizado para acompanhar a preparação. Criar o cadastro global não concede esse vínculo. <Link href="/perfil">Consultar meus vínculos</Link></Notice>}</Workspace>;
}
function PreparationTasks({context}:{context:WorkspaceContext}){
  const patient=context.patient!,revision=useLiveRevision();
  const decode=useCallback((value:unknown)=>parseLocalPreparation((value as {data?:unknown})?.data,patient.id),[patient.id]);
  const read=useScopedRead("/api/guides/preparation?careRecipientId="+patient.id,String(revision),decode),data=read.data;
  const target=(path:string)=>path+(path.includes("?")?"&":"?")+"careRecipientId="+patient.id;
  const link=(path:string,label:string)=><Link className="hca-control hca-control--secondary" href={target(path)}>{label}</Link>;
  const unknown="Acesso restrito a esta informação";
  const cataloguePending=data?.catalogue?.activeProducts===0;
  return <div className="hca-local-preparation">
    <div className="hca-section-heading"><div><h2>Preparar as rotinas deste paciente</h2><p>Confira os registros disponíveis e abra a tarefa no seu vínculo. Cadastro, convite, movimento, contagem e conferência física têm resultados próprios.</p></div><ActionButton aria-disabled={read.loading} onClick={()=>{if(!read.loading)read.refresh();}}>Atualizar preparação local</ActionButton></div>
    {read.error?<Notice error>{read.error}<ActionButton aria-disabled={read.loading} onClick={()=>{if(!read.loading)read.refresh();}}>Consultar preparação novamente</ActionButton></Notice>:null}
    {read.loading?<p role="status">Consultando registros da preparação…</p>:null}
    {data?<>
      <DefinitionGrid items={[
        {label:"Paciente",value:data.patient.name},
        {label:"Situação do cadastro",value:data.patient.active?"Ativo":"Inativo"},
        {label:"Fuso indicado na preparação",value:data.patient.referenceTimeZone??"Não informado nesta preparação"},
        {label:read.loading||read.error?"Última consulta preservada":"Registros consultados",value:formatBrazilDate(data.observedAt)},
      ]}/>
      {cataloguePending?<aside className="hca-attention" aria-label="Preparação que precisa de atenção"><p>O catálogo ainda não tem materiais ativos. Adoção, unidades e apresentações precisam de conferência local antes de registrar quantidades.</p>{link("/admin?section=catalog","Preparar materiais do paciente")}</aside>:null}
      <div className="hca-preparation-tasks">
        <Task title="Pessoas e vínculos" icon="team" available={data.people!==null}>
          <p>Convites exigem aceite pessoal. Uma pessoa planejada na criação não recebe acesso automaticamente.</p>
          {data.people?<><DefinitionGrid items={[{label:"Vínculos marcados ativos",value:data.people.activeMemberships},{label:"Convites válidos aguardando aceite",value:data.people.pendingInvitations},{label:"Convites expirados sem aceite",value:data.people.expiredInvitations}]}/><div className="hca-toolbar">{link("/admin?section=memberships","Conferir pessoas e vínculos")}{link("/admin?section=invitations","Preparar convites locais")}</div></>:<p>{unknown}</p>}
        </Task>
        <Task title="Materiais e apresentações" icon="stock" available={data.catalogue!==null}>
          <p>Adote modelos por escolha explícita. Confira unidade, apresentação e precisão de cada material; o estoque de outro paciente não é copiado.</p>
          {data.catalogue?<><DefinitionGrid items={[{label:"Materiais ativos",value:data.catalogue.activeProducts},{label:"Materiais inativos preservados",value:data.catalogue.inactiveProducts}]}/>{link("/admin?section=catalog","Conferir catálogo e apresentações")}</>:<p>{unknown}</p>}
        </Task>
        <Task title="Estoque físico por custódia" icon="stock" available={data.stock!==null}>
          <p>Confira o material físico e registre origem, quantidade e motivo pelo fluxo próprio. Um movimento registrado não comprova que toda a conferência foi feita.</p>
          {data.stock?<><DefinitionGrid items={[{label:"Movimentos com custódia familiar",value:data.stock.familyMovements??unknown},{label:"Movimentos com custódia da equipe",value:data.stock.teamMovements??unknown}]}/><div className="hca-toolbar">{data.stock.familyMovements!==null||data.stock.canManageFamily?link("/estoque?custody=FAMILY",data.stock.canManageFamily?"Preparar estoque familiar":"Conferir estoque familiar"):null}{data.stock.teamMovements!==null?link("/estoque?custody=CARE_TEAM","Conferir estoque da equipe"):null}</div></>:<p>{unknown}</p>}
        </Task>
        <Task title="Escalas e responsabilidades" icon="team" available={data.schedules!==null}>
          <p>Plantão programado não comprova presença. Confira pessoas, horários, fuso, recorrências e exceções antes do atendimento.</p>
          {data.schedules?<><DefinitionGrid items={[{label:"Registros de escala preservados",value:data.schedules.totalShifts},{label:"Plantões publicados vigentes ou futuros",value:data.schedules.upcomingShifts}]}/>{link("/escalas",data.schedules.canManageTeam?"Preparar escala da equipe":"Conferir escala autorizada")}</>:<p>{unknown}</p>}
        </Task>
        <Task title="Balanços e contagem inicial" icon="check" available={data.balance!==null}>
          <p>Configure o regime e as pessoas legitimamente responsáveis. Não preencha um balanço passado para criar histórico. A contagem e sua aplicação ao estoque continuam separadas.</p>
          {data.balance?<><DefinitionGrid items={[{label:"Regime de balanço",value:data.balance.enabled?"Habilitado":"Não habilitado"},{label:"Fuso do regime",value:data.balance.timeZone??"Não configurado"}]}/>{link("/balancos",data.balance.canConfigure?"Preparar regime de balanços":"Conferir balanços autorizados")}</>:<p>{unknown}</p>}
        </Task>
        <Task title="Comunicação e orientação" icon="bell" available={data.communication!==null}>
          <p>Defina regras, destinos e pessoas responsáveis. Notificação vista, ciência e recebimento são fatos distintos.</p>
          {data.communication?<><DefinitionGrid items={[{label:"Apresentação do guia no primeiro acesso",value:data.communication.guideEnabled?"Habilitada":"Desabilitada"},{label:"Escolha local do guia",value:data.communication.guideConfigured?"Registrada":"Padrão inicial; pode ser alterado"}]}/>{link("/configuracoes","Conferir regras e comunicação")}</>:<p>{unknown}</p>}
        </Task>
      </div>
      <section className="ui-card" aria-label="Conferência física e continuidade"><h2>Conferência física e continuidade</h2><p>Combine com os responsáveis como guardar referências físicas, comunicar interrupções e retomar cada fato sem duplicação. Ao retornar, procure primeiro o registro existente. A pessoa que registra a regularização não se apresenta como outra pessoa que recebeu materiais.</p><p>Esta consulta mostra metadados registrados. Ela não confirma estoque físico, presença, ciência, recebimento ou início do atendimento.</p><div className="hca-toolbar">{link("/guias","Reabrir orientação do meu papel")}{can(context,"contingency.read")?link("/contingencias","Registrar ou regularizar contingência"):null}</div></section>
    </>:!read.loading&&!read.error?<p>Nenhuma consulta de preparação foi confirmada.</p>:null}
  </div>;
}
function Task({title,icon,available,children}:{title:string;icon:IconName;available:boolean;children:ReactNode}){
  return <section className="ui-card hca-preparation-task" aria-label={title}><div className="hca-section-heading"><h2><Icon name={icon}/>{title}</h2><Pill tone="neutral">{available?"Consulta disponível":"Consulta restrita"}</Pill></div>{children}</section>;
}
