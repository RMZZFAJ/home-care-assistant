import { expect, it } from "vitest";
import { preparationCommand,preparationCreateContent,preparationConfirmed,parsePreparationPage,preparationStatus } from "@/lib/validation/residence-preparation";
import { guideProgressConfirmed,guideConfigurationConfirmed,parseGuide } from "@/lib/validation/guides";
import { parseFlowPage } from "@/lib/validation/flow-reviews";
const id="10000000-0000-4000-8000-000000000001",other="10000000-0000-4000-8000-000000000002";
it("keeps an incomplete preparation private and preserves an explicitly inactive creation choice",()=>{
  expect(preparationCommand.parse({id:null,expectedRevision:null,action:"save",content:{displayName:""},step:0,idempotencyKey:id}).content.displayName).toBe("");
  const content={displayName:"Residência fictícia",isActive:false,isDevelopment:true,timeZone:"America/Sao_Paulo",administratorEmail:"pessoa@example.test",ownerId:id,substituteId:other,responseMinutes:60,showGuide:false,teamIds:[]};
  expect(preparationCreateContent.parse(content).isActive).toBe(false);
  expect(preparationCreateContent.safeParse({...content,substituteId:id}).success).toBe(false);
});
it("does not accept a malformed page or an operational approval claim as a preparation result",()=>{
  expect(()=>parsePreparationPage({data:[],total:0})).toThrow("Não foi possível ler");
  expect(preparationStatus.safeParse({patientCreated:true,activeMemberships:1,activeProducts:0,stockRecordsExist:false,scheduleRecordsExist:false,balanceEnabled:false,guideConfigured:true,productionApproved:true}).success).toBe(false);
});
it("guide confirmation is distinct from document science or an arbitrary200",()=>{
  const intent={action:"progress" as const,expectedScope:id,expectedRevision:0,step:2,status:"skipped" as const,idempotencyKey:id};
  expect(guideProgressConfirmed({data:{status:"science_recorded"}},intent)).toBe(false);
  const data={scope:id,role:"professional",patientId:id,guideVersion:"2026-11-D3",showOnFirstAccess:false,configurationRevision:1,progress:{revision:1,step:2,status:"skipped"}};
  expect(parseGuide(data).showOnFirstAccess).toBe(false);expect(guideProgressConfirmed({data},intent)).toBe(true);
  for(const change of [{scope:other},{progress:{...data.progress,revision:2}},{progress:{...data.progress,status:"started"}},{progress:{...data.progress,step:3}}])expect(guideProgressConfirmed({data:{...data,...change}},intent)).toBe(false);
  const setting={action:"configure" as const,careRecipientId:id,expectedRevision:0,showOnFirstAccess:false,idempotencyKey:id};
  expect(guideConfigurationConfirmed({data:{patientId:id,revision:1,showOnFirstAccess:false}},setting)).toBe(true);
  expect(guideConfigurationConfirmed({data:{patientId:other,revision:1,showOnFirstAccess:false}},setting)).toBe(false);
});
it("Flow pagination distinguishes empty confirmed suggestions from bad data and bounded results",()=>{
  expect(parseFlowPage({data:[],total:0,page:1,pageSize:20,configured:false}).data).toEqual([]);
  for(const value of [{data:null,total:0,page:1,pageSize:20,configured:false},{data:[],total:0,page:1,pageSize:101,configured:false},{}])expect(()=>parseFlowPage(value)).toThrow("consulta de sugestões");
});
it("a structurally valid preparation200 must confirm this action, revision and immutable content",()=>{
  const intent={id,expectedRevision:1,action:"create" as const,content:{displayName:"Residência fictícia",isActive:false},step:1,idempotencyKey:other};
  const row={id,patientId:other,revision:2,step:1,state:"preparing",content:intent.content,savedAt:"2026-11-07T00:00:00Z",productionApproved:false};
  expect(preparationConfirmed({data:row},intent)).toBe(true);
  for(const changed of [{revision:3},{step:2},{id:other},{patientId:null,state:"draft"},{content:{...intent.content,isActive:true}}])expect(preparationConfirmed({data:{...row,...changed}},intent)).toBe(false);
});
