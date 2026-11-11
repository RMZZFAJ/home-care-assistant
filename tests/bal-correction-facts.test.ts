import { expect,it } from "vitest";
import { mkdirSync,writeFileSync } from "node:fs";
import { PDF } from "@libpdf/core";
import { balanceCorrectionFacts } from "@/lib/validation/balance-corrections";
import { composeIssuance,validateIssuanceContent } from "@/lib/server/pdf-content";
import { fidelityEmission,legacyFidelitySnapshots } from "./support/pdf-fidelity-fixtures";
const id=(n:number)=>"61000000-0000-4000-8000-"+String(n).padStart(12,"0");
const stamp="2026-11-11T12:00:00Z";
function sourceFixture(){
 const s=structuredClone(legacyFidelitySnapshots.find(row=>row.type==="BAL")!);
 s.id=id(1);s.version=5;s.workflow={countVersion:2,reviewPolicy:{balReview:"required",balRequirement:"any",balApprovers:["family"]}};
 s.documentFacts={schemaVersion:1,deliveryResolutions:[],purchaseReceiptEvents:[]};
 s.lines=[{id:id(20),product_id:id(11),name_snapshot:"Nome no reconto",unit_snapshot:"un",quantity:"2",metadata:{expectedQuantity:"1"}}];
 const counter={id:id(2),name:"Contadora preservada",source:"count_event",recordedAt:stamp};
 s.balanceReviews={counter,countVersion:2,notes:"Reconto próprio.",legacyApprovals:[],reviews:[{id:id(3),count_version:1,counter_id:id(2),reviewer_id:id(4),reviewer_name:"Revisora preservada",review_group:"family",recorded_at:stamp,comment:"Diferença na primeira contagem.",reviewed_document_version:1,reference_state:"current",item_results:[{lineId:id(10),result:"difference",forwarding:"recount",comment:"Verificar em ato próprio."}],reviewed_snapshot:{counter,notes:"Contagem original preservada.",countVersion:1,lines:[{id:id(10),name_snapshot:"Nome histórico original",unit_snapshot:"un",quantity:"1"}],referenceRevision:"0",currentRevision:"0",appliedBeforeReview:false,opinionOnly:true}}]};
 const application={state:"applied",id:id(30),countVersion:2,documentVersion:5,actorId:id(4),actorName:"Aplicadora preservada",appliedAt:stamp,lines:[{lineId:id(20),state:"known",quantity:"2"}]};
 s.balanceApplication=application;
 s.balanceReviewCorrections=[{reviewId:id(3),sourceLineId:id(10),sourceState:"known",acts:[{eventId:id(40),documentId:id(1),version:3,countVersion:2,actorId:id(2),actorName:"Contadora preservada",recordedAt:stamp,line:{id:id(20),name:"Nome no reconto",unit:"un",quantity:"2"},application}]}];
 return s;
}
const compact=(s:string)=>s.normalize("NFKC").replaceAll(/\s/g,"");
it("V12 paints the native correction, authors and application while preserving the original reviewed count",async()=>{
 const source=sourceFixture(),emission={...fidelityEmission,rendererRevision:12 as const};
 const plan=await composeIssuance(source,"a".repeat(64),emission);
 const text=compact((await PDF.load(plan.bytes)).extractText().flatMap(p=>p.lines.map(l=>l.spans.flatMap(s=>s.chars.map(c=>c.char)).join(""))).join(" "));
 for(const expected of ["Nome histórico original: contado 1 un","Atos posteriores","Nome no reconto","Reconto 2","versão 3","Contadora preservada","Aplicadora preservada","versão 5","Saldo após a aplicação deste reconto","não substituem o Contado"] )expect(text).toContain(compact(expected));
 expect(Object.keys(plan.semanticFacts??{}).filter(k=>k.startsWith("fidelity/correction/"))).toHaveLength(5);
 const masked=sourceFixture(),entries=balanceCorrectionFacts.parse(masked.balanceReviewCorrections);
 if(entries[0].acts[0].application.state!=="applied")throw Error("fixture application");
 entries[0].acts[0].application.lines=[{lineId:id(20),state:"restricted",quantity:null}];masked.balanceReviewCorrections=entries;
 const other=await composeIssuance(masked,"a".repeat(64),emission);
 expect(other.semanticFacts?.["fidelity/correction/"+id(3)+"/"+id(10)+"/"+id(40)+"/after"]).toBe("Acesso restrito");
 await expect(validateIssuanceContent(plan.bytes,other)).rejects.toMatchObject({code:"CONTENT_INVALID"});
 mkdirSync("output/pdf",{recursive:true});writeFileSync("output/pdf/bal-correction-links-controlled.pdf",plan.bytes);
},30000);
it("rejects absent, orphan, foreign, future and contradictory correction facts instead of implying completion",async()=>{
 const source=sourceFixture(),entry=balanceCorrectionFacts.parse(source.balanceReviewCorrections)[0],act=entry.acts[0];
 const alternatives=[[],[{...entry,reviewId:id(99)}],[{...entry,acts:[{...act,documentId:id(99)}]}],[{...entry,acts:[{...act,version:6}]}],[{...entry,acts:[{...act,countVersion:1}]}],[{...entry,sourceState:"unavailable",acts:[act]}],[{...entry,acts:[act,act]}]];
 for(const balanceReviewCorrections of alternatives)await expect(composeIssuance({...source,balanceReviewCorrections},"a".repeat(64),{...fidelityEmission,rendererRevision:12})).rejects.toMatchObject({code:"CONTENT_INVALID"});
 const missing={...source};delete missing.balanceReviewCorrections;
 await expect(composeIssuance(missing,"a".repeat(64),{...fidelityEmission,rendererRevision:12})).rejects.toMatchObject({code:"CONTENT_INVALID"});
});
it("keeps V11 bytes independent of new correction facts",async()=>{
 const source=sourceFixture(),emission={...fidelityEmission,rendererRevision:11 as const};
 const before=await composeIssuance(source,"a".repeat(64),emission);delete source.balanceReviewCorrections;
 const after=await composeIssuance(source,"a".repeat(64),emission);
 expect(after.bytes.equals(before.bytes)).toBe(true);
});
