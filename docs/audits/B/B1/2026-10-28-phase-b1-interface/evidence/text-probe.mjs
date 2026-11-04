/* AUDIT ONLY. Read-only UI apart from local Auth/context; fake proposal is a browser response, never persisted. */
import {readFileSync} from 'node:fs';
import {harness,accounts} from './browser-harness.mjs';
const h=await harness('b13-text'),f=JSON.parse(readFileSync(new URL('b1-fixture.json',import.meta.url),'utf8'));
try{const p=await h.login('adminA',f.patient);
for(const status of ['science_required','archive_pending'])await h.attempt(status,async()=>{await p.goto('/historico?type=REQ&status='+status,{waitUntil:'networkidle'});await h.capture(p,'adminA','filter-'+status,{note:'Real local GET; chip value differs from dropdown dictionary.'});});
await h.attempt('proposal-render',async()=>{await p.route('**/api/patient-settings?**',async route=>{const response=await route.fetch(),body=await response.json();body.changes=[{id:'10000000-0000-4000-8000-00000000b101',kind:'settings',proposed:{archiveDays:14,scienceRequired:true},proposed_by:accounts.global.id,status:'pending'}];await route.fulfill({response,json:body});});await p.goto('/configuracoes?area=people',{waitUntil:'networkidle'});await h.capture(p,'adminA','proposal-json',{fullPage:true,note:'Injected synthetic read-model proposal only. No proposal created or approved in database.'});});
}finally{await h.finish();}
