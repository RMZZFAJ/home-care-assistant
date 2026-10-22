import { NextResponse } from "next/server";
import { z } from "zod";
import {
  api,
  authenticate,
  databaseError,
  patientContext,
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
    const patient = await patientContext(
      auth,
      new URL(request.url).searchParams.get("careRecipientId"),
      "consumption.report",
    );
    const { data, error } = await auth.client
      .from("flow_submissions")
      .select("id,body,status,created_at,report_id")
      .eq("care_recipient_id", patient.id)
      .eq("user_id", auth.userId)
      .eq("status", "pending_confirmation")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) databaseError(error);
    return NextResponse.json({
      data,
      configured: process.env.META_FLOWS_ENABLED === "true",
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
