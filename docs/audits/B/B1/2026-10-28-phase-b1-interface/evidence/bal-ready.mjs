/* LOCAL AUDIT: Auth/context and browser-only counts. Waits for actual review. */
import {readFileSync} from 'node:fs';
import {harness} from './browser-harness.mjs';
const h=await harness('b11-bal-ready'),f=JSON.parse(readFileSync(new URL('b1-fixture.json',import.meta.url),'utf8'));
try{
 const p=await h.login('shiftWorker',f.patient,f.pro);
 await p.goto('/fichas/bal',{waitUntil:'networkidle'});
 const inputs=p.getByPlaceholder('Quantidade física',{exact:true});await inputs.first().waitFor();
 for(let i=0;i<await inputs.count();i++)await inputs.nth(i).fill(i?'0':'1');
 await p.getByRole('button',{name:'Revisar',exact:true}).click();
 await p.getByRole('heading',{name:'Revisão da contagem',exact:true}).waitFor();
 await p.getByRole('button',{name:'Confirmar contagem',exact:true}).waitFor({state:'visible'});
 await h.capture(p,'shiftWorker','review-ready',{fullPage:true,note:'Readiness oracle: heading Revisão da contagem + Confirmar contagem visible. Supersedes transient capture b11-supplement scheduled-bal-review.'});
 await p.context().close();
}finally{await h.finish();}
