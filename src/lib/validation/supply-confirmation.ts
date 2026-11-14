import { z } from "zod";
import type { SupplyDocument } from "@/types/documents";
const quantity=z.union([z.string().regex(/^\d+(?:\.\d+)?$/),z.number().finite().nonnegative()]);
const confirmed=z.object({persistence:z.literal("confirmed"),data:z.object({id:z.uuid(),care_recipient_id:z.uuid(),type:z.enum(["COM","ENT","BAL"]),version:z.number().int().positive(),status:z.string().regex(/^[a-z_]{1,40}$/),payload:z.record(z.string(),z.unknown()),lines:z.array(z.object({id:z.uuid(),product_id:z.string(),name_snapshot:z.string(),unit_snapshot:z.string(),quantity}).passthrough()).min(1).max(1000),events:z.array(z.unknown())}).passthrough()});
export function requireSupplyConfirmation(value:unknown,expected:{patientId:string;type:SupplyDocument["type"];id?:string;minimumVersion?:number}):SupplyDocument {
 const parsed=confirmed.safeParse(value);
 if(!parsed.success)throw new Error("A resposta não confirmou a ficha. Recupere a mesma tentativa antes de emitir outra.");
 const row=parsed.data.data;
 if(row.care_recipient_id!==expected.patientId||row.type!==expected.type||expected.id&&row.id!==expected.id||row.version<(expected.minimumVersion??1))throw new Error("A confirmação não corresponde à ficha e à versão desta tentativa. Recupere o resultado original.");
 return row as SupplyDocument;
}
