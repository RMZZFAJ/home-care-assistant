import { expect,test,type Page } from "@playwright/test";
import { createHash,randomUUID } from "node:crypto";
import { mkdirSync,readFileSync,writeFileSync } from "node:fs";
import { PDF } from "@libpdf/core";
import { PDFDocument,PDFName,PDFHexString } from "pdf-lib";
import { entTemporalFixture,entTemporalOracle,entTemporalLedger } from "../integration/ent-temporal-fixtures.mjs";
import { fixtures,rpc } from "../integration/v4-fixtures.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { sql,sqlLiteral } from "../../scripts/test-environment.mjs";
import { selectContext } from "./auth-context";
import { formatBrazilDate } from "../../src/lib/receipt";
test.setTimeout(180000);
const root="output/pdf/phase-d/ent-temporal";
const digest=(v:Uint8Array|string)=>createHash("sha256").update(v).digest("hex");
const compact=(v:string)=>v.normalize("NFKC").replaceAll(/\s/g,"").toLocaleLowerCase("pt-BR");
async function login(page:Page,patient:string){
  await page.goto("/login");await page.getByLabel("E-mail",{exact:true}).fill(fixtures.family.email);await page.getByLabel("Senha",{exact:true}).fill(fixturePassword);await page.getByRole("button",{name:"Entrar",exact:true}).click();await expect(page.getByRole("heading",{name:"Visão geral",exact:true})).toBeVisible();await selectContext(page,patient);
}
for(const mode of ["prepared","private"] as const)test(`ENT ${mode} preserva marcos temporais e bytes de cada exemplar sem reemitir no download`,async({page},info)=>{
  const f=await entTemporalFixture({mode}),oracle=entTemporalOracle(f.doc.id),before=entTemporalLedger(f.patient),corpus=[];
  await login(page,f.patient);await page.goto(`/historico/${f.doc.id}`);
  const files=page.getByRole("region",{name:"Arquivos gerados",exact:true}),endpoint=`/api/documents/${f.doc.id}/issuances`;
  const expected=["Criação da ficha: "+formatBrazilDate(oracle.createdAt),"Emissão operacional registrada: "+formatBrazilDate(oracle.issuedAt)];
  if(oracle.draftCreatedAt)expected.push("Primeiro rascunho privado salvo: "+formatBrazilDate(oracle.draftCreatedAt));
  let first:{id:string;bytes:Buffer;requestedAt:string}|null=null;
  for(let count=1;count<=2;count++){
    await files.getByRole("button",{name:"Gerar PDF",exact:true}).click();
    await expect(files.getByRole("link",{name:"Baixar PDF",exact:true})).toHaveCount(count);
    const rows=(await(await page.request.get(endpoint)).json()).data;
    expect(rows).toHaveLength(count);const row=rows.find((r:{id:string})=>r.id!==first?.id);
    expect(row).toMatchObject({state:"ready",rendererRevision:10,validation:{accepted:true,wholeFile:true,profile:"PAdES-B-T"}});
    const frozen=await rpc(f.owner,"pdf_issuance",{p_id:row.id});
    expect(new Date(frozen.snapshot.sourceFacts.issuedAt).toISOString()).toBe(new Date(oracle.issuedAt).toISOString());
    expect(new Date(frozen.snapshot.sourceFacts.documentCreatedAt).toISOString()).toBe(new Date(oracle.createdAt).toISOString());
    const response=await page.request.get(`/api/documents/${f.doc.id}/pdf?issuance=${row.id}`);expect(response.status()).toBe(200);
    const bytes=await response.body();expect(digest(bytes)).toBe(row.sha256);
    const pdf=await PDFDocument.load(bytes,{updateMetadata:false}),identity=JSON.parse(pdf.catalog.lookup(PDFName.of("HCAIssuance"),PDFHexString).decodeText());
    expect(identity.requestedAt).toBe(row.requestedAt);expect(identity.id).toBe(row.id);
    const text=compact((await PDF.load(bytes)).extractText().flatMap(p=>p.lines.map(l=>l.spans.flatMap(s=>s.chars.map(c=>c.char)).join(""))).join(" "));
    for(const fact of expected)expect(text,fact).toContain(compact(fact));
    if(mode==="prepared")expect(text).not.toContain(compact("Primeiro rascunho privado salvo"));
    expect(frozen.sourceHash).toBe(sql(`select content_hash from public.document_events where document_id=${sqlLiteral(f.doc.id)} and version=${row.version};`));
    if(first){
      expect(row.id).not.toBe(first.id);expect(bytes.equals(first.bytes)).toBe(false);
      const original=await page.request.get(`/api/documents/${f.doc.id}/pdf?issuance=${first.id}`);expect((await original.body()).equals(first.bytes)).toBe(true);
    }else first={id:row.id,bytes,requestedAt:row.requestedAt};
    if(info.project.name==="chromium"){
      mkdirSync(root,{recursive:true});const trustFile=process.env.HCA_PDF_TRUST_POLICY_FILE;if(!trustFile)throw new Error("Guarded internal trust fixture required");
      const pem=JSON.parse(readFileSync(trustFile,"utf8")).roots[0].pem,publicRoot=`root-${digest(pem).slice(0,16)}.crt`,file=`${mode}-${count}-${row.id}.pdf`;
      writeFileSync(`${root}/${publicRoot}`,pem);writeFileSync(`${root}/${file}`,bytes,{flag:"wx"});
      corpus.push({label:`ent-${mode}-${count}`,file,publicRoot,code:f.doc.code,issuanceId:row.id,documentId:f.doc.id,version:row.version,rendererRevision:row.rendererRevision,sha256:row.sha256,sourceHash:frozen.sourceHash,sourceFacts:frozen.snapshot.sourceFacts,documentFacts:frozen.snapshot.documentFacts,expectedText:expected,absentText:mode==="prepared"?["Primeiro rascunho privado salvo"]:[],requestedAt:row.requestedAt,clockControl:"Only new local fictional creation metadata is backdated; canonical event clocks/body/hash are preserved. Not elapsed-day or physical-device evidence."});
    }
  }
  await page.clock.install({time:new Date(Date.now()+86400000)});
  const later=await page.request.get(`/api/documents/${f.doc.id}/pdf?issuance=${first!.id}`);expect(later.status()).toBe(200);expect((await later.body()).equals(first!.bytes)).toBe(true);
  expect((await(await page.request.get(endpoint)).json()).data).toHaveLength(2);
  expect(entTemporalLedger(f.patient)).toBe(before);
  if(corpus.length)writeFileSync(`${root}/CORPUS-${mode}-${randomUUID()}.json`,JSON.stringify(corpus,null,2)+"\n",{flag:"wx"});
});
