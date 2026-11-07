import { z } from "zod";
export const guideRecord=z.object({ scope:z.string(),role:z.string(),patientId:z.uuid().nullable(),guideVersion:z.literal("2026-11-D3"),showOnFirstAccess:z.boolean(),configurationRevision:z.number().int().nonnegative(),progress:z.object({revision:z.number().int().nonnegative(),step:z.number().int().min(0).max(5),status:z.enum(["started","skipped","completed"]).nullable()}) });
export type GuideContext=z.infer<typeof guideRecord>;
export const guideCommand=z.discriminatedUnion("action",[
  z.object({action:z.literal("progress"),expectedScope:z.string().min(1).max(100),expectedRevision:z.number().int().nonnegative(),step:z.number().int().min(0).max(5),status:z.enum(["started","skipped","completed"]),idempotencyKey:z.uuid()}).strict(),
  z.object({action:z.literal("configure"),careRecipientId:z.uuid(),expectedRevision:z.number().int().nonnegative(),showOnFirstAccess:z.boolean(),idempotencyKey:z.uuid()}).strict(),
]);
export type GuideCommand=z.infer<typeof guideCommand>;
export function guideProgressConfirmed(value:unknown,intent:GuideCommand){
  const result=z.object({data:guideRecord}).safeParse(value);
  if(!result.success||intent.action!=="progress")return false;
  const data=result.data.data;
  return data.scope===intent.expectedScope&&data.progress.revision===intent.expectedRevision+1&&data.progress.step===intent.step&&data.progress.status===intent.status;
}
export function guideConfigurationConfirmed(value:unknown,intent:GuideCommand){
  const result=z.object({data:z.object({patientId:z.uuid(),revision:z.number().int().positive(),showOnFirstAccess:z.boolean()})}).safeParse(value);
  return result.success&&intent.action==="configure"&&result.data.data.patientId===intent.careRecipientId&&result.data.data.revision===intent.expectedRevision+1&&result.data.data.showOnFirstAccess===intent.showOnFirstAccess;
}
export function parseGuide(value:unknown):GuideContext { const result=guideRecord.safeParse(value);if(!result.success)throw new Error("Não foi possível ler o guia. Consulte novamente.");return result.data; }
