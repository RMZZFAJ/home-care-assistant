/* Actual adapters with in-memory Storage/RPC failures; no real persistence. */
import { beforeEach,it,expect,vi } from 'vitest';
const setup=vi.hoisted(()=>({client:null as unknown,server:null as unknown}));
vi.mock('@/lib/supabase/server',()=>({createSupabaseServerClient:async()=>setup.client}));
vi.mock('@/lib/server/service-client',()=>({createWorkerClient:()=>setup.server}));
vi.mock('@/lib/server/operational-pdf',()=>({renderDocumentPdf:vi.fn(async()=>Buffer.from('generated synthetic bytes'))}));
vi.mock('@/lib/server/files',()=>({boundedUpload:vi.fn(async()=>({file:{type:'image/png',name:'synthetic.png'},bytes:Buffer.from('input'),form:new FormData()})),sanitizeFile:vi.fn(async()=>({mime:'image/jpeg',bytes:Buffer.from('sanitized synthetic bytes')}))}));
import { documentPdf } from '@/lib/server/document-pdf';
import { renderDocumentPdf } from '@/lib/server/operational-pdf';
import { POST as avatarPost } from '@/app/api/profile/route';
import { createHash } from 'node:crypto';
const id='10000000-0000-4000-8000-000000000001';
const chain=(data:unknown)=>{const q={select:vi.fn(()=>q),eq:vi.fn(()=>q),maybeSingle:vi.fn(async()=>({data,error:null}))};return q;};
beforeEach(()=>vi.clearAllMocks());
it('B47-05 failed existing PDF download is not silently rerendered',async()=>{
 const upload=vi.fn();setup.client={rpc:vi.fn(async()=>({data:{version:2,protocol:'SYNTHETIC',code:'REQ-SYNTHETIC'},error:null})),from:()=>chain({object_path:'original-version-1'})};
 setup.server={storage:{from:()=>({download:async()=>({data:null,error:{message:'controlled outage'}}),upload})}};
 await expect(documentPdf(setup.client as never,id,1)).rejects.toMatchObject({code:'PERSISTENCE_UNCONFIRMED'});expect(upload).not.toHaveBeenCalled();expect(renderDocumentPdf).not.toHaveBeenCalled();
});
it('B47-06 duplicate PDF upload returns and registers canonical stored bytes',async()=>{
 const stored=Buffer.from('canonical concurrent artifact');const register=vi.fn(async()=>({data:{},error:null}));
 setup.client={rpc:async()=>({data:{version:1,protocol:'SYNTHETIC',code:'REQ-SYNTHETIC'},error:null}),from:(name:string)=>chain(name==='document_pdf_renders'?null:{body:{id},content_hash:'canonical-content-hash'})};
 setup.server={rpc:register,storage:{from:()=>({upload:async()=>({error:{statusCode:'409'}}),download:async()=>({data:new Blob([stored]),error:null})})}};
 const result=await documentPdf(setup.client as never,id,1);expect(result.bytes).toEqual(stored);expect(register.mock.calls[0]).toMatchObject(['register_document_render',{p_hash:createHash('sha256').update(stored).digest('hex')}]);
});
it('B47-07 avatar association failure leaves a new upload and retry uses a different path',async()=>{
 const paths:string[]=[];let fail=true;
 const rpc=vi.fn(async(name:string)=>name==='set_my_avatar'?fail?{data:null,error:{code:'42501',message:'authorization required'}}:{data:null,error:null}:{data:name==='my_session_valid'?true:false,error:null});
 setup.client={auth:{getUser:async()=>({data:{user:{id}},error:null})},from:()=>chain({status:'active',full_name:'Synthetic'}),rpc,storage:{from:()=>({upload:async(path:string)=>{paths.push(path);return{error:null};}})}};
 const log=vi.spyOn(console,'error').mockImplementation(()=>{});
 const request=()=>new Request('https://care.example/api/profile',{method:'POST',headers:{'content-type':'multipart/form-data; boundary=synthetic',origin:'https://care.example'}});
 const failed=await avatarPost(request());expect(failed.status).toBe(403);expect(paths).toHaveLength(1);
 fail=false;const recovered=await avatarPost(request());expect(recovered.status).toBe(200);expect(paths).toHaveLength(2);expect(paths[0]).not.toBe(paths[1]);log.mockRestore();
});
