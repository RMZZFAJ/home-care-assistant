import { it, expect } from "vitest";
import { createHash } from "node:crypto";
import { composeIssuance, validateIssuanceContent } from "@/lib/server/pdf-content";
import { regularizationSnapshot, regularizationId } from "./support/pdf-regularization-fixtures";
import { fidelityEmission } from "./support/pdf-fidelity-fixtures";

it("preserves the published V7 regularization bytes before adding technical facts", async()=>{
  const plan=await composeIssuance(regularizationSnapshot(),"c".repeat(64),{...fidelityEmission,rendererRevision:7});
  const runs=plan.runs.map(r=>r.text).join(" ");
  expect(runs).not.toContain(regularizationId(4));
  expect(runs).not.toContain("Estado anterior da ficha");
  expect(runs).not.toContain("Conciliação após este procedimento");
  expect(createHash("sha256").update(plan.bytes).digest("hex")).toBe("ce53b0422c5bf0ccfe27ae445d4d817d755447598a1b33468475cbf42fc06caa");
},30000);

const emission = { ...fidelityEmission, rendererRevision: 8 as const };
const prefix = `fidelity/regularization/${regularizationId(2)}`;
it("V8 identifies the original receipt, proposer, independent decider and transactional executor alongside before/after quantities", async()=>{
  const source=regularizationSnapshot(),plan=await composeIssuance(source,"c".repeat(64),emission);
  const facts=plan.semanticFacts!;
  expect(facts[prefix+"/proposer"]).toContain(regularizationId(4));
  expect(facts[prefix+"/reviewer"]).toContain(regularizationId(5));
  expect(facts[prefix+"/receipt"]).toBe(regularizationId(9));
  expect(facts[prefix+"/executor"]).toBe(facts[prefix+"/decision"]);
  expect(facts[prefix+"/before"]).toContain("v2");
  expect(facts[prefix+"/after"]).toBe("Encerramento administrativo aprovado · v4");
  expect(facts[prefix+`/${regularizationId(1)}/before`]).toBe("0 unidade · 3 unidade");
  expect(facts[prefix+`/${regularizationId(1)}/after`]).toBe("2 unidade · 1 unidade");
  const extracted=plan.runs.map(r=>r.text).join(" ");
  for(const fact of [regularizationId(21),regularizationId(22),"Situação física desconhecida", "Recebimento pessoal original preservado", "Decisão independente limita os efeitos às duas unidades apuradas"])expect(extracted).toContain(fact);
  expect(source.lines[0].accepted_quantity).toBe("2");
},30000);

it("pending, rejected and withdrawn proposals never present their suggested quantities as executed stock",async()=>{
  for(const state of ["pending","rejected","withdrawn","obsolete"] as const){
    const source=regularizationSnapshot(),item=source.deliveryRegularization!.cases[0];
    item.state=state;
    if(state==="pending")item.decision=null;
    else item.decision!.lines=[];
    item.proposal.lines[0].movementIds=[];
    const plan=await composeIssuance(source,"c".repeat(64),emission);
    expect(plan.semanticFacts![prefix+`/${regularizationId(1)}/after`]).toBe("0 unidade · 3 unidade");
    expect(plan.semanticFacts![prefix+"/executor"]).toBe("Sem movimentação de estoque identificada neste procedimento");
    expect(plan.runs.map(r=>r.text).join(" ")).not.toContain("Efeitos administrativos abaixo não alteram");
  }
},30000);

it("an approved unknown physical outcome preserves transit without inventing an executor or a personal receipt",async()=>{
  const source=regularizationSnapshot(),item=source.deliveryRegularization!.cases[0],line=item.proposal.lines[0];
  Object.assign(line,{receivedQuantity:"0",returnedQuantity:"0",missingQuantity:"0",unknownQuantity:"3",movementIds:[]});
  item.proposal.unknownQuantity="3";
  item.before_snapshot.acceptedBy=null;item.before_snapshot.acceptedAt=null;item.before_snapshot.receiptName=null;
  const plan=await composeIssuance(source,"c".repeat(64),emission);
  expect(plan.semanticFacts![prefix+`/${regularizationId(1)}/after`]).toBe("0 unidade · 3 unidade");
  expect(plan.semanticFacts![prefix+"/receipt"]).toBe("Sem aceite pessoal declarado");
  expect(plan.semanticFacts![prefix+"/executor"]).toBe("Sem movimentação de estoque identificada neste procedimento");
},30000);

it("keeps the final line of long technical evidence and refuses a fact moved to an unrelated semantic region",async()=>{
  const source=regularizationSnapshot(),item=source.deliveryRegularization!.cases[0];
  item.proposal.basis="Ressalva preservada da conferência. ".repeat(45)+"FIM DA BASE FÍSICA";
  const plan=await composeIssuance(source,"c".repeat(64),emission);
  expect(plan.runs.map(r=>r.text).join(" ")).toContain("FIM DA BASE FÍSICA");
  expect(Math.max(...plan.runs.map(r=>r.page))).toBeGreaterThan(0);
  await expect(validateIssuanceContent(plan.bytes,{...plan,runs:plan.runs.map(r=>r.factGroup===prefix+"/proposer"?{...r,factGroup:prefix+"/reviewer"}:r)})).rejects.toMatchObject({code:"CONTENT_INVALID"});
  await expect(validateIssuanceContent(plan.bytes,{...plan,semanticFacts:{...plan.semanticFacts,[prefix+`/${regularizationId(1)}/after`]:"3 unidade · 0 unidade"}})).rejects.toMatchObject({code:"CONTENT_INVALID"});
},30000);
