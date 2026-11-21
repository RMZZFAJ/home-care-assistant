import {describe,expect,it} from "vitest";
import {noIssuesCommand,noIssuesConfirmed,notificationReference,referenceQuery} from "@/lib/validation/notification-reference";
import {consumptionCommand,consumptionResultConfirmed} from "@/lib/validation/consumption";
import {POST} from "@/app/api/notifications/target/route";
const patient="10000000-0000-4000-8000-000000000001",ref="10000000-0000-4000-8000-000000000002",key="10000000-0000-4000-8000-000000000003";
describe("exact authorized notification reference",()=>{
 it("requires an explicit namespace from the closed vocabulary and validates opaque IDs",()=>{
  expect(referenceQuery.parse({careRecipientId:patient,ref,area:"consumption"}).namespace).toBe("auto");
  for(const patch of [{ref:"not-an-id"},{area:"admin"},{namespace:"__proto__"},{actorId:ref}])expect(referenceQuery.safeParse({careRecipientId:patient,ref,area:"schedule",...patch}).success).toBe(false);
 });
 it("keeps reminder answers minimal and rejects forged clinical or actor input before authentication",async()=>{
  const packet={careRecipientId:patient,ref,action:"no_issues",idempotencyKey:key};
  expect(noIssuesCommand.safeParse(packet).success).toBe(true);
  for(const patch of [{actorId:ref},{lines:[]},{attendance:true},{action:"confirm"},{idempotencyKey:null}]){
   const response=await POST(new Request("https://care.example/api/notifications/target",{method:"POST",headers:{origin:"https://care.example","content-type":"application/json"},body:JSON.stringify({...packet,...patch})}));expect(response.status).toBe(400);
  }
 });
 it("only acknowledges a well formed receipt for the same patient reminder and attempt",()=>{
  const packet=noIssuesCommand.parse({careRecipientId:patient,ref,action:"no_issues",idempotencyKey:key}),data={careRecipientId:patient,reminderId:ref,idempotencyKey:key,acknowledgedAt:"2026-11-07T10:00:00Z",recorded:true};
  expect(noIssuesConfirmed({data},packet)).toBe(true);
  for(const change of [{careRecipientId:ref},{reminderId:patient},{idempotencyKey:ref},{acknowledgedAt:"bad"},{recorded:null}])expect(noIssuesConfirmed({data:{...data,...change}},packet)).toBe(false);
 });
 it("distinguishes a report from a personal shift reminder and rejects malformed facts",()=>{
  const base={careRecipientId:patient,referenceId:ref};
  expect(notificationReference.safeParse({...base,kind:"report",reportId:ref,sourceReminderId:null}).success).toBe(true);
  for(const value of [{...base,kind:"shift_reminder"},{...base,kind:"future_kind"},{...base,kind:"report",reportId:"not-a-report",sourceReminderId:null}])expect(notificationReference.safeParse(value).success).toBe(false);
 });
 it("binds report origin and confirmation to the original team reminder and immutable key",()=>{
  const packet=consumptionCommand.parse({action:"report",careRecipientId:patient,reminderId:ref,kind:"shortage",location:"CARE_TEAM",text:"Falta fictícia do lembrete",lines:[],idempotencyKey:key});
  if(packet.action!=="report")throw new Error("Invalid fixture");
  expect(consumptionCommand.safeParse({...packet,location:"FAMILY"}).success).toBe(false);
  const receipt={id:ref,careRecipientId:patient,reminderId:ref,idempotencyKey:key,recorded:true};
  expect(consumptionResultConfirmed(receipt,packet,patient)).toBe(true);
  for(const change of [{reminderId:patient},{careRecipientId:ref},{idempotencyKey:ref},{recorded:null}])expect(consumptionResultConfirmed({...receipt,...change},packet,patient)).toBe(false);
 });
});
