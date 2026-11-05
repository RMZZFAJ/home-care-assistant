/* AUDIT ONLY. MUTATES ONLY NEW SYNTHETIC LOCAL RECORDS. No reset/seed/deletion.
 * Reuses reviewed official Auth and transactional fixture helpers; never remote. */
import {existsSync,writeFileSync} from 'node:fs';
import {getE2EEnvironment} from '../../../../scripts/e2e-environment.mjs';
import {rpc,issue,delivery} from '../../../../tests/integration/v4-fixtures.mjs';
import {balanceSetup,dayOffset,shiftCommand} from '../../../../tests/integration/shift-fixtures.mjs';
const env=getE2EEnvironment(),output=new URL('b1-fixture.json',import.meta.url);
if(existsSync(output))throw Error('Preserve existing B1 fixture; do not recreate');
if(env.NOTIFICATIONS_EXTERNAL_ENABLED!=='false'||env.META_FLOWS_ENABLED!=='false')throw Error('External sending must remain disabled');
const startedAt=new Date().toISOString(),f=await balanceSetup();
const req=await issue(f.patient,f.products),ent=await delivery(f.patient,req,f.products);
const com=await rpc(f.admin,'create_supply_document',{p_patient:f.patient,p_type:'COM',p_key:crypto.randomUUID(),p_draft:false,p_payload:{origin:'donation',lines:f.products.map(productId=>({productId,quantity:'5'})),notes:'Auditoria B1: doação inteiramente fictícia, sem contato externo'}});
const second=await shiftCommand(f.admin,f.patient,'series',{professionalId:f.pro.id,shiftTypeId:f.type.id,timezone:'America/Sao_Paulo',recurrence:'once',weekdays:[],anchorDate:dayOffset(f.today,6),validUntil:dayOffset(f.today,6),notes:'Destino fictício de adiamento B1'});
const data={startedAt,finishedAt:new Date().toISOString(),productSha:'37cb7f85e96e551d6419871f94dd950712e2565b',localApi:env.NEXT_PUBLIC_SUPABASE_URL,externalSending:false,patient:f.patient,products:f.products,pro:{id:f.pro.id,email:f.pro.email},req:req.id,ent:ent.id,com:com.id,shiftType:f.type.id,today:f.today,secondSeries:second.id,mutations:['new synthetic patient and local memberships from reviewed setup','two synthetic catalog products','two family inbound ledger records, quantity 30 each','new official Auth shift-worker account','synthetic published shifts and activated BAL regime','REQ, ENT pending receipt and COM donation auto-approved by effective policy'],preservation:'Preexisting records retained. No cleanup; B1 fixture remains for inspection.'};
writeFileSync(output,JSON.stringify(data,null,2)+'\n');console.log(JSON.stringify({fixtureCreated:true,patient:data.patient,products:data.products.length,documents:3}));
