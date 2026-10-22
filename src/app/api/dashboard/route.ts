import { NextResponse } from "next/server";
import { api, authenticate, databaseError, patientContext } from "@/lib/server/api";

export async function GET(request: Request) { return api("dashboard.read", async () => {
  const auth = await authenticate(); const patient = await patientContext(auth, new URL(request.url).searchParams.get("careRecipientId"));
  const base = () => auth.client.from("operational_documents").select("id", { head: true, count: "exact" }).eq("care_recipient_id", patient.id);
  const results = await Promise.all([
    base().eq("type", "REQ").not("status", "in", "(cancelled,draft)"), base().eq("type", "ENT").eq("recipient_id", auth.userId).eq("status", "pending_receipt"),
    base().eq("type", "COM").eq("status", "pending_approval"), base().eq("type", "ENT").eq("status", "disputed"), base().eq("type", "BAL").eq("status", "submitted"),
    auth.client.from("operational_documents").select("id,type,code,protocol,status,recipient_id,created_at").eq("care_recipient_id", patient.id).order("created_at", { ascending: false }).limit(6),
    auth.client.from("patient_settings").select("settings").eq("care_recipient_id", patient.id).maybeSingle(),
  ]);
  for (const result of results) if (result.error) databaseError(result.error);
  return NextResponse.json({ data: { requests: results[0].count ?? 0, receipts: results[1].count ?? 0, purchases: results[2].count ?? 0, disputes: results[3].count ?? 0, balances: results[4].count ?? 0, recent: results[5].data ?? [], balDay: (results[6].data as { settings?: { balDay?: number } } | null)?.settings?.balDay ?? null } });
}); }
