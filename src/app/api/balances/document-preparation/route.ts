import { NextResponse } from "next/server";
import {
  api,
  ApiError,
  authenticate,
  databaseError,
  patientContext,
  readJson,
  rpc,
} from "@/lib/server/api";
import {
  balanceDocumentDecisionSchema,
  balancePreparationQuery,
  balancePreparationSchema,
  type BalancePreparation,
} from "@/lib/validation/balance-document-decisions";
import type { SupplyDocument } from "@/types/documents";
import type { BalanceRecountContext } from "@/types/balances";

export async function GET(request: Request) {
  return api("balances.document-preparation.read", async () => {
    const parsed = balancePreparationQuery.safeParse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    if (!parsed.success)
      throw new ApiError(
        "VALIDATION_ERROR",
        "Confira o paciente, a ficha e a decisão do balanço.",
      );
    const input = parsed.data,
      auth = await authenticate();
    await patientContext(auth, input.careRecipientId, "bal.read");
    let data: BalancePreparation;
    if (input.purpose === "assign_recount") {
      const recount = (await rpc(auth.client, "balance_recount_context", {
        p_id: input.documentId,
      })) as BalanceRecountContext;
      if (
        recount.documentId !== input.documentId ||
        recount.patientId !== input.careRecipientId
      )
        throw new ApiError("NOT_FOUND", "Balanço não encontrado.", 404);
      // Keep version, author, notes and assignment in the same database snapshot.
      data = balancePreparationSchema.parse({
        documentId: recount.documentId,
        patientId: recount.patientId,
        code: recount.code,
        documentVersion: recount.documentVersion,
        status: recount.status,
        lines: [],
        review: null,
        recount,
      });
    } else {
      const doc = (await rpc(auth.client, "operational_document", {
        p_id: input.documentId,
      })) as SupplyDocument;
      if (doc.type !== "BAL" || doc.care_recipient_id !== input.careRecipientId)
        throw new ApiError("NOT_FOUND", "Balanço não encontrado.", 404);
      data = balancePreparationSchema.parse({
        documentId: doc.id,
        patientId: doc.care_recipient_id,
        code: doc.code,
        documentVersion: doc.version,
        status: doc.status,
        lines: doc.lines.map((row) => ({
          id: row.id,
          name: row.name_snapshot,
          unit: row.unit_snapshot,
          quantity: row.quantity,
          expectedQuantity: row.metadata.expectedQuantity ?? null,
        })),
        review: doc.balanceReview ?? null,
        recount: null,
      });
    }
    return NextResponse.json(
      { data },
      { headers: { "Cache-Control": "no-store" } },
    );
  });
}
export async function POST(request: Request) {
  return api("balances.document-preparation.commit", async () => {
    const input = await readJson(request, balanceDocumentDecisionSchema),
      auth = await authenticate();
    await patientContext(auth, input.careRecipientId, "bal.read");
    const { data: document, error } = await auth.client
      .from("operational_documents")
      .select("care_recipient_id,type")
      .eq("id", input.documentId)
      .maybeSingle();
    if (error) databaseError(error);
    if (
      !document ||
      document.type !== "BAL" ||
      document.care_recipient_id !== input.careRecipientId
    )
      throw new ApiError("NOT_FOUND", "Balanço não encontrado.", 404);
    const data = await rpc(auth.client, "commit_supply_draft", {
      p_id: input.draftCommit.id,
      p_expected: input.draftCommit.revision,
      p_target: input.documentId,
      p_key: input.idempotencyKey,
      p_body: {
        action:
          input.purpose === "assign_recount" ? "assign_recount" : "approve",
        expectedVersion: input.expectedVersion,
        body: input.body,
      },
    });
    return NextResponse.json(
      { data, persistence: "confirmed" },
      { headers: { "Cache-Control": "no-store" } },
    );
  });
}
