import { NextResponse } from "next/server";
import { api, authenticate, databaseError, patientContext } from "@/lib/server/api";

export async function GET(request: Request) {
  return api("stock.balances", async () => {
    const auth = await authenticate();
    const patient = await patientContext(auth, new URL(request.url).searchParams.get("careRecipientId"));
    const [balances, latest] = await Promise.all([
      auth.client.from("current_stock_balances").select("product_id,location,balance").eq("care_recipient_id", patient.id),
      auth.client.from("stock_movements").select("created_at").eq("care_recipient_id", patient.id).order("created_at", { ascending: false }).limit(1),
    ]);
    if (balances.error) databaseError(balances.error);
    if (latest.error) databaseError(latest.error);
    return NextResponse.json({ data: balances.data ?? [], updatedAt: latest.data?.[0]?.created_at ?? null });
  });
}
