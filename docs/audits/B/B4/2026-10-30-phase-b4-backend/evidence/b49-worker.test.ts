/* Orchestration with the real Meta adapter and entirely in-memory transport. */
import { it,expect,vi } from 'vitest';
vi.mock('@/lib/notifications/document-notification',()=>({prepareDocumentNotification:async(_client:unknown,job:unknown)=>job}));
import { processNotifications } from '@/lib/notifications/worker';
import { MetaWhatsAppProvider } from '@/lib/notifications/provider';
it('B49-01 cancellation during media upload does not stop the subsequent message call',async()=>{
 let revoked=false;const calls:{kind:string;afterCancellation:boolean}[]=[];
 const provider=new MetaWhatsAppProvider({accessToken:'TEST_ONLY',phoneNumberId:'123',graphVersion:'v24.0',language:'pt_BR',template:'synthetic',documentTemplate:'synthetic_pdf'},(async(url:string|URL|Request)=>{
  const media=String(url).endsWith('/media');calls.push({kind:media?'media':'message',afterCancellation:revoked});
  if(media){revoked=true;return Response.json({id:'12345'});}
  return Response.json({messages:[{id:'synthetic-reference'}]});
 }) as typeof fetch);
 const job={id:'10000000-0000-4000-8000-000000000001',channel:'whatsapp',destination:'+15550000000',requisition_id:null,document_id:'20000000-0000-4000-8000-000000000001',attachment:{bytes:new Uint8Array([1,2]),filename:'synthetic.pdf'}};
 const rpc=vi.fn(async(name:string)=>({data:name==='claim_notification_jobs'?[job]:name==='validate_notification_job'?true:name==='notification_job_state'?'cancelled':null,error:name==='complete_notification_job'&&revoked?{code:'42501',message:'job cancelled'}:null}));
 const counts=await processNotifications({rpc} as never,1,provider);
 expect(calls).toEqual([{kind:'media',afterCancellation:false},{kind:'message',afterCancellation:true}]);expect(counts).toMatchObject({skipped:1,accepted:0});expect(rpc.mock.calls.filter(([n])=>n==='validate_notification_job')).toHaveLength(1);
});
