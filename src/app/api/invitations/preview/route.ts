import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { api, ApiError, readJson, rpc } from "@/lib/server/api";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { invitationToken, parseInvitationRead } from "@/lib/validation/invitation";

export async function POST(request: Request) {
  return api("invitation.preview", async () => {
    const { token } = await readJson(request, z.strictObject({ token: invitationToken }));
    const client = await createSupabaseServerClient();
    if (!client) throw new ApiError("NOT_CONFIGURED", "Serviço de acesso indisponível.", 503);
    const data = await rpc(client, "invitation_preview", { p_token_hash: createHash("sha256").update(token).digest("hex") });
    const { data: { user }, error } = await client.auth.getUser();
    if (["ready", "accepted"].includes(data.state) && (error || !user))
      throw new ApiError("SESSION_EXPIRED", "Não foi possível confirmar a conta deste convite. Entre novamente.", 401);
    return NextResponse.json(parseInvitationRead({ data, actorId: user?.id ?? null }), { headers: { "cache-control": "private, no-store" } });
  });
}
