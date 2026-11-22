import { z } from "zod";

export const technicalNotificationSource = z.enum(["notices", "web_push"]);
export type TechnicalNotificationSource = z.infer<typeof technicalNotificationSource>;
const instant = z.iso.datetime({ offset: true });
const outcome = z.enum(["pending", "processing", "sent", "accepted", "delivered", "read", "failed", "uncertain", "cancelled", "expired"]);
const attempt = z.object({id:z.uuid(),ordinal:z.number().int().min(1).max(5),startedAt:instant,completedAt:instant.nullable(),outcome,errorRecorded:z.boolean()}).strict();
const row = z.object({
  id:z.uuid(),channel:z.enum(["internal","email","whatsapp","web_push"]),state:outcome,createdAt:instant,
  attemptedAt:instant.nullable(),recordedAttemptCount:z.number().int().nonnegative(),
  providerReferenceRecorded:z.boolean(),errorRecorded:z.boolean(),
  historyCoverage:z.enum(["last_result_only","recorded_attempts"]),attempts:z.array(attempt).max(5),
}).strict();
export const technicalNotifications = z.object({
  environment:z.literal("shared_database"),source:technicalNotificationSource,consultedAt:instant,
  page:z.number().int().min(1).max(100000),pageSize:z.number().int().min(1).max(50),
  total:z.number().int().nonnegative(),data:z.array(row).max(50),
}).strict().superRefine((value,context)=>{
  const ids=new Set<string>();
  for(const item of value.data){
    const push=value.source==="web_push";
    if(ids.has(item.id) || (item.channel==="web_push")!==push || item.historyCoverage!==(push?"recorded_attempts":"last_result_only") || (!push && item.attempts.length))context.addIssue({code:"custom",message:"A tentativa não corresponde à fonte consultada."});
    ids.add(item.id);
  }
});
export function parseTechnicalNotifications(value:unknown, source:TechnicalNotificationSource, page:number){
  const result=z.object({data:technicalNotifications}).strict().safeParse(value);
  if(!result.success)throw new Error("Consulta de tentativas sem confirmação reconhecível. Consulte novamente.");
  const parsed=result.data.data;
  if(parsed.source!==source || parsed.page!==page || parsed.pageSize!==20)throw new Error("As tentativas não correspondem à consulta atual. Consulte novamente.");
  return parsed;
}
