import { z } from "zod";
import type { WorkspaceContext } from "@/types/workspace";
import { can } from "@/lib/client/capabilities";
const count=z.number().int().nonnegative();
export const localPreparationQuery=z.object({careRecipientId:z.uuid().transform(value=>value.toLowerCase())}).strict();
export const localPreparationSchema=z.object({
  patientId:z.uuid(),observedAt:z.iso.datetime({offset:true}),source:z.literal("registered_metadata"),
  patient:z.object({name:z.string(),active:z.boolean(),referenceTimeZone:z.string().min(1).nullable()}).strict(),
  people:z.object({activeMemberships:count,pendingInvitations:count,expiredInvitations:count}).strict().nullable(),
  catalogue:z.object({activeProducts:count,inactiveProducts:count}).strict().nullable(),
  stock:z.object({familyMovements:count.nullable(),teamMovements:count.nullable(),canManageFamily:z.boolean()}).strict().nullable(),
  schedules:z.object({totalShifts:count,upcomingShifts:count,canManageTeam:z.boolean()}).strict().nullable(),
  balance:z.object({enabled:z.boolean(),timeZone:z.string().min(1).nullable(),canConfigure:z.boolean()}).strict().nullable(),
  communication:z.object({guideConfigured:z.boolean(),guideEnabled:z.boolean()}).strict().nullable(),
}).strict();
export type LocalPreparation=z.infer<typeof localPreparationSchema>;
export function parseLocalPreparation(value:unknown,patient:string){
  const parsed=localPreparationSchema.safeParse(value);
  if(!parsed.success||parsed.data.patientId!==patient)throw new Error("A consulta não corresponde à preparação deste paciente. Consulte novamente.");
  return parsed.data;
}
export function mayPrepareLocally(context:WorkspaceContext){
  return context.activeContext?.mode==="patient"&&Boolean(context.patient)&&["access.manage","catalog.manage","stock.family.manage","schedule.manage.team","bal.schedule.manage"].some(capability=>can(context,capability));
}
