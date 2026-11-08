import { it,expect } from "vitest";
import { composeIssuance,validateIssuanceContent } from "@/lib/server/pdf-content";
import { fidelityEmission,fidelitySourceFacts,legacyFidelitySnapshots } from "./support/pdf-fidelity-fixtures";
const compact=(v:string)=>v.normalize("NFKC").replaceAll(/[^\p{L}\p{N}]/gu,"").toLocaleLowerCase("pt-BR");
it("ENT labels preparation, dispatch and later exemplar generation separately even when all three dates are present",async()=>{
  const source={...structuredClone(legacyFidelitySnapshots.find(s=>s.type==="ENT")!),sourceFacts:{...fidelitySourceFacts,draftCreatedAt:"2026-10-31T12:00:00Z",documentCreatedAt:"2026-11-01T12:00:00Z",issuedAt:"2026-11-02T12:00:00Z"},documentFacts:{schemaVersion:1,deliveryResolutions:[],purchaseReceiptEvents:[]}};
  const plan=await composeIssuance(source,"c".repeat(64),{...fidelityEmission,rendererRevision:7});
  const body=compact(plan.runs.filter(r=>!r.decoration).map(r=>r.text).join(" "));
  for(const pair of ["Primeiro rascunho privado salvo:31/10/2026,09:00","Criação da ficha:01/11/2026,09:00","Emissão operacional registrada:02/11/2026,09:00","Expedição operacional02/11/2026,09:00","Solicitação de geração08/11/2026,06:00"])expect(body,pair).toContain(compact(pair));
  expect(plan.identity.requestedAt).toBe("2026-11-08T09:00:00Z");
  await expect(validateIssuanceContent(plan.bytes,{...plan,semanticFacts:{...plan.semanticFacts,"source/issuedAt":"01/11/2026, 09:00"}})).rejects.toMatchObject({code:"CONTENT_INVALID"});
},30000);
