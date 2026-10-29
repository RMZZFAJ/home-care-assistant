/* READ ONLY BUSINESS AUDIT. Local login/context writes only; no business commands.
 * Corrects premature B1.8 supervisor capture. Requires ready heading and data.
 * Reconsults existing REQ after science; never repeats the mutation. */
import {readFileSync} from 'node:fs';
import {harness} from './browser-harness.mjs';
const h=await harness('b18-ready'),f=JSON.parse(readFileSync(new URL('b1-fixture.json',import.meta.url),'utf8')),prior=JSON.parse(readFileSync(new URL('b18-journeys.json',import.meta.url),'utf8'));
try{
 await h.attempt('supervisor-ready',async()=>{const p=await h.login('supervisor');await p.getByRole('link',{name:'Mais',exact:true}).click();await p.getByRole('link').filter({hasText:'Balanços e plantões'}).first().click();await p.getByRole('heading',{name:'Balanços e plantões',exact:true}).waitFor();await p.getByRole('heading',{name:'Programação do balanço',exact:true}).waitFor();await h.capture(p,'supervisor','balance-ready',{state:'READY',note:'Ready headings awaited. No review/count command. Original b18-journeys supervisor image was access validation only.'});});
 await h.attempt('family-requery-ready',async()=>{const p=await h.login('family',f.patient);await p.goto('/historico/'+prior.issued.id,{waitUntil:'networkidle'});await p.getByRole('heading',{name:prior.issued.code,exact:true}).waitFor();await p.getByText('Exigência satisfeita',{exact:true}).waitFor();await h.capture(p,'family','science-requery-ready',{state:'READY',note:'Reconsult after science already persisted; no new science command. Earlier success screenshot was before refresh completed.'});});
}finally{await h.finish();}
