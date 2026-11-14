import {z} from "zod";
const id=z.uuid(),date=z.iso.date(),instant=z.iso.datetime({offset:true}),text=z.string().max(10000);
const base={referenceId:id,careRecipientId:id};
export const referenceKindsByArea:Record<string,string[]>={schedule:["schedule"],balance:["balance","legacy_balance"],stock:["stock_alert"],consumption:["report","shift_reminder"]};
export const referenceQuery=z.object({careRecipientId:id,ref:id,area:z.enum(["schedule","balance","stock","consumption"]),namespace:z.enum(["auto","report","reminder","alert"]).default("auto")}).strict();
const currentShift=z.object({status:text,version:z.number().int().positive(),startsAt:instant.nullable(),endsAt:instant.nullable(),timezone:z.string().max(100),professionalName:text.nullable(),typeName:text.nullable()});
export const notificationReference=z.discriminatedUnion("kind",[
 z.object({...base,kind:z.literal("schedule"),eventId:id,action:text,reason:text,recordedAt:instant,actorName:text.nullable(),referenceDay:date,shiftId:id.nullable(),seriesId:id.nullable(),originalTimezone:z.string().max(100).nullable(),originalStartsAt:instant.nullable(),originalEndsAt:instant.nullable(),current:currentShift.nullable()}),
 z.object({...base,kind:z.literal("balance"),eventId:id,action:text,reason:text,recordedAt:instant,cycleState:text.nullable(),documentId:id.nullable(),assignment:z.object({id,timezone:z.string().max(100).nullable(),professionalName:text.nullable(),startsAt:instant,endsAt:instant,status:text,version:z.number().int().positive()}).nullable(),weeks:z.object({count:z.number().int().nonnegative(),first:date.nullable(),last:date.nullable()})}),
 z.object({...base,kind:z.literal("legacy_balance"),period:date,expectedAt:instant,acknowledgedAt:instant.nullable(),canCountNow:z.boolean()}),
 z.object({...base,kind:z.literal("stock_alert"),productId:z.string().min(1).max(120),productName:text.nullable(),unit:text.nullable(),location:z.enum(["FAMILY","CARE_TEAM"]),severity:z.enum(["low","critical"]),state:z.enum(["open","resolved"]),balance:z.string().max(80),currentBalance:z.string().max(80),createdAt:instant,observedAt:instant.nullable(),resolvedAt:instant.nullable()}),
 z.object({...base,kind:z.literal("report"),reportId:id,sourceReminderId:id.nullable()}),
 z.object({...base,kind:z.literal("shift_reminder"),period:date,expectedAt:instant,acknowledgedAt:instant.nullable(),canAcknowledge:z.boolean(),canReport:z.boolean(),reportCount:z.number().int().nonnegative(),reports:z.array(z.object({id,kind:z.enum(["consumption","shortage"]),status:text,createdAt:instant})).max(20)}),
]);
export type NotificationReference=z.infer<typeof notificationReference>;
export const noIssuesCommand=z.object({careRecipientId:id,ref:id,action:z.literal("no_issues"),idempotencyKey:id}).strict();
export type NoIssuesCommand=z.infer<typeof noIssuesCommand>;
export const noIssuesReceipt=z.object({careRecipientId:id,reminderId:id,idempotencyKey:id,acknowledgedAt:instant,recorded:z.boolean(),replayed:z.boolean().optional()});
export type NoIssuesResult={data:z.infer<typeof noIssuesReceipt>};
export function noIssuesConfirmed(value:unknown,packet:NoIssuesCommand){
 const parsed=z.object({data:noIssuesReceipt}).safeParse(value);
 return parsed.success&&parsed.data.data.careRecipientId===packet.careRecipientId&&parsed.data.data.reminderId===packet.ref&&parsed.data.data.idempotencyKey===packet.idempotencyKey;
}
export const reminderReportReceipt=z.object({id,careRecipientId:id,reminderId:id,idempotencyKey:id,recorded:z.boolean(),replayed:z.boolean().optional()});
