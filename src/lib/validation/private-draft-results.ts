import { z } from "zod";
import { balanceDraftContent,requisitionDraftContent } from "./creation-drafts";
import { draftPurpose,transferDeclarationDraftContent,declarationSourceForPurpose,receiptDraftContent,supplyDraftContent,type DraftPurpose } from "./supply-drafts";
import type { CreationDraft,DraftKind } from "@/types/creation-drafts";
import { draftNavigationSchema } from "./draft-navigation";
import { navigationAllowed } from "../forms/draft-navigation";
type Scope={userId:string;patientId:string;kind:DraftKind|null;targetDocumentId:string|null;purpose:DraftPurpose};
const resultSchema=z.object({id:z.uuid(),revision:z.number().int().positive(),savedAt:z.iso.datetime({offset:true}),state:z.enum(["active","discarded","consumed","completed"]),consumedDocumentId:z.uuid().nullable(),replayed:z.boolean()});
const readSchema=resultSchema.omit({replayed:true}).extend({ownerId:z.uuid(),patientId:z.uuid(),kind:z.enum(["REQ","BAL","COM","ENT"]),purpose:draftPurpose.default("create"),targetDocumentId:z.uuid().nullable(),schemaVersion:z.literal(1),createdAt:z.iso.datetime({offset:true}),contentHash:z.string(),content:z.unknown()});
export function parsePrivateDraft(value:unknown,scope:Scope):CreationDraft|null {
  if(value===null)return null;
  const parsed=readSchema.extend({navigation:draftNavigationSchema.nullable().optional().default(null)}).safeParse(value);
  if(!parsed.success)throw new Error("Não foi possível ler o rascunho privado. Consulte novamente.");
  const row=parsed.data;
  if(row.ownerId!==scope.userId||row.patientId!==scope.patientId||row.kind!==scope.kind||row.purpose!==scope.purpose||row.targetDocumentId!==scope.targetDocumentId)throw new Error("A resposta do rascunho não corresponde ao contexto consultado.");
  const schema=row.kind==="REQ"?requisitionDraftContent:row.kind==="BAL"?balanceDraftContent:declarationSourceForPurpose(row.purpose)?transferDeclarationDraftContent:!["create","revise"].includes(row.purpose)?receiptDraftContent:supplyDraftContent;
  const content=row.state==="active"?schema.safeParse(row.content):null;
  if (row.state === "active" && !navigationAllowed(row.kind,row.purpose,row.navigation,row.content) || row.state !== "active" && row.navigation !== null)
    throw new Error("Não foi possível conferir a etapa do rascunho. Consulte novamente.");
  if(content&&!content.success||row.state!=="active"&&row.content!==null||["consumed","completed"].includes(row.state)!==(row.consumedDocumentId!==null))throw new Error("O rascunho retornou conteúdo ou estado inválido. Consulte novamente.");
  if (content?.success && declarationSourceForPurpose(row.purpose) && (!("fields" in content.data) || content.data.fields.source !== declarationSourceForPurpose(row.purpose) || content.data.divergentIds.length)) throw new Error("A custódia da declaração não corresponde ao preenchimento consultado.");
  return {...row,content:content?.success?content.data:null};
}
export function parsePrivateDraftResult(value:unknown,intent:Record<string,unknown>){
  const parsed=resultSchema.safeParse(value);
  if(!parsed.success)throw new Error("A resposta não confirmou o salvamento. Recupere a mesma tentativa.");
  const row=parsed.data,expected=intent.action==="save"?"active":intent.action==="discard"?"discarded":"completed";
  if(intent.id!==null&&row.id!==intent.id||row.revision!==Number(intent.expectedRevision??0)+1||row.state!==expected||((expected==="completed")!==(row.consumedDocumentId!==null)))throw new Error("A resposta não corresponde à revisão e à intenção enviadas. Recupere a mesma tentativa.");
  return row;
}
