import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { api, authenticate, parseQuery, readJson, rpc } from "@/lib/server/api";
import { appOrigin } from "@/lib/server/app-origin";
import { administrativeInvitationCommand, administrativeInvitationList, administrativeInvitationReceipt } from "@/lib/validation/administrative-invitation";

export async function GET(request: Request) {
  return api("invitation.admin.read", async () => {
    const params = new URL(request.url).searchParams;
    const { careRecipientId } = parseQuery(z.strictObject({ careRecipientId: z.uuid() }), {
      careRecipientId: params.getAll("careRecipientId").length === 1 ? params.get("careRecipientId") : null,
    });
    const { client } = await authenticate();
    const data = await rpc(client, "administrative_invitations", { p_patient: careRecipientId });
    return NextResponse.json(administrativeInvitationList.parse({ data }));
  });
}

export async function POST(request: Request) {
  return api("invitation.admin.command", async () => {
    const input = await readJson(request, administrativeInvitationCommand);
    const { client } = await authenticate();
    const token = input.intent && input.intent.action !== "revoke" ? randomBytes(32).toString("base64url") : null;
    const result = administrativeInvitationReceipt.parse(await rpc(client, "administrative_invitation_command", {
      p_patient: input.careRecipientId, p_key: input.key, p_intent: input.intent,
      p_token_hash: token && createHash("sha256").update(token).digest("hex"),
      p_expires_at: token && new Date(Date.now() + 7 * 86_400_000).toISOString(),
    }));
    if (result.state === "closed") return NextResponse.json(result);

    const { executed, ...receipt } = result;
    const invitationUrl = executed && token ? new URL("/convites/aceitar", appOrigin(request)) : null;
    if (invitationUrl) invitationUrl.hash = `token=${token}`;
    return NextResponse.json({ ...receipt, ...(invitationUrl ? { invitationUrl: invitationUrl.toString() } : {}) });
  });
}
