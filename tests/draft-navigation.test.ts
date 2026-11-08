import { expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { draftFlowStages, navigationForStep, navigationAllowed, stepForNavigation } from "@/lib/forms/draft-navigation";
import { draftNavigationSchema } from "@/lib/validation/draft-navigation";
import { creationDraftCommandSchema } from "@/lib/validation/creation-drafts";
import { parsePrivateDraft } from "@/lib/validation/private-draft-results";
import { DraftContentSummary } from "@/components/forms/creation-draft-panel";
const id="10000000-0000-4000-8000-000000000001";
const content={lines:[],extraItems:[],observations:["Dados ainda incompletos"]};
const scope={userId:id,patientId:id,kind:"REQ" as const,purpose:"create" as const,targetDocumentId:null};
const row={id,ownerId:id,patientId:id,kind:"REQ",purpose:"create",targetDocumentId:null,schemaVersion:1,revision:1,state:"active",createdAt:"2026-11-08T00:00:00Z",savedAt:"2026-11-08T00:00:00Z",contentHash:"unchanged",content,consumedDocumentId:null};

it("restores every closed wizard stage and keeps legacy drafts at the established first step",()=>{
 for(const flow of Object.keys(draftFlowStages) as (keyof typeof draftFlowStages)[]){
  draftFlowStages[flow].forEach((_,index)=>expect(stepForNavigation(flow,navigationForStep(flow,index))).toBe(index));
  expect(stepForNavigation(flow,null)).toBe(0);
 }
 expect(()=>navigationForStep("REQ",7)).toThrow();
 expect(()=>navigationForStep("REQ",0.5)).toThrow();
});
it("rejects arbitrary versions, authority fields and stages from another purpose or BAL mode",()=>{
 for(const bad of [null,{version:2,stage:"review"},{version:1,stage:"finished"},{version:1,stage:"review",ownerId:id}])expect(draftNavigationSchema.safeParse(bad).success).toBe(false);
 expect(navigationAllowed("REQ","create",{version:1,stage:"count"})).toBe(false);
 expect(navigationAllowed("BAL","create",{version:1,stage:"count"},{context:{mode:"scheduled"}})).toBe(true);
 expect(navigationAllowed("BAL","create",{version:1,stage:"count"},{context:{mode:"legacy"}})).toBe(false);
 expect(navigationAllowed("ENT","receive",{version:1,stage:"divergence"})).toBe(false);
 expect(navigationAllowed("ENT","divergence",{version:1,stage:"divergence"})).toBe(true);
 expect(navigationAllowed("COM","create",{version:1,stage:"extras"})).toBe(false);
});
it("keeps navigation outside business content and permits omission only on a save",()=>{
 const packet={careRecipientId:id,kind:"REQ",targetDocumentId:null,id:null,expectedRevision:null,idempotencyKey:id,action:"save",content};
 expect(creationDraftCommandSchema.parse({...packet,navigation:{version:1,stage:"notes"}})).toMatchObject({content,navigation:{version:1,stage:"notes"}});
 expect(creationDraftCommandSchema.safeParse(packet).success).toBe(true);
 for(const bad of [{...packet,navigation:null},{...packet,navigation:{version:1,stage:"receipt"}},{...packet,content:{...content,navigation:{version:1,stage:"notes"}}},{...packet,action:"discard",content:undefined,navigation:{version:1,stage:"review"}}])expect(creationDraftCommandSchema.safeParse(bad).success).toBe(false);
});
it("validates returned metadata against the authenticated scope and hides inactive navigation",()=>{
 expect(parsePrivateDraft(row,scope)?.navigation).toBe(null);
 expect(parsePrivateDraft({...row,navigation:{version:1,stage:"review"}},scope)?.content).toEqual(content);
 for(const bad of [{...row,navigation:{version:1,stage:"count"}},{...row,navigation:{version:1,stage:"review",role:"admin"}},{...row,state:"discarded",content:null,navigation:{version:1,stage:"review"}}])expect(()=>parsePrivateDraft(bad,scope)).toThrow();
});
it("shows saved stage and missing base explicitly in a read-only summary without inventing current policy",()=>{
 const old=renderToStaticMarkup(createElement(DraftContentSummary,{content,kind:"REQ"}));
 expect(old).toContain("Etapa não preservada neste rascunho");
 expect(old).toContain("Sem ficha oficial como base");
 const html=renderToStaticMarkup(createElement(DraftContentSummary,{content,kind:"REQ",navigation:{version:1,stage:"notes"}}));
 expect(html).toContain("Observações");expect(html).toContain("Dados ainda incompletos");
 expect(html).toContain("as regras vigentes serão conferidas na confirmação");
 expect(html).not.toMatch(/<input|<textarea|<select/);
});
