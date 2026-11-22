import { it, expect } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { PDF } from "@libpdf/core";
import { PDFDocument, PDFHexString, PDFName } from "pdf-lib";
import { composeIssuance, validateIssuanceContent } from "@/lib/server/pdf-content";
import { pdfDocumentOptionsSchema, requirePdfDocumentExpansion, type PdfDocumentExpansion } from "@/lib/documents/pdf-modes";
import { modeSource, modeEmission, modeId } from "./support/pdf-mode-fixtures";
const compact=(value:string)=>value.normalize("NFKC").replaceAll(/\s/g,"");
const text=async(bytes:Uint8Array)=>(await PDF.load(bytes)).extractText().map(page=>page.lines.flatMap(line=>line.spans.flatMap(span=>span.chars.map(char=>char.char))).join(""));
it("rejects incomplete, duplicate, foreign and out-of-period sources without reducing the mandatory base",()=>{
 const source=modeSource("REQ"),expansion=source.documentExpansion as PdfDocumentExpansion;
 expect(requirePdfDocumentExpansion(expansion,{...source,requestedAt:modeEmission.requestedAt}).documentId).toBe(source.id);
 for(const changed of [{...expansion,access:null},{...expansion,documentId:modeId(90)},{...expansion,progress:[...expansion.progress!,expansion.progress![0]]},{...expansion,referenceAt:"2026-11-01T00:00:00Z"},{...expansion,options:{...expansion.options,period:{...expansion.options.period,from:"2000-01-01",through:"2000-01-02"}}}])
  expect(()=>requirePdfDocumentExpansion(changed,{...source,requestedAt:modeEmission.requestedAt})).toThrow();
 for(const options of [{...expansion.options,sections:[]},{...expansion.options,period:{...expansion.options.period,from:"2026-11-01"}},{...expansion.options,mode:"audit",purpose:null},{...expansion.options,period:{...expansion.options.period,from:"2026-02-31",through:"2026-03-01"}},{...expansion.options,snapshot:source}])
  expect(pdfDocumentOptionsSchema.safeParse(options).success).toBe(false);
 expect(pdfDocumentOptionsSchema.parse({...expansion.options,sections:[...expansion.options.sections].reverse()}).sections).toEqual(expansion.options.sections);
});
it("composes all four expanded models with original facts, structured chronology and only selected source data",async()=>{
 mkdirSync("output/pdf/approved",{recursive:true});
 for(const type of ["REQ","COM","ENT","BAL"] as const){
  const source=modeSource(type),before=JSON.stringify(source),plan=await composeIssuance(source,"a".repeat(64),modeEmission),all=compact((await text(plan.bytes)).join(""));
  expect(JSON.stringify(source)).toBe(before);
  for(const required of ["Ficha Ampliada","Complementos desta ficha","Marco importante","Atenção","Registro manual","Fato automático","Pessoa mencionada sem se tornar autora","Pessoa destinatária da comunicação","Pessoa do acesso relatado","Fim do registro 1","Não ICP-Brasil"])
   expect(all,required).toContain(compact(required));
  expect(all).not.toContain(compact("Auditoria restrita"));
  const pdf=await PDFDocument.load(plan.bytes,{updateMetadata:false});expect(JSON.parse(pdf.catalog.lookup(PDFName.of("HCAIssuance"),PDFHexString).decodeText())).toEqual({verificationCode:modeEmission.verificationCode,requestedAt:modeEmission.requestedAt});
  writeFileSync("output/pdf/approved/"+type.toLowerCase()+"-expanded-controlled.pdf",plan.bytes);
  const key="expansion/progress/1/text";
  await expect(validateIssuanceContent(plan.bytes,{...plan,semanticFacts:{...plan.semanticFacts,[key]:"Outro texto não preservado no exemplar"}})).rejects.toMatchObject({code:"CONTENT_INVALID"});
 }
},60000);
it("audit identification appears on every page and long selected records retain their final content",async()=>{
 const source=modeSource("REQ","audit",24),plan=await composeIssuance(source,"a".repeat(64),modeEmission),pages=await text(plan.bytes);
 expect(pages.length).toBeGreaterThan(3);expect(compact(pages.join(""))).toContain(compact("Fim do registro 23"));
 expect(compact(pages.join(""))).toContain(compact("Andamento manual publicado"));
 expect(plan.auditWatermark).toContain(modeEmission.requestedName);
 await expect(validateIssuanceContent(plan.bytes,{...plan,auditWatermark:plan.auditWatermark!.replace(modeEmission.requestedName,"Nome indevidamente substituído")})).rejects.toMatchObject({code:"CONTENT_INVALID"});
 const pdf=await PDFDocument.load(plan.bytes,{updateMetadata:false});pdf.removePage(pdf.getPageCount()-1);
 await expect(validateIssuanceContent(await pdf.save({useObjectStreams:false}),plan)).rejects.toMatchObject({code:"CONTENT_INVALID"});
 writeFileSync("output/pdf/approved/audit-controlled.pdf",plan.bytes);
},60000);

it("preserves consecutive identical glyphs in the audit identity on every page",async()=>{
 const source=modeSource("REQ","audit",24),emission={...modeEmission,verificationCode:"A".repeat(32),requestedName:"Anna Ana Ann"};
 const plan=await composeIssuance(source,"a".repeat(64),emission);
 expect(plan.auditWatermark).toContain("HCA-"+"A".repeat(32));
 await expect(validateIssuanceContent(plan.bytes,{...plan,auditWatermark:plan.auditWatermark!.replace("HCA-"+"A".repeat(32),"HCA-"+"A".repeat(31))})).rejects.toMatchObject({code:"CONTENT_INVALID"});
},60000);
