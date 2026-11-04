/* MUTABLE LOCAL AUDIT: only new B3 reports/audit fixtures and own new profile.
 * No reset, schema change, delete, remote/provider calls or replacement fixtures. */
import {actor,state,rpc,recorder,assert,randomUUID,sql,sqlLiteral as lit,save} from './local-harness.mjs';
import {app} from './http-client.mjs';
const audit=recorder('B3.11',{resume:true});
audit.result.method='Official local Auth RPC, real local Next HTTP and independent persisted reads; no browser. Audit volume fixtures explicitly created by owner, not a permission proof.';
const admin=await actor('admin'),professional=await actor('professional');
await audit.scenario('B311-01','Relato antigo persiste, mas referência e paginação HTTP não o recuperam após cem posteriores',async()=>{
 state.objects.tailReports??=[];
 for(let i=state.objects.tailReports.length;i<101;i++){
  const id=await rpc(professional,'report_extraordinary_consumption',{p_patient:state.patient,p_kind:'shortage',p_location:'CARE_TEAM',p_text:'Relato fictício B3 volume '+i,p_lines:[],p_key:randomUUID()});
  state.objects.tailReports.push(id);save();
 }
 const target=state.objects.tailReports[0],path='/api/consumption?careRecipientId='+state.patient;
 const plain=await app('admin',path),byRef=await app('admin',path+'&ref='+target),page=await app('admin',path+'&page=2&size=100');
 const a=await plain.json(),b=await byRef.json(),c=await page.json();
 assert.equal(plain.status,200);assert.equal(a.data.length,100);assert.equal(b.data.some(x=>x.id===target),false);assert.deepEqual(a.data.map(x=>x.id),c.data.map(x=>x.id));
 const direct=await admin.from('consumption_reports').select('id,status').eq('care_recipient_id',state.patient).eq('id',target).single();assert.ifError(direct.error);
 const dashboard=await app('admin','/api/dashboard?careRecipientId='+state.patient),d=await dashboard.json();assert.equal(dashboard.status,200);assert.ok(d.data.consumptionPending>=101);
 return {target,newReports:101,httpStatus:plain.status,returned:a.data.length,refFindsTarget:false,pageParameterChangesResult:false,directAuthenticatedRead:direct.data,pendingInDashboard:d.data.consumptionPending,classification:'Confirmed route completeness defect; persistence and RLS direct retrieval work; no data loss'};
});
await audit.scenario('B311-02','Auditoria administrativa limita cem eventos apesar de preservar e autorizar o antigo',async()=>{
 const before=Number(sql(`select count(*) from public.audit_events where metadata->>'care_recipient_id'=${lit(state.patient)};`)),created=Math.max(0,101-before);
 if(created)sql(`insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata,created_at) select ${lit(state.actors.admin.id)},'b3.fixture.volume','audit_fixture',gen_random_uuid(),jsonb_build_object('care_recipient_id',${lit(state.patient)},'synthetic',true),clock_timestamp()+g*interval '1 microsecond' from generate_series(1,${created}) g;`);
 const target=sql(`select id from public.audit_events where metadata->>'care_recipient_id'=${lit(state.patient)} order by created_at,id limit 1;`),path='/api/admin?section=audit&careRecipientId='+state.patient;
 const a=await app('admin',path),b=await app('admin',path+'&page=2&ref='+target),x=await a.json(),y=await b.json();assert.equal(a.status,200);assert.equal(x.data.length,100);assert.equal(x.data.some(v=>v.id===target),false);assert.deepEqual(x.data.map(v=>v.id),y.data.map(v=>v.id));
 const direct=await admin.from('audit_events').select('id').eq('id',target).single();assert.ifError(direct.error);
 return {existingB3PatientEvents:before,newOwnerCreatedSyntheticFixtures:created,target,returned:x.data.length,queryParametersIgnored:true,directAuthorizedRead:true,classification:'Confirmed administrative read-model cap, not deleted history; fixture insertion is not client permission evidence'};
});
await audit.scenario('B311-03','Editar perfil próprio não incrementa a revisão de workspace embora leitura nova tenha o nome',async()=>{
 const before=await rpc(professional,'workspace_revision'),name='Pessoa fictícia B3 perfil atualizado '+randomUUID().slice(0,8);
 await rpc(professional,'update_my_profile',{p_name:name,p_registration:null,p_state:null,p_category:null,p_preferences:{}});
 const after=await rpc(professional,'workspace_revision'),workspace=await rpc(professional,'my_workspace');assert.equal(before,after);assert.equal(workspace.fullName,name);
 return {revisionBefore:before,revisionAfter:after,profilePersisted:true,freshWorkspaceHasNewName:true,classification:'Confirmed missing invalidation; fresh reads correct; no stale-authority bypass or browser cache observation claimed'};
});
await audit.scenario('B311-04','Histórico de estoque paginado recupera todas as páginas e oculta saldos familiares da equipe',async()=>{
 const first=await rpc(admin,'stock_history',{p_patient:state.patient,p_page:1,p_size:3}),all=[];
 for(let page=1;page<=Math.ceil(first.total/3);page++)all.push(...(await rpc(admin,'stock_history',{p_patient:state.patient,p_page:page,p_size:3})).data);
 assert.equal(new Set(all.map(x=>x.id)).size,first.total);assert.equal(all.length,first.total);
 const pro=await rpc(professional,'stock_history',{p_patient:state.patient,p_page:1,p_size:100});
 for(const row of pro.data){if(row.source_location==='FAMILY'){assert.equal(row.source_balance_before,null);assert.equal(row.source_balance_after,null);}if(row.destination_location==='FAMILY'){assert.equal(row.destination_balance_before,null);assert.equal(row.destination_balance_after,null);}}
 const stock=await rpc(professional,'stock_overview',{p_patient:state.patient});assert.ok(stock.every(x=>x.family===null));
 return {total:first.total,walkedRows:all.length,uniqueIds:new Set(all.map(x=>x.id)).size,stableOrder:'created_at DESC,id DESC with no intervening writes',professionalHistoryRows:pro.data.length,familyBalancesHidden:true,limits:'Offset pagination under concurrent inserts can shift pages; this is a quiescent walk, not snapshot cursor proof'};
});
await audit.scenario('B311-05','Busca documental e páginas são coerentes com totais no estado estável',async()=>{
 const first=await rpc(admin,'operational_document_list',{p_patient:state.patient,p_size:5,p_page:1}),all=[];
 for(let page=1;page<=Math.ceil(first.total/5);page++)all.push(...(await rpc(admin,'operational_document_list',{p_patient:state.patient,p_size:5,p_page:page})).data);
 assert.equal(all.length,first.total);assert.equal(new Set(all.map(x=>x.id)).size,first.total);
 const picked=all.find(x=>x.code),search=await rpc(admin,'operational_document_list',{p_patient:state.patient,p_search:picked.code,p_size:100});assert.ok(search.data.some(x=>x.id===picked.id));
 return {total:first.total,walked:all.length,unique:new Set(all.map(x=>x.id)).size,codeSearchFound:true,ordering:'created_at DESC,id ASC',limits:'No concurrent insertion or exhaustive filter combination; no layout/human validation'};
});
audit.finish();
