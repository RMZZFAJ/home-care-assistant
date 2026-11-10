import { NextResponse } from "next/server";
import { z } from "zod";
import {
  api,
  ApiError,
  authenticate,
  readJson,
  rpc,
  uuid,
} from "@/lib/server/api";
import { reviseSupplySchema as schema } from "@/lib/validation/documents";
import { supplyWriteConfirmation } from "@/lib/supply/write-confirmation";
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return api("documents.revise", async () => {
    const { id } = await context.params;
    if (!uuid.safeParse(id).success)
      throw new ApiError("VALIDATION_ERROR", "Identificador inválido.");
    const input = await readJson(request, schema);
    const auth = await authenticate();
    if (input.draftCommit) {
      if (!input.submit)
        throw new ApiError(
          "VALIDATION_ERROR",
          "Salvar o preenchimento privado não altera a ficha oficial.",
        );
      const committed = (await rpc(
        auth.client,
        input.draftKind === "BAL"
          ? "commit_creation_draft"
          : "commit_supply_draft",
        {
          p_id: input.draftCommit.id,
          p_expected: input.draftCommit.revision,
          p_target: id,
          p_key: input.idempotencyKey,
          p_body: {
            action: input.draftKind === "BAL" ? "revise_bal" : "revise",
            payload: input.payload,
            expectedVersion: input.expectedVersion,
            ...(input.draftKind === "BAL" ? { recount: input.recount } : {}),
            submissionKey: input.submissionKey,
          },
        },
      )) as { result: unknown };
      return NextResponse.json({
        data: committed.result,
        persistence: "confirmed",
        confirmation: supplyWriteConfirmation(auth.userId, input, id),
      });
    }
    let data: unknown;
    try {
      data = await rpc(auth.client, "revise_and_submit_supply_document", {
        p_id: id,
        p_payload: input.payload,
        p_key: input.idempotencyKey,
        p_version: input.expectedVersion,
        p_recount: input.recount,
        p_submit: input.submit,
        p_submission_key: input.submissionKey,
      });
    } catch (error) {
      // A legacy first stage may predate this transaction. Read its receipt
      // using the original payload/key/version; never rerun a write to probe it.
      if (
        error instanceof ApiError &&
        error.code !== "IDEMPOTENCY_CONFLICT" &&
        input.submit &&
        !input.recount
      ) {
        const receipt = await auth.client
          .rpc("supply_revision_receipt", {
            p_id: id,
            p_payload: input.payload,
            p_key: input.idempotencyKey,
            p_version: input.expectedVersion,
            p_recount: input.recount,
          })
          .then(
            (value) => value,
            () => null,
          );
        const stage = z
          .object({
            documentId: uuid,
            revisionKey: uuid,
            version: z.number().int().positive(),
          })
          .strict()
          .safeParse(receipt?.data);
        if (
          receipt &&
          !receipt.error &&
          stage.success &&
          stage.data.documentId === id &&
          stage.data.revisionKey === input.idempotencyKey &&
          stage.data.version === input.expectedVersion + 1
        )
          throw new ApiError(
            "REVISION_SAVED_SUBMISSION_PENDING",
            `A revisão ${stage.data.version} desta ficha foi salva. A submissão ainda não foi confirmada. Recupere esta mesma tentativa para continuar.`,
            503,
            true,
            {
              kind: "revision",
              documentId: id,
              idempotencyKey: input.idempotencyKey,
              version: stage.data.version,
            },
          );
      }
      throw error;
    }
    return NextResponse.json({
      data,
      persistence: "confirmed",
      confirmation: supplyWriteConfirmation(auth.userId, input, id),
    });
  });
}
