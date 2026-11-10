import { z } from "zod";
import { exactQuantity } from "./exact-quantity";
import { quantity } from "@/lib/quantity";
import {reminderReportReceipt} from "./notification-reference";

const lines = z
  .array(
    z
      .object({
        productId: z.string().min(1).max(120),
        quantity: exactQuantity.refine(
          (value) => quantity(value).gt(0),
          "Informe quantidade positiva.",
        ),
        unit: z.string().min(1).max(30).optional(),
      })
      .strict(),
  )
  .max(100)
  .refine(
    (value) =>
      new Set(value.map((line) => line.productId)).size === value.length,
    "Não repita materiais.",
  );
const text = z.string().trim().min(3).max(2000);
const version = z.number().int().positive().max(2147483647);
export const consumptionCommand = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("report"),
      careRecipientId: z.uuid(),
      kind: z.enum(["consumption", "shortage"]),
      location: z.enum(["FAMILY", "CARE_TEAM"]),
      text,
      lines,
      idempotencyKey: z.uuid(),
      reminderId:z.uuid().optional(),
    })
    .strict().refine(value=>!value.reminderId||value.location==="CARE_TEAM",{message:"O relato vinculado ao lembrete usa a custódia da equipe.",path:["location"]}),
  z
    .object({
      action: z.literal("supplement"),
      id: z.uuid(),
      text,
      lines,
      expectedVersion: version,
      idempotencyKey: z.uuid(),
    })
    .strict(),
  z
    .object({
      action: z.literal("confirm"),
      id: z.uuid(),
      accept: z.boolean(),
      reason: z.string().trim().min(3).max(1000).optional(),
      expectedVersion: version,
      idempotencyKey: z.uuid(),
    })
    .strict()
    .superRefine((input, context) => {
      if (!input.accept && !input.reason)
        context.addIssue({
          code: "custom",
          path: ["reason"],
          message: "Informe o motivo da rejeição.",
        });
      if (input.accept && input.reason !== undefined)
        context.addIssue({
          code: "custom",
          path: ["reason"],
          message: "A confirmação usa a estrutura revisada, sem novo texto.",
        });
    }),
]);
export const consumptionCursor = z
  .object({ at: z.iso.datetime({ offset: true }), id: z.uuid() })
  .strict();
export function consumptionResultConfirmed(value:unknown,packet:Exclude<z.infer<typeof consumptionCommand>,{action:"confirm"}>,patient:string){
 if(packet.action==="report"){
  if(packet.reminderId){const result=reminderReportReceipt.safeParse(value);return result.success&&result.data.careRecipientId===patient&&result.data.careRecipientId===packet.careRecipientId&&result.data.reminderId===packet.reminderId&&result.data.idempotencyKey===packet.idempotencyKey;}
  return z.object({id:z.uuid()}).safeParse(value).success;
 }
 const result=z.object({data:z.object({id:z.uuid(),care_recipient_id:z.uuid(),version:z.number().int().positive()})}).safeParse(value);
 return result.success&&result.data.data.id===packet.id&&result.data.data.care_recipient_id===patient&&result.data.data.version>=packet.expectedVersion+1;
}
export const consumptionFilters = z
  .object({
    kind: z.enum(["consumption", "shortage"]).optional(),
    status: z.enum(["reported", "confirmed", "rejected"]).optional(),
    search: z.string().trim().max(120).default(""),
    from: z.iso.date().optional(),
    to: z.iso.date().optional(),
    sourceReminder:z.uuid().optional(),
  })
  .refine(
    (value) => !value.from || !value.to || value.from <= value.to,
    "Revise o período.",
  );

const consumptionPage = z.object({
  data: z.array(z.object({
    id: z.uuid(), care_recipient_id: z.uuid(), kind: z.enum(["consumption", "shortage"]),
    location: z.enum(["FAMILY", "CARE_TEAM"]), status: z.enum(["reported", "confirmed", "rejected"]),
    body: z.string(), created_at: z.iso.datetime({ offset: true }), version: z.number().int().positive(),
    reported_by: z.uuid(), reported_name: z.string().nullable(),
  })).max(20),
  next: consumptionCursor.nullable(),
});
export function parseConsumptionPage(value: unknown, patient: string) {
  const result = consumptionPage.safeParse(value);
  if (!result.success || result.data.data.some(row => row.care_recipient_id !== patient))
    throw new Error("A resposta da consulta dos relatos não pôde ser lida. Atualize a lista.");
  return result.data;
}
