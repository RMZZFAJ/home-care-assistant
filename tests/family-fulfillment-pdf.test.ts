import { it, expect } from "vitest";
import { mkdir, writeFile } from "node:fs/promises";
import { demoDocuments } from "@/lib/demo-documents";
import { currentPdfFixture } from "./support/current-pdf-fixture";
import { fidelityEmission } from "./support/pdf-fidelity-fixtures";
import { composeIssuance, validateIssuanceContent } from "@/lib/server/pdf-content";

it("the approved ENT keeps original sufficiency, smaller physical receipt and the separately authored family review", async()=>{
 const source=currentPdfFixture(structuredClone(Object.values(demoDocuments).find(row=>row.type==="ENT")!));
 source.demo=false;
 source.status="disputed";
 source.workflow={...source.workflow,acceptedAt:"2026-11-13T12:30:00Z",acceptedBy:"30000000-0000-4000-8000-000000000001",receiptName:"Recebedor fictício"};
 source.presentationFacts={schemaVersion:1,documentId:source.id,version:source.version,asOf:"2026-11-13T13:00:00Z",author:{state:"unavailable"},references:[]};
 source.lines=source.lines.slice(0,1).map(line=>({...line,quantity:"4",accepted_quantity:"2",reconciled_quantity:"0",family_fulfillment:"complete",fulfillment_decided_name:"Familiar da expedição",fulfillment_decided_at:"2026-11-13T12:00:00Z"}));
 source.fulfillmentReviews=[{id:"10000000-0000-4000-8000-000000000001",lineId:String(source.lines[0].id),decision:"complete",reason:"A quantidade recebida é suficiente para esta necessidade fictícia.",actorId:"20000000-0000-4000-8000-000000000001",actorName:"Familiar da nova avaliação",recordedAt:"2026-11-13T13:00:00Z",expectedVersion:1,expeditedQuantity:"4",acceptedQuantity:"2"}];
 const plan=await composeIssuance(source,"c".repeat(64),{...fidelityEmission,rendererRevision:16,requestedAt:"2026-11-13T14:00:00Z"});
 expect(plan.semanticFacts?.["familyFulfillment/0"]).toContain("Familiar da expedição");
 const review=plan.semanticFacts?.["familyReview/"+source.fulfillmentReviews[0].id];
 expect(review).toContain("Familiar da nova avaliação");expect(review).toContain("2 recebido de 4 expedido");
 expect(review).toContain("não altera o recebimento ou o estoque");
 expect(plan.semanticFacts?.["material/0/expedited"]).toContain("4");
 expect(plan.semanticFacts?.["material/0/received"]).toContain("2");
 expect(plan.semanticFacts?.["material/0/open"]).toContain("2");
 expect((await validateIssuanceContent(plan.bytes,plan)).passed).toBe(true);
 await mkdir("output/pdf/l1-review",{recursive:true});await writeFile("output/pdf/l1-review/family-reevaluation.pdf",plan.bytes);
},30000);
