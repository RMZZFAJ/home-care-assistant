/* Count logical Supabase requests with real handler; no latency claim. */
import { it,expect,vi } from 'vitest';
const state=vi.hoisted(()=>({client:null as unknown,calls:[] as string[]}));
vi.mock('@/lib/supabase/server',()=>({createSupabaseServerClient:async()=>state.client}));
import { GET } from '@/app/api/dashboard/route';
it('B411-01 broad-capability dashboard makes 25 logical Supabase requests',async()=>{
 const id='10000000-0000-4000-8000-000000000001';
 const rpc=async(name:string)=>{state.calls.push('rpc:'+name);return{error:null,data:name==='my_session_valid'?true:name==='is_global_administrator'?false:name==='my_active_context'?{mode:'patient',care_recipient_id:id}:name==='patient_capabilities'?new Proxy({},{get:()=>true}):name==='operational_document_list'?{data:[]}:name==='operational_tasks'?{requests:0,consumptionPending:0,sciencePending:0,archivePending:0}:name==='balance_workspace'?{eligibility:{available:false,assignment:null},obligations:[],deferrals:[],regime:null}:[]};};
 state.client={rpc,auth:{getUser:async()=>{state.calls.push('auth:getUser');return{data:{user:{id}},error:null};}},from:(table:string)=>{
  const data=table==='profiles'?{full_name:'Synthetic',status:'active'}:table==='care_recipients'?{id,is_active:true,display_name:'Synthetic'}:table==='care_recipient_memberships'?{role:'admin'}:table==='patient_settings'?{settings:{balDay:null}}:[];
  const finish=()=>{state.calls.push('table:'+table);return{data,error:null,count:0};};
  const q:Record<string,unknown>={};for(const k of ['select','eq','gt','order','limit'])q[k]=()=>q;
  q.maybeSingle=async()=>finish();q.then=(done:(r:unknown)=>unknown)=>Promise.resolve(finish()).then(done);return q;
 }};
 const response=await GET(new Request('https://care.example/api/dashboard?careRecipientId='+id));expect(response.status).toBe(200);expect(state.calls).toHaveLength(25);
 expect(state.calls.slice(0,8)).toEqual(['auth:getUser','table:profiles','rpc:my_session_valid','rpc:is_global_administrator','table:care_recipients','table:care_recipient_memberships','rpc:my_active_context','rpc:patient_capabilities']);
});
