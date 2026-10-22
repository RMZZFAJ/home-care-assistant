import { NextResponse } from "next/server";
import {
  api,
  authenticate,
  databaseError,
  patientContext,
  rpc,
} from "@/lib/server/api";

export async function GET(request: Request) {
  return api("stock.balances", async () => {
    const auth = await authenticate();
    const patient = await patientContext(
      auth,
      new URL(request.url).searchParams.get("careRecipientId"),
    );
    const params = new URL(request.url).searchParams;
    if (params.get("custody") === "TRANSIT")
      return NextResponse.json({
        data: [],
        overview: [],
        metrics: [],
        transit: await rpc(auth.client, "stock_transit", {
          p_patient: patient.id,
        }),
        updatedAt: null,
      });
    const [balances, latest] = await Promise.all([
      auth.client
        .from("current_stock_balances")
        .select("product_id,location,balance")
        .eq("care_recipient_id", patient.id),
      auth.client
        .from("stock_movements")
        .select("created_at")
        .eq("care_recipient_id", patient.id)
        .order("created_at", { ascending: false })
        .limit(1),
    ]);
    if (balances.error) databaseError(balances.error);
    if (latest.error) databaseError(latest.error);
    const now = new Date();
    const from = new Date(now.getTime() - 30 * 86_400_000);
    const [overview, metrics] = await Promise.all([
      rpc(auth.client, "stock_overview", { p_patient: patient.id }),
      rpc(auth.client, "stock_consumption_metrics", {
        p_patient: patient.id,
        p_from: from.toISOString(),
        p_to: now.toISOString(),
      }),
    ]);
    return NextResponse.json({
      data: balances.data ?? [],
      overview,
      metrics,
      transit: [],
      updatedAt: latest.data?.[0]?.created_at ?? null,
    });
  });
}
