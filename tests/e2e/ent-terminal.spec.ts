import { selectDocumentSection } from "./document-sections";
import { expect,test,type Page,type APIResponse } from "@playwright/test";
import { createHash,randomUUID } from "node:crypto";
import { mkdirSync,readFileSync,writeFileSync } from "node:fs";
import { PDF } from "@libpdf/core";
import { PDFDocument,PDFName,PDFHexString } from "pdf-lib";
import { entTerminalFixture,terminalLedger } from "../integration/ent-terminal-fixtures.mjs";
import { fixtures,rpc } from "../integration/v4-fixtures.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { sql,sqlLiteral } from "../../scripts/test-environment.mjs";
import { generatedPdf } from "./generated-pdf";
import { selectContext } from "./auth-context";
test.setTimeout(180000);
const root="output/pdf/phase-d/ent-terminal";
const digest=(data:Uint8Array|string)=>createHash("sha256").update(data).digest("hex");
type Fixture=Awaited<ReturnType<typeof entTerminalFixture>>;
let corpus:unknown[]=[];
test.beforeEach(()=>{corpus=[];});
test.afterEach(({browserName},info)=>{
 if(!corpus.length||info.project.name!=="chromium")return;
 mkdirSync(root,{recursive:true});writeFileSync(`${root}/${info.status==="passed"?"CORPUS":"FAILED"}-${browserName}-${randomUUID()}.json`,JSON.stringify(corpus,null,2)+"\n",{flag:"wx"});
});
async function login(page:Page,patient:string){
 await page.goto("/login");await page.getByLabel("E-mail",{exact:true}).fill(fixtures.family.email);await page.getByLabel("Senha",{exact:true}).fill(fixturePassword);await page.getByRole("button",{name:"Entrar",exact:true}).click();await expect(page.getByRole("heading",{name:"Visão geral",exact:true})).toBeVisible();await selectContext(page,patient);
}
async function inspect(page:Page,f:Fixture,label:string,response:APIResponse,revision=10){
 expect(response.status(),response.status()===200?label:(await response.text()).slice(0,100)).toBe(200);
 const bytes=await response.body(),pdf=await PDFDocument.load(bytes,{updateMetadata:false});
 const identity=JSON.parse(pdf.catalog.lookup(PDFName.of("HCAIssuance"),PDFHexString).decodeText());expect(identity.rendererRevision).toBe(revision);
 const frozen=await rpc(f.owner,"pdf_issuance",{p_id:identity.id});
 expect(frozen).toMatchObject({state:"ready",sha256:digest(bytes),validation:{accepted:true,profile:"PAdES-B-T",wholeFile:true,signerTrust:"internal",timestampTrust:"internal"}});
 const text=(await PDF.load(bytes)).extractText().flatMap(p=>p.lines.map(l=>l.spans.flatMap(s=>s.chars.map(c=>c.char)).join(""))).join(" ");
 if(revision>=9){
  expect(text).not.toContain("A pessoa designada deve conferir");expect(text).not.toContain("Aguardando conferência");
  if(frozen.representation==="derived")expect(text).toContain("Esta representação descreve uma versão preservada");
  else expect(text).toContain(f.kind==="cancelled"?"Documento cancelado. Este exemplar não solicita novo recebimento":"Encerramento administrativo não substitui aceite pessoal");
  if(frozen.snapshot.workflow.acceptedAt)expect(text).toContain("Conferência pessoal preservada em");
 }else expect(text).toContain("A pessoa designada deve conferir");
 const same=await page.request.get(`/api/documents/${f.doc.id}/pdf?issuance=${identity.id}`);expect(same.status()).toBe(200);expect((await same.body()).equals(bytes)).toBe(true);
 expect(frozen.sourceHash).toBe(sql(`select content_hash from public.document_events where document_id=${sqlLiteral(f.doc.id)} and version=${identity.version};`));
 if(test.info().project.name==="chromium"){
  mkdirSync(root,{recursive:true});const trustFile=process.env.HCA_PDF_TRUST_POLICY_FILE;if(!trustFile)throw new Error("Guarded test trust fixture required");
  const pem=JSON.parse(readFileSync(trustFile,"utf8")).roots[0].pem,publicRoot=`root-${digest(pem).slice(0,16)}.crt`,file=`${label}-${identity.id}.pdf`;
  writeFileSync(`${root}/${publicRoot}`,pem);writeFileSync(`${root}/${file}`,bytes,{flag:"wx"});
  corpus.push({label,file,publicRoot,identity,sha256:digest(bytes),sourceHash:frozen.sourceHash,code:frozen.snapshot.code,sourceStatus:frozen.snapshot.status,sourceAcceptedAt:frozen.snapshot.workflow.acceptedAt??null,sourceAcceptedBy:frozen.snapshot.workflow.acceptedBy??null,sourceFacts:frozen.snapshot.sourceFacts,representation:frozen.representation,sourceLines:frozen.snapshot.lines,legacyIncorrectInstructionPreserved:revision<9});
 }
 return {identity,bytes,frozen};
}
for(const options of [{kind:"cancelled",personal:false},{kind:"administrative",personal:false},{kind:"administrative",personal:true}])test(`ENT ${options.kind} personal=${options.personal} não reativa recebimento no PDF nem em representação anterior`,async({page},info)=>{
 const f=await entTerminalFixture(options),before=terminalLedger(f.patient);
 let legacyKey:string|null=null;
 if(info.project.name==="chromium"&&options.kind==="administrative"&&!options.personal){legacyKey=randomUUID();await rpc(f.owner,"reserve_pdf_issuance_v8",{p_document:f.doc.id,p_version:f.doc.version,p_key:legacyKey});}
 await login(page,f.patient);await page.goto(`/historico/${f.doc.id}`);
  await selectDocumentSection(page, "files");
 const current=await inspect(page,f,`${options.kind}-${options.personal}-current`,await generatedPdf(page,`/api/documents/${f.doc.id}/pdf?version=${f.doc.version}`));
 await inspect(page,f,`${options.kind}-${options.personal}-prior`,await generatedPdf(page,`/api/documents/${f.doc.id}/pdf?version=${f.original.version}`));
 if(legacyKey){
  const response=await page.request.post(`/api/documents/${f.doc.id}/issuances`,{data:{version:f.doc.version,idempotencyKey:legacyKey}});expect(response.status()).toBe(200);const row=await response.json();expect(row.rendererRevision).toBe(8);
  await inspect(page,f,"legacy-v8-recovered",await page.request.get(`/api/documents/${f.doc.id}/pdf?issuance=${row.id}`),8);
  await page.reload();await expect(page.getByRole("region",{name:"Arquivos gerados",exact:true}).getByRole("note")).toContainText("Este arquivo preserva orientações de uma emissão anterior");
 }
 const read=await page.request.get(`/api/documents/${f.doc.id}`);expect((await read.json()).data.workflow_data.acceptedBy??null).toBe(f.doc.workflow_data.acceptedBy??null);
 expect(terminalLedger(f.patient)).toBe(before);
 expect(sql(`select accepted_quantity::text from public.document_lines where id=${sqlLiteral(f.doc.lines[0].id)};`)).toMatch(options.personal?/^2(?:\.0+)?$/:/^0(?:\.0+)?$/);
 expect((await page.request.get(`/api/documents/${f.doc.id}/pdf?issuance=${current.identity.id}`)).status()).toBe(200);
});
