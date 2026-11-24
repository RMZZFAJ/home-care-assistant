import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { api, ApiError, authenticate, databaseError, readJson } from "@/lib/server/api";
import { appOrigin } from "@/lib/server/app-origin";
import { proposalAttemptInput, proposalAttemptResult } from "@/lib/validation/governance-proposal";

export async function POST(request: Request) {
  return api("settings.proposal.review", async () => {
    const input = await readJson(request, proposalAttemptInput, 2_000);
    const auth = await authenticate();
    const token = input.intent?.decision === "approve" ? randomBytes(32).toString("base64url") : null;
    const hash = token ? createHash("sha256").update(token).digest("hex") : null;
    const { data, error } = await auth.client.rpc("review_governance_proposal", {
      p_patient: input.careRecipientId, p_proposal: input.proposalId, p_key: input.attemptKey,
      p_decision: input.intent?.decision ?? null, p_reference: input.intent?.reference ?? null, p_invitation_hash: hash,
    });
    if (error?.code === "PT409")
      throw new ApiError("VERSION_CONFLICT", "A proposta ou a configuração vigente mudou. Confira novamente os dados antes de decidir.", 409);
    if (error?.code === "PT410")
      throw new ApiError("INVALID_OPERATION", "A tentativa foi encerrada sem registrar uma decisão.", 410);
    if (error) databaseError(error);
    const result = proposalAttemptResult.parse(data);
    const invitationUrl = result.issuedLink && token ? new URL("/convites/aceitar", appOrigin(request)) : null;
    if (invitationUrl) invitationUrl.hash = "token=" + token;
    return NextResponse.json({ result, invitationUrl: invitationUrl?.toString() ?? null },
      { headers: { "cache-control": "private, no-store" } });
  });
}
