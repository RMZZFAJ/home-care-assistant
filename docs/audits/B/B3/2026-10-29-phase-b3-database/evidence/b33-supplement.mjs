/* MUTABLE LOCAL: adds new B3 documents; every attempted table DML must be denied. */
import {readFileSync,writeFileSync} from 'node:fs';
import {actor,state,rpc,recorder,rejected,assert,randomUUID,sql,save} from './local-harness.mjs';
const cat=JSON.parse(readFileSync(new URL('catalog.json',import.meta.url))),audit=recorder('B3.3s',{resume:true});
await audit.scenario('B33-11','Privilégio DML efetivo de cada tabela pública pela API Auth real',async()=>{
 const cl=await actor('admin'),rows=[];
 for(const table of cat.relations.filter(r=>r.schema==='public'&&r.kind==='r')){
 const col=cat.columns.find(c=>c.schema==='public'&&c.relation===table.name);
 for(const op of ['INSERT','UPDATE','DELETE']){
 let q=cl.from(table.name);q=op==='INSERT'?q.insert({}):op==='UPDATE'?q.update({[col.name]:null}).is(col.name,null):q.delete().is(col.name,null);
 const {error,status}=await q;rows.push({table:table.name,operation:op,status,sqlstate:error?.code??null,denied:!!error});assert.equal(error?.code,'42501',table.name+' '+op+' must fail at grant');
 }}return {attempts:rows.length,rows};
});
await audit.scenario('B33-12','Escopo de documentos por UUID; COM oculta da equipe',async()=>{
 const admin=await actor('admin');if(!state.objects.securityCom){const d=await rpc(admin,'create_supply_document',{p_patient:state.patient,p_type:'COM',p_payload:{lines:[{productId:state.products[0],quantity:'1'}]},p_key:randomUUID(),p_draft:false});state.objects.securityCom=d.id;save();}
 const pro=await actor('professional'),table=await pro.from('operational_documents').select('id').eq('id',state.objects.securityCom),read=await rejected(()=>rpc(pro,'operational_document',{p_id:state.objects.securityCom}));assert.ifError(table.error);assert.equal(table.data.length,0);assert.equal(read.rejected,true);
 const outsider=await actor('outsider',state.objects.patientB),foreign=await rejected(()=>rpc(outsider,'operational_document',{p_id:state.objects.securityCom}));assert.equal(foreign.rejected,true);
 const adminVisible=await rpc(await actor('admin'),'operational_document',{p_id:state.objects.securityCom});assert.equal(adminVisible.id,state.objects.securityCom);return {professionalRows:0,professionalRpc:read,otherPatientRpc:foreign,authorizedAdmin:true};
});
await audit.scenario('B33-13','Schema privado não é superfície REST exposta',async()=>{
 const cl=await actor('admin'),r=await cl.schema('private').from('authority_sessions').select('session_id');assert.ok(r.error);return {status:r.status,code:r.error.code};
});
const details=JSON.parse(sql(`begin read only;select jsonb_build_object('columnGrants',(select coalesce(jsonb_agg(jsonb_build_object('schema',table_schema,'table',table_name,'column',column_name,'role',grantee,'privilege',privilege_type)),'[]') from information_schema.column_privileges where table_schema in ('public','private') and grantee in ('anon','authenticated','service_role')),'schemaGrants',(select jsonb_agg(jsonb_build_object('schema',n.nspname,'role',r.rolname,'usage',has_schema_privilege(r.rolname,n.oid,'usage'),'create',has_schema_privilege(r.rolname,n.oid,'create'))) from pg_namespace n cross join pg_roles r where n.nspname in ('public','private') and r.rolname in ('anon','authenticated','service_role')));rollback;`));
writeFileSync(new URL('column-and-schema-grants.json',import.meta.url),JSON.stringify(details,null,2)+'\n');
audit.finish();
