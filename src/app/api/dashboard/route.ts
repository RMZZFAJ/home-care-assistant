import { NextResponse } from "next/server";
import {
  api,
  authenticate,
  databaseError,
  patientContext,
  rpc,
} from "@/lib/server/api";

export async function GET(request: Request) {
  return api("dashboard.read", async () => {
    const auth = await authenticate();
    const patient = await patientContext(
      auth,
      new URL(request.url).searchParams.get("careRecipientId"),
    );
    const base = () =>
      auth.client
        .from("operational_documents")
        .select("id", { head: true, count: "exact" })
        .eq("care_recipient_id", patient.id);
    const results = await Promise.all([
      base()
        .eq("type", "ENT")
        .eq("recipient_id", auth.userId)
        .eq("status", "pending_receipt"),
      base().eq("type", "COM").eq("status", "pending_approval"),
      base().eq("type", "ENT").eq("status", "disputed"),
      base().eq("type", "BAL").eq("status", "submitted"),
      auth.client.rpc("operational_document_list", { p_patient: patient.id, p_size: 6 }),
      auth.client
        .from("patient_settings")
        .select("settings")
        .eq("care_recipient_id", patient.id)
        .maybeSingle(),
    ]);
    for (const result of results) if (result.error) databaseError(result.error);
    const tasks = (await rpc(auth.client, "operational_tasks", {
      p_patient: patient.id,
    })) as {
      requests: number;
      balOverdue: boolean;
      balDue: string;
      drafts: number;
      consumptionPending: number;
    };
    return NextResponse.json({
      data: {
        ...tasks,
        requests: tasks.requests,
        receipts: results[0].count ?? 0,
        purchases: results[1].count ?? 0,
        disputes: results[2].count ?? 0,
        balances: results[3].count ?? 0,
        recent: results[4].data?.data ?? [],
        balDay:
          (results[5].data as { settings?: { balDay?: number } } | null)
            ?.settings?.balDay ?? null,
      },
    });
  });
}
