import { z } from "zod";
export const preparationQuery=z.object({page:z.coerce.number().int().min(1).max(100000).default(1),query:z.string().trim().max(160).default("")});
export const preparationContent = z.object({
  displayName: z.string().max(160).optional(), isActive: z.boolean().optional(), isDevelopment: z.boolean().optional(),
  timeZone: z.string().max(100).optional(), administratorEmail: z.string().max(254).optional(),
  ownerId: z.uuid().optional(), substituteId: z.uuid().optional(), responseMinutes: z.number().int().min(0).max(99999).optional(),
  showGuide: z.boolean().optional(), teamIds: z.array(z.uuid()).max(100).optional(),
}).strict();
export const preparationCommand = z.object({ id: z.uuid().nullable(), expectedRevision: z.number().int().positive().nullable(), action: z.enum(["save","create","discard"]), content: preparationContent, step: z.number().int().min(0).max(6), idempotencyKey: z.uuid() }).strict();
export const preparationCreateContent=preparationContent.extend({displayName:z.string().trim().min(2,"Informe o nome da residência.").max(160),isActive:z.boolean({error:"Escolha o estado inicial."}),isDevelopment:z.boolean(),timeZone:z.string().min(1,"Escolha o fuso da residência."),administratorEmail:z.email("Informe o e-mail completo da conta inicial."),ownerId:z.uuid("Escolha o titular da continuidade."),substituteId:z.uuid("Escolha o substituto da continuidade."),responseMinutes:z.number().int().min(15,"O prazo mínimo é15 minutos.").max(10080),showGuide:z.boolean()}).refine(c=>c.ownerId!==c.substituteId,{path:["substituteId"],message:"Titular e substituto devem ser pessoas distintas."});
export const preparationRecord = z.object({ id: z.uuid(), patientId: z.uuid().nullable(), revision: z.number().int().positive(), step: z.number().int().min(0).max(6), state: z.enum(["draft","preparing","discarded"]), content: preparationContent.nullable(), savedAt: z.iso.datetime({ offset: true }), productionApproved: z.literal(false) });
export type PreparationContent = z.infer<typeof preparationContent>;
export type Preparation = z.infer<typeof preparationRecord>;
export type PreparationCommand = z.infer<typeof preparationCommand>;
export const preparationStatus=z.object({patientCreated:z.boolean(),activeMemberships:z.number().int().nonnegative(),activeProducts:z.number().int().nonnegative(),stockRecordsExist:z.boolean(),scheduleRecordsExist:z.boolean(),balanceEnabled:z.boolean(),guideConfigured:z.boolean(),productionApproved:z.literal(false)});
export function parsePreparationPage(value:unknown){
  const result=z.object({data:z.array(preparationRecord).max(50),total:z.number().int().nonnegative(),page:z.number().int().positive(),pageSize:z.number().int().min(1).max(50)}).safeParse(value);
  if(!result.success||result.data.data.length>result.data.total||result.data.data.length>result.data.pageSize)throw new Error("Não foi possível ler a lista de preparações. Consulte novamente.");return result.data;
}
export function preparationConfirmed(value:unknown,intent:PreparationCommand){
  const result=z.object({data:preparationRecord}).safeParse(value);if(!result.success)return false;
  const row=result.data.data;
  if(row.revision!==(intent.expectedRevision??0)+1||row.step!==intent.step||intent.id!==null&&row.id!==intent.id)return false;
  if(intent.action==="discard")return row.state==="discarded"&&row.patientId===null;
  if(JSON.stringify(row.content)!==JSON.stringify(preparationContent.parse(intent.content)))return false;
  return intent.action==="create"?row.state==="preparing"&&row.patientId!==null:row.state===(row.patientId?"preparing":"draft");
}
export function parsePreparation(value: unknown): Preparation {
  const result = preparationRecord.safeParse(value);
  if (!result.success) throw new Error("Não foi possível ler a preparação. Consulte novamente.");
  return result.data;
}
