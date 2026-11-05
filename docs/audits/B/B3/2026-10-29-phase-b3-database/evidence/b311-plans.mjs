/* LOCAL: baseline EXPLAIN ANALYZE on SELECT only. Volume fixture uses NEW rows
 * in one rollback transaction, triggers enabled, no external workers configured.
 * No ANALYZE/DDL/reset/index changes. Sequence advancement is expected.
 * Initial 1000-row fixture was explicitly canceled after 120s and rolled back;
 * this bounded rerun uses 100 rows and a 30s per-statement timeout. */
import {writeFileSync,readFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {actor,state,rpc,sql,sqlLiteral as lit,randomUUID,assert} from './local-harness.mjs';
const admin=await actor('admin'),session=(await admin.auth.getSession()).data.session;
const payload=JSON.parse(Buffer.from(session.access_token.split('.')[1],'base64url').toString()),claims={sub:state.actors.admin.id,role:'authenticated',session_id:payload.session_id};
const setClaims=`set local role authenticated;select set_config('request.jwt.claims',${lit(JSON.stringify(claims))},true) is not null;`;
const plan=query=>{
 const out=sql(`begin read only;set local statement_timeout='30s';${setClaims}explain(analyze,buffers,format json) ${query};rollback;`),start=out.indexOf('[');if(start<0)throw new Error('Plan JSON missing');return JSON.parse(out.slice(start));
};
const pid=lit(state.patient),document=lit(state.objects.fileDocument),queries=[
 ['QP-01','Current stock view with actual Auth RLS',`select product_id,location,balance from public.current_stock_balances where care_recipient_id=${pid}`],
 ['QP-02','Stock history page SELECT (patient-only; no function visibility masking)',`select id,created_at,product_id,quantity from public.stock_movements where care_recipient_id=${pid} order by created_at desc,id desc limit 20`],
 ['QP-03','Consumption read route shape with RLS',`select id,status,created_at from public.consumption_reports where care_recipient_id=${pid} order by created_at desc limit 100`],
 ['QP-04','Audit read route shape with RLS',`select id,created_at,action from public.audit_events where metadata->>'care_recipient_id'=${pid} order by created_at desc limit 100`],
 ['QP-05','Document event index for one synthetic document',`select id,version,action,content_hash from public.document_events where document_id=${document} order by version`],
 ['QP-06','Published next shift patient/window shape with RLS',`select id,starts_at,ends_at from public.scheduled_shifts where care_recipient_id=${pid} and status='published' and ends_at>now() order by starts_at limit 1`]
];
function brief(p){const top=p[0],nodes=[];function walk(n){nodes.push({type:n['Node Type'],relation:n['Relation Name']??null,index:n['Index Name']??null,actualRows:n['Actual Rows'],loops:n['Actual Loops'],removed:n['Rows Removed by Filter']??0});for(const child of n.Plans??[])walk(child);}walk(top.Plan);return {planningMs:top['Planning Time'],executionMs:top['Execution Time'],sharedHits:top.Plan['Shared Hit Blocks'],sharedReads:top.Plan['Shared Read Blocks'],nodes};}
const result={recordedAt:new Date().toISOString(),environment:'Local verified PostgreSQL17.11; actual Auth session/role; warm single samples, no production percentile claim',queries:[],volume:null,limits:['No production hardware/cardinality/concurrent workload','EXPLAIN on selected SELECTs only; function internals are not all represented by outer plan','No cost-based index recommendation is approved by this artifact']};
result.initialAttemptRollbackCheck=JSON.parse(sql(`select jsonb_build_object('fixturePatients',(select count(*) from public.care_recipients where display_name='Paciente fictício B3 volume rollback'),'fixtureMovements',(select count(*) from public.stock_movements where justification='Entrada fictícia B3 rollback'));`));assert.equal(result.initialAttemptRollbackCheck.fixturePatients,0);assert.equal(result.initialAttemptRollbackCheck.fixtureMovements,0);
for(const [id,purpose,query] of queries){const p=plan(query);result.queries.push({id,purpose,query,plan:p,summary:brief(p)});console.log(JSON.stringify({id,...brief(p),nodes:undefined}));}
const volumePatient=randomUUID(),p=lit(volumePatient),before=Number(sql('select count(*) from public.stock_movements;'));
const setup=`insert into public.care_recipients(id,display_name,is_development) values(${p},'Paciente fictício B3 volume rollback',true);
 insert into public.care_recipient_memberships(care_recipient_id,user_id,role) values(${p},${lit(state.actors.admin.id)},'admin');
 insert into public.care_recipient_products(care_recipient_id,product_id,name,category,unit) values(${p},'fralda','Material fictício B3 volume','higiene','unidade');
 insert into public.stock_movements(care_recipient_id,product_id,quantity,movement_type,performed_by,justification,destination_location,created_at)
 select ${p},'fralda',1,'inbound',${lit(state.actors.admin.id)},'Entrada fictícia B3 rollback','FAMILY',clock_timestamp()+g*interval '1 microsecond' from generate_series(1,100) g;
 ${setClaims}select public.select_active_context(${p}) is not null;`;
const q=`select product_id,location,balance from public.current_stock_balances where care_recipient_id=${p}`;
const raw=sql(`begin;set local statement_timeout='30s';${setup}explain(analyze,buffers,format json) ${q};reset role;rollback;`),index=raw.indexOf('['),vplan=JSON.parse(raw.slice(index));
const after=Number(sql('select count(*) from public.stock_movements;')),remaining=Number(sql(`select count(*) from public.care_recipients where id=${p};`));assert.equal(after,before);assert.equal(remaining,0);assert.equal(vplan[0].Plan['Actual Rows'],1);
result.volume={id:'QP-07',method:'100 new positive movements/new patient in ROLLBACK with all product triggers, actual admin Auth context for read; owner inserts are not a client authorization/throughput proof',movements:100,query:q,plan:vplan,summary:brief(vplan),originalTotalBefore:before,totalAfterRollback:after,fixturePatientRemaining:remaining,rolledBack:true,limits:'Fresh rows have no ANALYZE statistics; sequence gaps survive rollback; insert time is not a measured throughput. Initial 1000-row attempt canceled: see b311-plans-initial-attempt.json'};
const timings=[];for(const [name,args] of [['stock_overview',{p_patient:state.patient}],['operational_document_list',{p_patient:state.patient,p_size:20}],['stock_history',{p_patient:state.patient,p_size:20}],['balance_workspace',{p_patient:state.patient}]]){const started=performance.now();await rpc(admin,name,args);timings.push({name,wallMs:Number((performance.now()-started).toFixed(3)),method:'single authenticated HTTP RPC, includes network/Auth/database time'});}
result.rpcSamples=timings;
const catalog=JSON.parse(readFileSync(new URL('catalog.json',import.meta.url),'utf8'));
result.indexReview=catalog.indexes.filter(i=>['stock_movements','audit_events','consumption_reports','scheduled_shifts','document_events','operational_documents','requisition_lifecycle','notification_deliveries'].includes(i.relation));
writeFileSync(new URL('b311-plans.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({id:'QP-07',...result.volume.summary,nodes:undefined,rolledBack:true}));
