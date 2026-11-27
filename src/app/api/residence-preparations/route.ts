import { NextResponse } from "next/server";
import { z } from "zod";
import { api, ApiError, authenticate, parseQuery, readJson, requireGlobal, rpc, uuid } from "@/lib/server/api";
import { residenceCreationReceipt, residenceCreationResult, residencePreparationOperation, reviewedAdministrator } from "@/lib/validation/residence-preparation";

const resultQuery = z.object({ attempt: uuid }).strict();

export async function GET(request: Request) {
  return api("residence.creation.result", async () => {
    const auth = await authenticate();
    requireGlobal(auth);
    const { attempt } = parseQuery(resultQuery, Object.fromEntries(new URL(request.url).searchParams));
    const result = await rpc(auth.client, "residence_creation_result", { p_key: attempt });
    return NextResponse.json({ data: residenceCreationResult.nullable().parse(result) }, {
      headers: { "Cache-Control": "no-store" },
    });
  });
}

export async function POST(request: Request) {
  return api("residence.creation.write", async () => {
    const auth = await authenticate();
    requireGlobal(auth);
    const input = await readJson(request, residencePreparationOperation);
    if (input.action === "review") {
      const candidate = await rpc(auth.client, "review_residence_administrator", { p_email: input.administratorEmail });
      if (!candidate) throw new ApiError("VERSION_CONFLICT", "Confira o e-mail. A conta administradora inicial precisa estar ativa e confirmada.");
      return NextResponse.json({ data: reviewedAdministrator.parse(candidate) });
    }
    if (input.action === "resolve") {
      const result = await rpc(auth.client, "residence_creation_result", { p_key: input.idempotencyKey, p_close_absent: true });
      return NextResponse.json({ data: residenceCreationResult.parse(result) });
    }
    const receipt = await rpc(auth.client, "create_reviewed_residence", {
      p_content: { ...input.content, reviewedAdministratorId: input.reviewedAdministratorId },
      p_key: input.idempotencyKey,
    });
    return NextResponse.json({ data: residenceCreationReceipt.parse(receipt) });
  });
}
