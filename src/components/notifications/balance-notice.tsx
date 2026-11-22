"use client";
import {useSearchParams} from "next/navigation";
import type {WorkspaceContext} from "@/components/workspace";
import {useNotificationReference} from "@/lib/notifications/use-notification-reference";
import {NotificationReference} from "./notification-reference";
export function BalanceNotice({context}:{context:WorkspaceContext}){
 const params=useSearchParams(),read=useNotificationReference(context.patient!.id,"balance",params.get("ref"),params.get("refKind")??"auto");
 return <NotificationReference key={context.patient!.id+":"+read.reference} read={read} context={context}/>;
}
