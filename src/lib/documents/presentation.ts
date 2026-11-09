/** Display the independent dimensions returned by the authoritative REQ read model. */
export function requisitionDocumentState(input: { historical?: boolean; status: string; archivedAt: string | null; completedAt: string | null; scienceSatisfied: boolean; fulfilled: number }) {
  if (input.historical) return "historical";
  if (input.status === "cancelled") return "cancelled";
  if (input.archivedAt) return "archived";
  if (input.completedAt) return input.scienceSatisfied ? "completed" : "completed_science_pending";
  if (input.fulfilled > 0) return "fulfillment_partial";
  return input.scienceSatisfied ? "awaiting_fulfillment" : "science_pending";
}

export function documentPatientName(snapshot: Record<string, unknown>, fallback: string) {
  const actors = snapshot.actors;
  const patient = actors && typeof actors === "object" ? (actors as Record<string, unknown>).patient : null;
  if (patient && typeof patient === "object" && typeof (patient as Record<string, unknown>).name === "string") return (patient as { name: string }).name;
  return typeof snapshot.patientName === "string" ? snapshot.patientName : fallback;
}

/** A historical actor is never replaced by today's directory name. */
export function documentIssuerName(snapshot: Record<string, unknown>) {
  const actors = snapshot.actors;
  const issuer = actors && typeof actors === "object" ? (actors as Record<string, unknown>).issuer : null;
  const name = issuer && typeof issuer === "object" ? (issuer as Record<string, unknown>).name : null;
  return typeof name === "string" && name.trim() ? name : "Nome histórico não preservado";
}
import { documentLabels, documentStatuses } from "@/types/documents";

export const historyStatusLabels: Record<string,string> = {
  ...documentStatuses,
  archive_pending: "Conclusões para revisar e arquivar",
  science_required: "Requisições para sua ciência",
};
export function documentStatusLabel(status:string){
  return Object.hasOwn(documentStatuses,status)?documentStatuses[status]:"Situação não reconhecida";
}
const filterLabels: Record<string,string> = {
  search:"Busca",type:"Tipo de ficha",status:"Situação",from:"Data inicial",to:"Data final",
};
/** Closed technical values have human fallbacks; search remains the person's text. */
export function historyFilterPresentation(key:string,value:string) {
  const name=Object.hasOwn(filterLabels,key)?filterLabels[key]:"Filtro";
  let display="Valor não reconhecido";
  if(key==="search")display=value;
  else if(key==="status")display=Object.hasOwn(historyStatusLabels,value)?historyStatusLabels[value]:"Situação não reconhecida";
  else if(key==="type")display=Object.hasOwn(documentLabels,value)?documentLabels[value as keyof typeof documentLabels]:"Tipo de ficha não reconhecido";
  else if(key==="from"||key==="to"){
    const date=/^\d{4}-\d{2}-\d{2}$/.test(value)?new Date(value+"T12:00:00Z"):null;
    display=date&&Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value?value.split("-").reverse().join("/"):"Data não reconhecida";
  }
  return {text:`${name}: ${display}`,removeLabel:`Remover filtro de ${name.toLocaleLowerCase("pt-BR")}: ${display}`};
}
