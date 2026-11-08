import { z } from "zod";
const controlFree = (value:string) => [...value].every(char => {const code=char.charCodeAt(0);return code>=32&&(code<127||code>159);});
export const selectionName = z.string().trim().min(2).max(80).refine(controlFree, "Use um nome sem quebras de linha ou caracteres de controle.");
const productIds = z.array(z.string().min(1).max(120)).min(1).max(1000).refine(value => new Set(value).size === value.length);
export const selectionCommandSchema = z.object({careRecipientId:z.uuid(),name:selectionName,productIds,idempotencyKey:z.uuid()}).strict();
export const selectionSchema = z.object({id:z.uuid(),ownerId:z.uuid(),patientId:z.uuid(),name:z.string().min(2).max(80).refine(value=>value===value.trim()&&controlFree(value)),productIds,createdAt:z.iso.datetime({offset:true})}).strict();
export type MaterialSelection = z.infer<typeof selectionSchema>;
export type SelectionCommand = z.infer<typeof selectionCommandSchema>;
export function parseSelectionLibrary(value:unknown,ownerId:string,patientId:string) {
  const rows=z.array(selectionSchema).parse(value);
  if(rows.some(row=>row.ownerId!==ownerId||row.patientId!==patientId)||new Set(rows.map(row=>row.id)).size!==rows.length)throw new Error("A lista recebida não corresponde ao contexto autorizado.");
  return rows;
}
export function selectionConfirmed(value:unknown,packet:SelectionCommand,ownerId:string) {
  const parsed=z.object({data:z.object({selection:selectionSchema,replayed:z.boolean()}).strict()}).safeParse(value);
  if(!parsed.success)return false;
  const row=parsed.data.data.selection;
  return row.ownerId===ownerId&&row.patientId===packet.careRecipientId&&row.name===packet.name&&JSON.stringify([...row.productIds].sort())===JSON.stringify([...packet.productIds].sort());
}
