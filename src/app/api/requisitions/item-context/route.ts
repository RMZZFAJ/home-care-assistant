import { NextResponse } from "next/server";
import { api, authenticate, patientContext, rpc } from "@/lib/server/api";

export async function GET(request: Request) {
  return api("requisitions.item-context", async () => {
    const auth = await authenticate();
    const params = new URL(request.url).searchParams;
    const patient = await patientContext(
      auth,
      params.get("careRecipientId"),
      "req.read",
    );
    const products = (params.get("productIds") ?? "")
      .split(",")
      .filter(Boolean)
      .slice(0, 1000);
    return NextResponse.json({
      data: await rpc(auth.client, "requisition_item_context", {
        p_patient: patient.id,
        p_products: products,
      }),
    });
  });
}
