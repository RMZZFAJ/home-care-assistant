import { NextResponse } from "next/server";
import { api, ApiError, authenticate, databaseError, patientContext, rpc } from "@/lib/server/api";
import { balanceApplicationQuery, balanceApplicationResult } from "@/lib/validation/balance-application";

export async function GET(request: Request) {
  return api("balances.application.recovery", async () => {
    const parsed = balanceApplicationQuery.safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!parsed.success) throw new ApiError("VALIDATION_ERROR", "Confira a referência da aplicação do balanço.");
    const input = parsed.data, auth = await authenticate();
    await patientContext(auth, input.careRecipientId, "bal.read");
    const { data: document, error } = await auth.client.from("operational_documents")
      .select("care_recipient_id,type,version").eq("id", input.documentId).maybeSingle();
    if (error) databaseError(error);
    if (!document || document.type !== "BAL" || document.care_recipient_id !== input.careRecipientId)
      throw new ApiError("NOT_FOUND", "Balanço não encontrado.", 404);
    const data = balanceApplicationResult.parse(await rpc(auth.client, "balance_application_result", {
      p_id: input.documentId, p_key: input.idempotencyKey, p_version: input.expectedVersion,
      p_body: { group: input.group, reviewReference: input.reviewReference },
    }));
    if (data.documentId !== input.documentId || data.idempotencyKey !== input.idempotencyKey)
      throw new ApiError("INTERNAL_ERROR", "A consulta não corresponde à tentativa preservada.", 503);
    // A version observed before the locked lookup is a monotonic lower bound.
    // If this exact act is still absent after that lookup, its older version
    // cannot subsequently pass the command's CAS. Never infer this from a
    // current-document read performed after an unlocked not-found result.
    const result = data.state === "not_found" && document.version > input.expectedVersion
      ? { ...data, state: "obsolete" as const, documentVersion: document.version }
      : data;
    return NextResponse.json({ data: result }, { headers: { "Cache-Control": "no-store" } });
  });
}
