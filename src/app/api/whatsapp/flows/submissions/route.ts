import { NextResponse } from "next/server";
import { z } from "zod";
import {
  api,
  authenticate,
  ApiError,
  databaseError,
  patientContext,
  pageParameters,
  readJson,
  rpc,
  uuid,
} from "@/lib/server/api";
import { exactQuantity } from "@/lib/validation/documents";

const schema = z
  .object({
    id: uuid,
    accept: z.boolean(),
    kind: z.enum(["consumption", "shortage"]),
    text: z.string().trim().min(3).max(2000),
    lines: z
      .array(
        z
          .object({
            productId: z.string().min(1).max(120),
            quantity: exactQuantity,
          })
          .strict(),
      )
      .max(100),
  })
  .strict();
export async function GET(request: Request) {
  return api("flows.submissions", async () => {
    const auth = await authenticate();
    const params = new URL(request.url).searchParams;
    const patient = await patientContext(
      auth,
      params.get("careRecipientId"),
      "consumption.report",
    );
    const { page, pageSize, start, end } = pageParameters(params);
    const { data, error, count } = await auth.client
      .from("flow_submissions")
      .select("id,body,status,created_at,report_id", { count: "exact" })
      .eq("care_recipient_id", patient.id)
      .eq("user_id", auth.userId)
      .eq("status", "pending_confirmation")
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(start, end);
    if (error) databaseError(error);
    if (!Array.isArray(data) || typeof count !== "number") throw new ApiError("INTERNAL_ERROR", "Não foi possível ler a lista de sugestões.", 500);
    return NextResponse.json({
      data,
      configured: process.env.META_FLOWS_ENABLED === "true",
      total: count, page, pageSize,
    });
  });
}
export async function POST(request: Request) {
  return api("flows.review", async () => {
    const input = await readJson(request, schema);
    const auth = await authenticate();
    return NextResponse.json({
      data: await rpc(auth.client, "review_flow_submission", {
        p_id: input.id,
        p_accept: input.accept,
        p_kind: input.kind,
        p_text: input.text,
        p_lines: input.lines,
      }),
    });
  });
}
