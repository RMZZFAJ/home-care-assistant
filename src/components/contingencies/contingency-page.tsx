"use client";
import {useCallback,useEffect,useRef,useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {z} from 'zod';
import {Workspace,Notice,type WorkspaceContext} from '@/components/workspace';
import {ActionButton,DefinitionGrid,FormField,Pill,SelectField,TextAreaField,TextInput} from '@/components/ui/controls';
import {RecordDrawer} from '@/components/forms/record-drawer';
import {Icon} from '@/components/ui/icon';
import {Dialog} from '@/components/ui/overlays';
import {useOperationActivity} from '@/components/ui/operation-activity';
import {DocumentOperationFailureDialog,operationRecoveryLimit} from '@/components/documents/document-operation-failure-dialog';
import {formatBrazilDate} from '@/lib/receipt';
import {api} from '@/lib/client/api';
import {can} from '@/lib/client/capabilities';
import {useScopedRead} from '@/lib/use-scoped-read';
import {useLiveRevision} from '@/lib/use-live-revision';
import {parseCatalogueCollectionRead} from '@/lib/validation/catalogue-list';
import {contingencyDossier,storedContingencyContent,contingencyProcess,contingencyProcesses,parseContingencyCases,parseContingencyReceipt,type ContingencyCase,type ContingencyCommand,type ContingencyContent} from '@/lib/validation/contingency';
import {ContingencyForm} from './contingency-form';
import {ContingencyFacts,ContingencyAttribution} from './contingency-facts';
import {ContingencyDossierPanel,dossierState} from './contingency-dossier';
import '../guides/guides.css';
import './contingency.css';
type Process=keyof typeof contingencyProcesses;
const domain:Record<Process,string>={REQ:'req.read',COM:'com.read',ENT:'ent.read',RETURN:'ent.read',BAL:'bal.read',CONSUMPTION_FAMILY:'stock.family.read',CONSUMPTION_TEAM:'stock.team.read'};
const retained=z.object({patientId:z.uuid(),process:contingencyProcess,key:z.uuid(),actorId:z.uuid(),action:z.enum(['record','supplement','needs_clarification','link_existing']),caseId:z.uuid().optional(),expectedRevision:z.number().int().positive().optional()}).strict();
type Retained=z.infer<typeof retained>;
const storageKey=(user:string,patient:string)=>'hca:contingency-intent:'+JSON.stringify([user,patient]);
function readPending(user:string,patient:string){try{const r=retained.safeParse(JSON.parse(sessionStorage.getItem(storageKey(user,patient))??'null'));return r.success&&r.data.patientId===patient&&r.data.actorId===user?r.data:null;}catch{return null;}}
function checkReceipt(value:unknown,pending:Retained){const r=parseContingencyReceipt(value,pending);if(r.persistence==='confirmed'&&(r.action!==pending.action||pending.caseId&&r.caseId!==pending.caseId||r.revision!==(pending.expectedRevision??0)+1))throw new Error('O resultado não confirma a mesma operação. Consulte a tentativa.');return r;}
export function ContingencyPage(){return <Workspace title="Contingências" eyebrow="Continuidade da rotina" heading={context=><div className="page-heading">
 <div><p className="eyebrow">Continuidade da rotina</p><h1>Contingências</h1><p className="hca-contingency-patient">{context.patient?.display_name}</p></div>
</div>}>{context=>context.patient&&context.activeContext?.mode==='patient'&&can(context,'contingency.read')?<ScopedContingency key={context.userId+':'+context.patient.id} context={context}/>:<Notice>Selecione um vínculo local autorizado para consultar contingências. Administração global não substitui o vínculo local.</Notice>}</Workspace>;}
function ScopedContingency({context}:{context:WorkspaceContext}){
 const patient=context.patient!,params=useSearchParams(),headingRef=useRef<HTMLHeadingElement>(null),revision=useLiveRevision();
 const [pending,setPending]=useState(()=>readPending(context.userId,patient.id)),allowed=(Object.keys(domain) as Process[]).filter(p=>can(context,domain[p]));
 const [process,setProcess]=useState<Process>(()=>pending?.process??contingencyProcess.safeParse(params.get('process')).data??(allowed.includes('ENT')?'ENT':allowed[0]??'REQ'));
 const [page,setPage]=useState(0),[selected,setSelected]=useState<string|null>(params.get('id'));
 const [searchText,setSearchText]=useState(''),[searchQuery,setSearchQuery]=useState('');
 const [help,setHelp]=useState(false),[dismissed,setDismissed]=useState<unknown>(null),[readAttempts,setReadAttempts]=useState(0);
 const refreshRef=useRef<HTMLButtonElement>(null),dossierFocusRef=useRef<HTMLElement>(null);
 const [editor,setEditor]=useState<{opener:HTMLElement;action:'record'|'supplement';reference:ContingencyCase|null}|null>(null),[decision,setDecision]=useState<{opener:HTMLElement;reference:ContingencyCase}|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const pendingRef=useRef(pending),sendingRef=useRef(false);
 const canRead=allowed.includes(process);
 const listQuery=new URLSearchParams({careRecipientId:patient.id,process,page:String(page),query:searchQuery});
 const decode=useCallback((v:unknown)=>parseContingencyCases((v as {data:unknown}).data,patient.id,process,page,searchQuery),[patient.id,process,page,searchQuery]);
 const list=useScopedRead(canRead?'/api/contingencies?'+listQuery:null,String(revision),decode);
 const detailDecoder=useCallback((v:unknown)=>{
  const c=contingencyDossier.parse((v as {data:unknown}).data);
  if(c.id!==selected?.toLowerCase()||c.patientId!==patient.id||c.process!==process)throw new Error('O dossiê não corresponde a esta consulta.');
  return c;
 },[selected,patient.id,process]);
 const detail=useScopedRead(canRead&&selected?'/api/contingencies?'+new URLSearchParams({careRecipientId:patient.id,process,id:selected}):null,String(revision),detailDecoder);
 useOperationActivity(list.loading||detail.loading,{title:detail.loading?'Consultando dossiê':'Consultando contingências'});
 function visitDossier(id:string|null,opener?:HTMLElement,nextProcess=process){
  if(opener)dossierFocusRef.current=opener;
  setSelected(id);
  const url=new URL(window.location.href);
  url.searchParams.set('process',nextProcess);
  if(id){
   url.searchParams.set('id',id);
   url.searchParams.set('careRecipientId',patient.id);
  }else url.searchParams.delete('id');
  window.history.replaceState(null,'',url.pathname+url.search+url.hash);
 }
 function searchCases(query:string){
  const search=query.trim();
  setSearchText(search);
  setSearchQuery(search);
  setPage(0);
  setReadAttempts(0);
  if(search===searchQuery&&page===0)list.refresh();
 }
 const productDecoder=useCallback((v:unknown)=>parseCatalogueCollectionRead(v,patient.id,true).data,[patient.id]);
 const products=useScopedRead(editor?'/api/catalog?careRecipientId='+patient.id+'&includeInactive=true':null,'',productDecoder);
 useEffect(()=>{if(!pending)return;const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[pending]);
 function forget(p:Retained){const key=storageKey(context.userId,patient.id);const current=readPending(context.userId,patient.id);try{if(current?.key===p.key)sessionStorage.removeItem(key);}catch{/* A retained reference can only recover the same terminal receipt. */}pendingRef.current=null;setPending(null);}
 function accept(value:unknown,p:Retained){const receipt=checkReceipt(value,p);if(receipt.persistence==='unconfirmed')throw new Error('Ainda não há um comprovante. Preserve a tentativa e consulte novamente.');forget(p);setError('');setMessage(receipt.persistence==='confirmed'?'Operação registrada com autoria e referências próprias. Não foi produzido aceite em nome de outra pessoa.':'Tentativa encerrada sem execução. Um envio tardio com essa referência será recusado; você pode revisar e preparar outra confirmação.');if(receipt.persistence==='confirmed'){setEditor(null);setDecision(null);visitDossier(receipt.caseId!);}list.refresh();detail.refresh();}
 async function recover(){if(!pendingRef.current||sendingRef.current)return;const pending=pendingRef.current;sendingRef.current=true;setBusy(true);setError('');try{const r=await api<{data:unknown}>('/api/contingencies',{careRecipientId:patient.id,process:pending.process,expectedActorId:context.userId,idempotencyKey:pending.key,action:'resolve'});accept(r.data,pending);}catch(reason){setError(reason instanceof Error?reason.message:'Não foi possível conferir a tentativa.');}finally{sendingRef.current=false;setBusy(false);}}
 async function send(input:Exclude<ContingencyCommand,{action:'resolve'}>){if(pendingRef.current||sendingRef.current)return;setError('');setMessage('');const p:Retained={patientId:patient.id,process,key:input.idempotencyKey,actorId:context.userId,action:input.action,...('id' in input?{caseId:input.id,expectedRevision:input.expectedRevision}:{})};try{sessionStorage.setItem(storageKey(context.userId,patient.id),JSON.stringify(p));}catch{setError('Não foi possível guardar a referência de recuperação neste aparelho. A operação não foi enviada.');return;}pendingRef.current=p;sendingRef.current=true;setPending(p);setBusy(true);try{const result=await api<{data:unknown}>('/api/contingencies',input);accept(result.data,p);}catch(reason){setError(reason instanceof Error?reason.message:'Não foi possível confirmar esta operação. Consulte a tentativa.');}finally{sendingRef.current=false;setBusy(false);}}
 const c=detail.data,locked=busy||Boolean(pending),mayReport=list.data?.canReport===true&&patient.is_active;
 const openEditor=editor?<ContingencyForm opener={editor.opener} headingRef={headingRef}
   products={products.data} productsError={products.error} busy={busy} pending={Boolean(pending)} error={error}
   onRetry={()=>pending?void recover():products.refresh()} onClose={()=>setEditor(null)}
   onConfirm={(content:ContingencyContent)=>send({
     careRecipientId:patient.id,expectedActorId:context.userId,process,idempotencyKey:crypto.randomUUID(),
     ...(editor.action==='record'?{action:'record',content}:{action:'supplement',id:editor.reference!.id,expectedRevision:editor.reference!.revision,content}),
   })}/>:null;
 const openDecision=decision&&c?<ContingencyDecision context={context} c={decision.reference} current={c}
   onAdopt={next=>setDecision(old=>old?{...old,reference:next}:null)} opener={decision.opener}
   busy={busy} pending={Boolean(pending)} error={error} onRecover={()=>void recover()} onClose={()=>setDecision(null)}
   onConfirm={(action,reason,targetId)=>send({
     careRecipientId:patient.id,expectedActorId:context.userId,process,idempotencyKey:crypto.randomUUID(),
     action,id:decision.reference.id,expectedRevision:decision.reference.revision,reason,targetId,
   })}/>:null;
 const failedRead=detail.error?detail:list.error?list:null;
 const showReadFailure=failedRead&&!failedRead.loading&&failedRead.errorCause!==dismissed;
 const canWriteDossier=c&&c.state!=='linked'&&patient.is_active;

 return <div className="hca-contingency hca-guide-page hca-docked-page">
  <div className="hca-contingency-content hca-docked-content">
  <section className="ui-card hca-guide-card hca-contingency-intro">
    <div className="hca-contingency-lead"><span className="hca-guide-row-icon"><Icon name="note"/></span><div>
      <h2>Registro e conferência dos fatos</h2>
      <p>Preserve o que ocorreu fora do sistema e associe ao registro digital correto quando ele estiver disponível.</p>
    </div></div>
    <FormField label="Tipo de processo"><SelectField value={process} disabled={locked} onChange={event=>{
      const next=event.target.value as Process;
      setProcess(next);
      setPage(0);
      setReadAttempts(0);
      visitDossier(null,undefined,next);
      setError('');
      setMessage('');
    }}>
      {!canRead&&<option value={process} disabled>{contingencyProcesses[process]}</option>}
      {allowed.map(item=><option key={item} value={item}>{contingencyProcesses[item]}</option>)}
    </SelectField></FormField>
  </section>
  {error?<Notice error>{error}</Notice>:null}
  {message?<Notice>{message}</Notice>:null}
  {pending?<aside className="hca-attention" aria-label="Tentativa oficial a conferir">
   <h2>Há uma operação a conferir</h2>
   <p>Consulte o resultado da mesma tentativa. Se ela ainda não estiver registrada, a consulta encerrará essa referência para impedir execução tardia.</p>
   <ActionButton disabled={busy} onClick={()=>void recover()}>Conferir resultado e encerrar tentativa pendente</ActionButton>
  </aside>:null}
  {!canRead&&<Notice>Selecione um tipo de processo disponível para este vínculo.</Notice>}
  <section className="ui-card hca-guide-card hca-contingency-list" aria-label="Dossiês de contingência">
    <div className="hca-section-heading">
      <h2 ref={headingRef} tabIndex={-1}>Registros de contingência</h2>
      <ActionButton ref={refreshRef} variant="quiet" aria-label="Atualizar contingências" disabled={!canRead||list.loading}
        onClick={()=>{setReadAttempts(0);list.refresh();detail.refresh();}}><Icon name="refresh"/></ActionButton>
    </div>
    <form className="hca-contingency-search" onSubmit={event=>{event.preventDefault();if(!locked&&canRead)searchCases(searchText);}}>
      <TextInput aria-label="Buscar por referência ou descrição" value={searchText} maxLength={200} disabled={!canRead||locked}
        placeholder="Buscar por referência ou descrição" onChange={event=>setSearchText(event.target.value)}/>
      <ActionButton type="submit" aria-label="Buscar contingências" disabled={!canRead||locked}><Icon name="search"/></ActionButton>
    </form>
    {list.data?.data.map(row=><button key={row.id} type="button" className="hca-guide-row"
      onClick={event=>{visitDossier(row.id,event.currentTarget);setError('');}}>
      <span className="hca-guide-row-icon"><Icon name="note"/></span>
      <span className="hca-guide-row-label">
        <strong>{row.reference??row.description}</strong>
        <small>{contingencyProcesses[row.process]} · {formatBrazilDate(row.recordedAt)}</small>
      </span>
      <Pill tone={row.state==='linked'?'success':'warning'}>{dossierState[row.state]}</Pill>
      <Icon name="chevron" width={16}/>
    </button>)}
    {list.data?.total===0&&<div className="hca-contingency-empty"><Icon name="search"/>
      <h3>Nenhuma contingência encontrada</h3>
      <p>Ajuste a busca ou declare um fato conhecido.</p>
      {searchQuery&&<ActionButton compact onClick={()=>searchCases('')}>Limpar busca</ActionButton>}
    </div>}
    {list.data&&list.data.total>list.data.pageSize&&<div className="hca-toolbar hca-contingency-pages">
      <ActionButton compact disabled={page===0||list.loading} onClick={()=>setPage(n=>n-1)}>Página anterior de contingências</ActionButton>
      <span>Página {page+1}</span>
      <ActionButton compact disabled={list.loading||(page+1)*list.data.pageSize>=list.data.total} onClick={()=>setPage(n=>n+1)}>Próxima página de contingências</ActionButton>
    </div>}
  </section>
  </div>
  <div className="hca-guide-actions">
    <ActionButton onClick={()=>setHelp(true)}><Icon name="help"/>Como funciona</ActionButton>
    {mayReport?<ActionButton variant="primary" disabled={locked||list.loading||Boolean(list.error)} onClick={event=>setEditor({opener:event.currentTarget,action:'record',reference:null})}>
      <Icon name="plus"/>Declarar fato
    </ActionButton>:null}
  </div>
  {help?<Dialog open title="Do fato ao registro digital" headingIcon="help" onClose={()=>setHelp(false)}
    footer={<ActionButton variant="primary" onClick={()=>setHelp(false)}>Entendi</ActionButton>}>
    <ol className="hca-guide-timeline">
     <li><span><Icon name="note"/></span><div><h3>Declare os fatos conhecidos</h3><p>Diga o que ocorreu, quando e o que ainda é desconhecido.</p></div></li>
     <li><span><Icon name="file"/></span><div><h3>Preserve as evidências</h3><p>Após a declaração, anexe o registro físico ao dossiê.</p></div></li>
     <li><span><Icon name="users"/></span><div><h3>Peça a conferência independente</h3><p>Outra pessoa autorizada verifica os fatos e vincula o registro digital correto.</p></div></li>
    </ol>
    <Notice>A vinculação preserva os atos de estoque, recebimento, ciência e assinatura em seus fluxos próprios.</Notice>
  </Dialog>:null}
  {c?<ContingencyDossierPanel key={c.id} dossier={c} patientName={patient.display_name}
    allowReport={Boolean(canWriteDossier&&c.canReport)}
    allowReview={Boolean(canWriteDossier&&c.canReview&&!c.events.some(e=>e.action==='supplement'&&e.actorId===context.userId))}
    blocked={locked||Boolean(detail.error)||detail.loading} returnFocus={dossierFocusRef} refresh={detail.refresh}
    onClose={()=>visitDossier(null)}
    onSupplement={opener=>setEditor({opener,action:'supplement',reference:c})}
    onReview={opener=>setDecision({opener,reference:c})}>
    {openEditor}{openDecision}
  </ContingencyDossierPanel>:openEditor}
  {showReadFailure&&<DocumentOperationFailureDialog title="Não foi possível consultar as contingências"
    outcome="rejected" cause={failedRead.errorCause} description={failedRead.error}
    operation="Consultar contingências" fallbackCode="CONTINGENCIA_CONSULTA_INDISPONIVEL" attempts={readAttempts} closeLabel="Voltar"
    onClose={()=>{setDismissed(failedRead.errorCause);if(failedRead===detail&&!detail.data)visitDossier(null);}}
    action={readAttempts<operationRecoveryLimit?{label:'Consultar novamente',onClick:()=>{setReadAttempts(count=>count+1);failedRead.refresh();}}:undefined}
    exhaustedMessage={readAttempts>=operationRecoveryLimit?'Copie os detalhes e avise o responsável pelo sistema.':undefined}/>}
 </div>;
}
function ContingencyDecision({context,c,current,onAdopt,opener,busy,pending,error,onRecover,onClose,onConfirm}:{context:WorkspaceContext;c:ContingencyCase;current:ContingencyCase|null;onAdopt:(c:ContingencyCase)=>void;opener:HTMLElement;busy:boolean;pending:boolean;error:string;onRecover:()=>void;onClose:()=>void;onConfirm:(action:'link_existing'|'needs_clarification',reason:string,target:string|null)=>Promise<void>}){
 const reviewHeadingRef=useRef<HTMLHeadingElement>(null);
 const [action,setAction]=useState<'needs_clarification'|'link_existing'>('needs_clarification'),[reason,setReason]=useState(''),[target,setTarget]=useState(''),[query,setQuery]=useState(''),[search,setSearch]=useState(''),[page,setPage]=useState(0),[review,setReview]=useState(false);
 useEffect(()=>{if(review)reviewHeadingRef.current?.focus();},[review]);
 const decode=useCallback((v:unknown)=>{const r=z.object({patientId:z.uuid(),process:contingencyProcess,page:z.number().int(),total:z.number().int().nonnegative(),data:z.array(z.object({id:z.uuid(),kind:z.enum(['document','consumption']),label:z.string(),recordedAt:z.iso.datetime({offset:true}),version:z.number().int().positive()}))}).parse((v as{data:unknown}).data);if(r.patientId!==c.patientId||r.process!==c.process||r.page!==page||r.data.length!==Math.min(25,Math.max(0,r.total-page*25))||new Set(r.data.map(x=>x.id)).size!==r.data.length)throw new Error('A referência não corresponde a este processo e paciente.');return r;},[c.patientId,c.process,page]);
 const refs=useScopedRead(action==='link_existing'?'/api/contingencies?view=references&careRecipientId='+c.patientId+'&process='+c.process+'&query='+encodeURIComponent(search)+'&page='+page:null,'',decode),chosen=refs.data?.data.find(r=>r.id===target);
 return <RecordDrawer title={review?'Revisar conciliação':'Conciliar declaração de contingência'} onClose={onClose} restoreFocusTo={opener} busy={busy} preventClose={pending} hasUnsavedChanges={Boolean(reason)}>{error?<Notice error>{error}</Notice>:null}{pending?<Notice>Consulte a mesma tentativa antes de preparar outra decisão.<ActionButton disabled={busy} onClick={onRecover}>Consultar resultado desta tentativa</ActionButton></Notice>:null}<p>Conciliador: {context.fullName}. A decisão será registrada com sua sessão, separada de quem realizou ou recebeu o fato físico.</p>{current&&current.id===c.id&&current.revision!==c.revision?<Notice>Há uma revisão mais recente deste dossiê. Sua decisão e seu motivo foram preservados. Confira as informações acrescentadas antes de usar essa revisão.<section aria-label="Informações da revisão mais recente">{current.events.filter(e=>e.sequence>=c.revision).map(e=><article key={e.id}><ContingencyAttribution name={e.actorName} role={e.actorRole} at={e.recordedAt}/>{e.action==='supplement'?<ContingencyFacts value={storedContingencyContent.parse(e.body)} scope={e.id}/>:<p>{String(e.body.reason??'')}</p>}</article>)}</section><ActionButton disabled={busy||pending||current.state==='linked'} onClick={()=>{setReview(false);onAdopt(current);}}>Usar esta revisão após a conferência</ActionButton></Notice>:null}{review?<><h2 ref={reviewHeadingRef} tabIndex={-1}>Confira a decisão e sua referência</h2><DefinitionGrid items={[{label:'Decisão',value:action==='link_existing'?'Vincular registro existente':'Solicitar esclarecimento'},{label:'Base e motivo',value:reason},{label:'Referência selecionada',value:chosen?.label??'Nenhuma; não haverá vínculo'}]}/><p>Vincular não refaz movimentos nem cria confirmação pessoal. Evidências ainda pendentes impedem concluir o vínculo.</p><ActionButton variant="primary" disabled={busy||pending} onClick={()=>void onConfirm(action,reason,action==='link_existing'?target:null)}>Confirmar conciliação</ActionButton><ActionButton disabled={busy||pending} onClick={()=>setReview(false)}>Voltar à decisão</ActionButton></>:<form className="hca-form" onSubmit={event=>{event.preventDefault();if(busy||pending||reason.trim().length<3||action==='link_existing'&&(!chosen||refs.loading||refs.error))return;setReview(true);}}><FormField label="Decisão de conciliação"><SelectField value={action} onChange={event=>{setAction(event.target.value as typeof action);setTarget('');}}><option value="needs_clarification">Solicitar esclarecimento</option><option value="link_existing">Vincular registro digital existente</option></SelectField></FormField><FormField label="Motivo e base da regularização" required><TextAreaField value={reason} required minLength={3} maxLength={2000} onChange={event=>setReason(event.target.value)}/></FormField>{action==='link_existing'?<section aria-label="Comparar referência existente"><p>Procure primeiro o registro já existente. Se ainda precisar de um ato operacional, use o fluxo próprio e volte para vinculá-lo; esta decisão não cria estoque ou aceite.</p><FormField label="Buscar referência por código ou descrição"><TextInput value={query} maxLength={200} onChange={event=>setQuery(event.target.value)}/></FormField><ActionButton type="button" onClick={()=>{setSearch(query);setPage(0);setTarget('');refs.refresh();}}>Buscar registros existentes</ActionButton>{refs.loading?<p role="status">Consultando referências…</p>:null}{refs.error?<Notice error>{refs.error}</Notice>:null}<FormField label="Registro existente" required><SelectField required value={target} disabled={refs.loading||Boolean(refs.error)||!refs.data} onChange={event=>setTarget(event.target.value)}><option value="">Selecione após comparar</option>{refs.data?.data.map(row=><option value={row.id} key={row.id}>{row.label} · revisão {row.version}</option>)}</SelectField></FormField>{refs.data?<div className="hca-toolbar"><ActionButton type="button" disabled={page===0||refs.loading} onClick={()=>{setPage(n=>n-1);setTarget('');}}>Referências anteriores</ActionButton><span>Página {page+1} de {Math.max(1,Math.ceil(refs.data.total/25))}</span><ActionButton type="button" disabled={refs.loading||(page+1)*25>=refs.data.total} onClick={()=>{setPage(n=>n+1);setTarget('');}}>Próximas referências</ActionButton></div>:null}</section>:null}<ActionButton type="submit" variant="primary" disabled={busy||pending}>Revisar regularização</ActionButton></form>}</RecordDrawer>;
}
