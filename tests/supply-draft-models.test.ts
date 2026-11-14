import { expect,it } from "vitest";
import { creationDraftCommandSchema } from "@/lib/validation/creation-drafts";
import { supplyDraftContent,receiptDraftContent } from "@/lib/validation/supply-drafts";
import { parsePrivateDraft,parsePrivateDraftResult } from "@/lib/validation/private-draft-results";
import { requireSupplyConfirmation } from "@/lib/validation/supply-confirmation";
const id="10000000-0000-4000-8000-000000000001",other="10000000-0000-4000-8000-000000000002";
const content={form:{quantities:{material:"1,"},notes:"Preenchimento incompleto",origin:"" as const,source:"FAMILY" as const,recipientId:"" as const},links:{},materials:[{id:"material",name:"Material fictício",unit:"unidade",quantityDecimals:2}],context:{documentId:null,documentVersion:null,requisitionId:null,recipientName:""}};
it("preserves an incomplete exact decimal in private COM/ENT without converting it to an official quantity",()=>{
 expect(supplyDraftContent.parse(content).form.quantities.material).toBe("1,");
 const base={careRecipientId:id,targetDocumentId:null,id:null,expectedRevision:null,idempotencyKey:other,kind:"COM",purpose:"create",action:"save",content};
 expect(creationDraftCommandSchema.safeParse(base).success).toBe(true);
 expect(creationDraftCommandSchema.safeParse({...base,purpose:"revise"}).success).toBe(false);
 expect(creationDraftCommandSchema.safeParse({...base,targetDocumentId:other}).success).toBe(false);
 expect(creationDraftCommandSchema.safeParse({...base,content:{...content,form:{...content.form,notes:"x".repeat(3001)}}}).success).toBe(false);
});
it("keeps receipt drafts contextual and bounded without treating a blank receipt as acceptance",()=>{
 const receipt={documentVersion:2,fields:{[id]:"",reason:""},divergentIds:[id],materials:content.materials};
 expect(receiptDraftContent.parse(receipt).fields[id]).toBe("");
 const args={careRecipientId:id,targetDocumentId:other,id:null,expectedRevision:null,idempotencyKey:id,kind:"ENT",purpose:"divergence",action:"save",content:receipt};
 expect(creationDraftCommandSchema.safeParse(args).success).toBe(true);
 expect(creationDraftCommandSchema.safeParse({...args,targetDocumentId:null}).success).toBe(false);
 expect(creationDraftCommandSchema.safeParse({...args,kind:"COM"}).success).toBe(false);
});
it("never offers another owner, patient, purpose or target as the user's recoverable private draft",()=>{
 const scope={userId:id,patientId:id,kind:"COM" as const,purpose:"create" as const,targetDocumentId:null},row={id,ownerId:id,patientId:id,kind:"COM",purpose:"create",targetDocumentId:null,schemaVersion:1,revision:1,state:"active",createdAt:"2026-11-07T00:00:00Z",savedAt:"2026-11-07T00:00:00Z",contentHash:"hash",content,consumedDocumentId:null};
 expect(parsePrivateDraft(row,scope)?.content).toEqual(content);
 for(const change of [{ownerId:other},{patientId:other},{purpose:"revise"},{targetDocumentId:other},{content:null},{state:"consumed",consumedDocumentId:null}])expect(()=>parsePrivateDraft({...row,...change},scope)).toThrow();
 expect(parsePrivateDraft(null,scope)).toBe(null);expect(()=>parsePrivateDraft(undefined,scope)).toThrow();
});
it("requires the private response to confirm this command and exact next revision",()=>{
 const intent={id,expectedRevision:2,action:"save"},row={id,revision:3,savedAt:"2026-11-07T00:00:00Z",state:"active",consumedDocumentId:null,replayed:false};
 expect(parsePrivateDraftResult(row,intent).revision).toBe(3);
 for(const change of [{id:other},{revision:2},{state:"discarded"},{state:"consumed",consumedDocumentId:other}])expect(()=>parsePrivateDraftResult({...row,...change},intent)).toThrow("Recupere");
});
it("does not call an arbitrary200 an emitted supply document or a confirmation for another patient",()=>{
 const data={id,care_recipient_id:id,type:"COM",version:2,status:"submitted",payload:{origin:"purchase"},lines:[{id,product_id:"material",name_snapshot:"Material fictício",unit_snapshot:"unidade",quantity:"2"}],events:[]};
 expect(requireSupplyConfirmation({data,persistence:"confirmed"},{patientId:id,type:"COM",id,minimumVersion:2}).id).toBe(id);
 for(const value of [{data},{data:{...data,id:other},persistence:"confirmed"},{data:{...data,care_recipient_id:other},persistence:"confirmed"},{data:{...data,version:1},persistence:"confirmed"},{data:{...data,lines:[]},persistence:"confirmed"}])expect(()=>requireSupplyConfirmation(value,{patientId:id,type:"COM",id,minimumVersion:2})).toThrow();
});
