import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  api,
  ApiError,
  authenticate,
  databaseError,
  readJson,
  rpc,
  type AuthContext,
} from "@/lib/server/api";
import { googleSignInEnabled } from "@/lib/auth/google";
import { contactEmailIntent, contactReviewPath } from "@/lib/auth/contact";
import { uploadMyAvatar } from "@/lib/server/avatar";
import { newPasswordSchema } from "@/lib/validation/password";
import { emailContact, phoneContact } from "@/lib/validation/profile";
import { appOrigin } from "@/lib/server/app-origin";

async function currentUser(auth: AuthContext) {
  const { data: { user }, error } = await auth.client.auth.getUser();
  if (error || !user || user.id !== auth.userId)
    throw new ApiError("SESSION_EXPIRED", "Sua sessão expirou. Entre novamente.");
  return user;
}

function normalizePhone(value: string | undefined) {
  if (!value) return null;
  const parsed = phoneContact.safeParse("+" + value.replace(/^\+/, ""));
  return parsed.success ? parsed.data : null;
}

function publicAuthConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new ApiError("NOT_CONFIGURED", "O serviço de acesso está indisponível.");
  return { url, key };
}

function temporaryAuthClient() {
  const { url, key } = publicAuthConfig();
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}

const authContactSettings = z.object({
  external: z.object({ email: z.boolean(), google: z.boolean(), phone: z.boolean() }),
  mailer_autoconfirm: z.boolean(),
  phone_autoconfirm: z.boolean(),
  sms_provider: z.string().optional(),
});

async function contactAvailability() {
  const { url, key } = publicAuthConfig();
  try {
    const response = await fetch(new URL("/auth/v1/settings", url), {
      headers: { apikey: key },
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) throw new Error("Auth settings request failed.");
    const config = authContactSettings.parse(await response.json());
    return {
      email: config.external.email && !config.mailer_autoconfirm,
      sms: config.external.phone && !config.phone_autoconfirm && Boolean(config.sms_provider),
      google: googleSignInEnabled && config.external.google,
    };
  } catch {
    throw new ApiError("AUTH_UNAVAILABLE", "Não foi possível consultar a disponibilidade do serviço de acesso.");
  }
}

async function confirmSession(auth: AuthContext, password: string) {
  const user = await currentUser(auth);
  if (!user.email || !user.identities?.some(identity => identity.provider === "email") || user.factors?.some(factor => factor.status === "verified"))
    throw new ApiError("RECENT_SESSION_REQUIRED", "Entre novamente usando o método de acesso da sua conta.");
  // Validate the candidate before replacing the browser session. In particular,
  // a newly enrolled factor must not downgrade a previously verified browser.
  const candidate = temporaryAuthClient();
  const { data, error } = await candidate.auth.signInWithPassword({ email: user.email, password });
  if (error || !data.session)
    throw new ApiError("FORBIDDEN", "Não foi possível confirmar a senha atual. Confira a senha e tente novamente.");
  let adopted = false;
  try {
    if (data.user?.id !== auth.userId || data.user.factors?.some(factor => factor.status === "verified"))
      throw new ApiError("RECENT_SESSION_REQUIRED", "Entre novamente usando o método de acesso da sua conta.");
    const context = await rpc(auth.client, "my_active_context") as { mode?: string; care_recipient_id?: string } | null;
    if (context?.mode === "patient" || context?.mode === "global")
      await rpc(candidate, "select_active_context", { p_patient: context.mode === "patient" ? context.care_recipient_id : null });
    const session = await auth.client.auth.setSession(data.session);
    if (session.error || session.data.user?.id !== auth.userId)
      throw new ApiError("PERSISTENCE_UNCONFIRMED", "Não foi possível confirmar a nova sessão.");
    adopted = true;
  } finally {
    if (!adopted) await candidate.auth.signOut({ scope: "local" });
  }
}

export async function GET(request: Request) {
  return api("profile.read", async () => {
    const auth = await authenticate();
    if (new URL(request.url).searchParams.get("contactAvailability") === "sms")
      return NextResponse.json({ available: (await contactAvailability()).sms });
    const { data, error } = await auth.client
      .from("profiles")
      .select(
        "full_name,avatar_path,professional_registration,professional_state,professional_category,notification_preferences",
      )
      .eq("id", auth.userId)
      .single();
    if (error) databaseError(error);
    const [user, sessions, recent] = await Promise.all([
      currentUser(auth),
      rpc(auth.client, "my_sessions"),
      rpc(auth.client, "recent_session"),
    ]);
    const providers = user.identities?.map(identity => identity.provider) ?? [];
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
        email: user.email,
        phone: phone?.phone ?? null,
        providers,
        contactStatus: {
          emailConfirmed: Boolean(user.email_confirmed_at),
          pendingEmail: user.new_email || null,
          pendingPhone: normalizePhone(user.new_phone),
          recent: recent === true,
          repeatSignIn: !providers.includes("email") || Boolean(user.factors?.some(factor => factor.status === "verified")),
        },
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
          scienceExpress: z.boolean().default(true),
          scienceWhatsApp: z.boolean().default(false),
          scienceAutomatic: z.boolean().default(false),
        })
        .strict().optional(),
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
  z.object({ action: z.literal("confirmSession"), currentPassword: z.string().min(1).max(256) }).strict(),
  z
    .object({ action: z.literal("email"), email: emailContact })
    .strict(),
  z
    .object({
      action: z.literal("phone"),
      phone: phoneContact,
    })
    .strict(),
  z
    .object({
      action: z.literal("verifyPhone"),
      phone: phoneContact,
      token: z.string().regex(/^\d{6,8}$/),
    })
    .strict(),
  z.object({ action: z.literal("prepareLink") }).strict(),
  z.object({ action: z.literal("confirmPhone"), phone: phoneContact }).strict(),
]);
export async function POST(request: Request) {
  return api("profile.write", async () => {
    const auth = await authenticate();
    if (
      request.headers.get("content-type")?.startsWith("multipart/form-data")
    ) {
      return uploadMyAvatar(request, auth);
    }
    const input = await readJson(request, schema);
    if (input.action === "update")
      await rpc(auth.client, "update_my_profile", {
        p_name: input.name,
        p_registration: input.registration,
        p_state: input.state,
        p_category: input.category,
        p_preferences: input.preferences ?? null,
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
    } else if (input.action === "confirmSession") {
      await confirmSession(auth, input.currentPassword);
    } else if (input.action === "email" || input.action === "phone" || input.action === "verifyPhone" ||
      input.action === "confirmPhone" || input.action === "prepareLink") {
      if (input.action === "prepareLink" && !googleSignInEnabled)
        throw new ApiError("NOT_CONFIGURED", "O acesso com Google está indisponível neste ambiente.");
      if (!(await rpc(auth.client, "recent_session")))
        throw new ApiError(
          "RECENT_SESSION_REQUIRED",
          "Entre novamente para alterar contatos ou métodos de login.",
        );
      if (input.action === "prepareLink" && !(await contactAvailability()).google)
        throw new ApiError("NOT_CONFIGURED", "O acesso com Google está indisponível neste ambiente.");
      if (input.action === "email") {
        if (!(await contactAvailability()).email)
          throw new ApiError("NOT_CONFIGURED", "O serviço de confirmação de e-mail está indisponível.");
        const redirect = new URL("/auth/callback", appOrigin(request));
        redirect.searchParams.set("next", contactReviewPath);
        redirect.searchParams.set("intent", contactEmailIntent);
        const { data, error } = await auth.client.auth.updateUser({ email: input.email }, { emailRedirectTo: redirect.toString() });
        if (error?.status === 429)
          throw new ApiError("RATE_LIMITED", "Aguarde antes de solicitar outro e-mail de confirmação.");
        if (error && (!error.status || error.status >= 500))
          throw new ApiError("PERSISTENCE_UNCONFIRMED", "Não foi possível confirmar a solicitação de e-mail.");
        if (error)
          throw new ApiError(
            "VALIDATION_ERROR",
            "Não foi possível iniciar a alteração de e-mail.",
          );
        const confirmedEmail = data.user.email === input.email && Boolean(data.user.email_confirmed_at);
        if (!confirmedEmail && data.user.new_email !== input.email)
          throw new ApiError("PERSISTENCE_UNCONFIRMED", "Ainda não foi possível confirmar o estado do novo e-mail.");
        return NextResponse.json({ saved: true, confirmedEmail });
      }
      if (input.action === "phone") {
        if (!(await contactAvailability()).sms)
          throw new ApiError("NOT_CONFIGURED", "A confirmação por SMS está indisponível neste momento.");
        const { data, error } = await auth.client.auth.updateUser({
          phone: input.phone,
        });
        if (error) {
          if (["sms_send_failed", "phone_provider_disabled", "provider_disabled", "otp_disabled"].includes(error.code ?? ""))
            throw new ApiError("NOT_CONFIGURED", "A confirmação por SMS está indisponível neste momento.");
          if (error.status === 429)
            throw new ApiError("RATE_LIMITED", "Aguarde antes de solicitar outro código por SMS.");
          if (!error.status || error.status >= 500)
            throw new ApiError("PERSISTENCE_UNCONFIRMED", "Não foi possível confirmar a solicitação de SMS.");
          throw new ApiError("VALIDATION_ERROR", "Não foi possível solicitar um código para este número. Confira o telefone e tente novamente.");
        }
        if (normalizePhone(data.user.phone) === input.phone)
          throw new ApiError("VALIDATION_ERROR", "Este número já é o telefone atual da sua conta.");
        if (normalizePhone(data.user.new_phone) !== input.phone)
          throw new ApiError("PERSISTENCE_UNCONFIRMED", "Ainda não foi possível confirmar a solicitação de código.");
      }
      if (input.action === "verifyPhone") {
        if (normalizePhone((await currentUser(auth)).new_phone) !== input.phone)
          throw new ApiError("VALIDATION_ERROR", "Não há um código pendente para este número na sua conta.");
        // Phone OTP verification may return a new AAL1 session. Keep the
        // currently authenticated browser and discard the OTP-only session.
        const verifier = temporaryAuthClient();
        const { data, error } = await verifier.auth.verifyOtp({
          phone: input.phone,
          token: input.token,
          type: "phone_change",
        });
        if (error && (!error.status || error.status >= 500))
          throw new ApiError("PERSISTENCE_UNCONFIRMED", "Ainda não foi possível confirmar o resultado do código.");
        if (error)
          throw new ApiError(
            "VALIDATION_ERROR",
            "Código de verificação inválido ou expirado.",
          );
        if (data.session) await verifier.auth.signOut({ scope: "local" });
        if (data.user?.id !== auth.userId)
          throw new ApiError("PERSISTENCE_UNCONFIRMED", "Não foi possível confirmar a associação do número à conta.");
      }
      if (input.action === "verifyPhone" || input.action === "confirmPhone") {
        const user = await currentUser(auth);
        if (!user.phone_confirmed_at || normalizePhone(user.phone) !== input.phone)
          throw new ApiError("VALIDATION_ERROR", "O Auth ainda não confirmou este número.");
        try { await rpc(auth.client, "register_verified_phone"); }
        catch { throw new ApiError("PERSISTENCE_UNCONFIRMED", "O número foi confirmado no Auth. Confira se o contato já consta na sua conta."); }
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
