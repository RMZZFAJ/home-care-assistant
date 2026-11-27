import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { api, ApiError, authenticatedIdentity, readJson, rpc } from "@/lib/server/api";
import { invitationDecision, invitationToken } from "@/lib/validation/invitation";

export async function POST(request: Request) {
  return api("invitation.accept", async () => {
    const { token, decision, expectedActor } = await readJson(
      request,
      z
        .object({
          token: invitationToken,
          decision: invitationDecision.default("accept"),
          expectedActor: z.uuid().optional(),
        })
        .strict(),
    );
    const auth = await authenticatedIdentity();
    if (expectedActor && auth.user.id !== expectedActor)
      throw new ApiError("VERSION_CONFLICT", "A conta mudou antes da decisão. Consulte o convite com a conta correta.", 409);
    const data = await rpc(
      auth.client,
      decision === "decline" ? "decline_invitation" : "accept_invitation",
      { p_token_hash: createHash("sha256").update(token).digest("hex") },
    );
    return NextResponse.json({ data });
  });
}
