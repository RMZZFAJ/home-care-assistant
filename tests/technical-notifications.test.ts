import { expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { parseTechnicalNotifications } from "@/lib/operations/notification-attempts";

const at="2026-11-12T19:00:00Z";
function example(){return {data:{environment:"shared_database",source:"web_push",consultedAt:at,page:1,pageSize:20,total:1,data:[{id:randomUUID(),channel:"web_push",state:"uncertain",createdAt:at,attemptedAt:at,recordedAttemptCount:1,providerReferenceRecorded:false,errorRecorded:true,historyCoverage:"recorded_attempts",attempts:[{id:randomUUID(),ordinal:1,startedAt:at,completedAt:null,outcome:"uncertain",errorRecorded:true}]}]}};}
it("preserves actual attempt references and an explicitly unconfirmed outcome",()=>{
  const input=example(), result=parseTechnicalNotifications(input,"web_push",1);
  expect(result.data).toEqual(input.data.data); expect(result.environment).toBe("shared_database");
});
it("binds source, page, environment and coverage without accepting a private payload",()=>{
  const input=example();
  for(const replacement of [{source:"notices"},{page:2},{pageSize:50},{environment:"preview"},{patientName:"PRIVATE_SENTINEL"}]){
    expect(()=>parseTechnicalNotifications({data:{...input.data,...replacement}},"web_push",1)).toThrow();
  }
  const invalid={data:{...input.data,data:[{...input.data.data[0],endpoint:"PRIVATE_SENTINEL"}]}};
  expect(()=>parseTechnicalNotifications(invalid,"web_push",1)).toThrow("Consulta de tentativas sem confirmação reconhecível.");
  try{parseTechnicalNotifications(invalid,"web_push",1);}catch(error){expect(String(error)).not.toContain("PRIVATE_SENTINEL");}
});
it("refuses duplicated references and mismatched legacy records instead of fabricating empty history",()=>{
  const input=example();
  expect(()=>parseTechnicalNotifications({data:{...input.data,data:[...input.data.data,...input.data.data]}},"web_push",1)).toThrow();
  expect(()=>parseTechnicalNotifications({data:{...input.data,source:"notices"}},"notices",1)).toThrow();
  expect(()=>parseTechnicalNotifications({data:{...input.data,data:[{...input.data.data[0],historyCoverage:"last_result_only"}]}},"web_push",1)).toThrow();
});
it("keeps absent legacy attempt history distinct from a recorded zero counter or missing timestamp",()=>{
  const row={...example().data.data[0],channel:"internal",attemptedAt:null,recordedAttemptCount:0,historyCoverage:"last_result_only",attempts:[]};
  const input={data:{...example().data,source:"notices",data:[row]}};
  expect(parseTechnicalNotifications(input,"notices",1).data[0]).toEqual(row);
});
