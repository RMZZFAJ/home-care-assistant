import type { DocumentSnapshot, PdfEmissionContext } from "@/lib/server/operational-pdf";
import type { PdfDocumentExpansion, PdfDocumentOptions } from "@/lib/documents/pdf-modes";
import { legacyFidelitySnapshots, fidelityEmission } from "./pdf-fidelity-fixtures";
import { purchaseEntrySource } from "./purchase-entry-balance-fixtures";
import { regularizationSnapshot } from "./pdf-regularization-fixtures";
export const modeId = (n: number) => "93000000-0000-4000-8000-" + String(n).padStart(12,"0");
export const modeEmission: PdfEmissionContext = { ...fidelityEmission, rendererRevision: 17, requestedAt: "2026-11-12T06:00:00Z" };
export function modeSource(type: "REQ"|"COM"|"ENT"|"BAL", mode: "expanded"|"audit" = "expanded", records = 2): DocumentSnapshot {
 const source = type === "COM" ? purchaseEntrySource().source : type === "ENT" ? regularizationSnapshot() : structuredClone(legacyFidelitySnapshots.find(row=>row.type===type)!);
 if(type==="REQ"||type==="BAL") {
  source.id=modeId(type==="REQ"?1:2);source.version=3;source.status="submitted";
  source.lines=[{id:modeId(5),product_name_snapshot:"Material essencial integral",name_snapshot:"Material essencial integral",unit_snapshot:"un",category_snapshot:"higiene",quantity:"2",urgent:false,current_stock:"2"}];
  source.payload={notes:"Observação original que nenhum filtro pode retirar."};
  source.workflow={countVersion:1};source.balanceReviews=undefined;
  source.balanceApplication={state:"not_applied",lines:[]};source.balanceReviewCorrections=[];
  source.documentFacts={schemaVersion:1,deliveryResolutions:[],purchaseReceiptEvents:[]};
 }
 source.lifecycleFacts={schemaVersion:1,documentId:source.id,version:source.version,cancellation:{state:"not_cancelled",act:null,acknowledgements:[]},complements:[]};
 source.presentationFacts={schemaVersion:1,documentId:source.id,version:source.version,asOf:"2026-11-12T05:00:00Z",author:{state:"unavailable"},references:[]};
 const options:PdfDocumentOptions={mode,sections:["progress","communications","confirmations","relations","access"],period:{from:null,through:null,timeZone:"America/Sao_Paulo"},purpose:mode==="audit"?"Conferência documental fictícia com fontes e limitações preservadas.":null};
 const automatic={id:modeId(20),source:"automatic" as const,documentId:source.id,recordedAt:"2026-11-12T05:10:00Z",action:type==="REQ"?"req.science_recorded":type==="COM"?"com.validate_receipt":type==="ENT"?"ent.receive":"bal.approve",version:source.version,authorId:modeId(21),authorName:"Pessoa do ato original"};
 const manual=Array.from({length:records},(_,n)=>({id:modeId(100+n),source:"manual" as const,documentId:source.id,recordedAt:new Date(Date.parse("2026-11-12T05:15:00Z")+n*1000).toISOString(),authorId:modeId(22),authorName:"Autora do registro complementar",category:"record" as const,stage:"issuance" as const,text:"Andamento integral "+n+" · "+"Texto preservado com autoria própria. ".repeat(n===0?35:2)+" Fim do registro "+n,references:[],relevance:n%2?"attention" as const:"milestone" as const,mentions:[{id:modeId(23),name:"Pessoa mencionada sem se tornar autora",careRole:"professional" as const}]}));
 const expansion:PdfDocumentExpansion={schemaVersion:1,documentId:source.id,documentVersion:source.version,referenceAt:modeEmission.requestedAt,options,progress:[automatic,...manual],communications:[{id:modeId(30),recordedAt:"2026-11-12T05:20:00Z",group:"family",recipientLabel:"Pessoa destinatária da comunicação",channel:"internal",state:"sent",attempts:1,seenAt:null}],confirmations:[automatic],relations:{references:[],complements:[]},access:[{id:modeId(31),recordedAt:"2026-11-12T05:25:00Z",actorName:"Pessoa do acesso relatado",referenceVersion:source.version,origin:"application_foreground_display_report"}],auditTrail:mode==="audit"?[{id:modeId(32),recordedAt:"2026-11-12T05:30:00Z",action:"document.progress.created",actorId:modeId(22)}]:null};
 source.documentExpansion=expansion;return source;
}
