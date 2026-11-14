import { NextResponse } from "next/server";
import { api, authenticate, parseUuid, readJson, rpc } from "@/lib/server/api";
import { transferCommandSchema } from "@/lib/validation/transfers";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return api("transfers.command", async () => {
    const { id } = await context.params,
      input = await readJson(request, transferCommandSchema),
      auth = await authenticate();
    return NextResponse.json({
      data: input.draftCommit
        ? (
            (await rpc(auth.client, "commit_supply_draft", {
              p_id: input.draftCommit.id,
              p_expected: input.draftCommit.revision,
              p_target: parseUuid(id),
              p_key: input.idempotencyKey,
              p_body: {
                action: input.action,
                body: input.body,
                expectedVersion: input.expectedVersion,
              },
            })) as { result: unknown }
          ).result
        : await rpc(auth.client, "transfer_command", {
            p_id: parseUuid(id),
            p_action: input.action,
            p_body: input.body,
            p_key: input.idempotencyKey,
            p_version: input.expectedVersion,
          }),
      persistence: "confirmed",
    });
  });
}
