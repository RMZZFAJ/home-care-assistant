import { it, expect } from "vitest";
import { progressConfirmed, progressPublicationBody, publishProgress, parseProgressOutcome } from "@/lib/validation/document-progress";
import { progressPreparationContentSchema, progressPreparationCommitSchema, parseProgressPreparationConfirmation, parseProgressRecovery } from "@/lib/validation/progress-preparations";
import { progressEventPresentation } from "@/lib/documents/progress-catalog";
const id = "11111111-1111-4111-8111-111111111111", user = "22222222-2222-4222-8222-222222222222", mentioned = "33333333-3333-4333-8333-333333333333";
const content = { category: "record", stage: null, text: "Registro próprio", references: [] } as const;
const packet = publishProgress.parse({ key: id, content, publication: { relevance: "milestone", mentions: [mentioned] } });
const outcome = { key: id, intentHash: "a".repeat(64), recovered: false, note: { id, source: "manual", documentId: id, recordedAt: "2026-11-12T06:00:00Z", authorId: user, authorName: "Autora", ...content, relevance: "milestone", mentions: [{ id: mentioned, name: "Pessoa mencionada", careRole: "professional" }] } };
it("binds relevance and ordered people to official confirmation without expanding private drafts", () => {
 expect(progressConfirmed(outcome, packet, id, user)).toBe(true);
 for (const publication of [{relevance:"attention",mentions:[mentioned]},{relevance:"milestone",mentions:[]}])
  expect(progressConfirmed(outcome, publishProgress.parse({...packet,publication}), id,user)).toBe(false);
 expect(progressConfirmed(outcome,publishProgress.parse({key:id,content}),id,user)).toBe(false);
 expect(progressPublicationBody(packet)).toEqual({...content,publication:packet.publication});
 expect(progressPreparationContentSchema.safeParse({documentType:"REQ",note:{...content,publication:packet.publication}}).success).toBe(false);
 for(const field of [{relevance:"milestone"},{mentions:[]}])
  expect(progressPreparationContentSchema.safeParse({documentType:"REQ",note:{...content,...field}}).success).toBe(false);
 expect(()=>parseProgressOutcome({...outcome,note:{...outcome.note,mentions:undefined}})).toThrow();
 expect(()=>publishProgress.parse({...packet,publication:{...packet.publication,mentions:[mentioned,mentioned]}})).toThrow();
});
it("verifies publication metadata in consumed receipts and read-only uncertain recovery", () => {
 const commit=progressPreparationCommitSchema.parse({...packet,careRecipientId:id,purpose:"progress_note",targetResourceId:id,draftCommit:{id,revision:1}});
 const receipt={patientId:id,purpose:"progress_note",targetResourceId:id,resourceId:id,actorId:user,recordedAt:outcome.note.recordedAt,idempotencyKey:id,documentType:"REQ",command:packet,nativeResult:outcome};
 const confirmation={draft:{id,revision:2,state:"consumed"},receipt,replayed:false};
 expect(parseProgressPreparationConfirmation(confirmation,commit,user).receipt.command.publication).toEqual(packet.publication);
 const common={patientId:id,ownerId:user,targetResourceId:id,key:id,expectedRevision:1,content,publication:packet.publication,current:{id,revision:2,state:"consumed"}};
 expect(parseProgressRecovery({...common,status:"applied",confirmation},commit,user).status).toBe("applied");
 expect(()=>parseProgressRecovery({...common,publication:{relevance:"attention",mentions:[mentioned]},status:"applied",confirmation},commit,user)).toThrow();
 expect(()=>parseProgressPreparationConfirmation({...confirmation,receipt:{...receipt,command:{...packet,publication:{relevance:"normal",mentions:[]}}}},commit,user)).toThrow();
});
it("keeps origin separate from milestone and attention in one shared presentation catalog", () => {
 expect(progressEventPresentation({source:"manual",relevance:"milestone"})).toMatchObject({origin:"Registro manual",relevance:"milestone",label:"Marco importante"});
 expect(progressEventPresentation({source:"automatic",action:"ent.receive"})).toMatchObject({origin:"Fato automático",relevance:"milestone",event:"Recebimento conferido"});
 expect(progressEventPresentation({source:"automatic",action:"com.reject_receipt"})).toMatchObject({origin:"Fato automático",relevance:"attention",label:"Atenção"});
 expect(progressEventPresentation({source:"manual"}).relevance).toBe("normal");
});
