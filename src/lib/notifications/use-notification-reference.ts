"use client";
import {z} from "zod";
import {useScopedRead} from "@/lib/use-scoped-read";
import {useLiveRevision} from "@/lib/use-live-revision";
import {notificationReference,referenceKindsByArea} from "@/lib/validation/notification-reference";
export function useNotificationReference(patient:string,area:"schedule"|"balance"|"stock"|"consumption",reference:string|null,namespace="auto"){
 const valid=Boolean(reference&&z.uuid().safeParse(reference).success&&["auto","report","reminder","alert"].includes(namespace));
 const read=useScopedRead<unknown>(valid?"/api/notifications/target?"+new URLSearchParams({careRecipientId:patient,area,ref:reference!,namespace}):null,String(useLiveRevision()));
 const parsed=z.object({data:notificationReference}).safeParse(read.data),data=parsed.success&&parsed.data.data.careRecipientId===patient&&parsed.data.data.referenceId===reference&&referenceKindsByArea[area].includes(parsed.data.data.kind)?parsed.data.data:null;
 const invalid=reference&&!valid?"Esta referência é inválida. Volte ao aviso original.":"";
 return {...read,reference,area,data:read.error?null:data,error:invalid||read.error||(!read.loading&&valid&&!data?"A referência não pôde ser reconhecida. Consulte novamente.":"")};
}
export type NotificationReferenceRead=ReturnType<typeof useNotificationReference>;
