/* LOCAL capability contract on new B4 patient and new catalogue item only. */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { state,http,select,record,save } from './http-local.mjs';
await select('admin');await select('global',null);const patient=state.patients[0],results=[];
const policy=await http('admin','/api/patient-settings?careRecipientId='+patient);assert.equal(policy.status,200);
const delegated=await http('admin','/api/patient-settings',{method:'POST',body:{careRecipientId:patient,kind:'capability',change:{capability:'catalog.manage',subjectUser:state.actors.professional.id,enabled:true},idempotencyKey:randomUUID(),expectedVersion:policy.data.data.version}});assert.equal(delegated.status,200);
await select('professional');
const context=await http('professional','/api/context');const caps=context.data.data.patients.find(p=>p.id===patient).capabilities;assert.equal(caps['catalog.manage'],true);assert.equal(caps['access.manage'],false);
const product={careRecipientId:patient,id:null,name:'Material delegado fictício '+state.tag,category:'higiene',unit:'unidade',aliases:[],isActive:true};
const denied=await http('professional','/api/catalog',{method:'POST',body:product});assert.equal(denied.status,403);
const accepted=await http('professional','/api/admin',{method:'POST',body:{...product,action:'product'}});assert.equal(accepted.status,200);assert(accepted.data.data.product_id);
state.objects.delegatedProduct=accepted.data.data.product_id;save();
results.push({id:'B48-01',contract:'Equivalent catalogue operations should respect the same effective capability',capabilities:{catalogManage:true,accessManage:false},catalogRoute:denied.status,adminRoute:accepted.status,createdProductId:accepted.data.data.product_id,relation:'Divergence already observed in A;B4 provides HTTP/Auth proof',counterproof:'Active consumer uses /admin successfully;no privilege escalation;SQL still authorizes'});
for(const [name,id] of [['global','B48-02'],['admin','B48-03']]){
 const r=await http(name,'/api/admin?section=catalog&careRecipientId=invalid-id');assert.equal(r.status,name==='global'?500:400);
 results.push({id,contract:'Malformed patient identifier is input error independent of authority mode',mode:name,status:r.status,code:r.data.code,retryable:r.data.retryable,limits:'No data mutation;global uses uuid.parse rather than parseUuid;local path uses patientContext'});
}
const profile=await http('admin','/api/admin',{method:'POST',body:{action:'profile',userId:state.actors.professional.id,fullName:'Pessoa fictícia B4 professional',role:'admin',status:'active',globalScope:true}});assert.equal(profile.status,403);
results.push({id:'B48-04',contract:'Local administrator cannot change platform identity/global authority',status:profile.status,code:profile.data.code});
const crossed=await http('professional','/api/admin',{method:'POST',body:{...product,action:'product',careRecipientId:state.patients[1]}});assert([403,404,409].includes(crossed.status));
results.push({id:'B48-05',contract:'Delegated capability belongs to selected patient only',status:crossed.status,code:crossed.data.code});
record('b48-admin-results.json',{recordedAt:new Date().toISOString(),category:'HTTP_REAL_AUTH',results});console.log(JSON.stringify({scenarios:results.length,catalogueDivergenceConfirmed:true,globalInput500Confirmed:true}));
