/* Real rules handler and provider configuration; identity/data adapter mocked.
 * No real Auth, DB, network or provider. Tests only the activation contract. */
import {it,expect,vi,afterAll,afterEach,beforeAll} from 'vitest';
import {writeFileSync} from 'node:fs';
vi.mock('@/lib/server/api',()=>({
 api:(_name:string,action:()=>Promise<Response>)=>action(),
 authenticate:async()=>({client:{}}),
 parseUuid:(value:string)=>value,
 rpc:async()=>[],
}));
import {GET} from '@/app/api/notification-rules/route';
import {metaConfiguration} from '@/lib/notifications/provider';
const results:unknown[]=[];
let networkCalls=0;
beforeAll(()=>vi.stubGlobal('fetch',()=>{networkCalls++;throw new Error('B7 network forbidden');}));
afterEach(()=>vi.unstubAllEnvs());
afterAll(()=>{
 expect(networkCalls).toBe(0);
 writeFileSync(new URL('configuration-results.json',import.meta.url),JSON.stringify({recordedAt:new Date().toISOString(),method:'Real handler/provider configuration with mocked authorized data adapter; no sends',networkCalls,cases:results},null,2)+'\n');
 vi.unstubAllGlobals();
});
const cases=[
 {id:'CFG-01',name:'complete configuration',override:{},advertised:true,available:true},
 {id:'CFG-02',name:'disabled feature',override:{NOTIFICATIONS_EXTERNAL_ENABLED:'false'},advertised:false,available:false},
 {id:'CFG-03',name:'missing token',override:{META_WHATSAPP_ACCESS_TOKEN:''},advertised:false,available:false},
 {id:'CFG-04',name:'missing Graph version',override:{META_GRAPH_API_VERSION:''},advertised:true,available:false},
 {id:'CFG-05',name:'malformed Graph version',override:{META_GRAPH_API_VERSION:'invalid'},advertised:true,available:false},
 {id:'CFG-06',name:'malformed asset identity',override:{META_WHATSAPP_PHONE_NUMBER_ID:'not-a-number'},advertised:true,available:false},
 {id:'CFG-07',name:'malformed language',override:{META_WHATSAPP_TEMPLATE_LANGUAGE:'invalid language'},advertised:true,available:false},
];
for(const c of cases)it(`${c.id}: ${c.name}`,async()=>{
 const env:Record<string,string>={NOTIFICATIONS_EXTERNAL_ENABLED:'true',META_WHATSAPP_ACCESS_TOKEN:'B7_SYNTHETIC_TOKEN',META_WHATSAPP_PHONE_NUMBER_ID:'123',META_GRAPH_API_VERSION:'v25.0',META_WHATSAPP_TEMPLATE_LANGUAGE:'pt_BR',...c.override};
 for(const [key,value]of Object.entries(env))vi.stubEnv(key,value);
 const response=await GET(new Request('https://b7.example/api/notification-rules?careRecipientId=70000000-0000-4000-8000-000000000001'));
 const body=await response.json();
 const advertised=body.channels.some((x:{code:string})=>x.code==='whatsapp');
 const available=metaConfiguration(env)!==null;
 expect(advertised).toBe(c.advertised);expect(available).toBe(c.available);
 results.push({id:c.id,case:c.name,status:response.status,advertised,providerConfigurationAccepted:available});
});
