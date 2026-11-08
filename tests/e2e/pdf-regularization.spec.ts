import { expect,test,type Page,type APIResponse } from "@playwright/test";
import { createHash,randomUUID } from "node:crypto";
import { mkdirSync,readFileSync,writeFileSync } from "node:fs";
import { PDF } from "@libpdf/core";
import { PDFDocument,PDFName,PDFHexString } from "pdf-lib";
import { regularizationPdfFixture,regularizationLedger } from "../integration/pdf-regularization-fixtures.mjs";
import { fixtures,rpc } from "../integration/v4-fixtures.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { sql,sqlLiteral } from "../../scripts/test-environment.mjs";
import { generatedPdf } from "./generated-pdf";
import { selectContext } from "./auth-context";
test.setTimeout(180000);
type Fixture=Awaited<ReturnType<typeof regularizationPdfFixture>>;
const root="output/pdf/phase-d/regularization-technical";
const digest=(data:Uint8Array|string)=>createHash("sha256").update(data).digest("hex");
const compact=(text:string)=>text.normalize("NFKC").replaceAll(/\s/g,"").toLocaleLowerCase("pt-BR");
let corpus:unknown[]=[];
test.beforeEach(()=>{corpus=[];});
test.afterEach(({browserName},info)=>{
  if(!corpus.length)return;
  mkdirSync(root,{recursive:true});
  writeFileSync(`${root}/${info.status==="passed"?"CORPUS":"FAILED"}-${info.project.name}-${browserName}-${randomUUID()}.json`,JSON.stringify(corpus,null,2)+"\n",{flag:"wx"});
});
async function login(page:Page,patient:string){
  await page.goto("/login");await page.getByLabel("E-mail",{exact:true}).fill(fixtures.family.email);await page.getByLabel("Senha",{exact:true}).fill(fixturePassword);await page.getByRole("button",{name:"Entrar",exact:true}).click();await expect(page.getByRole("heading",{name:"Visão geral",exact:true})).toBeVisible();await selectContext(page,patient);
}
async function inspect(page:Page,f:Fixture,label:string,response:APIResponse,revision:number){
  expect(response.status(),response.status()===200?label:(await response.text()).slice(0,160)).toBe(200);
  const bytes=await response.body(),parsed=await PDFDocument.load(bytes,{updateMetadata:false});
  const identity=JSON.parse(parsed.catalog.lookup(PDFName.of("HCAIssuance"),PDFHexString).decodeText());
  expect(identity.rendererRevision).toBe(revision);
  const frozen=await rpc(f.owner,"pdf_issuance",{p_id:identity.id});
  expect(frozen).toMatchObject({state:"ready",sha256:digest(bytes),validation:{accepted:true,profile:"PAdES-B-T",wholeFile:true,signerTrust:"internal",timestampTrust:"internal"}});
  const text=compact((await PDF.load(bytes)).extractText().flatMap(p=>p.lines.map(l=>l.spans.flatMap(s=>s.chars.map(c=>c.char)).join(""))).join(" "));
  const item=frozen.snapshot.deliveryRegularization?.cases?.[0];
  if(revision>=8&&item){
    for(const fact of [item.id,item.proposed_by,item.reviewer_id,item.before_snapshot.acceptedBy,item.proposal.reason,item.proposal.basis,"Estado anterior da ficha","Conciliação após este procedimento e trânsito restante"].filter(Boolean))expect(text,label+": "+fact).toContain(compact(fact));
    if(item.decision)for(const fact of [item.decision.actorId,item.decision.reason,...item.decision.lines.flatMap((l:{movementIds:string[]})=>l.movementIds)])expect(text,label+": "+fact).toContain(compact(fact));
  }
  const again=await page.request.get(`/api/documents/${f.doc.id}/pdf?issuance=${identity.id}`);
  expect(again.status()).toBe(200);expect((await again.body()).equals(bytes)).toBe(true);
  expect(frozen.sourceHash).toBe(sql(`select content_hash from public.document_events where document_id=${sqlLiteral(f.doc.id)} and version=${identity.version};`));
  mkdirSync(root,{recursive:true});
  const trustFile=process.env.HCA_PDF_TRUST_POLICY_FILE;if(!trustFile)throw new Error("The guarded runner must provide the internal test root");
  const pem=JSON.parse(readFileSync(trustFile,"utf8")).roots[0].pem,publicRoot=`root-${digest(pem).slice(0,16)}.crt`;
  writeFileSync(`${root}/${publicRoot}`,pem);
  const file=`${label}-${identity.id}.pdf`;writeFileSync(`${root}/${file}`,bytes,{flag:"wx"});
  const movements=JSON.parse(sql(`select coalesce(jsonb_agg(to_jsonb(m) order by movement_revision),'[]') from public.stock_movements m where reference_type='delivery_regularization' and reference_id=${sqlLiteral(f.item.id)};`));
  const after=JSON.parse(sql(`select to_jsonb(l) from public.document_lines l where id=${sqlLiteral(f.doc.lines[0].id)};`));
  corpus.push({label,file,publicRoot,sha256:digest(bytes),identity,sourceFacts:frozen.snapshot.sourceFacts,caseFacts:item??null,lineAfter:after,movements,originalAcceptedBy:fixtures.professional.id,sourceHash:frozen.sourceHash});
  return {bytes,identity,frozen};
}

test("ENT regularizada gera PDF técnico pela interface, recupera V7 e preserva o estoque e o aceite original",async({page,browser})=>{
  const f=await regularizationPdfFixture(),before=regularizationLedger(f.patient),key=randomUUID();
  const old=await rpc(f.owner,"reserve_pdf_issuance_v7",{p_document:f.doc.id,p_version:f.doc.version,p_key:key});
  await login(page,f.patient);await page.goto(`/historico/${f.doc.id}`);
  const files=page.getByRole("region",{name:"Arquivos gerados",exact:true});
  const existing=await page.request.get(`/api/documents/${f.doc.id}/issuances`);expect((await existing.json()).data).toHaveLength(1);
  await files.getByRole("button",{name:"Gerar PDF",exact:true}).click();
  await expect(files.getByRole("link",{name:"Baixar PDF",exact:true})).toHaveCount(1);
  const link=await files.getByRole("link",{name:"Baixar PDF",exact:true}).getAttribute("href");expect(link).toBeTruthy();
  const current=await inspect(page,f,"approved-current",await page.request.get(link!),9);
  expect(current.identity.id).not.toBe(old.id);
  const recovery=await page.request.post(`/api/documents/${f.doc.id}/issuances`,{data:{version:f.doc.version,idempotencyKey:key}});
  expect(recovery.status()).toBe(200);expect((await recovery.json()).id).toBe(old.id);
  await inspect(page,f,"old-v7-recovered",await page.request.get(`/api/documents/${f.doc.id}/pdf?issuance=${old.id}`),7);
  await inspect(page,f,"original-before-proposal",await generatedPdf(page,`/api/documents/${f.doc.id}/pdf?version=${f.original.version}`),9);
  await inspect(page,f,"proposal-before-decision",await generatedPdf(page,`/api/documents/${f.doc.id}/pdf?version=${f.proposed.version}`),9);
  expect(regularizationLedger(f.patient)).toBe(before);
  expect(sql(`select accepted_quantity::text from public.document_lines where id=${sqlLiteral(f.doc.lines[0].id)};`)).toMatch(/^2(?:\.0+)?$/);
  expect(sql(`select workflow_data->>'acceptedBy' from public.operational_documents where id=${sqlLiteral(f.doc.id)};`)).toBe(fixtures.professional.id);
  await page.reload();await expect(files.getByRole("link",{name:"Baixar PDF",exact:true})).toHaveCount(4);
  expect((await page.request.get(`/api/documents/${f.doc.id}/pdf?issuance=${current.identity.id}`)).status()).toBe(200);
  const guest=await browser.newContext();
  try{
    const endpoint=new URL(`/api/verification?code=${current.frozen.verificationCode}`,page.url()).href;
    const reference=await guest.request.get(endpoint);expect(reference.status()).toBe(200);
    expect((await reference.json()).reference).toMatchObject({found:true,issuanceId:current.identity.id,bytesMatch:null});
    const upload=await guest.request.post(endpoint,{headers:{origin:new URL(page.url()).origin,"content-type":"application/pdf"},data:current.bytes});
    expect(upload.status(),upload.status()===200?"Current ENT public upload":await upload.text()).toBe(200);
    const result=await upload.json();
    expect(result.reference).toMatchObject({found:true,issuanceId:current.identity.id,bytesMatch:true});
    expect(result.analysis).toMatchObject({status:"verified",verification:{accepted:true,wholeFile:true,signerTrust:"internal",timestampTrust:"internal"}});
    for(const privateFact of [f.patient,f.reason,f.item.proposed_by,fixtures.professional.id])expect(JSON.stringify(result)).not.toContain(privateFact);
  }finally{await guest.close();}
});

for(const mode of ["unknown","rejected"] as const)test(`ENT ${mode} gera exemplar assinado sem atribuir execução ou aceite alheio`,async({page})=>{
  const f=await regularizationPdfFixture(mode==="unknown"?{unknownOnly:true}:{state:"rejected"}),before=regularizationLedger(f.patient);
  await login(page,f.patient);await page.goto(`/historico/${f.doc.id}`);
  await inspect(page,f,mode,await generatedPdf(page,`/api/documents/${f.doc.id}/pdf?version=${f.doc.version}`),9);
  expect(regularizationLedger(f.patient)).toBe(before);
  expect(sql(`select count(*) from public.stock_movements where reference_type='delivery_regularization' and reference_id=${sqlLiteral(f.item.id)};`)).toBe("0");
});
