/* MUTABLE LOCAL B3: only new synthetic agenda in patient B. */
import {actor,addAuditActor,state,rpc,recorder,rejected,assert,randomUUID,sql,sqlLiteral as lit} from './local-harness.mjs';
const audit=recorder('B3.7s',{resume:true}),p=state.objects.patientB;
await actor('admin',p);
await audit.scenario('B37-10','Exclusão entre pacientes é atômica, mensagem mínima e fronteira adjacente permitida',async()=>{
 await addAuditActor('b3_counter','supervisor',p);const cl=await actor('admin',p),today=sql("select (now() at time zone 'America/Sao_Paulo')::date::text;"),date=n=>new Date(Date.parse(today+'T12:00:00Z')+n*86400000).toISOString().slice(0,10),call=(action,body)=>rpc(cl,'schedule_command',{p_patient:p,p_action:action,p_body:body,p_key:randomUUID(),p_version:null});
 const type=await call('type',{name:'Tipo B3 conflito entre pacientes',startsLocal:'00:00',durationMinutes:1440}),before=sql(`select count(*) from public.shift_series where care_recipient_id=${lit(p)};`),body={professionalId:state.actors.b3_counter.id,shiftTypeId:type.id,timezone:'America/Sao_Paulo',recurrence:'once',weekdays:[],anchorDate:date(1),validUntil:date(1)},overlap=await rejected(()=>call('series',body));assert.equal(overlap.sqlstate,'23P01');assert.equal(overlap.message,'schedule_command: schedule overlap');assert.equal(sql(`select count(*) from public.shift_series where care_recipient_id=${lit(p)};`),before);
 const adjacent=await call('series',{...body,anchorDate:date(4),validUntil:date(4)});assert.equal(adjacent.status,'published');const cross=await (await actor('b3_counter',state.objects.balPatient)).from('scheduled_shifts').select('id').eq('care_recipient_id',p);assert.ifError(cross.error);assert.equal(cross.data.length,0);return {overlap,seriesCountUnchangedOnFailure:true,adjacentPublished:true,foreignRows:0,scope:'Same real synthetic professional in two patients; exclusion crosses tenant scope without exposing detail'};
});
audit.finish();await actor('admin',state.patient);
