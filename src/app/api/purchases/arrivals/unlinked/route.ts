import { NextResponse } from "next/server";
import { ApiError, api, authenticate, readJson, rpc } from "@/lib/server/api";
import { unlinkedArrivalCommand, unlinkedArrivalQuery } from "@/lib/validation/unlinked-arrival";

export async function GET(request: Request) {
  return api("unlinked-arrivals.read", async () => {
    const parsed = unlinkedArrivalQuery.safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!parsed.success) throw new ApiError("VALIDATION_ERROR", "Confira a referência da chegada.");
    const query = parsed.data, { client } = await authenticate();
    const data = await rpc(client, "read_unlinked_arrivals", {
      p_patient: query.careRecipientId, p_id: query.id ?? null, p_before_at: query.beforeAt ?? null, p_before_id: query.beforeId ?? null,
    });
    return NextResponse.json({ careRecipientId: query.careRecipientId, data }, { headers: { "Cache-Control": "no-store" } });
  });
}

export async function POST(request: Request) {
  return api("unlinked-arrivals.command", async () => {
    const input = await readJson(request, unlinkedArrivalCommand, 32_000), { client } = await authenticate();
    const data = await rpc(client, "unlinked_arrival_command", { p_patient: input.careRecipientId, p_key: input.key, p_body: input.intent });
    return NextResponse.json({ data }, { headers: { "Cache-Control": "no-store" } });
  });
}
