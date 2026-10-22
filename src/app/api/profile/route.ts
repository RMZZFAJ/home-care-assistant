import { NextResponse } from "next/server";
import { z } from "zod";
import {
  api,
  ApiError,
  authenticate,
  databaseError,
  readJson,
  rpc,
  validateMutationRequest,
} from "@/lib/server/api";
import { boundedUpload, sanitizeFile } from "@/lib/server/files";
import { newPasswordSchema } from "@/lib/validation/password";
import { appOrigin } from "@/lib/server/app-origin";

export async function GET() {
  return api("profile.read", async () => {
    const auth = await authenticate();
    const { data, error } = await auth.client
      .from("profiles")
      .select(
        "full_name,avatar_path,professional_registration,professional_state,professional_category,notification_preferences",
      )
      .eq("id", auth.userId)
      .single();
    if (error) databaseError(error);
    const {
      data: { user },
    } = await auth.client.auth.getUser();
    const sessions = await rpc(auth.client, "my_sessions");
    const avatar = data.avatar_path
      ? (
          await auth.client.storage
            .from("profile-avatars")
            .createSignedUrl(data.avatar_path, 120)
        ).data?.signedUrl
      : null;
    const { data: phone, error: phoneError } = await auth.client
      .from("verified_phones")
      .select("phone,verified_at")
      .eq("user_id", auth.userId)
      .maybeSingle();
    if (phoneError) databaseError(phoneError);
    const { data: memberships, error: membershipError } = await auth.client
      .from("care_recipient_memberships")
      .select(
        "care_recipient_id,role,status,care_recipients(id,display_name,is_active)",
      )
      .eq("user_id", auth.userId);
    if (membershipError) databaseError(membershipError);
    return NextResponse.json({
      memberships: memberships ?? [],
      data: {
        ...data,
        avatar_path: undefined,
        avatar,
        email: user?.email,
        phone: phone?.phone ?? null,
        providers: user?.identities?.map((identity) => identity.provider) ?? [],
      },
      sessions,
    });
  });
}
const schema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("update"),
      name: z.string().trim().min(2).max(160),
      registration: z.string().trim().max(30).default(""),
      state: z
        .string()
        .regex(/^[A-Z]{2}$/)
        .nullable(),
      category: z.string().trim().max(80).default(""),
      preferences: z
        .object({
          internal: z.boolean(),
          whatsapp: z.boolean(),
          email: z.boolean(),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      action: z.literal("password"),
      currentPassword: z.string().min(1).max(256),
      password: newPasswordSchema,
    })
    .strict(),
  z.object({ action: z.literal("signoutOthers") }).strict(),
  z
    .object({ action: z.literal("email"), email: z.string().email().max(254) })
    .strict(),
  z
    .object({
      action: z.literal("phone"),
      phone: z.string().regex(/^\+[1-9]\d{7,14}$/),
    })
    .strict(),
  z
    .object({
      action: z.literal("verifyPhone"),
      phone: z.string().regex(/^\+[1-9]\d{7,14}$/),
      token: z.string().regex(/^\d{6,8}$/),
    })
    .strict(),
  z.object({ action: z.literal("prepareLink") }).strict(),
]);
export async function POST(request: Request) {
  return api("profile.write", async () => {
    const auth = await authenticate();
    if (
      request.headers.get("content-type")?.startsWith("multipart/form-data")
    ) {
      validateMutationRequest(request, false);
      const { file, bytes } = await boundedUpload(request, 5_242_880);
      const safe = await sanitizeFile(bytes, file.type, true);
      const objectPath = auth.userId + "/" + crypto.randomUUID() + ".jpg";
      const { error } = await auth.client.storage
        .from("profile-avatars")
        .upload(objectPath, safe.bytes, {
          contentType: safe.mime,
          upsert: false,
        });
      if (error)
        throw new ApiError(
          "PERSISTENCE_UNCONFIRMED",
          "Não foi possível confirmar a foto.",
          503,
          true,
        );
      await rpc(auth.client, "set_my_avatar", { p_path: objectPath });
      return NextResponse.json({ saved: true });
    }
    const input = await readJson(request, schema);
    if (input.action === "update")
      await rpc(auth.client, "update_my_profile", {
        p_name: input.name,
        p_registration: input.registration,
        p_state: input.state,
        p_category: input.category,
        p_preferences: input.preferences,
      });
    else if (input.action === "password") {
      const {
        data: { user },
      } = await auth.client.auth.getUser();
      if (!user?.email)
        throw new ApiError(
          "FORBIDDEN",
          "Confirme seu acesso antes de alterar a senha.",
          403,
        );
      const { error: reauth } = await auth.client.auth.signInWithPassword({
        email: user.email,
        password: input.currentPassword,
      });
      if (reauth)
        throw new ApiError(
          "FORBIDDEN",
          "Senha atual inválida. Entre novamente se necessário.",
          403,
        );
      const { error } = await auth.client.auth.updateUser({
        password: input.password,
      });
      if (error)
        throw new ApiError(
          "VALIDATION_ERROR",
          "Não foi possível alterar a senha. Confira os critérios da conta.",
        );
    } else if (
      ["email", "phone", "verifyPhone", "prepareLink"].includes(input.action)
    ) {
      if (!(await rpc(auth.client, "recent_session")))
        throw new ApiError(
          "FORBIDDEN",
          "Entre novamente para alterar contatos ou métodos de login.",
          403,
        );
      if (input.action === "email") {
        const { error } = await auth.client.auth.updateUser(
          { email: input.email },
          {
            emailRedirectTo: new URL(
              "/auth/callback?next=/perfil",
              appOrigin(request),
            ).toString(),
          },
        );
        if (error)
          throw new ApiError(
            "VALIDATION_ERROR",
            "Não foi possível iniciar a alteração de e-mail.",
          );
      }
      if (input.action === "phone") {
        const { error } = await auth.client.auth.updateUser({
          phone: input.phone,
        });
        if (error)
          throw new ApiError(
            "NOT_CONFIGURED",
            "A verificação por SMS depende de provedor habilitado no Supabase Auth.",
            503,
          );
      }
      if (input.action === "verifyPhone") {
        const { error } = await auth.client.auth.verifyOtp({
          phone: input.phone,
          token: input.token,
          type: "phone_change",
        });
        if (error)
          throw new ApiError(
            "VALIDATION_ERROR",
            "Código de verificação inválido ou expirado.",
          );
        await rpc(auth.client, "register_verified_phone");
      }
    } else {
      if (!(await rpc(auth.client, "recent_session")))
        throw new ApiError(
          "FORBIDDEN",
          "Entre novamente para encerrar as outras sessões.",
          403,
        );
      const { error } = await auth.client.auth.signOut({ scope: "others" });
      if (error)
        throw new ApiError(
          "PERSISTENCE_UNCONFIRMED",
          "Não foi possível confirmar o encerramento das sessões.",
          503,
          true,
        );
    }
    return NextResponse.json({ saved: true });
  });
}
