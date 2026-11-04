/* Real provider, controlled transport. No Supabase or external calls. */
import { it, expect, vi } from 'vitest';
import { MetaWhatsAppProvider } from '@/lib/notifications/provider';
const config = {accessToken:'B5_SYNTHETIC',phoneNumberId:'123',graphVersion:'v25.0',language:'pt_BR',template:'b5_test',documentTemplate:'b5_pdf'};
const job = {id:'b5000000-0000-4000-8000-000000000001',channel:'whatsapp',destination:'+15550000001',requisition_id:null,attachment:{bytes:new Uint8Array([1,2]),filename:'B5-synthetic.pdf'}};
it('B53-C01 upload timeout becomes uncertain although messages was never invoked', async () => {
 const calls:string[]=[];
 const transport = vi.fn<typeof fetch>(async url => {
   calls.push(new URL(String(url)).pathname);
   throw new DOMException('B5 controlled media timeout','TimeoutError');
 });
 const result = await new MetaWhatsAppProvider(config,transport).send(job);
 expect(calls).toEqual(['/v25.0/123/media']);
 expect(result).toEqual({state:'uncertain',error:'PROVIDER_RESULT_UNCERTAIN'});
});
it('B53-C02 explicit upload failure retries without sending a message', async () => {
 const transport = vi.fn<typeof fetch>(async () => new Response(null,{status:503}));
 expect(await new MetaWhatsAppProvider(config,transport).send(job)).toEqual({state:'pending',error:'MEDIA_UPLOAD_FAILED'});
 expect(transport).toHaveBeenCalledTimes(1);
});
it('B53-C03 message timeout remains uncertain after a successful upload', async () => {
 const calls:string[]=[];
 const transport = vi.fn<typeof fetch>(async url => {
   const path = new URL(String(url)).pathname; calls.push(path);
   if(path.endsWith('/media'))return Response.json({id:'12345'});
   throw new DOMException('B5 controlled message timeout','TimeoutError');
 });
 expect(await new MetaWhatsAppProvider(config,transport).send(job)).toEqual({state:'uncertain',error:'PROVIDER_RESULT_UNCERTAIN'});
 expect(calls).toEqual(['/v25.0/123/media','/v25.0/123/messages']);
});
