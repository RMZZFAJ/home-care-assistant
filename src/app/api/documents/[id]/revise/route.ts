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
import { supplyPayload } from "@/lib/validation/documents";
import { draftCommitSchema } from "@/lib/validation/creation-drafts";
const schema = z
  .object({
    payload: supplyPayload,
    idempotencyKey: uuid,
    submissionKey: uuid,
    expectedVersion: z.number().int().positive(),
    recount: z.boolean(),
    submit: z.boolean(),
    draftCommit: draftCommitSchema.optional(),
    draftKind: z.enum(["COM","ENT","BAL"]).default("BAL"),
  })
  .strict();
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
      const committed = (await rpc(auth.client, input.draftKind==="BAL"?"commit_creation_draft":"commit_supply_draft", {
        p_id: input.draftCommit.id,
        p_expected: input.draftCommit.revision,
        p_target: id,
        p_key: input.idempotencyKey,
        p_body: {
          action: input.draftKind==="BAL"?"revise_bal":"revise",
          payload: input.payload,
          expectedVersion: input.expectedVersion,
          ...(input.draftKind==="BAL"?{recount:input.recount}:{}),
          submissionKey: input.submissionKey,
        },
      })) as { result: unknown };
      return NextResponse.json({
        data: committed.result,
        persistence: "confirmed",
      });
    }
    const data = await rpc(auth.client, "revise_and_submit_supply_document", {
      p_id: id,
      p_payload: input.payload,
      p_key: input.idempotencyKey,
      p_version: input.expectedVersion,
      p_recount: input.recount,
      p_submit:input.submit,p_submission_key:input.submissionKey,
    });
    return NextResponse.json({ data, persistence: "confirmed" });
  });
}
