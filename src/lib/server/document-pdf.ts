import { readFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { PDFDocument, rgb, type PDFFont } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { documentLabels, documentStatuses, type DocumentType } from "@/types/documents";
import { formatQuantity } from "@/lib/quantity";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError, databaseError, rpc } from "./api";
import { createWorkerClient } from "./service-client";

type Snapshot = {id: string; type: DocumentType; code: string; protocol: string; version: number; status: string; createdAt?: string; actors?: {issuer?: {name: string; registration?: string; state?: string}; recipient?: {name: string}; patient?: {name: string}}; lines: Record<string, unknown>[]; payload: Record<string, unknown>; attachments?: {filename: string; sha256: string}[]};
function wrap(text: string, font: PDFFont, size: number, width: number) {
  const output: string[] = []; let row = "";
  for (const paragraph of Array.from(text).map((character) => character.charCodeAt(0) < 32 && character !== "\n" ? " " : character).join("").split("\n")) {
    for (const word of paragraph.split(/\s+/)) {
      for (const piece of word.match(/.{1,60}/gu) ?? [""]) { const candidate = row ? row + " " + piece : piece; if (row && font.widthOfTextAtSize(candidate,size)>width) {output.push(row); row=piece;} else row=candidate; }
    }
    output.push(row); row="";
  }
  return output;
}
export async function renderDocumentPdf(snapshot: Snapshot, hash: string) {
  const pdf = await PDFDocument.create(); pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(await readFile(path.join(process.cwd(),"public/fonts/NotoSans-Regular.ttf")), {subset: true});
  const created = snapshot.createdAt ? new Date(snapshot.createdAt) : new Date("2000-01-01T00:00:00Z");
  pdf.setTitle((snapshot.code ?? snapshot.type) + " · Home Care Assistant"); pdf.setAuthor("Home Care Assistant"); pdf.setCreationDate(created); pdf.setModificationDate(created);
  let page = pdf.addPage([595.28,841.89]); let y=790; const margin=44;
  function text(content: string, size=10, color=rgb(.1,.2,.24)) { for (const line of wrap(content,font,size,507)) {if (y<64) {page=pdf.addPage([595.28,841.89]); y=790;} page.drawText(line,{x: margin,y,size,font,color}); y-=size*1.6;} }
  text("HOME CARE ASSISTANT",10,rgb(.08,.42,.47)); y-=12; text(snapshot.code ?? snapshot.type,23); text(documentLabels[snapshot.type],12); y-=10;
  text("Protocolo: " + snapshot.protocol,9); text("Versão " + snapshot.version + " · " + (documentStatuses[snapshot.status] ?? snapshot.status));
  text("Paciente: " + (snapshot.actors?.patient?.name ?? snapshot.payload.patientName ?? "Registrado no documento"));
  text("Emitente: " + (snapshot.actors?.issuer?.name ?? snapshot.payload.requesterName ?? "Responsável registrado"));
  if (snapshot.actors?.issuer?.registration) text("Registro profissional: " + snapshot.actors.issuer.registration + "/" + (snapshot.actors.issuer.state ?? ""));
  if (snapshot.actors?.recipient?.name) text("Destinatário: " + snapshot.actors.recipient.name);
  if (snapshot.createdAt) text("Emissão: " + new Intl.DateTimeFormat("pt-BR",{dateStyle:"short",timeStyle:"short",timeZone:"America/Sao_Paulo"}).format(created));
  y-=14; text("PRODUTOS",11);
  for (const [index,line] of snapshot.lines.entries()) {
    y-=8; text((index+1)+". "+String(line.name_snapshot ?? line.product_name_snapshot ?? line.custom_name ?? line.product_id ?? "Produto"),11);
    if (snapshot.type === "REQ") text("Estoque observado: "+formatQuantity(String(line.current_stock ?? "0"),String(line.unit_snapshot ?? ""))+(line.urgent ? " · Urgente" : ""));
    else {text((snapshot.type === "ENT" ? "Expedido" : snapshot.type === "BAL" ? "Contado" : "Proposto")+": "+formatQuantity(String(line.quantity),String(line.unit_snapshot ?? "")));
      if(snapshot.type === "COM") text("Aprovado: "+formatQuantity(String(line.approved_quantity))+" · Adquirido: "+formatQuantity(String(line.purchased_quantity))+" · Recebido validado: "+formatQuantity(String(line.accepted_quantity)));
      if(snapshot.type === "ENT") text("Aceito: "+formatQuantity(String(line.accepted_quantity))+" · Conciliado: "+formatQuantity(String(line.reconciled_quantity))+" · "+(line.fully_checked ? "Integralmente conferido" : "Conferência não integral"));}
  }
  const intent = snapshot.payload.intent as {observations?: string[]} | undefined;
  const notes = snapshot.payload.notes ?? intent?.observations?.join("\n"); if(notes) {y-=14; text("OBSERVAÇÕES",11); text(String(notes));}
  if(snapshot.attachments?.length) {y-=14;text("ANEXOS VINCULADOS",11); for(const file of snapshot.attachments) {text(file.filename);text("SHA-256: "+file.sha256,8);}}
  y-=16; text("Integridade do conteúdo canônico · SHA-256",9);text(hash,8);text("O hash compara o conteúdo registrado. Este comprovante não contém assinatura digital assimétrica.",8);
  pdf.getPages().forEach((item,index) => item.drawText((snapshot.code ?? snapshot.type)+" · v"+snapshot.version+" · "+(index+1)+"/"+pdf.getPageCount(),{x:margin,y:30,font,size:8,color:rgb(.35,.43,.47)}));
  return Buffer.from(await pdf.save({useObjectStreams:true}));
}
export async function documentPdf(client: SupabaseClient, id: string, version?: number) {
  const doc = await rpc(client,"operational_document",{p_id:id}) as {version: number; protocol: string | null; code: string};
  if(!doc.protocol) throw new ApiError("VALIDATION_ERROR","Emita a ficha antes de gerar o comprovante.");
  const target = version ?? doc.version;
  const {data:event,error} = await client.from("document_events").select("body,content_hash").eq("document_id",id).eq("version",target).maybeSingle(); if(error) databaseError(error); if(!event) throw new ApiError("NOT_FOUND","Versão não encontrada.",404);
  const server=createWorkerClient();
  const {data:existing,error:lookupError}=await client.from("document_pdfs").select("object_path").eq("document_id",id).eq("version",target).maybeSingle(); if(lookupError) databaseError(lookupError);
  if(existing) {const {data,error:downloadError}=await server.storage.from("document-receipts").download(existing.object_path); if(downloadError) throw new ApiError("PERSISTENCE_UNCONFIRMED","Não foi possível recuperar o PDF registrado.",503,true); return {bytes:Buffer.from(await data.arrayBuffer()),filename:doc.code+"-v"+target+".pdf"};}
  const bytes=await renderDocumentPdf(event.body as Snapshot,event.content_hash); const objectPath=id+"/"+target+".pdf";
  const {error:uploadError}=await server.storage.from("document-receipts").upload(objectPath,bytes,{contentType:"application/pdf",upsert:false});
  if(uploadError && !["409","Duplicate"].includes(String(uploadError.statusCode))) {const {data:concurrent}=await server.storage.from("document-receipts").download(objectPath); if(!concurrent) throw new ApiError("PERSISTENCE_UNCONFIRMED","Não foi possível armazenar o PDF.",503,true);}
  const {data:stored,error:storedError}=await server.storage.from("document-receipts").download(objectPath); if(storedError) throw new ApiError("PERSISTENCE_UNCONFIRMED","PDF aguardando confirmação.",503,true);
  const canonicalBytes=Buffer.from(await stored.arrayBuffer());
  await rpc(server,"register_document_pdf",{p_document:id,p_version:target,p_path:objectPath,p_hash:createHash("sha256").update(canonicalBytes).digest("hex")});
  return {bytes:canonicalBytes,filename:doc.code+"-v"+target+".pdf"};
}
