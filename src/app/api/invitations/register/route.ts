import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { api, ApiError, readJson } from "@/lib/server/api";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { appOrigin } from "@/lib/server/app-origin";

export async function POST(request: Request) {
  return api("invitation.register", async () => {
    const input = await readJson(request, z.object({ token: z.string().regex(/^[A-Za-z0-9_-]{43}$/), email: z.string().trim().email().max(254), password: z.string().min(12).max(128), fullName: z.string().trim().min(2).max(160) }).strict(), 16_000);
    const client = await createSupabaseServerClient();
    if (!client) throw new ApiError("NOT_CONFIGURED", "Serviço de acesso indisponível.", 503);
    const { data: allowed, error } = await client.rpc("invitation_registration_allowed", { p_token_hash: createHash("sha256").update(input.token).digest("hex"), p_email: input.email.toLowerCase() });
    if (error || !allowed) throw new ApiError("INVITATION_INVALID", "Convite inválido, expirado ou sem autorização para este e-mail.", 403);
    // Registration uses public Auth; never generates a login credential for an administrator.
    const redirectTo = new URL("/auth/callback?next=/convites/aceitar", appOrigin(request)).toString();
    const result = await client.auth.signUp({ email: input.email, password: input.password, options: { data: { full_name: input.fullName }, emailRedirectTo: redirectTo } });
    if (result.error && ![400, 422].includes(result.error.status ?? 0)) throw new ApiError("AUTH_UNAVAILABLE", "Não foi possível concluir o cadastro. Tente novamente.", 503, true);
    return NextResponse.json({ notice: "Se o cadastro for elegível, confirme o e-mail recebido e entre para aceitar o convite. Se já possui conta, use o login existente." });
  });
}
